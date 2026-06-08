-- Phase 1 / 0004 — quotes + payments
-- Money flow. We store only processor references, never card data.

create type public.quote_status as enum ('draft', 'sent', 'accepted', 'expired', 'void');

create table public.quotes (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid not null references public.orders(id) on delete cascade,
  total_amount     numeric(12, 2) not null check (total_amount >= 0),
  currency         text not null default 'INR',
  advance_percent  integer not null default 50 check (advance_percent between 0 and 100),
  status           public.quote_status not null default 'draft',
  issued_at        timestamptz not null default now()
);

create index quotes_order_idx on public.quotes(order_id);
create index quotes_status_idx on public.quotes(status);

create type public.payment_processor as enum ('razorpay', 'stripe');
create type public.payment_type      as enum ('advance', 'final');
create type public.payment_status    as enum ('pending', 'succeeded', 'failed', 'refunded');

create table public.payments (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.orders(id) on delete restrict,
  quote_id             uuid not null references public.quotes(id) on delete restrict,
  amount               numeric(12, 2) not null check (amount >= 0),
  currency             text not null default 'INR',
  processor            public.payment_processor not null,
  processor_reference  text not null,
  payment_type         public.payment_type not null,
  status               public.payment_status not null default 'pending',
  paid_at              timestamptz,
  created_at           timestamptz not null default now(),
  unique (processor, processor_reference)
);

create index payments_order_idx on public.payments(order_id);
create index payments_quote_idx on public.payments(quote_id);
create index payments_status_idx on public.payments(status);
