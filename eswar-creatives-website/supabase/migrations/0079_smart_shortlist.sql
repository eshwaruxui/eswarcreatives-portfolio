-- Migration 0079: Smart Shortlist module
-- Tables: icp_configs, shortlist_runs, shortlist_run_screenshots, shortlist_candidates
-- All four admin-only via is_admin() SECURITY DEFINER (same pattern as reply_messages, 0073).
--
-- Also adds leads.vertical (design_systems | branding) — a separate taxonomy
-- from the existing leads.segment (security_ai | saas_product, NOT NULL).
-- Smart Shortlist candidates set vertical on insert; segment defaults to
-- 'saas_product' for shortlist-sourced leads, same fallback CsvImportModal
-- already uses for unrecognized segments. The two taxonomies are kept
-- separate rather than merged into one CHECK constraint.
--
-- icp-attachments storage bucket is created here via SQL insert, not the
-- Supabase dashboard. The stage-attachments bucket was created manually
-- during the project-stage-module rollout, that step was skipped, and it
-- silently broke every upload until migration 0077 fixed it by creating the
-- bucket in SQL instead. Doing it here avoids repeating that failure.

-- ── icp_configs — one row per vertical, upserted ────────────────────────────
create table icp_configs (
  id                   uuid primary key default gen_random_uuid(),
  vertical             text not null check (vertical in ('design_systems', 'branding')),
  icp_text             text,
  goal_text            text,
  icp_attachment_url   text,
  goal_attachment_url  text,
  updated_at           timestamptz default now(),
  unique (vertical)
);

-- ── shortlist_runs ───────────────────────────────────────────────────────────
create table shortlist_runs (
  id               uuid primary key default gen_random_uuid(),
  vertical         text not null check (vertical in ('design_systems', 'branding')),
  volume_email     int not null default 5,
  volume_linkedin  int not null default 5,
  -- 'failed' added beyond the ticket's three statuses: process-shortlist-run
  -- sets it when the Anthropic response can't be parsed as JSON.
  status           text not null default 'processing' check (status in ('processing', 'complete', 'archived', 'failed')),
  created_at       timestamptz default now()
);

-- ── shortlist_run_screenshots ────────────────────────────────────────────────
create table shortlist_run_screenshots (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references shortlist_runs(id) on delete cascade,
  storage_path  text not null,
  created_at    timestamptz default now()
);

-- ── shortlist_candidates — extracted + scored per run ───────────────────────
create table shortlist_candidates (
  id                      uuid primary key default gen_random_uuid(),
  run_id                  uuid not null references shortlist_runs(id) on delete cascade,
  extracted_name          text,
  extracted_title         text,
  extracted_company       text,
  extracted_linkedin_url  text,
  channel                 text check (channel in ('email', 'linkedin')),
  icp_score               int check (icp_score between 0 and 100),
  confidence              text not null default 'high' check (confidence in ('high', 'low')),
  connection_status       text check (connection_status in ('connected', 'pending', 'not_connected', 'unknown')),
  icp_match_reason        text,
  channel_reason          text,
  decision                text not null default 'pending' check (decision in ('pending', 'added', 'ignored')),
  lead_id                 uuid references leads(id) on delete set null,
  created_at              timestamptz default now()
);

-- ── RLS: all four tables admin-only via is_admin() ──────────────────────────
alter table icp_configs enable row level security;
alter table shortlist_runs enable row level security;
alter table shortlist_run_screenshots enable row level security;
alter table shortlist_candidates enable row level security;

create policy "admin_all_icp_configs" on icp_configs
  for all using (is_admin()) with check (is_admin());

create policy "admin_all_shortlist_runs" on shortlist_runs
  for all using (is_admin()) with check (is_admin());

create policy "admin_all_run_screenshots" on shortlist_run_screenshots
  for all using (is_admin()) with check (is_admin());

create policy "admin_all_candidates" on shortlist_candidates
  for all using (is_admin()) with check (is_admin());

-- ── leads.vertical — separate taxonomy from leads.segment ───────────────────
alter table leads add column if not exists vertical text check (vertical in ('design_systems', 'branding'));

-- ── leads.source — add 'smart_shortlist', same pattern as 0072c's linkedin_visitor add ──
alter table leads drop constraint if exists leads_source_check;
alter table leads add constraint leads_source_check
  check (source in ('manual', 'csv', 'apollo', 'linkedin', 'referral', 'linkedin_visitor', 'smart_shortlist'));

-- ── icp-attachments storage bucket (private) ────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'icp-attachments',
  'icp-attachments',
  false,
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "admin_all_icp_attachments" on storage.objects;
create policy "admin_all_icp_attachments" on storage.objects
  for all
  using      (bucket_id = 'icp-attachments' and public.is_admin())
  with check (bucket_id = 'icp-attachments' and public.is_admin());

-- ── stage-attachments: add image/webp for shortlist run screenshots ────────
-- Section B reuses stage-attachments (per spec) for run screenshots and wants
-- jpeg/png/webp; the bucket's allow-list from migration 0077 only has jpeg/png.
update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'image/webp')
where id = 'stage-attachments'
  and not ('image/webp' = any(allowed_mime_types));
