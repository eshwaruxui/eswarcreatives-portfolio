-- Phase 5 / 0051 — per-solution timeline and key note on line items
-- 5c/5d add a Timeline and a Key note to each solution group in the proposal
-- builder. Solutions are not their own table: they are groupings of
-- proposal_line_items that share solution_title/solution_overview. So the
-- solution-level timeline and key note live here, repeated across the items in a
-- group, exactly like solution_title/solution_overview already are.
alter table public.proposal_line_items
  add column if not exists solution_timeline text,
  add column if not exists solution_key_note text;
