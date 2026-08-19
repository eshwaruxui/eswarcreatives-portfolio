-- 0099_client_set_brand_visual_item_public.sql
-- Lets a client freely toggle their own Brand Visual Guide item between
-- 'client' and 'public' visibility, no admin approval step -- confirmed
-- intended behavior (not an assumption): a one-directional demote-only
-- toggle would fail to deliver "make it available for public", and free
-- bidirectional toggling doesn't cross a new trust boundary since a client
-- can only ever act on an item an admin already granted client-or-higher
-- visibility to in the first place.
--
-- Clients have no UPDATE on brand_visual_items, so this SECURITY DEFINER
-- function (mirroring respond_to_timeline_extension, 0053) verifies the
-- caller owns the item via clients.profile_id = auth.uid(), then flips
-- visibility. p_public is a boolean, not free-text -- the function can
-- physically never write 'admin_only'. Only an item already published AND
-- already visibility in ('client','public') is eligible; a draft or
-- admin_only item raises NOT_AUTHORIZED same as one the client doesn't own,
-- so this can't be used to discover an item's existence or promote
-- something the admin hasn't already released to the client tier.
create or replace function public.client_set_brand_visual_item_public(
  p_item_id uuid,
  p_public boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_item  public.brand_visual_items%rowtype;
  v_owns  boolean;
begin
  if v_actor is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_item from public.brand_visual_items where id = p_item_id;
  if not found then
    raise exception 'ITEM_NOT_FOUND';
  end if;

  select exists (
    select 1 from public.clients c
    where c.id = v_item.client_id and c.profile_id = v_actor
  ) into v_owns;
  if not v_owns then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_item.status <> 'published' or v_item.visibility not in ('client', 'public') then
    raise exception 'NOT_AUTHORIZED';
  end if;

  update public.brand_visual_items
     set visibility = case when p_public then 'public' else 'client' end,
         updated_at = now()
   where id = p_item_id;

  return jsonb_build_object('id', p_item_id, 'visibility', case when p_public then 'public' else 'client' end);
end;
$$;

revoke all on function public.client_set_brand_visual_item_public(uuid, boolean) from public, anon;
grant execute on function public.client_set_brand_visual_item_public(uuid, boolean) to authenticated;
