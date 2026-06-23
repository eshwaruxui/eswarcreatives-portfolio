-- Phase 5 / 0039 — proposal_payment_schedule
-- Per-proposal instalment plan built in the admin proposal modal. One row per
-- instalment; pct_of_total across rows is expected to sum to 100 (enforced in
-- the UI, not the DB, since drafts may be mid-edit). triggered_by = 'acceptance'
-- marks the instalment confirm_proposal() turns into the first invoice.
create table if not exists public.proposal_payment_schedule (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references public.proposals(id) on delete cascade,
  instalment_number int not null,
  label text not null,
  pct_of_total numeric not null check (pct_of_total > 0 and pct_of_total <= 100),
  triggered_by text default 'manual' check (triggered_by in ('acceptance','manual')),
  created_at timestamptz default now()
);

alter table public.proposal_payment_schedule enable row level security;

-- Admin (staff) manages every schedule row.
drop policy if exists "Admin manages schedule" on public.proposal_payment_schedule;
create policy "Admin manages schedule" on public.proposal_payment_schedule
  for all using (public.is_admin());

-- Clients may read only the schedule of a proposal belonging to their client row.
drop policy if exists "Client reads own schedule" on public.proposal_payment_schedule;
create policy "Client reads own schedule" on public.proposal_payment_schedule
  for select using (
    proposal_id in (
      select id from public.proposals where client_id in (
        select id from public.clients where profile_id = auth.uid()
      )
    )
  );

create index if not exists idx_pps_proposal_id on public.proposal_payment_schedule(proposal_id);
