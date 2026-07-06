import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Verifies a Razorpay payment after checkout completes.
// Called from the public invoice page (/invoice/:token) — no admin auth required.
// 1. Re-verifies the invoice token so only the original link holder can record a payment.
// 2. Validates the Razorpay HMAC-SHA256 signature.
// 3. Cross-checks razorpay_order_id against the stored value on the invoice.
// 4. Inserts an invoice_payments row and syncs invoice status.
//
// RAZORPAY_KEY_SECRET never leaves this function.

const SUPABASE_URL              = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RAZORPAY_KEY_SECRET       = Deno.env.get("RAZORPAY_KEY_SECRET") ?? "";

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

// HMAC-SHA256 of "order_id|payment_id" using key_secret. Deno Web Crypto API.
async function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${orderId}|${paymentId}`));
  const computed = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === signature;
}

// Derives invoice status from total paid vs invoice amount, then updates the row.
async function syncInvoiceStatus(
  db: ReturnType<typeof createClient>,
  invoiceId: string
): Promise<void> {
  const { data: inv } = await db
    .from("invoices")
    .select("amount")
    .eq("id", invoiceId)
    .single();
  if (!inv) return;

  const { data: pmts } = await db
    .from("invoice_payments")
    .select("amount")
    .eq("invoice_id", invoiceId);

  const totalPaid = (pmts ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const balance = Number(inv.amount) - totalPaid;

  if (balance <= 0) {
    const today = new Date().toISOString().split("T")[0];
    await db
      .from("invoices")
      .update({ status: "paid", paid_date: today })
      .eq("id", invoiceId);
  } else if (totalPaid > 0) {
    await db
      .from("invoices")
      .update({ status: "partially_paid" })
      .eq("id", invoiceId);
  }
}

type RequestBody = {
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  invoice_id?: string;
  invoice_token?: string;
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

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    invoice_id,
    invoice_token,
  } = body;

  if (
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature ||
    !invoice_id ||
    !invoice_token
  ) {
    return fail("missing_fields", 400);
  }

  // Re-verify the invoice token is still valid.
  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: tokenData } = await db.rpc("get_invoice_by_token", { p_token: invoice_token });
  if (!tokenData) return fail("invoice_not_found", 404);

  const inv = (tokenData as { invoice: { id: string; razorpay_order_id?: string; amount: number } }).invoice;
  if (inv.id !== invoice_id) return fail("invoice_mismatch", 400);

  // Cross-check: the order ID on the invoice row must match what the client sent.
  if (inv.razorpay_order_id !== razorpay_order_id) {
    return fail("order_mismatch", 400);
  }

  // Verify Razorpay HMAC-SHA256 signature.
  if (!RAZORPAY_KEY_SECRET) {
    console.error("verify-razorpay-payment: RAZORPAY_KEY_SECRET not configured");
    return fail("payment_unavailable", 503);
  }

  const valid = await verifyRazorpaySignature(
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    RAZORPAY_KEY_SECRET
  );
  if (!valid) {
    console.error("verify-razorpay-payment: invalid signature for order", razorpay_order_id);
    return fail("payment_verification_failed", 400);
  }

  // Compute balance due at this moment (invoice amount minus existing payments).
  const { data: existingPmts } = await db
    .from("invoice_payments")
    .select("amount")
    .eq("invoice_id", invoice_id);

  const alreadyPaid = (existingPmts ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const balanceDue = Math.max(0, Number(inv.amount) - alreadyPaid);

  if (balanceDue <= 0) {
    // Already fully paid — return success without double-recording.
    return ok({ success: true, payment_id: razorpay_payment_id });
  }

  // Record the payment.
  const today = new Date().toISOString().split("T")[0];
  const { error: insertErr } = await db.from("invoice_payments").insert({
    invoice_id,
    amount: balanceDue,
    paid_on: today,
    method: "Razorpay UPI/Card",
    reference_note: razorpay_payment_id,
    proof_url: null,
    created_by: null,
  });

  if (insertErr) {
    console.error("verify-razorpay-payment: insert failed", insertErr.message);
    return fail("record_failed", 500);
  }

  // Sync invoice status (paid / partially_paid) after recording.
  await syncInvoiceStatus(db, invoice_id);

  return ok({ success: true, payment_id: razorpay_payment_id });
});
