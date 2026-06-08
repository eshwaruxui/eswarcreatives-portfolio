-- Phase 1 / 0006 — time_entries (owner-only)
-- Internal time tracking. Clients have NO access of any kind (see 0007).

create type public.time_task_type as enum ('deep', 'quick', 'admin');

create table public.time_entries (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects(id) on delete cascade,
  task_description  text not null,
  task_type         public.time_task_type not null,
  duration_minutes  integer not null check (duration_minutes > 0),
  entry_date        date not null default current_date,
  created_at        timestamptz not null default now()
);

create index time_entries_project_idx on public.time_entries(project_id);
create index time_entries_date_idx    on public.time_entries(entry_date);
