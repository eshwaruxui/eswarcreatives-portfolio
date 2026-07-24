-- Migration 0080: Outreach + Smart Shortlist fixes
-- 1. shortlist_runs.channel — one channel per run (replaces the dual
--    volume_email/volume_linkedin selector in the New Shortlist modal)
-- 2. shortlist_runs.error_code — carries the specific failure reason from the
--    async background task (process-shortlist-run) back to the polling client,
--    since the client no longer awaits the function's direct response
-- 3. outreach_touches 'held' status — LinkedIn steps that require an accepted
--    connection no longer show as actionable ('scheduled') until the admin
--    marks the lead connected or skips the current step
-- 4. enroll_lead — gate requires_connected steps behind 'held' at creation time
-- 5. mark_lead_connected RPC — flips linkedin_status + promotes held touches

-- ── shortlist_runs: channel + error_code ────────────────────────────────────
alter table shortlist_runs
  add column if not exists channel text
  check (channel in ('email', 'linkedin', 'both'))
  default 'both';

alter table shortlist_runs
  add column if not exists error_code text;

-- ── outreach_touches: held status ────────────────────────────────────────────
alter table outreach_touches
  drop constraint if exists outreach_touches_status_check;
alter table outreach_touches
  add constraint outreach_touches_status_check
  check (status in (
    'scheduled', 'sent', 'skipped', 'cancelled', 'failed', 'held'
  ));

-- ── enroll_lead: gate requires_connected steps behind 'held' ────────────────
-- Same body as migration 0072's enroll_lead, except the touches insert now sets
-- status = 'held' (not the column default 'scheduled') for any step whose
-- sequence_steps.requires_connected = true, so LinkedIn DM follow-ups (steps
-- 2-4 of the LinkedIn Outreach sequence) never surface as actionable until the
-- connection is confirmed.
create or replace function enroll_lead(
  p_lead_id     uuid,
  p_sequence_id uuid,
  p_start_date  date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enrollment_id uuid;
  v_lead          leads%rowtype;
  v_has_email_step boolean;
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;

  select * into v_lead from leads where id = p_lead_id;
  if not found then
    raise exception 'lead_not_found';
  end if;

  select exists(
    select 1 from sequence_steps
    where sequence_id = p_sequence_id and channel = 'email'
  ) into v_has_email_step;

  if v_has_email_step and (v_lead.specific_observation is null or trim(v_lead.specific_observation) = '') then
    raise exception 'missing_observation';
  end if;

  if exists(
    select 1 from lead_enrollments
    where lead_id = p_lead_id and sequence_id = p_sequence_id and status = 'active'
  ) then
    raise exception 'already_enrolled';
  end if;

  insert into lead_enrollments (lead_id, sequence_id, started_at)
  values (p_lead_id, p_sequence_id, p_start_date)
  returning id into v_enrollment_id;

  insert into outreach_touches (lead_id, enrollment_id, step_id, channel, scheduled_for, status)
  select
    p_lead_id,
    v_enrollment_id,
    ss.id,
    ss.channel,
    next_business_day(p_start_date + ss.day_offset),
    case when ss.requires_connected then 'held' else 'scheduled' end
  from sequence_steps ss
  where ss.sequence_id = p_sequence_id
  order by ss.step_number;

  update leads
  set status = 'active'
  where id = p_lead_id and status = 'new';

  return v_enrollment_id;
end;
$$;

-- ── mark_lead_connected: flip linkedin_status + promote held touches ───────
create or replace function mark_lead_connected(p_lead_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;

  update leads
  set linkedin_status = 'connected'
  where id = p_lead_id;

  update outreach_touches
  set status = 'scheduled'
  where lead_id = p_lead_id and status = 'held';
end;
$$;
