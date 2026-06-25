-- 0061 — admin_delete_proposal(): atomic hard-delete of a proposal and every
-- record that hangs off it (phases, solution line items, payment schedule,
-- documents) plus any invoices that were raised from it.
--
-- Invoked only by the admin-delete-proposal edge function (service role) after
-- it has verified the caller is an owner/admin and the user has confirmed the
-- deletion in the admin proposals view. Locked to service_role, so it is never
-- reachable by a logged-in client/admin through PostgREST.
--
-- All work runs in one transaction (a single plpgsql call), so a failure on any
-- step rolls the whole thing back: there is never a partial delete.
--
-- FK-safe order (children before parents):
--   * proposal_line_items -> proposal_phases (CASCADE): they carry no
--       proposal_id of their own, so they are cleared through the proposal's
--       phases.
--   * proposal_payment_schedule -> proposals (CASCADE): scoped by proposal_id.
--   * proposal_phases          -> proposals (CASCADE).
--   * proposal_documents       -> proposals (CASCADE).
--   * invoices.proposal_id     -> proposals (NO ACTION): would otherwise block
--       the proposal delete, so invoices raised from it are cleared first.
-- The explicit child deletes below are belt-and-braces: most cascade from the
-- proposal anyway, but deleting them in order keeps the function correct even
-- if a cascade rule later changes, and the invoice tally is captured up front
-- so the edge function can report it.
--
-- Returns a json summary the edge function relays back to the browser:
--   { deleted_proposal_title, deleted_invoices, had_paid_invoices }

create or replace function public.admin_delete_proposal(p_proposal_id uuid)
returns json
language plpgsql
as $$
declare
  v_title         text;
  v_invoice_count integer;
  v_had_paid      boolean;
begin
  -- Capture the title up front; a null means the proposal does not exist.
  select title into v_title from public.proposals where id = p_proposal_id;
  if v_title is null then
    raise exception 'proposal_not_found' using errcode = 'no_data_found';
  end if;

  -- Tally the invoices raised from this proposal for the response/toast.
  select count(*), coalesce(bool_or(status = 'paid'), false)
    into v_invoice_count, v_had_paid
    from public.invoices
   where proposal_id = p_proposal_id;

  -- 1. Line items (keyed by phase_id, not proposal_id).
  delete from public.proposal_line_items
   where phase_id in (
     select id from public.proposal_phases where proposal_id = p_proposal_id
   );

  -- 2. Per-phase payment schedule.
  delete from public.proposal_payment_schedule where proposal_id = p_proposal_id;

  -- 3. Phases.
  delete from public.proposal_phases where proposal_id = p_proposal_id;

  -- 4. Attached documents.
  delete from public.proposal_documents where proposal_id = p_proposal_id;

  -- 5. Invoices (NO ACTION FK) — must precede the proposal delete.
  delete from public.invoices where proposal_id = p_proposal_id;

  -- 6. The proposal row itself.
  delete from public.proposals where id = p_proposal_id;

  return json_build_object(
    'deleted_proposal_title', v_title,
    'deleted_invoices',       v_invoice_count,
    'had_paid_invoices',      v_had_paid
  );
end;
$$;

-- Lock the function down: only the service_role (the edge function) may run it.
revoke all on function public.admin_delete_proposal(uuid) from public;
revoke all on function public.admin_delete_proposal(uuid) from authenticated;
grant execute on function public.admin_delete_proposal(uuid) to service_role;
