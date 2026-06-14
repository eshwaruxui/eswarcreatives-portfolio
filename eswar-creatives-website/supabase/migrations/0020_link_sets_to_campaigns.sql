-- Phase 3 / 0020 — link sketch sets to public campaigns.
-- A campaign's sketch sets are ordinary logo_sketch_sets rows tagged with
-- campaign_id (null for the normal client flow). Voters are anonymous, so they
-- need a read path to those sets: a public SELECT policy exposing ONLY sets that
-- belong to an 'active' campaign (client sets have campaign_id null and never
-- match). Additive — the existing client/staff policies stay.

alter table public.logo_sketch_sets
  add column if not exists campaign_id uuid references public.public_campaigns(id) on delete set null;

drop policy if exists "Public read active-campaign sets" on public.logo_sketch_sets;
create policy "Public read active-campaign sets" on public.logo_sketch_sets
  for select
  using (
    campaign_id is not null
    and exists (
      select 1 from public.public_campaigns c
      where c.id = logo_sketch_sets.campaign_id
        and c.status = 'active'
    )
  );
