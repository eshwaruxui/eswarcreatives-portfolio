import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router'
import { Plus, Search, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import {
  PageHeader,
  Card,
  Modal,
  StatusBadge,
  ui,
  mono,
  formatMoney,
} from './ui'
import { InvoicePreview } from './InvoicePreview'
import { DeleteInvoiceModal } from './DeleteInvoiceModal'
import { ConfirmPaymentModal, type PaymentModalMode } from './ConfirmPaymentModal'
import { PaymentsSection, type PaymentDraft } from './PaymentsSection'
import { addInvoicePayment } from '../hooks/useInvoicePayments'
import { usePortal } from '../PortalContext'
import { ClientFilterBanner } from './ClientFilterBanner'
import type { PortalProfile } from '../PortalGuard'
import type { CSSProperties } from 'react'

type Invoice = {
  id: string
  invoice_number: string
  proposal_id: string | null
  client_id: string | null
  client_name: string | null
  company_name: string | null
  label: string | null
  amount: number
  currency: string
  status: string
  pct_of_total: number | null
  due_date: string | null
  paid_date: string | null
  payment_method: string | null
  notes: string | null
  created_at: string
}

type ClientOption = {
  id: string
  company_name: string | null
  contact_name: string | null
  preferred_currency: string
}

type ProposalOption = {
  id: string
  proposal_number: string | null
  title: string
  client_id: string | null
  client_name: string | null
  company_name: string | null
  currency: string
}

const FILTERS = ['all', 'draft', 'sent', 'paid', 'overdue', 'partially_paid'] as const
type Filter = (typeof FILTERS)[number]

const UNPAID = new Set(['pending', 'sent', 'overdue', 'draft', 'partially_paid'])

function displayName(r: { client_name: string | null; company_name: string | null }) {
  return r.client_name || r.company_name || '—'
}

// Client-facing invoice number. Stored numbers are EC-I-YYYY-NNN (the "I" marks
// the invoice sequence internally); the preview shows the cleaner EC-YYYY-NNN.
// Display only: the stored invoice_number is never altered.
function displayInvoiceNumber(stored: string): string {
  return stored.replace(/^EC-I-/, 'EC-')
}

export function InvoicesAdmin() {
  const { selectedClientId } = usePortal()
  // AdminShell gates this whole area to owner/admin and passes the profile via
  // the router outlet; only those roles may delete an invoice.
  const profile = useOutletContext<PortalProfile>()
  const canDelete = profile?.role === 'owner' || profile?.role === 'admin'

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [proposals, setProposals] = useState<ProposalOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  const [showNew, setShowNew] = useState(false)
  const [openInvoice, setOpenInvoice] = useState<Invoice | null>(null)
  // The invoice queued for deletion (drives the confirmation modal).
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
  // ConfirmPaymentModal target + mode.
  const [confirmTarget, setConfirmTarget] = useState<Invoice | null>(null)
  const [confirmMode, setConfirmMode] = useState<PaymentModalMode>('mark_paid')
  // Success toast.
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(id)
  }, [toast])

  async function load() {
    setLoading(true)
    try {
      let invQuery = supabase
        .from('invoices')
        .select(
          'id, invoice_number, proposal_id, client_id, client_name, company_name, label, amount, currency, status, pct_of_total, due_date, paid_date, payment_method, notes, created_at'
        )
        .order('created_at', { ascending: false })
      if (selectedClientId) invQuery = invQuery.eq('client_id', selectedClientId)
      const [invRes, cliRes, propRes] = await Promise.all([
        invQuery,
        supabase
          .from('clients')
          .select('id, company_name, contact_name, preferred_currency')
          .order('company_name', { ascending: true }),
        supabase
          .from('proposals')
          .select('id, proposal_number, title, client_id, client_name, company_name, currency')
          .order('created_at', { ascending: false }),
      ])
      if (invRes.error) throw invRes.error
      setInvoices((invRes.data ?? []) as Invoice[])
      setClients((cliRes.data ?? []) as ClientOption[])
      setProposals((propRes.data ?? []) as ProposalOption[])
    } catch {
      setError('Could not load invoices. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // Reload when the global client scope changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClientId])

  // ── Stat totals, grouped by currency (never summed across) ──────────
  const { paidByCur, outstandingByCur } = useMemo(() => {
    const paid: Record<string, number> = {}
    const out: Record<string, number> = {}
    for (const inv of invoices) {
      if (inv.status === 'paid') paid[inv.currency] = (paid[inv.currency] ?? 0) + Number(inv.amount)
      else if (UNPAID.has(inv.status))
        out[inv.currency] = (out[inv.currency] ?? 0) + Number(inv.amount)
    }
    return { paidByCur: paid, outstandingByCur: out }
  }, [invoices])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return invoices.filter((inv) => {
      if (filter !== 'all' && inv.status !== filter) return false
      if (!q) return true
      return (
        inv.invoice_number.toLowerCase().includes(q) ||
        displayName(inv).toLowerCase().includes(q)
      )
    })
  }, [invoices, filter, search])

  return (
    <>
      <PageHeader
        title="Invoices"
        action={
          <button type="button" style={ui.primaryBtn} onClick={() => setShowNew(true)}>
            <Plus size={16} /> New invoice
          </button>
        }
      />
      <ClientFilterBanner />
      {toast && <div style={styles.toast}>{toast}</div>}
      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.statRow}>
        <StatCard label="Paid" byCur={paidByCur} />
        <StatCard label="Outstanding" byCur={outstandingByCur} />
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total invoices</span>
          <span style={styles.statValue}>{invoices.length}</span>
        </div>
      </div>

      <div style={styles.controls}>
        <div style={styles.pills}>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                ...styles.pill,
                ...(filter === f ? styles.pillActive : null),
              }}
            >
              {f === 'all' ? 'All' : f === 'partially_paid' ? 'Partial' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div style={styles.searchWrap}>
          <Search size={15} style={{ color: t.text.muted }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client or number"
            style={styles.searchInput}
          />
        </div>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ ...ui.muted, padding: 20 }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p style={{ ...ui.muted, padding: 20 }}>No invoices match.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Number</th>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Amount</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Balance due</th>
                <th style={styles.th}>Status</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  onClick={() => setOpenInvoice(inv)}
                  style={{
                    ...styles.row,
                    ...(openInvoice?.id === inv.id ? styles.rowActive : null),
                  }}
                >
                  <td style={{ ...styles.td, fontFamily: mono, fontSize: 12 }}>
                    {inv.invoice_number}
                  </td>
                  <td style={styles.td}>
                    <div style={{ color: t.text.primary, fontWeight: 600 }}>{displayName(inv)}</div>
                    {inv.label && <div style={styles.subtle}>{inv.label}</div>}
                  </td>
                  <td style={{ ...styles.td, fontFamily: mono, color: t.text.primary }}>
                    {formatMoney(Number(inv.amount), inv.currency)}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', fontFamily: mono }}>
                    {inv.status === 'partially_paid' ? (
                      <span style={{ color: tokens.ruby }}>partial</span>
                    ) : inv.status === 'paid' ? (
                      <span style={{ color: tokens.green }}>
                        {formatMoney(0, inv.currency)}
                      </span>
                    ) : (
                      <span style={{ color: t.text.secondary }}>
                        {formatMoney(Number(inv.amount), inv.currency)}
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <StatusBadge status={inv.status} />
                  </td>
                  <td
                    style={{ ...styles.td, textAlign: 'right' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span style={styles.actionCell}>
                      <button type="button" style={styles.linkBtn} onClick={() => setOpenInvoice(inv)}>
                        Open
                      </button>
                      {inv.status === 'partially_paid' ? (
                        <button
                          type="button"
                          style={styles.recordBtn}
                          onClick={() => { setConfirmTarget(inv); setConfirmMode('record_payment') }}
                        >
                          Record payment
                        </button>
                      ) : inv.status !== 'paid' && inv.status !== 'cancelled' ? (
                        <button
                          type="button"
                          style={styles.paidBtn}
                          onClick={() => { setConfirmTarget(inv); setConfirmMode('mark_paid') }}
                        >
                          Mark paid
                        </button>
                      ) : null}
                      {/* Owner/admin only. Invoices raised from a proposal are
                          removed by deleting the proposal, so their button is
                          disabled with a tooltip pointing there. */}
                      {canDelete &&
                        (inv.proposal_id ? (
                          <button
                            type="button"
                            style={styles.deleteIconDisabled}
                            disabled
                            title="Delete via the proposal"
                            aria-label="Delete via the proposal"
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            style={styles.deleteIcon}
                            onClick={() => setDeleteTarget(inv)}
                            title="Delete invoice"
                            aria-label="Delete invoice"
                          >
                            <Trash2 size={15} />
                          </button>
                        ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {showNew && (
        <NewInvoiceModal
          clients={clients}
          proposals={proposals}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false)
            void load()
          }}
          onError={setError}
        />
      )}

      {openInvoice && (
        <InvoicePreview
          invoice={openInvoice}
          numberLabel={displayInvoiceNumber(openInvoice.invoice_number)}
          onClose={() => setOpenInvoice(null)}
        />
      )}

      {deleteTarget && (
        <DeleteInvoiceModal
          invoice={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null)
            void load()
          }}
        />
      )}

      {confirmTarget && (
        <ConfirmPaymentModal
          invoice={confirmTarget}
          mode={confirmMode}
          onClose={() => setConfirmTarget(null)}
          onSuccess={(msg) => {
            setConfirmTarget(null)
            setToast(msg)
            void load()
          }}
        />
      )}
    </>
  )
}

function StatCard({ label, byCur }: { label: string; byCur: Record<string, number> }) {
  const entries = Object.entries(byCur)
  return (
    <div style={styles.statCard}>
      <span style={styles.statLabel}>{label}</span>
      {entries.length === 0 ? (
        <span style={{ ...styles.statValue, fontFamily: mono }}>{formatMoney(0, 'INR')}</span>
      ) : (
        entries.map(([cur, amt]) => (
          <span key={cur} style={{ ...styles.statValue, fontFamily: mono }}>
            {formatMoney(amt, cur)}
          </span>
        ))
      )}
    </div>
  )
}

// ── New invoice modal ──────────────────────────────────────────────────
// A billable item drawn from the linked approved proposal (a payment-schedule
// instalment, a whole solution, or a single line item), with a computed amount.
type Billable = {
  key: string
  group: 'schedule' | 'solution' | 'item'
  label: string
  amount: number
  proposalItemId: string | null
}
// One editable line on the invoice being built; from a Billable or added by hand.
type LineDraft = {
  key: string
  proposalItemId: string | null
  label: string
  amount: string
}

const GROUP_LABEL: Record<Billable['group'], string> = {
  schedule: 'Payment schedule',
  solution: 'Solutions',
  item: 'Line items',
}
const GROUP_ORDER: Billable['group'][] = ['schedule', 'solution', 'item']

function NewInvoiceModal({
  clients,
  proposals,
  onClose,
  onCreated,
  onError,
}: {
  clients: ClientOption[]
  proposals: ProposalOption[]
  onClose: () => void
  onCreated: () => void
  onError: (msg: string) => void
}) {
  const [clientId, setClientId] = useState('')
  const [proposalId, setProposalId] = useState('')
  const [clientName, setClientName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)

  // Itemised invoice: editable lines + the billables offered by the proposal.
  const [lines, setLines] = useState<LineDraft[]>([])
  const [billables, setBillables] = useState<Billable[]>([])
  const [loadingBillables, setLoadingBillables] = useState(false)

  // Payment drafts: inserted after the invoice row is created.
  const [paymentDrafts, setPaymentDrafts] = useState<PaymentDraft[]>([])

  const total = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)
  const selectedKeys = new Set(lines.map((l) => l.key))

  function onPickClient(value: string) {
    setClientId(value)
    const c = clients.find((x) => x.id === value)
    if (c) {
      setCompanyName(c.company_name ?? '')
      setClientName(c.contact_name ?? '')
      setCurrency(c.preferred_currency || 'INR')
    }
  }

  function onPickProposal(value: string) {
    setProposalId(value)
    // Drop lines sourced from the previous proposal; keep hand-added ones.
    setLines((prev) => prev.filter((l) => l.key.startsWith('manual-')))
    setBillables([])
    const p = proposals.find((x) => x.id === value)
    if (p) {
      setClientId(p.client_id ?? '')
      setClientName(p.client_name ?? '')
      setCompanyName(p.company_name ?? '')
      setCurrency(p.currency || 'INR')
    }
    if (value) void loadBillables(value)
  }

  // Pull the proposal's billables: each schedule instalment (% of its phase
  // subtotal), each solution group (sum of its items), and each line item.
  async function loadBillables(pid: string) {
    setLoadingBillables(true)
    try {
      const { data: phaseRows } = await supabase
        .from('proposal_phases')
        .select('id, name, sort_order')
        .eq('proposal_id', pid)
        .order('sort_order', { ascending: true })
      const phaseIds = (phaseRows ?? []).map((p) => p.id)

      const [itemsRes, schedRes] = await Promise.all([
        phaseIds.length
          ? supabase
              .from('proposal_line_items')
              .select('id, phase_id, title, amount, item_number, solution_title, solution_overview')
              .in('phase_id', phaseIds)
              .order('item_number', { ascending: true })
          : Promise.resolve({ data: [] as Record<string, unknown>[] }),
        supabase
          .from('proposal_payment_schedule')
          .select('id, phase_id, label, pct_of_total, instalment_number')
          .eq('proposal_id', pid)
          .order('instalment_number', { ascending: true }),
      ])
      const items = (itemsRes.data ?? []) as {
        id: string
        phase_id: string
        title: string
        amount: number | null
        solution_title: string | null
        solution_overview: string | null
      }[]
      const sched = (schedRes.data ?? []) as {
        id: string
        phase_id: string | null
        label: string
        pct_of_total: number | null
      }[]

      const phaseName: Record<string, string> = {}
      const phaseSubtotal: Record<string, number> = {}
      for (const ph of phaseRows ?? []) phaseName[ph.id] = ph.name as string
      for (const it of items)
        phaseSubtotal[it.phase_id] = (phaseSubtotal[it.phase_id] ?? 0) + Number(it.amount ?? 0)

      const out: Billable[] = []

      // Payment-schedule instalments (% of their phase subtotal).
      for (const s of sched) {
        if (!s.phase_id) continue
        const pct = Number(s.pct_of_total ?? 0)
        const amt = Math.round((pct / 100) * (phaseSubtotal[s.phase_id] ?? 0))
        const where = phaseName[s.phase_id] ? ` · ${phaseName[s.phase_id]}` : ''
        out.push({
          key: `sch-${s.id}`,
          group: 'schedule',
          label: `${s.label}${where}${pct ? ` (${pct}%)` : ''}`,
          amount: amt,
          proposalItemId: s.id,
        })
      }

      // Solution groups: consecutive items sharing a solution title/overview.
      let curKey: string | null = null
      let cur: Billable | null = null
      const solCount: Record<string, number> = {}
      for (const it of items) {
        const k = `${it.phase_id}|${it.solution_title ?? ''}|${it.solution_overview ?? ''}`
        if (!cur || k !== curKey) {
          const idx = (solCount[it.phase_id] = (solCount[it.phase_id] ?? 0) + 1)
          const where = phaseName[it.phase_id] ? ` · ${phaseName[it.phase_id]}` : ''
          cur = {
            key: `sol-${it.phase_id}-${idx}`,
            group: 'solution',
            label: `${it.solution_title || `Solution ${idx}`}${where}`,
            amount: 0,
            proposalItemId: null,
          }
          out.push(cur)
          curKey = k
        }
        cur.amount += Number(it.amount ?? 0)
      }

      // Individual line items.
      for (const it of items) {
        out.push({
          key: `item-${it.id}`,
          group: 'item',
          label: it.title,
          amount: Number(it.amount ?? 0),
          proposalItemId: it.id,
        })
      }

      setBillables(out)
    } catch {
      onError('Could not load the billable items for this proposal.')
    } finally {
      setLoadingBillables(false)
    }
  }

  function toggleBillable(b: Billable) {
    setLines((prev) =>
      prev.some((l) => l.key === b.key)
        ? prev.filter((l) => l.key !== b.key)
        : [
            ...prev,
            { key: b.key, proposalItemId: b.proposalItemId, label: b.label, amount: String(b.amount) },
          ]
    )
  }

  function updateLine(key: string, field: 'label' | 'amount', value: string) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)))
  }
  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key))
  }
  function addManualLine() {
    setLines((prev) => [
      ...prev,
      { key: `manual-${Date.now()}`, proposalItemId: null, label: '', amount: '' },
    ])
  }

  async function nextInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear()
    const prefix = `EC-I-${year}-`
    const { data } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like('invoice_number', `${prefix}%`)
    let max = 0
    for (const row of data ?? []) {
      const n = parseInt((row.invoice_number ?? '').slice(prefix.length), 10)
      if (!Number.isNaN(n) && n > max) max = n
    }
    return `${prefix}${String(max + 1).padStart(3, '0')}`
  }

  async function handleCreate() {
    setPaymentError(null)
    const valid = lines.filter((l) => l.label.trim() && (parseFloat(l.amount) || 0) > 0)
    if (valid.length === 0) return onError('Add at least one billable line with a label and amount.')
    const amountTotal = valid.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0)

    // Validate payments don't exceed total (H9 — prevent errors before save).
    const validDrafts = paymentDrafts.filter((d) => (parseFloat(d.amount) || 0) > 0)
    const paidTotal = validDrafts.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0)
    if (paidTotal > amountTotal) {
      setPaymentError(
        `Total payments (${formatMoney(paidTotal, currency)}) cannot exceed the invoice total (${formatMoney(amountTotal, currency)}). Reduce the payment amounts.`
      )
      return
    }

    const summary = valid.length === 1 ? valid[0].label : `${valid[0].label} +${valid.length - 1} more`

    setSaving(true)
    try {
      const { data: sess } = await supabase.auth.getUser()
      const userId = sess.user?.id ?? null
      const invoiceNumber = await nextInvoiceNumber()

      // Derive initial status from any payment drafts.
      let initialStatus = 'pending'
      if (paidTotal >= amountTotal && paidTotal > 0) initialStatus = 'paid'
      else if (paidTotal > 0) initialStatus = 'partially_paid'

      const { data: inv, error: err } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          proposal_id: proposalId || null,
          client_id: clientId || null,
          client_name: clientName.trim() || null,
          company_name: companyName.trim() || null,
          label: summary,
          amount: amountTotal,
          currency,
          status: initialStatus,
          due_date: dueDate || null,
          notes: notes.trim() || null,
          created_by: userId,
        })
        .select('id')
        .single()
      if (err) throw err

      const invoiceId = (inv as { id: string }).id

      const { error: liErr } = await supabase.from('invoice_line_items').insert(
        valid.map((l, i) => ({
          invoice_id: invoiceId,
          proposal_item_id: l.proposalItemId,
          label: l.label.trim(),
          amount: parseFloat(l.amount) || 0,
          sort_order: i,
        }))
      )
      if (liErr) throw liErr

      // Insert payment drafts if any.
      for (const d of validDrafts) {
        const err = await addInvoicePayment(invoiceId, {
          amount: parseFloat(d.amount) || 0,
          paid_on: d.paid_on,
          method: d.method,
          reference_note: d.reference_note,
        }, userId)
        if (err) throw new Error(err)
      }

      onCreated()
    } catch {
      onError('Could not create the invoice. Check the details and try again.')
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="New invoice" size="lg">
      <div style={styles.modalForm}>
        <Field label="Link proposal (optional)">
          <select value={proposalId} onChange={(e) => onPickProposal(e.target.value)} style={styles.input}>
            <option value="">None</option>
            {proposals.map((p) => (
              <option key={p.id} value={p.id}>
                {(p.proposal_number ? `${p.proposal_number} · ` : '') + p.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Client (optional)">
          <select value={clientId} onChange={(e) => onPickClient(e.target.value)} style={styles.input}>
            <option value="">None / from proposal</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company_name || c.contact_name || '(unnamed)'}
              </option>
            ))}
          </select>
        </Field>
        <div style={styles.modalRow}>
          <Field label="Company name">
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={styles.input} />
          </Field>
          <Field label="Client name">
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} style={styles.input} />
          </Field>
        </div>

        {/* Billable picker: only when a proposal is linked. */}
        {proposalId && (
          <div>
            <span style={styles.fieldLabel}>Billable items from proposal</span>
            <div style={styles.pickerBox}>
              {loadingBillables ? (
                <p style={{ ...ui.muted, margin: 0, fontSize: 13 }}>Loading billable items...</p>
              ) : billables.length === 0 ? (
                <p style={{ ...ui.muted, margin: 0, fontSize: 13 }}>
                  This proposal has no billable items to pick.
                </p>
              ) : (
                GROUP_ORDER.filter((g) => billables.some((b) => b.group === g)).map((g) => (
                  <div key={g} style={styles.pickerGroup}>
                    <div style={styles.pickerGroupLabel}>{GROUP_LABEL[g]}</div>
                    {billables
                      .filter((b) => b.group === g)
                      .map((b) => {
                        const checked = selectedKeys.has(b.key)
                        return (
                          <button
                            key={b.key}
                            type="button"
                            style={styles.pickerRow}
                            onClick={() => toggleBillable(b)}
                          >
                            <span
                              style={{
                                ...styles.checkbox,
                                ...(checked ? styles.checkboxOn : null),
                              }}
                              aria-hidden
                            >
                              {checked ? '✓' : ''}
                            </span>
                            <span style={styles.pickerLabel}>{b.label}</span>
                            <span style={styles.pickerAmount}>{formatMoney(b.amount, currency)}</span>
                          </button>
                        )
                      })}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Editable invoice lines. */}
        <div>
          <span style={styles.fieldLabel}>Invoice lines</span>
          <div style={styles.linesBox}>
            {lines.length === 0 ? (
              <p style={{ ...ui.muted, margin: 0, fontSize: 13 }}>
                Pick billable items above, or add a line manually.
              </p>
            ) : (
              lines.map((l) => (
                <div key={l.key} style={styles.lineRow}>
                  <input
                    value={l.label}
                    onChange={(e) => updateLine(l.key, 'label', e.target.value)}
                    placeholder="Description"
                    style={{ ...styles.input, flex: 1 }}
                  />
                  <input
                    value={l.amount}
                    onChange={(e) => updateLine(l.key, 'amount', e.target.value)}
                    placeholder="0"
                    inputMode="decimal"
                    style={{ ...styles.input, width: 120, fontFamily: mono }}
                  />
                  <button
                    type="button"
                    style={styles.lineRemove}
                    onClick={() => removeLine(l.key)}
                    aria-label="Remove line"
                    title="Remove line"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
            <div style={styles.linesFooter}>
              <button type="button" style={styles.addLineBtn} onClick={addManualLine}>
                <Plus size={14} /> Add line
              </button>
              <span style={styles.totalChip}>
                Total <span style={styles.totalValue}>{formatMoney(total, currency)}</span>
              </span>
            </div>
          </div>
        </div>

        <PaymentsSection
          drafts={paymentDrafts}
          onChange={setPaymentDrafts}
          invoiceTotal={total}
          currency={currency}
          validationError={paymentError}
        />

        <div style={styles.modalRow}>
          <Field label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={styles.input}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </Field>
          <Field label="Due date">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={styles.input} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} style={{ ...styles.input, minHeight: 56, resize: 'vertical' }} />
        </Field>
      </div>
      <div style={styles.modalActions}>
        <button type="button" style={styles.secondaryBtn} onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type="button" style={ui.primaryBtn} onClick={handleCreate} disabled={saving}>
          {saving ? 'Creating...' : 'Create invoice'}
        </button>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={styles.field}>
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
  statRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
    marginBottom: 20,
  },
  statCard: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  statLabel: { fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary },
  statValue: { fontSize: 20, fontWeight: 600, color: t.text.primary, fontFamily: fonts.heading },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  pills: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  pill: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 999,
    padding: '6px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    color: t.text.tertiary,
    cursor: 'pointer',
  },
  pillActive: {
    background: tokens.tealLight,
    color: tokens.primary,
    borderColor: tokens.accent,
    fontWeight: 600,
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '8px 12px',
    minWidth: 240,
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    width: '100%',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontFamily: fonts.body },
  th: {
    textAlign: 'left',
    padding: '12px 20px',
    fontSize: 12,
    fontWeight: 600,
    color: t.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    borderBottom: `1px solid ${tokens.border}`,
    background: tokens.bg,
  },
  row: { cursor: 'pointer' },
  rowActive: { background: tokens.tealLight },
  td: {
    padding: '14px 20px',
    fontSize: 14,
    color: t.text.secondary,
    borderBottom: `1px solid ${tokens.border}`,
    verticalAlign: 'middle',
  },
  subtle: { fontSize: 12, color: t.text.muted, marginTop: 2 },
  actionCell: { display: 'inline-flex', gap: 12, alignItems: 'center' },
  linkBtn: {
    background: 'transparent',
    border: 'none',
    color: tokens.accent,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  recordBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: tokens.tealLight,
    border: 'none',
    color: tokens.primary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '5px 10px',
    borderRadius: 6,
  },
  paidBtn: {
    background: tokens.greenLight,
    border: 'none',
    color: tokens.green,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '5px 10px',
    borderRadius: 6,
  },
  deleteIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: tokens.ruby,
    cursor: 'pointer',
    padding: 4,
  },
  deleteIconDisabled: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    // Token rule: disabled = t.text.disabled + t.border.subtle.
    background: 'transparent',
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 6,
    color: t.text.disabled,
    cursor: 'not-allowed',
    padding: 3,
  },
  toast: {
    position: 'fixed' as const,
    bottom: 24,
    right: 24,
    background: tokens.green,
    color: '#fff',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    borderRadius: 8,
    padding: '10px 16px',
    zIndex: 400,
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
    pointerEvents: 'none' as const,
  },
  modalForm: { display: 'flex', flexDirection: 'column', gap: 14 },
  modalRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 },

  // Billable picker + invoice-line editor.
  pickerBox: {
    marginTop: 6,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: 12,
    maxHeight: 220,
    overflowY: 'auto',
    background: tokens.surface,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  pickerGroup: { display: 'flex', flexDirection: 'column', gap: 2 },
  pickerGroupLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: t.text.tertiary,
    marginBottom: 4,
  },
  pickerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    padding: '6px 6px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  checkbox: {
    flexShrink: 0,
    width: 18,
    height: 18,
    borderRadius: 4,
    border: `1px solid ${t.border.medium}`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
    color: t.text.onPrimary,
    background: tokens.surface,
  },
  checkboxOn: { background: tokens.primary, borderColor: tokens.primary },
  pickerLabel: { flex: 1, minWidth: 0, fontFamily: fonts.body, fontSize: 13, color: t.text.primary },
  pickerAmount: { fontFamily: mono, fontSize: 13, color: t.text.primary, whiteSpace: 'nowrap' },
  linesBox: {
    marginTop: 6,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  lineRow: { display: 'flex', alignItems: 'center', gap: 8 },
  lineRemove: {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: tokens.ruby,
    cursor: 'pointer',
    padding: 6,
  },
  linesFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 2,
  },
  addLineBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'transparent',
    border: `1px dashed ${t.border.medium}`,
    borderRadius: 8,
    color: t.text.primary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '7px 12px',
  },
  totalChip: { fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary },
  totalValue: { fontFamily: mono, fontSize: 15, fontWeight: 700, color: t.text.primary, marginLeft: 6 },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 },
  detailLabel: { fontFamily: fonts.body, fontSize: 12, color: t.text.tertiary, marginBottom: 4 },
  detailValue: { fontFamily: fonts.body, fontSize: 14, color: t.text.primary },
  notesText: { fontFamily: fonts.body, fontSize: 14, color: t.text.primary, margin: 0, lineHeight: 1.5 },
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
