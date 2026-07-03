// Compact modal for recording a payment against an existing invoice.
// Opens from the "Record payment" quick-action button on each invoice row.
// Shows existing payment history for the invoice, allows adding / deleting rows,
// and syncs invoice status on save.
// Theme tokens only; no raw hex; no em dashes.
import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import { Modal, mono, formatMoney, formatDate } from './ui'
import { PAYMENT_METHODS } from './PaymentsSection'
import {
  useInvoicePayments,
  addInvoicePayment,
  deleteInvoicePayment,
  syncInvoiceStatus,
  type InvoicePayment,
} from '../hooks/useInvoicePayments'

type RowInvoice = {
  id: string
  invoice_number: string
  client_name: string | null
  company_name: string | null
  amount: number
  currency: string
  status: string
}

function displayInvoiceNumber(stored: string) {
  return stored.replace(/^EC-I-/, 'EC-')
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

type Props = {
  invoice: RowInvoice
  onClose: () => void
  onSaved: () => void
}

export function RecordPaymentModal({ invoice, onClose, onSaved }: Props) {
  const { payments, amountPaid, balanceDue, loading, reload } = useInvoicePayments(invoice.id, invoice.amount)

  // New-payment form state.
  const [amount, setAmount] = useState('')
  const [paidOn, setPaidOn] = useState(today())
  const [method, setMethod] = useState('UPI')
  const [refNote, setRefNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Inline delete confirm: id of payment pending confirmation.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [userId, setUserId] = useState<string | null>(null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  async function handleAdd() {
    setFormError(null)
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) {
      setFormError('Enter a payment amount greater than zero.')
      return
    }
    const newTotal = amountPaid + amt
    if (newTotal > Number(invoice.amount)) {
      setFormError(
        `Total payments (${formatMoney(newTotal, invoice.currency)}) would exceed the invoice total (${formatMoney(Number(invoice.amount), invoice.currency)}). Reduce the amount.`
      )
      return
    }
    if (!paidOn) {
      setFormError('Select the date this payment was received.')
      return
    }
    setSaving(true)
    const err = await addInvoicePayment(invoice.id, { amount: amt, paid_on: paidOn, method, reference_note: refNote }, userId)
    if (err) { setFormError(err); setSaving(false); return }

    await reload()
    const updated = [...payments, { id: '', invoice_id: invoice.id, amount: amt, paid_on: paidOn, method, reference_note: refNote, created_at: '' }]
    const newPaid = updated.reduce((s, p) => s + Number(p.amount), 0)
    await syncInvoiceStatus(invoice.id, newPaid, Number(invoice.amount), invoice.status, payments)

    setAmount('')
    setRefNote('')
    setSaving(false)
    void reload()
    onSaved()
  }

  async function handleDelete(p: InvoicePayment) {
    setDeleting(true)
    const err = await deleteInvoicePayment(p.id)
    if (err) { setFormError(err); setDeleting(false); setConfirmDeleteId(null); return }
    setConfirmDeleteId(null)
    setDeleting(false)
    await reload()
    const remaining = payments.filter((x) => x.id !== p.id)
    const newPaid = remaining.reduce((s, x) => s + Number(x.amount), 0)
    await syncInvoiceStatus(invoice.id, newPaid, Number(invoice.amount), invoice.status, remaining)
    void reload()
    onSaved()
  }

  const name = invoice.company_name || invoice.client_name || 'Client'

  return (
    <Modal onClose={onClose} title={`Record payment — ${displayInvoiceNumber(invoice.invoice_number)}`} size="md">
      <div style={styles.wrapper}>
        <div style={styles.invoiceMeta}>
          <span style={styles.metaName}>{name}</span>
          <span style={styles.metaTotal}>Total: <span style={styles.metaMono}>{formatMoney(Number(invoice.amount), invoice.currency)}</span></span>
        </div>

        {/* Existing payment history */}
        <div style={styles.historySection}>
          <div style={styles.historyLabel}>Payment history</div>
          {loading ? (
            <p style={styles.muted}>Loading...</p>
          ) : payments.length === 0 ? (
            <p style={styles.muted}>No payments recorded yet.</p>
          ) : (
            <div style={styles.historyList}>
              {payments.map((p) => (
                <div key={p.id} style={styles.historyRow}>
                  <span style={styles.historyDate}>{formatDate(p.paid_on)}</span>
                  {p.method && <span style={styles.historyMethod}>{p.method}</span>}
                  <span style={styles.historyAmount}>{formatMoney(Number(p.amount), invoice.currency)}</span>
                  {confirmDeleteId === p.id ? (
                    <span style={styles.confirmRow}>
                      <button type="button" style={styles.confirmDeleteBtn} onClick={() => handleDelete(p)} disabled={deleting}>
                        {deleting ? 'Removing...' : 'Remove'}
                      </button>
                      <button type="button" style={styles.cancelDeleteBtn} onClick={() => setConfirmDeleteId(null)} disabled={deleting}>
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      style={styles.deleteIcon}
                      onClick={() => setConfirmDeleteId(p.id)}
                      aria-label="Delete payment"
                      title="Delete payment"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                  {p.reference_note && <span style={styles.historyRef}>{p.reference_note}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Balance summary */}
        <div style={styles.summaryBox}>
          <SumRow label="Invoice total" value={formatMoney(Number(invoice.amount), invoice.currency)} />
          <SumRow label="Paid" value={formatMoney(amountPaid, invoice.currency)} />
          <div style={styles.divider} />
          <div style={styles.sumRow}>
            <span style={styles.sumLabel}>Balance due</span>
            <span style={{ ...styles.sumValue, color: balanceDue > 0 ? tokens.ruby : tokens.green, fontWeight: 700 }}>
              {formatMoney(balanceDue, invoice.currency)}
            </span>
          </div>
        </div>

        {/* Add new payment form */}
        {balanceDue > 0 && (
          <>
            <div style={styles.addLabel}>Add payment</div>
            <div style={styles.addForm}>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                inputMode="decimal"
                style={{ ...styles.input, width: 110, fontFamily: mono }}
              />
              <input
                type="date"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
                style={{ ...styles.input, width: 140 }}
              />
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                style={{ ...styles.input, flex: 1 }}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                value={refNote}
                onChange={(e) => setRefNote(e.target.value)}
                placeholder="Reference / note"
                style={{ ...styles.input, flex: 2 }}
              />
              <button
                type="button"
                style={styles.addBtn}
                onClick={handleAdd}
                disabled={saving}
              >
                <Plus size={14} /> {saving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </>
        )}

        {formError && <p style={styles.formError}>{formError}</p>}
      </div>

      <div style={styles.actions}>
        <button type="button" style={styles.closeBtn} onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  )
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.sumRow}>
      <span style={styles.sumLabel}>{label}</span>
      <span style={styles.sumValue}>{value}</span>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', gap: 14 },
  invoiceMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '8px 0',
    borderBottom: `1px solid ${t.border.subtle}`,
  },
  metaName: { fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: t.text.primary },
  metaTotal: { fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary },
  metaMono: { fontFamily: mono, color: t.text.primary },
  historySection: {},
  historyLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.tertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  historyList: { display: 'flex', flexDirection: 'column', gap: 4 },
  historyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 10px',
    background: tokens.bg,
    borderRadius: 6,
    flexWrap: 'wrap' as const,
  },
  historyDate: { fontFamily: mono, fontSize: 12, color: t.text.tertiary, minWidth: 90 },
  historyMethod: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.secondary,
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 4,
    padding: '1px 7px',
  },
  historyAmount: { fontFamily: mono, fontSize: 13, fontWeight: 600, color: t.text.primary, marginLeft: 'auto' },
  historyRef: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted, width: '100%', paddingLeft: 0 },
  deleteIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: tokens.ruby,
    cursor: 'pointer',
    padding: 3,
    borderRadius: 4,
    marginLeft: 4,
  },
  confirmRow: { display: 'inline-flex', gap: 6, alignItems: 'center', marginLeft: 4 },
  confirmDeleteBtn: {
    background: tokens.rubyLight,
    border: 'none',
    color: tokens.ruby,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '3px 8px',
    borderRadius: 4,
  },
  cancelDeleteBtn: {
    background: 'transparent',
    border: 'none',
    color: t.text.tertiary,
    fontFamily: fonts.body,
    fontSize: 12,
    cursor: 'pointer',
    padding: '3px 4px',
  },
  summaryBox: {
    background: tokens.bg,
    borderRadius: 8,
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  sumRow: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  sumLabel: { fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary },
  sumValue: { fontFamily: mono, fontSize: 13, color: t.text.primary },
  divider: { height: 1, background: t.border.subtle, margin: '4px 0' },
  addLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.tertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  addForm: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const },
  input: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 6,
    padding: '7px 9px',
    boxSizing: 'border-box' as const,
    minWidth: 0,
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: tokens.primary,
    border: 'none',
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '7px 12px',
    borderRadius: 6,
    flexShrink: 0,
  },
  formError: {
    margin: 0,
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.ruby,
  },
  actions: { display: 'flex', justifyContent: 'flex-end', marginTop: 20 },
  closeBtn: {
    background: tokens.surface,
    color: t.text.primary,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '9px 18px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  muted: { margin: 0, fontFamily: fonts.body, fontSize: 13, color: t.text.muted },
}
