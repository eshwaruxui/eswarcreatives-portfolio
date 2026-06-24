-- Phase 5 / 0045 — proposal_payment_schedule.phase_id
-- Phase 5 moves the instalment plan from one flat schedule per proposal to one
-- schedule per phase. phase_id scopes each instalment row to a proposal_phases
-- row; on delete cascade so removing a phase clears its instalments. Rows with a
-- null phase_id are legacy flat schedules and remain valid.
alter table public.proposal_payment_schedule
  add column if not exists phase_id uuid references public.proposal_phases(id) on delete cascade;

create index if not exists idx_pps_phase_id on public.proposal_payment_schedule(phase_id);
