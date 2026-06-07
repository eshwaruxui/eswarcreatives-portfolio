-- Phase 3 / 0013 — admin role, impersonation audit, portal extensions
-- Adapts the phase-3-portal spec to the schema shipped in Phase 1.
--   * Phase 1 already ships `projects` and `project_phases` (0005) and the
--     `user_role` enum + is_owner() helper (0001). We EXTEND those rather than
--     recreate (a second `create table projects` would fail).
--   * All role checks compare role::text so the freshly-added 'admin' enum label
--     is never referenced as an enum literal inside this same transaction
--     (avoids Postgres "unsafe use of new value of enum type").

----------------------------------------------------------------------
-- 1. Admin role. 'owner' stays the agency super-user; 'admin' is the new
--    portal-staff role. Added idempotently; not used as a literal in this file.
----------------------------------------------------------------------
alter type public.user_role add value if not exists 'admin';

-- Staff predicate: owner OR admin. Mirrors is_owner() (SECURITY DEFINER so it can
-- read profiles past the caller's own RLS). role::text keeps it txn-safe.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text in ('owner', 'admin')
  );
$$;

grant execute on function public.is_staff() to authenticated;

----------------------------------------------------------------------
-- 2. Impersonation audit trail.
----------------------------------------------------------------------
create table public.admin_impersonation_sessions (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references public.profiles(id),
  client_id   uuid not null references public.profiles(id),
  started_at  timestamptz default now(),
  ended_at    timestamptz
);

create index admin_impersonation_admin_idx  on public.admin_impersonation_sessions(admin_id);
create index admin_impersonation_client_idx on public.admin_impersonation_sessions(client_id);

----------------------------------------------------------------------
-- 3. Portal columns on the existing delivery-side projects table.
--    Existing cols: order_id, client_id->clients, title, current_phase TEXT,
--    status (project_status enum), created_at.
--    current_phase is already TEXT, so the portal's integer phase pointer lives
--    in a new `phase_number` column to avoid a type clash.
----------------------------------------------------------------------
alter table public.projects
  add column if not exists slug         text,
  add column if not exists phase_number int  not null default 1,
  add column if not exists updated_at   timestamptz default now();

-- Slug is the portal's stable handle; unique but nullable for legacy rows.
create unique index if not exists projects_slug_key on public.projects(slug);

-- Layer the portal workflow statuses onto the existing project_status enum
-- ('active','on_hold','delivered','closed'). 'delivered' already exists.
-- Used only by the 0014 seed, which runs in a later transaction.
alter type public.project_status add value if not exists 'discovery';
alter type public.project_status add value if not exists 'briefing';
alter type public.project_status add value if not exists 'design';
alter type public.project_status add value if not exists 'review';

----------------------------------------------------------------------
-- 4. Portal columns on the existing project_phases table.
--    Existing cols include phase_name + sort_order (= the spec's phase_order).
--    Add the lock gate + completion timestamp the portal needs.
----------------------------------------------------------------------
alter table public.project_phases
  add column if not exists locked       boolean not null default true,
  add column if not exists completed_at timestamptz;

----------------------------------------------------------------------
-- 5. RLS. Phase 1 already enabled RLS + owner/client policies on projects and
--    project_phases (0007). Add staff (owner+admin) full access, and stand up
--    the impersonation table's policies.
----------------------------------------------------------------------
create policy staff_all_projects on public.projects
  for all to authenticated
  using      (public.is_staff())
  with check (public.is_staff());

create policy staff_all_project_phases on public.project_phases
  for all to authenticated
  using      (public.is_staff())
  with check (public.is_staff());

alter table public.admin_impersonation_sessions enable  row level security;
alter table public.admin_impersonation_sessions force   row level security;

create policy staff_all_impersonation on public.admin_impersonation_sessions
  for all to authenticated
  using      (public.is_staff())
  with check (public.is_staff());
