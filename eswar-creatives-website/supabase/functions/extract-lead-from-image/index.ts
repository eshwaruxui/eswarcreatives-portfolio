import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Extracts lead fields from an uploaded screenshot using Anthropic Claude.
// Auth: admin JWT required. Input: { image_base64, media_type }.
// Returns { data: {...} } on success, { error: code } on soft failure.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

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
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", 405);

  // Verify admin JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return fail("not_authenticated", 401);

  const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: auth } = await callerClient.auth.getUser();
  if (!auth?.user) return fail("not_authenticated", 401);

  const { data: profile } = await callerClient
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();
  if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
    return fail("not_allowed", 403);
  }

  let body: { image_base64?: string; media_type?: string };
  try {
    body = await req.json();
  } catch {
    return fail("bad_request");
  }

  const { image_base64, media_type } = body;

  if (!image_base64 || typeof image_base64 !== "string" || image_base64.length === 0) {
    return fail("invalid_image");
  }
  if (!media_type || !ALLOWED_MEDIA_TYPES.includes(media_type)) {
    return fail("invalid_media_type");
  }

  // Check decoded size
  try {
    const decoded = atob(image_base64);
    if (decoded.length > MAX_BYTES) return fail("image_too_large");
  } catch {
    return fail("invalid_image");
  }

  // Call Anthropic Messages API
  let anthropicRes: Response;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type, data: image_base64 },
              },
              {
                type: "text",
                text: "Extract contact details from this image. Return JSON only with these exact keys: first_name, last_name, email, linkedin_url, company, role_title, country. Use null for any field not found. Return nothing except the JSON object, no markdown, no backticks.",
              },
            ],
          },
        ],
      }),
    });
  } catch {
    // Network error — soft fail, never surface raw error
    return ok({ error: "extraction_failed" });
  }

  if (!anthropicRes.ok) {
    return ok({ error: "extraction_failed" });
  }

  let anthropicJson: { content?: { type: string; text: string }[] };
  try {
    anthropicJson = await anthropicRes.json();
  } catch {
    return ok({ error: "extraction_failed" });
  }

  const text = anthropicJson?.content?.[0]?.text ?? "";

  try {
    const extracted = JSON.parse(text) as {
      first_name?: string | null;
      last_name?: string | null;
      email?: string | null;
      linkedin_url?: string | null;
      company?: string | null;
      role_title?: string | null;
      country?: string | null;
    };
    return ok({
      data: {
        first_name: extracted.first_name ?? null,
        last_name: extracted.last_name ?? null,
        email: extracted.email ?? null,
        linkedin_url: extracted.linkedin_url ?? null,
        company: extracted.company ?? null,
        role_title: extracted.role_title ?? null,
        country: extracted.country ?? null,
      },
    });
  } catch {
    return ok({ error: "extraction_failed" });
  }
});
