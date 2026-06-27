-- 0062_invoice_line_items.sql
-- Per-line billable items for an invoice, so an invoice can be itemised from the
-- linked approved proposal (a mix of payment-schedule instalments, solutions and
-- line items). The invoices table keeps its single `amount` as the invoice
-- total; these rows are the breakdown that sums to it.
--
-- RLS mirrors invoices (0027): admin/owner manage everything via is_admin();
-- a client may read only the lines of invoices that belong to them.

create table if not exists public.invoice_line_items (
  id               uuid primary key default gen_random_uuid(),
  invoice_id       uuid not null references public.invoices(id) on delete cascade,
  -- Soft reference to the originating proposal record (a proposal_line_items row,
  -- a proposal_payment_schedule row, or a solution group). Nullable, and kept as
  -- a plain uuid (no FK) because the source spans several tables and the line
  -- must survive if that source is later edited or removed.
  proposal_item_id uuid,
  label            text not null,
  amount           numeric not null default 0,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now()
);

create index if not exists invoice_line_items_invoice_idx
  on public.invoice_line_items(invoice_id);

alter table public.invoice_line_items enable row level security;

-- Admin / owner: full management.
create policy admin_all_invoice_line_items on public.invoice_line_items
  for all
  using      (public.is_admin())
  with check (public.is_admin());

-- Client: read only the lines of their own invoices.
create policy client_read_own_invoice_line_items on public.invoice_line_items
  for select
  using (
    invoice_id in (
      select i.id
      from public.invoices i
      join public.clients c on c.id = i.client_id
      where c.profile_id = auth.uid()
    )
  );
