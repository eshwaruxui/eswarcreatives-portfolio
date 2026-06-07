-- Phase 3 / 0014 — seed "Newgen Branding 2026" for Mohan
-- Mohan is identified by his profiles.id. The existing projects.client_id
-- references clients(id), so we resolve his clients row from that profile.
-- The whole file is idempotent — safe to run more than once.

----------------------------------------------------------------------
-- Portal projects start in 'discovery' before any order exists, so order_id
-- is no longer required on the delivery-side projects table.
----------------------------------------------------------------------
alter table public.projects
  alter column order_id drop not null;

----------------------------------------------------------------------
-- Ensure Mohan has a clients row (no-op if it already exists; profile_id is
-- unique). Drop these three lines if his client record is already present.
----------------------------------------------------------------------
insert into public.clients (profile_id, contact_name)
values ('42f77e83-1be6-4177-83e7-1ca2c5d3fc80', 'Mohan')
on conflict (profile_id) do nothing;

----------------------------------------------------------------------
-- The project. slug is unique, so a re-run is a no-op. phase_number is the
-- portal's integer phase pointer added in 0013 (the spec's "current_phase").
----------------------------------------------------------------------
insert into public.projects (client_id, title, slug, status, phase_number)
select c.id, 'Newgen Branding 2026', 'newgen-branding-2026', 'discovery', 1
from public.clients c
where c.profile_id = '42f77e83-1be6-4177-83e7-1ca2c5d3fc80'
on conflict (slug) do nothing;

----------------------------------------------------------------------
-- Four phases: Discovery unlocked, the rest gated. The existing sort_order
-- column carries the spec's phase_order. Guarded so re-runs don't duplicate.
----------------------------------------------------------------------
insert into public.project_phases (project_id, phase_name, sort_order, locked)
select p.id, t.phase_name, t.phase_order, t.locked
from (
  values
    ('Discovery',        1, false),
    ('Logo Exploration', 2, true),
    ('Refinement',       3, true),
    ('Final Delivery',   4, true)
) as t(phase_name, phase_order, locked)
cross join (
  select id from public.projects where slug = 'newgen-branding-2026'
) p
where not exists (
  select 1 from public.project_phases pp
  where pp.project_id = p.id
    and pp.phase_name = t.phase_name
);
