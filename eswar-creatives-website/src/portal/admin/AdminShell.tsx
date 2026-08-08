import { NavLink, Navigate, Outlet, useLocation } from 'react-router'
import type { PortalProfile } from '../PortalGuard'
import {
  LayoutDashboard,
  FileText,
  Receipt,
  FolderKanban,
  Images,
  Compass,
  Megaphone,
  Send,
  Users,
  X,
} from 'lucide-react'
import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'
import { PortalGuard } from '../PortalGuard'
import { PortalProvider } from '../PortalContext'
import { tokens, t, fonts, motionTokens } from '../theme'
import { TopBar } from './TopBar'
import { ToastHost } from './toast'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { supabase } from '../../lib/supabase'
import { mono } from './ui'

type NavItem = {
  to: string
  label: string
  Icon: React.ComponentType<{ size?: number; color?: string }>
  end?: boolean
  badge?: number
}

// Persistent admin layout: a global TopBar (brand + client selector + settings)
// above a fixed cream sidebar and scrollable content where each child route
// renders via <Outlet />. Gated to the 'admin' role, mirroring the
// AdminSketchUpload guard pattern. Clients are managed from the TopBar settings
// panel, so they no longer appear in the desktop sidebar nav.
const NAV_BASE: NavItem[] = [
  { to: '/portal/admin', label: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/portal/admin/proposals', label: 'Proposals', Icon: FileText },
  { to: '/portal/admin/invoices', label: 'Invoices', Icon: Receipt },
  { to: '/portal/admin/projects', label: 'Projects', Icon: FolderKanban },
  { to: '/portal/admin/mockups', label: 'Mockups', Icon: Images },
  { to: '/portal/admin/discovery', label: 'Discovery', Icon: Compass },
  { to: '/portal/admin/campaigns', label: 'Campaigns', Icon: Megaphone },
  { to: '/portal/admin/outreach', label: 'Outreach', Icon: Send },
]

// Mobile drawer only: the desktop sidebar doesn't surface a Clients route (it's
// reached via the TopBar's client selector / "+ Add client" / Settings panel),
// but on mobile that selector is hidden for space, so the drawer adds a direct
// Clients entry after Dashboard so the list stays reachable.
const MOBILE_NAV: NavItem[] = [
  NAV_BASE[0],
  { to: '/portal/admin/clients', label: 'Clients', Icon: Users },
  ...NAV_BASE.slice(1),
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
  // Light pass for iPad (768px): narrow sidebar prevents horizontal scroll.
  // Desktop (1024px+): full-width sidebar with labels. Below 768px the sidebar
  // is replaced entirely by a hamburger-triggered drawer (see MobileNavDrawer).
  const { isMobile, isTablet } = useBreakpoint()
  const [outreachDue, setOutreachDue] = useState(0)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    // scheduled_for is timestamptz (migration 0092) — "due" means anything
    // up through the end of today, not just before midnight, so the filter
    // has to be the start of tomorrow, not today's bare date.
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    supabase
      .from('outreach_touches')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .lt('scheduled_for', `${tomorrow}T00:00:00.000Z`)
      // Mirrors the Due Today/Overdue queue filter in TodayTab.tsx — a
      // non-null draft_confirmed_at means it's already been sent/deferred
      // and is waiting on the auto-send cron, not actually due.
      .is('draft_confirmed_at', null)
      .then(({ count }) => setOutreachDue(count ?? 0))
  }, [])

  // Close the drawer automatically on route change (e.g. Escape-free navigation).
  useEffect(() => { setMobileNavOpen(false) }, [location.pathname])

  // Body scroll-lock while the drawer is open; restored on close/unmount.
  useEffect(() => {
    if (!mobileNavOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileNavOpen])

  const NAV: NavItem[] = NAV_BASE.map((item) =>
    item.to === '/portal/admin/outreach'
      ? { ...item, badge: outreachDue }
      : item
  )
  const MOBILE_NAV_WITH_BADGE: NavItem[] = MOBILE_NAV.map((item) =>
    item.to === '/portal/admin/outreach'
      ? { ...item, badge: outreachDue }
      : item
  )

  return (
    <div className="ec-admin-shell" style={styles.layout}>
      {/* overflow-x must clip, not hide. `overflow-x: hidden` with an implied
          `overflow-y: visible` makes the browser compute overflow-y to `auto`
          (CSS spec: visible alongside a non-visible, non-clip value becomes
          auto). That turns this element into the nearest scrolling ancestor
          for every `position: sticky` descendant. Because it is min-height
          100vh and grows with content rather than scrolling internally, those
          descendants were sticking to a box that never moves, which is to say
          not sticking at all: TopBar and the sidebar both scrolled straight
          off the top of the viewport on every admin route.
          `overflow-x: clip` clips exactly the same horizontal overflow the
          mobile pass added this for, but does not create a scroll container,
          so overflow-y stays visible and sticky resolves against the viewport
          again. The `hidden` line is kept first as a fallback for browsers
          without `clip`, which land on today's behaviour rather than losing
          the horizontal clipping entirely. */}
      <style>{`.ec-admin-shell { overflow-x: hidden; overflow-x: clip; }`}</style>
      <ToastHost />
      <TopBar onMenuClick={() => setMobileNavOpen(true)} />
      <div style={styles.body}>
        {!isMobile && (
          <aside style={{ ...styles.sidebar, width: isTablet ? 180 : 240 }}>
            <nav style={styles.nav}>
              {NAV.map(({ to, label, Icon, end, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  style={({ isActive }) => ({
                    ...styles.navItem,
                    ...(isTablet ? styles.navItemTablet : null),
                    ...(isActive ? styles.navItemActive : null),
                  })}
                >
                  <Icon size={18} />
                  {/* Hide label text on tablet to reclaim horizontal space. */}
                  {!isTablet && <span style={{ flex: 1 }}>{label}</span>}
                  {!isTablet && badge != null && badge > 0 && (
                    <span style={styles.navBadge}>
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </aside>
        )}
        <main style={styles.content}>
          <div
            style={{
              ...styles.contentInner,
              padding: isMobile ? '24px 16px 64px' : isTablet ? '32px 16px 64px' : '40px 32px 64px',
            }}
          >
            <Outlet context={profile} />
          </div>
        </main>
      </div>

      {isMobile && (
        <MobileNavDrawer
          items={MOBILE_NAV_WITH_BADGE}
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />
      )}
    </div>
  )
}

// Mobile hamburger drawer: replaces the sidebar entirely below 768px. Slides in
// from the left (transform only, motionTokens.durationBase) above a scrim; sits
// above SidePanel (z-201) and below nothing else on mobile since the settings
// panel and mobile nav are mutually exclusive entry points from the TopBar.
function MobileNavDrawer({
  items,
  open,
  onClose,
}: {
  items: NavItem[]
  open: boolean
  onClose: () => void
}) {
  // Keep mounted briefly after close so the slide-out transform can animate.
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const id = requestAnimationFrame(() => setShown(true))
      return () => cancelAnimationFrame(id)
    }
    setShown(false)
    const id = window.setTimeout(() => setMounted(false), parseInt(motionTokens.durationBase, 10))
    return () => window.clearTimeout(id)
  }, [open])

  if (!mounted) return null

  return (
    <>
      <div
        style={{ ...styles.drawerScrim, opacity: shown ? 1 : 0 }}
        onClick={onClose}
        aria-hidden
      />
      <aside
        style={{
          ...styles.drawer,
          transform: shown ? 'translateX(0)' : 'translateX(-280px)',
        }}
        role="dialog"
        aria-label="Navigation menu"
      >
        <div style={styles.drawerHead}>
          <span style={styles.drawerBrand}>EswarCreatives</span>
          <button type="button" style={styles.drawerClose} onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        <nav style={styles.drawerNav}>
          {items.map(({ to, label, Icon, end, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              style={({ isActive }) => ({
                ...styles.drawerNavItem,
                ...(isActive ? styles.drawerNavItemActive : null),
              })}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} color={isActive ? tokens.primary : t.text.muted} />
                  <span style={{ flex: 1, color: isActive ? t.text.primaryBrand : t.text.primary }}>
                    {label}
                  </span>
                  {badge != null && badge > 0 && (
                    <span style={styles.navBadge}>{badge > 99 ? '99+' : badge}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  layout: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    // The body canvas, so it reads from the canvas token rather than
    // `tokens.bg`. Those two used to be the same cream; they are now
    // deliberately different, white here against #FAFAF9 component surfaces.
    background: t.background.page,
  },
  body: {
    display: 'flex',
    flex: 1,
    minHeight: 0,
  },
  // Mobile hamburger drawer: above SidePanel's z-201, below nothing else.
  drawerScrim: {
    position: 'fixed',
    inset: 0,
    zIndex: 299,
    background: t.background.scrim,
    transition: `opacity ${motionTokens.durationBase} ${motionTokens.easeDefault}`,
  },
  drawer: {
    position: 'fixed',
    left: 0,
    top: 0,
    height: '100dvh',
    width: 280,
    zIndex: 300,
    background: t.background.surface,
    borderRight: `1px solid ${t.border.subtle}`,
    boxShadow: '12px 0 32px rgba(2, 76, 79, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    transition: `transform ${motionTokens.durationBase} ${motionTokens.easeEnter}`,
    boxSizing: 'border-box',
  },
  drawerHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    padding: '0 12px 0 16px',
    borderBottom: `1px solid ${t.border.subtle}`,
    flexShrink: 0,
  },
  drawerBrand: {
    fontFamily: fonts.heading,
    fontSize: 15,
    fontWeight: 600,
    color: t.text.primary,
  },
  drawerClose: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    background: 'transparent',
    border: 'none',
    color: t.text.muted,
    cursor: 'pointer',
  },
  drawerNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '8px',
    overflowY: 'auto',
    flex: 1,
  },
  drawerNavItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    height: 48,
    padding: '0 12px',
    borderRadius: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    color: t.text.secondary,
    textDecoration: 'none',
  },
  drawerNavItemActive: {
    background: t.background.tint1,
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
  // At tablet widths the sidebar is icon-only; center the icon for polish.
  navItemTablet: {
    justifyContent: 'center',
    gap: 0,
    padding: '12px',
  },
  navItemActive: {
    background: tokens.tealLight,
    color: tokens.primary,
    fontWeight: 600,
  },
  navBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: tokens.ruby,
    color: t.text.onPrimary,
    fontFamily: mono,
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    padding: '0 5px',
    lineHeight: 1,
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
