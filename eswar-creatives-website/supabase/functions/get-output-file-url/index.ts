import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Mints a short-lived Storage signed URL for a public Outputs file share
// link (/output/:token). No admin auth required — the token itself is the
// credential, exactly like the invoice/proposal public-link pattern.
//
// This exists because Postgres RPCs cannot mint a Storage signed URL (that's
// a Storage-API call, not SQL) — invoices/proposals never needed this since
// their public pages render structured JSON, never files. get_output_file_by_token
// (migration 0088) is called separately for the file's display metadata; this
// function is called to get the actual downloadable/previewable URL.
//
// Re-validates the token + expiry itself with the service-role client rather
// than trusting a prior RPC call, since this function alone can read storage.

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

type RequestBody = {
  token?: string;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", 405);

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return fail("bad_request", 400);
  }

  const { token } = body;
  if (!token) return fail("missing_fields", 400);

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: file, error: lookupErr } = await db
    .from("project_output_files")
    .select("id, storage_path, public_token_expires_at")
    .eq("public_token", token)
    .maybeSingle();

  if (lookupErr || !file) return fail("not_found", 404);
  if (file.public_token_expires_at && new Date(file.public_token_expires_at) <= new Date()) {
    return fail("expired", 404);
  }

  const { data: signed, error: signErr } = await db.storage
    .from("project-outputs")
    .createSignedUrl(file.storage_path, 3600);

  if (signErr || !signed?.signedUrl) {
    console.error("get-output-file-url: signing failed", signErr);
    return fail("sign_failed", 500);
  }

  return ok({ signed_url: signed.signedUrl });
});
