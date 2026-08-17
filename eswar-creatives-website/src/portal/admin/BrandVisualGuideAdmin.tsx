// Admin Brand Visual Guide page, /portal/admin/brand-visual-guide — a
// top-level sidebar item (after Outreach), promoted out of ClientPanel's
// tab. Reuses the same global "All clients" selector every other
// client-scoped sidebar page (Proposals/Invoices/Projects/Mockups/
// Campaigns) already shares via usePortal()/ClientFilterBanner, rather than
// inventing a picker of its own. Unlike those pages, a Guidelines/Assets/
// Templates view only makes sense for one client at a time — there's no
// "every client's guide in one table" — so no client selected renders a
// prompt instead of an all-clients list.
import { Palette } from 'lucide-react'
import { usePortal, clientLabel } from '../PortalContext'
import { PageHeader, EmptyState } from './ui'
import { ClientFilterBanner } from './ClientFilterBanner'
import { BrandVisualTab } from './BrandVisualTab'

export function BrandVisualGuideAdmin() {
  const { selectedClientId, selectedClient } = usePortal()

  return (
    <>
      <PageHeader title="Brand Visual Guide" />
      <ClientFilterBanner />
      {!selectedClientId ? (
        <EmptyState
          icon={<Palette size={28} />}
          heading="Choose a client"
          body='Pick a client from the "All clients" selector above to view and manage their Brand Visual Guide.'
        />
      ) : (
        <BrandVisualTab clientId={selectedClientId} clientLabel={clientLabel(selectedClient)} />
      )}
    </>
  )
}
