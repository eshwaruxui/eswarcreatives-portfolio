-- 0077 — Fix two production bugs from the project-stage-module rollout (PR #10):
--
-- 1. Uploads failing everywhere ("Upload failed. Please try again."):
--    The `stage-attachments` bucket referenced by AttachmentSection.tsx was
--    never actually created in Storage. Confirmed by probing the Storage API
--    directly: uploading to `stage-attachments` returns the identical
--    "Bucket not found" error as a bucket name that has never existed,
--    whereas uploading to the known-working `payment_proofs` bucket reaches
--    its MIME-type validation instead (proof that bucket really exists).
--    Path convention used by the app: {project_id}/{stage_number}/{category}/{filename}
--    or {project_id}/project-level/{category}/{filename} — so the first path
--    folder is always the project_id, matching the pattern used by
--    proposal-documents (0057) and payment_proofs (0067).
--
-- 2. Notes failing everywhere ("Could not send message. Please try again."):
--    project_client_notes genuinely exists in Postgres (proven: querying it
--    with the anon key returns a real "permission denied for table" error,
--    which Postgres only raises for relations that exist), but every insert
--    fails with PGRST204 "Could not find the 'author_name' column ... in
--    the schema cache". Two manual `NOTIFY pgrst, 'reload schema'` runs did
--    not fix it, and removing `author_name` from the insert payload gets
--    past that error entirely (hits a legitimate downstream RLS check
--    instead) — so PostgREST recognizes the table and its other columns
--    fine, meaning `author_name` most likely was never actually added to
--    the live table, not just missing from a stale cache. Fix: add the
--    column defensively (no-op if it already exists), then force a real
--    DDL event via COMMENT so Supabase's automatic schema-cache-reload
--    trigger fires (more reliable than a bare NOTIFY from the SQL Editor).

----------------------------------------------------------------------
-- 1. stage-attachments storage bucket (private).
----------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stage-attachments',
  'stage-attachments',
  false,
  10485760, -- 10MB, matches MAX_BYTES in AttachmentSection.tsx
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'video/mp4',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
on conflict (id) do nothing;

-- Admin: full management via is_admin() SECURITY DEFINER.
drop policy if exists "admin_all_stage_attachments" on storage.objects;
create policy "admin_all_stage_attachments" on storage.objects
  for all
  using      (bucket_id = 'stage-attachments' and public.is_admin())
  with check (bucket_id = 'stage-attachments' and public.is_admin());

-- Client: SELECT only, scoped to projects belonging to their client row.
-- First path folder is always the project_id (see path convention above).
drop policy if exists "client_read_own_stage_attachments" on storage.objects;
create policy "client_read_own_stage_attachments" on storage.objects
  for select
  using (
    bucket_id = 'stage-attachments'
    and ((storage.foldername(name))[1])::uuid in (
      select p.id
        from public.projects p
        join public.clients  c on c.id = p.client_id
       where c.profile_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- 2. Ensure project_client_notes.author_name genuinely exists, then force
--    a real DDL event (COMMENT) so Supabase's schema-cache-reload trigger
--    fires reliably, with an explicit NOTIFY as a backup.
----------------------------------------------------------------------
alter table public.project_client_notes
  add column if not exists author_name text;

comment on column public.project_client_notes.author_name is 'Display name of the note author (client or admin)';

NOTIFY pgrst, 'reload schema';
