-- Phase 3 / 0023 — archive flag for public votes.
-- Lets an admin archive an individual voter's responses in the "Public campaign
-- responses" view. Archiving flips this flag for every row of that voter; the
-- admin UI hides archived voters by default and can reveal/unarchive them.
-- Defaults to false so all existing votes stay visible.
--
-- 0021 only defined a SELECT policy for admins, so an UPDATE would be denied by
-- RLS. Add an admin UPDATE policy here. The table-level UPDATE privilege is
-- already granted to `authenticated`, so no extra GRANT is needed.

alter table public.public_votes
  add column if not exists archived boolean not null default false;

drop policy if exists "Admin updates votes" on public.public_votes;
create policy "Admin updates votes" on public.public_votes
  for update
  using (public.is_admin())
  with check (public.is_admin());
