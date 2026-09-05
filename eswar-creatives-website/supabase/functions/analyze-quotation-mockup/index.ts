import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Quotation Module Phase 1 — mockup analysis. Mirrors
// extract-lead-from-image's shape exactly: admin JWT required, base64 image
// in, soft-fail JSON out, no image persistence (the upload only ever lives
// in the browser session, matching the precedent function). Identifies
// decoration elements in an uploaded concept/reference image and matches
// them against quotation_item_library so the client can pre-fill a rate
// where a name matches.

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

type LibraryItem = { category: string; name: string; unit: string | null; default_rate: number | null };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", 405);

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
  if (!profile || (role !== "admin" && role !== "owner")) {
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

  try {
    const decoded = atob(image_base64);
    if (decoded.length > MAX_BYTES) return fail("image_too_large");
  } catch {
    return fail("invalid_image");
  }

  // Load the active library so the model can match against real names/
  // categories instead of inventing its own vocabulary.
  const { data: libraryRows, error: libraryErr } = await callerClient
    .from("quotation_item_library")
    .select("category, name, unit, default_rate")
    .eq("is_active", true);
  if (libraryErr) {
    return fail("library_load_failed", 500);
  }
  const library = (libraryRows ?? []) as LibraryItem[];
  const categories = [...new Set(library.map((i) => i.category))];

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
        max_tokens: 1000,
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
                text: `You are an expert event decoration analyst for South Indian weddings and events. Analyze this event decoration mockup or concept image and identify all decoration elements present.

Return ONLY a JSON array: [{"name": "item name", "category": "category", "qty": number, "unit": "unit type"}]

Categories: ${categories.length > 0 ? categories.join(", ") : "Stage & Backdrop, Floral Decoration, Lighting & AV, Photography & Video, Event Management, Furniture & Props"}

Match names to known items where possible: ${library.map((i) => i.name).join(", ")}

Rules:
- name: the decoration element, matched to a known item name above where one clearly applies, otherwise a short descriptive name.
- category: one of the categories listed above.
- qty: a reasonable count for what's visible (default 1 if not countable).
- unit: a short unit label (e.g. "per event", "per sqft", "per unit").
- Return only JSON array, no explanation, no markdown, no code fences.`,
              },
            ],
          },
        ],
      }),
    });
  } catch {
    return ok({ error: "analysis_failed" });
  }

  if (!anthropicRes.ok) {
    return ok({ error: "analysis_failed" });
  }

  let anthropicJson: { content?: { type: string; text: string }[] };
  try {
    anthropicJson = await anthropicRes.json();
  } catch {
    return ok({ error: "analysis_failed" });
  }

  const text = anthropicJson?.content?.[0]?.text ?? "[]";

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim()) as {
      name?: string;
      category?: string;
      qty?: number;
      unit?: string;
    }[];

    const items = parsed.map((p) => {
      const name = (p.name ?? "").trim();
      const match =
        library.find((lib) => lib.name.toLowerCase() === name.toLowerCase()) ??
        library.find((lib) => lib.category === p.category);
      return {
        category: p.category || match?.category || categories[0] || "Stage & Backdrop",
        label: name || match?.name || "Decoration item",
        unit: p.unit || match?.unit || "per event",
        qty: typeof p.qty === "number" && p.qty > 0 ? p.qty : 1,
        rate: match?.default_rate ?? 0,
        source: "mockup_ai",
      };
    });

    return ok({ data: items });
  } catch {
    return ok({ error: "analysis_failed" });
  }
});
