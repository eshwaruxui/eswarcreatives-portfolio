// Add Lead modal. Checks for duplicate email on blur. All fields follow portal
// field patterns. On success calls onSaved with the new lead id.
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts } from '../../theme'
import { Modal, mono } from '../ui'

type Segment = 'security_ai' | 'saas_product'
type Source = 'manual' | 'csv' | 'apollo' | 'linkedin' | 'referral'

type FormState = {
  first_name: string
  last_name: string
  email: string
  linkedin_url: string
  company: string
  role_title: string
  website: string
  segment: Segment | ''
  source: Source
  country: string
  notes: string
}

const EMPTY: FormState = {
  first_name: '',
  last_name: '',
  email: '',
  linkedin_url: '',
  company: '',
  role_title: '',
  website: '',
  segment: '',
  source: 'manual',
  country: '',
  notes: '',
}

export function AddLeadModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (leadId: string) => void
}) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [dupWarning, setDupWarning] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function checkDuplicate() {
    const email = form.email.trim()
    if (!email) return
    const { data } = await supabase
      .from('leads')
      .select('id, first_name, last_name, company')
      .ilike('email', email)
      .maybeSingle()
    if (data) {
      setDupWarning(data.id)
    } else {
      setDupWarning(null)
    }
  }

  async function handleSave() {
    if (!form.first_name.trim()) { setError('First name is required.'); return }
    if (!form.company.trim()) { setError('Company is required.'); return }
    if (!form.segment) { setError('Segment is required.'); return }
    setSaving(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('leads')
      .insert({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim() || null,
        email: form.email.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        company: form.company.trim(),
        role_title: form.role_title.trim() || null,
        website: form.website.trim() || null,
        segment: form.segment,
        source: form.source,
        country: form.country.trim() || null,
        notes: form.notes.trim() || null,
      })
      .select('id')
      .single()
    if (err || !data) {
      setError('Could not save the lead. Check for duplicates and try again.')
      setSaving(false)
      return
    }
    onSaved(data.id)
  }

  return (
    <Modal title="Add lead" onClose={onClose} size="lg">
      <div style={styles.body}>
        <div style={styles.grid}>
          <Field label="First name *">
            <input style={styles.input} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="Jane" />
          </Field>
          <Field label="Last name">
            <input style={styles.input} value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="Smith" />
          </Field>
          <Field label="Email">
            <input
              style={styles.input}
              type="email"
              value={form.email}
              onChange={(e) => { set('email', e.target.value); setDupWarning(null) }}
              onBlur={checkDuplicate}
              placeholder="jane@example.com"
            />
            {dupWarning && (
              <span style={styles.dupWarn}>
                A lead with this email already exists.{' '}
                <button type="button" style={styles.dupLink} onClick={() => onSaved(dupWarning)}>
                  Open that lead
                </button>
              </span>
            )}
          </Field>
          <Field label="LinkedIn URL">
            <input style={styles.input} value={form.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." />
          </Field>
          <Field label="Company *" fullWidth>
            <input style={styles.input} value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Acme Corp" />
          </Field>
          <Field label="Role title">
            <input style={styles.input} value={form.role_title} onChange={(e) => set('role_title', e.target.value)} placeholder="Head of Product" />
          </Field>
          <Field label="Website">
            <input style={styles.input} value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://..." />
          </Field>
          <Field label="Segment *" fullWidth>
            <div style={styles.radioGroup}>
              {(['security_ai', 'saas_product'] as Segment[]).map((seg) => (
                <label key={seg} style={styles.radioLabel}>
                  <input
                    type="radio"
                    name="segment"
                    value={seg}
                    checked={form.segment === seg}
                    onChange={() => set('segment', seg)}
                  />
                  {seg === 'security_ai' ? 'Security / AI' : 'SaaS Product'}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Source">
            <select style={styles.select} value={form.source} onChange={(e) => set('source', e.target.value as Source)}>
              <option value="manual">Manual</option>
              <option value="csv">CSV import</option>
              <option value="apollo">Apollo</option>
              <option value="linkedin">LinkedIn</option>
              <option value="referral">Referral</option>
            </select>
          </Field>
          <Field label="Country">
            <input style={styles.input} value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="United States" />
          </Field>
          <Field label="Notes" fullWidth>
            <textarea style={styles.textarea} value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} placeholder="Any context..." />
          </Field>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <div style={styles.footer}>
          <button type="button" style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button type="button" style={{ ...styles.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Add lead'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, children, fullWidth }: { label: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div style={{ ...(fullWidth ? { gridColumn: '1 / -1' } : {}) }}>
      <label style={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  body: { display: 'flex', flexDirection: 'column', gap: 20 },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px 20px',
  },
  fieldLabel: {
    display: 'block',
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.tertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '9px 12px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '9px 12px',
    outline: 'none',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%',
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '9px 12px',
    outline: 'none',
  },
  radioGroup: { display: 'flex', gap: 16 },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    cursor: 'pointer',
  },
  dupWarn: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.goldDark,
    marginTop: 4,
    display: 'block',
  },
  dupLink: {
    background: 'none',
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.primaryBrand,
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: 0,
  },
  errorBanner: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    background: tokens.surface,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 14,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '9px 18px',
    cursor: 'pointer',
  },
  saveBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '9px 20px',
    cursor: 'pointer',
  },
}
