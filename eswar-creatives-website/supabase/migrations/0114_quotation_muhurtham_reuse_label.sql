----------------------------------------------------------------------
-- 0114 — The muhurtham reuse decision reaches the client document.
--
-- WHY
--
-- "Is the reception setup retained with additions, or fully changed?" is a
-- commitment the client is paying for, and on a two-function wedding it is
-- often the single most consequential line in the quotation: real flowers
-- for the morning, or the previous night's setup with additions. It was
-- captured on the enquiry step, stored on `quotations.muhurtham_reuse`, and
-- then appeared on nothing the client ever saw. If there is a dispute on
-- the day, the document did not support Newgen.
--
-- The stored value is a machine key ('retain_with_additions' /
-- 'fully_changed'). Client surfaces get a LABEL and never a key, the same
-- rule the finish ladder follows: get_quotation_by_token returns
-- `muhurtham_reuse_label` and strips the raw key from the payload, so the
-- public page has no access to the internal value at all.
--
-- Labels live in the RPC rather than a lookup table because there are
-- exactly two, they are fixed by a CHECK constraint on the column, and a
-- two-row table would be ceremony without a reader. If a third option is
-- ever added, that is the moment to promote this to a table.
----------------------------------------------------------------------

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
    -- muhurtham_reuse joins the finish keys on the strip list: the client
    -- receives its label below, never the stored key.
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
            'note',         qi.note
          )
          order by
            case qi.function_key when 'reception' then 0 else 1 end,
            coalesce(z.sort_order, 999),
            qi.sort_order
        ),
        '[]'::jsonb
      )
      from public.quotation_items qi
      left join public.quotation_zones   z on z.key = qi.zone_key
      left join public.quotation_systems s on s.key = qi.system
      where qi.quotation_id = v_q.id
    )
  );
end;
$$;

grant execute on function public.get_quotation_by_token(uuid) to anon, authenticated;

notify pgrst, 'reload schema';

commit;


----------------------------------------------------------------------
-- ROLLBACK — restores 0112's function body (muhurtham_reuse back in the
-- payload as a raw key, no label). Run as one block.
----------------------------------------------------------------------
-- Re-run the CREATE OR REPLACE from 0112 verbatim; it is self-contained.
