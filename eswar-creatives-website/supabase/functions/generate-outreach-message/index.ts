import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Generates (or refines) a personalized outreach message body for one lead,
// applying the admin's selected Outreach Skills (uploaded style/voice
// guides) plus a rolling sample of past human edits to prior AI drafts —
// the "learning loop": outreach_message_feedback rows are fed back in as
// few-shot before/after examples so the model leans toward corrections the
// user has actually made before, not just the static skill text. This is
// in-context adaptation on every call, not a training step — nothing is
// fine-tuned, there is no persisted model state, just accumulating prompt
// context that grows with usage.
// Auth: admin JWT required.
// POST body: { lead_id, skill_ids?: string[], current_draft?: string }
// current_draft, if present, means "refine this existing draft" rather than
// "write one from scratch" — same prompt, an extra instruction and input.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

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

const MAX_FEEDBACK_EXAMPLES = 6;

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

  let body: { lead_id?: string; skill_ids?: string[]; current_draft?: string };
  try {
    body = await req.json();
  } catch {
    return fail("bad_request");
  }

  const leadId = (body.lead_id ?? "").trim();
  if (!leadId) return fail("invalid_lead_id");
  const skillIds = Array.isArray(body.skill_ids) ? body.skill_ids.filter((s) => typeof s === "string") : [];
  const currentDraft = typeof body.current_draft === "string" ? body.current_draft.trim() : "";

  const { data: lead } = await callerClient
    .from("leads")
    .select("first_name, last_name, company, role_title, segment, specific_observation, website, notes, vertical")
    .eq("id", leadId)
    .single();
  if (!lead) return fail("lead_not_found", 404);

  let skills: { id: string; name: string; content: string }[] = [];
  if (skillIds.length > 0) {
    const { data: skillRows } = await callerClient
      .from("outreach_skills")
      .select("id, name, content")
      .in("id", skillIds)
      .eq("is_active", true);
    skills = skillRows ?? [];
  }

  const { data: feedbackRows } = await callerClient
    .from("outreach_message_feedback")
    .select("generated_text, edited_text")
    .order("created_at", { ascending: false })
    .limit(MAX_FEEDBACK_EXAMPLES);

  const skillsBlock = skills.length > 0
    ? skills.map((s) => `## Skill: ${s.name}\n${s.content}`).join("\n\n")
    : "";

  const feedbackBlock = (feedbackRows ?? []).length > 0
    ? (feedbackRows ?? [])
        .filter((r) => r.generated_text.trim() !== r.edited_text.trim())
        .map(
          (r, i) =>
            `Example ${i + 1}\nAI draft: ${r.generated_text}\nHuman's final edit: ${r.edited_text}`
        )
        .join("\n\n")
    : "";

  const systemParts = [
    "You write short, specific, personalized cold-outreach message bodies for Eswar Creatives, a design systems and branding studio. Write only the message body — no subject line, no greeting boilerplate beyond what the voice guide below specifies, no explanation of what you did.",
  ];
  if (skillsBlock) {
    systemParts.push(
      "Apply the following uploaded style/voice guides. They are the primary source of truth for tone, structure, and word choice:\n\n" + skillsBlock
    );
  }
  if (feedbackBlock) {
    systemParts.push(
      "Here are recent examples of edits a human reviewer made to previous AI drafts for this same outreach program. Apply the same kind of corrections preemptively — match the direction of these edits (what got cut, what got made more specific, what tone shifted) rather than repeating the AI draft's pattern:\n\n" +
        feedbackBlock
    );
  }
  const system = systemParts.join("\n\n---\n\n");

  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown";
  const factsBlock = `Lead facts:
Name: ${fullName}
Company: ${lead.company}
Title: ${lead.role_title ?? "(unknown)"}
Segment: ${lead.segment}
Specific observation about this lead/company: ${lead.specific_observation ?? "(none on file)"}
Website: ${lead.website ?? "(none on file)"}
Notes: ${lead.notes ?? "(none)"}`;

  const userPromptText = currentDraft
    ? `${factsBlock}\n\nHere is the current draft message for this lead:\n\n${currentDraft}\n\nRewrite it, applying the voice guides and edit patterns above. Keep it grounded in the lead facts, don't invent claims not supported by them.`
    : `${factsBlock}\n\nWrite a first-touch outreach message body for this lead, applying the voice guides and edit patterns above.`;

  const ANTHROPIC_TIMEOUT_MS = 25_000;
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
          max_tokens: 600,
          system,
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
    return fail("generation_failed", 502);
  }

  if (!anthropicRes.ok) return fail("generation_failed", 502);

  let anthropicJson: { content?: { type: string; text: string }[] };
  try {
    anthropicJson = await anthropicRes.json();
  } catch {
    return fail("parse_failed", 502);
  }

  const message = (anthropicJson?.content?.[0]?.text ?? "").trim();
  if (!message) return fail("parse_failed", 502);

  return ok({ message });
});
