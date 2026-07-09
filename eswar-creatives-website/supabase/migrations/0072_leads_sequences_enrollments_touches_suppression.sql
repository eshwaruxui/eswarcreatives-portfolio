-- Migration 0072: Sales Cadence module
-- Tables: leads, sequences, sequence_steps, lead_enrollments, outreach_touches, suppression_list
-- RPCs: enroll_lead, mark_lead_replied, pause_enrollment, resume_enrollment, unsubscribe_by_token
-- All tables admin-only RLS via is_admin() SECURITY DEFINER.

-- ── leads ────────────────────────────────────────────────────────────────────
create table leads (
  id                  uuid primary key default gen_random_uuid(),
  first_name          text not null,
  last_name           text,
  email               text,
  linkedin_url        text,
  company             text not null,
  role_title          text,
  website             text,
  segment             text not null check (segment in ('security_ai', 'saas_product')),
  source              text not null default 'manual' check (source in ('manual', 'csv', 'apollo', 'linkedin', 'referral')),
  country             text,
  specific_observation text,
  status              text not null default 'new' check (status in ('new', 'active', 'replied', 'meeting_booked', 'converted', 'not_interested', 'unsubscribed', 'bounced', 'archived')),
  linkedin_status     text not null default 'none' check (linkedin_status in ('none', 'request_sent', 'connected', 'ignored')),
  converted_client_id uuid references clients(id) on delete set null,
  unsubscribe_token   uuid unique not null default gen_random_uuid(),
  notes               text,
  created_at          timestamptz not null default now(),
  created_by          uuid references profiles(id)
);

-- Partial unique index: email uniqueness is case-insensitive, only when email is not null
create unique index leads_email_unique on leads (lower(email)) where email is not null;

-- ── sequences ────────────────────────────────────────────────────────────────
create table sequences (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  segment    text check (segment in ('security_ai', 'saas_product')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── sequence_steps ───────────────────────────────────────────────────────────
create table sequence_steps (
  id                  uuid primary key default gen_random_uuid(),
  sequence_id         uuid not null references sequences(id) on delete cascade,
  step_number         int not null,
  channel             text not null check (channel in ('email', 'linkedin_connect', 'linkedin_dm')),
  day_offset          int not null,
  subject_template    text,
  body_template       text not null,
  requires_connected  boolean not null default false,
  stop_on_reply       boolean not null default true,
  unique (sequence_id, step_number)
);

-- ── lead_enrollments ─────────────────────────────────────────────────────────
create table lead_enrollments (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references leads(id) on delete cascade,
  sequence_id  uuid references sequences(id),
  status       text not null default 'active' check (status in ('active', 'paused', 'completed', 'stopped')),
  started_at   date not null,
  paused_at    timestamptz,
  completed_at timestamptz
);

-- Partial unique: one active enrollment per lead+sequence pair
create unique index lead_enrollments_active_unique
  on lead_enrollments (lead_id, sequence_id)
  where status = 'active';

-- ── outreach_touches ─────────────────────────────────────────────────────────
create table outreach_touches (
  id                uuid primary key default gen_random_uuid(),
  lead_id           uuid not null references leads(id) on delete cascade,
  enrollment_id     uuid not null references lead_enrollments(id) on delete cascade,
  step_id           uuid references sequence_steps(id),
  channel           text not null,
  status            text not null default 'scheduled' check (status in ('scheduled', 'sent', 'skipped', 'cancelled', 'failed')),
  scheduled_for     date not null,
  sent_at           timestamptz,
  skipped_reason    text,
  subject_snapshot  text,
  body_snapshot     text,
  resend_message_id text,
  opened_at         timestamptz,
  bounced_at        timestamptz,
  created_at        timestamptz not null default now(),
  created_by        uuid references profiles(id)
);

-- ── suppression_list ─────────────────────────────────────────────────────────
create table suppression_list (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  reason     text check (reason in ('unsubscribed', 'hard_bounce', 'manual')),
  created_at timestamptz not null default now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table leads enable row level security;
alter table sequences enable row level security;
alter table sequence_steps enable row level security;
alter table lead_enrollments enable row level security;
alter table outreach_touches enable row level security;
alter table suppression_list enable row level security;

create policy "leads_admin_all" on leads
  for all using (is_admin()) with check (is_admin());

create policy "sequences_admin_all" on sequences
  for all using (is_admin()) with check (is_admin());

create policy "sequence_steps_admin_all" on sequence_steps
  for all using (is_admin()) with check (is_admin());

create policy "lead_enrollments_admin_all" on lead_enrollments
  for all using (is_admin()) with check (is_admin());

create policy "outreach_touches_admin_all" on outreach_touches
  for all using (is_admin()) with check (is_admin());

create policy "suppression_list_admin_all" on suppression_list
  for all using (is_admin()) with check (is_admin());

-- ── Helper: weekend rollover ──────────────────────────────────────────────────
-- Returns the input date shifted forward to Monday if it falls on Sat (6) or Sun (0).
create or replace function next_business_day(d date)
returns date
language sql
immutable
as $$
  select case extract(dow from d)::int
    when 6 then d + 2  -- Saturday -> Monday
    when 0 then d + 1  -- Sunday   -> Monday
    else d
  end;
$$;

-- ── RPC: enroll_lead ─────────────────────────────────────────────────────────
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
  -- Guard: caller must be admin
  if not is_admin() then
    raise exception 'not_admin';
  end if;

  -- Load lead
  select * into v_lead from leads where id = p_lead_id;
  if not found then
    raise exception 'lead_not_found';
  end if;

  -- Check if this sequence has any email steps
  select exists(
    select 1 from sequence_steps
    where sequence_id = p_sequence_id and channel = 'email'
  ) into v_has_email_step;

  -- Email steps require specific_observation
  if v_has_email_step and (v_lead.specific_observation is null or trim(v_lead.specific_observation) = '') then
    raise exception 'missing_observation';
  end if;

  -- Check no active enrollment exists for this lead+sequence pair
  if exists(
    select 1 from lead_enrollments
    where lead_id = p_lead_id and sequence_id = p_sequence_id and status = 'active'
  ) then
    raise exception 'already_enrolled';
  end if;

  -- Create enrollment
  insert into lead_enrollments (lead_id, sequence_id, started_at)
  values (p_lead_id, p_sequence_id, p_start_date)
  returning id into v_enrollment_id;

  -- Generate one touch per step with weekend rollover
  insert into outreach_touches (lead_id, enrollment_id, step_id, channel, scheduled_for)
  select
    p_lead_id,
    v_enrollment_id,
    ss.id,
    ss.channel,
    next_business_day(p_start_date + ss.day_offset)
  from sequence_steps ss
  where ss.sequence_id = p_sequence_id
  order by ss.step_number;

  -- Set lead status to 'active' if currently 'new'
  update leads
  set status = 'active'
  where id = p_lead_id and status = 'new';

  return v_enrollment_id;
end;
$$;

-- ── RPC: mark_lead_replied ────────────────────────────────────────────────────
create or replace function mark_lead_replied(p_lead_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;

  update leads set status = 'replied' where id = p_lead_id;

  update lead_enrollments
  set status = 'stopped', completed_at = now()
  where lead_id = p_lead_id and status = 'active';

  update outreach_touches ot
  set status = 'cancelled', skipped_reason = 'lead_replied'
  from sequence_steps ss
  where ot.step_id = ss.id
    and ot.lead_id = p_lead_id
    and ot.status = 'scheduled'
    and ss.stop_on_reply = true;
end;
$$;

-- ── RPC: pause_enrollment ─────────────────────────────────────────────────────
create or replace function pause_enrollment(p_enrollment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;

  update lead_enrollments
  set status = 'paused', paused_at = now()
  where id = p_enrollment_id and status = 'active';
end;
$$;

-- ── RPC: resume_enrollment ────────────────────────────────────────────────────
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
  set scheduled_for = next_business_day(scheduled_for + v_days_paused)
  where enrollment_id = p_enrollment_id and status = 'scheduled';

  update lead_enrollments
  set status = 'active', paused_at = null
  where id = p_enrollment_id;
end;
$$;

-- ── RPC: unsubscribe_by_token (callable by anon) ─────────────────────────────
create or replace function unsubscribe_by_token(p_token uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead leads%rowtype;
begin
  select * into v_lead from leads where unsubscribe_token = p_token;

  -- Idempotent: not found is not an error (never reveals token validity)
  if not found then
    return true;
  end if;

  update leads set status = 'unsubscribed' where id = v_lead.id;

  -- Add to suppression list
  insert into suppression_list (email, reason)
  values (lower(v_lead.email), 'unsubscribed')
  on conflict (email) do nothing;

  -- Cancel all scheduled email touches for this lead
  update outreach_touches
  set status = 'cancelled', skipped_reason = 'unsubscribed'
  where lead_id = v_lead.id
    and status = 'scheduled'
    and channel = 'email';

  return true;
end;
$$;

-- Grant anon access to unsubscribe_by_token only
grant execute on function unsubscribe_by_token(uuid) to anon;
