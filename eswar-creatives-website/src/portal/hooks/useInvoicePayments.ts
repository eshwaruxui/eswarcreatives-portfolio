// Shared data hook for invoice payments. Fetches invoice_payments rows for a
// given invoice and computes amount_paid + balance_due client-side (no DB view
// needed). Also exports deriveInvoiceStatus for consistent status derivation
// on any payment change.
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type InvoicePayment = {
  id: string
  invoice_id: string
  amount: number
  paid_on: string
  method: string | null
  reference_note: string | null
  created_at: string
}

export type PaymentSummary = {
  payments: InvoicePayment[]
  amountPaid: number
  balanceDue: number
  loading: boolean
}

// Fetch all payments for a single invoice and compute derived totals.
export function useInvoicePayments(invoiceId: string, invoiceAmount: number): PaymentSummary & { reload: () => void } {
  const [payments, setPayments] = useState<InvoicePayment[]>([])
  const [loading, setLoading] = useState(false)
  const cancelRef = useRef(false)

  const fetch = useCallback(async () => {
    cancelRef.current = false
    setLoading(true)
    const { data } = await supabase
      .from('invoice_payments')
      .select('id, invoice_id, amount, paid_on, method, reference_note, created_at')
      .eq('invoice_id', invoiceId)
      .order('paid_on', { ascending: true })
    if (!cancelRef.current) {
      setPayments((data ?? []) as InvoicePayment[])
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    void fetch()
    return () => { cancelRef.current = true }
  }, [fetch])

  const amountPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
  const balanceDue = Math.max(0, Number(invoiceAmount) - amountPaid)

  return { payments, amountPaid, balanceDue, loading, reload: fetch }
}

// Derive the correct invoice status from current payment state.
// Rules:
//   balance_due <= 0  -> 'paid' (set paid_date to latest payment date)
//   0 < amountPaid < total -> 'partially_paid'
//   else leave status unchanged
// Never auto-downgrades a manually set status.
export function deriveInvoiceStatus(
  currentStatus: string,
  amountPaid: number,
  invoiceTotal: number
): { status: string; paidDate: string | null } {
  const total = Number(invoiceTotal)
  const paid = Number(amountPaid)

  if (paid >= total && paid > 0) {
    return { status: 'paid', paidDate: null }
  }
  if (paid > 0 && paid < total) {
    return { status: 'partially_paid', paidDate: null }
  }
  return { status: currentStatus, paidDate: null }
}

// Compute the latest payment date from a list of payments (used for paid_date).
export function latestPaymentDate(payments: InvoicePayment[]): string | null {
  if (payments.length === 0) return null
  return payments.reduce((latest, p) => (p.paid_on > latest ? p.paid_on : latest), payments[0].paid_on)
}

// Save a single new payment row and return an error string on failure.
export async function addInvoicePayment(
  invoiceId: string,
  draft: { amount: number; paid_on: string; method: string; reference_note: string },
  createdBy: string | null
): Promise<string | null> {
  const { error } = await supabase.from('invoice_payments').insert({
    invoice_id: invoiceId,
    amount: draft.amount,
    paid_on: draft.paid_on,
    method: draft.method.trim() || null,
    reference_note: draft.reference_note.trim() || null,
    created_by: createdBy,
  })
  if (error) return 'Could not save the payment. Check the details and try again.'
  return null
}

// Delete a payment row by id.
export async function deleteInvoicePayment(id: string): Promise<string | null> {
  const { error } = await supabase.from('invoice_payments').delete().eq('id', id)
  if (error) return 'Could not remove this payment. Try again.'
  return null
}

// Update invoice status + paid_date after any payment change.
export async function syncInvoiceStatus(
  invoiceId: string,
  amountPaid: number,
  invoiceTotal: number,
  currentStatus: string,
  allPayments: InvoicePayment[]
): Promise<string | null> {
  const derived = deriveInvoiceStatus(currentStatus, amountPaid, invoiceTotal)
  if (derived.status === currentStatus) return null
  const paidDate =
    derived.status === 'paid' ? (latestPaymentDate(allPayments) ?? new Date().toISOString().slice(0, 10)) : null
  const { error } = await supabase
    .from('invoices')
    .update({ status: derived.status, paid_date: paidDate })
    .eq('id', invoiceId)
  if (error) return 'Could not update invoice status. Try again.'
  return null
}
