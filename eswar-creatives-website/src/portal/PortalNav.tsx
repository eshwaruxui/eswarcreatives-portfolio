import { tokens, fonts, motionTokens } from './theme'
import { useSignOut } from './useSignOut'
import { Spinner } from './Spinner'
import eswarLogo from '../imports/eswar-logo.svg'

// Light nav bar shared across the portal pages, matching the main site style:
// EC logo and wordmark on the left, an optional "Sign out" link on the right.
export function PortalNav({ showSignOut = false }: { showSignOut?: boolean }) {
  const { signingOut, error: signOutError, signOut } = useSignOut()

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
        <span style={styles.brandName}>EswarCreatives</span>
      </div>
      {showSignOut && (
        <div style={styles.signOutWrap}>
          {/* H1: visibility of system status — inline spinner, disabled while busy. */}
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            style={{ ...styles.signOut, ...(signingOut ? styles.signOutBusy : null) }}
          >
            {signingOut ? (
              <>
                <Spinner size={11} color={tokens.textMuted} />
                <span>Signing out...</span>
              </>
            ) : (
              'Sign out'
            )}
          </button>
          {signOutError && (
            <span role="alert" style={styles.signOutError}>
              {signOutError}
            </span>
          )}
        </div>
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
  signOutWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  signOut: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'transparent',
    border: 'none',
    color: tokens.textMuted,
    fontSize: 13,
    fontFamily: fonts.body,
    cursor: 'pointer',
    padding: 0,
    transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  signOutBusy: { opacity: 0.7, cursor: 'default' },
  signOutError: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    fontSize: 12,
    fontFamily: fonts.body,
    color: tokens.ruby,
    whiteSpace: 'nowrap',
  },
}
