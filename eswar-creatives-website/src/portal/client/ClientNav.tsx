// Shared top navigation for the client-facing portal screens (Projects,
// Proposals, Invoices, Mockups, Account). Fixed to the top at the same layer as
// the admin TopBar (z-index 90). Theme tokens only; no raw hex; no em dashes.
import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import type { PortalProfile } from '../PortalGuard'
import { tokens, fonts } from '../theme'
import eswarLogo from '../../imports/eswar-logo.svg'

// Height the fixed bar occupies; client pages offset their content by this much.
export const CLIENT_NAV_HEIGHT = 56

const LINKS = [
  { to: '/portal/projects', label: 'Projects' },
  { to: '/portal/proposals', label: 'Proposals' },
  { to: '/portal/invoices', label: 'Invoices' },
  { to: '/portal/mockups', label: 'Mockups' },
  { to: '/portal/account', label: 'Account' },
]

export function ClientNav({ profile }: { profile: PortalProfile }) {
  const navigate = useNavigate()
  const [name, setName] = useState<string>(profile.full_name || profile.email)

  // Prefer the client's contact/company name; fall back to the profile identity.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('clients')
        .select('company_name, contact_name')
        .eq('profile_id', profile.id)
        .maybeSingle()
      if (cancelled || !data) return
      const label = data.contact_name || data.company_name
      if (label) setName(label)
    })()
    return () => {
      cancelled = true
    }
  }, [profile.id])

  async function handleSignOut() {
    // H3 (user control and freedom): sign out is always one click away.
    await supabase.auth.signOut()
    navigate('/portal/login', { replace: true })
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        <div style={styles.brand}>
          <img src={eswarLogo} alt="Eswar Creatives logo" width={28} height={28} style={styles.logo} />
          <span style={styles.brandName}>Eswar Creatives</span>
        </div>

        {/* H6 (recognition rather than recall) + H1 (visibility of system status):
            every section is labelled and the current one is highlighted. */}
        <div style={styles.links}>
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              style={({ isActive }) => ({
                ...styles.link,
                ...(isActive ? styles.linkActive : null),
              })}
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        <div style={styles.right}>
          <span style={styles.name}>{name}</span>
          <button type="button" onClick={handleSignOut} style={styles.signout}>
            Log out
          </button>
        </div>
      </div>
    </nav>
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
    borderBottom: `1px solid ${tokens.border}`,
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
  brand: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  logo: { display: 'block' },
  brandName: {
    fontFamily: fonts.heading,
    fontSize: 15,
    fontWeight: 600,
    color: tokens.primary,
    whiteSpace: 'nowrap',
  },
  links: { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  link: {
    padding: '7px 12px',
    borderRadius: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    color: tokens.textMuted,
    textDecoration: 'none',
  },
  linkActive: {
    background: tokens.tealLight,
    color: tokens.primary,
    fontWeight: 600,
  },
  right: { display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 },
  name: { fontSize: 13, color: tokens.textMuted, whiteSpace: 'nowrap' },
  signout: {
    background: 'transparent',
    border: `1px solid ${tokens.border}`,
    color: tokens.primary,
    padding: '7px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontFamily: fonts.body,
    fontWeight: 500,
    cursor: 'pointer',
  },
}
