// Route-level guard, paired with the nav-item filter in AdminShell. A direct
// link to a disabled module's route shouldn't work just because the nav item
// hiding it is gone. Only wrap routes that are actually gated (see
// route-config.ts) — ungated modules render unguarded, same as before this
// phase.
import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useTenantConfig } from './useTenantConfig'

export function ModuleGate({ moduleKey, children }: { moduleKey: string; children: ReactNode }) {
  const { modules, loading } = useTenantConfig()
  if (!loading && modules[moduleKey] === false) {
    return <Navigate to="/portal/admin" replace />
  }
  return <>{children}</>
}
