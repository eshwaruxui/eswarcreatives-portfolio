-- Phase 3 / 0019 — public voting campaigns.
-- Adds shareable, no-login logo voting. A campaign holds its title, the project
-- name shown to voters, per-field collect/required flags for the voter details
-- form, and a voting_token that drives the public link (/portal/vote/:token).
-- RLS: admins manage everything; anyone may read a campaign once it is 'active'
-- so the public link resolves. Drop-if-exists guards keep the file re-runnable.

create table if not exists public.public_campaigns (
  id                 uuid primary key default gen_random_uuid(),
  campaign_title     text not null,
  project_name       text not null,
  collect_name       boolean not null default true,
  name_required      boolean not null default true,
  collect_age        boolean not null default false,
  age_required       boolean not null default false,
  collect_gender     boolean not null default false,
  gender_required    boolean not null default false,
  collect_mobile     boolean not null default false,
  mobile_required    boolean not null default false,
  mobile_placeholder text default '9841085484',
  status             text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  voting_token       uuid not null default gen_random_uuid(),
  created_by         uuid references auth.users(id),
  created_at         timestamptz default now()
);

alter table public.public_campaigns enable row level security;

drop policy if exists "Admin manages campaigns" on public.public_campaigns;
create policy "Admin manages campaigns" on public.public_campaigns
  for all
  using      (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Public read by token" on public.public_campaigns;
create policy "Public read by token" on public.public_campaigns
  for select
  using (status = 'active');
