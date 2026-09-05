-- 0112_quotation_zones_systems_finish.sql
-- Quotation Module Phase 1.5 — restructure from the invented 6-category
-- library to the way the client actually quotes: walking the venue from
-- outside in, one zone at a time, pricing elements grouped by build system,
-- with a quotation-level finish ladder that scales all floral work.
--
-- SHAPE is shared (deployable to any tenant); the DATA is not. Zones,
-- systems, finish levels and the element library are all seeded tables
-- rather than hardcoded constants precisely so a future tenant seeds their
-- own vocabulary without touching shared components — the same reasoning
-- that keeps 0110's item library in a table. No tenant name, rate or label
-- appears in any shared TS file as a result.
--
-- `system` is a text column with an FK to quotation_systems rather than a
-- Postgres enum type: this codebase has already been bitten by
-- `ALTER TYPE ... ADD VALUE` needing its own committed transaction before
-- the label can be used (migrations 0013, 0033, 0100/0103). An FK gives the
-- same constrained-value guarantee, is queryable for labels, and a 9th
-- system is a plain INSERT rather than a two-migration dance.
--
-- AMOUNT IS NOT COMPUTED HERE. There is deliberately no generated column
-- and no trigger recomputing amount: application code
-- (src/portal/components/quotation/quotationMath.ts) is the single
-- implementation, and it persists the result. Phase 1 already shipped one
-- bug from having two calculations disagree (fixed in d29803fd); a DB-side
-- formula would reintroduce exactly that class of drift.

----------------------------------------------------------------------
-- 1. Zones — the venue walk, in quoting order.
----------------------------------------------------------------------
create table if not exists public.quotation_zones (
  key         text        primary key,
  label       text        not null,
  sort_order  integer     not null,
  created_at  timestamptz not null default now()
);

alter table public.quotation_zones enable row level security;

create policy admin_all_quotation_zones on public.quotation_zones
  for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

insert into public.quotation_zones (key, label, sort_order) values
  ('valet_parking',     'Valet parking area',    1),
  ('lift_placard',      'Lift placard',          2),
  ('entrance_elevation','Entrance and elevation',3),
  ('pathway',           'Pathway',               4),
  ('hall_door',         'Hall door',             5),
  ('selfie_point',      'Selfie point',          6),
  ('welcome_table',     'Welcome table',         7),
  ('aisle',             'Aisle',                 8),
  ('stage',             'Stage',                 9),
  ('hall',              'Hall',                 10),
  ('music_dance_stage', 'Music and dance stage',11),
  ('buffet_dining',     'Buffet and dining',    12),
  ('return_gift_point', 'Return gift point',    13)
on conflict (key) do nothing;

----------------------------------------------------------------------
-- 2. Systems — how an element is built, replacing the old 6 categories.
----------------------------------------------------------------------
-- scales_with_finish is what makes the finish ladder tenant-neutral in
-- shared code: the rule "floral work scales with the chosen finish, every
-- other system does not" lives here as data, so quotationMath.ts never has
-- to name a system key. A tenant whose finish ladder scales something else
-- flips this flag rather than editing a shared component.
create table if not exists public.quotation_systems (
  key                 text        primary key,
  label               text        not null,
  scales_with_finish  boolean     not null default false,
  sort_order          integer     not null,
  created_at          timestamptz not null default now()
);

alter table public.quotation_systems enable row level security;

create policy admin_all_quotation_systems on public.quotation_systems
  for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

insert into public.quotation_systems (key, label, scales_with_finish, sort_order) values
  ('floral',                'Floral',                 true,  1),
  ('structure_surface',     'Structure and surface',  false, 2),
  ('flooring',              'Flooring',               false, 3),
  ('lights_props',          'Lights and props',       false, 4),
  ('furniture',             'Furniture',              false, 5),
  ('traditional_properties','Traditional properties', false, 6),
  ('aha_moments',           'Aha moments',            false, 7),
  ('signage_wayfinding',    'Signage and wayfinding', false, 8)
on conflict (key) do nothing;

----------------------------------------------------------------------
-- 3. Finish ladder — the single biggest cost variable, applied per
--    function across every floral line rather than per line item.
--
--    internal_code is for internal/admin reference ONLY. It must never
--    reach the admin preview, the printed PDF or the public page — the
--    client sees `label` and nothing else. get_quotation_by_token below
--    deliberately does not select it.
--
--    floral_multiplier values are PLACEHOLDERS, not confirmed with the
--    client. They are the one number in this migration most likely to
--    change once the rate session happens.
----------------------------------------------------------------------
create table if not exists public.quotation_finish_levels (
  key                text        primary key,
  label              text        not null,
  internal_code      text        not null,
  description        text,
  floral_multiplier  numeric(4,2) not null,
  sort_order         integer     not null,
  created_at         timestamptz not null default now()
);

alter table public.quotation_finish_levels enable row level security;

create policy admin_all_quotation_finish_levels on public.quotation_finish_levels
  for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

insert into public.quotation_finish_levels
  (key, label, internal_code, description, floral_multiplier, sort_order) values
  ('real_100',    'Full fresh flowers',        '100',  'Fresh flowers throughout.',                      1.00, 1),
  ('real_60_40',  'Fresh-led blend',           '6040', 'Predominantly fresh, with supporting elements.', 0.85, 2),
  ('real_50_50',  'Balanced blend',            '5050', 'An even balance of fresh and lasting elements.', 0.70, 3),
  ('real_30_70',  'Fresh accents',             '307',  'Fresh flowers as highlights.',                   0.55, 4),
  ('readymade',   'Ready-made floral panels',  'RM',   'Prepared floral panels.',                        0.40, 5)
on conflict (key) do nothing;

----------------------------------------------------------------------
-- 4. Item library — system replaces category; motion props carry a motor
--    and a higher rate, so static and motorised are separate rows.
----------------------------------------------------------------------
alter table public.quotation_item_library
  add column if not exists system    text references public.quotation_systems(key),
  add column if not exists is_motion boolean not null default false;

-- Best-effort carry of any pre-existing rows before category is dropped.
update public.quotation_item_library set system = case
  when category = 'Stage & Backdrop'    then 'structure_surface'
  when category = 'Floral Decoration'   then 'floral'
  when category = 'Lighting & AV'       then 'lights_props'
  when category = 'Furniture & Props'   then 'furniture'
  when category = 'Photography & Video' then 'lights_props'
  when category = 'Event Management'    then 'lights_props'
  else 'structure_surface'
end
where system is null;

alter table public.quotation_item_library drop column if exists category;
alter table public.quotation_item_library alter column system set not null;

create index if not exists quotation_item_library_system_idx
  on public.quotation_item_library(system, sort_order);

-- Full reseed. Phase 1's library was invented for the prototype; this list
-- comes from a recorded walkthrough with the client and supersedes it.
-- EVERY default_rate below is a PLACEHOLDER pending the rate session.
delete from public.quotation_item_library;

insert into public.quotation_item_library (system, name, unit, default_rate, is_motion, sort_order) values
  -- Floral
  ('floral', 'Stage garden',                        'per unit',  0, false,  1),
  ('floral', 'Top garden',                          'per unit',  0, false,  2),
  ('floral', 'Ceiling garden',                      'per sqft',  0, false,  3),
  ('floral', 'Shape garden',                        'per unit',  0, false,  4),
  ('floral', 'Sofa garden',                         'per unit',  0, false,  5),
  ('floral', 'Bunches',                             'per unit',  0, false,  6),
  ('floral', 'Bushes',                              'per unit',  0, false,  7),
  ('floral', 'Bouquets',                            'per row',   0, false,  8),
  ('floral', 'Floral pasting (garden)',             'per sqft',  0, false,  9),
  ('floral', 'Floral pasting (traditional)',        'per sqft',  0, false, 10),
  ('floral', 'Floral canopy (carried)',             'per unit',  0, false, 11),
  ('floral', 'Floral canopy (fixed)',               'per unit',  0, false, 12),
  ('floral', 'Floral canopy (umbrella)',            'per unit',  0, false, 13),
  ('floral', 'Car decoration',                      'per vehicle', 0, false, 14),
  -- Structure and surface
  ('structure_surface', 'Backdrop',                 'per sqft',  0, false,  1),
  ('structure_surface', 'Panels',                   'per sqft',  0, false,  2),
  ('structure_surface', 'Printing',                 'per sqft',  0, false,  3),
  ('structure_surface', 'Glass',                    'per sqft',  0, false,  4),
  ('structure_surface', 'Metal',                    'per sqft',  0, false,  5),
  ('structure_surface', 'Wood',                     'per sqft',  0, false,  6),
  ('structure_surface', 'Ceiling',                  'per sqft',  0, false,  7),
  ('structure_surface', 'Side wall',                'per sqft',  0, false,  8),
  ('structure_surface', 'Mugappu',                  'per unit',  0, false,  9),
  ('structure_surface', 'Elevation or pergola',     'per unit',  0, false, 10),
  ('structure_surface', 'Ramp platform',            'per sqft',  0, false, 11),
  ('structure_surface', 'Step and grill covering',  'per sqft',  0, false, 12),
  ('structure_surface', 'Muhurtham setup',          'per unit',  0, false, 13),
  -- Flooring
  ('flooring', 'Constructed or plywood floor',      'per sqft',  0, false,  1),
  ('flooring', 'Carpet',                            'per sqft',  0, false,  2),
  ('flooring', 'Masking',                           'per sqft',  0, false,  3),
  ('flooring', 'Vinyl',                             'per sqft',  0, false,  4),
  -- Lights and props
  ('lights_props', 'Chandeliers',                   'per unit',  0, false,  1),
  ('lights_props', 'Bird lights (still)',           'per unit',  0, false,  2),
  ('lights_props', 'Bird lights (moving)',          'per unit',  0, true,   3),
  ('lights_props', 'Butterflies (static)',          'per unit',  0, false,  4),
  ('lights_props', 'Butterflies (motorised)',       'per unit',  0, true,   5),
  ('lights_props', 'Stands',                        'per unit',  0, false,  6),
  ('lights_props', 'Flower pots',                   'per unit',  0, false,  7),
  ('lights_props', 'Flower vases',                  'per unit',  0, false,  8),
  ('lights_props', 'Name logos',                    'per unit',  0, false,  9),
  ('lights_props', 'Shape cuttings',                'per unit',  0, false, 10),
  ('lights_props', 'Parachute',                     'per unit',  0, false, 11),
  ('lights_props', 'Stretched cloth with internal lighting', 'per unit', 0, false, 12),
  ('lights_props', 'Ambient lighting',              'per event', 0, false, 13),
  ('lights_props', 'Fairy light draping',           'per metre', 0, false, 14),
  ('lights_props', 'LED wall',                      'per sqft',  0, false, 15),
  ('lights_props', 'Sound system',                  'per day',   0, false, 16),
  ('lights_props', 'DJ setup',                      'per night', 0, false, 17),
  ('lights_props', 'Live streaming setup',          'per event', 0, false, 18),
  -- Furniture
  ('furniture', 'VIP sofas (traditional)',          'per unit',  0, false,  1),
  ('furniture', 'VIP sofas (fancy)',                'per unit',  0, false,  2),
  ('furniture', 'Tables',                           'per unit',  0, false,  3),
  ('furniture', 'Chairs',                           'per unit',  0, false,  4),
  ('furniture', 'Chair covers',                     'per unit',  0, false,  5),
  ('furniture', 'Sashes',                           'per unit',  0, false,  6),
  ('furniture', 'Centre pieces',                    'per unit',  0, false,  7),
  ('furniture', 'Stalls',                           'per unit',  0, false,  8),
  -- Traditional properties (ritual items, not decoration)
  ('traditional_properties', 'Ammi',                'per unit',  0, false,  1),
  ('traditional_properties', 'Arasaani kaal',       'per unit',  0, false,  2),
  ('traditional_properties', 'Muthappaanai',        'per unit',  0, false,  3),
  ('traditional_properties', 'Vilakku',             'per unit',  0, false,  4),
  -- Aha moments
  ('aha_moments', 'Spyro (cold spark)',             'per unit',  0, false,  1),
  ('aha_moments', 'Fog',                            'per unit',  0, false,  2),
  ('aha_moments', 'Flower shower',                  'per unit',  0, false,  3),
  ('aha_moments', 'Balloon blast',                  'per unit',  0, false,  4),
  ('aha_moments', 'Helium release',                 'per unit',  0, false,  5),
  ('aha_moments', 'Palanquin entry (motorised)',    'per unit',  0, true,   6),
  -- Signage and wayfinding
  ('signage_wayfinding', 'Name board (couple)',     'per unit',  0, false,  1),
  ('signage_wayfinding', 'Name board (parents)',    'per unit',  0, false,  2),
  ('signage_wayfinding', 'Lift placard',            'per unit',  0, false,  3),
  ('signage_wayfinding', 'Hall door board',         'per unit',  0, false,  4),
  ('signage_wayfinding', 'Selfie point marker',     'per unit',  0, false,  5);

----------------------------------------------------------------------
-- 5. Line items — a line now belongs to a zone and a function.
----------------------------------------------------------------------
alter table public.quotation_items
  add column if not exists system        text references public.quotation_systems(key),
  add column if not exists zone_key      text references public.quotation_zones(key),
  add column if not exists function_key  text not null default 'reception'
    check (function_key in ('reception', 'muhurtham')),
  add column if not exists gerbera_fill  boolean not null default false;

-- Best-effort carry: old category to nearest system, zone left null
-- (unknowable retrospectively), function defaults to reception.
update public.quotation_items set system = case
  when category = 'Stage & Backdrop'    then 'structure_surface'
  when category = 'Floral Decoration'   then 'floral'
  when category = 'Lighting & AV'       then 'lights_props'
  when category = 'Furniture & Props'   then 'furniture'
  when category = 'Photography & Video' then 'lights_props'
  when category = 'Event Management'    then 'lights_props'
  else 'structure_surface'
end
where system is null;

alter table public.quotation_items drop column if exists category;
alter table public.quotation_items alter column system set not null;

create index if not exists quotation_items_zone_idx
  on public.quotation_items(quotation_id, function_key, zone_key, sort_order);

----------------------------------------------------------------------
-- 6. Quotation-level settings.
--
--    A wedding can carry two functions. Muhurtham runs overnight and is a
--    separate job, not a discount on the reception: clients routinely
--    choose fresh flowers for the morning after an artificial reception.
--    So each function holds its OWN finish key and neither ever inherits
--    from the other.
----------------------------------------------------------------------
alter table public.quotations
  add column if not exists community            text,
  add column if not exists has_muhurtham        boolean not null default false,
  add column if not exists reception_finish_key text references public.quotation_finish_levels(key),
  add column if not exists muhurtham_finish_key text references public.quotation_finish_levels(key),
  add column if not exists readymade_variant    text
    check (readymade_variant in ('with_red', 'without_red')),
  add column if not exists muhurtham_reuse      text
    check (muhurtham_reuse in ('retain_with_additions', 'fully_changed'));

update public.quotations
   set reception_finish_key = 'real_50_50'
 where reception_finish_key is null;

----------------------------------------------------------------------
-- 7. Public token RPC — now returns zone, system and finish LABELS so the
--    public page can group by the venue walk.
--
--    internal_code is deliberately absent from every branch below. The
--    client document shows the finish label and nothing else: no code, no
--    ratio, no percentage.
----------------------------------------------------------------------
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
      - 'reception_finish_key' - 'muhurtham_finish_key' - 'readymade_variant',
    'reception_finish_label', (
      select label from public.quotation_finish_levels
       where key = v_q.reception_finish_key
    ),
    'muhurtham_finish_label', (
      select label from public.quotation_finish_levels
       where key = v_q.muhurtham_finish_key
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
