-- Phase 1 of the multi-tenant sprint: data foundation for live, in-database
-- module toggling (Phase 2 builds the toggle UI on top of this). Theme/
-- branding values stay in static per-tenant config files (see
-- src/portal/tenant/) since nobody needs to live-toggle a color; module
-- visibility is different and must be toggleable by the super admin without
-- a redeploy, which is why it lives here instead.

create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  domain text not null unique,
  supabase_ref text,
  created_at timestamptz not null default now()
);

create table if not exists tenant_modules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  module_key text not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  unique(tenant_id, module_key)
);

alter table tenants enable row level security;
alter table tenant_modules enable row level security;

create policy "Admin full access on tenants"
  on tenants for all to authenticated
  using ((select is_admin()));

create policy "Admin full access on tenant_modules"
  on tenant_modules for all to authenticated
  using ((select is_admin()));

-- Seed Tenant 0 (Eswar's own portal) with every real module enabled, using
-- the actual sidebar list confirmed against src/portal/admin/AdminShell.tsx's
-- NAV_BASE (Dashboard, Proposals, Invoices, Projects, Mockups, Discovery,
-- Campaigns, Outreach, Brand Visual Guide, QR Codes) — not the stale list
-- from the original sprint doc (invoicing, branding, crm, projects, mockups,
-- qrCode, outreach, brandVisualGuide, qualityControl, vendorManagement),
-- which does not match any real route or nav item in this codebase.
insert into tenants (slug, name, domain, supabase_ref)
values ('eswar', 'Eswar Creatives', 'eswarcreatives.in', 'urrinqwcrpivmvenupiu')
on conflict (slug) do nothing;

insert into tenant_modules (tenant_id, module_key, enabled)
select t.id, m.module_key, true
from tenants t
cross join (
  values
    ('dashboard'), ('proposals'), ('invoices'), ('projects'), ('mockups'),
    ('discovery'), ('campaigns'), ('outreach'), ('brandVisualGuide'), ('qrCode')
) as m(module_key)
where t.slug = 'eswar'
on conflict (tenant_id, module_key) do nothing;

notify pgrst, 'reload schema';
