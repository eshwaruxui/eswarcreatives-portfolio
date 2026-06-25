// Confirmation modal for hard-deleting a standalone invoice (owner/admin only).
// Linked invoices are never reachable here (their row renders a disabled button
// in InvoicesAdmin), so this only ever deletes an invoice with no proposal.
//
// When the invoice is paid, a warning banner spells out that deleting it removes
// a payment record (H1 visibility, H5 error prevention). The delete routes
// through the admin-delete-invoice edge function. No raw err.message is shown (H9).
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'
import { mono, formatMoney } from './ui'
import { showToast } from './toast'

export type DeletableInvoice = {
  id: string
  invoice_number: string
  amount: number
  currency: string
  status: string
  client_name: string | null
  company_name: string | null
}

export function DeleteInvoiceModal({
  invoice,
  onClose,
  onDeleted,
}: {
  invoice: DeletableInvoice
  onClose: () => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clientName = invoice.client_name || invoice.company_name || '—'
  const isPaid = invoice.status === 'paid'

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      const { error: err } = await supabase.functions.invoke('admin-delete-invoice', {
        body: { invoice_id: invoice.id },
      })
      if (err) throw err
      // H1: confirm exactly which invoice went.
      showToast(`Invoice ${invoice.invoice_number} deleted.`, 'success')
      onDeleted()
    } catch {
      // H9: plain-language error, never a raw Supabase string.
      setError('Could not delete this invoice. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <>
      <style>{`@keyframes deleteInvoiceIn{from{opacity:0;transform:translateY(8px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
      <div
        style={styles.backdrop}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-invoice-title"
      >
        <div style={styles.card}>
          <div style={styles.icon}>
            <AlertTriangle size={22} />
          </div>
          <h2 id="delete-invoice-title" style={styles.title}>
            Delete this invoice?
          </h2>

          <dl style={styles.summary}>
            <SummaryRow
              label="Invoice"
              value={<span style={{ fontFamily: mono }}>{invoice.invoice_number}</span>}
            />
            <SummaryRow label="Client" value={clientName} />
            <SummaryRow
              label="Amount"
              value={
                <span style={{ fontFamily: mono }}>
                  {formatMoney(Number(invoice.amount), invoice.currency)}
                </span>
              }
            />
            <SummaryRow label="Status" value={<span style={styles.statusValue}>{invoice.status}</span>} />
          </dl>

          {isPaid && (
            <div style={styles.warning}>
              This is a paid invoice. Deleting it permanently removes this payment
              record.
            </div>
          )}

          <p style={styles.body}>This action cannot be undone.</p>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.actions}>
            <button type="button" style={styles.cancel} onClick={onClose} disabled={deleting}>
              Cancel
            </button>
            <button
              type="button"
              style={{ ...styles.delete, ...(deleting ? styles.deleteDisabled : null) }}
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete invoice'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={styles.summaryRow}>
      <dt style={styles.summaryLabel}>{label}</dt>
      <dd style={styles.summaryValue}>{value}</dd>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 500,
    background: t.background.scrim,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    background: tokens.surface,
    borderRadius: 14,
    padding: 28,
    boxShadow: '0 24px 60px rgba(2, 76, 79, 0.24)',
    // H7: modal entrance uses motionTokens.fast (120ms).
    animation: `deleteInvoiceIn ${motionTokens.durationFast} ${motionTokens.easeEnter}`,
  },
  icon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 12,
    background: tokens.rubyLight,
    color: tokens.ruby,
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 19,
    fontWeight: 600,
    color: tokens.text,
    margin: '0 0 14px',
  },
  summary: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    margin: '0 0 16px',
    padding: '14px 16px',
    background: tokens.bg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 10,
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 16,
  },
  summaryLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.textMuted,
    margin: 0,
  },
  summaryValue: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    color: tokens.text,
    margin: 0,
    textAlign: 'right',
    minWidth: 0,
  },
  statusValue: { textTransform: 'capitalize' },
  warning: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 1.55,
    color: tokens.goldDark,
    background: t.background.tint3,
    border: `1px solid ${t.border.warning}`,
    borderRadius: 8,
    padding: '10px 14px',
    margin: '0 0 12px',
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 1.6,
    color: tokens.textMuted,
    margin: '0 0 12px',
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.ruby,
    background: tokens.rubyLight,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '8px 12px',
    margin: '0 0 12px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 8,
  },
  cancel: {
    background: tokens.surface,
    color: tokens.text,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '9px 18px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  delete: {
    background: tokens.ruby,
    color: t.text.inverse,
    border: 'none',
    borderRadius: 8,
    padding: '9px 18px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  deleteDisabled: {
    // Token rule: disabled = t.text.disabled + t.border.subtle.
    background: t.border.subtle,
    color: t.text.disabled,
    border: `1px solid ${t.border.subtle}`,
    cursor: 'not-allowed',
  },
}
