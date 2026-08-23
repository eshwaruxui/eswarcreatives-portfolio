-- 0105_qr_codes.sql
-- QR Manager: a static QR image (generated once via api.qrserver.com, safe
-- for print forever) always points at eswarcreatives.in/qr/{slug}. The slug
-- resolves its destination from this table, so the destination can change
-- anytime without reprinting anything -- built after qr.io's free trial
-- expired on already-printed Newgen BNI bookmarks (150 distributed pieces
-- with a dead QR). No third party, no subscription, no expiry risk.
--
-- qr_scans is a child table, one row per resolve, logged fire-and-forget by
-- the functions/qr/[slug].js redirect. No IP stored, privacy safe.
--
-- RLS mirrors brand_visual_items' pattern (0094): admin full access via
-- is_admin(), client SELECT-only scoped to their own client_id via
-- clients.profile_id = auth.uid() -- confirmed still the live expression by
-- checking 0099 (client_set_brand_visual_item_public) ahead of this
-- migration, no drift. Unlike brand_visual_items there is no
-- status/visibility filter on the client read: a client should see their
-- own QR codes regardless of is_active, since the point of the status pill
-- on the client card is to surface that a code was deactivated, not hide it.
-- qr_scans' client read carries the same nested-subquery shape project_
-- output_files/brand_visual_item_attachments already use: child_fk in
-- (select id from parent where <parent's own read-authorization condition>).

----------------------------------------------------------------------
-- 1. qr_codes
----------------------------------------------------------------------
create table if not exists public.qr_codes (
  id                uuid        primary key default gen_random_uuid(),
  client_id         uuid        references public.clients(id) on delete cascade,
  created_by        uuid        references auth.users(id),
  slug              text        not null unique,
  label             text        not null,
  destination_url   text        not null,
  use_case          text,
  medium            text,
  is_active         boolean     not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists qr_codes_client_idx
  on public.qr_codes(client_id);

alter table public.qr_codes enable row level security;

drop policy if exists admin_all_qr_codes on public.qr_codes;
create policy admin_all_qr_codes on public.qr_codes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists client_read_own_qr_codes on public.qr_codes;
create policy client_read_own_qr_codes on public.qr_codes
  for select to authenticated
  using (
    client_id in (select id from public.clients where profile_id = auth.uid())
  );

-- No anon policy. Resolution for real scans goes entirely through
-- functions/qr/[slug].js, which reads via the anon key server-side and never
-- exposes a client session -- same reasoning as every other public-token
-- surface in this app (Postgres RLS is not in scope for that request path).

----------------------------------------------------------------------
-- 2. qr_scans
----------------------------------------------------------------------
create table if not exists public.qr_scans (
  id          uuid        primary key default gen_random_uuid(),
  qr_code_id  uuid        references public.qr_codes(id) on delete cascade,
  scanned_at  timestamptz not null default now(),
  user_agent  text
  -- no IP stored, privacy safe
);

create index if not exists qr_scans_qr_code_idx
  on public.qr_scans(qr_code_id);

alter table public.qr_scans enable row level security;

drop policy if exists admin_all_qr_scans on public.qr_scans;
create policy admin_all_qr_scans on public.qr_scans
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists client_read_own_qr_scans on public.qr_scans;
create policy client_read_own_qr_scans on public.qr_scans
  for select to authenticated
  using (
    qr_code_id in (
      select id from public.qr_codes
      where client_id in (select id from public.clients where profile_id = auth.uid())
    )
  );

-- qr_codes/qr_scans are deliberately not added to PORTAL_ARCHITECTURE.md
-- Section 3's manual FK delete order list. Both reference their parent with
-- ON DELETE CASCADE, the same reasoning that already exempts
-- project_output_files/project_output_folders and brand_visual_items/
-- brand_visual_item_attachments -- admin-delete-client's cascade runs
-- entirely inside the admin_delete_client() SQL function (migration 0056)
-- via one atomic RPC, and CASCADE cleans these up regardless of whether that
-- function has a line for them.
