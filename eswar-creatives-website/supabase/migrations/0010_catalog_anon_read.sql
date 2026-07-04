-- Phase 2 / 0010 — public (anon) read on the services catalog
-- The Atelier marketing pages (/services/branding, /services/design-systems)
-- need to render pricing tiers without a logged-in session. Open SELECT to
-- anon on the two catalog tables only. Everything else stays default-deny.

-- Base grants. Phase 1 / 0008 only granted DML on tables to authenticated and
-- service_role; anon needs an explicit SELECT grant to be able to see anything
-- even with an RLS policy in place.
grant select on public.services      to anon;
grant select on public.service_tiers to anon;

-- RLS policies.
drop policy if exists anon_read_services      on public.services;
drop policy if exists anon_read_service_tiers on public.service_tiers;

create policy anon_read_services on public.services
  for select to anon
  using (is_active = true);

create policy anon_read_service_tiers on public.service_tiers
  for select to anon
  using (
    exists (
      select 1 from public.services s
      where s.id = service_tiers.service_id
        and s.is_active = true
    )
  );
