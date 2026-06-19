-- Phase 3 / 0024 — extend proposals for the admin portal (Migration A)
-- The proposals table already shipped in 0011 (jsonb `content` model, cents
-- totals, slug identity, is_owner RLS, two client RPCs) and feeds the live
-- client-facing ProposalView/ClientDashboard. We EXTEND it additively rather
-- than recreate, mirroring how 0013 extended `projects`. Existing columns,
-- the seed, and the RPCs are left untouched so the live portal keeps working.
--
-- New admin modules need a flat numeric total, a human proposal number,
-- denormalized client/company on the row, a vertical, discount fields,
-- richer terms, and accepted/declined timestamps. The normalized phase /
-- line-item / document tables arrive in 0025 and 0026.

----------------------------------------------------------------------
-- 1. New columns. All nullable or defaulted so legacy rows stay valid.
----------------------------------------------------------------------
alter table public.proposals
  add column if not exists proposal_number text,
  add column if not exists client_name     text,
  add column if not exists company_name     text,
  add column if not exists vertical         text not null default 'brand'
       check (vertical in ('brand', 'saas')),
  add column if not exists total_amount     numeric(12,2) not null default 0,
  add column if not exists discount_pct     numeric(5,2),
  add column if not exists discount_label   text,
  add column if not exists payment_terms    text not null default
       '50% advance, 25% mid-project, 25% on delivery. 2 revision rounds included per solution.',
  add column if not exists accepted_at      timestamptz,
  add column if not exists declined_at      timestamptz,
  add column if not exists decline_reason   text,
  add column if not exists created_by       uuid references auth.users(id);

-- Human-facing unique identifier (EC-P-2026-001 ...). Unique but nullable so
-- the 0011 seed row (which only has a slug) doesn't block the index.
create unique index if not exists proposals_proposal_number_key
  on public.proposals(proposal_number);

----------------------------------------------------------------------
-- 2. Loosen client_id. The admin can draft a proposal for a company that is
--    not yet a clients row (e.g. 123 Adsprint), storing client_name /
--    company_name directly on the proposal until a client record exists.
----------------------------------------------------------------------
alter table public.proposals alter column client_id drop not null;

----------------------------------------------------------------------
-- 3. Currency + status. Existing currency has no CHECK; constrain to the two
--    the portal supports (all existing rows are INR, so this validates clean).
--    Add the 'expired' status label the admin lifecycle needs.
----------------------------------------------------------------------
alter table public.proposals
  add constraint proposals_currency_check check (currency in ('INR', 'USD'));

alter type public.proposal_status add value if not exists 'expired';

----------------------------------------------------------------------
-- 4. RLS. 0011 already grants owner_all (is_owner) and client_read_own. The
--    admin portal logs in as role 'admin', so add an is_admin() management
--    policy alongside the existing owner policy. Client status changes keep
--    flowing through the existing respond_to_proposal RPC (the secure path),
--    so no raw client UPDATE policy is added here.
----------------------------------------------------------------------
create policy admin_all_proposals on public.proposals
  for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());
