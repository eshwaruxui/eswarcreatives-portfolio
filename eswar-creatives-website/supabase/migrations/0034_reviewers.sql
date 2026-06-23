-- Phase 5 / 0034 — reviewers
-- A reviewer is a profile invited (by an admin) to vote on review campaigns.
-- Row-level security: a reviewer may read only their own row; is_admin() (the
-- SECURITY DEFINER staff predicate used across the portal) manages all rows.
create table public.reviewers (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid references public.profiles(id) on delete cascade,
  invited_by  uuid references public.profiles(id),
  created_at  timestamptz default now()
);

alter table public.reviewers enable row level security;

create policy "Reviewers see own row" on public.reviewers
  for select using (profile_id = auth.uid());

create policy "Admin manages reviewers" on public.reviewers
  for all using (public.is_admin());
