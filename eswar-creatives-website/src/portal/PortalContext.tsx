// Admin-wide client scope. The global TopBar's client selector writes the
// chosen client id here; downstream admin pages (proposals, invoices, projects,
// mockups) read it to filter their Supabase queries. `null` means "All clients".
//
// The provider also owns the single fetch of the clients list so the TopBar
// dropdown and the per-page filter banner share one source of truth instead of
// each page loading clients on its own.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export type PortalClient = {
  id: string
  company_name: string | null
  contact_name: string | null
}

// Display label fallback chain, kept in one place so the dropdown, the banner
// and any future consumer all render a client name the same way.
export function clientLabel(c: PortalClient | null | undefined): string {
  return c?.company_name || c?.contact_name || '(unnamed)'
}

type PortalContextValue = {
  selectedClientId: string | null
  setSelectedClientId: (id: string | null) => void
  clients: PortalClient[]
  selectedClient: PortalClient | null
  clientsError: string | null
  reloadClients: () => void
}

const PortalContext = createContext<PortalContextValue | null>(null)

export function PortalProvider({ children }: { children: ReactNode }) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [clients, setClients] = useState<PortalClient[]>([])
  const [clientsError, setClientsError] = useState<string | null>(null)

  const reloadClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, company_name, contact_name')
        .order('company_name', { ascending: true })
      if (error) throw error
      setClients((data ?? []) as PortalClient[])
      setClientsError(null)
    } catch {
      // Never surface a raw Supabase string; the dropdown simply shows the note.
      setClientsError('Could not load clients. Refresh to try again.')
    }
  }, [])

  useEffect(() => {
    void reloadClients()
  }, [reloadClients])

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  )

  const value = useMemo<PortalContextValue>(
    () => ({
      selectedClientId,
      setSelectedClientId,
      clients,
      selectedClient,
      clientsError,
      reloadClients,
    }),
    [selectedClientId, clients, selectedClient, clientsError, reloadClients]
  )

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
}

export function usePortal(): PortalContextValue {
  const ctx = useContext(PortalContext)
  if (!ctx) throw new Error('usePortal must be used within a PortalProvider')
  return ctx
}
