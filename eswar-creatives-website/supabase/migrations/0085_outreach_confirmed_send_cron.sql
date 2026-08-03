-- Schedules the cron job that sends outreach touches an admin approved early
-- from "Review in Advance". confirm-scheduled-touch only stamps the approval
-- and holds scheduled_for to 9:30 AM ET on the next business day; this job is
-- what actually calls send-confirmed-outreach-touches once that time arrives.
--
-- Not included here (must be set up once, manually, in the dashboard/SQL
-- editor — not committed, since they're secrets):
--   1. Edge Function secret CRON_SECRET (Dashboard -> Edge Functions -> Secrets)
--   2. A Vault secret named 'CRON_SECRET' holding the same value:
--        select vault.create_secret('<value>', 'CRON_SECRET');
-- Both must hold the exact same string, or the function rejects every call
-- with 401.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'send-confirmed-outreach-touches',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://urrinqwcrpivmvenupiu.supabase.co/functions/v1/send-confirmed-outreach-touches',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'CRON_SECRET' limit 1)
    ),
    body := '{}'::jsonb
  );
  $$
);
