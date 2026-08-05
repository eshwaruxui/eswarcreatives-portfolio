-- 0087_project_outputs_schema.sql
-- Outputs tab: a folder/file library for completed deliverables, separate
-- from the existing stage-scoped attachments and the legacy `assets` table.
-- project_output_folders is a self-referencing tree (arbitrary nesting).
-- project_output_files.folder_id is nullable so files can live at project
-- root, not forced into a folder. RLS mirrors the stage-attachments pattern
-- (0077): admin full access via is_admin(), client SELECT-only scoped to
-- their own project via clients.profile_id = auth.uid().

----------------------------------------------------------------------
-- 1. Folders.
----------------------------------------------------------------------
create table if not exists public.project_output_folders (
  id                uuid        primary key default gen_random_uuid(),
  project_id        uuid        not null references public.projects(id) on delete cascade,
  parent_folder_id  uuid        references public.project_output_folders(id) on delete cascade,
  name              text        not null,
  sort_order        integer     not null default 0,
  created_by        uuid        references public.profiles(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists project_output_folders_project_idx
  on public.project_output_folders(project_id);
create index if not exists project_output_folders_parent_idx
  on public.project_output_folders(parent_folder_id);

alter table public.project_output_folders enable row level security;

drop policy if exists admin_all_output_folders on public.project_output_folders;
create policy admin_all_output_folders on public.project_output_folders
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists client_read_own_output_folders on public.project_output_folders;
create policy client_read_own_output_folders on public.project_output_folders
  for select to authenticated
  using (
    project_id in (
      select p.id from public.projects p
      join public.clients c on c.id = p.client_id
      where c.profile_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- 2. Cycle prevention. New logic, no prior art elsewhere in this schema
--    (the existing project_stages reorder is a flat list, not a tree).
--    Walks the parent chain of the NEW parent_folder_id; raises if it
--    hits the row being moved. Defense in depth alongside the
--    client-side ancestor check in the drag-move UI.
----------------------------------------------------------------------
create or replace function public.prevent_output_folder_cycle()
returns trigger
language plpgsql
as $$
declare
  v_walk uuid := new.parent_folder_id;
begin
  if new.parent_folder_id is null then
    return new;
  end if;
  if new.parent_folder_id = new.id then
    raise exception 'OUTPUT_FOLDER_CYCLE';
  end if;
  while v_walk is not null loop
    if v_walk = new.id then
      raise exception 'OUTPUT_FOLDER_CYCLE';
    end if;
    select parent_folder_id into v_walk
      from public.project_output_folders
     where id = v_walk;
  end loop;
  return new;
end;
$$;

drop trigger if exists trg_prevent_output_folder_cycle on public.project_output_folders;
create trigger trg_prevent_output_folder_cycle
  before insert or update of parent_folder_id on public.project_output_folders
  for each row execute function public.prevent_output_folder_cycle();

----------------------------------------------------------------------
-- 3. Files. public_token/expiry mirror the invoice share-link pattern
--    (0068) for per-file public links.
----------------------------------------------------------------------
create table if not exists public.project_output_files (
  id                       uuid        primary key default gen_random_uuid(),
  project_id               uuid        not null references public.projects(id) on delete cascade,
  folder_id                uuid        references public.project_output_folders(id) on delete set null,
  file_name                text        not null,
  storage_path             text        not null,
  file_size                bigint,
  file_type                text,
  sort_order               integer     not null default 0,
  uploaded_by              uuid        references public.profiles(id),
  uploaded_at              timestamptz not null default now(),
  public_token             uuid        not null default gen_random_uuid(),
  public_token_expires_at  timestamptz
);

create unique index if not exists project_output_files_public_token_idx
  on public.project_output_files(public_token);
create index if not exists project_output_files_project_idx
  on public.project_output_files(project_id);
create index if not exists project_output_files_folder_idx
  on public.project_output_files(folder_id);

alter table public.project_output_files enable row level security;

drop policy if exists admin_all_output_files on public.project_output_files;
create policy admin_all_output_files on public.project_output_files
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists client_read_own_output_files on public.project_output_files;
create policy client_read_own_output_files on public.project_output_files
  for select to authenticated
  using (
    project_id in (
      select p.id from public.projects p
      join public.clients c on c.id = p.client_id
      where c.profile_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- 4. Storage bucket + RLS (private, mirrors 0077's stage-attachments
--    setup). Path convention: {project_id}/{random_id}_{filename} --
--    deliberately FLAT, no folder segment, so moving a file between
--    folders is a single folder_id UPDATE, never a storage rename/copy.
----------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-outputs', 'project-outputs', false, 52428800, null)
on conflict (id) do nothing;

drop policy if exists admin_all_project_outputs on storage.objects;
create policy admin_all_project_outputs on storage.objects
  for all
  using      (bucket_id = 'project-outputs' and public.is_admin())
  with check (bucket_id = 'project-outputs' and public.is_admin());

drop policy if exists client_read_own_project_outputs on storage.objects;
create policy client_read_own_project_outputs on storage.objects
  for select
  using (
    bucket_id = 'project-outputs'
    and ((storage.foldername(name))[1])::uuid in (
      select p.id from public.projects p
      join public.clients c on c.id = p.client_id
      where c.profile_id = auth.uid()
    )
  );
