-- Phase 5 / 0037 — decline_proposal()
-- Clients hold only SELECT on proposals, so declining (which writes status +
-- reason) must run as a SECURITY DEFINER function with explicit authorisation,
-- mirroring confirm_proposal (0036). The existing respond_to_proposal() does not
-- capture the decline reason, so this dedicated function records it.
create or replace function public.decline_proposal(p_proposal_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_found uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  update public.proposals
     set status        = 'declined',
         declined_at   = now(),
         responded_at  = now(),
         decline_reason = nullif(btrim(coalesce(p_reason, '')), '')
   where id = p_proposal_id
     and status in ('sent', 'viewed')
     and (
       public.is_owner()
       or client_id in (select id from public.clients where profile_id = auth.uid())
     )
  returning id into v_found;

  if v_found is null then
    raise exception 'NOT_FOUND_OR_FORBIDDEN';
  end if;
end;
$$;

revoke execute on function public.decline_proposal(uuid, text) from public;
revoke execute on function public.decline_proposal(uuid, text) from anon;
grant  execute on function public.decline_proposal(uuid, text) to authenticated;
