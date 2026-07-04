-- 0068_invoice_public_token_nudge.sql
-- Adds a public share token + nudge tracking fields to invoices, and a
-- SECURITY DEFINER RPC so unauthenticated visitors can fetch a single
-- invoice by token without any RLS bypass on the full table.

----------------------------------------------------------------------
-- 1. New columns on invoices.
----------------------------------------------------------------------
alter table public.invoices
  add column if not exists public_token             uuid        not null default gen_random_uuid(),
  add column if not exists public_token_expires_at  timestamptz,
  add column if not exists last_nudge_sent_at       timestamptz,
  add column if not exists nudge_count              integer     not null default 0;

-- Fast lookup by token.
create unique index if not exists invoices_public_token_idx
  on public.invoices (public_token);

----------------------------------------------------------------------
-- 2. SECURITY DEFINER function: fetch one invoice + its line items
--    and payments by public token. Returns null when the token is not
--    found or has expired. Runs as the DB owner so it can read
--    past RLS for this single row only; no other data is exposed.
----------------------------------------------------------------------
create or replace function public.get_invoice_by_token(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv  public.invoices%rowtype;
begin
  select * into v_inv
    from public.invoices
   where public_token             = p_token
     and public_token_expires_at  > now();

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'invoice', to_jsonb(v_inv),
    'line_items', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'label',      label,
            'amount',     amount,
            'sort_order', sort_order
          )
          order by sort_order
        ),
        '[]'::jsonb
      )
      from public.invoice_line_items
      where invoice_id = v_inv.id
    ),
    'payments', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'paid_on',        paid_on,
            'method',         method,
            'amount',         amount,
            'reference_note', reference_note
          )
          order by paid_on
        ),
        '[]'::jsonb
      )
      from public.invoice_payments
      where invoice_id = v_inv.id
    )
  );
end;
$$;

-- Allow the anonymous (unauthenticated anon) role to call this function.
-- The function itself enforces the token + expiry check server-side;
-- no other invoice rows are reachable through this function.
grant execute on function public.get_invoice_by_token(uuid) to anon;
