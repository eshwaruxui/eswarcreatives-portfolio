// Public unsubscribe page. No auth required.
// Calls unsubscribe_by_token RPC on mount. Always shows confirmation,
// never an error (idempotent, privacy-safe per spec).
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import type { CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { tokens, t, fonts } from './theme'

export function UnsubscribePage() {
  const { token } = useParams<{ token: string }>()
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setDone(true); return }
    supabase
      .rpc('unsubscribe_by_token', { p_token: token })
      .then(() => setDone(true))
      .catch(() => setDone(true)) // Always show confirmation; never surface errors
  }, [token])

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        {/* EC wordmark */}
        <span style={styles.logoType}>EswarCreatives</span>
        <span style={styles.logoSub}>Branding Solution</span>
      </header>

      <main style={styles.main}>
        {done ? (
          <div style={styles.card}>
            <h1 style={styles.heading}>You have been unsubscribed</h1>
            <p style={styles.body}>
              You will not receive any further emails from Eswar Creatives.
            </p>
          </div>
        ) : (
          <div style={styles.card}>
            <p style={styles.body}>Processing...</p>
          </div>
        )}
      </main>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: tokens.bg,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 24px 0',
    gap: 4,
  },
  logoType: {
    fontFamily: fonts.heading,
    fontSize: 24,
    fontWeight: 700,
    color: tokens.primary,
    letterSpacing: '-0.3px',
  },
  logoSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.tertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  main: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 24px',
  },
  card: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    padding: '40px 48px',
    maxWidth: 440,
    width: '100%',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  heading: {
    fontFamily: fonts.heading,
    fontSize: 24,
    fontWeight: 600,
    color: t.text.primary,
    margin: 0,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: t.text.secondary,
    margin: 0,
    lineHeight: 1.6,
  },
}
