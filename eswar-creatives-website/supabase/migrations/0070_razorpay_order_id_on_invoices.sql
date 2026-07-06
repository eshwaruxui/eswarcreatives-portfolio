-- 0070_razorpay_order_id_on_invoices.sql
-- Adds razorpay_order_id to invoices so the create-razorpay-order edge
-- function can link a Razorpay order back to an invoice row, and the
-- verify-razorpay-payment function can confirm the order came from us.

alter table public.invoices
  add column if not exists razorpay_order_id text;
