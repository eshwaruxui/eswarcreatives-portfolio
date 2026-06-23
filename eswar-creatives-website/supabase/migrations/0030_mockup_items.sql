-- Phase 3 / 0030 — mockup_items (Mockups module)
-- One image inside a mockup set. storage_path is the in-bucket path
-- `{set_id}/{filename}` in the private 'mockups' bucket (see 0032). A client can
-- read an item only when it belongs to one of their published sets.

create table if not exists mockup_items (
  id           uuid primary key default gen_random_uuid(),
  set_id       uuid references mockup_sets(id) on delete cascade,
  label        text not null,
  storage_path text not null,
  sort_order   integer default 0,
  created_at   timestamptz default now()
);

alter table mockup_items enable row level security;

drop policy if exists "Admin full access" on mockup_items;
create policy "Admin full access" on mockup_items
  for all to authenticated
  using (public.is_admin());

drop policy if exists "Client read own set" on mockup_items;
create policy "Client read own set" on mockup_items
  for select to authenticated
  using (
    set_id in (
      select ms.id from mockup_sets ms
      join clients c on c.id = ms.client_id
      where c.profile_id = auth.uid() and ms.status = 'published'
    )
  );
