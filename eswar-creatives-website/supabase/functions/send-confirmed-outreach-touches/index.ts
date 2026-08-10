import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { htmlBody } from "../_shared/outreachEmailBody.ts";

// Cron-invoked. Sends outreach touches that an admin approved early from
// "Review in Advance" and whose held delivery window (9:30 AM ET next
// business day, set by confirm-scheduled-touch) has arrived.
// Re-runs the same safety checks confirm-scheduled-touch ran at approval time,
// since lead state can change in the gap between approval and delivery.
// Auth: shared secret header (no user JWT — caller is pg_cron via pg_net).

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const PORTAL_URL = Deno.env.get("PORTAL_URL") ?? "https://www.eswarcreatives.in";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const FROM = "Eswar Maheswaran <eswar@eswarcreatives.in>";
const DAILY_CAP = 25;
const BATCH_LIMIT = 50;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function substitute(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, val] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, val);
  }
  return out;
}

type DueTouch = {
  id: string;
  subject_snapshot: string | null;
  body_snapshot: string | null;
  lead: {
    id: string; first_name: string; last_name: string | null; company: string;
    email: string | null; specific_observation: string | null;
    unsubscribe_token: string; status: string;
  } | null;
  step: { subject_template: string | null; body_template: string } | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405, headers: CORS });

  if (!CRON_SECRET || req.headers.get("x-cron-secret") !== CRON_SECRET) {
    return new Response("not_authenticated", { status: 401, headers: CORS });
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const nowIso = new Date().toISOString();
  const { data: due, error: dueErr } = await db
    .from("outreach_touches")
    .select(`
      id, subject_snapshot, body_snapshot,
      lead:leads!lead_id (
        id, first_name, last_name, company, email, specific_observation,
        unsubscribe_token, status
      ),
      step:sequence_steps!step_id (
        subject_template, body_template
      )
    `)
    .eq("status", "scheduled")
    .eq("channel", "email")
    .not("draft_confirmed_at", "is", null)
    .lte("scheduled_for", nowIso)
    .order("scheduled_for", { ascending: true })
    .limit(BATCH_LIMIT);

  if (dueErr) {
    return new Response(JSON.stringify({ error: "query_failed" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const { count: sentToday } = await db
    .from("outreach_touches")
    .select("id", { count: "exact", head: true })
    .eq("channel", "email")
    .eq("status", "sent")
    .gte("sent_at", `${todayStr}T00:00:00Z`)
    .lte("sent_at", `${todayStr}T23:59:59Z`);

  let remainingCap = DAILY_CAP - (sentToday ?? 0);
  let sent = 0, cancelled = 0, failed = 0, capped = 0;

  for (const touch of (due ?? []) as DueTouch[]) {
    const lead = touch.lead;

    if (remainingCap <= 0) { capped++; continue; }

    if (!lead || !lead.email) {
      await db.from("outreach_touches").update({ status: "cancelled", skipped_reason: "no_email" }).eq("id", touch.id);
      cancelled++;
      continue;
    }

    const suppressed = lead.status === "unsubscribed" || lead.status === "bounced";
    if (suppressed) {
      await db.from("outreach_touches").update({ status: "cancelled", skipped_reason: "suppressed" }).eq("id", touch.id);
      cancelled++;
      continue;
    }

    const { data: inSuppression } = await db
      .from("suppression_list")
      .select("id")
      .eq("email", lead.email.toLowerCase())
      .maybeSingle();
    if (inSuppression) {
      await db.from("outreach_touches").update({ status: "cancelled", skipped_reason: "suppressed" }).eq("id", touch.id);
      cancelled++;
      continue;
    }

    if (!lead.specific_observation || lead.specific_observation.trim() === "") {
      await db.from("outreach_touches").update({ status: "cancelled", skipped_reason: "missing_observation" }).eq("id", touch.id);
      cancelled++;
      continue;
    }

    const unsubUrl = `${PORTAL_URL}/unsubscribe/${lead.unsubscribe_token}`;
    const vars: Record<string, string> = {
      first_name: lead.first_name,
      company: lead.company,
      specific_observation: lead.specific_observation ?? "",
      flow: "product",
      unsubscribe_url: unsubUrl,
      topic: "{{topic}}",
    };

    // Snapshot wins over template — see the matching comment in
    // send-outreach-email. A non-null snapshot on a still-scheduled touch is
    // always a deliberate admin edit, and subject/body are read as a pair
    // because TouchPreviewModal always writes them as a pair.
    const rawSubject = touch.subject_snapshot ?? touch.step?.subject_template ?? "";
    const rawBody = touch.body_snapshot ?? touch.step?.body_template ?? "";
    let renderedSubject = substitute(rawSubject, vars);
    let renderedBody = substitute(rawBody, vars);

    // Possessive fix applies to the subject too — the subject templates use
    // {{company}}'s, so body-only left a malformed subject line.
    if (lead.company.slice(-1).toLowerCase() === "s") {
      const possessive = `${lead.company}'s`;
      const fixed = `${lead.company}'`;
      renderedSubject = renderedSubject.replaceAll(possessive, fixed);
      renderedBody = renderedBody.replaceAll(possessive, fixed);
    }

    if (renderedBody.includes("{{")) {
      await db.from("outreach_touches").update({ status: "cancelled", skipped_reason: "unresolved_variables" }).eq("id", touch.id);
      cancelled++;
      continue;
    }

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
        console.error("send-confirmed-outreach-touches: Resend error", res.status);
        await db.from("outreach_touches").update({ status: "failed" }).eq("id", touch.id);
        failed++;
        continue;
      }

      const resJson = await res.json() as { id?: string };
      await db
        .from("outreach_touches")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          subject_snapshot: renderedSubject,
          body_snapshot: renderedBody,
          resend_message_id: resJson.id ?? null,
        })
        .eq("id", touch.id);

      sent++;
      remainingCap--;
    } catch (e) {
      console.error("send-confirmed-outreach-touches: exception", e);
      await db.from("outreach_touches").update({ status: "failed" }).eq("id", touch.id);
      failed++;
    }
  }

  return new Response(JSON.stringify({ processed: (due ?? []).length, sent, cancelled, failed, capped }), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
