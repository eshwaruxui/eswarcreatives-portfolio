-- Phase 3 / 0018 — notify the studio on each sketch submission.
-- A database webhook: AFTER INSERT on logo_sketch_submissions posts the new
-- row to the notify-submission edge function, which looks up the client and
-- set names and emails the studio via Resend.
--
-- Prerequisite: set the function secrets before relying on this, e.g.
--   RESEND_API_KEY   (required)
--   WEBHOOK_SECRET   (optional; if set, also add the matching
--                     x-webhook-secret header to the headers below)

-- pg_net provides net.http_post for outbound HTTP from Postgres.
create extension if not exists pg_net;

----------------------------------------------------------------------
-- Trigger function. SECURITY DEFINER so the inserting client (who has no
-- rights on the net schema) can still fire the outbound call. The payload
-- mirrors the shape of a Supabase database webhook (type/table/record).
----------------------------------------------------------------------
create or replace function public.notify_submission()
returns trigger
language plpgsql
security definer
set search_path = public, net
as $$
begin
  perform net.http_post(
    url     := 'https://urrinqwcrpivmvenupiu.supabase.co/functions/v1/notify-submission',
    body    := jsonb_build_object(
                 'type', 'INSERT',
                 'table', tg_table_name,
                 'schema', tg_table_schema,
                 'record', to_jsonb(new),
                 'old_record', null
               ),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return new;
end;
$$;

drop trigger if exists notify_submission_on_insert on public.logo_sketch_submissions;
create trigger notify_submission_on_insert
  after insert on public.logo_sketch_submissions
  for each row
  execute function public.notify_submission();
