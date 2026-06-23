// Creates a new client login. The privileged work (auth user + profile + client
// row) happens in the admin-create-client edge function; this modal only
// collects input, calls it via supabase.functions.invoke, and maps the returned
// error codes to plain-language messages (never a raw Supabase string).
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { tokens, fonts } from '../theme'
import { Modal, ui } from './ui'
import { showToast } from './toast'
import type { CSSProperties } from 'react'

const COUNTRIES = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'SG', name: 'Singapore' },
]

const ERROR_MESSAGES: Record<string, string> = {
  email_exists: 'Email already in use.',
  invalid_email: 'Enter a valid email address.',
  weak_password: 'Password too short (min 8 characters).',
  company_required: 'Company name is required.',
  not_allowed: 'You do not have permission to add clients.',
  not_authenticated: 'Your session has expired. Sign in again.',
}
function friendlyError(code: string | undefined): string {
  return (code && ERROR_MESSAGES[code]) || 'Could not create account. Try again.'
}

export function AddClientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (clientId: string) => void
}) {
  const [companyName, setCompanyName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('IN')
  const [currency, setCurrency] = useState('INR')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (!companyName.trim()) return setError(friendlyError('company_required'))
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setError(friendlyError('invalid_email'))
    if (password.length < 8) return setError(friendlyError('weak_password'))

    setSaving(true)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('admin-create-client', {
        body: {
          company_name: companyName.trim(),
          contact_name: contactName.trim(),
          email: email.trim(),
          country,
          currency,
          password,
        },
      })
      // The function returns { error: code } with a non-2xx status, which the
      // client surfaces as a FunctionsHttpError carrying the response body.
      if (fnErr) {
        let code: string | undefined
        try {
          const ctx = (fnErr as { context?: Response }).context
          if (ctx && typeof ctx.json === 'function') code = (await ctx.json())?.error
        } catch {
          // fall through to the generic message
        }
        setError(friendlyError(code))
        // H1: confirm the outcome of the action with a toast as well.
        showToast('Client could not be created. Please try again.', 'error')
        setSaving(false)
        return
      }
      const newId = (data as { id?: string } | null)?.id
      if (!newId) {
        setError(friendlyError(undefined))
        showToast('Client could not be created. Please try again.', 'error')
        setSaving(false)
        return
      }
      // Success: close the modal, then confirm with a top-right toast.
      onCreated(newId)
      showToast(`Client created. Login credentials have been sent to ${email.trim()}.`, 'success')
    } catch {
      setError(friendlyError(undefined))
      showToast('Client could not be created. Please try again.', 'error')
      setSaving(false)
    }
  }

  return (
    <Modal title="Add client" onClose={onClose}>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.form}>
        <Field label="Company name" required>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={styles.input} />
        </Field>
        <Field label="Contact name">
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} style={styles.input} />
        </Field>
        <Field label="Email" required>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
            autoComplete="off"
          />
        </Field>
        <div style={styles.row}>
          <Field label="Country">
            <select value={country} onChange={(e) => setCountry(e.target.value)} style={styles.input}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={styles.input}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </Field>
        </div>
        <Field label="Password" required>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
            autoComplete="new-password"
            placeholder="Min 8 characters"
          />
        </Field>
      </div>
      <div style={styles.actions}>
        <button type="button" style={styles.secondaryBtn} onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="button" style={ui.primaryBtn} onClick={handleSubmit} disabled={saving}>
          {saving ? 'Creating...' : 'Create client'}
        </button>
      </div>
    </Modal>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>
        {label}
        {required && <span style={{ color: tokens.ruby }}> *</span>}
      </span>
      {children}
    </label>
  )
}

const styles: Record<string, CSSProperties> = {
  error: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 16,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: tokens.textMuted },
  input: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: tokens.text,
    background: tokens.inputBg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '9px 11px',
    width: '100%',
    boxSizing: 'border-box',
  },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  secondaryBtn: {
    background: tokens.surface,
    color: tokens.text,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '10px 16px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
