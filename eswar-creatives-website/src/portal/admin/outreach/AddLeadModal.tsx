// Add Lead modal. Checks for duplicate email on blur. All fields follow portal
// field patterns. On success calls onSaved with the new lead id.
// Feature 1: screenshot-to-lead upload zone at the top.
// Feature 3: linkedin_visitor source option with warm-lead chip.
import { useEffect, useRef, useState } from 'react'
import { X, Upload } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts } from '../../theme'
import { Modal, mono } from '../ui'

type Segment = 'security_ai' | 'saas_product'
type Source = 'manual' | 'csv' | 'apollo' | 'linkedin' | 'referral' | 'linkedin_visitor'

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

const MAX_CLIENT_BYTES = 4 * 1024 * 1024 // 4MB client-side guard

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

  // Feature 1: screenshot upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [screenshot, setScreenshot] = useState<{ preview: string; base64: string; mediaType: string } | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractBanner, setExtractBanner] = useState<'success' | 'error' | 'size_error' | null>(null)
  const [screenshotError, setScreenshotError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

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

  function handleFileSelect(file: File) {
    setScreenshotError(null)
    setExtractBanner(null)
    if (file.size > MAX_CLIENT_BYTES) {
      setScreenshotError('Image too large. Please use a screenshot under 4MB.')
      return
    }
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setScreenshotError('Unsupported format. Please use jpg, png, or webp.')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setScreenshot({ preview: dataUrl, base64, mediaType: file.type })
    }
    reader.readAsDataURL(file)
  }

  async function handleExtract() {
    if (!screenshot) return
    setExtracting(true)
    setExtractBanner(null)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token ?? ''
      const { data, error: fnErr } = await supabase.functions.invoke('extract-lead-from-image', {
        body: { image_base64: screenshot.base64, media_type: screenshot.mediaType },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (fnErr || !data || data.error) {
        setExtractBanner('error')
      } else {
        const d = data.data as {
          first_name?: string | null
          last_name?: string | null
          email?: string | null
          linkedin_url?: string | null
          company?: string | null
          role_title?: string | null
          country?: string | null
        }
        setForm((f) => ({
          ...f,
          first_name: d.first_name ?? f.first_name,
          last_name: d.last_name ?? f.last_name,
          email: d.email ?? f.email,
          linkedin_url: d.linkedin_url ?? f.linkedin_url,
          company: d.company ?? f.company,
          role_title: d.role_title ?? f.role_title,
          country: d.country ?? f.country,
        }))
        setExtractBanner('success')
      }
    } catch {
      setExtractBanner('error')
    } finally {
      setExtracting(false)
    }
  }

  // Fix 3: paste from clipboard — keep ref fresh to avoid stale closure
  const handleFileSelectRef = useRef(handleFileSelect)
  handleFileSelectRef.current = handleFileSelect
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) handleFileSelectRef.current(file)
          break
        }
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [])

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

  const fieldsDisabled = extracting

  return (
    <Modal title="Add lead" onClose={onClose} size="lg">
      <div style={styles.body}>
        {/* Feature 1: Screenshot upload zone */}
        <div
          style={styles.screenshotZone}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const file = e.dataTransfer.files?.[0]
            if (file) handleFileSelect(file)
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />
          {!screenshot ? (
            <button
              type="button"
              style={{
                ...styles.uploadBtn,
                ...(dragging ? {
                  borderColor: t.border.brand,
                  background: t.background.tint1,
                } : {}),
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} color={dragging ? t.border.brand : t.text.muted} />
              <span style={styles.uploadLabel}>
                {dragging ? 'Drop to upload' : 'Drop a screenshot here, paste with ⌘V, or click to upload'}
              </span>
              <span style={styles.uploadHint}>jpg, png, webp, max 4MB</span>
            </button>
          ) : (
            <div style={styles.screenshotPreview}>
              <img
                src={screenshot.preview}
                alt="Screenshot preview"
                style={styles.previewImg}
              />
              <div style={styles.screenshotActions}>
                <button
                  type="button"
                  style={{
                    ...styles.extractBtn,
                    opacity: extracting ? 0.7 : 1,
                    cursor: extracting ? 'default' : 'pointer',
                  }}
                  onClick={handleExtract}
                  disabled={extracting}
                >
                  {extracting ? 'Extracting...' : 'Extract details'}
                </button>
                <button
                  type="button"
                  style={styles.clearBtn}
                  onClick={() => {
                    setScreenshot(null)
                    setExtractBanner(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {screenshotError && (
            <p style={styles.screenshotErr}>{screenshotError}</p>
          )}

          {extractBanner === 'success' && (
            <div style={styles.extractSuccess}>
              <span style={{ flex: 1 }}>Details extracted. Please review before saving.</span>
              <button type="button" style={styles.bannerClose} onClick={() => setExtractBanner(null)}>
                <X size={13} />
              </button>
            </div>
          )}
          {extractBanner === 'error' && (
            <p style={styles.extractError}>
              Could not read this image. Please fill in the details manually.
            </p>
          )}
        </div>

        <div style={{ ...styles.grid, opacity: fieldsDisabled ? 0.5 : 1, pointerEvents: fieldsDisabled ? 'none' : undefined }}>
          <Field label="First name *">
            <input style={styles.input} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} placeholder="Jane" disabled={fieldsDisabled} />
          </Field>
          <Field label="Last name">
            <input style={styles.input} value={form.last_name} onChange={(e) => set('last_name', e.target.value)} placeholder="Smith" disabled={fieldsDisabled} />
          </Field>
          <Field label="Email">
            <input
              style={styles.input}
              type="email"
              value={form.email}
              onChange={(e) => { set('email', e.target.value); setDupWarning(null) }}
              onBlur={checkDuplicate}
              placeholder="jane@example.com"
              disabled={fieldsDisabled}
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
            <input style={styles.input} value={form.linkedin_url} onChange={(e) => set('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/..." disabled={fieldsDisabled} />
          </Field>
          <Field label="Company *" fullWidth>
            <input style={styles.input} value={form.company} onChange={(e) => set('company', e.target.value)} placeholder="Acme Corp" disabled={fieldsDisabled} />
          </Field>
          <Field label="Role title">
            <input style={styles.input} value={form.role_title} onChange={(e) => set('role_title', e.target.value)} placeholder="Head of Product" disabled={fieldsDisabled} />
          </Field>
          <Field label="Website">
            <input style={styles.input} value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://..." disabled={fieldsDisabled} />
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
                    disabled={fieldsDisabled}
                  />
                  {seg === 'security_ai' ? 'Security / AI' : 'SaaS Product'}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Source">
            <select style={styles.select} value={form.source} onChange={(e) => set('source', e.target.value as Source)} disabled={fieldsDisabled}>
              <option value="manual">Manual</option>
              <option value="csv">CSV import</option>
              <option value="apollo">Apollo</option>
              <option value="linkedin">LinkedIn</option>
              <option value="referral">Referral</option>
              <option value="linkedin_visitor">LinkedIn Visitor</option>
            </select>
            {/* Feature 3: warm lead chip for linkedin_visitor */}
            {form.source === 'linkedin_visitor' && (
              <span style={styles.warmChip}>
                Warm lead. Visited your LinkedIn page.
              </span>
            )}
          </Field>
          <Field label="Country">
            <input style={styles.input} value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="United States" disabled={fieldsDisabled} />
          </Field>
          <Field label="Notes" fullWidth>
            <textarea style={styles.textarea} value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={3} placeholder="Any context..." disabled={fieldsDisabled} />
          </Field>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <div style={styles.footer}>
          <button type="button" style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button type="button" style={{ ...styles.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving || fieldsDisabled}>
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
  screenshotZone: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  uploadBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    padding: '20px 16px',
    background: t.background.subtle,
    border: `1px dashed ${t.border.default}`,
    borderRadius: 10,
    cursor: 'pointer',
  },
  uploadLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    color: t.text.secondary,
  },
  uploadHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: t.text.muted,
  },
  screenshotPreview: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  previewImg: {
    maxHeight: 120,
    maxWidth: 220,
    objectFit: 'cover' as const,
    borderRadius: 8,
    border: `1px solid ${t.border.subtle}`,
    flexShrink: 0,
  },
  screenshotActions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    alignItems: 'flex-start',
  },
  extractBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
  },
  clearBtn: {
    background: 'none',
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
    color: t.text.muted,
  },
  screenshotErr: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.ruby,
    margin: 0,
  },
  extractSuccess: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: t.background.tint1,
    border: `1px solid ${t.border.brand}`,
    borderRadius: 8,
    padding: '10px 12px',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primaryBrand,
  },
  bannerClose: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    color: t.text.muted,
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  extractError: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
    background: t.background.subtle,
    borderRadius: 8,
    padding: '10px 12px',
    margin: 0,
  },
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
  warmChip: {
    display: 'inline-block',
    marginTop: 6,
    background: t.background.tint1,
    border: `1px solid ${t.border.brand}`,
    borderRadius: 6,
    padding: '4px 10px',
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.primaryBrand,
    fontWeight: 500,
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
