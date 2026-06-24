-- Phase 5 / 0053 — respond_to_timeline_extension() RPC (5h)
-- A client approves or denies an admin's timeline-extension proposal. Clients
-- have no UPDATE on projects, so this SECURITY DEFINER function verifies the
-- caller owns the project, then updates the extension status and (on approval)
-- copies new_timeline onto the project, in one transaction. Mirrors the
-- respond_to_proposal() pattern; authenticated-only.
create or replace function public.respond_to_timeline_extension(
  p_extension_id uuid,
  p_approve boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_ext   public.timeline_extensions%rowtype;
  v_owns  boolean;
begin
  if v_actor is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_ext from public.timeline_extensions where id = p_extension_id;
  if not found then
    raise exception 'EXTENSION_NOT_FOUND';
  end if;
  if v_ext.status <> 'pending' then
    raise exception 'ALREADY_RESPONDED';
  end if;

  select exists (
    select 1 from public.projects pr
    join public.clients c on c.id = pr.client_id
    where pr.id = v_ext.project_id and c.profile_id = v_actor
  ) into v_owns;
  if not (v_owns or public.is_admin()) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  update public.timeline_extensions
     set status = case when p_approve then 'approved' else 'denied' end,
         responded_at = now()
   where id = p_extension_id;

  if p_approve then
    update public.projects set timeline = v_ext.new_timeline where id = v_ext.project_id;
  end if;

  return jsonb_build_object('status', case when p_approve then 'approved' else 'denied' end);
end;
$$;

revoke all on function public.respond_to_timeline_extension(uuid, boolean) from public, anon;
grant execute on function public.respond_to_timeline_extension(uuid, boolean) to authenticated;
