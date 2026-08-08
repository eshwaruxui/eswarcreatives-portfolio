import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Handles Resend webhook events for outreach emails.
//
// No JWT auth: Resend calls this directly and sends no Supabase JWT, so the
// function must stay verify_jwt = false (recorded in supabase/config.toml).
// Authentication is the svix HMAC-SHA256 signature instead.
//
// Events handled: email.delivered, email.opened, email.clicked,
// email.bounced, email.complained. email.sent is accepted and ignored
// because send-outreach-email already stamps sent_at at send time. Any other
// event type is accepted with 200 and ignored.
//
// There is deliberately no email.unsubscribed branch. Resend emits no such
// event (its email.* events are sent, delivered, delivery_delayed, opened,
// clicked, bounced, complained, failed, received, scheduled, suppressed).
// Unsubscribes in this system arrive through the portal's own
// /unsubscribe/:token page and the unsubscribe_by_token RPC.
//
// Idempotent by resend_message_id: every timestamp is first-occurrence only,
// so Resend's retries never overwrite an earlier event with a later one.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";

// Resend marks a permanently rejected address as Permanent. Transient and
// Undetermined are temporary failures (full mailbox, greylisting, throttling)
// and must never suppress a lead: the address may well accept mail tomorrow.
const HARD_BOUNCE_TYPE = "Permanent";

// The lead status that the Leads tab renders as its "Suppressed" filter chip
// (LeadsTab.tsx maps { val: 'unsubscribed', label: 'Suppressed' }). Bounces,
// complaints and unsubscribes all land here so a suppressed lead is findable
// in the UI; the reason each one was suppressed is preserved separately in
// leads.bounced_at / leads.complained_at and in suppression_list.reason.
const SUPPRESSED_STATUS = "unsubscribed";

// Touch states that still represent undelivered future work.
// There is no 'pending' state: the status check constraint allows
// scheduled, sent, skipped, cancelled, failed and held.
const PENDING_TOUCH_STATUSES = ["scheduled", "held"];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "svix-id, svix-timestamp, svix-signature, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function ok() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

// Returned when a database write fails. Resend retries on 5xx, so a failed
// write becomes a redelivery instead of a silently lost event.
function writeFailed(stage: string) {
  return new Response(JSON.stringify({ error: "write_failed", stage }), {
    status: 500,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function verifyResendSignature(
  payload: string,
  headers: Headers
): Promise<boolean> {
  if (!WEBHOOK_SECRET) return false;

  const svixId = headers.get("svix-id") ?? "";
  const svixTimestamp = headers.get("svix-timestamp") ?? "";
  const svixSignature = headers.get("svix-signature") ?? "";

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const toSign = `${svixId}.${svixTimestamp}.${payload}`;
  const secret = WEBHOOK_SECRET.startsWith("whsec_")
    ? WEBHOOK_SECRET.slice("whsec_".length)
    : WEBHOOK_SECRET;

  const keyBytes = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign));
  const computed = "v1," + btoa(String.fromCharCode(...new Uint8Array(sig)));

  return svixSignature.split(" ").some((s) => s === computed);
}

type Db = ReturnType<typeof createClient>;

type Bounce = { type?: string; subType?: string; message?: string };

// Stamps a first-occurrence timestamp on a touch. Returns false on a write
// error so the caller can surface it as a 500 and earn a retry. A row that
// already carries the timestamp is a no-op and still counts as success.
async function stampTouch(
  db: Db,
  messageId: string,
  column: string,
  at: string
): Promise<boolean> {
  const { data: touch, error: readErr } = await db
    .from("outreach_touches")
    .select(`id, ${column}`)
    .eq("resend_message_id", messageId)
    .maybeSingle();

  if (readErr) {
    console.error(`stampTouch(${column}): read failed`, readErr.message);
    return false;
  }
  // No matching touch is normal: Resend test events carry a synthetic
  // email_id, and transactional mail from other functions is not outreach.
  if (!touch) return true;

  const row = touch as unknown as Record<string, unknown>;
  if (row[column]) return true;

  const { error: writeErr } = await db
    .from("outreach_touches")
    .update({ [column]: at })
    .eq("id", row.id as string);

  if (writeErr) {
    console.error(`stampTouch(${column}): write failed`, writeErr.message);
    return false;
  }
  return true;
}

// Shared suppression path for a hard bounce and for a spam complaint.
// Mirrors what unsubscribe_by_token does in migration 0072, so all three
// ways a lead can become uncontactable leave the same shape behind.
async function suppressLead(
  db: Db,
  leadId: string,
  opts: { reason: "hard_bounce" | "complaint"; column: string; at: string }
): Promise<boolean> {
  const { data: lead, error: leadErr } = await db
    .from("leads")
    .select("id, email")
    .eq("id", leadId)
    .maybeSingle();

  if (leadErr) {
    console.error("suppressLead: lead read failed", leadErr.message);
    return false;
  }
  if (!lead) return true;

  const { error: statusErr } = await db
    .from("leads")
    .update({ status: SUPPRESSED_STATUS, [opts.column]: opts.at })
    .eq("id", lead.id);

  if (statusErr) {
    console.error("suppressLead: status update failed", statusErr.message);
    return false;
  }

  if (lead.email) {
    const { error: supErr } = await db
      .from("suppression_list")
      .upsert(
        { email: String(lead.email).toLowerCase(), reason: opts.reason },
        { onConflict: "email", ignoreDuplicates: true }
      );
    if (supErr) {
      console.error("suppressLead: suppression upsert failed", supErr.message);
      return false;
    }
  }

  // Stop everything still queued for this lead. Only email touches are
  // cancelled: a bounced or complained email says nothing about whether the
  // LinkedIn steps in the same sequence should still run.
  const { error: cancelErr } = await db
    .from("outreach_touches")
    .update({ status: "cancelled", skipped_reason: opts.reason })
    .eq("lead_id", lead.id)
    .in("status", PENDING_TOUCH_STATUSES)
    .eq("channel", "email");

  if (cancelErr) {
    console.error("suppressLead: cancel touches failed", cancelErr.message);
    return false;
  }
  return true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return ok();

  const payload = await req.text();

  const valid = await verifyResendSignature(payload, req.headers);
  if (!valid) {
    console.warn("resend-outreach-webhook: invalid signature");
    return new Response(JSON.stringify({ error: "invalid_signature" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  let event: { type?: string; created_at?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(payload);
  } catch {
    return ok();
  }

  const eventType = event.type ?? "";
  const data = event.data ?? {};
  const messageId = (data.email_id ?? data.id ?? "") as string;

  // Prefer the event's own timestamp over arrival time, so a redelivery
  // hours later still records when the recipient actually acted.
  const at = event.created_at ?? (data.created_at as string) ?? new Date().toISOString();

  if (!messageId) return ok();

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  switch (eventType) {
    case "email.delivered":
      if (!(await stampTouch(db, messageId, "delivered_at", at))) {
        return writeFailed("delivered");
      }
      break;

    case "email.opened":
      if (!(await stampTouch(db, messageId, "opened_at", at))) {
        return writeFailed("opened");
      }
      break;

    case "email.clicked":
      if (!(await stampTouch(db, messageId, "clicked_at", at))) {
        return writeFailed("clicked");
      }
      break;

    case "email.bounced": {
      const bounce = (data.bounce ?? {}) as Bounce;
      const bounceType = bounce.type ?? "Undetermined";
      const isHard = bounceType === HARD_BOUNCE_TYPE;

      const { data: touch, error: readErr } = await db
        .from("outreach_touches")
        .select("id, lead_id, bounced_at")
        .eq("resend_message_id", messageId)
        .maybeSingle();

      if (readErr) {
        console.error("bounce: touch read failed", readErr.message);
        return writeFailed("bounce_read");
      }
      if (!touch) break;

      // Record the classification for every bounce, hard or soft, so an
      // ignored soft bounce is distinguishable from an event never received.
      const patch: Record<string, unknown> = { bounce_type: bounceType };
      if (isHard && !touch.bounced_at) patch.bounced_at = at;

      const { error: touchErr } = await db
        .from("outreach_touches")
        .update(patch)
        .eq("id", touch.id);

      if (touchErr) {
        console.error("bounce: touch update failed", touchErr.message);
        return writeFailed("bounce_touch");
      }

      if (!isHard) {
        // Soft bounce: log and stop. Suppressing here would burn a
        // reachable lead over a temporary mailbox problem.
        console.log(
          `resend-outreach-webhook: soft bounce ignored, type=${bounceType} subType=${bounce.subType ?? "none"} touch=${touch.id}`
        );
        break;
      }

      console.warn(
        `resend-outreach-webhook: HARD BOUNCE, subType=${bounce.subType ?? "none"} touch=${touch.id} lead=${touch.lead_id}`
      );

      if (
        !(await suppressLead(db, touch.lead_id as string, {
          reason: "hard_bounce",
          column: "bounced_at",
          at,
        }))
      ) {
        return writeFailed("bounce_suppress");
      }
      break;
    }

    case "email.complained": {
      const { data: touch, error: readErr } = await db
        .from("outreach_touches")
        .select("id, lead_id, complained_at")
        .eq("resend_message_id", messageId)
        .maybeSingle();

      if (readErr) {
        console.error("complaint: touch read failed", readErr.message);
        return writeFailed("complaint_read");
      }
      if (!touch) break;

      // A spam complaint is the most severe signal this system can receive:
      // it damages sender reputation for every future recipient, not just
      // this one. Logged at error level so it stands out from a bounce.
      console.error(
        `resend-outreach-webhook: SPAM COMPLAINT, touch=${touch.id} lead=${touch.lead_id}. Review the sending template and list quality.`
      );

      if (!touch.complained_at) {
        const { error: touchErr } = await db
          .from("outreach_touches")
          .update({ complained_at: at })
          .eq("id", touch.id);

        if (touchErr) {
          console.error("complaint: touch update failed", touchErr.message);
          return writeFailed("complaint_touch");
        }
      }

      if (
        !(await suppressLead(db, touch.lead_id as string, {
          reason: "complaint",
          column: "complained_at",
          at,
        }))
      ) {
        return writeFailed("complaint_suppress");
      }
      break;
    }

    // email.sent and everything else: accepted, nothing to record.
    default:
      break;
  }

  return ok();
});
