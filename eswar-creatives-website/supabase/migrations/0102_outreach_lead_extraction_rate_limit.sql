-- 0102_outreach_lead_extraction_rate_limit.sql
-- extract-lead-from-image is being opened up to outreach_user (previously
-- admin/owner only). Each call hits the Anthropic API, so an unmetered
-- self-serve endpoint is a real cost/abuse vector - anyone could upload
-- images in a loop.
--
-- leads.created_at doesn't fit as the counter: a user can extract details
-- repeatedly without ever confirming/inserting a lead (they can discard the
-- result), so nothing would land in `leads` to count against. This is a
-- dedicated log of every extraction *attempt*, one row per call, checked
-- before calling Anthropic.
create table if not exists outreach_lead_extractions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists outreach_lead_extractions_user_created_idx
  on outreach_lead_extractions(user_id, created_at);

alter table outreach_lead_extractions enable row level security;

create policy "outreach_user inserts own extraction log"
  on outreach_lead_extractions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "outreach_user reads own extraction log"
  on outreach_lead_extractions for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admin full access on outreach_lead_extractions"
  on outreach_lead_extractions for all
  to authenticated
  using ((select is_admin()));
