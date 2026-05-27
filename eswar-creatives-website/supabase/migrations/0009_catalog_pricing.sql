-- Phase 2 / 0009 — catalog: pricing + features for public marketing pages
-- Adds the fields the Atelier services pages need to render 3-tier pricing
-- cards from the database. Additive only; existing rows keep working
-- (new columns are nullable or defaulted).

alter table public.services
  add column if not exists tagline text;

alter table public.service_tiers
  add column if not exists starting_price_cents bigint,
  add column if not exists currency             text,
  add column if not exists features             jsonb   not null default '[]'::jsonb,
  add column if not exists is_recommended       boolean not null default false;

-- currency must be one of the two we support.
alter table public.service_tiers
  drop constraint if exists service_tiers_currency_check;
alter table public.service_tiers
  add  constraint service_tiers_currency_check
  check (currency is null or currency in ('INR', 'USD'));

-- features must always be a JSON array (not an object/scalar).
alter table public.service_tiers
  drop constraint if exists service_tiers_features_is_array;
alter table public.service_tiers
  add  constraint service_tiers_features_is_array
  check (jsonb_typeof(features) = 'array');
