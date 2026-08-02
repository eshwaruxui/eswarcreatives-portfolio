import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Public endpoint (no JWT) called from the marketing site's design systems
// enquiry form. Validates and stores the submission, then best-effort emails
// a notification to the studio via Resend. The Resend call never blocks or
// fails the response — the enquiry is already saved once it fires.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const PORTAL_URL = Deno.env.get("PORTAL_URL") ?? "https://eswarcreatives.in";

const ALLOWED_ORIGINS = ["https://eswarcreatives.in", "https://www.eswarcreatives.in"];
const PLATFORMS_ALLOWED = ["Web", "iOS", "Android"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    // Cloudflare Pages preview deployments, e.g. <hash>.eswarcreatives-portfolio.pages.dev
    // and the branch alias staging.eswarcreatives-portfolio.pages.dev.
    return hostname.endsWith(".eswarcreatives-portfolio.pages.dev");
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? (origin as string) : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

type Body = {
  first_name?: string;
  company_name?: string;
  company_url?: string;
  buyer_email?: string;
  platforms?: string[];
  team_size?: string;
  funding_stage?: string;
  problem?: string;
  start_timeline?: string;
};

// DD MMM YYYY HH:mm IST, e.g. "08 Jun 2026 14:30 IST".
function formatIST(iso: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(iso));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return `${get("day")} ${get("month")} ${get("year")} ${get("hour")}:${get("minute")} IST`;
  } catch {
    return iso;
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ success: false, error: "Method not allowed" }, 405, origin);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "Invalid request body" }, 400, origin);
  }

  // Server-side validation — the client already validates, but this endpoint
  // is public, so nothing from the request body can be trusted.
  const firstName = (body.first_name ?? "").trim();
  const companyName = (body.company_name ?? "").trim();
  const companyUrl = (body.company_url ?? "").trim();
  const buyerEmail = (body.buyer_email ?? "").trim();
  const platforms = Array.isArray(body.platforms)
    ? body.platforms.filter((p) => PLATFORMS_ALLOWED.includes(p))
    : [];
  const teamSize = (body.team_size ?? "").trim();
  const fundingStage = (body.funding_stage ?? "").trim();
  const problem = (body.problem ?? "").trim();
  const startTimeline = (body.start_timeline ?? "").trim();

  const fields: Record<string, string> = {};
  if (!firstName) fields.first_name = "First name is required.";
  if (!companyName) fields.company_name = "Company name is required.";
  if (!companyUrl) fields.company_url = "Company URL is required.";
  if (!buyerEmail) fields.buyer_email = "Work email is required.";
  else if (!EMAIL_RE.test(buyerEmail)) fields.buyer_email = "Enter a valid email address.";
  if (platforms.length === 0) fields.platforms = "Select at least one platform.";
  if (!teamSize) fields.team_size = "Team size is required.";
  if (!fundingStage) fields.funding_stage = "Funding stage is required.";
  if (!problem || problem.length < 50) {
    fields.problem = "Please describe your problem in at least 50 characters.";
  }
  if (!startTimeline) fields.start_timeline = "Timeline is required.";

  if (Object.keys(fields).length > 0) {
    return json({ success: false, error: "Validation failed", fields }, 400, origin);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: enquiry, error: insertErr } = await admin
    .from("enquiry_submissions")
    .insert({
      first_name: firstName,
      company_name: companyName,
      company_url: companyUrl,
      buyer_email: buyerEmail,
      platforms,
      team_size: teamSize,
      funding_stage: fundingStage,
      problem,
      start_timeline: startTimeline,
    })
    .select("id, created_at")
    .single();

  if (insertErr || !enquiry) {
    console.error("receive-enquiry: insert failed", insertErr?.message);
    return json({ success: false, error: "Something went wrong. Please try again." }, 500, origin);
  }

  if (RESEND_API_KEY) {
    const subject = `New enquiry - ${companyName} (${fundingStage})`;
    const text = [
      `Name: ${firstName}`,
      `Company: ${companyName} - ${companyUrl}`,
      `Platforms: ${platforms.join(", ")}`,
      `Team size: ${teamSize}`,
      `Funding stage: ${fundingStage}`,
      `Timeline: ${startTimeline}`,
      `Problem: ${problem}`,
      `Submitted: ${formatIST(enquiry.created_at)}`,
      `View in portal: ${PORTAL_URL}/portal/admin/outreach?tab=enquiries`,
    ].join("\n");

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "EswarCreatives <notifications@eswarcreatives.in>",
          to: "eswar@eswarcreatives.in",
          subject,
          text,
        }),
      });
      if (!res.ok) {
        console.error("receive-enquiry: Resend error", res.status, await res.text());
      }
    } catch (err) {
      console.error("receive-enquiry: Resend request failed", err);
    }
  } else {
    console.error("receive-enquiry: RESEND_API_KEY is not set, skipping notification email");
  }

  return json({ success: true, id: enquiry.id }, 200, origin);
});
