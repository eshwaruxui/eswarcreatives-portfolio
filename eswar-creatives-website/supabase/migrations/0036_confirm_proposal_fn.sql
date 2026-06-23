-- Phase 5 / 0036 — confirm_proposal()
-- Atomic accept flow behind the confirm-proposal edge function. Runs as a single
-- transaction (a function body is one transaction) so the proposal update, the
-- new project, and the deposit invoice all commit together or not at all.
--
-- SECURITY DEFINER: clients hold only SELECT on proposals (see 0007-era
-- client_read_own_proposals), so the writes here run as the function owner and
-- bypass RLS. Authorisation is enforced explicitly: the caller (auth.uid()) must
-- own the proposal's client row, or be an admin. Errors are raised with stable,
-- machine-readable messages the edge function maps to plain-language copy.
--
-- Schema realities handled here (vs. the original spec):
--   * invoice_status has no 'unpaid' label -> the outstanding status is 'pending'
--     (matches the admin New Invoice modal).
--   * invoices.invoice_number is NOT NULL UNIQUE -> generated as EC-I-YYYY-NNN.
--   * projects.title is NOT NULL -> derived from the proposal title.
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
  v_inv_number text;
  v_year       text := to_char(now(), 'YYYY');
  v_seq        int;
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

  -- Next invoice number in the EC-I-YYYY-NNN sequence (matches admin convention).
  select coalesce(max(
           nullif(regexp_replace(invoice_number, '^EC-I-' || v_year || '-', ''), invoice_number)::int
         ), 0) + 1
    into v_seq
    from public.invoices
   where invoice_number like 'EC-I-' || v_year || '-%';
  v_inv_number := 'EC-I-' || v_year || '-' || lpad(v_seq::text, 3, '0');

  insert into public.projects (client_id, title, status, current_phase, phase_number)
  values (v_proposal.client_id, v_proposal.title, 'active', 'Discovery', 1)
  returning id into v_project_id;

  insert into public.invoices (
    invoice_number, project_id, proposal_id, client_id,
    client_name, company_name, label, amount, currency,
    status, pct_of_total, due_date, created_by
  )
  values (
    v_inv_number, v_project_id, v_proposal.id, v_proposal.client_id,
    v_proposal.client_name, v_proposal.company_name, '50% deposit',
    round(coalesce(v_proposal.total_amount, 0) * 0.5, 2), v_proposal.currency,
    'pending', 50, (current_date + 7), v_actor
  )
  returning id into v_invoice_id;

  update public.proposals
     set status = 'accepted', accepted_at = now(), responded_at = now()
   where id = v_proposal.id;

  return jsonb_build_object('project_id', v_project_id, 'invoice_id', v_invoice_id);
end;
$$;

-- Authenticated-only: the accept flow always runs for a signed-in client.
-- Revoke the default PUBLIC grant so anon cannot reach it via /rest/v1/rpc.
revoke execute on function public.confirm_proposal(uuid) from public;
revoke execute on function public.confirm_proposal(uuid) from anon;
grant  execute on function public.confirm_proposal(uuid) to authenticated;
