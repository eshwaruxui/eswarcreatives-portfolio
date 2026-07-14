import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Confirms and sends a touch that was deferred due to business hours.
// Auth: admin JWT required.
// POST body: { touch_id: string }

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const PORTAL_URL = Deno.env.get("PORTAL_URL") ?? "https://www.eswarcreatives.in";
const FROM = "Eswar Maheswaran <eswar@eswarcreatives.in>";

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

function substitute(template: string, vars: Record<string, string>): string {
  let out = template;
  for (const [key, val] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, val);
  }
  return out;
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
    .replace(/\n\n/g, "<br><br>")
    .replace(/\n/g, "<br>");
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
      subject_snapshot, body_snapshot, step_id,
      lead:leads!lead_id (
        id, first_name, last_name, company, email, specific_observation,
        unsubscribe_token, status
      ),
      step:sequence_steps!step_id (
        subject_template, body_template
      )
    `)
    .eq("id", touchId)
    .maybeSingle();

  if (touchErr || !touch) return fail("invalid_touch");
  if (touch.channel !== "email") return fail("invalid_touch");
  if (touch.status !== "scheduled") return fail("not_scheduled");

  const lead = touch.lead as {
    id: string; first_name: string; last_name: string | null; company: string;
    email: string | null; specific_observation: string | null;
    unsubscribe_token: string; status: string;
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

  // Mark confirmed by admin
  await db
    .from("outreach_touches")
    .update({
      draft_confirmed_at: new Date().toISOString(),
      draft_confirmed_by: auth.user.id,
    })
    .eq("id", touchId);

  const step = touch.step as { subject_template: string | null; body_template: string } | null;
  const unsubUrl = `${PORTAL_URL}/unsubscribe/${lead.unsubscribe_token}`;
  const vars: Record<string, string> = {
    first_name: lead.first_name,
    company: lead.company,
    specific_observation: lead.specific_observation ?? "",
    flow: "product",
    unsubscribe_url: unsubUrl,
    topic: "{{topic}}",
  };

  const rawSubject = step?.subject_template ?? touch.subject_snapshot ?? "";
  const rawBody = step?.body_template ?? touch.body_snapshot ?? "";
  const renderedSubject = substitute(rawSubject, vars);
  let renderedBody = substitute(rawBody, vars);

  if (lead.company.slice(-1).toLowerCase() === "s") {
    renderedBody = renderedBody.replaceAll(`${lead.company}'s`, `${lead.company}'`);
  }

  if (renderedBody.includes("{{")) return fail("unresolved_variables");

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
        html: htmlBody(renderedBody),
      }),
    });

    if (!res.ok) {
      console.error("confirm-scheduled-touch: Resend error", res.status);
      await db
        .from("outreach_touches")
        .update({ status: "failed" })
        .eq("id", touchId);
      return fail("Could not send email. Please try again.");
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
      .eq("id", touchId);

    return ok({ sent: true });
  } catch (e) {
    console.error("confirm-scheduled-touch: exception", e);
    await db
      .from("outreach_touches")
      .update({ status: "failed" })
      .eq("id", touchId);
    return fail("Could not send email. Please try again.");
  }
});
