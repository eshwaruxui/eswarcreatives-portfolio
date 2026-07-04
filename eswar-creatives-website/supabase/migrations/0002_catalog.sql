-- Phase 1 / 0002 — services + service_tiers (catalog)
-- Public catalog of what we sell. Clients have read-only access (see 0007).

create type public.service_vertical as enum ('brand_identity', 'saas_design');

create table public.services (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  vertical     public.service_vertical not null,
  description  text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

create index services_vertical_idx on public.services(vertical);
create index services_active_idx on public.services(is_active);

create table public.service_tiers (
  id                uuid primary key default gen_random_uuid(),
  service_id        uuid not null references public.services(id) on delete cascade,
  tier_name         text not null,
  tier_description  text,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now()
);

create index service_tiers_service_idx on public.service_tiers(service_id);
create index service_tiers_sort_idx on public.service_tiers(service_id, sort_order);
