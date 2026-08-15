-- 0094_brand_visual_guide.sql
-- Brand Visual Guide module: per-client brand guidelines/assets/templates
-- library. Three sibling categories (guidelines/assets/templates), each a
-- flat list of items grouped for display by group_label. RLS mirrors the
-- mockup_sets/project_output_files pattern: admin full access via
-- is_admin(), client SELECT-only scoped to their own client_id AND
-- status='published' AND visibility IN ('client','public'). No anonymous
-- SELECT policy on the table at all -- public access goes through the
-- token-gated get-brand-visual-file-url edge function instead, same
-- reasoning as project_output_files (Postgres RPCs can't mint a Storage
-- signed URL).
--
-- clients.public_token is new: every other public surface in this app
-- (invoices, proposals, outputs) is reached by an opaque per-entity token,
-- never a raw id. The Brand Visual Guide public route browses a whole
-- client's published library across three tabs, so it needs a stable,
-- non-guessable per-client identifier the same way those surfaces have one
-- per-invoice/per-proposal/per-file.

----------------------------------------------------------------------
-- 1. clients.public_token
----------------------------------------------------------------------
alter table public.clients
  add column if not exists public_token uuid not null default gen_random_uuid();

create unique index if not exists clients_public_token_idx
  on public.clients(public_token);

----------------------------------------------------------------------
-- 2. brand_visual_items
----------------------------------------------------------------------
create table if not exists public.brand_visual_items (
  id            uuid        primary key default gen_random_uuid(),
  client_id     uuid        not null references public.clients(id) on delete cascade,
  category      text        not null check (category in ('guidelines','assets','templates')),
  group_label   text        not null,
  title         text        not null,
  summary       text,
  content_type  text        not null check (content_type in ('document','image','video','audio','link')),
  file_type     text,
  status        text        not null default 'draft'      check (status in ('draft','published')),
  visibility    text        not null default 'admin_only' check (visibility in ('admin_only','client','public')),
  detail        jsonb       not null default '{}'::jsonb,
  sort_order    integer     not null default 0,
  storage_path  text,
  public_token  uuid        not null default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists brand_visual_items_public_token_idx
  on public.brand_visual_items(public_token);
create index if not exists brand_visual_items_client_idx
  on public.brand_visual_items(client_id);
create index if not exists brand_visual_items_client_group_idx
  on public.brand_visual_items(client_id, category, group_label, sort_order);

alter table public.brand_visual_items enable row level security;

drop policy if exists admin_all_brand_visual_items on public.brand_visual_items;
create policy admin_all_brand_visual_items on public.brand_visual_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists client_read_own_brand_visual_items on public.brand_visual_items;
create policy client_read_own_brand_visual_items on public.brand_visual_items
  for select to authenticated
  using (
    client_id in (select id from public.clients where profile_id = auth.uid())
    and status = 'published'
    and visibility in ('client','public')
  );

-- No anon policy. Public access goes through get-brand-visual-file-url
-- (service-role, token-gated), same reasoning as project_output_files.

----------------------------------------------------------------------
-- 3. Storage bucket + RLS. Private, 50MB limit (matches project-outputs --
--    the closest analog given the same wide file-type spread: SVG/PDF/AI/
--    DOCX/MP3/MP4). Path convention: {client_id}/{random_id}_{filename} --
--    deliberately FLAT, no category/group segment, so moving an item
--    between groups or categories is a plain client_id-scoped UPDATE,
--    never a storage rename/copy (same lesson as project-outputs, 0087).
----------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-visual-files', 'brand-visual-files', false, 52428800, null)
on conflict (id) do nothing;

drop policy if exists admin_all_brand_visual_files on storage.objects;
create policy admin_all_brand_visual_files on storage.objects
  for all to authenticated
  using      (bucket_id = 'brand-visual-files' and public.is_admin())
  with check (bucket_id = 'brand-visual-files' and public.is_admin());

drop policy if exists client_read_own_brand_visual_files on storage.objects;
create policy client_read_own_brand_visual_files on storage.objects
  for select to authenticated
  using (
    bucket_id = 'brand-visual-files'
    and (storage.foldername(name))[1]::uuid in (
      select id from public.clients where profile_id = auth.uid()
    )
  );
