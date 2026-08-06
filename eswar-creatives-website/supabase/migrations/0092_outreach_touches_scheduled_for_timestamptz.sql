-- Migration 0092: outreach_touches.scheduled_for date -> timestamptz
--
-- scheduled_for has been a bare `date` column since migration 0072 (0076's
-- `scheduled_for timestamptz` is a DIFFERENT table, linkedin_posts — verified
-- before writing this). Every precise "9:30 AM recipient-local" timestamp
-- the new business-hours scheduling logic computes gets silently truncated
-- to just a date the moment it's written, since a date column has nowhere
-- to put the hour. This migration is what actually makes that precision
-- reach storage and be enforceable by the cron dispatcher's
-- `scheduled_for <= now()` check.
--
-- Existing rows: bare dates become midnight UTC of that date on cast — they
-- never had real time-of-day precision anyway, so nothing is lost.
alter table outreach_touches
  alter column scheduled_for type timestamptz
  using scheduled_for::timestamptz;

-- resume_enrollment used `scheduled_for + v_days_paused`, which relies on
-- `date + integer` semantics (add N days). That operator does not exist for
-- `timestamptz + integer` (confirmed live before writing this: Postgres
-- raises "operator does not exist: timestamp with time zone + integer").
-- Fixed by adding via `make_interval` instead, keeping next_business_day's
-- date-in/date-out signature unchanged (pause/resume is a coarse, whole-day
-- shift — collapsing to midnight through this path is fine and matches
-- pre-migration behavior, since dates never carried an hour anyway).
-- enroll_lead needed no change: it inserts a `date` value into scheduled_for,
-- which Postgres safely casts to timestamptz (midnight) on assignment.
create or replace function resume_enrollment(p_enrollment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paused_at timestamptz;
  v_days_paused int;
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;

  select paused_at into v_paused_at
  from lead_enrollments
  where id = p_enrollment_id and status = 'paused';

  if not found or v_paused_at is null then
    raise exception 'not_paused';
  end if;

  v_days_paused := extract(day from (now() - v_paused_at))::int;

  -- Shift remaining scheduled touches forward, applying weekend rollover
  update outreach_touches
  set scheduled_for = next_business_day((scheduled_for + make_interval(days => v_days_paused))::date)::timestamptz
  where enrollment_id = p_enrollment_id and status = 'scheduled';

  update lead_enrollments
  set status = 'active', paused_at = null
  where id = p_enrollment_id;
end;
$$;
