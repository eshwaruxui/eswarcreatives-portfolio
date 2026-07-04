// Persistent client portal layout. ClientNav mounts once here and stays mounted
// for the whole session; each client page renders into the <Outlet> below it, so
// switching tabs swaps only the page content and the nav never unmounts or
// flashes. Gated to the client role; the resolved profile is handed to pages via
// the outlet context (mirrors AdminShell).
//
// On mobile the bottom tab bar adds CLIENT_BOTTOM_NAV_HEIGHT to the viewport, so
// the main content needs matching paddingBottom to avoid content sitting behind it.
import { Outlet } from 'react-router'
import { PortalGuard } from '../PortalGuard'
import { ClientNav, CLIENT_BOTTOM_NAV_HEIGHT } from './ClientNav'
import { useBreakpoint } from '../hooks/useBreakpoint'

export function ClientShell() {
  const { isMobile } = useBreakpoint()
  return (
    <PortalGuard requireRole="client">
      {(profile) => (
        <>
          <ClientNav profile={profile} />
          <div
            style={
              isMobile
                ? { paddingBottom: `calc(${CLIENT_BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom, 0px))` }
                : undefined
            }
          >
            <Outlet context={profile} />
          </div>
        </>
      )}
    </PortalGuard>
  )
}
