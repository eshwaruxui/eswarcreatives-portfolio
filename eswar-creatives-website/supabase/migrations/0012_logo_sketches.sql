create table logo_sketch_sets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id),
  project_slug text not null,
  set_number int not null default 1,
  total_count int not null,
  created_at timestamptz default now()
);

create table logo_sketch_reviews (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references logo_sketch_sets(id),
  sketch_index int not null,
  file_name text not null,
  accepted boolean not null,
  reviewed_at timestamptz default now()
);

alter table logo_sketch_sets enable row level security;
alter table logo_sketch_reviews enable row level security;

create policy "client owns sets"
  on logo_sketch_sets for all
  using (client_id = auth.uid());

create policy "client owns reviews via set"
  on logo_sketch_reviews for all
  using (
    set_id in (
      select id from logo_sketch_sets where client_id = auth.uid()
    )
  );
