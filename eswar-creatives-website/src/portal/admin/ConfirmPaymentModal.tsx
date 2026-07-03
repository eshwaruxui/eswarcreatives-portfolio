// Modal for recording a payment against an invoice.
// mode 'mark_paid'      — marks invoice fully paid, updates invoices row directly,
//                         also writes one invoice_payments record for audit trail.
// mode 'record_payment' — records a partial payment in invoice_payments and
//                         auto-derives invoice status (partially_paid / paid).
//
// Rules:
//   Backdrop click: never closes (prevent accidental dismiss).
//   ESC: closes only when the form is pristine (user has not changed any field).
//   Confirm CTA: disabled until method + date are filled
//                (+ amount > 0 in record_payment mode).
//   File upload: payment_proofs bucket, path {invoice_id}/{ts}-{name}.
//   Errors: friendly copy only, never raw Supabase err.message.
//   Tokens: t.text.* only, no raw hex outside theme.ts, no em dashes.
import { useEffect, useRef, useState } from 'react'
import { Upload, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import { Modal, mono, formatMoney } from './ui'
import { PAYMENT_METHODS } from './PaymentsSection'
import { addInvoicePayment, syncInvoiceStatus, useInvoicePayments } from '../hooks/useInvoicePayments'

export type PaymentModalMode = 'mark_paid' | 'record_payment'

type ModalInvoice = {
  id: string
  invoice_number: string
  client_name: string | null
  company_name: string | null
  amount: number
  currency: string
  status: string
}

type Props = {
  invoice: ModalInvoice
  mode: PaymentModalMode
  onClose: () => void
  onSuccess: (message: string) => void
}

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function displayNumber(stored: string) {
  return stored.replace(/^EC-I-/, 'EC-')
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function ConfirmPaymentModal({ invoice, mode, onClose, onSuccess }: Props) {
  const today = todayISO()
  const isRecordMode = mode === 'record_payment'

  const [method, setMethod] = useState('UPI')
  const [date, setDate] = useState(today)
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // For record_payment mode: know the current amount_paid to validate.
  const { payments, amountPaid } = useInvoicePayments(invoice.id, invoice.amount)

  const name = invoice.company_name || invoice.client_name || 'Client'
  const displayNum = displayNumber(invoice.invoice_number)

  // ESC closes only when pristine.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (!isDirty) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isDirty, onClose])

  function markDirty() {
    if (!isDirty) setIsDirty(true)
  }

  function handleFile(f: File) {
    setFileError(null)
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setFileError('Only JPEG, PNG, WebP, or PDF files are accepted.')
      return
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError('File exceeds the 5 MB limit.')
      return
    }
    setFile(f)
    markDirty()
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) handleFile(e.target.files[0])
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0])
  }

  async function uploadProof(): Promise<string | null> {
    if (!file) return null
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `${invoice.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const { error } = await supabase.storage
      .from('payment_proofs')
      .upload(path, file, { contentType: file.type, upsert: false })
    if (error) return null
    return path
  }

  async function handleConfirm() {
    setFormError(null)

    // Validation.
    if (!method) { setFormError('Select a payment method.'); return }
    if (!date) { setFormError('Select the date the payment was received.'); return }

    if (isRecordMode) {
      const amt = parseFloat(amount)
      if (!amt || amt <= 0) {
        setFormError('Enter the amount received.')
        return
      }
      const newTotal = amountPaid + amt
      if (newTotal > Number(invoice.amount)) {
        setFormError(
          `Total payments (${formatMoney(newTotal, invoice.currency)}) would exceed the invoice total (${formatMoney(Number(invoice.amount), invoice.currency)}).`
        )
        return
      }
    }

    setSaving(true)
    try {
      const proofPath = await uploadProof()
      const { data: sess } = await supabase.auth.getUser()
      const userId = sess.user?.id ?? null

      if (isRecordMode) {
        const amt = parseFloat(amount)
        // Write to invoice_payments and auto-derive status.
        const { error: insErr } = await supabase.from('invoice_payments').insert({
          invoice_id: invoice.id,
          amount: amt,
          paid_on: date,
          method,
          reference_note: null,
          proof_url: proofPath,
          created_by: userId,
        })
        if (insErr) throw insErr
        const newPaid = amountPaid + amt
        await syncInvoiceStatus(invoice.id, newPaid, Number(invoice.amount), invoice.status, payments)
      } else {
        // Mark fully paid: write a payment record + update invoices row.
        const { error: insErr } = await supabase.from('invoice_payments').insert({
          invoice_id: invoice.id,
          amount: Number(invoice.amount),
          paid_on: date,
          method,
          reference_note: null,
          proof_url: proofPath,
          created_by: userId,
        })
        if (insErr) throw insErr
        const { error: updErr } = await supabase
          .from('invoices')
          .update({ status: 'paid', paid_date: date, payment_method: method })
          .eq('id', invoice.id)
        if (updErr) throw updErr
      }

      onSuccess(`Payment recorded for ${displayNum}`)
      onClose()
    } catch {
      setFormError('Could not save the payment. Check your connection and try again.')
      setSaving(false)
    }
  }

  const canConfirm = !!method && !!date && (!isRecordMode || (parseFloat(amount) || 0) > 0)

  const balanceDue = Math.max(0, Number(invoice.amount) - amountPaid)

  return (
    <Modal
      title={isRecordMode ? 'Record Payment' : 'Confirm Payment'}
      onClose={onClose}
      closeOnBackdrop={false}
      size="sm"
    >
      {/* Subtitle */}
      <p style={styles.subtitle}>
        {displayNum} &middot; {name}
      </p>

      {isRecordMode && (
        <div style={styles.balanceChip}>
          <span style={styles.balanceLabel}>Balance due</span>
          <span style={styles.balanceValue}>{formatMoney(balanceDue, invoice.currency)}</span>
        </div>
      )}

      <div style={styles.form}>
        {/* Amount — record_payment mode only */}
        {isRecordMode && (
          <Field label="Amount received">
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); markDirty() }}
              placeholder="0"
              style={{ ...styles.input, fontFamily: mono }}
              autoFocus
            />
          </Field>
        )}

        {/* Payment method */}
        <Field label="Payment method">
          <select
            value={method}
            onChange={(e) => { setMethod(e.target.value); markDirty() }}
            style={styles.input}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>

        {/* Date */}
        <Field label="Payment received date">
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => { setDate(e.target.value); markDirty() }}
            style={styles.input}
          />
        </Field>

        {/* File upload */}
        <Field label="Payment proof (optional)">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            style={{ display: 'none' }}
            onChange={onInputChange}
          />
          {file ? (
            <div style={styles.fileChip}>
              <span style={styles.fileName}>{file.name}</span>
              <span style={styles.fileSize}>{formatBytes(file.size)}</span>
              <button
                type="button"
                style={styles.fileRemove}
                onClick={() => { setFile(null); setFileError(null) }}
                aria-label="Remove file"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div
              style={{
                ...styles.dropZone,
                ...(dragging ? styles.dropZoneActive : null),
              }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              role="button"
              tabIndex={0}
              aria-label="Attach payment proof"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
            >
              <Upload size={18} style={{ color: t.text.muted }} />
              <span style={styles.dropText}>Tap to attach or drag file</span>
              <span style={styles.dropHint}>JPEG, PNG, WebP or PDF &middot; max 5 MB</span>
            </div>
          )}
          {fileError && <p style={styles.fileError}>{fileError}</p>}
        </Field>
      </div>

      {formError && <p style={styles.formError}>{formError}</p>}

      <div style={styles.actions}>
        <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button
          type="button"
          style={{ ...styles.confirmBtn, ...(canConfirm && !saving ? null : styles.confirmBtnDisabled) }}
          onClick={handleConfirm}
          disabled={!canConfirm || saving}
        >
          {saving ? 'Saving...' : isRecordMode ? 'Record payment' : 'Confirm payment'}
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
  subtitle: {
    margin: '0 0 16px',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.muted,
  },
  balanceChip: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: tokens.bg,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    padding: '8px 12px',
    marginBottom: 16,
  },
  balanceLabel: { fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary },
  balanceValue: { fontFamily: mono, fontSize: 14, fontWeight: 700, color: tokens.ruby },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.tertiary,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '11px 12px',
    width: '100%',
    boxSizing: 'border-box' as const,
    minHeight: 44,
  },
  dropZone: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 88,
    border: `1.5px dashed ${t.border.default}`,
    borderRadius: 8,
    cursor: 'pointer',
    padding: 16,
    transition: 'border-color 0.15s ease',
  },
  dropZoneActive: {
    borderColor: tokens.primary,
    background: tokens.tealLight,
  },
  dropText: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: t.text.secondary,
  },
  dropHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
  },
  fileChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: tokens.bg,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    padding: '10px 12px',
    minHeight: 44,
  },
  fileName: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  fileSize: {
    fontFamily: mono,
    fontSize: 12,
    color: t.text.muted,
    flexShrink: 0,
  },
  fileRemove: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: 'transparent',
    border: 'none',
    color: t.text.muted,
    cursor: 'pointer',
    padding: 4,
    borderRadius: 4,
    minWidth: 24,
    minHeight: 24,
  },
  fileError: {
    margin: '4px 0 0',
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.ruby,
  },
  formError: {
    margin: '16px 0 0',
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.ruby,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    background: 'transparent',
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    color: t.text.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '10px 18px',
    minHeight: 44,
  },
  confirmBtn: {
    background: tokens.primary,
    border: 'none',
    borderRadius: 8,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '10px 20px',
    minHeight: 44,
  },
  confirmBtnDisabled: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
}
