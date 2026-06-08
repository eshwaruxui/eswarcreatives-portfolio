import { useState } from 'react'
import { Link } from 'react-router'
import { supabase } from '../lib/supabase'
import { PortalGuard, type PortalProfile } from './PortalGuard'
import { tokens, fonts } from './theme'

const MIN_PASSWORD = 8

// ── Route entry: any authenticated user (client or admin) ────────────
export function AccountPage() {
  return (
    <PortalGuard>
      {(profile) => <Account profile={profile} />}
    </PortalGuard>
  )
}

function Account({ profile }: { profile: PortalProfile }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setToast(null)
    if (password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password })
      if (updErr) throw updErr
      setPassword('')
      setConfirm('')
      setToast('Password updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={styles.page}>
      <main style={styles.container}>
        <h1 style={styles.title}>Account settings</h1>

        {/* Email */}
        <div style={styles.card}>
          <span style={styles.label}>Email</span>
          <div style={styles.emailValue}>{profile.email}</div>
        </div>

        {/* Change password */}
        <form style={styles.card} onSubmit={handleSubmit}>
          <span style={styles.label}>Change password</span>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            minLength={MIN_PASSWORD}
            autoComplete="new-password"
            style={styles.input}
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            style={styles.input}
          />

          {toast && <div style={styles.toast}>{toast}</div>}

          <button type="submit" disabled={busy} style={{ ...styles.submit, opacity: busy ? 0.6 : 1 }}>
            {busy ? 'Updating...' : 'Update password'}
          </button>

          {error && <div style={styles.error}>{error}</div>}
        </form>

        <div style={styles.footer}>
          <Link to="/portal/sketch-review" style={styles.backLink}>
            Back to sketches
          </Link>
        </div>
      </main>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: tokens.bg, // Atelier cream
    color: tokens.text,
    fontFamily: fonts.body,
  },
  container: { maxWidth: 512, margin: '0 auto', padding: '40px 24px 80px' },

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
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: tokens.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  emailValue: {
    fontSize: 15,
    color: tokens.text,
    fontFamily: fonts.body,
  },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 8,
    border: `1px solid ${tokens.border}`,
    background: tokens.inputBg,
    color: tokens.text,
    fontSize: 14,
    fontFamily: fonts.body,
    boxSizing: 'border-box',
  },
  submit: {
    width: '100%',
    background: tokens.accent,
    color: tokens.surface,
    border: 'none',
    borderRadius: 8,
    padding: '12px 16px',
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
    border: `1px solid ${tokens.green}33`,
  },
  error: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    padding: '10px 12px',
    borderRadius: 8,
    fontSize: 13,
    border: `1px solid ${tokens.ruby}33`,
  },

  footer: { textAlign: 'center', marginTop: 8 },
  backLink: {
    fontSize: 13,
    color: tokens.textMuted,
    textDecoration: 'underline',
  },
}
