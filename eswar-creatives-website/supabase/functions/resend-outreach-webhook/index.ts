import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Handles Resend webhook events for outreach emails.
// No JWT auth (Resend calls this directly). Signature verified via HMAC-SHA256.
// Events handled: email.bounced, email.opened. All others are silently ignored.
// Idempotent by resend_message_id.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";

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

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(payload);
  } catch {
    return ok();
  }

  const eventType = event.type ?? "";
  const data = event.data ?? {};
  const messageId = (data.email_id ?? data.id ?? "") as string;

  if (!messageId) return ok();

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  if (eventType === "email.bounced") {
    const { data: touch } = await db
      .from("outreach_touches")
      .select("id, lead_id")
      .eq("resend_message_id", messageId)
      .maybeSingle();

    if (touch) {
      // Mark touch bounced
      await db
        .from("outreach_touches")
        .update({ bounced_at: new Date().toISOString() })
        .eq("id", touch.id);

      // Load lead email
      const { data: lead } = await db
        .from("leads")
        .select("id, email, status")
        .eq("id", touch.lead_id)
        .maybeSingle();

      if (lead) {
        // Set lead status to bounced
        await db
          .from("leads")
          .update({ status: "bounced" })
          .eq("id", lead.id);

        // Add to suppression list
        if (lead.email) {
          await db
            .from("suppression_list")
            .upsert({ email: lead.email.toLowerCase(), reason: "hard_bounce" }, { onConflict: "email", ignoreDuplicates: true });
        }

        // Cancel all remaining scheduled email touches
        await db
          .from("outreach_touches")
          .update({ status: "cancelled", skipped_reason: "hard_bounce" })
          .eq("lead_id", lead.id)
          .eq("status", "scheduled")
          .eq("channel", "email");
      }
    }
  } else if (eventType === "email.opened") {
    const { data: touch } = await db
      .from("outreach_touches")
      .select("id, opened_at")
      .eq("resend_message_id", messageId)
      .maybeSingle();

    if (touch && !touch.opened_at) {
      await db
        .from("outreach_touches")
        .update({ opened_at: new Date().toISOString() })
        .eq("id", touch.id);
    }
  }

  return ok();
});
