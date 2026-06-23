-- Phase 5 / 0043 — confirm_proposal() reads the payment schedule
-- Supersedes the hardcoded 50% deposit in 0036. On acceptance we look up the
-- 'acceptance'-triggered instalment from proposal_payment_schedule and bill that
-- pct_of_total, falling back to a 50% deposit when no schedule exists.
--
-- invoice_number is now omitted from the INSERT: the column default added in
-- 0038 (invoice_number_seq) assigns it, so numbering has a single source of
-- truth and the old in-function regexp/max+1 path is gone.
--
-- Privileges: CREATE OR REPLACE preserves the 0036 grants, so this stays
-- authenticated-only (anon/public were already revoked).
create or replace function public.confirm_proposal(p_proposal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor      uuid := auth.uid();
  v_proposal   public.proposals%rowtype;
  v_owns       boolean;
  v_project_id uuid;
  v_invoice_id uuid;
  v_pct        numeric;
  v_label      text;
begin
  if v_actor is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_proposal from public.proposals where id = p_proposal_id;
  if not found then
    raise exception 'PROPOSAL_NOT_FOUND';
  end if;

  -- Caller must own the proposal's client, or be staff/admin.
  select exists (
    select 1 from public.clients
    where id = v_proposal.client_id and profile_id = v_actor
  ) into v_owns;
  if not (v_owns or public.is_admin()) then
    raise exception 'NOT_AUTHORIZED';
  end if;

  if v_proposal.status not in ('sent', 'viewed') then
    raise exception 'INVALID_STATUS';
  end if;

  if v_proposal.client_id is null then
    raise exception 'NO_CLIENT';
  end if;

  -- Read the acceptance-triggered instalment; fall back to a 50% deposit.
  select pct_of_total, label
    into v_pct, v_label
    from public.proposal_payment_schedule
   where proposal_id = v_proposal.id
     and triggered_by = 'acceptance'
   order by instalment_number
   limit 1;

  if v_pct is null then
    v_pct := 50;
    v_label := '50% deposit';
  end if;

  insert into public.projects (client_id, title, status, current_phase, phase_number)
  values (v_proposal.client_id, v_proposal.title, 'active', 'Discovery', 1)
  returning id into v_project_id;

  -- invoice_number omitted: assigned by the invoice_number_seq default (0038).
  insert into public.invoices (
    project_id, proposal_id, client_id,
    client_name, company_name, label, amount, currency,
    status, pct_of_total, due_date, created_by
  )
  values (
    v_project_id, v_proposal.id, v_proposal.client_id,
    v_proposal.client_name, v_proposal.company_name,
    coalesce(v_label, 'Advance'),
    round(coalesce(v_proposal.total_amount, 0) * (v_pct / 100.0), 2), v_proposal.currency,
    'pending', v_pct, (current_date + 7), v_actor
  )
  returning id into v_invoice_id;

  update public.proposals
     set status = 'accepted', accepted_at = now(), responded_at = now()
   where id = v_proposal.id;

  return jsonb_build_object('project_id', v_project_id, 'invoice_id', v_invoice_id);
end;
$$;
