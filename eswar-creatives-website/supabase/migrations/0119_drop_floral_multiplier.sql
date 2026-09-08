-- 0119_drop_floral_multiplier.sql
-- Quotation Module build 2, final cleanup: the single global multiplier is
-- fully replaced by the curve model (0115/0116), and nothing in the build-2
-- frontend selects this column any more.
--
-- ⚠ APPLY ONLY AFTER THE BUILD-2 FRONTEND IS DEPLOYED. The pre-build-2
-- builder still selects floral_multiplier in its vocabulary load; dropping
-- the column while that build is live breaks the finish selector. Once the
-- build-2 deploy is confirmed, this is safe and final.

alter table public.quotation_finish_levels
  drop column if exists floral_multiplier;

notify pgrst, 'reload schema';
