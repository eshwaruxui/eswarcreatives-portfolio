-- Phase 5 / 0058 — public_campaigns portal linkage
-- Surfaces a finished public logo poll inside the owning client's portal as a
-- read-only track record (Phase 5 6d/6f). portal_client_id links a campaign to a
-- client; portal_decision_note holds the short outcome summary shown on the
-- portal. Both are nullable so existing campaigns are unaffected. Guarded so the
-- file is re-runnable. The backfill links the Newgen Jun-2026 poll to its client
-- and is a no-op in any environment lacking that voting_token.
alter table public.public_campaigns
  add column if not exists portal_client_id uuid references public.clients(id);

alter table public.public_campaigns
  add column if not exists portal_decision_note text;

update public.public_campaigns
set portal_client_id = 'c410bbf5-3b2c-4e2e-829f-9b79c3e5f9c7',
    portal_decision_note = 'Top concepts shortlisted from 548 public votes. Selected concepts to progress to refined design phase.'
where voting_token = '37743a47-1fc1-4ddd-94e4-be6f029a8971'
  and portal_client_id is null;
