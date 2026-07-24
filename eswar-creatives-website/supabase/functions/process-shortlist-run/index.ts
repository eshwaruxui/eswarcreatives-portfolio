import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Extracts LinkedIn screenshot candidates and scores them against a saved ICP.
// Auth: admin JWT required. Input: { run_id, vertical }.
//
// Fix 7: validation (auth, run status, ICP, screenshots) stays synchronous and
// returns a clear error immediately. Once validation passes, the Anthropic
// call + candidate insert + status update run inside EdgeRuntime.waitUntil so
// the HTTP response ({ queued: true }) returns immediately instead of the
// caller blocking on the full analysis, which otherwise exceeds Supabase's
// free-tier synchronous execution window. The frontend polls shortlist_runs.
// status instead of awaiting this call's result.
//
// NOTE: the icp-attachments bucket is created by migration 0079 via SQL, not
// the Supabase dashboard (see migration comment) — nothing manual to do here.

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

function mediaTypeFor(path: string): string | null {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return null;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

type Candidate = {
  extracted_name?: string;
  extracted_title?: string;
  extracted_company?: string;
  extracted_linkedin_url?: string;
  channel?: string;
  icp_score?: number;
  confidence?: string;
  connection_status?: string;
  icp_match_reason?: string;
  channel_reason?: string;
  excluded?: boolean;
};

function norm(v: string | null | undefined): string {
  return (v ?? "").trim().toLowerCase();
}

async function markFailed(
  client: ReturnType<typeof createClient>,
  runId: string,
  errorCode: string,
) {
  await client
    .from("shortlist_runs")
    .update({ status: "failed", error_code: errorCode })
    .eq("id", runId);
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

  let body: { run_id?: string; vertical?: string };
  try {
    body = await req.json();
  } catch {
    return fail("bad_request");
  }

  const { run_id, vertical } = body;
  if (!run_id || typeof run_id !== "string") return fail("invalid_run_id");
  if (!vertical || !VERTICALS.includes(vertical as Vertical)) return fail("invalid_vertical");

  // 1. Fetch the run, confirm status = 'processing'
  const { data: run } = await callerClient
    .from("shortlist_runs")
    .select("id, status, channel")
    .eq("id", run_id)
    .single();
  if (!run) return fail("run_not_found", 404);
  if (run.status !== "processing") return fail("run_not_processing");

  const runChannel = run.channel as "email" | "linkedin" | "both" | null;

  // 2. Fetch the ICP config for this vertical — required before queuing.
  const { data: icpConfig } = await callerClient
    .from("icp_configs")
    .select("icp_text, goal_text")
    .eq("vertical", vertical)
    .maybeSingle();

  if (!icpConfig?.icp_text) {
    await markFailed(callerClient, run_id, "no_icp");
    return ok({ error: "no_icp" });
  }

  // 3. Fetch screenshots for this run — required before queuing.
  const { data: screenshots } = await callerClient
    .from("shortlist_run_screenshots")
    .select("storage_path")
    .eq("run_id", run_id);

  if (!screenshots || screenshots.length === 0) {
    await callerClient.from("shortlist_runs").update({ status: "complete" }).eq("id", run_id);
    return ok({ success: true, candidate_count: 0 });
  }

  // Validation passed — kick off the heavy work in the background and return
  // immediately. Everything below this line used to run synchronously.
  const responseBody = JSON.stringify({ queued: true });

  const backgroundTask = (async () => {
    try {
      const imageBlocks: { type: "image"; source: { type: "base64"; media_type: string; data: string } }[] = [];
      for (const shot of screenshots) {
        const mediaType = mediaTypeFor(shot.storage_path);
        if (!mediaType) continue;
        const { data: blob, error: dlErr } = await callerClient.storage
          .from("stage-attachments")
          .download(shot.storage_path);
        if (dlErr || !blob) continue;
        imageBlocks.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data: await blobToBase64(blob) },
        });
      }
      if (imageBlocks.length === 0) {
        await markFailed(callerClient, run_id, "upload_failed");
        return;
      }

      // 4. Existing leads (name + company) for fuzzy dedup
      const { data: existingLeads } = await callerClient
        .from("leads")
        .select("first_name, last_name, company");
      const existingLeadsForPrompt = (existingLeads ?? []).map((l) => ({
        name: [l.first_name, l.last_name].filter(Boolean).join(" "),
        company: l.company,
      }));

      // 5 + 6. Not-interested leads, used for post-filtering by linkedin_url / name+company.
      const { data: notInterestedLeads } = await callerClient
        .from("leads")
        .select("first_name, last_name, company, linkedin_url")
        .eq("status", "not_interested");
      const notInterestedKeys = new Set(
        (notInterestedLeads ?? []).map((l) => `${norm([l.first_name, l.last_name].filter(Boolean).join(" "))}|${norm(l.company)}`)
      );
      const notInterestedUrls = new Set(
        (notInterestedLeads ?? []).map((l) => norm(l.linkedin_url)).filter(Boolean)
      );

      const verticalLabel = vertical === "design_systems" ? "Design Systems" : "Branding";

      const userPromptText = `ICP Profile for ${verticalLabel}:
${icpConfig?.icp_text ?? "(none provided)"}

Acquisition goal: ${icpConfig?.goal_text ?? "(none provided)"}

Existing leads to exclude (fuzzy match on name + company):
${JSON.stringify(existingLeadsForPrompt)}

For each person visible in the screenshots:
1. Extract: full name, job title, company, LinkedIn URL if visible, connection status (connected / pending / not_connected / unknown).
2. Score ICP match 0-100 based on the ICP profile above. Weight heavier for CPO, CEO, Co-Founder, VP Product titles at Series A-C B2B SaaS companies.
3. Assign channel:
   - 'linkedin' if connection_status = 'connected'
   - 'email' if connection_status = 'pending' or 'not_connected' (Apollo can extract email)
   - 'linkedin' if connection_status = 'unknown' and profile appears reachable
4. Set confidence = 'low' if any of: name is truncated, company is missing, title is missing or vague.
5. Write icp_match_reason (max 120 chars): why this person scores the way they do against the ICP.
6. Write channel_reason (max 80 chars): why this channel was chosen.
7. Exclude anyone whose name + company fuzzy-matches an existing lead. Set excluded = true for these.
8. Goal-aware ranking: if goal implies urgency or a specific timeline, rank decision-maker titles higher.

Return JSON array:
[{
  extracted_name, extracted_title, extracted_company,
  extracted_linkedin_url, channel, icp_score, confidence,
  connection_status, icp_match_reason, channel_reason,
  excluded (boolean)
}]
Sorted by icp_score descending.`;

      // 7. Call Anthropic, bounded by a 25s timeout so a hung request still
      // resolves the background task and marks the run failed with a clear
      // reason instead of leaving it stuck at 'processing' forever.
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
              max_tokens: 4000,
              system:
                "You are an expert B2B outreach analyst. You will be given screenshots from LinkedIn and an ICP profile. Extract every visible person from the screenshots and score each against the ICP. Return only JSON, no preamble, no markdown.",
              messages: [
                {
                  role: "user",
                  content: [...imageBlocks, { type: "text", text: userPromptText }],
                },
              ],
            }),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          await markFailed(callerClient, run_id, "anthropic_timeout");
        } else {
          await markFailed(callerClient, run_id, "parse_failed");
        }
        return;
      }

      if (!anthropicRes.ok) {
        await markFailed(callerClient, run_id, "parse_failed");
        return;
      }

      let anthropicJson: { content?: { type: string; text: string }[] };
      try {
        anthropicJson = await anthropicRes.json();
      } catch {
        await markFailed(callerClient, run_id, "parse_failed");
        return;
      }

      const text = anthropicJson?.content?.[0]?.text ?? "";
      let candidates: Candidate[];
      try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error("not_an_array");
        candidates = parsed;
      } catch {
        await markFailed(callerClient, run_id, "parse_failed");
        return;
      }

      // 9-10. Filter excluded + suppressed/not-interested + channel (Fix 3:
      // one channel per run — only insert candidates matching it).
      const rows = candidates
        .filter((c) => !c.excluded)
        .filter((c) => {
          const key = `${norm(c.extracted_name)}|${norm(c.extracted_company)}`;
          const url = norm(c.extracted_linkedin_url);
          if (notInterestedKeys.has(key)) return false;
          if (url && notInterestedUrls.has(url)) return false;
          return true;
        })
        .filter((c) => {
          if (!runChannel || runChannel === "both") return true;
          return c.channel === runChannel;
        })
        .map((c) => ({
          run_id,
          extracted_name: c.extracted_name ?? null,
          extracted_title: c.extracted_title ?? null,
          extracted_company: c.extracted_company ?? null,
          extracted_linkedin_url: c.extracted_linkedin_url ?? null,
          channel: c.channel ?? null,
          icp_score: typeof c.icp_score === "number" ? c.icp_score : null,
          confidence: c.confidence === "low" ? "low" : "high",
          connection_status: c.connection_status ?? null,
          icp_match_reason: c.icp_match_reason ?? null,
          channel_reason: c.channel_reason ?? null,
          decision: "pending" as const,
        }));

      if (rows.length === 0) {
        await callerClient.from("shortlist_runs").update({ status: "complete" }).eq("id", run_id);
        return;
      }

      const { error: insertErr } = await callerClient.from("shortlist_candidates").insert(rows);
      if (insertErr) {
        await markFailed(callerClient, run_id, "parse_failed");
        return;
      }

      await callerClient.from("shortlist_runs").update({ status: "complete" }).eq("id", run_id);
    } catch {
      await markFailed(callerClient, run_id, "parse_failed");
    }
  })();

  EdgeRuntime.waitUntil(backgroundTask);

  return new Response(responseBody, {
    status: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
