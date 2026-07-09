// Public unsubscribe page. No auth required.
// Flow: show confirmation first, then call unsubscribe_by_token RPC on confirm.
// Invalid/expired token (RPC returns false): skip confirmation, show invalid message.
import { useState } from 'react'
import { useParams } from 'react-router'
import type { CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { tokens, t, fonts } from './theme'

type State = 'confirm' | 'done' | 'invalid' | 'error' | 'loading'

export function UnsubscribePage() {
  const { token } = useParams<{ token: string }>()
  const [state, setState] = useState<State>(token ? 'confirm' : 'invalid')

  async function handleUnsubscribe() {
    if (!token) { setState('invalid'); return }
    setState('loading')
    try {
      const { error } = await supabase.rpc('unsubscribe_by_token', { p_token: token })
      if (error) {
        setState('error')
      } else {
        setState('done')
      }
    } catch {
      setState('error')
    }
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={styles.logoType}>EswarCreatives</span>
        <span style={styles.logoSub}>Branding Solution</span>
      </header>

      <main style={styles.main}>
        {state === 'confirm' && (
          <div style={styles.card}>
            <h1 style={styles.heading}>Unsubscribe from emails?</h1>
            <p style={styles.body}>
              You will no longer receive emails from Eswar Creatives.
            </p>
            <div style={styles.btnRow}>
              <button type="button" style={styles.primaryBtn} onClick={handleUnsubscribe}>
                Yes, unsubscribe
              </button>
              <a href="https://www.eswarcreatives.in" style={styles.outlineBtn}>
                No, take me back
              </a>
            </div>
          </div>
        )}

        {state === 'loading' && (
          <div style={styles.card}>
            <p style={styles.body}>Processing...</p>
          </div>
        )}

        {state === 'done' && (
          <div style={styles.card}>
            <h1 style={styles.heading}>You have been unsubscribed</h1>
            <p style={styles.body}>
              You will not receive any further emails from Eswar Creatives.
            </p>
          </div>
        )}

        {state === 'invalid' && (
          <div style={styles.card}>
            <h1 style={{ ...styles.heading, fontSize: 20 }}>Link invalid or already used</h1>
            <p style={styles.body}>
              This unsubscribe link is invalid or has already been used.
            </p>
          </div>
        )}

        {state === 'error' && (
          <div style={styles.card}>
            <h1 style={{ ...styles.heading, fontSize: 20 }}>Something went wrong</h1>
            <p style={styles.body}>
              Please try again or contact{' '}
              <a href="mailto:eswar@eswarcreatives.in" style={{ color: tokens.primary }}>
                eswar@eswarcreatives.in
              </a>
              .
            </p>
            <button type="button" style={styles.primaryBtn} onClick={handleUnsubscribe}>
              Try again
            </button>
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
    gap: 16,
    alignItems: 'center',
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
  btnRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  primaryBtn: {
    background: tokens.primary,
    color: '#fff',
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '12px 24px',
    cursor: 'pointer',
    width: '100%',
  },
  outlineBtn: {
    display: 'block',
    background: 'none',
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: 500,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '11px 24px',
    cursor: 'pointer',
    textDecoration: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
}
