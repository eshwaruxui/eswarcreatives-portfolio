-- 0065_invoice_payments.sql
-- Partial payment tracking for invoices.
--
-- Problem: clients sometimes pay in instalments (e.g. Rs 53,725 invoice with
-- Rs 38,000 received across 3 payments). The old workaround was editing the
-- Notes field and reducing the line amount, which corrupted the invoice total
-- and lost the audit trail.
--
-- Solution: a structured invoice_payments table. The invoice keeps its true
-- total; balance_due is computed from sum(payments) client-side.
--
-- FK delete order comment: invoice_payments -> invoice_line_items -> invoices
-- -> projects -> orders -> proposals -> clients (see PORTAL_ARCHITECTURE.md §11).

----------------------------------------------------------------------
-- 1. Extend invoice_status enum with partially_paid.
--    Verify first — enum ADD VALUE is idempotent via IF NOT EXISTS.
----------------------------------------------------------------------
alter type public.invoice_status add value if not exists 'partially_paid';

----------------------------------------------------------------------
-- 2. invoice_payments table.
----------------------------------------------------------------------
create table if not exists public.invoice_payments (
  id              uuid        primary key default gen_random_uuid(),
  invoice_id      uuid        not null references public.invoices(id) on delete cascade,
  amount          numeric     not null check (amount > 0),
  paid_on         date        not null,
  method          text,
  reference_note  text,
  created_at      timestamptz not null default now(),
  created_by      uuid        references public.profiles(id)
);

create index if not exists invoice_payments_invoice_idx
  on public.invoice_payments(invoice_id);

----------------------------------------------------------------------
-- 3. RLS.
--    Admin: full access via is_admin() SECURITY DEFINER (never inline
--    subqueries on profiles).
--    Client: SELECT only, via invoices.client_id -> clients.profile_id.
--    Reviewer: no policy = no access.
----------------------------------------------------------------------
alter table public.invoice_payments enable row level security;

create policy admin_all_invoice_payments on public.invoice_payments
  for all
  using      (public.is_admin())
  with check (public.is_admin());

create policy client_read_own_invoice_payments on public.invoice_payments
  for select
  using (
    invoice_id in (
      select i.id
        from public.invoices i
        join public.clients  c on c.id = i.client_id
       where c.profile_id = auth.uid()
    )
  );
