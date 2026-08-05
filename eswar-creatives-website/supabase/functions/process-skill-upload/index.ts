import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

// Parses an already-uploaded .skill bundle (a zip of SKILL.md + optional
// references/*.md — same format as Claude Code's own Skill system) into a
// plain-text outreach_skills row. The browser uploads the raw file straight
// to the outreach-skills storage bucket; this function is invoked right
// after with the resulting path, since unzipping needs a real zip library
// that only makes sense to run once, server-side, not on every later call
// to generate-outreach-message.
// Auth: admin JWT required. Input: { storage_path }.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

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

const MAX_CONTENT_CHARS = 8000;

// Hand-rolled frontmatter reader — only needs two fields (name, description)
// out of a YAML block, so a full YAML parser would be overkill. Handles both
// a plain `key: value` line and a folded block scalar (`description: >`)
// spanning indented lines beneath it, which is what these bundles use.
function parseFrontmatter(md: string): { name: string | null; description: string | null; body: string } {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { name: null, description: null, body: md };

  const frontmatter = match[1];
  const body = md.slice(match[0].length);
  const lines = frontmatter.split(/\r?\n/);

  function readField(key: string): string | null {
    const idx = lines.findIndex((l) => l.startsWith(`${key}:`));
    if (idx === -1) return null;
    const rest = lines[idx].slice(key.length + 1).trim();
    if (rest && rest !== ">" && rest !== "|") return rest;
    // Folded/block scalar: collect subsequent indented lines.
    const collected: string[] = [];
    for (let i = idx + 1; i < lines.length; i++) {
      if (lines[i] === "" || /^\s/.test(lines[i])) {
        collected.push(lines[i].trim());
      } else {
        break;
      }
    }
    return collected.join(" ").trim() || null;
  }

  return { name: readField("name"), description: readField("description"), body };
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

  let body: { storage_path?: string };
  try {
    body = await req.json();
  } catch {
    return fail("bad_request");
  }

  const storagePath = (body.storage_path ?? "").trim();
  if (!storagePath) return fail("invalid_storage_path");

  const { data: fileBlob, error: downloadErr } = await callerClient.storage
    .from("outreach-skills")
    .download(storagePath);
  if (downloadErr || !fileBlob) return fail("download_failed", 502);

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await fileBlob.arrayBuffer());
  } catch {
    return fail("invalid_skill_file");
  }

  const skillMdEntry = Object.values(zip.files).find(
    (f) => !f.dir && /(^|\/)SKILL\.md$/.test(f.name)
  );
  if (!skillMdEntry) return fail("missing_skill_md");

  const skillMdRaw = await skillMdEntry.async("text");
  const { name, description, body: skillBody } = parseFrontmatter(skillMdRaw);

  const referenceEntries = Object.values(zip.files).filter(
    (f) => !f.dir && /\/references\/.+\.md$/.test(f.name)
  );
  const referenceTexts = await Promise.all(
    referenceEntries.map(async (f) => `### ${f.name.split("/").pop()}\n\n${await f.async("text")}`)
  );

  const fallbackName = storagePath.split("/").pop()?.replace(/\.skill$/i, "") ?? "Untitled skill";
  const fullContent = [skillBody.trim(), ...referenceTexts].join("\n\n").trim();

  const { data: inserted, error: insertErr } = await callerClient
    .from("outreach_skills")
    .insert({
      name: name ?? fallbackName,
      description,
      content: fullContent.slice(0, MAX_CONTENT_CHARS),
      storage_path: storagePath,
      created_by: auth.user.id,
    })
    .select()
    .single();

  if (insertErr || !inserted) return fail("save_failed", 502);

  return ok({ skill: inserted });
});
