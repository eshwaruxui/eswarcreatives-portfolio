-- Phase 5 / 0060 — portal vote-summary RPC
-- public_votes holds voter PII (name, mobile, age, gender) and is admin-read
-- only. The client portal needs per-concept pass/reject tallies for its poll
-- track record without ever seeing a voter. This SECURITY DEFINER function
-- returns counts only, and only for a campaign whose portal_client_id belongs to
-- the caller. Replaceable so the file is re-runnable.
create or replace function public.get_portal_campaign_vote_summary(p_campaign_id uuid)
returns table (set_id uuid, sketch_index int, passed bigint, rejected bigint, total bigint)
language sql stable security definer set search_path = public
as $$
  select pv.set_id, pv.sketch_index,
         count(*) filter (where pv.decision = 'pass')   as passed,
         count(*) filter (where pv.decision = 'reject') as rejected,
         count(*)                                         as total
  from public_votes pv
  where pv.campaign_id = p_campaign_id
    and exists (
      select 1 from public_campaigns c
      join clients cl on cl.id = c.portal_client_id
      where c.id = p_campaign_id and cl.profile_id = auth.uid()
    )
  group by pv.set_id, pv.sketch_index;
$$;

grant execute on function public.get_portal_campaign_vote_summary(uuid) to authenticated;
