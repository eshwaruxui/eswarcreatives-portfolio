-- Phase 3 / 0029 — mockup_sets (Mockups module)
-- A mockup set is a named group of concept images shared with one client for
-- review. Admins manage everything; a client sees only published sets that
-- belong to them (via clients.profile_id = auth.uid()).

create table if not exists mockup_sets (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid references projects(id) on delete cascade,
  client_id    uuid references clients(id) on delete cascade,
  concept_name text not null,
  phase        text,
  phase_name   text,
  task_item    text,
  status       text not null default 'draft' check (status in ('draft','published','archived')),
  created_by   uuid references auth.users(id),
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table mockup_sets enable row level security;

drop policy if exists "Admin full access" on mockup_sets;
create policy "Admin full access" on mockup_sets
  for all to authenticated
  using (public.is_admin());

drop policy if exists "Client read own" on mockup_sets;
create policy "Client read own" on mockup_sets
  for select to authenticated
  using (
    client_id in (select id from clients where profile_id = auth.uid())
    and status = 'published'
  );
