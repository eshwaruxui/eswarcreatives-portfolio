-- Phase 3 / 0031 — mockup_feedback (Mockups module)
-- Client responses on a published set: per-image comments plus a concept-level
-- approval or rejection. A client may insert and read only their own rows;
-- admins read everything.

create table if not exists mockup_feedback (
  id            uuid primary key default gen_random_uuid(),
  set_id        uuid references mockup_sets(id) on delete cascade,
  item_id       uuid references mockup_items(id) on delete cascade,
  submitted_by  uuid references auth.users(id),
  feedback_type text check (feedback_type in ('concept_approval','concept_rejection','item_comment')),
  comment       text,
  created_at    timestamptz default now()
);

alter table mockup_feedback enable row level security;

drop policy if exists "Admin full access" on mockup_feedback;
create policy "Admin full access" on mockup_feedback
  for all to authenticated
  using (public.is_admin());

drop policy if exists "Client insert own" on mockup_feedback;
create policy "Client insert own" on mockup_feedback
  for insert to authenticated
  with check (submitted_by = auth.uid());

drop policy if exists "Client read own" on mockup_feedback;
create policy "Client read own" on mockup_feedback
  for select to authenticated
  using (submitted_by = auth.uid());
