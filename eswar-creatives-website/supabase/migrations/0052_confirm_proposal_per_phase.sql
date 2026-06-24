-- Phase 5 / 0052 — confirm_proposal() issues one advance invoice per phase (5f)
-- Supersedes 0043's single-advance behaviour. On acceptance we loop the
-- proposal's phases, read each phase's acceptance-triggered instalment from
-- proposal_payment_schedule (scoped by phase_id) and bill that pct of the phase
-- subtotal, falling back to 35% when a phase has no schedule. A proposal with no
-- billable phases still gets a single 35%-of-total advance so acceptance always
-- produces an invoice. The invoice label uses a hyphen, not an em dash, per the
-- house copy rule. CREATE OR REPLACE preserves the 0036/0043 grants
-- (authenticated-only; anon/public already revoked).
create or replace function public.confirm_proposal(p_proposal_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor          uuid := auth.uid();
  v_proposal       public.proposals%rowtype;
  v_owns           boolean;
  v_project_id     uuid;
  v_invoice_id     uuid;
  v_first_invoice  uuid;
  v_invoice_count  int := 0;
  v_phase          record;
  v_phase_subtotal numeric;
  v_pct            numeric;
  v_label          text;
begin
  if v_actor is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_proposal from public.proposals where id = p_proposal_id;
  if not found then
    raise exception 'PROPOSAL_NOT_FOUND';
  end if;

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

  insert into public.projects (client_id, title, status, current_phase, phase_number)
  values (v_proposal.client_id, v_proposal.title, 'active', 'Discovery', 1)
  returning id into v_project_id;

  for v_phase in
    select id, name from public.proposal_phases
    where proposal_id = v_proposal.id
    order by sort_order, phase_number
  loop
    select coalesce(sum(amount), 0) into v_phase_subtotal
      from public.proposal_line_items where phase_id = v_phase.id;
    if v_phase_subtotal <= 0 then
      continue;
    end if;

    select pct_of_total, label into v_pct, v_label
      from public.proposal_payment_schedule
     where proposal_id = v_proposal.id
       and phase_id = v_phase.id
       and triggered_by = 'acceptance'
     order by instalment_number
     limit 1;

    if v_pct is null then
      v_pct := 35;
      v_label := 'Advance';
    end if;

    insert into public.invoices (
      project_id, proposal_id, client_id,
      client_name, company_name, label, amount, currency,
      status, pct_of_total, due_date, created_by
    )
    values (
      v_project_id, v_proposal.id, v_proposal.client_id,
      v_proposal.client_name, v_proposal.company_name,
      v_phase.name || ' - ' || coalesce(v_label, 'Advance'),
      round(v_phase_subtotal * (v_pct / 100.0), 2), v_proposal.currency,
      'pending', v_pct, (current_date + 7), v_actor
    )
    returning id into v_invoice_id;

    v_invoice_count := v_invoice_count + 1;
    if v_first_invoice is null then
      v_first_invoice := v_invoice_id;
    end if;
  end loop;

  if v_invoice_count = 0 then
    insert into public.invoices (
      project_id, proposal_id, client_id,
      client_name, company_name, label, amount, currency,
      status, pct_of_total, due_date, created_by
    )
    values (
      v_project_id, v_proposal.id, v_proposal.client_id,
      v_proposal.client_name, v_proposal.company_name,
      'Advance',
      round(coalesce(v_proposal.total_amount, 0) * 0.35, 2), v_proposal.currency,
      'pending', 35, (current_date + 7), v_actor
    )
    returning id into v_first_invoice;
    v_invoice_count := 1;
  end if;

  update public.proposals
     set status = 'accepted', accepted_at = now(), responded_at = now()
   where id = v_proposal.id;

  return jsonb_build_object(
    'project_id', v_project_id,
    'invoice_id', v_first_invoice,
    'invoice_count', v_invoice_count
  );
end;
$$;
