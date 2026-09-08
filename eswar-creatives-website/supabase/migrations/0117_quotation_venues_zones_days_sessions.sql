-- 0117_quotation_venues_zones_days_sessions.sql
-- Quotation Module build 2, Phase 3 — venues, the 14-zone walk, and
-- explicit days and sessions.
--
-- VENUES. No venues table existed; the venue was a free-text field. These
-- nine were verified 4 Sept in NEWGEN_PROJECT_CONTEXT.md. The field
-- becomes a combobox: filter by typing, and a name not on the list
-- persists as a new row (a tenth venue may exist; create-new covers it).
--
-- ZONES. Fourteen zones in a new client-confirmed order. Zone 2,
-- "Mandapam building decoration (exterior and elevation)", is NEW —
-- mandapam here means the venue building exterior, not the wedding canopy
-- (the canopy is muhurtham setup, a different thing entirely).
--
-- DAYS AND SESSIONS. A one, two or three day event is an explicit
-- selection, never inferred from dates. A day holds a LIST of sessions,
-- not a single value — the client confirmed one day can carry more than
-- one event. Default one session per day, option to add a second. A
-- session is Morning or Evening ("Evening reception", never "night";
-- muhurtham is the morning slot — that vocabulary lives in the UI).

----------------------------------------------------------------------
-- 1. Venues
----------------------------------------------------------------------
create table if not exists public.quotation_venues (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null unique,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

alter table public.quotation_venues enable row level security;

create policy admin_all_quotation_venues on public.quotation_venues
  for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

insert into public.quotation_venues (name) values
  ('Sri Venkatesh Mahal'),
  ('MKS Grand Palace'),
  ('NRP Mahal'),
  ('Selvi Mahal'),
  ('CPM Royal Palace'),
  ('Illam Hospitality Priyam'),
  ('Illam Hospitality Varham'),
  ('Illam Hospitality Shivam'),
  ('Illam Hospitality Amazonite')
on conflict (name) do nothing;

----------------------------------------------------------------------
-- 2. Zones — insert zone 2, re-order the rest. One UPDATE per row keyed
--    on the stable zone key, so this is safe to re-run.
----------------------------------------------------------------------
insert into public.quotation_zones (key, label, sort_order) values
  ('mandapam_building', 'Mandapam building decoration (exterior and elevation)', 2)
on conflict (key) do nothing;

update public.quotation_zones set sort_order = v.ord
from (values
  ('entrance_elevation',  1),
  ('mandapam_building',   2),
  ('pathway',             3),
  ('valet_parking',       4),
  ('lift_placard',        5),
  ('hall_door',           6),
  ('selfie_point',        7),
  ('welcome_table',       8),
  ('aisle',               9),
  ('stage',              10),
  ('hall',               11),
  ('music_dance_stage',  12),
  ('buffet_dining',      13),
  ('return_gift_point',  14)
) as v(key, ord)
where quotation_zones.key = v.key;

----------------------------------------------------------------------
-- 3. Days and sessions
----------------------------------------------------------------------
alter table public.quotations
  add column if not exists day_count integer not null default 1
    check (day_count between 1 and 3);

create table if not exists public.quotation_day_sessions (
  id            uuid        primary key default gen_random_uuid(),
  quotation_id  uuid        not null references public.quotations(id) on delete cascade,
  day_number    integer     not null check (day_number between 1 and 3),
  slot          text        not null check (slot in ('morning', 'evening')),
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists quotation_day_sessions_quotation_idx
  on public.quotation_day_sessions(quotation_id, day_number, sort_order);

alter table public.quotation_day_sessions enable row level security;

create policy admin_all_quotation_day_sessions on public.quotation_day_sessions
  for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

notify pgrst, 'reload schema';
