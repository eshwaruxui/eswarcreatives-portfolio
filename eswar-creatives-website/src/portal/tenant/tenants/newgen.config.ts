import type { TenantTheme } from '../tenant.types'
import newgenLogo from '../../../imports/newgen-logo.svg'

// Tenant 2 — Newgen Event Studio (portal.newgeneventstudio.com), Quotation
// Module Phase 1. Portal chrome uses Inter throughout (per the brief — the
// Cormorant Garamond/Futura PT pairing is the Step 4 quotation *document's*
// own brand, not the admin/client UI's, and lives in
// src/portal/components/quotation/documentThemes.ts instead of here, so it
// never leaks into this tenant's portal chrome).
export const newgenConfig: TenantTheme = {
  id: 'newgen',
  name: 'Newgen Event Studio',
  domain: 'portal.newgeneventstudio.com',
  supabaseRef: 'mqkvguzyjvhlnilmollp',
  // No Clarity id yet: the Newgen Clarity project has to be created in the
  // Clarity dashboard first. Until then this deployment records nothing —
  // which is correct; it must NOT fall back to another tenant's project.
  // Once created, set the id here (or via VITE_CLARITY_PROJECT_ID on the
  // Pages project, which overrides this file without a code change).

  theme: {
    primary: '#024C4F', // Newgen teal
    gold: '#D5B067', // Newgen gold
    cream: '#FAF8F4', // Newgen cream
    fontHeading: "'Inter', system-ui, -apple-system, sans-serif",
    fontBody: "'Inter', system-ui, -apple-system, sans-serif",
    logo: newgenLogo,
  },
}
