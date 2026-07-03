// "Payments received" section used inside the New Invoice modal.
// Manages an array of local payment drafts (no DB writes here; the parent
// inserts them after the invoice row is created).
// Theme tokens only; no raw hex; no em dashes.
import { Plus, Trash2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import { tokens, t, fonts } from '../theme'
import { mono, formatMoney } from './ui'

export const PAYMENT_METHODS = ['UPI', 'Bank transfer', 'Cash', 'Cheque', 'Other']

const today = () => new Date().toISOString().slice(0, 10)

export type PaymentDraft = {
  key: string
  amount: string
  paid_on: string
  method: string
  reference_note: string
}

export function emptyDraft(): PaymentDraft {
  return { key: `pd-${Date.now()}-${Math.random()}`, amount: '', paid_on: today(), method: 'UPI', reference_note: '' }
}

type Props = {
  drafts: PaymentDraft[]
  onChange: (drafts: PaymentDraft[]) => void
  invoiceTotal: number
  currency: string
  validationError?: string | null
}

export function PaymentsSection({ drafts, onChange, invoiceTotal, currency, validationError }: Props) {
  const amountPaid = drafts.reduce((s, d) => s + (parseFloat(d.amount) || 0), 0)
  const balanceDue = Math.max(0, invoiceTotal - amountPaid)

  function add() {
    onChange([...drafts, emptyDraft()])
  }
  function remove(key: string) {
    onChange(drafts.filter((d) => d.key !== key))
  }
  function update(key: string, field: keyof Omit<PaymentDraft, 'key'>, value: string) {
    onChange(drafts.map((d) => (d.key === key ? { ...d, [field]: value } : d)))
  }

  return (
    <div>
      <span style={styles.sectionLabel}>Payments received</span>
      <div style={styles.box}>
        {drafts.length === 0 ? (
          <p style={styles.empty}>No payments yet. Use "+ Add payment" to record a partial or full payment.</p>
        ) : (
          drafts.map((d) => (
            <div key={d.key} style={styles.row}>
              <input
                value={d.amount}
                onChange={(e) => update(d.key, 'amount', e.target.value)}
                placeholder="Amount"
                inputMode="decimal"
                style={{ ...styles.input, width: 110, fontFamily: mono }}
              />
              <input
                type="date"
                value={d.paid_on}
                onChange={(e) => update(d.key, 'paid_on', e.target.value)}
                style={{ ...styles.input, width: 140 }}
              />
              <select
                value={d.method}
                onChange={(e) => update(d.key, 'method', e.target.value)}
                style={{ ...styles.input, width: 130 }}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                value={d.reference_note}
                onChange={(e) => update(d.key, 'reference_note', e.target.value)}
                placeholder="Reference / note"
                style={{ ...styles.input, flex: 1 }}
              />
              <button
                type="button"
                style={styles.deleteBtn}
                onClick={() => remove(d.key)}
                aria-label="Remove payment"
                title="Remove payment"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}

        {validationError && <p style={styles.validationError}>{validationError}</p>}

        <div style={styles.footer}>
          <button type="button" style={styles.addBtn} onClick={add}>
            <Plus size={14} /> Add payment
          </button>

          {invoiceTotal > 0 && (
            <div style={styles.summary}>
              <SummaryLine label="Invoice total" value={formatMoney(invoiceTotal, currency)} />
              <SummaryLine label="Paid" value={formatMoney(amountPaid, currency)} />
              <div style={styles.summaryDivider} />
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Balance due</span>
                <span
                  style={{
                    ...styles.summaryValue,
                    color: balanceDue > 0 ? tokens.ruby : tokens.green,
                    fontWeight: 700,
                  }}
                >
                  {formatMoney(balanceDue, currency)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.summaryRow}>
      <span style={styles.summaryLabel}>{label}</span>
      <span style={styles.summaryValue}>{value}</span>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  sectionLabel: {
    display: 'block',
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.tertiary,
    marginBottom: 6,
  },
  box: {
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    background: tokens.surface,
  },
  empty: {
    margin: 0,
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.muted,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 6,
    padding: '7px 9px',
    boxSizing: 'border-box',
    minWidth: 0,
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: 'transparent',
    border: 'none',
    color: tokens.ruby,
    cursor: 'pointer',
    padding: 4,
    borderRadius: 4,
  },
  footer: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    background: 'transparent',
    border: `1px dashed ${t.border.medium}`,
    borderRadius: 8,
    color: t.text.primary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '6px 10px',
    flexShrink: 0,
  },
  summary: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 180,
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    padding: '2px 0',
  },
  summaryLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.tertiary,
  },
  summaryValue: {
    fontFamily: mono,
    fontSize: 13,
    color: t.text.primary,
    textAlign: 'right' as const,
  },
  summaryDivider: {
    height: 1,
    background: t.border.default,
    margin: '4px 0',
  },
  validationError: {
    margin: 0,
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.ruby,
  },
}
