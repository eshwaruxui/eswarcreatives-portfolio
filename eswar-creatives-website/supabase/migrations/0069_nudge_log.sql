-- 0069_nudge_log.sql
-- Records every payment reminder (nudge) sent to a client per invoice,
-- supporting both WhatsApp and email channels.

----------------------------------------------------------------------
-- 1. Create the nudge_log table.
----------------------------------------------------------------------
create table if not exists public.nudge_log (
  id              uuid        primary key default gen_random_uuid(),
  invoice_id      uuid        not null references public.invoices(id) on delete cascade,
  sent_at         timestamptz not null default now(),
  channel         text        not null check (channel in ('whatsapp', 'email')),
  message_preview text,
  sent_by         uuid        references public.profiles(id)
);

alter table public.nudge_log enable row level security;

----------------------------------------------------------------------
-- 2. RLS: admins have full access via is_admin() SECURITY DEFINER.
--    No client or anon access (nudge history is internal only).
----------------------------------------------------------------------
create policy "admin_all_nudge_log" on public.nudge_log
  for all
  using      (public.is_admin())
  with check (public.is_admin());
