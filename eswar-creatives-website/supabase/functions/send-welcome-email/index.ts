import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Sends the client portal welcome email. Called by admin-create-client after a
// client login is successfully provisioned. Failure here must NEVER block client
// creation: the caller treats this as best-effort and we always return 200 with
// an `emailSent` flag so the caller can record a warning instead of an error.
//
// Delivery uses Resend (RESEND_API_KEY). If the key is not configured we simply
// report emailSent:false rather than failing.
//
// TODO (Phase 10): WhatsApp welcome notification. Not implemented here.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM = "Eswar Creatives <eswar@eswarcreatives.in>";
const PORTAL_URL = "https://www.eswarcreatives.in/portal";

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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function plainText(fullName: string, email: string): string {
  return [
    `Hello ${fullName},`,
    "",
    "Your client portal is ready. Here you can track your project, review proposals, view invoices, and give feedback on concepts.",
    "",
    `Portal: ${PORTAL_URL}`,
    `Your login: ${email}`,
    "",
    "If you need help, reply to this email.",
    "",
    "Eswar",
    "Eswar Creatives",
  ].join("\n");
}

function htmlBody(fullName: string, email: string): string {
  const name = escapeHtml(fullName);
  const mail = escapeHtml(email);
  // Text wordmark rather than an embedded SVG: many email clients block SVG, so
  // a styled wordmark renders reliably everywhere.
  return `<!doctype html>
<html>
  <body style="margin:0;background:#FAF8F4;font-family:Inter,Arial,sans-serif;color:#0A1A1B;">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:600;color:#024C4F;margin-bottom:24px;">
        Eswar Creatives
      </div>
      <p style="font-size:16px;margin:0 0 16px;">Hello ${name},</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">
        Your client portal is ready. Here you can track your project, review
        proposals, view invoices, and give feedback on concepts.
      </p>
      <p style="margin:0 0 24px;">
        <a href="${PORTAL_URL}" style="display:inline-block;background:#024C4F;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">
          Open your portal
        </a>
      </p>
      <p style="font-size:14px;line-height:1.6;margin:0 0 8px;color:#3D6163;">
        Portal: <a href="${PORTAL_URL}" style="color:#007872;">${PORTAL_URL}</a><br/>
        Your login: ${mail}
      </p>
      <p style="font-size:14px;line-height:1.6;margin:24px 0 0;">
        If you need help, reply to this email.
      </p>
      <p style="font-size:15px;line-height:1.6;margin:16px 0 0;">
        Eswar<br/><span style="color:#3D6163;">Eswar Creatives</span>
      </p>
    </div>
  </body>
</html>`;
}

type Body = { email?: string; full_name?: string };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return ok({ success: true, emailSent: false });

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return ok({ success: true, emailSent: false });
  }

  const email = (body.email ?? "").trim();
  const fullName = (body.full_name ?? "").trim() || "there";
  if (!email) return ok({ success: true, emailSent: false });

  // No provider configured: report a non-fatal warning.
  if (!RESEND_API_KEY) {
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
        to: email,
        subject: "Welcome to the Eswar Creatives Client Portal",
        text: plainText(fullName, email),
        html: htmlBody(fullName, email),
      }),
    });
    if (!res.ok) {
      // Log server-side only; never surface provider detail to the caller.
      console.error("send-welcome-email: resend returned", res.status);
      return ok({ success: true, emailSent: false });
    }
    return ok({ success: true, emailSent: true });
  } catch (e) {
    console.error("send-welcome-email: send failed", e);
    return ok({ success: true, emailSent: false });
  }
});
