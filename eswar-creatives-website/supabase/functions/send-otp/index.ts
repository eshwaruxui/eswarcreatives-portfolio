import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Triggers an OTP SMS via Msg91 for /outreach/signup. Public/unauthenticated
// endpoint (verify_jwt = false in supabase/config.toml) — the caller has no
// session yet at this point. Does NOT touch Supabase Auth or profiles; it
// only asks Msg91 to send the code. Session creation happens in verify-otp
// once the code comes back correct.
//
// MSG91_TEMPLATE_ID is not set yet (TODO — DLT-registered template pending).
// Until it is, every send will fail with otp_send_failed; this is expected
// and not a bug in this function.

const MSG91_AUTH_KEY = Deno.env.get("MSG91_AUTH_KEY") ?? "";
const MSG91_TEMPLATE_ID = Deno.env.get("MSG91_TEMPLATE_ID") ?? "";

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
  return new Response(JSON.stringify({ success: false, error: code }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

type Body = { phone?: string };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", 405);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return fail("bad_request");
  }

  const phone = (body.phone ?? "").trim();
  // E.164-ish: + followed by 10-15 digits. Msg91 wants the number without
  // the leading + (country code + number, digits only).
  if (!/^\+\d{10,15}$/.test(phone)) return fail("invalid_phone");
  const mobile = phone.slice(1);

  if (!MSG91_AUTH_KEY) {
    console.error("send-otp: MSG91_AUTH_KEY is not set");
    return fail("otp_send_failed", 500);
  }
  if (!MSG91_TEMPLATE_ID) {
    // Expected until the DLT template is provisioned — see file header.
    console.error("send-otp: MSG91_TEMPLATE_ID is not set (TODO)");
    return fail("otp_send_failed", 500);
  }

  try {
    const url = new URL("https://control.msg91.com/api/v5/otp");
    url.searchParams.set("template_id", MSG91_TEMPLATE_ID);
    url.searchParams.set("mobile", mobile);
    url.searchParams.set("authkey", MSG91_AUTH_KEY);

    const res = await fetch(url.toString(), { method: "POST" });
    const json = await res.json().catch(() => null);

    // Msg91 v5 returns { type: "success" } on success, { type: "error",
    // message } otherwise.
    if (!res.ok || !json || json.type !== "success") {
      console.error("send-otp: msg91 rejected the request", json);
      return fail("otp_send_failed", 502);
    }

    return ok({ success: true });
  } catch (e) {
    console.error("send-otp: network error calling msg91", e);
    return fail("otp_send_failed", 502);
  }
});
