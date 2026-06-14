-- Phase 3 / 0021 — public votes.
-- One row per sketch decision from an anonymous voter, carrying the voter
-- details captured by the campaign's form (denormalized) plus the campaign,
-- set, and sketch index. RLS: anyone may insert a vote (public voting), only
-- admins may read them (the admin "Public campaign responses" view).
-- decision is 'pass' (green accept CTA) or 'reject' (red X CTA).

create table if not exists public.public_votes (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.public_campaigns(id) on delete cascade,
  set_id       uuid not null references public.logo_sketch_sets(id) on delete cascade,
  voter_name   text,
  voter_age    text,
  voter_gender text,
  voter_mobile text,
  sketch_index integer not null,
  decision     text not null check (decision in ('pass', 'reject')),
  submitted_at timestamptz default now()
);

alter table public.public_votes enable row level security;

drop policy if exists "Admin reads all votes" on public.public_votes;
create policy "Admin reads all votes" on public.public_votes
  for select
  using (public.is_admin());

drop policy if exists "Anyone can insert vote" on public.public_votes;
create policy "Anyone can insert vote" on public.public_votes
  for insert
  with check (true);
