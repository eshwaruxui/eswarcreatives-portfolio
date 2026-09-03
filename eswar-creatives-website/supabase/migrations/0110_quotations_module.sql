-- 0110_quotations_module.sql
-- Quotation Module, Phase 1. Shared schema — deployable to any tenant as-is,
-- no tenant-specific values baked in (see PORTAL_ARCHITECTURE.md's tenant
-- pattern: isolation is per-Supabase-project, so no tenant_id column is
-- needed, same as invoices/proposals).
--
-- Numbering: a real sequence + column default (mirrors invoice_number_seq,
-- 0038) so concurrent admin sessions can never collide — not the racy
-- client-side max()+1 pattern InvoicesAdmin/ProposalForm use.
--
-- Visibility: a single `status` column (draft|sent), not two independently-
-- defaulted columns like Brand Visual Guide's status+visibility pair (0094),
-- which is exactly the bug class where an admin flips the obvious control
-- and the item stays invisible with no error. One column, one thing to set.
--
-- public_token_expires_at is set by the app when a quotation is sent, from
-- the quotation's own validity_days — not a fixed rotation window like
-- invoices' 30 days, so the link's expiry means the same thing as the
-- validity printed on the document.

----------------------------------------------------------------------
-- 1. Sequences + quotations table
----------------------------------------------------------------------
create sequence if not exists quotation_number_seq start 1001;
create sequence if not exists quotation_customer_seq start 1001;

create table public.quotations (
  id                        uuid        primary key default gen_random_uuid(),
  quotation_number          text        not null unique,
  customer_id               text        not null unique,
  client_name               text        not null,
  client_phone               text        not null,
  client_email              text,
  client_address            text,
  event_type                text        not null,
  event_date                date,
  venue                     text,
  guest_count               integer,
  notes                     text,
  discount_pct              numeric(5,2)  not null default 0,
  advance_pct               numeric(5,2)  not null default 50,
  validity_days             integer       not null default 7,
  gst_enabled               boolean       not null default false,
  subtotal                  numeric(12,2) not null default 0,
  discount_amount           numeric(12,2) not null default 0,
  gst_amount                numeric(12,2) not null default 0,
  total_amount              numeric(12,2) not null default 0,
  advance_amount            numeric(12,2) not null default 0,
  status                    text        not null default 'draft' check (status in ('draft','sent')),
  public_token              uuid        not null default gen_random_uuid(),
  public_token_expires_at   timestamptz,
  created_by                uuid        references public.profiles(id),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table public.quotations alter column quotation_number
set default 'NES-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('quotation_number_seq')::text, 4, '0');

alter table public.quotations alter column customer_id
set default 'NGC-' || lpad(nextval('quotation_customer_seq')::text, 4, '0');

create unique index quotations_public_token_idx on public.quotations(public_token);
create index quotations_status_idx on public.quotations(status);

----------------------------------------------------------------------
-- 2. Line items — flat child table, mirrors invoice_line_items (0062),
--    not proposals' two-level phases/line-items hierarchy (quotations
--    don't need phase grouping).
----------------------------------------------------------------------
create table public.quotation_items (
  id            uuid        primary key default gen_random_uuid(),
  quotation_id  uuid        not null references public.quotations(id) on delete cascade,
  category      text        not null,
  label         text        not null,
  unit          text,
  qty           numeric(10,2) not null default 1,
  rate          numeric(12,2) not null default 0,
  amount        numeric(12,2) not null default 0,
  note          text,
  source        text        not null default 'manual' check (source in ('library','mockup_ai','manual')),
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now()
);

create index quotation_items_quotation_idx on public.quotation_items(quotation_id);

----------------------------------------------------------------------
-- 3. Item library — per-tenant catalog (data, not schema, is what varies
--    between tenants; a future tenant seeds their own rows via the admin
--    screen or their own seed, same table).
----------------------------------------------------------------------
create table public.quotation_item_library (
  id            uuid        primary key default gen_random_uuid(),
  category      text        not null,
  name          text        not null,
  unit          text,
  default_rate  numeric(12,2),
  is_active     boolean     not null default true,
  sort_order    integer     not null default 0,
  created_at    timestamptz not null default now()
);

create index quotation_item_library_category_idx on public.quotation_item_library(category, sort_order);

----------------------------------------------------------------------
-- 4. RLS — admin/owner only. No client role interacts with quotations
--    directly in Phase 1 (the client only ever sees the finished document
--    via the public token, same as invoices/proposals/outputs).
----------------------------------------------------------------------
alter table public.quotations             enable row level security;
alter table public.quotation_items        enable row level security;
alter table public.quotation_item_library enable row level security;

create policy admin_all_quotations on public.quotations
  for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

create policy admin_all_quotation_items on public.quotation_items
  for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

create policy admin_all_quotation_item_library on public.quotation_item_library
  for all to authenticated
  using      (public.is_admin())
  with check (public.is_admin());

----------------------------------------------------------------------
-- 5. Public token RPC — mirrors get_invoice_by_token (0068) /
--    get_proposal_by_token (0071). Gates on status <> 'draft' AND
--    (no expiry OR not yet expired) so a draft quotation's token is never
--    reachable even if guessed. Grants anon + authenticated (matching
--    proposal's broader grant, not invoice's anon-only), since there's no
--    reason an already-logged-in admin/client should be special-cased.
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
    'quotation', to_jsonb(v_q),
    'items', (
      select coalesce(
        jsonb_agg(
          jsonb_build_object(
            'category', category,
            'label',    label,
            'unit',     unit,
            'qty',      qty,
            'rate',     rate,
            'amount',   amount,
            'note',     note
          )
          order by sort_order
        ),
        '[]'::jsonb
      )
      from public.quotation_items
      where quotation_id = v_q.id
    )
  );
end;
$$;

grant execute on function public.get_quotation_by_token(uuid) to anon, authenticated;

----------------------------------------------------------------------
-- 6. Starter item library seed — categories/names/rates lifted verbatim
--    from the validated prototype
--    (newgen-event-studio/claude project files/newgen_quotation.jsx,
--    ITEM_LIBRARY). Rates are the prototype's own placeholder pricing, not
--    confirmed against Newgen's real rate card — worth a review pass
--    before this goes live with real clients.
----------------------------------------------------------------------
insert into public.quotation_item_library (category, name, unit, default_rate, sort_order) values
('Stage & Backdrop', 'Premium Stage Decoration', 'per event', 45000, 1),
('Stage & Backdrop', 'Floral Backdrop Wall', 'per sqft', 180, 2),
('Stage & Backdrop', 'LED Wall (P3 Indoor)', 'per sqft per day', 350, 3),
('Stage & Backdrop', 'Gold Arch with Floral Cascade', 'per unit', 18000, 4),
('Stage & Backdrop', 'Entrance Arch Decoration', 'per unit', 12000, 5),
('Stage & Backdrop', 'Mandap Setup (Traditional)', 'per event', 55000, 6),
('Stage & Backdrop', 'Reception Stage Setup', 'per event', 38000, 7),
('Floral Decoration', 'Stage Floral Arrangement', 'per event', 22000, 1),
('Floral Decoration', 'Table Centrepiece (Premium)', 'per table', 1800, 2),
('Floral Decoration', 'Table Centrepiece (Standard)', 'per table', 900, 3),
('Floral Decoration', 'Flower Urn (White Pedestal)', 'per unit', 3500, 4),
('Floral Decoration', 'Entrance Flower Rangoli', 'per sqft', 120, 5),
('Floral Decoration', 'Ceiling Floral Canopy', 'per sqft', 280, 6),
('Floral Decoration', 'Car Decoration (Bridal)', 'per vehicle', 4500, 7),
('Lighting & AV', 'Ambient Lighting Setup', 'per event', 18000, 1),
('Lighting & AV', 'Candle Stand Lighting (Gold)', 'per unit', 800, 2),
('Lighting & AV', 'Fairy Light Draping', 'per metre', 45, 3),
('Lighting & AV', 'Neon Sign (Custom)', 'per unit', 8500, 4),
('Lighting & AV', 'Sound System (Professional)', 'per day', 12000, 5),
('Lighting & AV', 'DJ Setup', 'per night', 22000, 6),
('Lighting & AV', 'Live Streaming Setup', 'per event', 15000, 7),
('Photography & Video', 'Wedding Photography (Full Day)', 'per day', 25000, 1),
('Photography & Video', 'Videography (Full Day)', 'per day', 22000, 2),
('Photography & Video', 'Drone Coverage', 'per session', 12000, 3),
('Photography & Video', 'Pre-Wedding Shoot', 'per session', 18000, 4),
('Photography & Video', 'Candid Photography', 'per day', 18000, 5),
('Photography & Video', 'Photo Album (Premium)', 'per album', 8500, 6),
('Event Management', 'Muhurtham Date Coordination', 'per event', 3500, 1),
('Event Management', 'Pandit / Priest Coordination', 'per event', 4500, 2),
('Event Management', 'Guest Management (per head)', 'per person', 85, 3),
('Event Management', 'Return Gift Coordination', 'per event', 5000, 4),
('Event Management', 'Catering Coordination', 'per event', 8000, 5),
('Event Management', 'Event Concept Sketch (Hand-drawn)', 'per concept', 2500, 6),
('Furniture & Props', 'Bridal Loveseat (Gold Frame)', 'per day', 6500, 1),
('Furniture & Props', 'Throne Chair (Pair)', 'per day', 4500, 2),
('Furniture & Props', 'Banquet Chair with Sash', 'per chair per day', 85, 3),
('Furniture & Props', 'Round Table (60-inch)', 'per table per day', 350, 4),
('Furniture & Props', 'Welcome Board / Easel', 'per unit', 1800, 5),
('Furniture & Props', 'Photobooth Setup', 'per event', 12000, 6);
