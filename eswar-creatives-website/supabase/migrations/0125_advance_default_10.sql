-- Build 4 phase 6, item 11: the confirmed advance rule (Build2 sanity
-- findings 3a). New quotations default to 10% advance / 90% balance; the
-- balance due date (event Day 1 minus 10 days) is computed in the app,
-- never stored, so it re-derives whenever Day 1 changes. Existing
-- quotations keep their stored advance_pct untouched.
alter table public.quotations alter column advance_pct set default 10;
