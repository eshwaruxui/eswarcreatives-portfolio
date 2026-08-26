// Phase 1 of the multi-tenant sprint — theme/branding shape only.
// Module visibility is intentionally NOT part of this static type: it is
// controlled live via the `tenant_modules` table (see the Phase 1 migration),
// not via a static config file, since a super admin must be able to toggle a
// tenant's visible sidebar sections without a redeploy.

export interface TenantTheme {
  id: string
  name: string
  domain: string
  supabaseRef: string
  theme: {
    primary: string
    gold: string
    cream: string
    fontHeading: string
    fontBody: string
    logo: string
  }
}
