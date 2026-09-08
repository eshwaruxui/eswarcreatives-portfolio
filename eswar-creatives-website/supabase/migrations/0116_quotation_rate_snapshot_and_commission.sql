-- 0116_quotation_rate_snapshot_and_commission.sql
-- Quotation Module build 2, Phase 2 — rate snapshotting and commission.
--
-- SNAPSHOT. A quotation must never change after it is sent. Before this,
-- line items were priced against the global rate card at add time but the
-- finish arithmetic read global tables live — so editing a global ratio
-- would silently reprice past quotations, including accepted ones. Now, on
-- quotation creation, a trigger copies every curve step and every item rate
-- onto the quotation itself. The builder prices new lines from that copy;
-- per-quotation edits write to that copy. The global tables are the default
-- source for NEW quotations only, never a live dependency of existing ones.
--
-- COMMISSION. Global percentage plus an optional per-item flat rupee
-- override (the client adds fixed amounts such as Rs 50 on specific items).
-- The seeded rates ALREADY CONTAIN commission — the client bakes it in,
-- which is why so many of his figures end in 50. So the per-line
-- "Commission applied" checkbox (checked by default) works backwards from
-- what a naive reading suggests:
--
--   * Checked (default): the line price is the rate card figure EXACTLY.
--     No addition. Toggling it on must never change the number.
--   * Unchecked: strip the commission out. Percentage: DIVIDE, do not
--     subtract — a rate of 1000 carrying 10 percent has a base of 909.09,
--     not 900. Flat override: subtract the amount.
--
-- Commission never appears on the client document. It is a builder-view
-- internal figure only; get_quotation_by_token is untouched by this
-- migration and returns none of these columns' semantics to the client.
--
-- The 10.00 percent seeded below is a PLACEHOLDER. The client asked for a
-- percentage in one message and an amount in another; the model here is
-- global percentage + item-level flat override, and the actual percentage
-- needs confirming in the next rate session.

----------------------------------------------------------------------
-- 1. Global commission setting — one row, enforced.
----------------------------------------------------------------------
create table if not exists public.quotation_pricing_settings (
  id              boolean       primary key default true check (id),
  commission_pct  numeric(5,2)  not null default 0,
  updated_at      timestamptz   not null default now()
);

alter table public.quotation_pricing_settings enable row level security;

create policy admin_all_quotation_pricing_settings on public.quotation_pricing_settings
  for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

insert into public.quotation_pricing_settings (id, commission_pct)
values (true, 10.00)
on conflict (id) do nothing;

----------------------------------------------------------------------
-- 2. Item-level flat commission override, on the rate row (the override
--    belongs to the item+unit the anchor belongs to).
----------------------------------------------------------------------
alter table public.quotation_item_rates
  add column if not exists commission_flat numeric(12,2);

----------------------------------------------------------------------
-- 3. The snapshot tables — a quotation's own frozen copy of the rate card.
----------------------------------------------------------------------
create table if not exists public.quotation_snapshot_curve_steps (
  quotation_id  uuid          not null references public.quotations(id) on delete cascade,
  curve_key     text          not null,
  finish_level  text          not null references public.quotation_finish_levels(key)
                              on update cascade,
  ratio         numeric(10,6) not null check (ratio > 0),
  primary key (quotation_id, curve_key, finish_level)
);

create table if not exists public.quotation_snapshot_rates (
  id               uuid          primary key default gen_random_uuid(),
  quotation_id     uuid          not null references public.quotations(id) on delete cascade,
  -- Provenance only. The snapshot survives the library row's deletion.
  item_id          uuid          references public.quotation_item_library(id) on delete set null,
  item_name        text          not null,
  unit             text          not null,
  curve_key        text,
  anchor_rate      numeric(12,2) not null,
  commission_flat  numeric(12,2),
  unique (quotation_id, item_name, unit)
);

create index if not exists quotation_snapshot_rates_quotation_idx
  on public.quotation_snapshot_rates(quotation_id);

alter table public.quotation_snapshot_curve_steps enable row level security;
alter table public.quotation_snapshot_rates       enable row level security;

create policy admin_all_quotation_snapshot_curve_steps on public.quotation_snapshot_curve_steps
  for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

create policy admin_all_quotation_snapshot_rates on public.quotation_snapshot_rates
  for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

----------------------------------------------------------------------
-- 4. Quotation carries its own commission percentage (frozen at creation)
--    and each line carries everything its price is computed from.
----------------------------------------------------------------------
alter table public.quotations
  add column if not exists commission_pct numeric(5,2);

alter table public.quotation_items
  add column if not exists anchor_rate        numeric(12,2),
  add column if not exists curve_key          text,
  add column if not exists finish_level       text references public.quotation_finish_levels(key)
                                              on update cascade,
  add column if not exists commission_applied boolean not null default true,
  add column if not exists commission_flat    numeric(12,2);

-- Lines that predate this model: their entered rate becomes their anchor,
-- with no curve (flat pricing), so nothing already stored changes value.
update public.quotation_items set anchor_rate = rate where anchor_rate is null;

-- A curved line's finish must exist on its own quotation's snapshot of that
-- curve. MATCH SIMPLE skips rows where curve_key or finish_level is null,
-- which is exactly the flat-rate case.
alter table public.quotation_items
  drop constraint if exists quotation_items_snapshot_step_fkey;
alter table public.quotation_items
  add constraint quotation_items_snapshot_step_fkey
  foreign key (quotation_id, curve_key, finish_level)
  references public.quotation_snapshot_curve_steps(quotation_id, curve_key, finish_level);

----------------------------------------------------------------------
-- 5. Creation trigger — the snapshot happens on INSERT, always, so no
--    caller can forget it. BEFORE freezes the commission percentage onto
--    the row; AFTER copies the rate card into the snapshot tables.
----------------------------------------------------------------------
create or replace function public.quotation_freeze_commission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.commission_pct is null then
    new.commission_pct := coalesce(
      (select commission_pct from public.quotation_pricing_settings where id),
      0
    );
  end if;
  return new;
end;
$$;

create or replace function public.quotation_snapshot_rate_card()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.quotation_snapshot_curve_steps (quotation_id, curve_key, finish_level, ratio)
  select new.id, cs.curve_key, cs.finish_level, cs.ratio
  from public.quotation_curve_steps cs
  on conflict do nothing;

  insert into public.quotation_snapshot_rates
    (quotation_id, item_id, item_name, unit, curve_key, anchor_rate, commission_flat)
  select new.id, r.item_id, lib.name, r.unit, r.curve_key, r.anchor_rate, r.commission_flat
  from public.quotation_item_rates r
  join public.quotation_item_library lib on lib.id = r.item_id
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists quotation_freeze_commission_trg on public.quotations;
create trigger quotation_freeze_commission_trg
  before insert on public.quotations
  for each row execute function public.quotation_freeze_commission();

drop trigger if exists quotation_snapshot_rate_card_trg on public.quotations;
create trigger quotation_snapshot_rate_card_trg
  after insert on public.quotations
  for each row execute function public.quotation_snapshot_rate_card();

-- Trigger functions cannot run outside a trigger anyway, but the default
-- EXECUTE grant still trips the security linter (0028/0029) and there is
-- no reason for any API role to hold it.
revoke execute on function public.quotation_freeze_commission() from public, anon, authenticated;
revoke execute on function public.quotation_snapshot_rate_card() from public, anon, authenticated;

-- Existing quotations get a snapshot of the card as it stands today, and
-- the current global percentage — the closest available approximation of
-- "the card as they were priced against".
insert into public.quotation_snapshot_curve_steps (quotation_id, curve_key, finish_level, ratio)
select q.id, cs.curve_key, cs.finish_level, cs.ratio
from public.quotations q
cross join public.quotation_curve_steps cs
on conflict do nothing;

insert into public.quotation_snapshot_rates
  (quotation_id, item_id, item_name, unit, curve_key, anchor_rate, commission_flat)
select q.id, r.item_id, lib.name, r.unit, r.curve_key, r.anchor_rate, r.commission_flat
from public.quotations q
cross join public.quotation_item_rates r
join public.quotation_item_library lib on lib.id = r.item_id
on conflict do nothing;

update public.quotations
   set commission_pct = coalesce(
     (select commission_pct from public.quotation_pricing_settings where id), 0)
 where commission_pct is null;

notify pgrst, 'reload schema';
