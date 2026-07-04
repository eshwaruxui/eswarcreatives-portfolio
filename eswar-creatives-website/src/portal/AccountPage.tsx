// Client account page at /portal/account. Read-only identity plus a password
// reset that emails a secure link (rather than changing the password inline).
// Theme tokens only; no raw hex; no em dashes; plain-language errors only.
import { useState } from 'react'
import { useOutletContext } from 'react-router'
import { Pencil } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { type PortalProfile } from './PortalGuard'
import { CLIENT_NAV_HEIGHT } from './client/ClientNav'
import { tokens, fonts, motionTokens } from './theme'
import { useBreakpoint } from './hooks/useBreakpoint'

const RESET_REDIRECT = 'https://www.eswarcreatives.in/portal/reset-password'

export function AccountPage() {
  const profile = useOutletContext<PortalProfile>()
  return <Account profile={profile} />
}

function Account({ profile }: { profile: PortalProfile }) {
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { isMobile } = useBreakpoint()

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
      <main style={{ ...styles.container, padding: `${CLIENT_NAV_HEIGHT + 40}px ${isMobile ? 16 : 24}px 80px` }}>
        <h1 style={styles.title}>Account</h1>

        <div style={styles.card}>
          <FullNameField initialName={profile.full_name} isMobile={isMobile} />
          <Field label="Email" value={profile.email} />
        </div>

        <div style={styles.card}>
          <span style={styles.label}>Change your password</span>
          {/* H6: the email is shown (read-only) so the client knows where the
              link will be sent, without having to recall or retype it. */}
          <input value={profile.email} readOnly style={styles.inputReadonly} aria-label="Email" />
          <button
            type="button"
            onClick={handleReset}
            disabled={busy}
            style={{ ...styles.button, ...(isMobile ? styles.buttonFullWidth : null), opacity: busy ? 0.6 : 1 }}
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

// Editable full name. Read-only by default with an Edit affordance; switches to
// an input with Save/Cancel (stacked vertically on mobile). H1: every action
// gives inline feedback.
function FullNameField({ initialName, isMobile }: { initialName: string | null; isMobile: boolean }) {
  const [name, setName] = useState(initialName ?? '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [saving, setSaving] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function startEdit() {
    setDraft(name)
    setError(null)
    setConfirm(false)
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const value = draft.trim()
      // Clients have no UPDATE policy on profiles; this SECURITY DEFINER RPC
      // updates only the caller's own full_name (see migration 0044).
      const { error: err } = await supabase.rpc('update_own_full_name', {
        p_full_name: value,
      })
      if (err) throw err
      setName(value)
      setEditing(false)
      // Brief green confirmation that fades out after 2s (durationSlow).
      setConfirm(true)
      setTimeout(() => setConfirm(false), 2000)
    } catch {
      // H9: plain-language error, never a raw Supabase string.
      setError('We could not update your name. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.field}>
      <span style={styles.label}>Full name</span>
      {editing ? (
        // Stack vertically on mobile so three elements don't fight for space.
        <div style={{ ...styles.nameEditRow, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center' }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            style={styles.nameInput}
            aria-label="Full name"
            autoFocus
          />
          <div style={isMobile ? { display: 'flex', gap: 8 } : undefined}>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              style={{ ...styles.nameSave, ...(isMobile ? { flex: 1 } : null), opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={saving}
              style={{ ...styles.nameCancel, ...(isMobile ? { flex: 1 } : null) }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.nameViewRow}>
          <span style={styles.value}>{name || '-'}</span>
          <button type="button" onClick={startEdit} style={styles.editBtn} aria-label="Edit full name">
            <Pencil size={14} />
            Edit
          </button>
        </div>
      )}
      {/* Stays mounted so it can fade out smoothly once cleared. */}
      <span style={{ ...styles.nameConfirm, opacity: confirm ? 1 : 0 }}>Name updated</span>
      {error && <div style={styles.error}>{error}</div>}
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: tokens.bg, color: tokens.text, fontFamily: fonts.body },
  container: {
    maxWidth: 560,
    margin: '0 auto',
    // Padding overridden inline with responsive values (16px mobile / 24px desktop).
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
  nameViewRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  editBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'transparent',
    border: `1px solid ${tokens.border}`,
    color: tokens.primary,
    borderRadius: 8,
    padding: '6px 12px',
    fontSize: 13,
    fontFamily: fonts.body,
    fontWeight: 600,
    cursor: 'pointer',
    transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  nameEditRow: { display: 'flex', alignItems: 'center', gap: 8 },
  nameInput: {
    flex: 1,
    padding: '9px 12px',
    borderRadius: 8,
    border: `1px solid ${tokens.border}`,
    background: tokens.inputBg,
    color: tokens.text,
    fontSize: 14,
    fontFamily: fonts.body,
    boxSizing: 'border-box',
  },
  nameSave: {
    background: tokens.primary,
    color: tokens.surface,
    border: 'none',
    borderRadius: 8,
    padding: '9px 14px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: 'pointer',
  },
  nameCancel: {
    background: 'transparent',
    color: tokens.textMuted,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '9px 14px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: 'pointer',
  },
  nameConfirm: {
    fontSize: 13,
    color: tokens.green,
    fontFamily: fonts.body,
    transition: `opacity ${motionTokens.durationSlow} ${motionTokens.easeDefault}`,
  },
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
  // Full-width variant applied on mobile so the CTA uses the full card width.
  buttonFullWidth: {
    alignSelf: 'stretch',
    width: '100%',
    boxSizing: 'border-box',
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
