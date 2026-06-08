-- Phase 1 / 0007 — Row-Level Security
-- Enable RLS on every table and write explicit policies per the access matrix:
--   owner   : full read/write on every table.
--   client  : SELECT-only, scoped to rows owned by their profile.
--   client  : read-only on services / service_tiers (catalog).
--   client  : NO access of any kind to time_entries.
--   anon    : no policies anywhere -> denied everywhere.

----------------------------------------------------------------------
-- Enable RLS on every public table.
----------------------------------------------------------------------
alter table public.profiles                 enable row level security;
alter table public.clients                  enable row level security;
alter table public.services                 enable row level security;
alter table public.service_tiers            enable row level security;
alter table public.orders                   enable row level security;
alter table public.questionnaire_responses  enable row level security;
alter table public.quotes                   enable row level security;
alter table public.payments                 enable row level security;
alter table public.projects                 enable row level security;
alter table public.project_phases           enable row level security;
alter table public.invoices                 enable row level security;
alter table public.assets                   enable row level security;
alter table public.decision_log             enable row level security;
alter table public.time_entries             enable row level security;

-- Belt-and-suspenders: force RLS even for the table owner role.
alter table public.profiles                 force row level security;
alter table public.clients                  force row level security;
alter table public.services                 force row level security;
alter table public.service_tiers            force row level security;
alter table public.orders                   force row level security;
alter table public.questionnaire_responses  force row level security;
alter table public.quotes                   force row level security;
alter table public.payments                 force row level security;
alter table public.projects                 force row level security;
alter table public.project_phases           force row level security;
alter table public.invoices                 force row level security;
alter table public.assets                   force row level security;
alter table public.decision_log             force row level security;
alter table public.time_entries             force row level security;

----------------------------------------------------------------------
-- profiles
----------------------------------------------------------------------
create policy owner_all_profiles on public.profiles
  for all to authenticated
  using      (public.is_owner())
  with check (public.is_owner());

create policy client_read_own_profile on public.profiles
  for select to authenticated
  using (id = auth.uid());

----------------------------------------------------------------------
-- clients
----------------------------------------------------------------------
create policy owner_all_clients on public.clients
  for all to authenticated
  using      (public.is_owner())
  with check (public.is_owner());

create policy client_read_own_client on public.clients
  for select to authenticated
  using (profile_id = auth.uid());

----------------------------------------------------------------------
-- services (catalog, read-only for clients)
----------------------------------------------------------------------
create policy owner_all_services on public.services
  for all to authenticated
  using      (public.is_owner())
  with check (public.is_owner());

create policy auth_read_services on public.services
  for select to authenticated
  using (true);

----------------------------------------------------------------------
-- service_tiers (catalog, read-only for clients)
----------------------------------------------------------------------
create policy owner_all_service_tiers on public.service_tiers
  for all to authenticated
  using      (public.is_owner())
  with check (public.is_owner());

create policy auth_read_service_tiers on public.service_tiers
  for select to authenticated
  using (true);

----------------------------------------------------------------------
-- orders
----------------------------------------------------------------------
create policy owner_all_orders on public.orders
  for all to authenticated
  using      (public.is_owner())
  with check (public.is_owner());

create policy client_read_own_orders on public.orders
  for select to authenticated
  using (
    client_id in (
      select id from public.clients where profile_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- questionnaire_responses
----------------------------------------------------------------------
create policy owner_all_questionnaire_responses on public.questionnaire_responses
  for all to authenticated
  using      (public.is_owner())
  with check (public.is_owner());

create policy client_read_own_questionnaire_responses on public.questionnaire_responses
  for select to authenticated
  using (
    order_id in (
      select o.id
      from public.orders o
      join public.clients c on c.id = o.client_id
      where c.profile_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- quotes
----------------------------------------------------------------------
create policy owner_all_quotes on public.quotes
  for all to authenticated
  using      (public.is_owner())
  with check (public.is_owner());

create policy client_read_own_quotes on public.quotes
  for select to authenticated
  using (
    order_id in (
      select o.id
      from public.orders o
      join public.clients c on c.id = o.client_id
      where c.profile_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- payments
----------------------------------------------------------------------
create policy owner_all_payments on public.payments
  for all to authenticated
  using      (public.is_owner())
  with check (public.is_owner());

create policy client_read_own_payments on public.payments
  for select to authenticated
  using (
    order_id in (
      select o.id
      from public.orders o
      join public.clients c on c.id = o.client_id
      where c.profile_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- projects
----------------------------------------------------------------------
create policy owner_all_projects on public.projects
  for all to authenticated
  using      (public.is_owner())
  with check (public.is_owner());

create policy client_read_own_projects on public.projects
  for select to authenticated
  using (
    client_id in (
      select id from public.clients where profile_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- project_phases
----------------------------------------------------------------------
create policy owner_all_project_phases on public.project_phases
  for all to authenticated
  using      (public.is_owner())
  with check (public.is_owner());

create policy client_read_own_project_phases on public.project_phases
  for select to authenticated
  using (
    project_id in (
      select p.id
      from public.projects p
      join public.clients c on c.id = p.client_id
      where c.profile_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- invoices
----------------------------------------------------------------------
create policy owner_all_invoices on public.invoices
  for all to authenticated
  using      (public.is_owner())
  with check (public.is_owner());

create policy client_read_own_invoices on public.invoices
  for select to authenticated
  using (
    project_id in (
      select p.id
      from public.projects p
      join public.clients c on c.id = p.client_id
      where c.profile_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- assets
----------------------------------------------------------------------
create policy owner_all_assets on public.assets
  for all to authenticated
  using      (public.is_owner())
  with check (public.is_owner());

create policy client_read_own_assets on public.assets
  for select to authenticated
  using (
    project_id in (
      select p.id
      from public.projects p
      join public.clients c on c.id = p.client_id
      where c.profile_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- decision_log
----------------------------------------------------------------------
create policy owner_all_decision_log on public.decision_log
  for all to authenticated
  using      (public.is_owner())
  with check (public.is_owner());

create policy client_read_own_decision_log on public.decision_log
  for select to authenticated
  using (
    project_id in (
      select p.id
      from public.projects p
      join public.clients c on c.id = p.client_id
      where c.profile_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- time_entries (OWNER ONLY — no client policy on purpose)
----------------------------------------------------------------------
create policy owner_all_time_entries on public.time_entries
  for all to authenticated
  using      (public.is_owner())
  with check (public.is_owner());

-- No client_* policy here. Clients get zero rows on SELECT, and any write
-- attempt is rejected by the default-deny RLS behaviour.

----------------------------------------------------------------------
-- Function execute grants
----------------------------------------------------------------------
grant execute on function public.is_owner()           to authenticated;
grant execute on function public.current_profile_id() to authenticated;
