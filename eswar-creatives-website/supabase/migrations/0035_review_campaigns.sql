-- Phase 5 / 0035 — review campaigns, items, votes
-- A lightweight approval-voting flow distinct from the public_campaigns /
-- public_votes sketch system: admins create a campaign, attach image items, and
-- invited reviewers (or the owning client) record an approve / changes-requested
-- decision per item.
create table public.review_campaigns (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  client_id   uuid references public.clients(id),
  created_by  uuid references public.profiles(id),
  status      text default 'active',
  created_at  timestamptz default now()
);

create table public.review_items (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid references public.review_campaigns(id) on delete cascade,
  label        text,
  image_path   text,
  sort_order   int default 0
);

create table public.review_votes (
  id                uuid primary key default gen_random_uuid(),
  campaign_id       uuid references public.review_campaigns(id) on delete cascade,
  item_id           uuid references public.review_items(id) on delete cascade,
  voter_profile_id  uuid references public.profiles(id),
  decision          text check (decision in ('approved','changes_requested')),
  created_at        timestamptz default now()
);

alter table public.review_campaigns enable row level security;
alter table public.review_items     enable row level security;
alter table public.review_votes      enable row level security;

create policy "Admin manages campaigns" on public.review_campaigns
  for all using (public.is_admin());

create policy "Client sees own campaigns" on public.review_campaigns
  for select using (
    client_id in (select id from public.clients where profile_id = auth.uid())
  );

-- Any user who is a reviewer may read campaigns. There is no per-campaign invite
-- link in this phase, so this intentionally grants every reviewer visibility of
-- all campaigns; tighten with a join table if per-campaign scoping is needed.
create policy "Reviewer sees invited campaigns" on public.review_campaigns
  for select using (
    exists (select 1 from public.reviewers where profile_id = auth.uid())
  );

create policy "Voters see items" on public.review_items
  for select using (true);

create policy "Voters insert own votes" on public.review_votes
  for insert with check (voter_profile_id = auth.uid());

create policy "Voters see own votes" on public.review_votes
  for select using (voter_profile_id = auth.uid());
