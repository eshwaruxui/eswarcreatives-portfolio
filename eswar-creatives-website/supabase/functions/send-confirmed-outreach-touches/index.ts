import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { htmlBody } from "../_shared/outreachEmailBody.ts";
import { resolveTimezone, computeSendDecision } from "../_shared/businessHours.ts";

// Cron-invoked. Sends outreach touches that an admin approved early from
// "Review in Advance" and whose held delivery window (9:30 AM ET next
// business day, set by confirm-scheduled-touch) has arrived.
// Re-runs the same safety checks confirm-scheduled-touch ran at approval time,
// since lead state can change in the gap between approval and delivery.
// Auth: shared secret header (no user JWT — caller is pg_cron via pg_net).
//
// Business hours are re-checked here at tick time (added 11 Aug 2026). This
// function used to trust `scheduled_for` completely, on the assumption that it
// was always a freshly-computed instant that becomes due once and is consumed
// immediately. The daily cap breaks that assumption: a touch that loses its
// slot is only `capped++` — nothing is written — so `scheduled_for` stays in
// the past indefinitely and `.lte(scheduled_for, now)` matches forever after.
// The row then ships at whatever arbitrary moment a slot next frees. That is
// exactly what happened on 11 Aug: the cap resets on the UTC day boundary,
// which is 20:00 America/New_York, so 25 US touches went out at 8 PM local.
//
// The check is deliberately stateless — an out-of-window row is skipped and
// re-evaluated on the next tick, with no write. Recomputing and persisting a
// new `scheduled_for` here was the alternative; it was not chosen because it
// would put mutation of that column back into the one function that has
// already corrupted it once, and because the approval-time target would be
// lost without a new column.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const PORTAL_URL = Deno.env.get("PORTAL_URL") ?? "https://www.eswarcreatives.in";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const FROM = "Eswar Maheswaran <eswar@eswarcreatives.in>";
const DAILY_CAP = 25;
// Raised 50 -> 200 (11 Aug 2026) so the business-hours gate below cannot let
// out-of-window rows crowd in-window rows out of a tick. The batch is only a
// candidate list: at most DAILY_CAP rows ever reach Resend, and once the cap
// is spent the loop short-circuits on its first line, so a bigger limit costs
// nothing on a normal tick. See the ordering note on the query.
const BATCH_LIMIT = 200;

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
  recipient_timezone: string | null;
  lead: {
    id: string; first_name: string; last_name: string | null; company: string;
    email: string | null; specific_observation: string | null;
    unsubscribe_token: string; status: string; country: string | null;
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
      id, subject_snapshot, body_snapshot, recipient_timezone,
      lead:leads!lead_id (
        id, first_name, last_name, company, email, specific_observation,
        unsubscribe_token, status, country
      ),
      step:sequence_steps!step_id (
        subject_template, body_template
      )
    `)
    .eq("status", "scheduled")
    .eq("channel", "email")
    .not("draft_confirmed_at", "is", null)
    .lte("scheduled_for", nowIso)
    // scheduled_for alone is not a usable sort key: an entire day's approvals
    // share one computed instant (44 of 44 eligible rows tied on it when this
    // was written), so Postgres was free to return them in any order and the
    // set that fitted inside BATCH_LIMIT was arbitrary from tick to tick.
    //
    // draft_confirmed_at is the tiebreaker: it is a real timestamp already on
    // the row, guaranteed non-null here by the .not(...) filter above, and it
    // orders by when a human actually approved the touch — oldest first, so
    // the queue drains FIFO rather than at random. id is the final key purely
    // for determinism; a bulk approve can land two rows in the same
    // millisecond, and without it those two would tie again.
    .order("scheduled_for", { ascending: true })
    .order("draft_confirmed_at", { ascending: true })
    .order("id", { ascending: true })
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
  let sent = 0, cancelled = 0, failed = 0, capped = 0, deferred = 0;

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

    // Business-hours gate. Runs after the cancel guards above so a suppressed
    // or malformed row is still cleaned out of the queue at any hour, but
    // before anything is rendered or mailed.
    //
    // Stateless by design: `scheduled_for` is never rewritten. A row outside
    // its recipient's window is simply left alone and reconsidered on the next
    // tick (every 5 minutes), so a backlog drains from 9:30 AM local onward
    // instead of firing the instant a cap slot frees. Only `sendNow` is used —
    // `decision.scheduledFor` is deliberately discarded, since persisting it
    // is the Option B behaviour this was chosen over.
    const tz = resolveTimezone(touch.recipient_timezone, lead.country);
    if (!computeSendDecision(new Date(), tz).sendNow) {
      deferred++;
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

  return new Response(JSON.stringify({ processed: (due ?? []).length, sent, cancelled, failed, capped, deferred }), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
