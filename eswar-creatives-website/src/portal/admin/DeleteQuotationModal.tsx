// Confirmation modal for hard-deleting a draft quotation (owner/admin only).
// Sent quotations are never reachable here (their row renders a disabled
// button in QuotationsAdmin) - a sent quotation is a document a client has
// seen and is archived, not removed. The delete is a direct table delete:
// quotation_items, quotation_day_sessions, quotation_snapshot_rates and
// quotation_snapshot_curve_steps all cascade from quotations (0110/0116/0117),
// so no edge function is needed. The status guard is repeated in the query
// itself so a quotation sent from another tab between render and click can
// never be deleted (H5 error prevention). No raw err.message is shown (H9).
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'
import { mono, formatMoney } from './ui'
import { showToast } from './toast'

export type DeletableQuotation = {
  id: string
  quotation_number: string
  client_name: string
  total_amount: number
  status: string
}

export function DeleteQuotationModal({
  quotation,
  onClose,
  onDeleted,
}: {
  quotation: DeletableQuotation
  onClose: () => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('quotations')
      .delete()
      .eq('id', quotation.id)
      .eq('status', 'draft')
      .select('id')
    if (err) {
      // H9: plain-language error, never a raw Supabase string.
      setError('Could not delete this quotation. Please try again.')
      setDeleting(false)
      return
    }
    if (!data || data.length === 0) {
      // The draft-only filter matched nothing: it was sent (or already
      // deleted) since this list loaded.
      setError('This quotation is no longer a draft, so it was kept. Refresh the list to see its current status.')
      setDeleting(false)
      return
    }
    // H1: confirm exactly which quotation went.
    showToast(`Quotation ${quotation.quotation_number} deleted.`, 'success')
    onDeleted()
  }

  return (
    <>
      <style>{`@keyframes deleteQuotationIn{from{opacity:0;transform:translateY(8px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
      <div
        style={styles.backdrop}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-quotation-title"
      >
        <div style={styles.card}>
          <div style={styles.icon}>
            <AlertTriangle size={22} />
          </div>
          <h2 id="delete-quotation-title" style={styles.title}>
            Delete this quotation?
          </h2>

          <dl style={styles.summary}>
            <SummaryRow
              label="Quotation"
              value={<span style={{ fontFamily: mono }}>{quotation.quotation_number}</span>}
            />
            <SummaryRow label="Client" value={quotation.client_name} />
            <SummaryRow
              label="Total"
              value={
                <span style={{ fontFamily: mono }}>
                  {formatMoney(Number(quotation.total_amount), 'INR')}
                </span>
              }
            />
          </dl>

          <p style={styles.body}>
            Its line items, day sessions and pricing snapshot go with it. This
            action cannot be undone.
          </p>

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
              {deleting ? 'Deleting…' : 'Delete quotation'}
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
    animation: `deleteQuotationIn ${motionTokens.durationFast} ${motionTokens.easeEnter}`,
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
    color: t.text.primary,
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
    color: t.text.tertiary,
    margin: 0,
  },
  summaryValue: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    color: t.text.primary,
    margin: 0,
    textAlign: 'right',
    minWidth: 0,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 1.6,
    color: t.text.secondary,
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
    color: t.text.primary,
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
