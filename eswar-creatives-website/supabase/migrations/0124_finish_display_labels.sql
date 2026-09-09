-- Build 4 phase 5, item 15: relabel the five finish levels to the ratio
-- style Eswar confirmed 9 Sept. DISPLAY LABELS ONLY: the keys, sort order
-- and every ratio in quotation_curve_steps (Curve A/B, locked 8 Sept per
-- Newgen_Rate_Card_Gap_Analysis.md) are untouched. Because the builder,
-- the settings summary, the pricing screen and the public document RPC all
-- read labels live from this table, this single update relabels every
-- touch point at once. Existing quotations' snapshots store keys and
-- ratios, never labels, so nothing re-prices.
update public.quotation_finish_levels set label = '100% Fresh'      where key = 'real_100';
update public.quotation_finish_levels set label = '60:40 Fresh'     where key = 'real_60_40';
update public.quotation_finish_levels set label = '50:50 Fresh'     where key = 'real_50_50';
update public.quotation_finish_levels set label = '30:70 Fresh'     where key = 'real_30_70';
update public.quotation_finish_levels set label = '100% Ready-made' where key = 'readymade';
