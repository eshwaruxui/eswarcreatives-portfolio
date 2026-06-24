-- Phase 5 / 0048 — review_campaigns visibility + status guard
-- visibility splits campaigns into 'private' (linked client only) and 'public'
-- (anyone with the link, no auth needed to vote). status formalises the
-- draft -> active -> closed lifecycle. The status column predates this migration
-- as plain text with no check, so the constraint is added separately and guarded
-- (the table is empty, so constraining existing data is safe).
alter table public.review_campaigns
  add column if not exists visibility text default 'private'
    check (visibility in ('public','private'));

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'review_campaigns_status_check'
  ) then
    alter table public.review_campaigns
      add constraint review_campaigns_status_check
      check (status in ('draft','active','closed'));
  end if;
end $$;
