import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Notifies the studio by email whenever a client submits their sketch review.
// Triggered by a Supabase database webhook on INSERT to logo_sketch_submissions.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const TO_EMAIL = "eswar@eswarcreatives.in";
const FROM_EMAIL = "portal@eswarcreatives.in";
const ADMIN_URL = "https://eswarcreatives.in/portal/admin/sketches";

type SubmissionRecord = {
  set_id: string;
  client_id: string;
  accepted_count: number;
  passed_count: number;
  completed_at: string;
};

// DD MMM YYYY HH:mm in the studio's timezone, e.g. "08 Jun 2026 14:30".
function formatDateTime(iso: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(iso));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("day")} ${get("month")} ${get("year")} ${get("hour")}:${get("minute")}`;
  } catch {
    return iso;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Optional shared-secret check so only the configured webhook can call us.
  if (WEBHOOK_SECRET && req.headers.get("x-webhook-secret") !== WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return new Response("Email not configured", { status: 500 });
  }

  let record: SubmissionRecord | null = null;
  try {
    const body = await req.json();
    // Database webhooks wrap the row in `record`; also accept a bare row.
    record = (body?.record ?? body) as SubmissionRecord;
  } catch (err) {
    console.error("Invalid JSON body:", err);
    return new Response("Bad request", { status: 400 });
  }

  if (!record?.set_id || !record?.client_id) {
    return new Response("Missing submission fields", { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // 1. Client name from profiles.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", record.client_id)
    .single();
  const clientName = profile?.full_name ?? "A client";

  // 2. Set name from logo_sketch_sets (fall back to its number).
  const { data: set } = await supabase
    .from("logo_sketch_sets")
    .select("name, set_number")
    .eq("id", record.set_id)
    .single();
  const setName = set?.name ?? (set?.set_number ? `Set ${set.set_number}` : "Set");

  // 3. Send the notification email via Resend.
  const subject = `New submission - ${clientName}, ${setName}`;
  const text = [
    `${clientName} submitted their sketch review.`,
    `Set: ${setName}`,
    `Accepted: ${record.accepted_count}`,
    `Passed: ${record.passed_count}`,
    `Submitted: ${formatDateTime(record.completed_at)}`,
    `Admin portal: ${ADMIN_URL}`,
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: TO_EMAIL, subject, text }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("Resend error:", res.status, detail);
    return new Response("Email send failed", { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
