-- 0097_brand_visual_item_attachments.sql
-- Multiple file attachments per Brand Visual Guide item. A child table, one
-- row per file, mirroring project_output_files' shape and RLS pattern
-- exactly (0087) rather than an array/jsonb column on brand_visual_items --
-- this is the established precedent in this codebase for "one thing, many
-- files" (also project_attachments/project_stage_attachments).
--
-- Storage: reuses the existing brand-visual-files bucket and its existing
-- flat {client_id}/{random_id}_{filename} path convention (migration 0094)
-- unchanged -- its RLS only keys on the path's client_id prefix, so no
-- bucket or storage.objects policy change is needed for this migration at
-- all.
--
-- brand_visual_items.storage_path/file_type are left untouched -- existing
-- single-file items (Guidelines/Assets/Templates, and any Tone of Voice
-- item saved before this migration) keep rendering exactly as before. New
-- items go through this table instead; the admin form and renderer changes
-- that actually do that live in application code, not this migration.

create table if not exists public.brand_visual_item_attachments (
  id            uuid        primary key default gen_random_uuid(),
  item_id       uuid        not null references public.brand_visual_items(id) on delete cascade,
  file_name     text        not null,
  storage_path  text        not null,
  file_size     bigint,
  file_type     text,
  sort_order    integer     not null default 0,
  public_token  uuid        not null default gen_random_uuid(),
  created_at    timestamptz not null default now()
);

create unique index if not exists brand_visual_item_attachments_public_token_idx
  on public.brand_visual_item_attachments(public_token);
create index if not exists brand_visual_item_attachments_item_idx
  on public.brand_visual_item_attachments(item_id, sort_order);

alter table public.brand_visual_item_attachments enable row level security;

drop policy if exists admin_all_brand_visual_item_attachments on public.brand_visual_item_attachments;
create policy admin_all_brand_visual_item_attachments on public.brand_visual_item_attachments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Same nested-subquery shape as project_output_files' client_read_own_output_files
-- (0087): child_fk in (select id from parent where <parent's own read-
-- authorization condition>). Carries brand_visual_items' full read condition
-- (ownership AND status='published' AND visibility in ('client','public')),
-- not just ownership, so an attachment can never be readable by a client
-- when its parent item itself isn't.
drop policy if exists client_read_own_brand_visual_item_attachments on public.brand_visual_item_attachments;
create policy client_read_own_brand_visual_item_attachments on public.brand_visual_item_attachments
  for select to authenticated
  using (
    item_id in (
      select id from public.brand_visual_items
      where client_id in (select id from public.clients where profile_id = auth.uid())
      and status = 'published'
      and visibility in ('client','public')
    )
  );

-- No anon policy -- public access goes through the new
-- get-brand-visual-attachment-url edge function (token-gated on each
-- attachment's own public_token), same reasoning as brand_visual_items
-- itself and get-brand-visual-file-url.
