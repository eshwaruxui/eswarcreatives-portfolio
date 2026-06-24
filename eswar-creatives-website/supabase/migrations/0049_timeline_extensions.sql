-- Phase 5 / 0049 — timeline_extensions
-- Admin-initiated proposals to extend an active project's timeline. The client
-- sees a priority banner on their dashboard and approves or denies. On approval
-- the UI copies new_timeline onto projects.timeline (added in an earlier phase).
-- Admin manages all rows; the linked client may read and respond (update) to the
-- extensions on their own projects only.
create table if not exists public.timeline_extensions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  proposal_id uuid references public.proposals(id),
  new_timeline text not null,
  reason text,
  status text default 'pending' check (status in ('pending','approved','denied')),
  sent_at timestamptz default now(),
  responded_at timestamptz,
  created_by uuid references public.profiles(id)
);

alter table public.timeline_extensions enable row level security;

drop policy if exists "Admin manages extensions" on public.timeline_extensions;
create policy "Admin manages extensions" on public.timeline_extensions
  for all using (public.is_admin());

drop policy if exists "Client sees own extensions" on public.timeline_extensions;
create policy "Client sees own extensions" on public.timeline_extensions
  for select using (
    project_id in (
      select id from public.projects where client_id in (
        select id from public.clients where profile_id = auth.uid()
      )
    )
  );

drop policy if exists "Client responds to extension" on public.timeline_extensions;
create policy "Client responds to extension" on public.timeline_extensions
  for update using (
    project_id in (
      select id from public.projects where client_id in (
        select id from public.clients where profile_id = auth.uid()
      )
    )
  );

create index if not exists idx_timeline_extensions_project_id on public.timeline_extensions(project_id);
