import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Creates a Razorpay order for an invoice.
// Called from the public invoice page (/invoice/:token) — no admin auth required.
// Verifies the invoice token server-side via get_invoice_by_token before
// creating the order, so only holders of a valid link can initiate payment.
// RAZORPAY_KEY_SECRET never leaves this function.
//
// Use test keys (RAZORPAY_KEY_ID=rzp_test_*, RAZORPAY_KEY_SECRET=...) in
// development. Set live keys in production Cloudflare + Supabase env vars.
// Test card: 4111 1111 1111 1111, any future date, CVV 123.

const SUPABASE_URL            = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RAZORPAY_KEY_ID         = Deno.env.get("RAZORPAY_KEY_ID") ?? "";
const RAZORPAY_KEY_SECRET     = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

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
  invoice_token?: string;
  invoice_id?: string;
  amount?: number;
  currency?: string;
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

  const { invoice_token, invoice_id, amount, currency = "INR" } = body;

  if (!invoice_token || !invoice_id || !amount) return fail("missing_fields", 400);
  if (!Number.isInteger(amount) || amount <= 0) return fail("invalid_amount", 400);

  // Verify the invoice exists and the public token is valid and unexpired.
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: tokenData } = await db.rpc("get_invoice_by_token", { p_token: invoice_token });
  if (!tokenData) return fail("invoice_not_found", 404);

  const inv = (tokenData as { invoice: { id: string } }).invoice;
  if (inv.id !== invoice_id) return fail("invoice_mismatch", 400);

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.error("create-razorpay-order: Razorpay keys not configured");
    return fail("payment_unavailable", 503);
  }

  // Create order via Razorpay REST API (Basic auth = key_id:key_secret base64).
  const authHeader = "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

  let rzpOrder: { id: string; amount: number; currency: string };
  try {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, currency, receipt: invoice_id }),
    });
    if (!res.ok) {
      console.error("create-razorpay-order: Razorpay API returned", res.status);
      return fail("payment_unavailable", 503);
    }
    rzpOrder = await res.json();
  } catch (e) {
    console.error("create-razorpay-order: fetch failed", e);
    return fail("payment_unavailable", 503);
  }

  // Persist the order ID so verify-razorpay-payment can cross-check it.
  await db
    .from("invoices")
    .update({ razorpay_order_id: rzpOrder.id })
    .eq("id", invoice_id);

  return ok({
    order_id: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
    key_id: RAZORPAY_KEY_ID,
  });
});
