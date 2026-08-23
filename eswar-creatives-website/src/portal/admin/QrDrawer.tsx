// Right-side drawer for creating a QR code or editing an existing one's
// destination. One SidePanel, one mode prop -- not two drawer
// implementations -- mirroring LinkedInPostComposer's create/edit split.
// Edit intentionally exposes only destination_url + is_active: a QR code's
// slug is what's printed, so it can never change once created; only what it
// resolves to can.
import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import { Spinner } from '../Spinner'
import { SidePanel } from './SidePanel'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { clientLabel, type PortalClient } from '../PortalContext'
import { generateQrSlugSuggestion } from '../utils/qr'

export type QrCode = {
  id: string
  client_id: string | null
  label: string
  slug: string
  destination_url: string
  use_case: string | null
  medium: string | null
  is_active: boolean
}

const USE_CASES = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'website', label: 'Website' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'google_review', label: 'Google Review' },
  { value: 'other', label: 'Other' },
]

const MEDIUMS = [
  { value: 'visiting_card', label: 'Visiting card' },
  { value: 'bookmark', label: 'Bookmark' },
  { value: 'banner', label: 'Banner' },
  { value: 'stationery', label: 'Stationery' },
  { value: 'digital', label: 'Digital' },
]

// First letter of up to the first two words of a client's display label, e.g.
// "Newgen Event Studio" -> "ne". Only ever a starting point for the editable
// slug suggestion below, never enforced.
function clientInitials(label: string): string {
  const words = label.trim().split(/\s+/).filter(Boolean)
  return words.slice(0, 2).map((w) => w[0]).join('').toLowerCase()
}

type QrDrawerProps =
  | { mode: 'create'; clients: PortalClient[]; defaultClientId: string | null; qr?: undefined; onClose: () => void; onSaved: (qr: QrCode) => void }
  | { mode: 'edit'; qr: QrCode; clients?: undefined; defaultClientId?: undefined; onClose: () => void; onSaved: (qr: QrCode) => void }

export function QrDrawer(props: QrDrawerProps) {
  const { mode, onClose, onSaved } = props
  const { isMobile } = useBreakpoint()

  // Create-only fields.
  const [clientId, setClientId] = useState(mode === 'create' ? (props.defaultClientId ?? '') : '')
  const [label, setLabel] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [useCase, setUseCase] = useState('')
  const [medium, setMedium] = useState('')

  // Shared / edit fields.
  const [destinationUrl, setDestinationUrl] = useState(mode === 'edit' ? props.qr.destination_url : '')
  const [isActive, setIsActive] = useState(mode === 'edit' ? props.qr.is_active : true)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function applySlugSuggestion(nextClientId: string, nextUseCase: string) {
    if (slugTouched || mode !== 'create') return
    const client = props.clients.find((c) => c.id === nextClientId)
    if (!client || !nextUseCase) return
    setSlug(generateQrSlugSuggestion(clientInitials(clientLabel(client)), nextUseCase))
  }

  async function handleSave() {
    setError(null)

    if (mode === 'create') {
      if (!label.trim() || !slug.trim() || !destinationUrl.trim() || !useCase || !medium) {
        setError('Label, slug, destination, use case and medium are all required.')
        return
      }
      setSaving(true)
      const { data: sess } = await supabase.auth.getUser()
      const { data, error: insErr } = await supabase
        .from('qr_codes')
        .insert({
          client_id: clientId || null,
          created_by: sess.user?.id ?? null,
          slug: slug.trim(),
          label: label.trim(),
          destination_url: destinationUrl.trim(),
          use_case: useCase,
          medium,
        })
        .select('id, client_id, label, slug, destination_url, use_case, medium, is_active')
        .single()
      setSaving(false)
      if (insErr || !data) {
        // H9: never surface a raw Supabase string. A unique-constraint hit on
        // slug is the one failure an admin can actually act on here.
        setError(
          insErr?.code === '23505'
            ? 'That slug is already in use. Choose a different one.'
            : 'Could not create the QR code. Please try again.'
        )
        return
      }
      onSaved(data as QrCode)
      return
    }

    if (!destinationUrl.trim()) {
      setError('Destination URL is required.')
      return
    }
    setSaving(true)
    const { data, error: updErr } = await supabase
      .from('qr_codes')
      .update({ destination_url: destinationUrl.trim(), is_active: isActive })
      .eq('id', props.qr.id)
      .select('id, client_id, label, slug, destination_url, use_case, medium, is_active')
      .single()
    setSaving(false)
    if (updErr || !data) {
      setError('Could not update this QR code. Please try again.')
      return
    }
    onSaved(data as QrCode)
  }

  const title = mode === 'create' ? 'New QR code' : `Edit ${props.qr.label}`
  const subtitle = mode === 'edit' ? props.qr.slug : undefined

  const headerExtra = (
    <div style={styles.headerActions}>
      <button type="button" style={styles.cancelBtn} disabled={saving} onClick={onClose}>
        Cancel
      </button>
      <button
        type="button"
        style={{ ...styles.saveBtn, opacity: saving ? 0.6 : 1 }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? (
          <>
            <Spinner size={12} color="#fff" />
            <span>Saving...</span>
          </>
        ) : mode === 'create' ? 'Create' : 'Save changes'}
      </button>
    </div>
  )

  return (
    <SidePanel title={title} subtitle={subtitle} onClose={onClose} width={480} headerExtra={headerExtra} preventClose={saving}>
      <div style={styles.body}>
        {mode === 'create' ? (
          <div style={{ ...styles.grid, ...(isMobile ? { gridTemplateColumns: '1fr' } : null) }}>
            <Field label="Label *" fullWidth>
              <input style={styles.input} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Newgen WhatsApp BNI" />
            </Field>
            <Field label="Client">
              <select
                style={styles.select}
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value)
                  applySlugSuggestion(e.target.value, useCase)
                }}
              >
                <option value="">No client</option>
                {props.clients.map((c) => (
                  <option key={c.id} value={c.id}>{clientLabel(c)}</option>
                ))}
              </select>
            </Field>
            <Field label="Use case *">
              <select
                style={styles.select}
                value={useCase}
                onChange={(e) => {
                  setUseCase(e.target.value)
                  applySlugSuggestion(clientId, e.target.value)
                }}
              >
                <option value="">Select...</option>
                {USE_CASES.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Medium *">
              <select style={styles.select} value={medium} onChange={(e) => setMedium(e.target.value)}>
                <option value="">Select...</option>
                {MEDIUMS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Slug *" fullWidth>
              <input
                style={styles.input}
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugTouched(true) }}
                placeholder="ng-whatsapp"
              />
              <span style={styles.hint}>eswarcreatives.in/qr/{slug || '...'}</span>
            </Field>
            <Field label="Destination URL *" fullWidth>
              <input style={styles.input} value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://..." />
            </Field>
          </div>
        ) : (
          <div style={styles.grid}>
            <Field label="Destination URL *" fullWidth>
              <input style={styles.input} value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Status" fullWidth>
              <label style={styles.toggleLabel}>
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                Active
              </label>
            </Field>
          </div>
        )}

        {error && <p style={styles.errorText}>{error}</p>}
      </div>
    </SidePanel>
  )
}

function Field({ label, children, fullWidth }: { label: string; children: ReactNode; fullWidth?: boolean }) {
  return (
    <div style={{ ...(fullWidth ? { gridColumn: '1 / -1' } : {}) }}>
      <label style={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  body: { display: 'flex', flexDirection: 'column', gap: 20, padding: 20 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
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
  hint: {
    display: 'block',
    marginTop: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.ruby,
    margin: 0,
  },
  headerActions: { display: 'flex', alignItems: 'center', gap: 8 },
  cancelBtn: {
    background: 'transparent',
    border: 'none',
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 12px',
    cursor: 'pointer',
  },
  saveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.primary,
    color: t.text.onPrimary,
    border: 'none',
    borderRadius: 8,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 16px',
    cursor: 'pointer',
  },
}
