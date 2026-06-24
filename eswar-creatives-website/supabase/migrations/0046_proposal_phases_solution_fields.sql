-- Phase 5 / 0046 — proposal_phases solution-level fields
-- key_note is the per-solution note shown at the bottom of each solution group
-- in the proposal modal (e.g. "Client must be present at concept presentation").
-- timeline already exists from 0025; the add is a no-op guard so this file is a
-- complete description of the phase-level text fields. phase_total is computed in
-- the UI from line item amounts, never stored.
alter table public.proposal_phases
  add column if not exists timeline text,
  add column if not exists key_note text;
