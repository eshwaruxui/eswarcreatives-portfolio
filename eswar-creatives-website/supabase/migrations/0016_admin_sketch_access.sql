-- Phase 3 / 0016 — staff (admin) access for the sketch upload page.
-- Background:
--   * 0012 enabled RLS on logo_sketch_sets / logo_sketch_reviews with a
--     "client owns ..." policy only (client_id = auth.uid()).
--   * 0007 lets only the owner or the owning client read `clients`.
--   * 0013 added the 'admin' role and is_staff() (owner OR admin), and gave
--     staff full access to `projects`.
-- The admin sketch-upload page runs as an 'admin' profile, so it needs staff
-- access to the sketch tables, staff read on clients, a display name on a set,
-- and storage policies for the logo-sketches bucket. All additive: the client
-- policies stay, and RLS is permissive (a row passes if ANY policy passes).
-- Drop-if-exists guards keep the file safe to re-run.

----------------------------------------------------------------------
-- 1. Display name for a sketch set (the page's "Set name" field).
----------------------------------------------------------------------
alter table public.logo_sketch_sets
  add column if not exists name text;

----------------------------------------------------------------------
-- 2. Staff (owner + admin) full access to the sketch tables.
----------------------------------------------------------------------
drop policy if exists staff_all_logo_sketch_sets on public.logo_sketch_sets;
create policy staff_all_logo_sketch_sets on public.logo_sketch_sets
  for all to authenticated
  using      (public.is_staff())
  with check (public.is_staff());

drop policy if exists staff_all_logo_sketch_reviews on public.logo_sketch_reviews;
create policy staff_all_logo_sketch_reviews on public.logo_sketch_reviews
  for all to authenticated
  using      (public.is_staff())
  with check (public.is_staff());

----------------------------------------------------------------------
-- 3. Staff read on clients so the page can list who to upload for.
----------------------------------------------------------------------
drop policy if exists staff_read_clients on public.clients;
create policy staff_read_clients on public.clients
  for select to authenticated
  using (public.is_staff());

----------------------------------------------------------------------
-- 4. Storage: ensure the logo-sketches bucket exists and is public-read,
--    let staff write/manage its objects, and allow public read so the
--    client review page can load images via getPublicUrl.
----------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('logo-sketches', 'logo-sketches', true)
on conflict (id) do update set public = true;

drop policy if exists "staff manage logo-sketches" on storage.objects;
create policy "staff manage logo-sketches" on storage.objects
  for all to authenticated
  using      (bucket_id = 'logo-sketches' and public.is_staff())
  with check (bucket_id = 'logo-sketches' and public.is_staff());

drop policy if exists "public read logo-sketches" on storage.objects;
create policy "public read logo-sketches" on storage.objects
  for select to public
  using (bucket_id = 'logo-sketches');
