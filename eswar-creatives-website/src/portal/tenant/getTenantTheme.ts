import type { TenantTheme } from './tenant.types'
import { eswarConfig } from './tenants/eswar.config'
import { futurenormsConfig } from './tenants/futurenorms.config'
import { ACTIVE_TENANT_ID } from './activeTenantId'

const TENANTS: Record<string, TenantTheme> = {
  eswar: eswarConfig,
  futurenorms: futurenormsConfig,
}

// Single gateway for theme/branding values. Module visibility is not part of
// this — see tenant.types.ts. Returns null when ACTIVE_TENANT_ID doesn't
// match any known static config — deliberately not a silent fallback to
// eswarConfig. A mistyped or not-yet-provisioned tenant id must not quietly
// render a different tenant's brand.
export function getTenantTheme(): TenantTheme | null {
  const theme = TENANTS[ACTIVE_TENANT_ID]
  if (!theme) {
    console.error(`[tenant] Unknown VITE_TENANT_ID "${ACTIVE_TENANT_ID}" — no matching theme config.`)
    return null
  }
  return theme
}
