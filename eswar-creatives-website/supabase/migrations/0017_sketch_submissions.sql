-- Phase 3 / 0017 — sketch submission history.
-- Each time a client finishes reviewing a set we record a submission row
-- (accepted / passed tallies + when). The admin sketch page reads these to
-- show a per-set history. completed_at is part of the primary key so each
-- completion is its own immutable history row.

----------------------------------------------------------------------
-- is_admin(): true only for the 'admin' role. Mirrors is_staff() (0013) but
-- excludes 'owner'. SECURITY DEFINER so it can read profiles past RLS;
-- role::text avoids referencing the enum label unsafely.
----------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

----------------------------------------------------------------------
-- Submission history. client_id is the client's profile id (matches
-- logo_sketch_sets.client_id and auth.uid()).
----------------------------------------------------------------------
create table if not exists public.logo_sketch_submissions (
  set_id         uuid        not null references public.logo_sketch_sets(id) on delete cascade,
  client_id      uuid        not null references public.profiles(id),
  accepted_count int         not null default 0,
  passed_count   int         not null default 0,
  completed_at   timestamptz not null default now(),
  primary key (set_id, client_id, completed_at)
);

create index if not exists logo_sketch_submissions_set_idx
  on public.logo_sketch_submissions(set_id);

alter table public.logo_sketch_submissions enable row level security;

----------------------------------------------------------------------
-- RLS: a client may insert only their own rows; admins may read all.
----------------------------------------------------------------------
drop policy if exists client_insert_own_submissions on public.logo_sketch_submissions;
create policy client_insert_own_submissions on public.logo_sketch_submissions
  for insert to authenticated
  with check (client_id = auth.uid());

drop policy if exists admin_read_submissions on public.logo_sketch_submissions;
create policy admin_read_submissions on public.logo_sketch_submissions
  for select to authenticated
  using (public.is_admin());
