import { NavLink, Navigate, Outlet, useNavigate } from 'react-router'
import type { PortalProfile } from '../PortalGuard'
import {
  LayoutDashboard,
  Users,
  FileText,
  Receipt,
  FolderKanban,
  Compass,
  Megaphone,
  LogOut,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { PortalGuard } from '../PortalGuard'
import { tokens, fonts } from '../theme'

// Persistent admin layout: fixed cream sidebar on the left, scrollable content
// on the right where each child route renders via <Outlet />. Gated to the
// 'admin' role, mirroring the AdminSketchUpload guard pattern.
const NAV = [
  { to: '/portal/admin', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/portal/admin/clients', label: 'Clients', Icon: Users },
  { to: '/portal/admin/proposals', label: 'Proposals', Icon: FileText },
  { to: '/portal/admin/invoices', label: 'Invoices', Icon: Receipt },
  { to: '/portal/admin/projects', label: 'Projects', Icon: FolderKanban },
  { to: '/portal/admin/discovery', label: 'Discovery', Icon: Compass },
  { to: '/portal/admin/campaigns', label: 'Campaigns', Icon: Megaphone },
]

export function AdminShell() {
  return (
    <PortalGuard>
      {(profile) =>
        profile.role !== 'admin' ? (
          <Navigate to="/portal/dashboard" replace />
        ) : (
          <Shell profile={profile} />
        )
      }
    </PortalGuard>
  )
}

function Shell({ profile }: { profile: PortalProfile }) {
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/portal/login', { replace: true })
  }

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>Eswar Creatives</div>
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
        <button type="button" onClick={handleSignOut} style={styles.signOut}>
          <LogOut size={18} />
          <span>Sign out</span>
        </button>
      </aside>
      <main style={styles.content}>
        <div style={styles.contentInner}>
          <Outlet context={profile} />
        </div>
      </main>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: tokens.bg,
  },
  sidebar: {
    position: 'sticky',
    top: 0,
    alignSelf: 'flex-start',
    width: 240,
    flexShrink: 0,
    height: '100vh',
    background: tokens.bg,
    borderRight: `1px solid ${tokens.border}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    boxSizing: 'border-box',
  },
  brand: {
    fontFamily: fonts.heading,
    fontSize: 20,
    fontWeight: 600,
    color: tokens.primary,
    padding: '0 8px 24px',
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
    color: tokens.textMuted,
    textDecoration: 'none',
  },
  navItemActive: {
    background: tokens.tealLight,
    color: tokens.primary,
    fontWeight: 600,
  },
  signOut: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    marginTop: 8,
    borderRadius: 8,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    color: tokens.textMuted,
    textAlign: 'left',
  },
  content: {
    flex: 1,
    minWidth: 0,
    height: '100vh',
    overflowY: 'auto',
  },
  contentInner: {
    maxWidth: 1080,
    margin: '0 auto',
    padding: '40px 32px 64px',
  },
}
