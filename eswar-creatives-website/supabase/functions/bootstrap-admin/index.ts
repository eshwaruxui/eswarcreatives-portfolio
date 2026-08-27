import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// One-time tenant bootstrap: creates the FIRST admin account on a brand new
// tenant project, before any owner/admin exists to authenticate as (which is
// why this can't reuse admin-create-client's caller-JWT check — there's
// nobody to be that caller yet). Guarded by a shared secret instead.
//
// Operational pattern: deploy to the new tenant's project, invoke once via
// curl with the secret, then DELETE the function (or at minimum unset
// BOOTSTRAP_ADMIN_SECRET) from that project. A live, secret-gated
// account-creation endpoint left permanently deployed is unnecessary
// standing attack surface once the one admin account it exists for has been
// created. The source stays in the repo as the canonical pattern for the
// next tenant's onboarding, not as something that stays deployed.
//
// Deliberately does not call send-welcome-email: that email's content is
// client-onboarding-flavored (company_name/contact_name framing) and does
// not fit "you're now the admin of your own portal."

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BOOTSTRAP_SECRET = Deno.env.get("BOOTSTRAP_ADMIN_SECRET") ?? "";

function fail(code: string, status: number) {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Body = {
  email?: string;
  full_name?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return fail("method_not_allowed", 405);
  if (!BOOTSTRAP_SECRET) return fail("secret_not_configured", 500);

  const provided = req.headers.get("x-bootstrap-secret");
  if (!provided || provided !== BOOTSTRAP_SECRET) return fail("not_authenticated", 401);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return fail("bad_request", 400);
  }
  const email = (body.email ?? "").trim().toLowerCase();
  const fullName = (body.full_name ?? "").trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("invalid_email", 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Refuse to run twice: if an admin/owner already exists on this project,
  // this endpoint has done its job and should not create a second one.
  const { count: existingAdmins } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .in("role", ["owner", "admin"]);
  if ((existingAdmins ?? 0) > 0) return fail("already_bootstrapped", 409);

  const password = crypto.randomUUID().replace(/-/g, "").slice(0, 20);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || email },
  });
  if (createErr || !created?.user) {
    const msg = (createErr?.message ?? "").toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return fail("email_exists", 409);
    }
    return fail("create_failed", 500);
  }
  const uid = created.user.id;

  const { error: profileErr } = await admin.from("profiles").upsert({
    id: uid,
    email,
    full_name: fullName || email,
    role: "admin",
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(uid);
    return fail("profile_failed", 500);
  }

  return new Response(JSON.stringify({ id: uid, email, password }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
