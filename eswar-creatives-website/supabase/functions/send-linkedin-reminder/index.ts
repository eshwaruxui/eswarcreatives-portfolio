import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Sends a weekly LinkedIn post reminder email every Sunday 12:30 UTC (18:00 IST).
// Triggered via pg_cron. Can also be triggered manually (admin "Send Test Reminder" button).
// If fewer than 3 posts are scheduled for next week, sends reminder to eswar@eswarcreatives.in.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = "EswarCreatives <eswar@eswarcreatives.in>";
const PORTAL_URL = Deno.env.get("PORTAL_URL") ?? "https://www.eswarcreatives.in";
const ADMIN_EMAIL = "eswar@eswarcreatives.in";

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

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function htmlReminder(missing: number, monDate: Date, friDate: Date): string {
  const weekRange = `${formatDate(monDate)} to ${formatDate(friDate)}`;
  const ctaUrl = `${PORTAL_URL}/portal/admin/outreach?tab=linkedin`;
  return `<!doctype html>
<html>
  <body style="margin:0;background:#FAF8F4;font-family:Inter,Arial,sans-serif;color:#0A1A1B;">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#024C4F;margin-bottom:24px;">
        EswarCreatives
      </div>
      <h2 style="font-size:18px;font-weight:600;color:#1A1A1A;margin:0 0 16px;">LinkedIn posts missing for next week</h2>
      <p style="font-size:15px;line-height:1.65;color:#1A1A1A;margin:0 0 20px;">
        You have <strong>${missing} post slot${missing !== 1 ? "s" : ""} unfilled</strong> for the week of ${weekRange}.
        Posts are scheduled for Monday, Wednesday, and Friday.
      </p>
      <a href="${ctaUrl}" style="display:inline-block;background:#024C4F;color:#FFFFFF;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;padding:12px 24px;">
        Add Posts Now
      </a>
    </div>
  </body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Get next Mon/Wed/Fri dates
  const { data: weekData, error: weekErr } = await db.rpc("get_upcoming_linkedin_week");
  if (weekErr || !weekData || weekData.length === 0) {
    console.error("send-linkedin-reminder: RPC error", weekErr);
    return ok({ reminded: false, error: "rpc_failed" });
  }

  const { monday, wednesday, friday } = weekData[0] as {
    monday: string;
    wednesday: string;
    friday: string;
  };

  const monDate = new Date(monday);
  const friDate = new Date(friday);

  // Count posts that exist for those 3 slots
  const { count, error: countErr } = await db
    .from("linkedin_posts")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .in("scheduled_for", [
      `${monday}T09:00:00+05:30`,
      `${wednesday}T09:00:00+05:30`,
      `${friday}T09:00:00+05:30`,
    ]);

  if (countErr) {
    console.error("send-linkedin-reminder: count error", countErr);
    return ok({ reminded: false, error: "count_failed" });
  }

  const filledCount = count ?? 0;
  const missing = 3 - filledCount;

  if (missing <= 0) {
    return ok({ reminded: false, missing: 0 });
  }

  // Update reminder_sent_at on any existing posts for this week
  await db
    .from("linkedin_posts")
    .update({ reminder_sent_at: new Date().toISOString() })
    .in("scheduled_for", [
      `${monday}T09:00:00+05:30`,
      `${wednesday}T09:00:00+05:30`,
      `${friday}T09:00:00+05:30`,
    ]);

  if (!RESEND_API_KEY) {
    console.error("send-linkedin-reminder: RESEND_API_KEY not configured");
    return ok({ reminded: false, missing, error: "email_not_configured" });
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
        to: ADMIN_EMAIL,
        subject: `Action needed: ${missing} LinkedIn post${missing !== 1 ? "s" : ""} missing for next week`,
        text: `You have ${missing} post slot${missing !== 1 ? "s" : ""} unfilled for the week of ${formatDate(monDate)} to ${formatDate(friDate)}. Posts are scheduled for Monday, Wednesday, and Friday.\n\nAdd them now: ${PORTAL_URL}/portal/admin/outreach?tab=linkedin`,
        html: htmlReminder(missing, monDate, friDate),
      }),
    });

    if (!res.ok) {
      console.error("send-linkedin-reminder: Resend error", res.status);
      return ok({ reminded: false, missing });
    }

    return ok({ reminded: true, missing });
  } catch (e) {
    console.error("send-linkedin-reminder: exception", e);
    return ok({ reminded: false, missing });
  }
});
