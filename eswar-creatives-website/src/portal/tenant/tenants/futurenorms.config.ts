import type { TenantTheme } from '../tenant.types'
import futurenormsLogo from '../../../imports/futurenorms-logo.svg'

// Tenant 1 — futurenorms.in. Values sourced from FutureNorms' own Figma
// design-token export (`design-tokens/🎨 Primitives.Mode 1.tokens.json` +
// `🔗 Semantic Tokens.Light.tokens.json`, fileKey HNcvu8LtGe4eAfM7R5fA61):
// brand.primary -> violet.450 (#543e89), accent -> gold.400 (#d6a829),
// background.page -> neutral.0 (#ffffff). Both heading and body use Inter
// only, per explicit confirmation (no separate display serif for this
// tenant, unlike Eswar's Fraunces/Inter pairing).
export const futurenormsConfig: TenantTheme = {
  id: 'futurenorms',
  name: 'FutureNorms',
  domain: 'futurenorms.in',
  supabaseRef: 'ywppmokydzlxtqbfpzra',
  theme: {
    primary: '#543e89', // violet.450 / brand.primary
    gold: '#d6a829', // gold.400 / accent
    cream: '#ffffff', // neutral.0 / background.page
    fontHeading: "'Inter', system-ui, -apple-system, sans-serif",
    fontBody: "'Inter', system-ui, -apple-system, sans-serif",
    logo: futurenormsLogo,
  },
}
