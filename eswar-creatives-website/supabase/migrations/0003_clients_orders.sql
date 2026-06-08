-- Phase 1 / 0003 — clients, orders, questionnaire_responses
-- The client record sits between a profile and everything they buy.

create table public.clients (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null unique references public.profiles(id) on delete cascade,
  company_name        text,
  contact_name        text,
  country             text,
  preferred_currency  text not null default 'INR',
  created_at          timestamptz not null default now()
);

create index clients_profile_idx on public.clients(profile_id);

create type public.order_status as enum (
  'questionnaire_pending',
  'quote_pending',
  'quote_sent',
  'advance_paid',
  'in_progress',
  'delivered',
  'closed'
);

create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients(id) on delete restrict,
  service_tier_id  uuid not null references public.service_tiers(id) on delete restrict,
  status           public.order_status not null default 'questionnaire_pending',
  created_at       timestamptz not null default now()
);

create index orders_client_idx on public.orders(client_id);
create index orders_status_idx on public.orders(status);

create table public.questionnaire_responses (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null unique references public.orders(id) on delete cascade,
  responses     jsonb not null,
  submitted_at  timestamptz not null default now()
);

create index questionnaire_order_idx on public.questionnaire_responses(order_id);
