import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Plus, Trash2, ArrowLeft, Upload, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, fonts } from '../theme'
import {
  PageHeader,
  Card,
  StatusBadge,
  ui,
  mono,
  formatMoney,
  formatDate,
} from './ui'
import type { CSSProperties } from 'react'

const BUCKET = 'proposal-documents'

const DEFAULT_TERMS =
  '50% advance, 25% mid-project, 25% on delivery. 2 revision rounds included per solution.'

type ClientOption = {
  id: string
  company_name: string | null
  contact_name: string | null
  preferred_currency: string
}

type LineItemForm = { id?: string; title: string; scope: string; amount: string }
type PhaseForm = {
  id?: string
  name: string
  timeline: string
  scope: string
  items: LineItemForm[]
}

type DocumentRow = {
  id: string
  file_name: string
  file_size: number | null
  storage_path: string | null
}

type ProposalFull = {
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

function emptyPhase(): PhaseForm {
  return { name: '', timeline: '', scope: '', items: [{ title: '', scope: '', amount: '' }] }
}

export function ProposalDetail() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'new'
  const navigate = useNavigate()

  const [loading, setLoading] = useState(!isNew)
  const [editing, setEditing] = useState(isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [clients, setClients] = useState<ClientOption[]>([])
  const [existing, setExisting] = useState<ProposalFull | null>(null)
  const [documents, setDocuments] = useState<DocumentRow[]>([])

  // Form state
  const [clientId, setClientId] = useState('')
  const [clientName, setClientName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [title, setTitle] = useState('')
  const [vertical, setVertical] = useState('brand')
  const [currency, setCurrency] = useState('INR')
  const [validUntil, setValidUntil] = useState('')
  const [discountPct, setDiscountPct] = useState('')
  const [discountLabel, setDiscountLabel] = useState('')
  const [paymentTerms, setPaymentTerms] = useState(DEFAULT_TERMS)
  const [phases, setPhases] = useState<PhaseForm[]>([emptyPhase()])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const locked = existing?.status === 'accepted'

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

  // Load the proposal (view/edit).
  useEffect(() => {
    if (isNew || !id) return
    let cancelled = false
    ;(async () => {
      try {
        const { data: prop, error: pErr } = await supabase
          .from('proposals')
          .select(
            'id, proposal_number, client_id, client_name, company_name, title, vertical, currency, total_amount, discount_pct, discount_label, payment_terms, status, valid_until, accepted_at'
          )
          .eq('id', id)
          .single()
        if (pErr) throw pErr

        const { data: phaseRows, error: phErr } = await supabase
          .from('proposal_phases')
          .select('id, phase_number, name, timeline, scope, sort_order')
          .eq('proposal_id', id)
          .order('sort_order', { ascending: true })
        if (phErr) throw phErr

        const phaseIds = (phaseRows ?? []).map((p) => p.id)
        let itemsByPhase: Record<string, LineItemForm[]> = {}
        if (phaseIds.length > 0) {
          const { data: itemRows, error: iErr } = await supabase
            .from('proposal_line_items')
            .select('id, phase_id, item_number, title, scope, amount')
            .in('phase_id', phaseIds)
            .order('item_number', { ascending: true })
          if (iErr) throw iErr
          itemsByPhase = (itemRows ?? []).reduce((acc, it) => {
            ;(acc[it.phase_id] ??= []).push({
              id: it.id,
              title: it.title,
              scope: it.scope ?? '',
              amount: String(it.amount ?? ''),
            })
            return acc
          }, {} as Record<string, LineItemForm[]>)
        }

        const { data: docRows } = await supabase
          .from('proposal_documents')
          .select('id, file_name, file_size, storage_path')
          .eq('proposal_id', id)
          .order('uploaded_at', { ascending: true })

        if (cancelled) return

        const p = prop as ProposalFull
        setExisting(p)
        setDocuments((docRows ?? []) as DocumentRow[])
        // Hydrate the form so Edit works without a refetch.
        setClientId(p.client_id ?? '')
        setClientName(p.client_name ?? '')
        setCompanyName(p.company_name ?? '')
        setTitle(p.title)
        setVertical(p.vertical)
        setCurrency(p.currency)
        setValidUntil(p.valid_until ?? '')
        setDiscountPct(p.discount_pct != null ? String(p.discount_pct) : '')
        setDiscountLabel(p.discount_label ?? '')
        setPaymentTerms(p.payment_terms ?? DEFAULT_TERMS)
        setPhases(
          (phaseRows ?? []).map((ph) => ({
            id: ph.id,
            name: ph.name,
            timeline: ph.timeline ?? '',
            scope: ph.scope ?? '',
            items: itemsByPhase[ph.id] ?? [],
          }))
        )
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  const subtotal = useMemo(
    () =>
      phases.reduce(
        (sum, ph) =>
          sum + ph.items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0),
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
    setNotice(null)
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
      if (pendingFiles.length > 0 && proposalId) {
        const uploadErrors = await uploadDocuments(proposalId)
        if (uploadErrors) setNotice(uploadErrors)
      }

      navigate(`/portal/admin/proposals/${proposalId}`)
      if (!isNew) {
        setEditing(false)
        // Force a reload of the now-saved data.
        window.location.reload()
      }
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

  async function openDocument(doc: DocumentRow) {
    if (!doc.storage_path) return
    const { data, error: err } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 60)
    if (err || !data) {
      setError('Could not open document.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Proposal" />
        <Card>
          <p style={ui.muted}>Loading...</p>
        </Card>
      </>
    )
  }

  // ── View mode (existing, not editing) ───────────────────────────────
  if (!editing && existing) {
    return (
      <>
        <BackLink />
        <PageHeader
          title={existing.title}
          subtitle={`${existing.proposal_number ?? 'No number'} · ${existing.company_name ?? ''}`}
          action={
            locked ? (
              <span style={styles.acceptedBadge}>
                Accepted on {formatDate(existing.accepted_at)}
              </span>
            ) : (
              <button type="button" style={ui.primaryBtn} onClick={() => setEditing(true)}>
                Edit
              </button>
            )
          }
        />
        {error && <div style={styles.error}>{error}</div>}

        <Card style={{ marginBottom: 16 }}>
          <div style={styles.metaGrid}>
            <Meta label="Status" value={<StatusBadge status={existing.status} />} />
            <Meta label="Client" value={existing.client_name ?? '—'} />
            <Meta label="Company" value={existing.company_name ?? '—'} />
            <Meta label="Vertical" value={existing.vertical} />
            <Meta label="Valid until" value={formatDate(existing.valid_until)} />
            <Meta
              label="Total"
              value={
                <span style={{ fontFamily: mono, fontWeight: 600 }}>
                  {formatMoney(Number(existing.total_amount), existing.currency)}
                </span>
              }
            />
          </div>
        </Card>

        {phases.map((ph, pi) => (
          <Card key={ph.id ?? pi} style={{ marginBottom: 12 }}>
            <div style={styles.phaseHead}>
              <h3 style={styles.phaseName}>{ph.name}</h3>
              {ph.timeline && <span style={styles.phaseTimeline}>{ph.timeline}</span>}
            </div>
            {ph.scope && <p style={styles.phaseScope}>{ph.scope}</p>}
            {ph.items.map((it, ii) => (
              <div key={it.id ?? ii} style={styles.viewItem}>
                <div style={{ minWidth: 0 }}>
                  <div style={styles.viewItemTitle}>{it.title}</div>
                  {it.scope && <div style={styles.viewItemScope}>{it.scope}</div>}
                </div>
                <span style={styles.viewItemAmount}>
                  {formatMoney(parseFloat(it.amount) || 0, existing.currency)}
                </span>
              </div>
            ))}
          </Card>
        ))}

        <Card style={{ marginBottom: 16 }}>
          <h3 style={styles.phaseName}>Pricing & terms</h3>
          <div style={styles.totalsRow}>
            <span style={ui.muted}>Subtotal</span>
            <span style={{ fontFamily: mono }}>{formatMoney(subtotal, existing.currency)}</span>
          </div>
          {existing.discount_pct ? (
            <div style={styles.totalsRow}>
              <span style={ui.muted}>{existing.discount_label || `Discount ${existing.discount_pct}%`}</span>
              <span style={{ fontFamily: mono, color: tokens.ruby }}>
                -{formatMoney(discountAmount, existing.currency)}
              </span>
            </div>
          ) : null}
          <div style={{ ...styles.totalsRow, borderTop: `1px solid ${tokens.border}`, paddingTop: 10 }}>
            <span style={{ fontWeight: 600 }}>Total</span>
            <span style={{ fontFamily: mono, fontWeight: 600, fontSize: 16 }}>
              {formatMoney(total, existing.currency)}
            </span>
          </div>
          <p style={styles.terms}>{existing.payment_terms}</p>
        </Card>

        <Card>
          <h3 style={styles.phaseName}>Documents</h3>
          {documents.length === 0 ? (
            <p style={{ ...ui.muted, margin: 0 }}>No documents attached.</p>
          ) : (
            documents.map((d) => (
              <button key={d.id} type="button" style={styles.docRow} onClick={() => openDocument(d)}>
                <FileText size={16} style={{ color: tokens.accent }} />
                <span style={styles.docName}>{d.file_name}</span>
              </button>
            ))
          )}
        </Card>
      </>
    )
  }

  // ── Create / edit form ──────────────────────────────────────────────
  return (
    <>
      <BackLink />
      <PageHeader title={isNew ? 'New proposal' : 'Edit proposal'} />
      {error && <div style={styles.error}>{error}</div>}
      {notice && <div style={styles.notice}>{notice}</div>}

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
                  onClick={() =>
                    updatePhase(pi, { items: ph.items.filter((_, j) => j !== ii) })
                  }
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
            onClick={() =>
              updatePhase(pi, { items: [...ph.items, { title: '', scope: '', amount: '' }] })
            }
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
            <span style={ui.muted}>
              {pendingFiles.length} file(s) selected
            </span>
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
        {!isNew && (
          <button type="button" style={styles.secondaryBtn} onClick={() => setEditing(false)} disabled={saving}>
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

function BackLink() {
  return (
    <Link to="/portal/admin/proposals" style={styles.backLink}>
      <ArrowLeft size={15} /> Proposals
    </Link>
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

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={styles.metaLabel}>{label}</div>
      <div style={styles.metaValue}>{value}</div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.textMuted,
    textDecoration: 'none',
    marginBottom: 12,
  },
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
  notice: {
    background: tokens.goldLight,
    color: tokens.goldDark,
    border: `1px solid ${tokens.gold}`,
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 16,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  acceptedBadge: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: tokens.green,
    background: tokens.greenLight,
    borderRadius: 8,
    padding: '8px 14px',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
  },
  metaLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.textMuted,
    marginBottom: 4,
  },
  metaValue: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: tokens.text,
  },
  phaseHead: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
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
  phaseTimeline: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.accent,
  },
  phaseScope: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.textMuted,
    margin: '0 0 12px',
  },
  viewItem: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    padding: '10px 0',
    borderTop: `1px solid ${tokens.border}`,
  },
  viewItemTitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    color: tokens.text,
  },
  viewItemScope: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.textMuted,
    marginTop: 2,
  },
  viewItemAmount: {
    fontFamily: mono,
    fontSize: 14,
    color: tokens.text,
    whiteSpace: 'nowrap',
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
  terms: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.textMuted,
    marginTop: 16,
    marginBottom: 0,
    lineHeight: 1.5,
  },
  docRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
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
