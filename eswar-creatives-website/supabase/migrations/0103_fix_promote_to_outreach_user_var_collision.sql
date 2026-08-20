-- 0103_fix_promote_to_outreach_user_var_collision.sql
-- promote_to_outreach_user() (0101) declared a local variable named
-- `current_role`. That's not a plain identifier - CURRENT_ROLE is a
-- reserved Postgres pseudo-constant (like CURRENT_USER), and it silently
-- won over the local variable of the same name in every comparison inside
-- the function. `current_role = 'client'` was actually comparing the
-- session's execution role name ('authenticated', since that's who
-- PostgREST executes as) against the literal 'client' - always false,
-- regardless of the calling user's real profile role or the account's age.
--
-- Confirmed directly: a debug variant of this function that tried to RETURN
-- current_role typed as public.user_role failed with "Returned type name
-- does not match expected type user_role" - proof it was resolving to the
-- built-in keyword (type `name`), not the declared variable, in every prior
-- deployment of this function. This is why the account-freshness window and
-- the client-side retry added afterward never actually mattered: every call
-- was guaranteed to fail from the moment 0101 was applied, for every user.
--
-- Fix: rename the variable so it can't collide with the reserved token.
-- Logic is otherwise unchanged from 0101.
create or replace function promote_to_outreach_user()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_role public.user_role;
  acct_created timestamptz;
begin
  select role into existing_role from profiles where id = auth.uid();
  select created_at into acct_created from auth.users where id = auth.uid();

  if existing_role is null then
    return false;
  end if;

  if existing_role = 'client' and acct_created > now() - interval '2 minutes' then
    update profiles set role = 'outreach_user' where id = auth.uid();
    return true;
  end if;

  return false;
end;
$$;
