-- 0120_replace_quotation_scope_rows.sql
-- Quotation Module build 2, review fix: the builder's save path replaced a
-- quotation's line items (and day sessions) with a client-side DELETE
-- followed by a client-side INSERT — two independent PostgREST requests.
-- Two failure shapes fall out of that: delete succeeds and insert fails
-- (network drop, RLS) leaving a quotation whose stored totals reference
-- zero stored lines, exactly what the public link renders; or two saves
-- interleave (autosave debounce racing an explicit save) and every row is
-- inserted twice. One transactional function closes both.
--
-- SECURITY INVOKER on purpose: the caller's RLS applies inside, so this
-- grants nothing the admin-only policies on quotation_items /
-- quotation_day_sessions don't already grant. No money is computed here —
-- rate and amount arrive precomputed from quotationMath.ts, the single
-- pricing implementation; this function is purely the atomic write.

create or replace function public.replace_quotation_scope_rows(
  p_quotation_id uuid,
  p_items jsonb,
  p_sessions jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.quotation_items where quotation_id = p_quotation_id;

  insert into public.quotation_items (
    quotation_id, function_key, zone_key, system, label, unit, qty,
    anchor_rate, curve_key, finish_level, commission_applied, commission_flat,
    rate, amount, note, gerbera_fill, source, sort_order
  )
  select
    p_quotation_id,
    i->>'function_key',
    i->>'zone_key',
    i->>'system',
    i->>'label',
    i->>'unit',
    coalesce((i->>'qty')::numeric, 1),
    (i->>'anchor_rate')::numeric,
    i->>'curve_key',
    i->>'finish_level',
    coalesce((i->>'commission_applied')::boolean, true),
    (i->>'commission_flat')::numeric,
    coalesce((i->>'rate')::numeric, 0),
    coalesce((i->>'amount')::numeric, 0),
    i->>'note',
    coalesce((i->>'gerbera_fill')::boolean, false),
    coalesce(i->>'source', 'manual'),
    coalesce((i->>'sort_order')::integer, 0)
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) as i;

  delete from public.quotation_day_sessions where quotation_id = p_quotation_id;

  insert into public.quotation_day_sessions (quotation_id, day_number, slot, sort_order)
  select
    p_quotation_id,
    (s->>'day_number')::integer,
    s->>'slot',
    coalesce((s->>'sort_order')::integer, 0)
  from jsonb_array_elements(coalesce(p_sessions, '[]'::jsonb)) as s;
end;
$$;

revoke execute on function public.replace_quotation_scope_rows(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.replace_quotation_scope_rows(uuid, jsonb, jsonb) to authenticated;

notify pgrst, 'reload schema';
