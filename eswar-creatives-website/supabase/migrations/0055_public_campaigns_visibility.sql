-- Phase 5 / 0055 — public_campaigns visibility
-- The logo-voting (public_campaigns) system gained a visibility flag so a
-- campaign can be 'private' (kept off shared surfaces) even while link-voting
-- stays open. The unified admin Campaigns page reads this column to render the
-- visibility badge for logo-voting rows, mirroring review_campaigns (0048).
-- Default 'public' preserves the prior behaviour, where every public_campaigns
-- record was implicitly public. Guarded so the file is re-runnable.
alter table public.public_campaigns
  add column if not exists visibility text default 'public'
    check (visibility in ('public','private'));
