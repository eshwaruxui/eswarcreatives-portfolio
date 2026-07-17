import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import { Modal, ui } from './ui'
import { showToast } from './toast'
import { clientLabel } from '../PortalContext'
import type { PortalClient } from '../PortalContext'
import type { CSSProperties } from 'react'

export function AddProjectModal({
  clients,
  preselectedClientId,
  onClose,
  onCreated,
}: {
  clients: PortalClient[]
  preselectedClientId?: string | null
  onClose: () => void
  onCreated: (projectId: string) => void
}) {
  const [clientId, setClientId] = useState(preselectedClientId ?? '')
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (!clientId) return setError('Choose a client.')
    if (!title.trim()) return setError('Project name is required.')

    setSaving(true)
    try {
      const { data, error: insErr } = await supabase
        .from('projects')
        .insert({ client_id: clientId, title: title.trim() })
        .select('id')
        .single()
      if (insErr) throw insErr
      const newId = (data as { id: string }).id
      onCreated(newId)
      showToast('Project created.', 'success')
    } catch {
      setError('Could not create project. Try again.')
      showToast('Project could not be created. Please try again.', 'error')
      setSaving(false)
    }
  }

  return (
    <Modal title="Add project" onClose={onClose}>
      {error && <div style={styles.error}>{error}</div>}
      <div style={styles.form}>
        <Field label="Client" required>
          <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={styles.input}>
            <option value="" disabled>Select a client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{clientLabel(c)}</option>
            ))}
          </select>
        </Field>
        <Field label="Project name" required>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={styles.input}
            placeholder="e.g. Newgen Branding 2026"
          />
        </Field>
      </div>
      <div style={styles.actions}>
        <button type="button" style={styles.secondaryBtn} onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="button" style={ui.primaryBtn} onClick={() => void handleSubmit()} disabled={saving}>
          {saving ? 'Creating...' : 'Create project'}
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
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: t.text.tertiary },
  input: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
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
    color: t.text.primary,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '10px 16px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
