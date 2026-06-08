-- Phase 1 / 0008 — base privilege grants
-- Tables created via the SQL Editor don't inherit Supabase's usual ALTER DEFAULT
-- PRIVILEGES, so service_role (and authenticated) lack base SELECT/INSERT/...
-- privileges even though service_role has BYPASSRLS. Grant them explicitly.
--
-- Note: writes by `authenticated` are still gated by RLS — clients have no
-- INSERT/UPDATE/DELETE policy on any table in Phase 1, so default-deny blocks
-- them at the row level. Owners (via is_owner()) have full-write policies.

grant usage on schema public to service_role, authenticated, anon;

-- service_role: full DML on all current and future public tables.
grant select, insert, update, delete on all tables    in schema public to service_role;
grant usage,  select                  on all sequences in schema public to service_role;
grant execute                         on all functions in schema public to service_role;

-- authenticated: full DML on tables (RLS gates which rows are visible/writable).
grant select, insert, update, delete on all tables    in schema public to authenticated;
grant usage,  select                  on all sequences in schema public to authenticated;
grant execute                         on all functions in schema public to authenticated;

-- Auto-grant for any future tables/sequences/functions added to this schema.
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role, authenticated;
alter default privileges in schema public
  grant usage, select on sequences to service_role, authenticated;
alter default privileges in schema public
  grant execute on functions to service_role, authenticated;
