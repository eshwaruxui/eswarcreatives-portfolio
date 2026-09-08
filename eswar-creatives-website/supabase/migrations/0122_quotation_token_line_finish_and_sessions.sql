-- 0122_quotation_token_line_finish_and_sessions.sql
-- Build 2 fix pass, Fixes 2 + 3: the public document misstated the finish
-- and never showed days/sessions.
--
-- Fix 2. The document printed "Finish: Full fresh flowers" at scope level
-- while a line can carry its own finish — NES-2026-1014 showed full fresh
-- in the header against a Balanced blend stage garden at ₹364. Each item
-- now carries `finish_label` (the client-facing LABEL of its own finish,
-- only for curved lines; a null-curve line has no finish by design). The
-- component prints per-line finishes and shows the scope line only when
-- every curved line agrees with it.
--
-- Fix 3. The builder holds days and sessions but the document showed only
-- event type and venue. The payload gains `sessions`, ordered by day and
-- Morning before Evening (Fix 8); day_count already rides in the
-- quotation row.
--
-- Same hard rule as 0112/0113/0114: finish reaches the client as a LABEL
-- and nothing else — no key, no internal code, no ratio.

begin;

create or replace function public.get_quotation_by_token(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q public.quotations%rowtype;
begin
  select * into v_q
    from public.quotations
   where public_token = p_token
     and status <> 'draft'
     and (public_token_expires_at is null or public_token_expires_at > now());

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'quotation', to_jsonb(v_q)
      - 'reception_finish_key' - 'muhurtham_finish_key' - 'readymade_variant'
      - 'muhurtham_reuse',
    'reception_finish_label', (
      select label from public.quotation_finish_levels
       where key = v_q.reception_finish_key
    ),
    'muhurtham_finish_label', (
      select label from public.quotation_finish_levels
       where key = v_q.muhurtham_finish_key
    ),
    'muhurtham_reuse_label', case v_q.muhurtham_reuse
      when 'retain_with_additions' then 'Reception setup retained, with additions'
      when 'fully_changed'         then 'Setup fully changed for the muhurtham'
      else null
    end,
    'sessions', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object('day_number', ds.day_number, 'slot', ds.slot)
          order by ds.day_number, case ds.slot when 'morning' then 0 else 1 end
        ),
        '[]'::jsonb
      )
      from public.quotation_day_sessions ds
      where ds.quotation_id = v_q.id
    ),
    'items', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'function_key', qi.function_key,
            'zone_key',     qi.zone_key,
            'zone_label',   z.label,
            'zone_order',   coalesce(z.sort_order, 999),
            'system',       qi.system,
            'system_label', s.label,
            'label',        qi.label,
            'unit',         qi.unit,
            'qty',          qi.qty,
            'rate',         qi.rate,
            'amount',       qi.amount,
            'note',         qi.note,
            -- The line's own finish, as its client-facing label. Only for
            -- curved lines; a flat line (null curve) has no finish at all.
            'finish_label', case
              when qi.curve_key is not null then fl.label
              else null
            end
          )
          order by
            case qi.function_key when 'reception' then 0 else 1 end,
            coalesce(z.sort_order, 999),
            qi.sort_order
        ),
        '[]'::jsonb
      )
      from public.quotation_items qi
      left join public.quotation_zones         z  on z.key  = qi.zone_key
      left join public.quotation_systems       s  on s.key  = qi.system
      left join public.quotation_finish_levels fl on fl.key = qi.finish_level
      where qi.quotation_id = v_q.id
    )
  );
end;
$$;

grant execute on function public.get_quotation_by_token(uuid) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
