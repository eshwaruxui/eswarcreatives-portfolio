-- 0057 — Let a client read the files attached to their own proposals.
-- The proposal-documents bucket is private and previously had only a staff
-- policy, so the client portal could list document rows but never open them.
-- Files are stored at {proposal_id}/{filename}, so the first path folder
-- identifies the proposal; we allow SELECT when that proposal belongs to the
-- signed-in client. Mirrors the existing "Client read own mockups" policy.
create policy "Client read own proposal-documents" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'proposal-documents'
    and ((storage.foldername(name))[1])::uuid in (
      select p.id
      from public.proposals p
      join public.clients c on c.id = p.client_id
      where c.profile_id = auth.uid()
    )
  );
