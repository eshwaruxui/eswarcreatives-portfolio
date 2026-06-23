import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Plus, Trash2, Upload, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, fonts } from '../theme'
import { Card, ui, mono, formatMoney } from './ui'
import { ProposalPreview } from './ProposalPreview'
import type { CSSProperties } from 'react'

// Auto-save draft. Only the create flow writes here; editing an existing
// proposal works against live rows and must not be shadowed by a stale draft.
// v2: the shape changed (phases now hold solution groups, plus a payment
// schedule, revision rounds and a key note), so old drafts are ignored.
const DRAFT_KEY = 'ec_proposal_draft_v2'

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
  revisionRounds: string
  keyNote: string
  schedule: PaymentInstalment[]
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

const REVISION_OPTIONS = ['1', '2', '3', '4', '5', 'Unlimited'] as const

export type ClientOption = {
  id: string
  company_name: string | null
  contact_name: string | null
  preferred_currency: string
}

export type LineItemForm = { id?: string; title: string; scope: string; amount: string }
// A solution group bundles a title + overview with one or more line items.
export type SolutionForm = { title: string; overview: string; items: LineItemForm[] }
export type PhaseForm = {
  id?: string
  name: string
  timeline: string
  solutions: SolutionForm[]
}

// One row of the payment schedule. triggeredBy = 'acceptance' marks the
// instalment confirm_proposal() turns into the first invoice.
export type PaymentInstalment = {
  label: string
  pct: string
  triggeredBy: 'acceptance' | 'manual'
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
  revision_rounds: number | null
  key_note: string | null
  status: string
  valid_until: string | null
  accepted_at: string | null
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function emptyItem(): LineItemForm {
  return { title: '', scope: '', amount: '' }
}
export function emptySolution(): SolutionForm {
  return { title: '', overview: '', items: [emptyItem()] }
}
export function emptyPhase(): PhaseForm {
  return { name: '', timeline: '', solutions: [emptySolution()] }
}
export function defaultSchedule(): PaymentInstalment[] {
  return [
    { label: 'Advance', pct: '35', triggeredBy: 'acceptance' },
    { label: 'Mid-project', pct: '35', triggeredBy: 'manual' },
    { label: 'Final', pct: '30', triggeredBy: 'manual' },
  ]
}

export function ProposalForm({
  existing = null,
  initialPhases,
  initialDocuments = [],
  initialRevisionRounds,
  initialKeyNote,
  initialSchedule,
  onSaved,
  onCancel,
  onDirtyChange,
  preview = false,
}: {
  existing?: ProposalFull | null
  initialPhases?: PhaseForm[]
  initialDocuments?: DocumentRow[]
  initialRevisionRounds?: string
  initialKeyNote?: string
  initialSchedule?: PaymentInstalment[]
  onSaved: (proposalId: string, warning?: string | null) => void
  onCancel?: () => void
  onDirtyChange?: (dirty: boolean, draftSaved: boolean) => void
  preview?: boolean
}) {
  const isNew = !existing

  const draft = useRef<DraftShape | null>(isNew ? readDraft() : null).current

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientOption[]>([])
  const documents = initialDocuments

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
  const [revisionRounds, setRevisionRounds] = useState(
    draft?.revisionRounds ?? initialRevisionRounds ?? '2'
  )
  const [keyNote, setKeyNote] = useState(draft?.keyNote ?? initialKeyNote ?? '')
  const [schedule, setSchedule] = useState<PaymentInstalment[]>(
    draft?.schedule && draft.schedule.length > 0
      ? draft.schedule
      : initialSchedule && initialSchedule.length > 0
      ? initialSchedule
      : defaultSchedule()
  )
  const [phases, setPhases] = useState<PhaseForm[]>(
    draft?.phases && draft.phases.length > 0
      ? draft.phases
      : initialPhases && initialPhases.length > 0
      ? initialPhases
      : [emptyPhase()]
  )
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  // H5 (error prevention): a field shows its inline error once it has been
  // touched, or after a submit attempt. The top banner only appears on submit.
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  function markTouched(name: string) {
    setTouched((t) => ({ ...t, [name]: true }))
  }
  function showFieldError(name: string, invalid: boolean) {
    return invalid && (submitted || !!touched[name])
  }

  const [bannerSavedAt, setBannerSavedAt] = useState<string | null>(draft?.savedAt ?? null)
  const [draftSaved, setDraftSaved] = useState(draft != null)
  const dirtyRef = useRef(false)
  const skipFirstAutosave = useRef(true)

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

  // Debounced auto-save (create flow only).
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
        revisionRounds,
        keyNote,
        schedule,
        phases,
      }
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
        setDraftSaved(true)
        onDirtyChange?.(true, true)
      } catch {
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
    revisionRounds,
    keyNote,
    schedule,
    phases,
  ])

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
    setRevisionRounds('2')
    setKeyNote('')
    setSchedule(defaultSchedule())
    setPhases([emptyPhase()])
    onDirtyChange?.(false, false)
  }

  // ── Totals ──────────────────────────────────────────────────────────
  function phaseTotal(ph: PhaseForm): number {
    return ph.solutions.reduce(
      (s, sol) => s + sol.items.reduce((t, it) => t + (parseFloat(it.amount) || 0), 0),
      0
    )
  }
  const subtotal = useMemo(() => phases.reduce((sum, ph) => sum + phaseTotal(ph), 0), [phases])
  const discountAmount = discountPct ? (subtotal * (parseFloat(discountPct) || 0)) / 100 : 0
  const total = Math.max(0, subtotal - discountAmount)

  const scheduleSum = useMemo(
    () => schedule.reduce((s, r) => s + (parseFloat(r.pct) || 0), 0),
    [schedule]
  )
  const scheduleValid = Math.abs(scheduleSum - 100) < 0.001

  const hasLineItem = phases.some((ph) => ph.solutions.some((sol) => sol.items.some((it) => it.title.trim())))

  // ── Phase / solution / line-item editing helpers ────────────────────
  function updatePhase(i: number, patch: Partial<PhaseForm>) {
    setPhases((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)))
  }
  function updateSolution(pi: number, si: number, patch: Partial<SolutionForm>) {
    setPhases((prev) =>
      prev.map((p, idx) =>
        idx === pi
          ? { ...p, solutions: p.solutions.map((s, j) => (j === si ? { ...s, ...patch } : s)) }
          : p
      )
    )
  }
  function updateItem(pi: number, si: number, ii: number, patch: Partial<LineItemForm>) {
    setPhases((prev) =>
      prev.map((p, idx) =>
        idx === pi
          ? {
              ...p,
              solutions: p.solutions.map((s, j) =>
                j === si
                  ? { ...s, items: s.items.map((it, k) => (k === ii ? { ...it, ...patch } : it)) }
                  : s
              ),
            }
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

  // ── Payment schedule helpers ────────────────────────────────────────
  function updateInstalment(i: number, patch: Partial<PaymentInstalment>) {
    setSchedule((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
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

  // Plain-language summary of the schedule, kept in the NOT NULL payment_terms
  // column so existing client views still have a readable string.
  function scheduleSummary(): string {
    const parts = schedule
      .filter((r) => r.label.trim())
      .map((r) => `${parseFloat(r.pct) || 0}% ${r.label.trim()}`)
    const rev = revisionRounds === 'Unlimited' ? 'Unlimited' : revisionRounds
    return `${parts.join(', ')}. ${rev} revision rounds included per solution.`
  }

  function firstRequiredError(): string | null {
    if (!title.trim()) return 'Title is required.'
    if (!companyName.trim()) return 'Company name is required.'
    if (!clientName.trim()) return 'Client name is required.'
    if (!validUntil) return 'Valid-until date is required.'
    if (!hasLineItem) return 'Add at least one phase with a line item.'
    return null
  }

  async function handleSave(status: 'draft' | 'sent') {
    setSubmitted(true)
    const reqErr = firstRequiredError()
    if (reqErr) {
      setError(reqErr)
      return
    }
    if (status === 'sent' && !scheduleValid) {
      setError(`Payment schedule must total 100%. It currently totals ${scheduleSum}%.`)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { data: sess } = await supabase.auth.getUser()
      const uid = sess.user?.id ?? null

      let proposalId = existing?.id
      let proposalNumber = existing?.proposal_number ?? null

      const contentSnapshot = {
        source: 'admin-portal',
        payment_terms: scheduleSummary(),
        revision_rounds: revisionRounds,
        key_note: keyNote,
        schedule: schedule.map((r) => ({ label: r.label, pct: r.pct, triggered_by: r.triggeredBy })),
        phases: phases.map((p) => ({
          name: p.name,
          timeline: p.timeline,
          solutions: p.solutions.map((s) => ({
            title: s.title,
            overview: s.overview,
            items: s.items.map((it) => ({
              title: it.title,
              scope: it.scope,
              amount: parseFloat(it.amount) || 0,
            })),
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
        payment_terms: scheduleSummary(),
        revision_rounds: revisionRounds === 'Unlimited' ? null : parseInt(revisionRounds, 10),
        key_note: keyNote.trim() || null,
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

      // Insert phases, then each phase's line items (carrying their solution group).
      for (let pi = 0; pi < phases.length; pi++) {
        const ph = phases[pi]
        const phaseHasItems = ph.solutions.some((s) => s.items.some((it) => it.title.trim()))
        if (!ph.name.trim() && !phaseHasItems) continue
        const { data: phaseRow, error: phErr } = await supabase
          .from('proposal_phases')
          .insert({
            proposal_id: proposalId,
            phase_number: pi + 1,
            name: ph.name.trim() || `Phase ${pi + 1}`,
            timeline: ph.timeline.trim() || null,
            sort_order: pi,
          })
          .select('id')
          .single()
        if (phErr) throw phErr
        const phaseId = (phaseRow as { id: string }).id

        const items: Record<string, unknown>[] = []
        let itemNumber = 0
        for (const sol of ph.solutions) {
          for (const it of sol.items) {
            if (!it.title.trim()) continue
            itemNumber += 1
            items.push({
              phase_id: phaseId,
              item_number: itemNumber,
              title: it.title.trim(),
              scope: it.scope.trim() || null,
              amount: parseFloat(it.amount) || 0,
              solution_title: sol.title.trim() || null,
              solution_overview: sol.overview.trim() || null,
            })
          }
        }
        if (items.length > 0) {
          const { error: iErr } = await supabase.from('proposal_line_items').insert(items)
          if (iErr) throw iErr
        }
      }

      // Replace the payment schedule wholesale.
      await supabase.from('proposal_payment_schedule').delete().eq('proposal_id', proposalId)
      const scheduleRows = schedule
        .filter((r) => r.label.trim() && r.pct)
        .map((r, idx) => ({
          proposal_id: proposalId,
          instalment_number: idx + 1,
          label: r.label.trim(),
          pct_of_total: parseFloat(r.pct) || 0,
          triggered_by: r.triggeredBy,
        }))
      if (scheduleRows.length > 0) {
        const { error: schErr } = await supabase
          .from('proposal_payment_schedule')
          .insert(scheduleRows)
        if (schErr) throw schErr
      }

      let warning: string | null = null
      if (pendingFiles.length > 0 && proposalId) {
        warning = await uploadDocuments(proposalId)
      }

      clearStoredDraft()
      dirtyRef.current = false
      setDraftSaved(false)
      onDirtyChange?.(false, false)

      onSaved(proposalId, warning)
    } catch {
      // H9: plain-language error with a next step, never a raw Supabase string.
      setError('Could not save the proposal. Check the details and try again.')
    } finally {
      setSaving(false)
    }
  }

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

  // ── Client-facing preview (solutions flattened into line items) ─────
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
          items: p.solutions
            .flatMap((s) => s.items)
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
        paymentTerms={scheduleSummary()}
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
          <Field label="Company name" required error={showFieldError('companyName', !companyName.trim()) ? 'Company name is required' : null}>
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onBlur={() => markTouched('companyName')}
              style={inputStyle(showFieldError('companyName', !companyName.trim()))}
            />
          </Field>
          <Field label="Client / contact name" required error={showFieldError('clientName', !clientName.trim()) ? 'Client name is required' : null}>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              onBlur={() => markTouched('clientName')}
              style={inputStyle(showFieldError('clientName', !clientName.trim()))}
            />
          </Field>
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h3 style={styles.phaseName}>Proposal</h3>
        <div style={styles.formGrid}>
          <Field label="Title" wide required error={showFieldError('title', !title.trim()) ? 'Title is required' : null}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => markTouched('title')}
              style={inputStyle(showFieldError('title', !title.trim()))}
            />
          </Field>
          <Field label="Vertical">
            <select value={vertical} onChange={(e) => setVertical(e.target.value)} style={styles.input}>
              <option value="brand">Brand</option>
              <option value="saas">SaaS</option>
            </select>
          </Field>
          <Field label="Valid until" required error={showFieldError('validUntil', !validUntil) ? 'Valid-until date is required' : null}>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              onBlur={() => markTouched('validUntil')}
              style={inputStyle(showFieldError('validUntil', !validUntil))}
            />
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
          </div>

          {/* Read-only phase total = sum of every line item in this phase. */}
          <div style={styles.phaseTotalRow}>
            <span style={ui.muted}>Phase total</span>
            <span style={{ fontFamily: mono, fontWeight: 600 }}>
              {formatMoney(phaseTotal(ph), currency)}
            </span>
          </div>

          {ph.solutions.map((sol, si) => (
            <div key={si} style={styles.solutionCard}>
              <div style={styles.solutionHead}>
                <span style={styles.solutionTag}>Solution {si + 1}</span>
                {ph.solutions.length > 1 && (
                  <button
                    type="button"
                    style={styles.iconBtn}
                    onClick={() => updatePhase(pi, { solutions: ph.solutions.filter((_, j) => j !== si) })}
                    aria-label="Remove solution"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <Field label="Solution title">
                <input
                  value={sol.title}
                  onChange={(e) => updateSolution(pi, si, { title: e.target.value })}
                  style={styles.input}
                  placeholder="e.g. Brand identity system"
                />
              </Field>
              <Field label="Solution overview">
                <AutoGrowTextarea
                  value={sol.overview}
                  onChange={(v) => updateSolution(pi, si, { overview: v })}
                  placeholder="What this solution delivers. Paste from a doc; formatting is stripped to plain text."
                />
              </Field>

              <div style={styles.itemsHead}>Line items</div>
              {sol.items.map((it, ii) => (
                <div key={ii} style={styles.itemEditRow}>
                  <input
                    value={it.title}
                    onChange={(e) => updateItem(pi, si, ii, { title: e.target.value })}
                    style={{ ...styles.input, flex: 2 }}
                    placeholder="Item title"
                  />
                  <input
                    value={it.scope}
                    onChange={(e) => updateItem(pi, si, ii, { scope: e.target.value })}
                    style={{ ...styles.input, flex: 3 }}
                    placeholder="Scope"
                  />
                  <input
                    value={it.amount}
                    onChange={(e) => updateItem(pi, si, ii, { amount: e.target.value })}
                    style={{ ...styles.input, flex: 1, fontFamily: mono }}
                    placeholder="Amount"
                    inputMode="decimal"
                  />
                  {sol.items.length > 1 && (
                    <button
                      type="button"
                      style={styles.iconBtn}
                      onClick={() => updateSolution(pi, si, { items: sol.items.filter((_, j) => j !== ii) })}
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
                onClick={() => updateSolution(pi, si, { items: [...sol.items, emptyItem()] })}
              >
                <Plus size={14} /> Add line item
              </button>
            </div>
          ))}

          <button
            type="button"
            style={styles.addBtn}
            onClick={() => updatePhase(pi, { solutions: [...ph.solutions, emptySolution()] })}
          >
            <Plus size={14} /> Add solution
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
          <Field label="Revision rounds">
            <select value={revisionRounds} onChange={(e) => setRevisionRounds(e.target.value)} style={styles.input}>
              {REVISION_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Key note">
            <input value={keyNote} onChange={(e) => setKeyNote(e.target.value)} style={styles.input} placeholder="One-line highlight for the client" />
          </Field>
        </div>

        {/* Payment schedule builder (replaces the old free-text terms). */}
        <div style={styles.scheduleHead}>Payment schedule</div>
        {schedule.map((row, i) => (
          <div key={i} style={styles.scheduleRow}>
            <input
              value={row.label}
              onChange={(e) => updateInstalment(i, { label: e.target.value })}
              style={{ ...styles.input, flex: 3 }}
              placeholder="Label, e.g. Advance"
            />
            <input
              value={row.pct}
              onChange={(e) => updateInstalment(i, { pct: e.target.value })}
              style={{ ...styles.input, flex: 1, fontFamily: mono }}
              placeholder="%"
              inputMode="decimal"
            />
            <select
              value={row.triggeredBy}
              onChange={(e) => updateInstalment(i, { triggeredBy: e.target.value as PaymentInstalment['triggeredBy'] })}
              style={{ ...styles.input, flex: 2 }}
            >
              <option value="acceptance">On acceptance</option>
              <option value="manual">Manual</option>
            </select>
            {schedule.length > 1 && (
              <button
                type="button"
                style={styles.iconBtn}
                onClick={() => setSchedule((prev) => prev.filter((_, j) => j !== i))}
                aria-label="Remove instalment"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
        <div style={styles.scheduleFootRow}>
          <button
            type="button"
            style={styles.addBtn}
            onClick={() => setSchedule((prev) => [...prev, { label: '', pct: '', triggeredBy: 'manual' }])}
          >
            <Plus size={14} /> Add instalment
          </button>
          <span style={{ ...styles.scheduleSum, color: scheduleValid ? tokens.green : tokens.ruby }}>
            Total {scheduleSum}%
          </span>
        </div>
        {!scheduleValid && (
          <div style={styles.scheduleError}>
            Total must equal 100%. Currently {scheduleSum}%.
          </div>
        )}

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
        {/* H5: Send is disabled until the schedule is valid (sums to 100). */}
        <button
          type="button"
          style={{ ...ui.primaryBtn, ...(!scheduleValid ? styles.disabledBtn : null) }}
          onClick={() => handleSave('sent')}
          disabled={saving || !scheduleValid}
        >
          {saving ? 'Saving...' : 'Send to client'}
        </button>
      </div>
    </>
  )
}

// Plain <textarea> that grows to fit its content. Pasting rich text into a
// textarea yields plain text automatically.
function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      style={{ ...styles.input, resize: 'none', overflow: 'hidden', minHeight: 52 }}
    />
  )
}

function inputStyle(hasError: boolean): CSSProperties {
  return hasError ? { ...styles.input, borderColor: tokens.ruby } : styles.input
}

function Field({
  label,
  wide,
  required,
  error,
  children,
}: {
  label: string
  wide?: boolean
  required?: boolean
  error?: string | null
  children: React.ReactNode
}) {
  return (
    <label style={{ ...styles.field, gridColumn: wide ? '1 / -1' : undefined }}>
      <span style={styles.fieldLabel}>
        {label}
        {required && <span style={styles.requiredStar}> *</span>}
      </span>
      {children}
      {error && <span style={styles.fieldError}>{error}</span>}
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
  phaseTotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    margin: '4px 0 8px',
    borderTop: `1px solid ${tokens.border}`,
    borderBottom: `1px solid ${tokens.border}`,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  solutionCard: {
    background: tokens.bg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 10,
    padding: 14,
    margin: '12px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  solutionHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  solutionTag: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: tokens.accent,
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
  scheduleHead: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: tokens.text,
    margin: '20px 0 10px',
  },
  scheduleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  scheduleFootRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scheduleSum: {
    fontFamily: mono,
    fontSize: 13,
    fontWeight: 600,
  },
  scheduleError: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    borderRadius: 8,
    padding: '8px 12px',
    marginTop: 8,
    fontFamily: fonts.body,
    fontSize: 13,
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
  requiredStar: { color: tokens.ruby },
  fieldError: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.ruby,
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
    margin: '4px 0 8px',
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
  disabledBtn: { opacity: 0.5, cursor: 'not-allowed' },
}
