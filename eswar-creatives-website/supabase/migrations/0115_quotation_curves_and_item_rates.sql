-- 0115_quotation_curves_and_item_rates.sql
-- Quotation Module build 2, Phase 1 — the pricing data model the client
-- locked on 8 Sept 2026.
--
-- The finish ladder is NOT one global multiplier. It is a set of named
-- curves, each a list of ratios, applied to an anchor price that belongs to
-- the item and its unit:
--
--   price = round(anchor_rate * ratio)   -- to the nearest rupee
--
-- quotation_finish_levels.floral_multiplier is superseded by this model.
-- The column is left in place here so the currently-deployed builder (which
-- still selects it) keeps working until the frontend from this same build
-- ships; it is dropped by a later migration in this build once nothing
-- reads it.
--
-- An item can hold more than one row in quotation_item_rates, one per unit
-- (Stage garden prices per running foot AND per sqft, with different curves
-- and different anchors). A curve with no step for a finish level does not
-- offer that level, and the UI must show only the levels a line's curve
-- defines — that is why canopy/ceiling/bouquet carry 3-step curves while
-- the garden work carries the full 5-step ladder.
--
-- A NULL curve_key on an item rate means a flat rate with no finish
-- selection (bunches and bushes, per the client: no curve agreed yet).
--
-- SHAPE is shared, DATA is tenant vocabulary — same rule as 0112. The
-- seeds below are Newgen's audited 8 Sept rate card, applied to the Newgen
-- tenant project. Ratios are stored to six decimal places deliberately, so
-- the sqft curve multiplies a 650 anchor back to exactly 550/400/300/200.

----------------------------------------------------------------------
-- 1. Curves and their steps
----------------------------------------------------------------------
create table if not exists public.quotation_curves (
  key         text        primary key,
  label       text        not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.quotation_curve_steps (
  curve_key     text          not null references public.quotation_curves(key)
                              on update cascade on delete cascade,
  finish_level  text          not null references public.quotation_finish_levels(key)
                              on update cascade,
  ratio         numeric(10,6) not null check (ratio > 0),
  primary key (curve_key, finish_level)
);

----------------------------------------------------------------------
-- 2. Item rates — the anchor belongs to the item AND its unit.
----------------------------------------------------------------------
create table if not exists public.quotation_item_rates (
  id           uuid          primary key default gen_random_uuid(),
  item_id      uuid          not null references public.quotation_item_library(id)
                             on delete cascade,
  unit         text          not null,
  curve_key    text          references public.quotation_curves(key)
                             on update cascade,
  anchor_rate  numeric(12,2) not null,
  created_at   timestamptz   not null default now(),
  unique (item_id, unit)
);

create index if not exists quotation_item_rates_item_idx
  on public.quotation_item_rates(item_id);

----------------------------------------------------------------------
-- 3. RLS — admin only, same as every other quotation table.
----------------------------------------------------------------------
alter table public.quotation_curves      enable row level security;
alter table public.quotation_curve_steps enable row level security;
alter table public.quotation_item_rates  enable row level security;

create policy admin_all_quotation_curves on public.quotation_curves
  for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

create policy admin_all_quotation_curve_steps on public.quotation_curve_steps
  for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

create policy admin_all_quotation_item_rates on public.quotation_item_rates
  for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

----------------------------------------------------------------------
-- 4. Seed: the five curves locked with the client on 8 Sept.
----------------------------------------------------------------------
insert into public.quotation_curves (key, label) values
  ('running_ft_standard', 'Running feet, standard 5-step'),
  ('sqft_standard',       'Square feet, standard 5-step'),
  ('canopy_3step',        'Canopy, 3-step'),
  ('ceiling_3step',       'Ceiling, 3-step'),
  ('bouquet_3step',       'Bouquet, 3-step')
on conflict (key) do nothing;

insert into public.quotation_curve_steps (curve_key, finish_level, ratio) values
  ('running_ft_standard', 'full_fresh',    1.000000),
  ('running_ft_standard', 'fresh_led',     0.750000),
  ('running_ft_standard', 'balanced',      0.500000),
  ('running_ft_standard', 'fresh_accents', 0.350000),
  ('running_ft_standard', 'ready_made',    0.200000),
  ('sqft_standard',       'full_fresh',    1.000000),
  ('sqft_standard',       'fresh_led',     0.846154),
  ('sqft_standard',       'balanced',      0.615385),
  ('sqft_standard',       'fresh_accents', 0.461538),
  ('sqft_standard',       'ready_made',    0.307692),
  ('canopy_3step',        'full_fresh',    1.000000),
  ('canopy_3step',        'balanced',      0.750000),
  ('canopy_3step',        'ready_made',    0.500000),
  ('ceiling_3step',       'full_fresh',    1.000000),
  ('ceiling_3step',       'balanced',      0.666667),
  ('ceiling_3step',       'ready_made',    0.500000),
  ('bouquet_3step',       'full_fresh',    1.000000),
  ('bouquet_3step',       'balanced',      0.500000),
  ('bouquet_3step',       'ready_made',    0.250000)
on conflict (curve_key, finish_level) do nothing;

----------------------------------------------------------------------
-- 5. Seed: item rates. Items are looked up by name — the single-row
--    subselect fails loudly if the library ever holds a duplicate name,
--    which is the correct failure.
----------------------------------------------------------------------
insert into public.quotation_item_rates (item_id, unit, curve_key, anchor_rate)
select v.item_id, v.unit, v.curve_key, v.anchor_rate
from (values
  ((select id from public.quotation_item_library where name = 'Stage garden'),            'running ft', 'running_ft_standard', 1000.00),
  ((select id from public.quotation_item_library where name = 'Stage garden'),            'sqft',       'sqft_standard',        650.00),
  ((select id from public.quotation_item_library where name = 'Top garden'),              'running ft', 'running_ft_standard', 1000.00),
  ((select id from public.quotation_item_library where name = 'Shape garden'),            'running ft', 'running_ft_standard', 1200.00),
  ((select id from public.quotation_item_library where name = 'Shape garden'),            'sqft',       'sqft_standard',        650.00),
  ((select id from public.quotation_item_library where name = 'Floral pasting (garden)'), 'sqft',       'sqft_standard',        650.00),
  ((select id from public.quotation_item_library where name = 'Sofa garden'),             'sqft',       'sqft_standard',        650.00),
  ((select id from public.quotation_item_library where name = 'Floral canopy (fixed)'),   'per unit',   'canopy_3step',       20000.00),
  ((select id from public.quotation_item_library where name = 'Ceiling garden'),          'sqft',       'ceiling_3step',        150.00),
  ((select id from public.quotation_item_library where name = 'Bouquets'),                'sqft',       'bouquet_3step',       1200.00),
  ((select id from public.quotation_item_library where name = 'Bunches'),                 'per unit',   null,                  1500.00),
  ((select id from public.quotation_item_library where name = 'Bushes'),                  'per unit',   null,                  2500.00)
) as v(item_id, unit, curve_key, anchor_rate)
on conflict (item_id, unit) do nothing;

notify pgrst, 'reload schema';
