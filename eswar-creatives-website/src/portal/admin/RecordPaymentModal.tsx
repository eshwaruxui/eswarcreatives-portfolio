// Payment history modal for an existing invoice.
// Shows the full payment ledger (paid_on, method, amount per row) with
// inline delete confirm, balance summary, and an "+ Add payment" button.
//
// The add-payment flow reuses ConfirmPaymentModal (record_payment mode):
// clicking "+ Add payment" swaps this modal out for ConfirmPaymentModal.
// On success or cancel, control returns here with refreshed data.
//
// Theme tokens only; no raw hex; no em dashes.
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import { tokens, t, fonts } from '../theme'
import { Modal, mono, formatMoney } from './ui'
import { formatPortalDate } from '../utils/formatDate'
import { ConfirmPaymentModal } from './ConfirmPaymentModal'
import {
  useInvoicePayments,
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

type Props = {
  invoice: RowInvoice
  onClose: () => void
  onSaved: () => void
}

export function RecordPaymentModal({ invoice, onClose, onSaved }: Props) {
  const { payments, amountPaid, balanceDue, loading, reload } = useInvoicePayments(invoice.id, invoice.amount)

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  // When true, swap this modal out for ConfirmPaymentModal in record_payment mode.
  const [showAdd, setShowAdd] = useState(false)

  const displayNum = displayInvoiceNumber(invoice.invoice_number)
  const name = invoice.company_name || invoice.client_name || 'Client'

  async function handleDelete(p: InvoicePayment) {
    setDeleting(true)
    setDeleteError(null)
    const err = await deleteInvoicePayment(p.id)
    if (err) { setDeleteError(err); setDeleting(false); setConfirmDeleteId(null); return }
    setConfirmDeleteId(null)
    setDeleting(false)
    await reload()
    const remaining = payments.filter((x) => x.id !== p.id)
    const newPaid = remaining.reduce((s, x) => s + Number(x.amount), 0)
    await syncInvoiceStatus(invoice.id, newPaid, Number(invoice.amount), invoice.status, remaining)
    void reload()
    onSaved()
  }

  // Swap to ConfirmPaymentModal: render it directly (sequential, no nesting).
  if (showAdd) {
    return (
      <ConfirmPaymentModal
        invoice={invoice}
        mode="record_payment"
        onClose={() => setShowAdd(false)}
        onSuccess={() => {
          setShowAdd(false)
          void reload()
          onSaved()
        }}
      />
    )
  }

  return (
    <Modal
      title="Payment history"
      onClose={onClose}
      closeOnBackdrop={false}
      size="sm"
    >
      <p style={styles.subtitle}>{displayNum} &middot; {name}</p>

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

      {/* Payment history */}
      <div style={styles.historyLabel}>Payments received</div>
      {loading ? (
        <p style={styles.muted}>Loading...</p>
      ) : payments.length === 0 ? (
        <p style={styles.muted}>No payments recorded yet.</p>
      ) : (
        <div style={styles.historyList}>
          {payments.map((p) => (
            <div key={p.id} style={styles.historyRow}>
              <span style={styles.historyDate}>{formatPortalDate(p.paid_on)}</span>
              {p.method && <span style={styles.historyMethod}>{p.method}</span>}
              <span style={styles.historyAmount}>{formatMoney(Number(p.amount), invoice.currency)}</span>
              {confirmDeleteId === p.id ? (
                <span style={styles.confirmRow}>
                  <button
                    type="button"
                    style={styles.confirmDeleteBtn}
                    onClick={() => handleDelete(p)}
                    disabled={deleting}
                  >
                    {deleting ? 'Removing...' : 'Remove'}
                  </button>
                  <button
                    type="button"
                    style={styles.cancelDeleteBtn}
                    onClick={() => setConfirmDeleteId(null)}
                    disabled={deleting}
                  >
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
              {p.reference_note && (
                <span style={styles.historyRef}>{p.reference_note}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteError && <p style={styles.formError}>{deleteError}</p>}

      <div style={styles.actions}>
        <button type="button" style={styles.closeBtn} onClick={onClose}>
          Done
        </button>
        {balanceDue > 0 && (
          <button type="button" style={styles.addBtn} onClick={() => setShowAdd(true)}>
            Add payment
          </button>
        )}
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
  subtitle: {
    margin: '0 0 14px',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.muted,
  },
  summaryBox: {
    background: tokens.bg,
    borderRadius: 8,
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    marginBottom: 16,
  },
  sumRow: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  sumLabel: { fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary },
  sumValue: { fontFamily: mono, fontSize: 13, color: t.text.primary },
  divider: { height: 1, background: t.border.subtle, margin: '4px 0' },
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
    padding: '7px 10px',
    background: tokens.bg,
    borderRadius: 6,
    flexWrap: 'wrap' as const,
    minHeight: 44,
  },
  historyDate: { fontFamily: mono, fontSize: 12, color: t.text.tertiary, minWidth: 88 },
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
  historyRef: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted, width: '100%' },
  deleteIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    minHeight: 28,
    background: 'transparent',
    border: 'none',
    color: tokens.ruby,
    cursor: 'pointer',
    padding: 4,
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
    padding: '4px 10px',
    borderRadius: 4,
    minHeight: 28,
  },
  cancelDeleteBtn: {
    background: 'transparent',
    border: 'none',
    color: t.text.tertiary,
    fontFamily: fonts.body,
    fontSize: 12,
    cursor: 'pointer',
    padding: '4px 6px',
    minHeight: 28,
  },
  formError: {
    margin: '10px 0 0',
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.ruby,
  },
  muted: { margin: 0, fontFamily: fonts.body, fontSize: 13, color: t.text.muted },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  closeBtn: {
    background: tokens.surface,
    color: t.text.primary,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '10px 18px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    minHeight: 44,
  },
  addBtn: {
    background: tokens.primary,
    border: 'none',
    color: t.text.onPrimary,
    borderRadius: 8,
    padding: '10px 18px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    minHeight: 44,
  },
}
