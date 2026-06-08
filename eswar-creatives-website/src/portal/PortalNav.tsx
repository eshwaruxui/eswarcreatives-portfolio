import { useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { tokens, fonts } from './theme'
import eswarLogo from '../imports/eswar-logo.svg'

// Light nav bar shared across the portal pages, matching the main site style:
// EC logo and wordmark on the left, an optional "Sign out" link on the right.
export function PortalNav({ showSignOut = false }: { showSignOut?: boolean }) {
  const navigate = useNavigate()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/portal/login', { replace: true })
  }

  return (
    <nav style={styles.nav}>
      <div style={styles.brand}>
        <img
          src={eswarLogo}
          alt="Eswar Creatives logo"
          width={32}
          height={32}
          style={styles.logo}
        />
        <span style={styles.brandName}>Eswar Creatives</span>
      </div>
      {showSignOut && (
        <button type="button" onClick={handleSignOut} style={styles.signOut}>
          Sign out
        </button>
      )}
    </nav>
  )
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    padding: '0 24px',
    background: tokens.bg, // Atelier cream
    borderBottom: `1px solid ${tokens.border}`,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  logo: { display: 'block' },
  brandName: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    color: tokens.primary, // teal
  },
  signOut: {
    background: 'transparent',
    border: 'none',
    color: tokens.textMuted,
    fontSize: 13,
    fontFamily: fonts.body,
    cursor: 'pointer',
    padding: 0,
  },
}
