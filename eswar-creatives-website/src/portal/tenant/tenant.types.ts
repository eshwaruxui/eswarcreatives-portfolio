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
  /** Microsoft Clarity project id for THIS tenant's deployment. Optional:
   *  a tenant with no Clarity project simply records nothing. Public value
   *  (it ships in page source), so a static config entry is fine. Each
   *  tenant gets its OWN Clarity project — sessions from one tenant's
   *  portal must never land in another tenant's analytics. */
  clarityProjectId?: string
  theme: {
    primary: string
    gold: string
    cream: string
    fontHeading: string
    fontBody: string
    logo: string
    /** Circular disc mark for the admin top bar's avatar slot. Optional:
     *  a tenant without one keeps the generated first-letter avatar. */
    mark?: string
  }
}
