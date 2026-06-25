import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Hard-deletes a proposal and everything that hangs off it (phases, solution
// line items, payment schedule, documents) plus any invoices raised from it, on
// behalf of an authenticated owner/admin. This MUST run server-side: the
// cascade spans owner-only tables and clears paid invoice records, so it uses
// the service role key, which can never be shipped to the browser. The browser
// calls it via supabase.functions.invoke('admin-delete-proposal', ...), which
// forwards the caller's JWT so we can verify they are allowed to delete.
//
// The multi-table delete itself happens atomically inside the
// public.admin_delete_proposal() SQL function (migration 0061): a single
// transaction, so there is never a partial delete.

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

type Body = { proposal_id?: string };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return fail("not_authenticated", 401);

  // 1. Verify the caller is a signed-in owner/admin (RLS-scoped client).
  // Note: the project's is_admin() SQL helper deliberately returns false for the
  // 'owner' role, so we read the role directly here to keep the owner (the
  // super-admin) able to delete, matching admin-delete-client.
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
  const proposalId = (body.proposal_id ?? "").trim();
  if (!proposalId) return fail("proposal_required", 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 3. Atomic cascade delete. Everything happens in one transaction inside the
  // SQL function; either it all succeeds or none of it does. The function
  // returns the deleted title plus the invoice tally for the success toast.
  const { data, error: delErr } = await admin.rpc("admin_delete_proposal", {
    p_proposal_id: proposalId,
  });
  if (delErr) {
    // no_data_found is raised by the SQL function for an unknown proposal id.
    if (delErr.code === "P0002" || /proposal_not_found/.test(delErr.message)) {
      return fail("not_found", 404);
    }
    // Log server-side only; never surface a raw Postgres string to the caller.
    console.error("admin-delete-proposal: delete failed", delErr.message);
    return fail("delete_failed", 500);
  }

  const result = (data ?? {}) as {
    deleted_proposal_title?: string;
    deleted_invoices?: number;
    had_paid_invoices?: boolean;
  };

  return new Response(
    JSON.stringify({
      success: true,
      deleted_proposal_title: result.deleted_proposal_title ?? "",
      deleted_invoices: result.deleted_invoices ?? 0,
      had_paid_invoices: result.had_paid_invoices ?? false,
    }),
    { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
  );
});
