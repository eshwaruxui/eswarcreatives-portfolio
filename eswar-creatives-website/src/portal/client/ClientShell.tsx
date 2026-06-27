// Persistent client portal layout. ClientNav mounts once here and stays mounted
// for the whole session; each client page renders into the <Outlet> below it, so
// switching tabs swaps only the page content and the nav never unmounts or
// flashes. Gated to the client role; the resolved profile is handed to pages via
// the outlet context (mirrors AdminShell).
import { Outlet } from 'react-router'
import { PortalGuard } from '../PortalGuard'
import { ClientNav } from './ClientNav'

export function ClientShell() {
  return (
    <PortalGuard requireRole="client">
      {(profile) => (
        <>
          <ClientNav profile={profile} />
          <Outlet context={profile} />
        </>
      )}
    </PortalGuard>
  )
}
