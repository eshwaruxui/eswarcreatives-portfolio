-- Phase 3 / 0025 — proposal_phases + proposal_line_items (Migration B)
-- The normalized structure behind a proposal: ordered phases, each with
-- ordered line items. Both new tables (no 0011 conflict). Admin manages via
-- is_admin(); clients read their own through the proposal ownership chain.

create table if not exists public.proposal_phases (
  id           uuid primary key default gen_random_uuid(),
  proposal_id  uuid not null references public.proposals(id) on delete cascade,
  phase_number integer not null,
  name         text not null,
  timeline     text,
  scope        text,
  sort_order   integer not null default 0
);

create table if not exists public.proposal_line_items (
  id          uuid primary key default gen_random_uuid(),
  phase_id    uuid not null references public.proposal_phases(id) on delete cascade,
  item_number integer not null,
  title       text not null,
  scope       text,
  amount      numeric(12,2) not null default 0
);

alter table public.proposal_phases     enable row level security;
alter table public.proposal_line_items enable row level security;

create policy "Admin manages proposal phases" on public.proposal_phases
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Client views own proposal phases" on public.proposal_phases
  for select using (
    proposal_id in (
      select id from public.proposals
      where client_id in (select id from public.clients where profile_id = auth.uid())
    )
  );

create policy "Admin manages proposal line items" on public.proposal_line_items
  for all using (public.is_admin()) with check (public.is_admin());

create policy "Client views own proposal line items" on public.proposal_line_items
  for select using (
    phase_id in (
      select id from public.proposal_phases
      where proposal_id in (
        select id from public.proposals
        where client_id in (select id from public.clients where profile_id = auth.uid())
      )
    )
  );
