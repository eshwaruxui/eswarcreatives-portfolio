import { useEffect, useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, fonts } from '../theme'
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
import { usePortal } from '../PortalContext'
import { ClientFilterBanner } from './ClientFilterBanner'
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

const FILTERS = ['all', 'draft', 'sent', 'paid', 'overdue'] as const
type Filter = (typeof FILTERS)[number]

const UNPAID = new Set(['pending', 'sent', 'overdue', 'draft'])

function displayName(r: { client_name: string | null; company_name: string | null }) {
  return r.client_name || r.company_name || '—'
}

// Client-facing invoice number. Stored numbers are EC-I-YYYY-NNN (the "I" marks
// the invoice sequence internally); the preview shows the cleaner EC-YYYY-NNN.
// Display only: the stored invoice_number is never altered.
function displayInvoiceNumber(stored: string): string {
  return stored.replace(/^EC-I-/, 'EC-')
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

export function InvoicesAdmin() {
  const { selectedClientId } = usePortal()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [proposals, setProposals] = useState<ProposalOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')

  const [showNew, setShowNew] = useState(false)
  const [openInvoice, setOpenInvoice] = useState<Invoice | null>(null)

  // Inline "mark paid": which row is collecting a payment method, and its value.
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payMethod, setPayMethod] = useState('')

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

  async function markPaid(inv: Invoice) {
    try {
      const { error: err } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_date: todayISO(),
          payment_method: payMethod.trim() || null,
        })
        .eq('id', inv.id)
      if (err) throw err
      setPayingId(null)
      setPayMethod('')
      await load()
    } catch {
      setError('Could not mark this invoice paid. Try again.')
    }
  }

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
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div style={styles.searchWrap}>
          <Search size={15} style={{ color: tokens.textMuted }} />
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
                    <div style={{ color: tokens.text, fontWeight: 600 }}>{displayName(inv)}</div>
                    {inv.label && <div style={styles.subtle}>{inv.label}</div>}
                  </td>
                  <td style={{ ...styles.td, fontFamily: mono, color: tokens.text }}>
                    {formatMoney(Number(inv.amount), inv.currency)}
                  </td>
                  <td style={styles.td}>
                    <StatusBadge status={inv.status} />
                  </td>
                  <td
                    style={{ ...styles.td, textAlign: 'right' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {payingId === inv.id ? (
                      <span style={styles.payRow}>
                        <input
                          autoFocus
                          value={payMethod}
                          onChange={(e) => setPayMethod(e.target.value)}
                          placeholder="Payment method"
                          style={styles.payInput}
                        />
                        <button type="button" style={styles.confirmBtn} onClick={() => markPaid(inv)}>
                          Confirm
                        </button>
                        <button
                          type="button"
                          style={styles.linkBtn}
                          onClick={() => {
                            setPayingId(null)
                            setPayMethod('')
                          }}
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <span style={styles.actionCell}>
                        <button type="button" style={styles.linkBtn} onClick={() => setOpenInvoice(inv)}>
                          Open
                        </button>
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            type="button"
                            style={styles.paidBtn}
                            onClick={() => {
                              setPayingId(inv.id)
                              setPayMethod('')
                            }}
                          >
                            Mark paid
                          </button>
                        )}
                      </span>
                    )}
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
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

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
    const p = proposals.find((x) => x.id === value)
    if (p) {
      setClientId(p.client_id ?? '')
      setClientName(p.client_name ?? '')
      setCompanyName(p.company_name ?? '')
      setCurrency(p.currency || 'INR')
    }
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
    if (!label.trim()) return onError('Label is required.')
    if (!amount || parseFloat(amount) <= 0) return onError('A positive amount is required.')
    setSaving(true)
    try {
      const { data: sess } = await supabase.auth.getUser()
      const invoiceNumber = await nextInvoiceNumber()
      const { error: err } = await supabase.from('invoices').insert({
        invoice_number: invoiceNumber,
        proposal_id: proposalId || null,
        client_id: clientId || null,
        client_name: clientName.trim() || null,
        company_name: companyName.trim() || null,
        label: label.trim(),
        amount: parseFloat(amount),
        currency,
        status: 'pending',
        due_date: dueDate || null,
        notes: notes.trim() || null,
        created_by: sess.user?.id ?? null,
      })
      if (err) throw err
      onCreated()
    } catch {
      onError('Could not create the invoice. Check the details and try again.')
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose} title="New invoice">
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
        <Field label="Company name">
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={styles.input} />
        </Field>
        <Field label="Client name">
          <input value={clientName} onChange={(e) => setClientName(e.target.value)} style={styles.input} />
        </Field>
        <Field label="Label">
          <input value={label} onChange={(e) => setLabel(e.target.value)} style={styles.input} placeholder="e.g. Advance payment" />
        </Field>
        <div style={styles.modalRow}>
          <Field label="Amount">
            <input value={amount} onChange={(e) => setAmount(e.target.value)} style={{ ...styles.input, fontFamily: mono }} inputMode="decimal" />
          </Field>
          <Field label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} style={styles.input}>
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </Field>
        </div>
        <Field label="Due date">
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={styles.input} />
        </Field>
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
  statLabel: { fontFamily: fonts.body, fontSize: 13, color: tokens.textMuted },
  statValue: { fontSize: 20, fontWeight: 600, color: tokens.text, fontFamily: fonts.heading },
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
    color: tokens.textMuted,
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
    color: tokens.text,
    width: '100%',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontFamily: fonts.body },
  th: {
    textAlign: 'left',
    padding: '12px 20px',
    fontSize: 12,
    fontWeight: 600,
    color: tokens.textMuted,
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
    color: tokens.textMuted,
    borderBottom: `1px solid ${tokens.border}`,
    verticalAlign: 'middle',
  },
  subtle: { fontSize: 12, color: tokens.textMuted, marginTop: 2 },
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
  payRow: { display: 'inline-flex', gap: 8, alignItems: 'center' },
  payInput: {
    fontFamily: fonts.body,
    fontSize: 13,
    border: `1px solid ${tokens.border}`,
    borderRadius: 6,
    padding: '5px 8px',
    width: 130,
  },
  confirmBtn: {
    background: tokens.primary,
    border: 'none',
    color: '#fff',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '5px 10px',
    borderRadius: 6,
  },
  modalForm: { display: 'flex', flexDirection: 'column', gap: 14 },
  modalRow: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  detailGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 },
  detailLabel: { fontFamily: fonts.body, fontSize: 12, color: tokens.textMuted, marginBottom: 4 },
  detailValue: { fontFamily: fonts.body, fontSize: 14, color: tokens.text },
  notesText: { fontFamily: fonts.body, fontSize: 14, color: tokens.text, margin: 0, lineHeight: 1.5 },
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
