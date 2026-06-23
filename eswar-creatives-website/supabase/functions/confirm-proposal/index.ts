import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Accepts a proposal on behalf of the signed-in client. The heavy lifting (and
// the single-transaction guarantee) lives in the confirm_proposal() SQL function
// (migration 0036), which updates the proposal, creates the project, and issues
// the 50% deposit invoice atomically. This function forwards the caller's JWT so
// auth.uid() inside the RPC identifies the client and self-authorises the action.
// It returns stable error codes; the frontend maps them to plain-language copy
// and never shows a raw Supabase string.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
function fail(code: string, status: number) {
  return json({ error: code }, status);
}

// Map the RPC's raised messages to stable codes + HTTP statuses.
function mapRpcError(message: string): { code: string; status: number } {
  const m = (message || "").toUpperCase();
  if (m.includes("NOT_AUTHENTICATED")) return { code: "not_authenticated", status: 401 };
  if (m.includes("NOT_AUTHORIZED")) return { code: "not_allowed", status: 403 };
  if (m.includes("PROPOSAL_NOT_FOUND")) return { code: "not_found", status: 404 };
  if (m.includes("INVALID_STATUS")) return { code: "invalid_status", status: 409 };
  if (m.includes("NO_CLIENT")) return { code: "no_client", status: 409 };
  return { code: "confirm_failed", status: 500 };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return fail("not_authenticated", 401);

  let body: { proposal_id?: string };
  try {
    body = await req.json();
  } catch {
    return fail("bad_request", 400);
  }
  const proposalId = (body.proposal_id ?? "").trim();
  if (!proposalId) return fail("bad_request", 400);

  // RLS-scoped client carrying the caller's JWT, so auth.uid() resolves inside
  // the SECURITY DEFINER confirm_proposal() function.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: auth } = await caller.auth.getUser();
  if (!auth?.user) return fail("not_authenticated", 401);

  const { data, error } = await caller.rpc("confirm_proposal", {
    p_proposal_id: proposalId,
  });
  if (error) {
    const { code, status } = mapRpcError(error.message);
    return fail(code, status);
  }

  const result = (data ?? {}) as { project_id?: string; invoice_id?: string };
  return json(
    { success: true, project_id: result.project_id, invoice_id: result.invoice_id },
    200
  );
});
