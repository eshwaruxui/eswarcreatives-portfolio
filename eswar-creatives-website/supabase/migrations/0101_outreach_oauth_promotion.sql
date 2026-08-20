-- 0101_outreach_oauth_promotion.sql
-- Google OAuth on /outreach/signup lands on the same auth.users/profiles
-- table used by the client/admin/reviewer portal. A brand-new OAuth sign-in
-- gets role='client' from the handle_new_user() trigger default (0001), same
-- as any other new account, and profiles has no self-service UPDATE policy
-- (only owner_all_profiles and a read-only own-row policy — see 0007), so the
-- client can't just upsert its own role to outreach_user.
--
-- This RPC is the one narrow, safe way to bridge that: it only ever flips
-- role 'client' -> 'outreach_user', and only when the account was created in
-- the last 2 minutes. That window is what stops it from being usable against
-- a real pre-existing client account — their auth.users.created_at will
-- always be old, so the condition never matches and the row is left alone.
-- Any other existing role (admin/owner/reviewer/already outreach_user) is
-- never touched by this function.
create or replace function promote_to_outreach_user()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_role public.user_role;
  acct_created timestamptz;
begin
  select role into current_role from profiles where id = auth.uid();
  select created_at into acct_created from auth.users where id = auth.uid();

  if current_role is null then
    return false;
  end if;

  if current_role = 'client' and acct_created > now() - interval '2 minutes' then
    update profiles set role = 'outreach_user' where id = auth.uid();
    return true;
  end if;

  return false;
end;
$$;
