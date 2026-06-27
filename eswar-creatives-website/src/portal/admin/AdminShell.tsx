import { NavLink, Navigate, Outlet } from 'react-router'
import type { PortalProfile } from '../PortalGuard'
import {
  LayoutDashboard,
  FileText,
  Receipt,
  FolderKanban,
  Images,
  Compass,
  Megaphone,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { PortalGuard } from '../PortalGuard'
import { PortalProvider } from '../PortalContext'
import { tokens, t, fonts } from '../theme'
import { TopBar } from './TopBar'
import { ToastHost } from './toast'

// Persistent admin layout: a global TopBar (brand + client selector + settings)
// above a fixed cream sidebar and scrollable content where each child route
// renders via <Outlet />. Gated to the 'admin' role, mirroring the
// AdminSketchUpload guard pattern. Clients are managed from the TopBar settings
// panel, so they no longer appear in the sidebar nav.
const NAV = [
  { to: '/portal/admin', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/portal/admin/proposals', label: 'Proposals', Icon: FileText },
  { to: '/portal/admin/invoices', label: 'Invoices', Icon: Receipt },
  { to: '/portal/admin/projects', label: 'Projects', Icon: FolderKanban },
  { to: '/portal/admin/mockups', label: 'Mockups', Icon: Images },
  { to: '/portal/admin/discovery', label: 'Discovery', Icon: Compass },
  { to: '/portal/admin/campaigns', label: 'Campaigns', Icon: Megaphone },
]

export function AdminShell() {
  return (
    <PortalGuard>
      {(profile) =>
        // H1 / H5: owner is the super-admin role, so it shares the admin area;
        // anyone else is sent back to login rather than to a broken path.
        profile.role !== 'admin' && profile.role !== 'owner' ? (
          <Navigate to="/portal/login" replace />
        ) : (
          <PortalProvider>
            <Shell profile={profile} />
          </PortalProvider>
        )
      }
    </PortalGuard>
  )
}

function Shell({ profile }: { profile: PortalProfile }) {
  return (
    <div style={styles.layout}>
      <ToastHost />
      <TopBar />
      <div style={styles.body}>
        <aside style={styles.sidebar}>
          <nav style={styles.nav}>
            {NAV.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                style={({ isActive }) => ({
                  ...styles.navItem,
                  ...(isActive ? styles.navItemActive : null),
                })}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        <main style={styles.content}>
          <div style={styles.contentInner}>
            <Outlet context={profile} />
          </div>
        </main>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  layout: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: tokens.bg,
  },
  body: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
  },
  sidebar: {
    position: 'sticky',
    top: 56,
    alignSelf: 'flex-start',
    width: 240,
    flexShrink: 0,
    height: 'calc(100vh - 56px)',
    background: tokens.bg,
    borderRight: `1px solid ${tokens.border}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    boxSizing: 'border-box',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    color: t.text.secondary,
    textDecoration: 'none',
  },
  navItemActive: {
    background: tokens.tealLight,
    color: tokens.primary,
    fontWeight: 600,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  contentInner: {
    maxWidth: 1080,
    margin: '0 auto',
    padding: '40px 32px 64px',
  },
}
