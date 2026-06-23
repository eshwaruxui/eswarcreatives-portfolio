-- Phase 5 / 0042 — client_notifications
-- Backing store for the client nav red-dot badges. type is one of
-- 'proposal_sent' | 'invoice_due' | 'mockup_ready' | 'project_updated';
-- reference_id points at the source row. is_read flips when the client opens
-- the relevant section. Read-only to the client; admin (and triggers) write.
create table if not exists public.client_notifications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete cascade,
  type text not null,
  reference_id uuid,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.client_notifications enable row level security;

drop policy if exists "Client sees own notifications" on public.client_notifications;
create policy "Client sees own notifications" on public.client_notifications
  for select using (
    client_id in (select id from public.clients where profile_id = auth.uid())
  );

drop policy if exists "Admin manages notifications" on public.client_notifications;
create policy "Admin manages notifications" on public.client_notifications
  for all using (public.is_admin());

create index if not exists idx_client_notifications_client_id on public.client_notifications(client_id);
