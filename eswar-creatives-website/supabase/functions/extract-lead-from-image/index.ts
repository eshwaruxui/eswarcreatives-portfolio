import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Extracts lead fields from an uploaded screenshot using Anthropic Claude.
// Auth: admin/owner or outreach_user JWT required. Input: { image_base64,
// media_type }. Returns { data: {...} } on success, { error: code } on soft
// failure.
//
// outreach_user is capped at 20 calls per rolling 24h (outreach_lead_extractions,
// migration 0102) - opening this endpoint to self-serve signups without a
// limit would be an unmetered cost vector, since every call hits the
// Anthropic API. admin/owner are unrestricted, same as before this change.

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
  const role = profile?.role;
  if (!profile || (role !== "admin" && role !== "owner" && role !== "outreach_user")) {
    return fail("not_allowed", 403);
  }

  if (role === "outreach_user") {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countErr } = await callerClient
      .from("outreach_lead_extractions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id)
      .gte("created_at", since);
    if (countErr) {
      return fail("rate_limit_check_failed", 500);
    }
    if ((count ?? 0) >= 20) {
      return fail("rate_limit_exceeded", 429);
    }
    const { error: logErr } = await callerClient
      .from("outreach_lead_extractions")
      .insert({ user_id: auth.user.id });
    if (logErr) {
      return fail("rate_limit_check_failed", 500);
    }
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
        max_tokens: 800,
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
                text: `You are extracting professional contact information from a screenshot.
This may be a LinkedIn profile, business card, email signature, or company website.

Extract every field you can find. Return ONLY a JSON object with these exact keys:
{
  "first_name": "",
  "last_name": "",
  "full_name": "",
  "role_title": "",
  "company": "",
  "email": "",
  "phone_business": "",
  "phone_personal": "",
  "website": "",
  "linkedin_url": "",
  "location": "",
  "country": "",
  "notes": ""
}

Rules:
- phone_business: office or work phone number visible in the screenshot. Include country code if shown (e.g. +1 415 555 0100). Empty string if not found.
- phone_personal: mobile, personal, or WhatsApp number if distinctly labeled as personal or mobile. If only one phone number is visible and it is not labeled, put it in phone_business.
- website: extract any company or personal website URL visible. Strip https:// and www. prefix. If no explicit URL is visible but a business email is present (e.g. john@acme.com), infer website as "acme.com". Do not infer from gmail.com, yahoo.com, hotmail.com, outlook.com, or other free email providers.
- linkedin_url: full LinkedIn profile URL. If only a handle or username is shown, prefix with https://linkedin.com/in/
- country: infer from phone country code, city/region text, or company HQ if visible. Use ISO 3166-1 alpha-2 (US, IN, GB, DE, etc.). Default "US" if unclear.
- role_title: job title as shown. Do not abbreviate.
- notes: any other relevant detail visible (certifications, tagline, mutual connections). Empty string if nothing notable.
- If a field is not found, return an empty string. Never return null.
- Return ONLY the JSON object. No explanation, no markdown, no code fences.`,
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
      first_name?: string;
      last_name?: string;
      full_name?: string;
      role_title?: string;
      company?: string;
      email?: string;
      phone_business?: string;
      phone_personal?: string;
      website?: string;
      linkedin_url?: string;
      location?: string;
      country?: string;
      notes?: string;
    };
    const str = (v: string | undefined) => (v && v.trim() ? v.trim() : null);
    return ok({
      data: {
        first_name: str(extracted.first_name),
        last_name: str(extracted.last_name),
        full_name: str(extracted.full_name),
        role_title: str(extracted.role_title),
        company: str(extracted.company),
        email: str(extracted.email),
        phone_business: str(extracted.phone_business),
        phone_personal: str(extracted.phone_personal),
        website: str(extracted.website),
        linkedin_url: str(extracted.linkedin_url),
        location: str(extracted.location),
        country: str(extracted.country),
        notes: str(extracted.notes),
      },
    });
  } catch {
    return ok({ error: "extraction_failed" });
  }
});
