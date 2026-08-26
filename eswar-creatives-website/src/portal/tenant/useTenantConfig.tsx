// Phase 2 of the multi-tenant sprint. Live, in-database module visibility —
// distinct from tenant.types.ts's static theme config. One shared fetch via
// Context, same idiom as PortalContext.tsx's clients list: AdminShell's nav
// and the Settings "Modules" toggle panel both read this and both see the
// same live state, so a toggle write updates the nav immediately with no
// reload. Always resolves to Tenant 0 ('eswar') for now — per-domain
// resolution is Phase 3 territory.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../../lib/supabase'

const TENANT_SLUG = 'eswar'

export type TenantModules = Record<string, boolean>

type TenantConfigValue = {
  tenant: { id: string; name: string } | null
  modules: TenantModules
  loading: boolean
  error: string | null
  // Optimistic: flips the local map immediately, rolls back on write failure.
  // Returns whether the write succeeded, so a caller can show its own toast.
  setModuleEnabled: (moduleKey: string, enabled: boolean) => Promise<boolean>
}

const TenantConfigContext = createContext<TenantConfigValue | null>(null)

export function TenantConfigProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<{ id: string; name: string } | null>(null)
  const [modules, setModules] = useState<TenantModules>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: tenantRow, error: tenantErr } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('slug', TENANT_SLUG)
        .maybeSingle()
      if (cancelled) return
      if (tenantErr || !tenantRow) {
        setError('Could not load tenant configuration.')
        setLoading(false)
        return
      }
      const { data: moduleRows, error: modulesErr } = await supabase
        .from('tenant_modules')
        .select('module_key, enabled')
        .eq('tenant_id', tenantRow.id)
      if (cancelled) return
      if (modulesErr) {
        setError('Could not load module configuration.')
        setLoading(false)
        return
      }
      const map: TenantModules = {}
      for (const row of moduleRows ?? []) map[row.module_key as string] = row.enabled as boolean
      setTenant({ id: tenantRow.id as string, name: tenantRow.name as string })
      setModules(map)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const setModuleEnabled = useCallback(
    async (moduleKey: string, enabled: boolean): Promise<boolean> => {
      if (!tenant) return false
      const previous = modules[moduleKey]
      setModules((m) => ({ ...m, [moduleKey]: enabled }))
      const { error: writeErr } = await supabase
        .from('tenant_modules')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('tenant_id', tenant.id)
        .eq('module_key', moduleKey)
      if (writeErr) {
        setModules((m) => ({ ...m, [moduleKey]: previous }))
        return false
      }
      return true
    },
    [tenant, modules]
  )

  const value = useMemo(
    () => ({ tenant, modules, loading, error, setModuleEnabled }),
    [tenant, modules, loading, error, setModuleEnabled]
  )

  return <TenantConfigContext.Provider value={value}>{children}</TenantConfigContext.Provider>
}

// modules[key] === false hides explicitly; undefined (still loading, or a
// module row that doesn't exist yet) fails open, matching every seeded
// row's true default and avoiding a flash-hidden-then-shown nav item on
// every fresh session.
export function useTenantConfig(): TenantConfigValue {
  const ctx = useContext(TenantConfigContext)
  if (!ctx) throw new Error('useTenantConfig must be used within a TenantConfigProvider')
  return ctx
}
