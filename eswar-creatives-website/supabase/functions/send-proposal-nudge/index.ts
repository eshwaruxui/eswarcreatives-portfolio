import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Sends a proposal reminder for a sent-but-not-yet-accepted proposal.
// Called from the admin portal ProposalNudgeModal (email channel only).
// WhatsApp is handled client-side via wa.me — this function is email-only.
//
// Auth: requires a valid admin JWT (same pattern as send-invoice-nudge).
// Token: always regenerates public_token + resets expiry to now + 7 days.
// Guards: rejects if proposal status is not 'sent'; rate-limit warning is
//         enforced client-side only (admin can override).
// Email: via Resend. Never surfaces raw errors.

const SUPABASE_URL    = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY        = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const RESEND_API_KEY  = Deno.env.get("RESEND_API_KEY") ?? "";
const PORTAL_URL      = Deno.env.get("PORTAL_URL") ?? "https://www.eswarcreatives.in";
const FROM            = "Eswar Creatives <hello@eswarcreatives.in>";

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

function htmlBody(clientName: string, proposalTitle: string, publicUrl: string): string {
  const safeUrl = escapeHtml(publicUrl);
  return `<!doctype html>
<html>
  <body style="margin:0;background:#FAF8F4;font-family:Inter,Arial,sans-serif;color:#0A1A1B;">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#024C4F;margin-bottom:24px;">
        EswarCreatives
      </div>
      <p style="font-size:15px;line-height:1.65;color:#1A1A1A;margin:0 0 16px;">
        Hi ${escapeHtml(clientName)},
      </p>
      <p style="font-size:15px;line-height:1.65;color:#1A1A1A;margin:0 0 16px;">
        Your proposal from EswarCreatives for <strong>${escapeHtml(proposalTitle)}</strong>
        is ready for your review.
      </p>
      <p style="font-size:15px;line-height:1.65;color:#1A1A1A;margin:0 0 24px;">
        You can view, review, and accept the proposal at the link below:
      </p>
      <a href="${safeUrl}"
         style="display:inline-block;background:#024C4F;color:#ffffff;font-size:15px;
                font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">
        View proposal
      </a>
      <p style="font-size:13px;color:#6B7280;margin:24px 0 0;line-height:1.6;">
        This link expires in 7 days. Reply to this email or WhatsApp us if you have any questions.
      </p>
      <p style="font-size:13px;color:#6B7280;margin:16px 0 0;">
        Best regards,<br/>
        Eswar<br/>
        Eswar Creatives<br/>
        hello@eswarcreatives.in
      </p>
    </div>
  </body>
</html>`;
}

type Body = {
  proposal_id?: string;
  channel?: "whatsapp" | "email";
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", 405);

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

  const proposalId = (body.proposal_id ?? "").trim();
  const channel    = body.channel ?? "email";

  if (!proposalId) return fail("missing_proposal_id", 400);
  if (channel !== "whatsapp" && channel !== "email") return fail("invalid_channel", 400);

  // Use service role for writes so RLS does not block the token update.
  const admin = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Fetch the proposal + linked client contact details.
  const { data: proposal, error: propErr } = await admin
    .from("proposals")
    .select(`
      id,
      title,
      status,
      total_amount,
      currency,
      client_id,
      nudge_count,
      last_nudge_sent_at,
      clients (
        whatsapp_number,
        founder_name,
        profiles ( email )
      )
    `)
    .eq("id", proposalId)
    .maybeSingle();

  if (propErr || !proposal) return fail("proposal_not_found", 404);

  // Guard: only 'sent' proposals may be nudged.
  if (proposal.status === "accepted") {
    return new Response(
      JSON.stringify({ error: "already_accepted" }),
      { status: 422, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
  if (proposal.status === "declined") {
    return new Response(
      JSON.stringify({ error: "already_declined" }),
      { status: 422, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
  if (proposal.status !== "sent") {
    return new Response(
      JSON.stringify({ error: "not_sent" }),
      { status: 422, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }

  // Regenerate public_token + reset 7-day expiry on every send.
  const newToken   = crypto.randomUUID();
  const expiresAt  = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const now        = new Date().toISOString();
  const publicUrl  = `${PORTAL_URL}/proposal/${newToken}`;

  const { error: updateErr } = await admin
    .from("proposals")
    .update({
      public_token:            newToken,
      public_token_expires_at: expiresAt,
      last_nudge_sent_at:      now,
      nudge_count:             (Number(proposal.nudge_count) || 0) + 1,
    })
    .eq("id", proposalId);

  if (updateErr) {
    console.error("send-proposal-nudge: token update failed", updateErr);
    return fail("update_failed", 500);
  }

  // Resolve client name + contact.
  const clientRow  = Array.isArray(proposal.clients) ? proposal.clients[0] : proposal.clients;
  const clientName = (clientRow as { founder_name?: string } | null)?.founder_name ?? "there";
  const whatsapp   = (clientRow as { whatsapp_number?: string } | null)?.whatsapp_number ?? null;
  const profRow    = (clientRow as { profiles?: { email?: string } | { email?: string }[] } | null)?.profiles;
  const email      = Array.isArray(profRow) ? profRow[0]?.email : (profRow as { email?: string } | null)?.email ?? null;

  // Build message preview for the log.
  const totalStr = proposal.total_amount
    ? `Rs${Number(proposal.total_amount).toLocaleString('en-IN')}`
    : "Value TBD";

  const whatsappText = channel === "whatsapp"
    ? `Hi ${clientName}, your proposal from EswarCreatives for ${proposal.title} is ready to review. Total value: ${totalStr}. View and accept here: ${publicUrl}`
    : null;

  const messagePreview = whatsappText ?? `Proposal reminder email sent for: ${proposal.title}`;

  // Log the nudge.
  const { error: logErr } = await admin
    .from("proposal_nudge_log")
    .insert({
      proposal_id:     proposalId,
      channel,
      message_preview: messagePreview.slice(0, 500),
      sent_by:         auth.user.id,
    });

  if (logErr) {
    // Non-fatal: log server-side but don't fail the request.
    console.error("send-proposal-nudge: nudge log insert failed", logErr);
  }

  // For email channel: send via Resend.
  if (channel === "email") {
    if (!email) {
      // Already guarded client-side, but enforce server-side too.
      return new Response(
        JSON.stringify({ error: "no_email" }),
        { status: 422, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    if (!RESEND_API_KEY) {
      console.error("send-proposal-nudge: RESEND_API_KEY not configured");
      return ok({ success: true, emailSent: false, token: newToken, public_url: publicUrl, reason: "email_not_configured" });
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from:    FROM,
          to:      email,
          subject: "Your proposal from EswarCreatives is ready to review",
          html:    htmlBody(clientName, proposal.title, publicUrl),
          text:    `Hi ${clientName}, your proposal from EswarCreatives for ${proposal.title} is ready to review. View and accept here: ${publicUrl}`,
        }),
      });
      if (!res.ok) {
        console.error("send-proposal-nudge: Resend returned", res.status);
        return ok({ success: true, emailSent: false, token: newToken, public_url: publicUrl });
      }
    } catch (e) {
      console.error("send-proposal-nudge: send failed", e);
      return ok({ success: true, emailSent: false, token: newToken, public_url: publicUrl });
    }

    return ok({ success: true, emailSent: true, token: newToken, public_url: publicUrl });
  }

  // WhatsApp: token + URL returned; client opens wa.me.
  if (!whatsapp) {
    return new Response(
      JSON.stringify({ error: "no_whatsapp" }),
      { status: 422, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }

  return ok({ success: true, token: newToken, public_url: publicUrl, whatsapp_text: whatsappText });
});
