import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveTimezone, computeSendDecision } from "../_shared/businessHours.ts";
import { htmlBody } from "../_shared/outreachEmailBody.ts";

// Sends an outreach email for a scheduled touch.
// Caller: admin portal (touch_id in body). Returns { error: code } on any failure.
// Daily cap: 25 sent emails per calendar day.
// Auth: admin JWT required.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
// No hardcoded fallback — a project that hasn't set this must fail loudly
// rather than silently sending unsubscribe links to a different tenant's
// site. Found during FutureNorms provisioning, 26 Aug 2026.
const PORTAL_URL = Deno.env.get("PORTAL_URL") ?? "";
// Tenant-specific sender identity — no hardcoded fallback. A project that
// hasn't set these must fail loudly rather than silently send as a
// different tenant's identity (found during FutureNorms provisioning, 26
// Aug 2026 — this was previously a bare "Eswar Maheswaran <eswar@
// eswarcreatives.in>" constant).
const OUTREACH_SENDER_NAME = Deno.env.get("OUTREACH_SENDER_NAME") ?? "";
const OUTREACH_SENDER_EMAIL = Deno.env.get("OUTREACH_SENDER_EMAIL") ?? "";
const FROM = `${OUTREACH_SENDER_NAME} <${OUTREACH_SENDER_EMAIL}>`;
const DAILY_CAP = 25;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function ok(body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function fail(code: string, status = 400) {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function substitute(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, val] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, val);
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", 405);

  if (!OUTREACH_SENDER_NAME || !OUTREACH_SENDER_EMAIL || !PORTAL_URL) {
    console.error("send-outreach-email: OUTREACH_SENDER_NAME / OUTREACH_SENDER_EMAIL / PORTAL_URL not configured");
    return fail("sender_not_configured", 500);
  }

  // Verify admin JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return fail("not_authenticated", 401);

  const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: auth } = await callerClient.auth.getUser();
  if (!auth?.user) return fail("not_authenticated", 401);

  const { data: profile } = await callerClient
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();
  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
    return fail("not_allowed", 403);
  }

  let body: { touch_id?: string };
  try {
    body = await req.json();
  } catch {
    return fail("bad_request");
  }

  const touchId = (body.touch_id ?? "").trim();
  if (!touchId) return fail("invalid_touch");

  // Use service role for all writes
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Load touch + lead + step in one query
  const { data: touch, error: touchErr } = await db
    .from("outreach_touches")
    .select(`
      id, channel, status, scheduled_for,
      subject_snapshot, body_snapshot,
      step_id,
      lead:leads!lead_id (
        id, first_name, last_name, company, email, specific_observation,
        unsubscribe_token, status
      ),
      step:sequence_steps!step_id (
        subject_template, body_template
      )
    `)
    .eq("id", touchId)
    .maybeSingle();

  if (touchErr || !touch) return fail("invalid_touch");
  if (touch.channel !== "email") return fail("invalid_touch");
  if (touch.status !== "scheduled" && touch.status !== "failed") return fail("invalid_touch");

  const lead = touch.lead as {
    id: string; first_name: string; last_name: string | null; company: string;
    email: string | null; specific_observation: string | null;
    unsubscribe_token: string; status: string;
  };

  // Guard: no email
  if (!lead.email) return fail("no_email");

  // Guard: suppressed
  const suppressed =
    lead.status === "unsubscribed" ||
    lead.status === "bounced";

  if (!suppressed) {
    const { data: inSuppressionList } = await db
      .from("suppression_list")
      .select("id")
      .eq("email", lead.email.toLowerCase())
      .maybeSingle();
    if (inSuppressionList) {
      // Auto-cancel the touch
      await db
        .from("outreach_touches")
        .update({ status: "cancelled", skipped_reason: "suppressed" })
        .eq("id", touchId);
      return fail("suppressed");
    }
  } else {
    return fail("suppressed");
  }

  // Guard: missing observation
  if (!lead.specific_observation || lead.specific_observation.trim() === "") {
    return fail("missing_observation");
  }

  // Guard: daily cap
  const todayStr = new Date().toISOString().slice(0, 10);
  const { count: sentToday } = await db
    .from("outreach_touches")
    .select("id", { count: "exact", head: true })
    .eq("channel", "email")
    .eq("status", "sent")
    .gte("sent_at", todayStr + "T00:00:00Z")
    .lte("sent_at", todayStr + "T23:59:59Z");

  if ((sentToday ?? 0) >= DAILY_CAP) return fail("daily_cap_reached");

  // Render template
  const step = touch.step as { subject_template: string | null; body_template: string } | null;
  const unsubUrl = `${PORTAL_URL}/unsubscribe/${lead.unsubscribe_token}`;
  const vars: Record<string, string> = {
    first_name: lead.first_name,
    company: lead.company,
    specific_observation: lead.specific_observation ?? "",
    flow: "product",
    unsubscribe_url: unsubUrl,
    topic: "{{topic}}",
  };

  // Snapshot wins over template. A still-scheduled touch only has a snapshot
  // if an admin opened it in TouchPreviewModal, edited it and saved — so a
  // non-null snapshot always means "a human deliberately rewrote this," and
  // the template must not silently override it. This used to be enforced by
  // the modal nulling out step_id on save; that was reverted (it broke every
  // other consumer of touch.step) without the precedence here being flipped
  // to compensate, so edits were being written and then discarded at send
  // time. Subject and body are read as a pair because the modal always writes
  // them as a pair — taking the snapshot body with the template subject would
  // mail a mismatched pair neither the admin nor the template author wrote.
  const rawSubject = touch.subject_snapshot ?? step?.subject_template ?? "";
  const rawBody = touch.body_snapshot ?? step?.body_template ?? "";
  let renderedSubject = substitute(rawSubject, vars);
  let renderedBody = substitute(rawBody, vars);

  // Bug 5: possessive fix — "Acme SaaS's" -> "Acme SaaS'" when company ends in 's'.
  // Applies to the subject too: the subject templates use {{company}}'s, so
  // leaving it body-only mailed a correct body under a malformed subject line.
  if (lead.company.slice(-1).toLowerCase() === 's') {
    const possessive = `${lead.company}'s`;
    const fixed = `${lead.company}'`;
    renderedSubject = renderedSubject.replaceAll(possessive, fixed);
    renderedBody = renderedBody.replaceAll(possessive, fixed);
  }

  // Guard: unresolved variables
  if (renderedBody.includes("{{")) return fail("unresolved_variables");

  // ── Business hours check (9:30 AM-5:30 PM recipient local, Mon-Fri) ────
  const { data: touchForTz } = await db
    .from("outreach_touches")
    .select("recipient_timezone, lead:leads!lead_id (country)")
    .eq("id", touchId)
    .maybeSingle() as { data: { recipient_timezone: string | null; lead: { country: string | null } | null } | null };

  const tz = resolveTimezone(touchForTz?.recipient_timezone, touchForTz?.lead?.country);
  const decision = computeSendDecision(new Date(), tz);

  if (!decision.sendNow) {
    await db
      .from("outreach_touches")
      .update({
        status: "scheduled",
        scheduled_for: decision.scheduledFor.toISOString(),
        recipient_timezone: tz,
        // A human explicitly clicked Send — mark it approved so the existing
        // 5-minute cron (send-confirmed-outreach-touches) picks this up and
        // completes the send automatically once the window opens, the same
        // way an early "Approve" in Review in Advance already does. Touches
        // nobody has clicked Send/Approve on never get this stamp, so the
        // cron never auto-sends anything that hasn't been reviewed.
        draft_confirmed_at: new Date().toISOString(),
        draft_confirmed_by: auth.user.id,
      })
      .eq("id", touchId);

    return new Response(
      JSON.stringify({
        scheduled: true,
        scheduled_for: decision.scheduledFor.toISOString(),
        recipient_timezone: tz,
        message: "Outside this recipient's working hours. Scheduled to send automatically once their local business hours open.",
      }),
      { status: 200, headers: { ...CORS, "Content-Type": "application/json" } },
    );
  }
  // ── End business hours check ─────────────────────────────────────────

  // Send via Resend
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: lead.email,
        reply_to: OUTREACH_SENDER_EMAIL,
        subject: renderedSubject,
        text: renderedBody,
        html: htmlBody(renderedBody, unsubUrl),
      }),
    });

    if (!res.ok) {
      console.error("send-outreach-email: Resend error", res.status);
      await db
        .from("outreach_touches")
        .update({ status: "failed" })
        .eq("id", touchId);
      return fail("send_failed");
    }

    const resJson = await res.json() as { id?: string };
    const messageId = resJson.id ?? null;

    await db
      .from("outreach_touches")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        subject_snapshot: renderedSubject,
        body_snapshot: renderedBody,
        resend_message_id: messageId,
      })
      .eq("id", touchId);

    return ok({ success: true, message_id: messageId });
  } catch (e) {
    console.error("send-outreach-email: exception", e);
    await db
      .from("outreach_touches")
      .update({ status: "failed" })
      .eq("id", touchId);
    return fail("send_failed");
  }
});
