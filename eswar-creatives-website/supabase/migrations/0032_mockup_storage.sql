-- Phase 3 / 0032 — mockups storage bucket + policies (Mockups module)
-- Private bucket holding the concept images. Objects are stored at
-- `{set_id}/{filename}`, so the client read policy authorises an object by
-- matching its first path segment (the set id) to one of the client's published
-- sets. Mirrors the private bucket setup in 0028; buckets are created from SQL.

insert into storage.buckets (id, name, public)
values ('mockups', 'mockups', false)
on conflict (id) do nothing;

-- Admins upload, read, and delete any object in this bucket.
drop policy if exists "Admin manage mockups" on storage.objects;
create policy "Admin manage mockups" on storage.objects
  for all to authenticated
  using      (bucket_id = 'mockups' and public.is_admin())
  with check (bucket_id = 'mockups' and public.is_admin());

-- A client reads an object only when its {set_id} folder belongs to one of their
-- published sets.
drop policy if exists "Client read own mockups" on storage.objects;
create policy "Client read own mockups" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'mockups'
    and (storage.foldername(name))[1]::uuid in (
      select ms.id from mockup_sets ms
      join clients c on c.id = ms.client_id
      where c.profile_id = auth.uid() and ms.status = 'published'
    )
  );
