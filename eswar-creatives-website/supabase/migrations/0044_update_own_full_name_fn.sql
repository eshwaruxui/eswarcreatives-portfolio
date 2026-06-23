-- Phase 5 / 0044 — update_own_full_name()
-- Clients hold only SELECT on profiles (no UPDATE policy), so the account page
-- cannot write full_name directly. This SECURITY DEFINER function updates ONLY
-- the caller's own full_name and nothing else, so it cannot be used to change
-- role or any other column (no privilege escalation). Empty input clears to null.
create or replace function public.update_own_full_name(p_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  update public.profiles
     set full_name = nullif(btrim(p_full_name), '')
   where id = auth.uid();
end;
$$;

-- Authenticated-only: revoke the default PUBLIC grant so anon cannot reach it.
revoke execute on function public.update_own_full_name(text) from public;
revoke execute on function public.update_own_full_name(text) from anon;
grant  execute on function public.update_own_full_name(text) to authenticated;
