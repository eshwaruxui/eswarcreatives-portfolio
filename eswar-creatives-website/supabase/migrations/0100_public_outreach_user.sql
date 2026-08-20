-- 0100_public_outreach_user.sql
-- New self-serve outreach_user role, settings/onboarding tables, and
-- owner_id columns on leads/sequences/outreach_touches so a self-serve
-- user's rows can be scoped to them without touching existing admin
-- outreach access (admin policies are untouched and still apply).

-- 1. Add outreach_user to role enum
alter type public.user_role add value if not exists 'outreach_user';

-- 2. New table: outreach user settings
create table if not exists outreach_user_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  daily_cap integer not null default 10
    check (daily_cap in (5, 10, 15, 20, 25)),
  timezone text not null default 'Asia/Kolkata',
  sending_name text,
  sending_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- 3. New table: outreach user onboarding state
create table if not exists outreach_user_onboarding (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  service_selected text default 'outreach',
  step_completed integer not null default 0,
  first_sequence_created boolean not null default false,
  first_lead_added boolean not null default false,
  onboarding_complete boolean not null default false,
  icp_intro_shown boolean not null default false,
  login_count integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- 4. Add owner_id to leads (nullable: existing rows stay null = admin-owned)
alter table leads
  add column if not exists owner_id uuid references auth.users(id);

-- 5. Add owner_id to sequences
alter table sequences
  add column if not exists owner_id uuid references auth.users(id);

-- 6. Add owner_id to outreach_touches
alter table outreach_touches
  add column if not exists owner_id uuid references auth.users(id);

-- 7. RLS: outreach_user_settings
alter table outreach_user_settings enable row level security;

create policy "outreach_user reads own settings"
  on outreach_user_settings for select
  to authenticated
  using (user_id = auth.uid());

create policy "outreach_user inserts own settings"
  on outreach_user_settings for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "outreach_user updates own settings"
  on outreach_user_settings for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admin full access on outreach_user_settings"
  on outreach_user_settings for all
  to authenticated
  using ((select is_admin()));

-- 8. RLS: outreach_user_onboarding
alter table outreach_user_onboarding enable row level security;

create policy "outreach_user reads own onboarding"
  on outreach_user_onboarding for select
  to authenticated
  using (user_id = auth.uid());

create policy "outreach_user inserts own onboarding"
  on outreach_user_onboarding for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "outreach_user updates own onboarding"
  on outreach_user_onboarding for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 9. leads RLS: outreach_user access to own leads only.
-- WITH CHECK re-verifies role on every insert/update, not just USING,
-- so a client/admin profile can't slip a row in via owner_id = auth.uid().
create policy "outreach_user manages own leads"
  on leads for all
  to authenticated
  using (
    owner_id = auth.uid()
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'outreach_user'
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'outreach_user'
    )
  );

-- 10. sequences RLS: outreach_user access to own sequences only.
create policy "outreach_user manages own sequences"
  on sequences for all
  to authenticated
  using (
    owner_id = auth.uid()
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'outreach_user'
    )
  )
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'outreach_user'
    )
  );

-- 11. RPC: bootstrap new outreach_user on first signup
create or replace function bootstrap_outreach_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into outreach_user_settings (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  insert into outreach_user_onboarding (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;
end;
$$;

-- 12. RPC: increment login count (called on every login)
create or replace function increment_outreach_login_count()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update outreach_user_onboarding
  set login_count = login_count + 1,
      updated_at = now()
  where user_id = auth.uid();
end;
$$;

notify pgrst, 'reload schema';
