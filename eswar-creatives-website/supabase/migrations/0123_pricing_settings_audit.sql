-- 0123_pricing_settings_audit.sql
-- Build 3 (pricing settings), Phase 4: record who changed what and when on
-- the tables the new Settings > Pricing screen edits.
--
-- quotation_pricing_settings already carried updated_at; the same now
-- exists on rates, curves and curve steps, plus updated_by everywhere. A
-- BEFORE INSERT/UPDATE trigger stamps both, so no write path (the panel,
-- the SQL editor, a future import) can forget to. auth.uid() is null
-- outside an authenticated session, which is honest: a migration's change
-- shows a time but no person.
--
-- Additive only: no row is modified or deleted, and existing behaviour is
-- unchanged (defaults fill the new columns).

alter table public.quotation_item_rates
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

alter table public.quotation_curves
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

alter table public.quotation_curve_steps
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

alter table public.quotation_pricing_settings
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

create or replace function public.touch_pricing_audit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  -- Only stamp a person when one exists as a profile; a service-role or
  -- SQL-editor write keeps null rather than failing the FK.
  new.updated_by := (select p.id from public.profiles p where p.id = auth.uid());
  return new;
end;
$$;

drop trigger if exists touch_pricing_audit_trg on public.quotation_item_rates;
create trigger touch_pricing_audit_trg
  before insert or update on public.quotation_item_rates
  for each row execute function public.touch_pricing_audit();

drop trigger if exists touch_pricing_audit_trg on public.quotation_curves;
create trigger touch_pricing_audit_trg
  before insert or update on public.quotation_curves
  for each row execute function public.touch_pricing_audit();

drop trigger if exists touch_pricing_audit_trg on public.quotation_curve_steps;
create trigger touch_pricing_audit_trg
  before insert or update on public.quotation_curve_steps
  for each row execute function public.touch_pricing_audit();

drop trigger if exists touch_pricing_audit_trg on public.quotation_pricing_settings;
create trigger touch_pricing_audit_trg
  before insert or update on public.quotation_pricing_settings
  for each row execute function public.touch_pricing_audit();

revoke execute on function public.touch_pricing_audit() from public, anon, authenticated;

notify pgrst, 'reload schema';
