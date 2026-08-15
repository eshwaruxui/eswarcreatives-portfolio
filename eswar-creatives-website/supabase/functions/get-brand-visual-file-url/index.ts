import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Mints a short-lived Storage signed URL for a public Brand Visual Guide
// item's file. No admin auth required -- the item's own public_token is the
// credential, exactly like get-output-file-url. Re-validates status and
// visibility itself with the service-role client rather than trusting the
// listing RPC's filtering to have already happened -- this function alone
// can read Storage, so it is the one place that must not be bypassed.

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

  const { data: item, error: lookupErr } = await db
    .from("brand_visual_items")
    .select("storage_path, status, visibility, title")
    .eq("public_token", token)
    .maybeSingle();

  if (lookupErr || !item) return fail("not_found", 404);
  if (item.status !== "published" || item.visibility !== "public") return fail("not_found", 404);
  if (!item.storage_path) return fail("no_file", 404);

  // Recover the original filename from the flat {random_id}_{filename}
  // storage path convention (migration 0094), same trick the client-side
  // helper uses for authenticated downloads.
  const lastSegment = item.storage_path.split("/").pop() ?? item.storage_path;
  const underscoreIdx = lastSegment.indexOf("_");
  const fileName = underscoreIdx >= 0 ? lastSegment.slice(underscoreIdx + 1) : (item.title || lastSegment);

  // Two separate signed URLs, not one reused for both -- same reasoning as
  // get-output-file-url: the download link needs Content-Disposition:
  // attachment, but applying that header to the preview URL risks an
  // iframe/img trying to download instead of render.
  const [previewResult, downloadResult] = await Promise.all([
    db.storage.from("brand-visual-files").createSignedUrl(item.storage_path, 3600),
    db.storage.from("brand-visual-files").createSignedUrl(item.storage_path, 3600, { download: fileName }),
  ]);

  if (previewResult.error || !previewResult.data?.signedUrl || downloadResult.error || !downloadResult.data?.signedUrl) {
    console.error("get-brand-visual-file-url: signing failed", previewResult.error, downloadResult.error);
    return fail("sign_failed", 500);
  }

  return ok({ signed_url: previewResult.data.signedUrl, download_url: downloadResult.data.signedUrl });
});
