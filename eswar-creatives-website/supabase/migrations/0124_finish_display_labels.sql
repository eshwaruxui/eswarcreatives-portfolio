-- Build 4 phase 5, item 15: relabel the five finish levels to the ratio
-- style Eswar confirmed 9 Sept. DISPLAY LABELS ONLY: the keys, sort order
-- and every ratio in quotation_curve_steps (Curve A/B, locked 8 Sept) are
-- untouched. All surfaces read labels live from this table, so this single
-- update relabels every touch point, printed document included.
--
-- Keys are the OPAQUE ones from 0113 (which renamed 0112's seed keys so
-- internal codes never reach a client surface) - the first cut of this file
-- used 0112's stale keys and matched zero rows; caught by the post-apply
-- verify on 9 Sept before anything shipped wrong.
update public.quotation_finish_levels set label = '100% Fresh'      where key = 'full_fresh';
update public.quotation_finish_levels set label = '60:40 Fresh'     where key = 'fresh_led';
update public.quotation_finish_levels set label = '50:50 Fresh'     where key = 'balanced';
update public.quotation_finish_levels set label = '30:70 Fresh'     where key = 'fresh_accents';
update public.quotation_finish_levels set label = '100% Ready-made' where key = 'ready_made';
