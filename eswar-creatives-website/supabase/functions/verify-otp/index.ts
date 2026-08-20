import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Verifies a Msg91 OTP and mints a Supabase session for /outreach/signup.
// Public/unauthenticated endpoint (verify_jwt = false) — same reasoning as
// send-otp.
//
// There is no native Supabase phone-auth provider configured for Msg91, so
// this does not use supabase.auth.signInWithOtp/verifyOtp with type "sms".
// Instead it uses only supported Admin API calls, no hand-rolled JWT
// signing:
//   1. Msg91 confirms the code matches what it sent to this exact phone
//      number — that is the actual proof of ownership this whole flow rests
//      on.
//   2. admin.createUser() creates (or, if this phone has signed up before,
//      is tolerated as already existing) an auth.users row keyed by a
//      synthetic, internal-only email derived from the phone number. That
//      email is never shown to the user and is not a usable login path on
//      its own — profiles.email is NOT NULL with no phone column, so it only
//      exists to satisfy that constraint and give the user a stable identity.
//   3. admin.generateLink({ type: "magiclink" }) issues a one-time
//      token_hash for that same internal user. The browser then calls
//      supabase.auth.verifyOtp({ token_hash, type: "magiclink" }) itself to
//      establish the real session — this function never sees or handles raw
//      access/refresh tokens.
//   4. profiles.role is set to 'outreach_user' here, server-side, with the
//      service role. Client-side profiles RLS (0007) has no self-service
//      UPDATE/INSERT policy, only owner_all_profiles (owner-only) and a
//      read-only own-row policy, so this cannot be done from the browser —
//      it must happen here.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MSG91_AUTH_KEY = Deno.env.get("MSG91_AUTH_KEY") ?? "";

const SYNTHETIC_EMAIL_DOMAIN = "outreach.phone.eswarcreatives.internal";

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

type Body = { phone?: string; otp?: string };

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
  const otp = (body.otp ?? "").trim();
  if (!/^\+\d{10,15}$/.test(phone)) return fail("invalid_phone");
  if (!/^\d{4,8}$/.test(otp)) return fail("invalid_otp");
  const mobile = phone.slice(1);

  if (!MSG91_AUTH_KEY) {
    console.error("verify-otp: MSG91_AUTH_KEY is not set");
    return fail("verify_failed", 500);
  }

  // 1. Confirm the code with Msg91.
  try {
    const url = new URL("https://control.msg91.com/api/v5/otp/verify");
    url.searchParams.set("otp", otp);
    url.searchParams.set("mobile", mobile);

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: { authkey: MSG91_AUTH_KEY },
    });
    const json = await res.json().catch(() => null);

    if (!res.ok || !json || json.type !== "success") {
      return fail("invalid_otp");
    }
  } catch (e) {
    console.error("verify-otp: network error calling msg91", e);
    return fail("verify_failed", 502);
  }

  // 2-4. Mint the session, server-side only.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const syntheticEmail = `phone-${mobile}@${SYNTHETIC_EMAIL_DOMAIN}`;

  const { error: createErr } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    phone,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: { signup_source: "outreach_phone_otp" },
  });
  if (createErr) {
    const msg = (createErr.message ?? "").toLowerCase();
    const alreadyExists =
      msg.includes("already") || msg.includes("registered") || msg.includes("exists");
    if (!alreadyExists) {
      console.error("verify-otp: createUser failed", createErr);
      return fail("session_failed", 500);
    }
  }

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: syntheticEmail,
  });
  if (linkErr || !linkData?.properties?.hashed_token || !linkData.user?.id) {
    console.error("verify-otp: generateLink failed", linkErr);
    return fail("session_failed", 500);
  }

  const userId = linkData.user.id;

  const { error: profileErr } = await admin.from("profiles").upsert({
    id: userId,
    email: syntheticEmail,
    full_name: "",
    role: "outreach_user",
  });
  if (profileErr) {
    console.error("verify-otp: profile upsert failed", profileErr);
    return fail("session_failed", 500);
  }

  return ok({
    success: true,
    token_hash: linkData.properties.hashed_token,
  });
});
