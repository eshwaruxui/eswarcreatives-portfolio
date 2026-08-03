import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Sends an outreach email for a scheduled touch.
// Caller: admin portal (touch_id in body). Returns { error: code } on any failure.
// Daily cap: 25 sent emails per calendar day.
// Auth: admin JWT required.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const PORTAL_URL = Deno.env.get("PORTAL_URL") ?? "https://www.eswarcreatives.in";
const FROM = "Eswar Maheswaran <eswar@eswarcreatives.in>";
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

function getNextBusinessOpen(tz: string): Date {
  const d = new Date();
  d.setSeconds(0, 0);
  for (let i = 0; i < 8; i++) {
    d.setMinutes(d.getMinutes() + (i === 0 ? 1 : 60));
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour: "numeric", hour12: false, weekday: "short",
    }).formatToParts(d);
    const h = parseInt(parts.find((p) => p.type === "hour")!.value);
    const w = parts.find((p) => p.type === "weekday")!.value;
    if (h >= 9 && h < 18 && w !== "Sat" && w !== "Sun") return d;
  }
  const fallback = new Date();
  fallback.setDate(fallback.getDate() + ((8 - fallback.getDay()) % 7 || 7));
  fallback.setHours(9, 0, 0, 0);
  return fallback;
}

function substitute(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, val] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, val);
  }
  return out;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlBody(body: string, unsubUrl: string): string {
  // Preserve paragraph breaks: \n\n → <br><br>, then remaining \n → <br>
  let escaped = escapeHtml(body);

  // Embed the two footer links as real anchors instead of bare URLs.
  const linkStyle = "color:#024C4F;text-decoration:underline;";
  const escapedUnsubUrl = escapeHtml(unsubUrl);
  escaped = escaped.split(escapedUnsubUrl).join(
    `<a href="${escapedUnsubUrl}" style="${linkStyle}">unsubscribe</a>`
  );
  escaped = escaped.split("eswarcreatives.in/design-systems").join(
    `<a href="https://www.eswarcreatives.in/design-systems" style="${linkStyle}">eswarcreatives.in/design-systems</a>`
  );

  escaped = escaped
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
  return `<!doctype html>
<html>
  <body style="margin:0;background:#FAF8F4;font-family:Inter,Arial,sans-serif;color:#0A1A1B;">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#024C4F;margin-bottom:24px;">
        EswarCreatives
      </div>
      <div style="font-size:15px;line-height:1.65;color:#1A1A1A;">${escaped}</div>
    </div>
  </body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", 405);

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

  const rawSubject = step?.subject_template ?? touch.subject_snapshot ?? "";
  const rawBody = step?.body_template ?? touch.body_snapshot ?? "";
  const renderedSubject = substitute(rawSubject, vars);
  let renderedBody = substitute(rawBody, vars);

  // Bug 5: possessive fix — "Acme SaaS's" -> "Acme SaaS'" when company ends in 's'
  if (lead.company.slice(-1).toLowerCase() === 's') {
    renderedBody = renderedBody.replaceAll(`${lead.company}'s`, `${lead.company}'`);
  }

  // Guard: unresolved variables
  if (renderedBody.includes("{{")) return fail("unresolved_variables");

  // ── Business hours check ──────────────────────────────────────────────
  const COUNTRY_TZ: Record<string, string> = {
    US: "America/New_York",
    GB: "Europe/London",
    IN: "Asia/Kolkata",
    DE: "Europe/Berlin",
    FR: "Europe/Paris",
    AU: "Australia/Sydney",
    CA: "America/Toronto",
    SG: "Asia/Singapore",
    AE: "Asia/Dubai",
    JP: "Asia/Tokyo",
  };

  const { data: touchForTz } = await db
    .from("outreach_touches")
    .select("recipient_timezone, lead:leads!lead_id (country)")
    .eq("id", touchId)
    .maybeSingle() as { data: { recipient_timezone: string | null; lead: { country: string | null } | null } | null };

  const recipientCountry = ((touchForTz?.lead?.country) ?? "US").toUpperCase();
  const tz = touchForTz?.recipient_timezone ?? COUNTRY_TZ[recipientCountry] ?? "America/New_York";

  const now = new Date();
  const localParts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
    weekday: "short",
  }).formatToParts(now);

  const hour    = parseInt(localParts.find((p) => p.type === "hour")!.value);
  const weekday = localParts.find((p) => p.type === "weekday")!.value;

  const isWeekend      = weekday === "Sat" || weekday === "Sun";
  const isTooEarly     = hour < 9;
  const isTooLate      = hour >= 18;
  const isOutsideHours = isWeekend || isTooEarly || isTooLate;

  if (isOutsideHours) {
    const nextOpen = getNextBusinessOpen(tz);
    await db
      .from("outreach_touches")
      .update({
        status: "scheduled",
        scheduled_for: nextOpen.toISOString(),
        recipient_timezone: tz,
      })
      .eq("id", touchId);

    return new Response(
      JSON.stringify({
        scheduled: true,
        scheduled_for: nextOpen.toISOString(),
        message: "Outside business hours. Saved as draft. Pending admin confirmation before send.",
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
        reply_to: "eswar@eswarcreatives.in",
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
