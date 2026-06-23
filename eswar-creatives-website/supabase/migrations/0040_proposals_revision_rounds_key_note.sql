-- Phase 5 / 0040 — proposals: revision_rounds + key_note
-- revision_rounds drives the "N revision rounds included" dropdown (default 2).
-- key_note is a single-line highlight shown under the phases in the proposal.
alter table public.proposals
  add column if not exists revision_rounds int default 2,
  add column if not exists key_note text;
