-- 0111_tenant_modules_quotations_key.sql
-- Adds the 'quotations' module_key. Applied to the eswar tenant's own
-- project (eswarcreatives) as `false` — his project never gets the
-- quotations schema (Newgen-specific for now), and NAV_BASE is shared code,
-- so without an explicit false row here the nav item would fail OPEN and
-- show a tab pointing at a table that doesn't exist on his project (see
-- useTenantConfig's fail-open comment: an absent row reads as visible).
--
-- Newgen's own tenant_modules row (enabled = true) was seeded directly on
-- her project at provisioning time, not via this file — same reasoning as
-- 0109's own seed section: baking another tenant's identity into a shared
-- migration file is the exact category-1 landmine this codebase already
-- hit once (TENANT_PROVISIONING_LOG.md).

insert into tenant_modules (tenant_id, module_key, enabled)
select t.id, 'quotations', false
from tenants t
where t.slug = 'eswar'
on conflict (tenant_id, module_key) do nothing;

notify pgrst, 'reload schema';
