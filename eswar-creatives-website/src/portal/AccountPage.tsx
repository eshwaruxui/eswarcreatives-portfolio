// Client account page at /portal/account. Read-only identity plus a password
// reset that emails a secure link (rather than changing the password inline).
// Theme tokens only; no raw hex; no em dashes; plain-language errors only.
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { PortalGuard, type PortalProfile } from './PortalGuard'
import { ClientNav, CLIENT_NAV_HEIGHT } from './client/ClientNav'
import { tokens, fonts } from './theme'

const RESET_REDIRECT = 'https://www.eswarcreatives.in/portal/reset-password'

export function AccountPage() {
  return (
    <PortalGuard requireRole="client">
      {(profile) => <Account profile={profile} />}
    </PortalGuard>
  )
}

function Account({ profile }: { profile: PortalProfile }) {
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleReset() {
    setBusy(true)
    setToast(null)
    setError(null)
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: RESET_REDIRECT,
      })
      if (err) throw err
      // H1: clear confirmation that the action succeeded.
      setToast('A reset link has been sent to your email.')
    } catch {
      // H9: plain-language error, never a raw Supabase string.
      setError(
        'We could not send the reset link. Please try again or contact eswar@eswarcreatives.in'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={styles.page}>
      <ClientNav profile={profile} />
      <main style={styles.container}>
        <h1 style={styles.title}>Account</h1>

        <div style={styles.card}>
          <Field label="Full name" value={profile.full_name || '-'} />
          <Field label="Email" value={profile.email} />
        </div>

        <div style={styles.card}>
          <span style={styles.label}>Password</span>
          {/* H6: the email is shown (read-only) so the client knows where the
              link will be sent, without having to recall or retype it. */}
          <input value={profile.email} readOnly style={styles.inputReadonly} aria-label="Email" />
          <button
            type="button"
            onClick={handleReset}
            disabled={busy}
            style={{ ...styles.button, opacity: busy ? 0.6 : 1 }}
          >
            {busy ? 'Sending...' : 'Send reset link'}
          </button>
          {toast && <div style={styles.toast}>{toast}</div>}
          {error && <div style={styles.error}>{error}</div>}
        </div>
      </main>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.field}>
      <span style={styles.label}>{label}</span>
      <div style={styles.value}>{value}</div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: tokens.bg, color: tokens.text, fontFamily: fonts.body },
  container: {
    maxWidth: 560,
    margin: '0 auto',
    padding: `${CLIENT_NAV_HEIGHT + 40}px 24px 80px`,
  },
  title: {
    margin: '0 0 24px',
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: tokens.text,
  },
  card: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 22,
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: tokens.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  value: { fontSize: 15, color: tokens.text, fontFamily: fonts.body },
  inputReadonly: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 8,
    border: `1px solid ${tokens.border}`,
    background: tokens.bg,
    color: tokens.textMuted,
    fontSize: 14,
    fontFamily: fonts.body,
    boxSizing: 'border-box',
  },
  button: {
    alignSelf: 'flex-start',
    background: tokens.primary,
    color: tokens.surface,
    border: 'none',
    borderRadius: 8,
    padding: '11px 18px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: 'pointer',
  },
  toast: {
    background: tokens.greenLight,
    color: tokens.green,
    padding: '10px 12px',
    borderRadius: 8,
    fontSize: 13,
    border: `1px solid ${tokens.green}`,
  },
  error: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    padding: '10px 12px',
    borderRadius: 8,
    fontSize: 13,
    border: `1px solid ${tokens.ruby}`,
  },
}
