-- Phase 5 / 0041 — proposal_line_items: solution grouping fields
-- A phase now contains one or more "solution" groups, each with its own title
-- and overview, and each group owns one or more line items. Rather than add a
-- separate solutions table, the group identity lives on the line item: items
-- sharing the same solution_title within a phase render as one solution group.
-- phase_total is intentionally NOT a generated column — it is summed in the app
-- layer from each phase's line item amounts.
alter table public.proposal_line_items
  add column if not exists solution_title text,
  add column if not exists solution_overview text;
