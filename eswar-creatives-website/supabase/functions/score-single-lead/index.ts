import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Scores a single lead against a saved ICP profile, from stored lead fields
// only (no screenshots). Companion to process-shortlist-run, which is
// vision-based and requires a shortlist_runs row + uploaded screenshots -
// there was no text-only, single-lead scoring path before this function.
// Auth: admin JWT required. Input: { lead_id, vertical }.
// Returns { icp_score, icp_match_reason } - the caller is responsible for
// writing these back onto the lead row.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const VERTICALS = ["design_systems", "branding"] as const;
type Vertical = (typeof VERTICALS)[number];

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

  let body: { lead_id?: string; vertical?: string };
  try {
    body = await req.json();
  } catch {
    return fail("bad_request");
  }

  const { lead_id, vertical } = body;
  if (!lead_id || typeof lead_id !== "string") return fail("invalid_lead_id");
  if (!vertical || !VERTICALS.includes(vertical as Vertical)) return fail("invalid_vertical");

  const { data: lead } = await callerClient
    .from("leads")
    .select("first_name, last_name, company, role_title, segment")
    .eq("id", lead_id)
    .single();
  if (!lead) return fail("lead_not_found", 404);

  const { data: icpConfig } = await callerClient
    .from("icp_configs")
    .select("icp_text, goal_text")
    .eq("vertical", vertical)
    .maybeSingle();
  if (!icpConfig?.icp_text) return fail("no_icp");

  const verticalLabel = vertical === "design_systems" ? "Design Systems" : "Branding";
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown";

  const userPromptText = `ICP Profile for ${verticalLabel}:
${icpConfig.icp_text}

Acquisition goal: ${icpConfig.goal_text ?? "(none provided)"}

Score this single lead against the ICP profile above:
Name: ${fullName}
Title: ${lead.role_title ?? "(unknown)"}
Company: ${lead.company}
Segment: ${lead.segment}

1. Score ICP match 0-100 based on the ICP profile above. Weight heavier for CPO, CEO, Co-Founder, VP Product titles at Series A-C B2B SaaS companies.
2. Write icp_match_reason (max 120 chars): why this person scores the way they do against the ICP.

Return only JSON, no preamble, no markdown:
{ "icp_score": number, "icp_match_reason": string }`;

  const ANTHROPIC_TIMEOUT_MS = 20_000;
  let anthropicRes: Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANTHROPIC_TIMEOUT_MS);
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
          max_tokens: 300,
          system:
            "You are an expert B2B outreach analyst. You will be given one lead's details and an ICP profile. Score the lead against the ICP. Return only JSON, no preamble, no markdown.",
          messages: [{ role: "user", content: userPromptText }],
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return fail("anthropic_timeout", 504);
    }
    return fail("scoring_failed", 502);
  }

  if (!anthropicRes.ok) return fail("scoring_failed", 502);

  let anthropicJson: { content?: { type: string; text: string }[] };
  try {
    anthropicJson = await anthropicRes.json();
  } catch {
    return fail("parse_failed", 502);
  }

  const text = anthropicJson?.content?.[0]?.text ?? "";
  let result: { icp_score?: number; icp_match_reason?: string };
  try {
    result = JSON.parse(text);
  } catch {
    return fail("parse_failed", 502);
  }

  if (typeof result.icp_score !== "number") return fail("parse_failed", 502);
  const icp_score = Math.max(0, Math.min(100, Math.round(result.icp_score)));
  const icp_match_reason =
    typeof result.icp_match_reason === "string" ? result.icp_match_reason.slice(0, 120) : null;

  return ok({ icp_score, icp_match_reason });
});
