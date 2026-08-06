import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveTimezone, computeSendDecision } from "../_shared/businessHours.ts";

// Approves a touch early from "Review in Advance" (tomorrow's queue).
// Does NOT send directly here (no Resend call) — it stamps the approval and
// sets scheduled_for using the same 9:30 AM-5:30 PM recipient-local-time
// policy as send-outreach-email; send-confirmed-outreach-touches
// (cron-invoked, every 5 min) does the actual send once that time arrives,
// re-running these same safety checks. If the recipient's local time is
// already within the window when the admin approves, scheduled_for is set
// to "now" so the next cron tick (within 5 minutes) completes it — as close
// to immediate as this architecture allows, since this function itself
// never calls Resend.
// Auth: admin JWT required.
// POST body: { touch_id: string }

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", 405);

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

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: touch, error: touchErr } = await db
    .from("outreach_touches")
    .select(`
      id, channel, status, recipient_timezone, draft_confirmed_at,
      lead:leads!lead_id (
        id, email, specific_observation, status, country
      )
    `)
    .eq("id", touchId)
    .maybeSingle();

  if (touchErr || !touch) return fail("invalid_touch");
  if (touch.channel !== "email") return fail("invalid_touch");
  if (touch.status !== "scheduled") return fail("not_scheduled");
  // A second approve call on an already-approved touch (stale UI, a
  // double-click, another tab) must not silently recompute scheduled_for —
  // if the recipient's window has since closed, that would push back an
  // already-correctly-scheduled send to the next business day.
  if (touch.draft_confirmed_at) return fail("already_approved");

  const lead = touch.lead as {
    id: string; email: string | null; specific_observation: string | null; status: string; country: string | null;
  };

  if (!lead.email) return fail("no_email");

  const suppressed = lead.status === "unsubscribed" || lead.status === "bounced";
  if (suppressed) return fail("suppressed");

  const { data: inSuppression } = await db
    .from("suppression_list")
    .select("id")
    .eq("email", lead.email.toLowerCase())
    .maybeSingle();
  if (inSuppression) {
    await db
      .from("outreach_touches")
      .update({ status: "cancelled", skipped_reason: "suppressed" })
      .eq("id", touchId);
    return fail("suppressed");
  }

  if (!lead.specific_observation || lead.specific_observation.trim() === "") {
    return fail("missing_observation");
  }

  const tz = resolveTimezone(touch.recipient_timezone, lead.country);
  const decision = computeSendDecision(new Date(), tz);
  const holdUntil = decision.sendNow ? new Date() : decision.scheduledFor;

  await db
    .from("outreach_touches")
    .update({
      draft_confirmed_at: new Date().toISOString(),
      draft_confirmed_by: auth.user.id,
      scheduled_for: holdUntil.toISOString(),
      recipient_timezone: tz,
    })
    .eq("id", touchId);

  return ok({ approved: true, hold_until: holdUntil.toISOString(), recipient_timezone: tz });
});
