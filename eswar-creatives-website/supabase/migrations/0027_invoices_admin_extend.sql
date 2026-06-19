-- Phase 3 / 0027 — extend invoices for the admin portal (Migration D)
-- invoices shipped in 0005 as a project-centric table (project_id NOT NULL,
-- invoice_status enum draft/sent/paid/overdue/void, owner + project-based
-- client RLS). The admin portal issues invoices against a client and/or a
-- proposal, often before a delivery `project` row exists, so we EXTEND
-- additively: add the client/proposal linkage and payment columns, loosen
-- project_id, widen the status enum, and add admin + client(by client_id) RLS.
-- Existing columns, policies, and any legacy rows stay valid.

----------------------------------------------------------------------
-- 1. New columns. Nullable/defaulted so legacy project-linked rows survive.
----------------------------------------------------------------------
alter table public.invoices
  add column if not exists proposal_id    uuid references public.proposals(id),
  add column if not exists client_id      uuid references public.clients(id),
  add column if not exists client_name    text,
  add column if not exists company_name   text,
  add column if not exists label          text,
  add column if not exists pct_of_total   numeric(5,2),
  add column if not exists paid_date      date,
  add column if not exists payment_method text,
  add column if not exists notes          text,
  add column if not exists created_by     uuid references auth.users(id);

create index if not exists invoices_client_idx   on public.invoices(client_id);
create index if not exists invoices_proposal_idx on public.invoices(proposal_id);

----------------------------------------------------------------------
-- 2. Loosen project_id; portal invoices attach to client/proposal instead.
----------------------------------------------------------------------
alter table public.invoices alter column project_id drop not null;

----------------------------------------------------------------------
-- 3. Currency CHECK + new status labels. Existing rows are INR / in the
--    original enum, so both validate clean. 'pending' is the portal default,
--    'cancelled' the portal's void equivalent; legacy 'draft'/'void' remain.
----------------------------------------------------------------------
alter table public.invoices
  add constraint invoices_currency_check check (currency in ('INR', 'USD'));

alter type public.invoice_status add value if not exists 'pending';
alter type public.invoice_status add value if not exists 'cancelled';

----------------------------------------------------------------------
-- 4. RLS. 0007 already has owner_all (is_owner) and a project-based client
--    read. Add is_admin management for the portal, plus a client read keyed
--    on the new direct client_id link.
----------------------------------------------------------------------
create policy admin_all_invoices on public.invoices
  for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

create policy client_read_own_invoices_direct on public.invoices
  for select to authenticated
  using (
    client_id in (select id from public.clients where profile_id = auth.uid())
  );
