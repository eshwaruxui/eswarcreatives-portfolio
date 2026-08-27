import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Sends a payment-reminder email for an invoice nudge.
// Called from the admin portal when an admin chooses the Email channel
// in the NudgeModal. The caller passes the pre-built message body and
// subject so the function is stateless (no DB reads needed here).
//
// Auth: requires a valid admin JWT (same pattern as admin-delete-invoice).
// Email delivery: Resend via RESEND_API_KEY secret. Never surfaces raw errors.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
// Tenant-specific sender identity — no hardcoded fallback. Own env vars
// (not shared with OUTREACH_SENDER_*) since this function currently uses a
// third, distinct sender persona ("hello@" vs the outreach functions'
// "eswar@") on Eswar's project. Found during FutureNorms provisioning,
// 26 Aug 2026.
const INVOICE_SENDER_NAME = Deno.env.get("INVOICE_SENDER_NAME") ?? "";
const INVOICE_SENDER_EMAIL = Deno.env.get("INVOICE_SENDER_EMAIL") ?? "";
const FROM = `${INVOICE_SENDER_NAME} <${INVOICE_SENDER_EMAIL}>`;

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

function fail(code: string, status: number) {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function htmlBody(body: string): string {
  const escaped = escapeHtml(body)
    .replace(/\n/g, "<br/>")
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

type Body = {
  to_email?: string
  to_name?: string
  invoice_number?: string
  subject?: string
  message_body?: string
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", 405);

  if (!INVOICE_SENDER_NAME || !INVOICE_SENDER_EMAIL) {
    console.error("send-invoice-nudge: INVOICE_SENDER_NAME / INVOICE_SENDER_EMAIL not configured");
    return fail("sender_not_configured", 500);
  }

  // Verify the caller is a signed-in admin.
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return fail("not_authenticated", 401);

  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: auth } = await caller.auth.getUser();
  if (!auth?.user) return fail("not_authenticated", 401);

  const { data: profile } = await caller
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();
  if (!profile || (profile.role !== "owner" && profile.role !== "admin")) {
    return fail("not_allowed", 403);
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return fail("bad_request", 400);
  }

  const toEmail = (body.to_email ?? "").trim();
  const subject = (body.subject ?? "Payment reminder").trim();
  const messageBody = (body.message_body ?? "").trim();

  if (!toEmail || !messageBody) return fail("missing_fields", 400);

  if (!RESEND_API_KEY) {
    // Resend not configured: log server-side, return non-fatal.
    console.error("send-invoice-nudge: RESEND_API_KEY not configured");
    return ok({ success: true, emailSent: false, reason: "email_not_configured" });
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
        to: toEmail,
        subject,
        text: messageBody,
        html: htmlBody(messageBody),
      }),
    });
    if (!res.ok) {
      console.error("send-invoice-nudge: Resend returned", res.status);
      return ok({ success: true, emailSent: false });
    }
    return ok({ success: true, emailSent: true });
  } catch (e) {
    console.error("send-invoice-nudge: send failed", e);
    return ok({ success: true, emailSent: false });
  }
});
