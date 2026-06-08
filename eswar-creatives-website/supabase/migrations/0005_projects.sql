-- Phase 1 / 0005 — projects, project_phases, invoices, assets, decision_log
-- The delivery side of the system: what's actually being made for a client.

create type public.project_status       as enum ('active', 'on_hold', 'delivered', 'closed');
create type public.project_phase_status as enum ('pending', 'in_progress', 'blocked', 'done');

create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete restrict,
  -- Denormalized from orders.client_id so RLS checks don't need a join.
  client_id       uuid not null references public.clients(id) on delete restrict,
  title           text not null,
  current_phase   text,
  status          public.project_status not null default 'active',
  created_at      timestamptz not null default now()
);

create index projects_client_idx on public.projects(client_id);
create index projects_order_idx  on public.projects(order_id);
create index projects_status_idx on public.projects(status);

create table public.project_phases (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  phase_name    text not null,
  phase_status  public.project_phase_status not null default 'pending',
  sort_order    integer not null default 0,
  notes         text,
  created_at    timestamptz not null default now()
);

create index project_phases_project_idx on public.project_phases(project_id);
create index project_phases_sort_idx    on public.project_phases(project_id, sort_order);

create type public.invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'void');

create table public.invoices (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete restrict,
  invoice_number  text not null unique,
  amount          numeric(12, 2) not null check (amount >= 0),
  currency        text not null default 'INR',
  status          public.invoice_status not null default 'draft',
  due_date        date,
  issued_at       timestamptz,
  created_at      timestamptz not null default now()
);

create index invoices_project_idx on public.invoices(project_id);
create index invoices_status_idx  on public.invoices(status);

create table public.assets (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  file_name    text not null,
  file_url     text not null,
  uploaded_at  timestamptz not null default now()
);

create index assets_project_idx on public.assets(project_id);

create table public.decision_log (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  decision_text  text not null,
  decided_by     uuid references public.profiles(id) on delete set null,
  decided_at     timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index decision_log_project_idx on public.decision_log(project_id);
