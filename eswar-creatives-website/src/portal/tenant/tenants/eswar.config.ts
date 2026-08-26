import type { TenantTheme } from '../tenant.types'
import eswarLogo from '../../../imports/eswar-logo.svg'

// Tenant 0 — eswarcreatives.in's own portal. Values extracted from the live
// src/portal/theme.ts (tokens.primary / tokens.gold / tokens.bg, fonts), not
// from the original sprint brief, which had drifted from what's actually
// live: it named #005F5A as the primary teal (that value only exists in
// ClientLightbox's own self-contained dark palette, unrelated to the brand
// teal), #C9A44C as gold (appears nowhere in the codebase), and #FAF8F4 as
// the cream (retired as the page canvas on 9 August 2026, replaced by
// tokens.bg / #FAFAF9). Extracting the wrong values here would defeat the
// point of Tenant 0 being the source of truth future tenants diverge from.
export const eswarConfig: TenantTheme = {
  id: 'eswar',
  name: 'Eswar Creatives',
  domain: 'eswarcreatives.in',
  supabaseRef: 'urrinqwcrpivmvenupiu',
  theme: {
    primary: '#024C4F', // tokens.primary / t.border.brand — deep teal, active/selected states
    gold: '#D5B067', // tokens.gold
    cream: '#FAFAF9', // tokens.bg — Figma background/subtle (neutral.10), successor to the old #FAF8F4 cream
    fontHeading: "'Fraunces', Georgia, 'Times New Roman', serif", // fonts.heading
    fontBody: "'Inter', system-ui, -apple-system, sans-serif", // fonts.body
    logo: eswarLogo, // PortalNav's own import — Vite-resolved so this holds a real build URL, not a dev-only path
  },
}
