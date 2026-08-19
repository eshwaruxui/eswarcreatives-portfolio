import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Mints a short-lived Storage signed URL for one attachment of a public
// Brand Visual Guide item. Mirrors get-brand-visual-file-url exactly, one
// level down: the credential is the attachment's OWN public_token
// (migration 0097), not the item's -- an item can now have many
// attachments, each independently resolvable, the same "per-file token"
// shape get-output-file-url already established for project_output_files.
//
// The attachment row itself carries no status/visibility -- those live on
// the parent item, so this function re-checks the PARENT's status and
// visibility itself with the service-role client, exactly like
// get-brand-visual-file-url re-checks the item rather than trusting the
// listing RPC's own filtering to have already happened. This function
// alone can read Storage, so it is the one place that must not be
// bypassed.

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

  const { data: attachment, error: lookupErr } = await db
    .from("brand_visual_item_attachments")
    .select("storage_path, file_name, brand_visual_items(status, visibility)")
    .eq("public_token", token)
    .maybeSingle();

  if (lookupErr || !attachment) return fail("not_found", 404);

  const item = attachment.brand_visual_items as unknown as
    | { status: string; visibility: string }
    | null;
  if (!item || item.status !== "published" || item.visibility !== "public") {
    return fail("not_found", 404);
  }

  // attachment.file_name is stored directly (unlike the item's own
  // storage_path, no {random_id}_ prefix to strip -- see the admin upload
  // path in ItemFormModal's attachment section).
  const [previewResult, downloadResult] = await Promise.all([
    db.storage.from("brand-visual-files").createSignedUrl(attachment.storage_path, 3600),
    db.storage.from("brand-visual-files").createSignedUrl(attachment.storage_path, 3600, { download: attachment.file_name }),
  ]);

  if (previewResult.error || !previewResult.data?.signedUrl || downloadResult.error || !downloadResult.data?.signedUrl) {
    console.error("get-brand-visual-attachment-url: signing failed", previewResult.error, downloadResult.error);
    return fail("sign_failed", 500);
  }

  return ok({ signed_url: previewResult.data.signedUrl, download_url: downloadResult.data.signedUrl });
});
