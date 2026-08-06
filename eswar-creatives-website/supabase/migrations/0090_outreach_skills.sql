-- Migration 0090: Outreach Skills (uploaded style/voice guides applied to
-- AI-generated outreach messages) + a lightweight learning-feedback log.
--
-- outreach_skills stores the parsed content of each uploaded .skill bundle
-- (a zip containing SKILL.md + optional references/*.md, the same format
-- Claude Code's own Skill system uses) so the generation edge function can
-- read plain text without re-unzipping on every call. The original zip is
-- kept in storage for reference/download; content is what's actually fed
-- into the Claude prompt.
--
-- outreach_message_feedback is the "learning loop": every time a user edits
-- an AI-generated draft before saving it, both versions are logged here.
-- generate-outreach-message reads a rolling sample of recent rows back in as
-- few-shot examples, so the model sees concrete before/after corrections
-- instead of just the static skill text. This is in-context adaptation, not
-- fine-tuning — there is no model training step, just prompt context that
-- improves as more edits accumulate.

create table outreach_skills (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  content      text not null,
  storage_path text not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  created_by   uuid references profiles(id)
);

alter table outreach_skills enable row level security;
create policy "admin_all_outreach_skills" on outreach_skills
  for all
  using (is_admin())
  with check (is_admin());

create table outreach_message_feedback (
  id             uuid primary key default gen_random_uuid(),
  lead_id        uuid references leads(id) on delete cascade,
  skill_ids      uuid[],
  generated_text text not null,
  edited_text    text not null,
  created_at     timestamptz not null default now()
);

alter table outreach_message_feedback enable row level security;
create policy "admin_all_outreach_message_feedback" on outreach_message_feedback
  for all
  using (is_admin())
  with check (is_admin());

create index outreach_message_feedback_created_at_idx on outreach_message_feedback (created_at desc);

-- ── outreach-skills storage bucket (private) ────────────────────────────────
-- .skill files are zip archives; browsers report inconsistent MIME types for
-- them (often application/octet-stream, sometimes application/zip), so the
-- allow-list covers the common variants rather than trusting one.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'outreach-skills',
  'outreach-skills',
  false,
  2097152, -- 2MB — skill bundles are SKILL.md + a few reference docs, not large
  array['application/zip', 'application/x-zip-compressed', 'application/octet-stream']
)
on conflict (id) do nothing;

drop policy if exists "admin_all_outreach_skills_storage" on storage.objects;
create policy "admin_all_outreach_skills_storage" on storage.objects
  for all
  using      (bucket_id = 'outreach-skills' and public.is_admin())
  with check (bucket_id = 'outreach-skills' and public.is_admin());
