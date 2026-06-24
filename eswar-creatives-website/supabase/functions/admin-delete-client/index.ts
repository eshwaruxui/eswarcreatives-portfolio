import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Hard-deletes a client and all of its data (projects, orders, invoices,
// proposals, payments, ...) on behalf of an authenticated owner/admin. This MUST
// run server-side: the cascade spans owner-only tables, so it uses the service
// role key, which can never be shipped to the browser. The browser calls it via
// supabase.functions.invoke('admin-delete-client', ...), which forwards the
// caller's JWT so we can verify they are allowed to delete accounts.
//
// The multi-table delete itself happens atomically inside the
// public.admin_delete_client() SQL function (migration 0056): a single
// transaction, so there is never a partial delete.
//
// The auth user (login) is deliberately NOT deleted: we return its id + email
// so the admin can remove it manually from the Supabase dashboard.

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

type Body = { client_id?: string };

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
  const clientId = (body.client_id ?? "").trim();
  if (!clientId) return fail("client_required", 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 3. Capture the login (profile) before deleting, so we can report it for
  // manual cleanup. The clients row links to it via profile_id.
  const { data: clientRow, error: lookupErr } = await admin
    .from("clients")
    .select("profile_id, profiles(email)")
    .eq("id", clientId)
    .single();
  if (lookupErr || !clientRow) return fail("not_found", 404);
  const prof = (clientRow as { profiles?: { email?: string } | { email?: string }[] | null })
    .profiles;
  const authUserId = (clientRow as { profile_id?: string }).profile_id ?? null;
  const authUserEmail = (Array.isArray(prof) ? prof[0]?.email : prof?.email) ?? null;

  // 4. Atomic cascade delete. Everything happens in one transaction inside the
  // SQL function; either it all succeeds or none of it does.
  const { error: delErr } = await admin.rpc("admin_delete_client", {
    p_client_id: clientId,
  });
  if (delErr) {
    // Log server-side only; never surface a raw Postgres string to the caller.
    console.error("admin-delete-client: delete failed", delErr.message);
    return fail("delete_failed", 500);
  }

  // 5. Success. Return the login so the caller can prompt manual removal of the
  // auth user, which we never delete automatically.
  return new Response(
    JSON.stringify({ success: true, authUserId, authUserEmail }),
    { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
  );
});
