-- 0118_quotation_housekeeping.sql
-- Quotation Module build 2 housekeeping.
--
-- 1. The three test quotations from Phase 1.5 QA are deleted (line items
--    and snapshots follow via ON DELETE CASCADE). NES-2026-1010 is real
--    and stays.
-- 2. quotations.created_by was always NULL: nothing set it. A column
--    default of auth.uid() wires it to the inserting session with no app
--    change and no trigger, and stays NULL for any non-auth context (e.g.
--    SQL editor), which is honest.

delete from public.quotations
 where quotation_number in ('NES-2026-1007', 'NES-2026-1008', 'NES-2026-1009');

alter table public.quotations
  alter column created_by set default auth.uid();
