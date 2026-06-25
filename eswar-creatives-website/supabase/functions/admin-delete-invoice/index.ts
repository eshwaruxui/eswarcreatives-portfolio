import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Hard-deletes a single standalone invoice on behalf of an authenticated
// owner/admin. This MUST run server-side: invoices are owner-only and a paid
// invoice is a payment record, so the delete uses the service role key, which
// can never be shipped to the browser. The browser calls it via
// supabase.functions.invoke('admin-delete-invoice', ...), forwarding the
// caller's JWT so we can verify they are allowed to delete.
//
// An invoice that is linked to a proposal (proposal_id is set) is NOT deletable
// here: it must be removed by deleting the proposal (admin-delete-proposal), so
// the proposal and its invoices stay consistent. We reject those with a 400.

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

type Body = { invoice_id?: string };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return fail("not_authenticated", 401);

  // 1. Verify the caller is a signed-in owner/admin (RLS-scoped client).
  // Note: is_admin() returns false for the 'owner' role, so we read the role
  // directly to keep the owner able to delete, matching admin-delete-client.
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
  const invoiceId = (body.invoice_id ?? "").trim();
  if (!invoiceId) return fail("invoice_required", 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 3. Look up the invoice to report it back and to enforce the standalone rule.
  const { data: invoice, error: lookupErr } = await admin
    .from("invoices")
    .select("invoice_number, amount, status, proposal_id")
    .eq("id", invoiceId)
    .single();
  if (lookupErr || !invoice) return fail("not_found", 404);

  // 4. Linked invoices are removed via their proposal, never on their own.
  if (invoice.proposal_id) return fail("invoice_linked", 400);

  // 5. Delete the standalone invoice.
  const { error: delErr } = await admin
    .from("invoices")
    .delete()
    .eq("id", invoiceId);
  if (delErr) {
    // Log server-side only; never surface a raw Postgres string to the caller.
    console.error("admin-delete-invoice: delete failed", delErr.message);
    return fail("delete_failed", 500);
  }

  return new Response(
    JSON.stringify({
      success: true,
      deleted_invoice_number: invoice.invoice_number ?? "",
      amount: Number(invoice.amount) || 0,
    }),
    { status: 200, headers: { ...CORS, "Content-Type": "application/json" } }
  );
});
