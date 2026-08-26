import type { TenantTheme } from './tenant.types'
import { eswarConfig } from './tenants/eswar.config'

const TENANTS: Record<string, TenantTheme> = {
  eswar: eswarConfig,
}

const DEFAULT_TENANT_ID = 'eswar'

// Single gateway for theme/branding values. Module visibility is not part of
// this — see tenant.types.ts.
export function getTenantTheme(): TenantTheme {
  const tenantId = import.meta.env.VITE_TENANT_ID || DEFAULT_TENANT_ID
  return TENANTS[tenantId] ?? TENANTS[DEFAULT_TENANT_ID]
}
