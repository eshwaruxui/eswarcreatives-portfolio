-- Phase 5 / 0059 — client reads own portal-linked campaigns
-- The existing public_campaigns SELECT policy only exposes rows while a campaign
-- is 'active' (link voting open). For the portal track record a client must keep
-- seeing their poll after it closes, so this adds a SELECT policy scoping rows by
-- portal_client_id to the signed-in client. Mirrors review_campaigns' client
-- policy. Per-concept counts still come from a SECURITY DEFINER RPC (0060), never
-- raw votes, so no voter PII is exposed by this read.
create policy "Client reads own portal campaigns" on public.public_campaigns
  for select to authenticated
  using (
    portal_client_id in (
      select id from public.clients where profile_id = auth.uid()
    )
  );
