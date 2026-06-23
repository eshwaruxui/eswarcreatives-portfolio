import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Trash2, Upload, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, fonts } from '../theme'
import { Card, ui, mono, formatMoney } from './ui'
import { ProposalPreview } from './ProposalPreview'
import type { CSSProperties } from 'react'

// Auto-save draft. Only the create flow writes here; editing an existing
// proposal works against live rows and must not be shadowed by a stale draft.
const DRAFT_KEY = 'ec_proposal_draft'

type DraftShape = {
  savedAt: string
  clientId: string
  clientName: string
  companyName: string
  title: string
  vertical: string
  currency: string
  validUntil: string
  discountPct: string
  discountLabel: string
  paymentTerms: string
  phases: PhaseForm[]
}

function readDraft(): DraftShape | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed as DraftShape
  } catch {
    return null
  }
}

function clearStoredDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {
    // localStorage may be unavailable (private mode); nothing to clean up.
  }
}

function formatSavedTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  } catch {
    return iso
  }
}

// The proposal create/edit form, shared by the "New proposal" modal (creation)
// and the proposal detail page (Edit). Kept as a single source of truth so the
// two flows can never drift. The caller owns the surrounding chrome: the modal
// supplies a title via <Modal>, the detail page supplies a page header.
const BUCKET = 'proposal-documents'

const DEFAULT_TERMS =
  '50% advance, 25% mid-project, 25% on delivery. 2 revision rounds included per solution.'

export type ClientOption = {
  id: string
  company_name: string | null
  contact_name: string | null
  preferred_currency: string
}

export type LineItemForm = { id?: string; title: string; scope: string; amount: string }
export type PhaseForm = {
  id?: string
  name: string
  timeline: string
  scope: string
  items: LineItemForm[]
}

export type DocumentRow = {
  id: string
  file_name: string
  file_size: number | null
  storage_path: string | null
}

export type ProposalFull = {
  id: string
  proposal_number: string | null
  client_id: string | null
  client_name: string | null
  company_name: string | null
  title: string
  vertical: string
  currency: string
  total_amount: number
  discount_pct: number | null
  discount_label: string | null
  payment_terms: string
  status: string
  valid_until: string | null
  accepted_at: string | null
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function emptyPhase(): PhaseForm {
  return { name: '', timeline: '', scope: '', items: [{ title: '', scope: '', amount: '' }] }
}

export function ProposalForm({
  existing = null,
  initialPhases,
  initialDocuments = [],
  onSaved,
  onCancel,
  onDirtyChange,
  preview = false,
}: {
  existing?: ProposalFull | null
  initialPhases?: PhaseForm[]
  initialDocuments?: DocumentRow[]
  onSaved: (proposalId: string, warning?: string | null) => void
  onCancel?: () => void
  // Reports (isDirty, hasSavedDraft) up so the modal can decide whether to
  // confirm before closing. Only meaningful for the create flow.
  onDirtyChange?: (dirty: boolean, draftSaved: boolean) => void
  // Renders the read-only client-facing view instead of the editable form.
  // Driven by the modal header's "Client view" toggle.
  preview?: boolean
}) {
  const isNew = !existing

  // A restored draft (create flow only) seeds the initial field values below.
  const draft = useRef<DraftShape | null>(isNew ? readDraft() : null).current

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientOption[]>([])
  const documents = initialDocuments

  // Form state (hydrated from `existing` when editing, or a restored draft).
  const [clientId, setClientId] = useState(draft?.clientId ?? existing?.client_id ?? '')
  const [clientName, setClientName] = useState(draft?.clientName ?? existing?.client_name ?? '')
  const [companyName, setCompanyName] = useState(draft?.companyName ?? existing?.company_name ?? '')
  const [title, setTitle] = useState(draft?.title ?? existing?.title ?? '')
  const [vertical, setVertical] = useState(draft?.vertical ?? existing?.vertical ?? 'brand')
  const [currency, setCurrency] = useState(draft?.currency ?? existing?.currency ?? 'INR')
  const [validUntil, setValidUntil] = useState(draft?.validUntil ?? existing?.valid_until ?? '')
  const [discountPct, setDiscountPct] = useState(
    draft?.discountPct ?? (existing?.discount_pct != null ? String(existing.discount_pct) : '')
  )
  const [discountLabel, setDiscountLabel] = useState(draft?.discountLabel ?? existing?.discount_label ?? '')
  const [paymentTerms, setPaymentTerms] = useState(
    draft?.paymentTerms ?? existing?.payment_terms ?? DEFAULT_TERMS
  )
  const [phases, setPhases] = useState<PhaseForm[]>(
    draft?.phases && draft.phases.length > 0
      ? draft.phases
      : initialPhases && initialPhases.length > 0
      ? initialPhases
      : [emptyPhase()]
  )
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  // Draft banner + close-guard bookkeeping (create flow only).
  const [bannerSavedAt, setBannerSavedAt] = useState<string | null>(draft?.savedAt ?? null)
  const [draftSaved, setDraftSaved] = useState(draft != null)
  const dirtyRef = useRef(false)
  const skipFirstAutosave = useRef(true)

  // Load existing clients (for the optional link dropdown).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('clients')
        .select('id, company_name, contact_name, preferred_currency')
        .order('company_name', { ascending: true })
      if (!cancelled) setClients((data ?? []) as ClientOption[])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Debounced auto-save: on any field change, mark the form dirty and write the
  // current state to localStorage 800ms later. Create flow only.
  useEffect(() => {
    if (!isNew) return
    if (skipFirstAutosave.current) {
      skipFirstAutosave.current = false
      return
    }
    dirtyRef.current = true
    const handle = setTimeout(() => {
      const payload: DraftShape = {
        savedAt: new Date().toISOString(),
        clientId,
        clientName,
        companyName,
        title,
        vertical,
        currency,
        validUntil,
        discountPct,
        discountLabel,
        paymentTerms,
        phases,
      }
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
        setDraftSaved(true)
        onDirtyChange?.(true, true)
      } catch {
        // Storage unavailable: keep the dirty flag so the close-guard still fires.
        onDirtyChange?.(true, false)
      }
    }, 800)
    onDirtyChange?.(true, draftSaved)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    clientId,
    clientName,
    companyName,
    title,
    vertical,
    currency,
    validUntil,
    discountPct,
    discountLabel,
    paymentTerms,
    phases,
  ])

  // Wipe the restored draft and reset the create form to empty.
  function clearDraft() {
    clearStoredDraft()
    setBannerSavedAt(null)
    setDraftSaved(false)
    dirtyRef.current = false
    setClientId('')
    setClientName('')
    setCompanyName('')
    setTitle('')
    setVertical('brand')
    setCurrency('INR')
    setValidUntil('')
    setDiscountPct('')
    setDiscountLabel('')
    setPaymentTerms(DEFAULT_TERMS)
    setPhases([emptyPhase()])
    onDirtyChange?.(false, false)
  }

  const subtotal = useMemo(
    () =>
      phases.reduce(
        (sum, ph) => sum + ph.items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0),
        0
      ),
    [phases]
  )
  const discountAmount = discountPct ? (subtotal * (parseFloat(discountPct) || 0)) / 100 : 0
  const total = Math.max(0, subtotal - discountAmount)

  // ── Phase / line-item editing helpers ──────────────────────────────
  function updatePhase(i: number, patch: Partial<PhaseForm>) {
    setPhases((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }
  function updateItem(pi: number, ii: number, patch: Partial<LineItemForm>) {
    setPhases((prev) =>
      prev.map((p, idx) =>
        idx === pi
          ? { ...p, items: p.items.map((it, j) => (j === ii ? { ...it, ...patch } : it)) }
          : p
      )
    )
  }

  function onSelectClient(value: string) {
    setClientId(value)
    const c = clients.find((x) => x.id === value)
    if (c) {
      setCompanyName(c.company_name ?? '')
      setClientName(c.contact_name ?? '')
      setCurrency(c.preferred_currency || 'INR')
    }
  }

  async function nextProposalNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `EC-P-${year}-`
    const { data } = await supabase
      .from('proposals')
      .select('proposal_number')
      .like('proposal_number', `${prefix}%`)
    let max = 0
    for (const row of data ?? []) {
      const n = parseInt((row.proposal_number ?? '').slice(prefix.length), 10)
      if (!Number.isNaN(n) && n > max) max = n
    }
    return `${prefix}${String(max + 1).padStart(3, '0')}`
  }

  function validate(): string | null {
    if (!title.trim()) return 'Title is required.'
    if (!companyName.trim()) return 'Company name is required.'
    if (!clientName.trim()) return 'Client name is required.'
    if (!validUntil) return 'Valid-until date is required.'
    return null
  }

  async function handleSave(status: 'draft' | 'sent') {
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { data: sess } = await supabase.auth.getUser()
      const uid = sess.user?.id ?? null

      let proposalId = existing?.id
      let proposalNumber = existing?.proposal_number ?? null

      // A compact snapshot keeps the legacy NOT NULL `content` column valid and
      // gives the client view something to read; the phases/line_items tables
      // remain the source of truth.
      const contentSnapshot = {
        source: 'admin-portal',
        payment_terms: paymentTerms,
        phases: phases.map((p) => ({
          name: p.name,
          timeline: p.timeline,
          scope: p.scope,
          items: p.items.map((it) => ({
            title: it.title,
            scope: it.scope,
            amount: parseFloat(it.amount) || 0,
          })),
        })),
      }

      const fields = {
        client_id: clientId || null,
        client_name: clientName.trim(),
        company_name: companyName.trim(),
        title: title.trim(),
        vertical,
        currency,
        total_amount: total,
        discount_pct: discountPct ? parseFloat(discountPct) : null,
        discount_label: discountLabel.trim() || null,
        payment_terms: paymentTerms,
        status,
        valid_until: validUntil,
        content: contentSnapshot,
      }

      if (isNew || !proposalId) {
        proposalNumber = await nextProposalNumber()
        const { data: inserted, error: insErr } = await supabase
          .from('proposals')
          .insert({
            ...fields,
            proposal_number: proposalNumber,
            slug: slugify(proposalNumber),
            created_by: uid,
            ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
          })
          .select('id')
          .single()
        if (insErr) throw insErr
        proposalId = (inserted as { id: string }).id
      } else {
        const { error: updErr } = await supabase
          .from('proposals')
          .update({
            ...fields,
            ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
          })
          .eq('id', proposalId)
        if (updErr) throw updErr
        // Replace phases/line items wholesale (cascade clears line items).
        await supabase.from('proposal_phases').delete().eq('proposal_id', proposalId)
      }

      // Insert phases then their line items, in order.
      for (let pi = 0; pi < phases.length; pi++) {
        const ph = phases[pi]
        if (!ph.name.trim() && ph.items.every((it) => !it.title.trim())) continue
        const { data: phaseRow, error: phErr } = await supabase
          .from('proposal_phases')
          .insert({
            proposal_id: proposalId,
            phase_number: pi + 1,
            name: ph.name.trim() || `Phase ${pi + 1}`,
            timeline: ph.timeline.trim() || null,
            scope: ph.scope.trim() || null,
            sort_order: pi,
          })
          .select('id')
          .single()
        if (phErr) throw phErr
        const phaseId = (phaseRow as { id: string }).id
        const items = ph.items
          .filter((it) => it.title.trim())
          .map((it, ii) => ({
            phase_id: phaseId,
            item_number: ii + 1,
            title: it.title.trim(),
            scope: it.scope.trim() || null,
            amount: parseFloat(it.amount) || 0,
          }))
        if (items.length > 0) {
          const { error: iErr } = await supabase.from('proposal_line_items').insert(items)
          if (iErr) throw iErr
        }
      }

      // Upload any pending documents (best-effort; proposal already saved).
      let warning: string | null = null
      if (pendingFiles.length > 0 && proposalId) {
        warning = await uploadDocuments(proposalId)
      }

      // The proposal is persisted; the autosave draft is no longer needed.
      clearStoredDraft()
      dirtyRef.current = false
      setDraftSaved(false)
      onDirtyChange?.(false, false)

      onSaved(proposalId, warning)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  // Returns a human message if some uploads failed, else null.
  async function uploadDocuments(proposalId: string): Promise<string | null> {
    const failures: string[] = []
    for (const file of pendingFiles) {
      const path = `${proposalId}/${file.name}`
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) {
        failures.push(file.name)
        continue
      }
      await supabase.from('proposal_documents').insert({
        proposal_id: proposalId,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        storage_path: path,
      })
    }
    setPendingFiles([])
    if (failures.length > 0) {
      return `Saved, but ${failures.length} document(s) failed to upload (is the proposal-documents bucket set up?).`
    }
    return null
  }

  // ── Client-facing preview ───────────────────────────────────────────
  if (preview) {
    return (
      <ProposalPreview
        studioName="Eswar Creatives"
        proposalNumber={existing?.proposal_number ?? 'Draft'}
        title={title}
        clientName={clientName}
        companyName={companyName}
        currency={currency}
        phases={phases.map((p) => ({
          name: p.name,
          timeline: p.timeline,
          items: p.items
            .filter((it) => it.title.trim() || parseFloat(it.amount))
            .map((it) => ({
              title: it.title,
              scope: it.scope,
              amount: parseFloat(it.amount) || 0,
            })),
        }))}
        subtotal={subtotal}
        discountLabel={discountLabel || (discountPct ? `Discount ${discountPct}%` : null)}
        discountAmount={discountAmount}
        total={total}
        paymentTerms={paymentTerms}
      />
    )
  }

  // ── Create / edit form ──────────────────────────────────────────────
  return (
    <>
      {error && <div style={styles.error}>{error}</div>}

      {bannerSavedAt && (
        <div style={styles.draftBanner}>
          <span>Draft restored. Last saved {formatSavedTime(bannerSavedAt)}.</span>
          <button type="button" style={styles.draftClear} onClick={clearDraft}>
            Clear draft
          </button>
        </div>
      )}

      <Card style={{ marginBottom: 16 }}>
        <h3 style={styles.phaseName}>Client</h3>
        <div style={styles.formGrid}>
          <Field label="Link existing client (optional)">
            <select value={clientId} onChange={(e) => onSelectClient(e.target.value)} style={styles.input}>
              <option value="">Not linked / new company</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name || c.contact_name || '(unnamed)'}
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
          <Field label="Company name">
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={styles.input} />
          </Field>
          <Field label="Client / contact name">
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} style={styles.input} />
          </Field>
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h3 style={styles.phaseName}>Proposal</h3>
        <div style={styles.formGrid}>
          <Field label="Title" wide>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={styles.input} />
          </Field>
          <Field label="Vertical">
            <select value={vertical} onChange={(e) => setVertical(e.target.value)} style={styles.input}>
              <option value="brand">Brand</option>
              <option value="saas">SaaS</option>
            </select>
          </Field>
          <Field label="Valid until">
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} style={styles.input} />
          </Field>
        </div>
      </Card>

      {phases.map((ph, pi) => (
        <Card key={pi} style={{ marginBottom: 12 }}>
          <div style={styles.phaseHeadEdit}>
            <h3 style={styles.phaseName}>Phase {pi + 1}</h3>
            {phases.length > 1 && (
              <button
                type="button"
                style={styles.iconBtn}
                onClick={() => setPhases((prev) => prev.filter((_, idx) => idx !== pi))}
                aria-label="Remove phase"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
          <div style={styles.formGrid}>
            <Field label="Phase name">
              <input value={ph.name} onChange={(e) => updatePhase(pi, { name: e.target.value })} style={styles.input} />
            </Field>
            <Field label="Timeline">
              <input value={ph.timeline} onChange={(e) => updatePhase(pi, { timeline: e.target.value })} style={styles.input} placeholder="e.g. Month 1-2" />
            </Field>
            <Field label="Scope" wide>
              <input value={ph.scope} onChange={(e) => updatePhase(pi, { scope: e.target.value })} style={styles.input} />
            </Field>
          </div>

          <div style={styles.itemsHead}>Line items</div>
          {ph.items.map((it, ii) => (
            <div key={ii} style={styles.itemEditRow}>
              <input
                value={it.title}
                onChange={(e) => updateItem(pi, ii, { title: e.target.value })}
                style={{ ...styles.input, flex: 2 }}
                placeholder="Item title"
              />
              <input
                value={it.scope}
                onChange={(e) => updateItem(pi, ii, { scope: e.target.value })}
                style={{ ...styles.input, flex: 3 }}
                placeholder="Scope"
              />
              <input
                value={it.amount}
                onChange={(e) => updateItem(pi, ii, { amount: e.target.value })}
                style={{ ...styles.input, flex: 1, fontFamily: mono }}
                placeholder="Amount"
                inputMode="decimal"
              />
              {ph.items.length > 1 && (
                <button
                  type="button"
                  style={styles.iconBtn}
                  onClick={() => updatePhase(pi, { items: ph.items.filter((_, j) => j !== ii) })}
                  aria-label="Remove item"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            style={styles.addBtn}
            onClick={() => updatePhase(pi, { items: [...ph.items, { title: '', scope: '', amount: '' }] })}
          >
            <Plus size={14} /> Add line item
          </button>
        </Card>
      ))}

      <button type="button" style={styles.addPhaseBtn} onClick={() => setPhases((prev) => [...prev, emptyPhase()])}>
        <Plus size={16} /> Add phase
      </button>

      <Card style={{ margin: '16px 0' }}>
        <h3 style={styles.phaseName}>Pricing & terms</h3>
        <div style={styles.formGrid}>
          <Field label="Discount %">
            <input value={discountPct} onChange={(e) => setDiscountPct(e.target.value)} style={{ ...styles.input, fontFamily: mono }} inputMode="decimal" placeholder="optional" />
          </Field>
          <Field label="Discount label">
            <input value={discountLabel} onChange={(e) => setDiscountLabel(e.target.value)} style={styles.input} placeholder="e.g. Launch offer" />
          </Field>
          <Field label="Payment terms" wide>
            <textarea value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} style={{ ...styles.input, minHeight: 60, resize: 'vertical' }} />
          </Field>
        </div>
        <div style={styles.totalsRow}>
          <span style={ui.muted}>Subtotal</span>
          <span style={{ fontFamily: mono }}>{formatMoney(subtotal, currency)}</span>
        </div>
        {discountAmount > 0 && (
          <div style={styles.totalsRow}>
            <span style={ui.muted}>{discountLabel || `Discount ${discountPct}%`}</span>
            <span style={{ fontFamily: mono, color: tokens.ruby }}>-{formatMoney(discountAmount, currency)}</span>
          </div>
        )}
        <div style={{ ...styles.totalsRow, borderTop: `1px solid ${tokens.border}`, paddingTop: 10 }}>
          <span style={{ fontWeight: 600 }}>Total</span>
          <span style={{ fontFamily: mono, fontWeight: 600, fontSize: 16 }}>{formatMoney(total, currency)}</span>
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h3 style={styles.phaseName}>Documents</h3>
        <label style={styles.fileLabel}>
          <input
            type="file"
            multiple
            onChange={(e) => setPendingFiles(Array.from(e.target.files ?? []))}
            style={{ display: 'none' }}
          />
          <span style={styles.fileBtn}>
            <Upload size={15} /> Choose files
          </span>
          {pendingFiles.length > 0 && (
            <span style={ui.muted}>{pendingFiles.length} file(s) selected</span>
          )}
        </label>
        {documents.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {documents.map((d) => (
              <div key={d.id} style={styles.docRow}>
                <FileText size={16} style={{ color: tokens.accent }} />
                <span style={styles.docName}>{d.file_name}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={styles.actions}>
        {onCancel && (
          <button type="button" style={styles.secondaryBtn} onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
        <button type="button" style={styles.secondaryBtn} onClick={() => handleSave('draft')} disabled={saving}>
          {saving ? 'Saving...' : 'Save as draft'}
        </button>
        <button type="button" style={ui.primaryBtn} onClick={() => handleSave('sent')} disabled={saving}>
          {saving ? 'Saving...' : 'Send to client'}
        </button>
      </div>
    </>
  )
}

function Field({
  label,
  wide,
  children,
}: {
  label: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <label style={{ ...styles.field, gridColumn: wide ? '1 / -1' : undefined }}>
      <span style={styles.fieldLabel}>{label}</span>
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
  draftBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    background: tokens.goldLight,
    color: tokens.goldDark,
    border: `1px solid ${tokens.gold}`,
    borderRadius: 8,
    padding: '8px 12px',
    marginBottom: 16,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  draftClear: {
    background: 'transparent',
    border: 'none',
    color: tokens.goldDark,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
    whiteSpace: 'nowrap',
  },
  phaseHeadEdit: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  phaseName: {
    fontFamily: fonts.heading,
    fontSize: 17,
    fontWeight: 600,
    color: tokens.text,
    margin: '0 0 12px',
  },
  totalsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    fontFamily: fonts.body,
    fontSize: 14,
    color: tokens.text,
  },
  docRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    background: 'transparent',
    border: 'none',
    width: '100%',
    textAlign: 'left',
  },
  docName: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: tokens.text,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: tokens.textMuted,
  },
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
  itemsHead: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: tokens.textMuted,
    margin: '16px 0 8px',
  },
  itemEditRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  iconBtn: {
    background: 'transparent',
    border: 'none',
    color: tokens.textMuted,
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'transparent',
    border: 'none',
    color: tokens.accent,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '4px 0',
  },
  addPhaseBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.tealLight,
    border: 'none',
    color: tokens.primary,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '10px 16px',
    borderRadius: 8,
  },
  fileLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    cursor: 'pointer',
  },
  fileBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.tealLight,
    color: tokens.primary,
    borderRadius: 8,
    padding: '9px 14px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 12,
  },
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
