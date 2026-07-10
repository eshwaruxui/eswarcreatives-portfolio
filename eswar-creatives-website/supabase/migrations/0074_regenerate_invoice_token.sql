-- 0074_regenerate_invoice_token.sql
-- 1. Fix confirm_proposal() to set public_token_expires_at on every invoice it
--    creates (was NULL, causing all freshly-generated links to show "expired").
-- 2. Add regenerate_invoice_token(p_invoice_id uuid) admin-only RPC so the
--    drawer's "Copy link" and "Test payment flow" buttons can rotate the token
--    and get a guaranteed-fresh 30-day link on every click.

----------------------------------------------------------------------
-- 1. Patch confirm_proposal to populate public_token_expires_at.
--    CREATE OR REPLACE preserves existing grants (authenticated only).
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_proposal(p_proposal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT * INTO v_proposal FROM public.proposals WHERE id = p_proposal_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROPOSAL_NOT_FOUND';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.clients
    WHERE id = v_proposal.client_id AND profile_id = v_actor
  ) INTO v_owns;
  IF NOT (v_owns OR public.is_admin()) THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  IF v_proposal.status NOT IN ('sent', 'viewed') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  IF v_proposal.client_id IS NULL THEN
    RAISE EXCEPTION 'NO_CLIENT';
  END IF;

  INSERT INTO public.projects (client_id, title, status, current_phase, phase_number)
  VALUES (v_proposal.client_id, v_proposal.title, 'active', 'Discovery', 1)
  RETURNING id INTO v_project_id;

  FOR v_phase IN
    SELECT id, name FROM public.proposal_phases
    WHERE proposal_id = v_proposal.id
    ORDER BY sort_order, phase_number
  LOOP
    SELECT COALESCE(SUM(amount), 0) INTO v_phase_subtotal
      FROM public.proposal_line_items WHERE phase_id = v_phase.id;
    IF v_phase_subtotal <= 0 THEN
      CONTINUE;
    END IF;

    SELECT pct_of_total, label INTO v_pct, v_label
      FROM public.proposal_payment_schedule
     WHERE proposal_id = v_proposal.id
       AND phase_id = v_phase.id
       AND triggered_by = 'acceptance'
     ORDER BY instalment_number
     LIMIT 1;

    IF v_pct IS NULL THEN
      v_pct := 35;
      v_label := 'Advance';
    END IF;

    INSERT INTO public.invoices (
      project_id, proposal_id, client_id,
      client_name, company_name, label, amount, currency,
      status, pct_of_total, due_date, created_by,
      public_token_expires_at
    )
    VALUES (
      v_project_id, v_proposal.id, v_proposal.client_id,
      v_proposal.client_name, v_proposal.company_name,
      v_phase.name || ' - ' || COALESCE(v_label, 'Advance'),
      ROUND(v_phase_subtotal * (v_pct / 100.0), 2), v_proposal.currency,
      'pending', v_pct, (CURRENT_DATE + 7), v_actor,
      NOW() + INTERVAL '30 days'
    )
    RETURNING id INTO v_invoice_id;

    v_invoice_count := v_invoice_count + 1;
    IF v_first_invoice IS NULL THEN
      v_first_invoice := v_invoice_id;
    END IF;
  END LOOP;

  IF v_invoice_count = 0 THEN
    INSERT INTO public.invoices (
      project_id, proposal_id, client_id,
      client_name, company_name, label, amount, currency,
      status, pct_of_total, due_date, created_by,
      public_token_expires_at
    )
    VALUES (
      v_project_id, v_proposal.id, v_proposal.client_id,
      v_proposal.client_name, v_proposal.company_name,
      'Advance',
      ROUND(COALESCE(v_proposal.total_amount, 0) * 0.35, 2), v_proposal.currency,
      'pending', 35, (CURRENT_DATE + 7), v_actor,
      NOW() + INTERVAL '30 days'
    )
    RETURNING id INTO v_first_invoice;
    v_invoice_count := 1;
  END IF;

  UPDATE public.proposals
     SET status = 'accepted', accepted_at = NOW(), responded_at = NOW()
   WHERE id = v_proposal.id;

  RETURN jsonb_build_object(
    'project_id', v_project_id,
    'invoice_id', v_first_invoice,
    'invoice_count', v_invoice_count
  );
END;
$$;

----------------------------------------------------------------------
-- 2. Admin-only RPC: rotate public_token + expiry for a single invoice.
--    Returns the new token as text so the caller can build the URL
--    client-side without a second round-trip.
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.regenerate_invoice_token(p_invoice_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_token uuid := gen_random_uuid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  UPDATE public.invoices
     SET public_token             = v_new_token,
         public_token_expires_at  = NOW() + INTERVAL '30 days'
   WHERE id = p_invoice_id;

  RETURN v_new_token::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_invoice_token(uuid) TO authenticated;
