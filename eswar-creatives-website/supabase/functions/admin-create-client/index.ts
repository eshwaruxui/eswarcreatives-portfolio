import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Creates a client login (auth user + profile + clients row) on behalf of an
// authenticated owner/admin. This MUST run server-side: it uses the service
// role key, which can never be shipped to the browser. The browser calls it via
// supabase.functions.invoke('admin-create-client', ...), which forwards the
// caller's JWT so we can verify they are allowed to create accounts.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Stable error codes; the frontend maps these to plain-language messages and
// never shows a raw Supabase string.
function fail(code: string, status: number) {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

type Body = {
  company_name?: string;
  contact_name?: string;
  email?: string;
  country?: string;
  currency?: string;
  password?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return fail("not_authenticated", 401);

  // 1. Verify the caller is a signed-in owner/admin (RLS-scoped client).
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

  // 2. Validate input.
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return fail("bad_request", 400);
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const companyName = (body.company_name ?? "").trim();
  const contactName = (body.contact_name ?? "").trim();
  const country = (body.country ?? "IN").trim() || "IN";
  const currency = (body.currency ?? "INR").trim() || "INR";

  if (!companyName) return fail("company_required", 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("invalid_email", 400);
  if (password.length < 8) return fail("weak_password", 400);

  // 3. Create the auth user with the service role. The on_auth_user_created
  // trigger auto-inserts the profile from user_metadata (role defaults client).
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: contactName || companyName },
  });
  if (createErr || !created?.user) {
    const msg = (createErr?.message ?? "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return fail("email_exists", 409);
    }
    if (msg.includes("password")) return fail("weak_password", 400);
    return fail("create_failed", 500);
  }
  const uid = created.user.id;

  // 4. Ensure the profile reflects role=client + name (trigger may race/absent).
  await admin.from("profiles").upsert({
    id: uid,
    email,
    full_name: contactName || companyName,
    role: "client",
  });

  // 5. Create the clients row.
  const { data: client, error: clientErr } = await admin
    .from("clients")
    .insert({
      profile_id: uid,
      company_name: companyName,
      contact_name: contactName || null,
      country,
      preferred_currency: currency,
    })
    .select("id")
    .single();

  if (clientErr || !client) {
    // Roll back the half-created account so a retry can reuse the email.
    await admin.auth.admin.deleteUser(uid);
    return fail("create_failed", 500);
  }

  return new Response(JSON.stringify({ id: client.id }), {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
