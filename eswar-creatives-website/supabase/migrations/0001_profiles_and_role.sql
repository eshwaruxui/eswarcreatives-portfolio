-- Phase 1 / 0001 — profiles + role enum + signup trigger
-- Creates the role system and links auth.users to a profiles row.
-- RLS itself is enabled in 0007.

-- 1. Role enum: owner has full access, client sees only own data.
create type public.user_role as enum ('owner', 'client');

-- 2. Profiles: one row per auth.users row, holding role + display fields.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        public.user_role not null default 'client',
  full_name   text,
  email       text not null,
  created_at  timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);

-- 3. Auto-create profile on signup.
-- Uses SECURITY DEFINER so the trigger can write to public.profiles
-- regardless of the new user's permissions.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Helper: is the current user an owner?
-- Reused by every RLS policy in 0007. SECURITY DEFINER lets it read
-- profiles even when the caller's own RLS would block them.
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'owner'
  );
$$;

-- 5. Helper: returns the profiles.id (= auth.uid()) of the current user.
-- Thin wrapper for readability inside policies.
create or replace function public.current_profile_id()
returns uuid
language sql
stable
as $$
  select auth.uid();
$$;
