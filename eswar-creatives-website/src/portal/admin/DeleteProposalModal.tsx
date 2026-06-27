// Confirmation modal for hard-deleting a proposal (owner/admin only). Shared by
// the proposals list and the proposal detail view so the destructive flow looks
// and behaves identically wherever an admin triggers it.
//
// On open it fetches the invoices linked to the proposal so the admin sees, up
// front, exactly what they are about to lose: if any are paid, a warning banner
// spells out that payment records will be removed (H1 visibility of system
// status, H5 error prevention). The delete itself routes through the
// admin-delete-proposal edge function (atomic, service-role). No raw err.message
// is ever shown (H9).
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'
import { mono, formatMoney } from './ui'
import { showToast } from './toast'

type LinkedInvoice = { id: string; amount: number; status: string; currency: string }

function pluralInvoices(n: number): string {
  return `${n} invoice${n === 1 ? '' : 's'}`
}

function pluralPaidInvoices(n: number): string {
  return `${n} paid invoice${n === 1 ? '' : 's'}`
}

// Total a set of invoices, grouped by currency and never summed across them.
function moneySummary(list: LinkedInvoice[]): string {
  const byCur: Record<string, number> = {}
  for (const inv of list) {
    byCur[inv.currency] = (byCur[inv.currency] ?? 0) + Number(inv.amount)
  }
  return Object.entries(byCur)
    .map(([cur, amt]) => formatMoney(amt, cur))
    .join(' + ')
}

export function DeleteProposalModal({
  proposalId,
  title,
  totalAmount,
  currency,
  clientName,
  onClose,
  onDeleted,
}: {
  proposalId: string
  title: string
  totalAmount: number
  currency: string
  clientName: string
  onClose: () => void
  onDeleted: (deletedInvoices: number) => void
}) {
  // null = still loading; an array (possibly empty) once we know.
  const [invoices, setInvoices] = useState<LinkedInvoice[] | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error: err } = await supabase
        .from('invoices')
        .select('id, amount, status, currency')
        .eq('proposal_id', proposalId)
      if (cancelled) return
      // On a read failure we still allow the delete (the edge function is the
      // source of truth); we just cannot pre-show the paid warning.
      setInvoices(err ? [] : ((data ?? []) as LinkedInvoice[]))
    })()
    return () => {
      cancelled = true
    }
  }, [proposalId])

  const paidInvoices = useMemo(
    () => (invoices ?? []).filter((i) => i.status === 'paid'),
    [invoices]
  )

  // Totals grouped by currency. paidSummary covers the paid invoices (the
  // warning case); allSummary covers every linked invoice (the unpaid-only case).
  const paidSummary = useMemo(() => moneySummary(paidInvoices), [paidInvoices])
  const allSummary = useMemo(() => moneySummary(invoices ?? []), [invoices])

  const loading = invoices === null
  const invoiceCount = invoices?.length ?? 0

  async function handleDelete() {
    setDeleting(true)
    setError(null)
    try {
      const { data, error: err } = await supabase.functions.invoke('admin-delete-proposal', {
        body: { proposal_id: proposalId },
      })
      if (err) throw err
      const n = (data as { deleted_invoices?: number } | null)?.deleted_invoices ?? invoiceCount
      // H1: confirm what happened, including the invoices that went with it.
      showToast(`Proposal deleted along with ${pluralInvoices(n)}.`, 'success')
      onDeleted(n)
    } catch {
      // H9: plain-language error, never a raw Supabase string.
      setError('Could not delete this proposal. Please try again.')
      setDeleting(false)
    }
  }

  return (
    <>
      <style>{`@keyframes deleteProposalIn{from{opacity:0;transform:translateY(8px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
      <div
        style={styles.backdrop}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-proposal-title"
      >
        <div style={styles.card}>
          <div style={styles.icon}>
            <AlertTriangle size={22} />
          </div>
          <h2 id="delete-proposal-title" style={styles.title}>
            Delete this proposal?
          </h2>

          <dl style={styles.summary}>
            <SummaryRow label="Proposal" value={title} />
            <SummaryRow label="Client" value={clientName || '—'} />
            <SummaryRow
              label="Total"
              value={<span style={{ fontFamily: mono }}>{formatMoney(totalAmount, currency)}</span>}
            />
          </dl>

          {loading ? (
            <p style={styles.body}>Checking linked invoices…</p>
          ) : paidInvoices.length > 0 ? (
            <div style={styles.warning}>
              {pluralPaidInvoices(paidInvoices.length)}
              {paidSummary ? ` totalling ${paidSummary}` : ''} will be permanently
              removed. This cannot be undone.
            </div>
          ) : invoiceCount > 0 ? (
            <p style={styles.body}>
              {pluralInvoices(invoiceCount)}
              {allSummary ? ` totalling ${allSummary}` : ''} will also be deleted.
            </p>
          ) : (
            <p style={styles.body}>No invoices are linked to this proposal.</p>
          )}

          <p style={styles.body}>This action cannot be undone.</p>

          {error && <div style={styles.error}>{error}</div>}

          <div style={styles.actions}>
            <button type="button" style={styles.cancel} onClick={onClose} disabled={deleting}>
              Cancel
            </button>
            <button
              type="button"
              style={{
                ...styles.delete,
                ...(loading || deleting ? styles.deleteDisabled : null),
              }}
              onClick={() => void handleDelete()}
              disabled={loading || deleting}
            >
              {deleting ? 'Deleting…' : 'Delete proposal'}
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
    maxWidth: 460,
    background: tokens.surface,
    borderRadius: 14,
    padding: 28,
    boxShadow: '0 24px 60px rgba(2, 76, 79, 0.24)',
    // H7: modal entrance uses motionTokens.fast (120ms).
    animation: `deleteProposalIn ${motionTokens.durationFast} ${motionTokens.easeEnter}`,
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
