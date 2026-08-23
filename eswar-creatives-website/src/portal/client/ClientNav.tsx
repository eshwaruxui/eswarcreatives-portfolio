// Shared navigation for the client-facing portal.
// Desktop: fixed top bar (brand + nav links + sign-out). Mobile: minimal top
// bar (brand + sign-out) + fixed bottom tab bar (6 icon+label tabs). All
// breakpoint logic via useBreakpoint -- no inline window.innerWidth checks.
// Theme tokens only; no raw hex; no em dashes.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { NavLink, useLocation } from 'react-router'
import { LayoutDashboard, FolderKanban, FileText, Receipt, Images, Megaphone, Palette, QrCode, User } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import type { PortalProfile } from '../PortalGuard'
import { tokens, t, fonts, motionTokens } from '../theme'
import { useSignOut } from '../useSignOut'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { Spinner } from '../Spinner'
import {
  getBadges,
  loadBadgesOnce,
  markSectionRead,
  refreshBadges,
  subscribeBadges,
} from './clientNotifications'
import type { BadgeSection } from './clientNotifications'
import eswarLogo from '../../imports/eswar-logo.svg'

// Height the fixed top bar occupies; client pages offset their top padding.
export const CLIENT_NAV_HEIGHT = 56
// Height of the mobile bottom tab bar content area. Pages add
// env(safe-area-inset-bottom) on top of this via ClientShell paddingBottom.
export const CLIENT_BOTTOM_NAV_HEIGHT = 64

// Resolved display name per profile, cached at module scope. Every client page
// renders its own ClientNav; without the cache the bar flashes on tab change.
const nameCache: Record<string, string> = {}

type NavItem = {
  to: string
  label: string
  badge: BadgeSection | null
  Icon: React.ComponentType<{ size?: number; color?: string }>
}

const NAV_ITEMS: NavItem[] = [
  { to: '/portal/dashboard', label: 'Dashboard', badge: 'projects',  Icon: LayoutDashboard },
  { to: '/portal/projects',  label: 'Projects',  badge: null,        Icon: FolderKanban },
  { to: '/portal/proposals', label: 'Proposals', badge: 'proposals', Icon: FileText },
  { to: '/portal/invoices',  label: 'Invoices',  badge: 'invoices',  Icon: Receipt },
  { to: '/portal/mockups',   label: 'Mockups',   badge: 'mockups',   Icon: Images },
  { to: '/portal/campaigns', label: 'Campaigns', badge: null,         Icon: Megaphone },
  { to: '/portal/brand',     label: 'Brand',     badge: null,         Icon: Palette },
  { to: '/portal/qr',        label: 'QR Codes',  badge: null,         Icon: QrCode },
  { to: '/portal/account',   label: 'Account',   badge: null,         Icon: User },
]

const SECTION_BY_PATH: Record<string, BadgeSection> = {
  '/portal/dashboard': 'projects',
  '/portal/proposals': 'proposals',
  '/portal/invoices':  'invoices',
  '/portal/mockups':   'mockups',
}

export function ClientNav({ profile }: { profile: PortalProfile }) {
  const { signingOut, error: signOutError, signOut } = useSignOut()
  const [name, setName] = useState<string>(
    nameCache[profile.id] || profile.full_name || profile.email
  )
  const location = useLocation()
  const badges = useSyncExternalStore(subscribeBadges, getBadges, getBadges)
  const { isMobile } = useBreakpoint()

  useEffect(() => {
    if (nameCache[profile.id]) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('clients')
        .select('company_name, contact_name')
        .eq('profile_id', profile.id)
        .maybeSingle()
      if (cancelled || !data) return
      const label = data.contact_name || data.company_name
      if (label) {
        nameCache[profile.id] = label
        setName(label)
      }
    })()
    return () => { cancelled = true }
  }, [profile.id])

  useEffect(() => {
    const section = SECTION_BY_PATH[location.pathname]
    if (section) markSectionRead(profile.id, section)
    loadBadgesOnce(profile.id)
  }, [profile.id, location.pathname])

  // H1: re-check on tab focus, no polling.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refreshBadges(profile.id)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [profile.id])

  return (
    <>
      <style>{`@keyframes clientBadgeIn{from{transform:scale(0)}to{transform:scale(1)}}`}</style>

      {/* Top bar (always visible): brand + sign-out. On desktop also shows nav links. */}
      <nav style={styles.nav}>
        <div style={{ ...styles.inner, ...(isMobile ? styles.innerMobile : null) }}>
          <div style={styles.brand}>
            <img src={eswarLogo} alt="Eswar Creatives logo" width={28} height={28} style={styles.logo} />
            <span style={styles.brandName}>EswarCreatives</span>
          </div>

          {/* Desktop nav links -- hidden on mobile (bottom tab bar takes over) */}
          {!isMobile && (
            <div style={styles.links}>
              {NAV_ITEMS.map((item) => {
                const showBadge = item.badge ? badges[item.badge] : false
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    style={({ isActive }) => ({
                      ...styles.link,
                      ...(isActive ? styles.linkActive : null),
                    })}
                  >
                    <span style={styles.linkLabel}>
                      {item.label}
                      {showBadge && (
                        <span style={styles.badge} role="status" aria-label="New activity" />
                      )}
                    </span>
                  </NavLink>
                )
              })}
            </div>
          )}

          {/* Right: user name (desktop only) + sign-out (always) */}
          <div style={styles.right}>
            {!isMobile && <span style={styles.name}>{name}</span>}
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              style={{
                ...styles.signout,
                ...(isMobile ? styles.signoutCompact : null),
                ...(signingOut ? styles.signoutBusy : null),
              }}
            >
              {signingOut ? (
                <>
                  <Spinner size={12} color={t.text.secondary} />
                  {!isMobile && <span>Signing out...</span>}
                </>
              ) : (
                isMobile ? 'Sign out' : 'Sign out'
              )}
            </button>
            {signOutError && (
              <span role="alert" style={styles.signoutError}>{signOutError}</span>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      {isMobile && (
        <nav
          style={styles.bottomNav}
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map((item) => {
            const showBadge = item.badge ? badges[item.badge] : false
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  ...styles.tab,
                  ...(isActive ? styles.tabActive : null),
                })}
              >
                {({ isActive }) => (
                  <>
                    <span style={styles.tabIconWrap}>
                      <item.Icon
                        size={22}
                        color={isActive ? tokens.primary : t.text.muted}
                      />
                      {showBadge && (
                        <span style={styles.tabBadge} role="status" aria-label="New activity" />
                      )}
                    </span>
                    <span
                      style={{
                        ...styles.tabLabel,
                        color: isActive ? tokens.primary : t.text.muted,
                      }}
                    >
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            )
          })}
        </nav>
      )}
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 90,
    height: CLIENT_NAV_HEIGHT,
    background: tokens.surface,
    borderBottom: `1px solid ${t.border.overlayStrong}`,
  },
  inner: {
    maxWidth: 1080,
    margin: '0 auto',
    height: '100%',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  // On mobile: full-width, no max-width centering, tighter padding.
  innerMobile: {
    maxWidth: '100%',
    padding: '0 16px',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  logo: { display: 'block' },
  brandName: {
    fontFamily: fonts.heading,
    fontStyle: 'italic',
    fontSize: 15,
    fontWeight: 600,
    color: t.text.secondary,
    whiteSpace: 'nowrap',
  },
  links: { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  link: {
    padding: '7px 12px',
    borderRadius: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    color: t.text.secondary,
    textDecoration: 'none',
  },
  linkActive: {
    background: t.background.overlayNormal,
    color: t.text.primary,
    fontWeight: 600,
  },
  linkLabel: { position: 'relative', display: 'inline-flex', alignItems: 'center' },
  badge: {
    position: 'absolute',
    top: -2,
    right: -10,
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: tokens.ruby,
    animation: `clientBadgeIn ${motionTokens.durationFast} ${motionTokens.easeEnter}`,
  },
  right: { position: 'relative', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 },
  name: { fontSize: 13, color: t.text.secondary, whiteSpace: 'nowrap' },
  signout: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.surface,
    border: `1px solid ${t.border.medium}`,
    color: t.text.secondary,
    padding: '6px 12px',
    borderRadius: 8,
    fontSize: 13,
    fontFamily: fonts.body,
    fontWeight: 500,
    cursor: 'pointer',
    transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
    // Ensure 44px min touch target via padding on mobile.
    minHeight: 32,
  },
  // Compact variant for mobile top bar.
  signoutCompact: {
    padding: '6px 10px',
    fontSize: 12,
  },
  signoutBusy: { opacity: 0.7, cursor: 'default' },
  signoutError: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 6,
    background: tokens.rubyLight,
    color: tokens.ruby,
    fontSize: 12,
    fontFamily: fonts.body,
    padding: '6px 10px',
    borderRadius: 8,
    whiteSpace: 'nowrap',
    boxShadow: '0 6px 18px rgba(176, 13, 45, 0.14)',
  },

  // Bottom tab bar: 64px content area + safe-area-inset-bottom for home indicator.
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 90,
    height: CLIENT_BOTTOM_NAV_HEIGHT,
    paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
    background: tokens.surface,
    borderTop: `1px solid ${t.border.overlayStrong}`,
    display: 'flex',
    alignItems: 'stretch',
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    textDecoration: 'none',
    // Minimum 44px touch target per H7 (flexibility for mobile context).
    minHeight: 44,
    padding: '4px 2px',
  },
  tabActive: {},
  tabIconWrap: {
    position: 'relative',
    display: 'inline-flex',
  },
  tabBadge: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: tokens.ruby,
    animation: `clientBadgeIn ${motionTokens.durationFast} ${motionTokens.easeEnter}`,
  },
  tabLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 500,
    lineHeight: 1,
    // 7 tabs at 375px is ~53px each; truncate rather than wrap or overflow.
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}
