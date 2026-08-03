import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Approves a touch early from "Review in Advance" (tomorrow's queue).
// Does NOT send immediately: regardless of when the admin confirms, delivery
// is held for 9:30 AM ET on the next business day (never same day, never a
// weekend). This function just stamps the approval and moves scheduled_for
// to that hold time; send-confirmed-outreach-touches (cron-invoked) does the
// actual send once the window arrives, re-running these same safety checks.
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

function isWeekendInET(date: Date): boolean {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short" }).format(date);
  return wd === "Sat" || wd === "Sun";
}

// Converts a wall-clock date/time in a given IANA zone to the equivalent UTC instant.
function zonedWallTimeToUtc(y: number, m: number, d: number, hh: number, mm: number, timeZone: string): Date {
  let utcGuess = Date.UTC(y, m - 1, d, hh, mm);
  for (let i = 0; i < 2; i++) {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
    const parts = dtf.formatToParts(new Date(utcGuess));
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)!.value, 10);
    const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"));
    utcGuess += Date.UTC(y, m - 1, d, hh, mm) - asIfUtc;
  }
  return new Date(utcGuess);
}

// Always advances at least one calendar day in US Eastern time, skipping
// weekends, then returns that day's 9:30 AM ET as a UTC instant.
function nextBusinessDay930ET(from: Date): Date {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  });
  const parts = fmt.formatToParts(from);
  const y = parseInt(parts.find((p) => p.type === "year")!.value, 10);
  const m = parseInt(parts.find((p) => p.type === "month")!.value, 10);
  const d = parseInt(parts.find((p) => p.type === "day")!.value, 10);

  let anchor = new Date(Date.UTC(y, m - 1, d, 12));
  do {
    anchor = new Date(anchor.getTime() + 86400000);
  } while (isWeekendInET(anchor));

  const targetParts = fmt.formatToParts(anchor);
  const ty = parseInt(targetParts.find((p) => p.type === "year")!.value, 10);
  const tm = parseInt(targetParts.find((p) => p.type === "month")!.value, 10);
  const td = parseInt(targetParts.find((p) => p.type === "day")!.value, 10);

  return zonedWallTimeToUtc(ty, tm, td, 9, 30, "America/New_York");
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
      id, channel, status,
      lead:leads!lead_id (
        id, email, specific_observation, status
      )
    `)
    .eq("id", touchId)
    .maybeSingle();

  if (touchErr || !touch) return fail("invalid_touch");
  if (touch.channel !== "email") return fail("invalid_touch");
  if (touch.status !== "scheduled") return fail("not_scheduled");

  const lead = touch.lead as {
    id: string; email: string | null; specific_observation: string | null; status: string;
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

  const holdUntil = nextBusinessDay930ET(new Date());

  await db
    .from("outreach_touches")
    .update({
      draft_confirmed_at: new Date().toISOString(),
      draft_confirmed_by: auth.user.id,
      scheduled_for: holdUntil.toISOString(),
    })
    .eq("id", touchId);

  return ok({ approved: true, hold_until: holdUntil.toISOString() });
});
