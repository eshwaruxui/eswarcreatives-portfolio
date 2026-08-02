import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Admin-only endpoint: emails a reply to a design systems enquiry's buyer via
// Resend, then logs it in enquiry_replies and marks the enquiry responded on
// its first reply. The email send is the actual point of this action, so
// unlike receive-enquiry's best-effort notification, a Resend failure here
// fails the whole request — nothing is logged for a reply the buyer never
// received, and the frontend's optimistic bubble reverts.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SEND_FAILED_MESSAGE = "Failed to send. Try again or email eswar@eswarcreatives.in";

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
function fail(error: string, status: number) {
  return json({ success: false, error }, status);
}

type ReqBody = { enquiry_id?: string; body?: string };

const SIGNATURE = ["", "---", "Eswar Maheswaran", "Enterprise Design Systems Architect", "eswarcreatives.in/design-systems"].join(
  "\n"
);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return fail("Not authenticated", 401);

  // RLS-scoped client carrying the caller's JWT: is_admin() and the table
  // reads/writes below all run under the caller's own identity.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: auth } = await caller.auth.getUser();
  if (!auth?.user) return fail("Not authenticated", 401);

  const { data: isAdmin, error: adminErr } = await caller.rpc("is_admin");
  if (adminErr || !isAdmin) return fail("Not allowed", 403);

  let reqBody: ReqBody;
  try {
    reqBody = await req.json();
  } catch {
    return fail("Invalid request body", 400);
  }
  const enquiryId = (reqBody.enquiry_id ?? "").trim();
  const replyBody = (reqBody.body ?? "").trim();
  if (!enquiryId || !replyBody) return fail("enquiry_id and body are required", 400);

  const { data: enquiry, error: fetchErr } = await caller
    .from("enquiry_submissions")
    .select("id, buyer_email, status")
    .eq("id", enquiryId)
    .single();
  if (fetchErr || !enquiry) {
    console.error("send-enquiry-reply: enquiry lookup failed", fetchErr?.message);
    return fail("Enquiry not found", 404);
  }

  if (!RESEND_API_KEY) {
    console.error("send-enquiry-reply: RESEND_API_KEY is not set");
    return fail(SEND_FAILED_MESSAGE, 500);
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Eswar Maheswaran <eswar@eswarcreatives.in>",
        to: enquiry.buyer_email,
        reply_to: "eswar@eswarcreatives.in",
        subject: "Re: Your design systems enquiry",
        text: replyBody + SIGNATURE,
      }),
    });
    if (!res.ok) {
      console.error("send-enquiry-reply: Resend error", res.status, await res.text());
      return fail(SEND_FAILED_MESSAGE, 502);
    }
  } catch (err) {
    console.error("send-enquiry-reply: Resend request failed", err);
    return fail(SEND_FAILED_MESSAGE, 502);
  }

  const { data: reply, error: insertErr } = await caller
    .from("enquiry_replies")
    .insert({ enquiry_id: enquiryId, body: replyBody, sent_by: auth.user.id })
    .select("id, enquiry_id, body, sent_by, created_at")
    .single();
  if (insertErr || !reply) {
    // The email already went out at this point; log clearly server-side even
    // though we report failure so the client's optimistic bubble reverts.
    console.error("send-enquiry-reply: reply logged failed after send", insertErr?.message);
    return fail(SEND_FAILED_MESSAGE, 500);
  }

  if (enquiry.status === "new") {
    const { error: updateErr } = await caller
      .from("enquiry_submissions")
      .update({ status: "responded", responded_at: new Date().toISOString() })
      .eq("id", enquiryId);
    if (updateErr) {
      console.error("send-enquiry-reply: status update failed", updateErr.message);
    }
  }

  return json({ success: true, reply }, 200);
});
