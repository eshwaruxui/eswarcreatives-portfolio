-- Phase 3 / 0028 — proposal-documents storage bucket (Part 5)
-- Private bucket for files attached to a proposal (the metadata rows live in
-- proposal_documents, 0026). Mirrors the logo-sketches setup in 0016, but
-- kept private: these are client documents, read via signed URLs by staff.
-- Buckets are created from SQL (the publishable key can't create them).

insert into storage.buckets (id, name, public)
values ('proposal-documents', 'proposal-documents', false)
on conflict (id) do nothing;

-- Staff (owner + admin) upload, read, and delete objects in this bucket.
drop policy if exists "staff manage proposal-documents" on storage.objects;
create policy "staff manage proposal-documents" on storage.objects
  for all to authenticated
  using      (bucket_id = 'proposal-documents' and public.is_staff())
  with check (bucket_id = 'proposal-documents' and public.is_staff());
