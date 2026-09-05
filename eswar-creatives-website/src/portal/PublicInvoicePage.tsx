// Public invoice view — accessible without authentication.
// Reached via /invoice/:token; the token is a uuid generated server-side and
// stored on the invoices row. Fetched via the get_invoice_by_token RPC
// (SECURITY DEFINER, anon-callable) which enforces token + expiry server-side.
// Theme tokens only; no raw hex except the Razorpay theme color which accepts
// only a direct hex string; no em dashes.
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { Shield, CreditCard, Building2, Smartphone } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  InvoiceDocument,
  type InvoiceDoc,
  type InvoiceBilledTo,
  type InvoiceLine,
  type InvoicePaymentRow,
} from './components/shared/InvoiceDocument'
import { tokens, t, fonts } from './theme'
import { formatDocumentDate } from './utils/formatDate'
import eswarLogo from '../imports/eswar-logo.svg'
import type { CSSProperties } from 'react'

// Razorpay checkout.js is loaded dynamically so it is never bundled.
type RazorpayHandler = (response: {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}) => void

type RazorpayOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  prefill?: { name?: string }
  theme?: { color?: string }
  handler?: RazorpayHandler
  modal?: { ondismiss?: () => void }
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => { open(): void }
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) { resolve(); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('checkout_load_failed'))
    document.head.appendChild(script)
  })
}

// Shape of the JSONB returned by get_invoice_by_token.
type TokenPayload = {
  invoice: {
    id: string
    invoice_number: string
    client_name: string | null
    company_name: string | null
    label: string | null
    billing_title: string | null
    amount: number
    currency: string
    status: string
    due_date: string | null
    paid_date: string | null
    payment_method: string | null
    notes: string | null
    created_at: string
    razorpay_order_id: string | null
  }
  line_items: Array<{ label: string; amount: number; sort_order: number }>
  payments: Array<{
    paid_on: string
    method: string | null
    amount: number
    reference_note: string | null
  }>
}

type PaymentState = 'idle' | 'creating' | 'opening' | 'verifying' | 'success' | 'error'

// Strip the internal EC-I- prefix; display as EC-YYYY-NNN.
function displayNum(stored: string): string {
  return stored.replace(/^EC-I-/, 'EC-')
}

// Positive integer = days overdue; null = not yet due or no date.
function daysOverdue(dueDate: string | null): number | null {
  if (!dueDate) return null
  const diff = Math.floor((Date.now() - new Date(dueDate).getTime()) / 86_400_000)
  return diff > 0 ? diff : null
}

function fmtCurrency(amount: number, currency: string): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

export function PublicInvoicePage() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState<TokenPayload | null>(null)
  const [expired, setExpired] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [paymentState, setPaymentState] = useState<PaymentState>('idle')
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [paidAmount, setPaidAmount] = useState<number>(0)

  useEffect(() => {
    if (!token) {
      setExpired(true)
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.rpc('get_invoice_by_token', {
        p_token: token,
      })
      if (cancelled) return
      if (error || !data) {
        setExpired(true)
      } else {
        setPayload(data as TokenPayload)
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [token, refreshKey])

  const handlePayNow = useCallback(
    async (invoiceId: string, balanceDue: number, currency: string, clientName: string | null) => {
      setPaymentState('creating')
      setPaymentError(null)

      const amountPaise = Math.round(balanceDue * 100)

      // Step 1: create order server-side.
      const { data: orderData, error: orderErr } = await supabase.functions.invoke(
        'create-razorpay-order',
        { body: { invoice_token: token, invoice_id: invoiceId, amount: amountPaise, currency } }
      )

      if (orderErr || !orderData?.order_id) {
        setPaymentState('error')
        setPaymentError('We could not start payment. Please try again in a moment.')
        return
      }

      // Step 2: load checkout.js and open the modal.
      setPaymentState('opening')
      try {
        await loadRazorpayScript()
      } catch {
        setPaymentState('error')
        setPaymentError('Could not load the payment window. Check your connection and try again.')
        return
      }

      const rzp = new window.Razorpay({
        // VITE_RAZORPAY_KEY_ID is the public key, safe for the browser.
        key: (import.meta.env.VITE_RAZORPAY_KEY_ID as string) ?? orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'EswarCreatives',
        description: `Invoice ${payload ? displayNum(payload.invoice.invoice_number) : ''}`,
        order_id: orderData.order_id,
        prefill: { name: clientName ?? undefined },
        // Razorpay theme.color only accepts a direct hex string.
        theme: { color: '#024C4F' },
        modal: {
          ondismiss: () => {
            setPaymentState('idle')
          },
        },
        handler: async (response) => {
          setPaymentState('verifying')

          // Step 3: verify signature and record payment server-side.
          const { data: verifyData, error: verifyErr } = await supabase.functions.invoke(
            'verify-razorpay-payment',
            {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                invoice_id: invoiceId,
                invoice_token: token,
              },
            }
          )

          if (verifyErr || !verifyData?.success) {
            setPaymentState('error')
            setPaymentError(
              'Your payment was received but we could not confirm it right away. ' +
              'Please contact hello@eswarcreatives.in with reference: ' +
              (response.razorpay_payment_id ?? 'unknown')
            )
            return
          }

          setPaidAmount(balanceDue)
          setPaymentState('success')
          // Reload invoice data to show updated balance.
          setTimeout(() => setRefreshKey((k) => k + 1), 800)
        },
      })

      rzp.open()
    },
    [token, payload]
  )

  // Set page title from invoice number once loaded.
  useEffect(() => {
    if (!payload) return
    const num = displayNum(payload.invoice.invoice_number)
    document.title = `Invoice ${num} — Eswar Creatives`
    return () => {
      document.title = 'Eswar Creatives'
    }
  }, [payload])

  return (
    <div style={styles.page}>
      {/* Minimal top bar — no auth controls */}
      <header style={styles.topBar}>
        <div style={styles.topInner}>
          <img src={eswarLogo} alt="EswarCreatives" width={28} height={28} style={{ display: 'block' }} />
          <span style={styles.topName}>EswarCreatives</span>
        </div>
      </header>

      <main style={styles.main}>
        {loading && (
          <p style={styles.muted}>Loading...</p>
        )}

        {!loading && (expired || !payload) && (
          <div style={styles.errorCard}>
            <div style={styles.errorTitle}>This invoice link has expired</div>
            <p style={styles.errorBody}>
              Please contact Eswar Creatives for an updated link.
            </p>
            <a href="mailto:hello@eswarcreatives.in" style={styles.emailLink}>
              hello@eswarcreatives.in
            </a>
          </div>
        )}

        {!loading && payload && (() => {
          const inv = payload.invoice
          const lines: InvoiceLine[] = payload.line_items.map((l) => ({
            label: l.label,
            amount: Number(l.amount),
          }))
          const payments: InvoicePaymentRow[] = payload.payments.map((p) => ({
            paid_on: p.paid_on,
            method: p.method,
            amount: Number(p.amount),
            reference_note: p.reference_note,
          }))

          const total =
            lines.length > 0
              ? lines.reduce((s, l) => s + Number(l.amount), 0)
              : Number(inv.amount)
          const amountPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
          const balanceDue = Math.max(0, total - amountPaid)
          const overdueDays = daysOverdue(inv.due_date)

          const invoiceDoc: InvoiceDoc = {
            number: displayNum(inv.invoice_number),
            status: inv.status,
            label: inv.label,
            billingTitle: inv.billing_title,
            amount: Number(inv.amount),
            currency: inv.currency,
            issuedDate: inv.created_at,
            dueDate: inv.due_date,
            paidDate: inv.paid_date,
            paymentMethod: inv.payment_method,
            notes: inv.notes,
          }
          const billedTo: InvoiceBilledTo = {
            company: inv.company_name || inv.client_name || 'Client',
            contactName: inv.client_name,
          }

          return (
            <>
              {/* Balance due hero — shown when there is an outstanding balance */}
              {balanceDue > 0 && (
                <div style={styles.heroCard}>
                  <div style={styles.heroRow}>
                    <span style={styles.heroLabel}>Balance due</span>
                    {overdueDays !== null && (
                      <span style={styles.overdueChip}>
                        {overdueDays} day{overdueDays !== 1 ? 's' : ''} overdue
                      </span>
                    )}
                  </div>
                  <div style={styles.heroAmount}>
                    {fmtCurrency(balanceDue, inv.currency)}
                  </div>
                  {inv.due_date && (
                    <div style={styles.heroDue}>Due {formatDocumentDate(inv.due_date)}</div>
                  )}
                  {amountPaid > 0 && (
                    <div style={styles.heroMeta}>
                      {fmtCurrency(amountPaid, inv.currency)} already paid
                    </div>
                  )}
                </div>
              )}

              {/* Full invoice document (read-only) */}
              <div style={styles.docCard}>
                <InvoiceDocument
                  invoice={invoiceDoc}
                  billedTo={billedTo}
                  lines={lines.length > 0 ? lines : undefined}
                  payments={payments.length > 0 ? payments : undefined}
                  readOnly
                />
              </div>

              {/* Payment CTA — pay button when balance_due > 0, paid state otherwise */}
              {balanceDue > 0 ? (
                <div style={styles.ctaCard}>
                  {paymentState === 'success' ? (
                    <>
                      <div style={styles.successIcon}>&#10003;</div>
                      <div style={styles.successTitle}>Payment received. Thank you!</div>
                      <p style={styles.ctaText}>
                        {fmtCurrency(paidAmount, inv.currency)} has been recorded. Your invoice
                        will update shortly.
                      </p>
                    </>
                  ) : paymentState === 'error' ? (
                    <>
                      <p style={styles.errorInline}>{paymentError}</p>
                      <button
                        type="button"
                        style={styles.ctaBtn}
                        onClick={() => {
                          setPaymentState('idle')
                          setPaymentError(null)
                        }}
                      >
                        Try again
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={styles.trustBadge}>
                        <div style={styles.trustSecured}>
                          <Shield size={14} color={tokens.primary} strokeWidth={2.5} />
                          <span style={styles.trustText}>Secured by Razorpay</span>
                        </div>
                        <div style={styles.trustMethods}>
                          <span style={styles.trustPill}>
                            <Smartphone size={11} color={t.text.muted} />
                            <span>UPI</span>
                          </span>
                          <span style={styles.trustPill}>
                            <CreditCard size={11} color={t.text.muted} />
                            <span>Cards</span>
                          </span>
                          <span style={styles.trustPill}>
                            <Building2 size={11} color={t.text.muted} />
                            <span>Net Banking</span>
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        style={{
                          ...styles.ctaBtn,
                          opacity: paymentState !== 'idle' ? 0.6 : 1,
                          cursor: paymentState !== 'idle' ? 'not-allowed' : 'pointer',
                        }}
                        disabled={paymentState !== 'idle'}
                        onClick={() =>
                          void handlePayNow(inv.id, balanceDue, inv.currency, inv.client_name)
                        }
                      >
                        {paymentState === 'creating'
                          ? 'Preparing payment...'
                          : paymentState === 'opening'
                          ? 'Opening checkout...'
                          : paymentState === 'verifying'
                          ? 'Confirming payment...'
                          : `Pay ${fmtCurrency(balanceDue, inv.currency)} now`}
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div style={styles.ctaCard}>
                  <div style={styles.paidBadge}>Invoice fully paid</div>
                  <p style={styles.ctaText}>
                    Thank you for your payment. Sign in to track your project.
                  </p>
                  <a
                    href={`/portal/login?return=${encodeURIComponent('/portal/invoices')}`}
                    style={styles.ctaLink}
                  >
                    Sign in to the client portal
                  </a>
                </div>
              )}
            </>
          )
        })()}
      </main>

      <footer style={styles.footer}>
        eswarcreatives.in &middot; hello@eswarcreatives.in
      </footer>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: tokens.bg,
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    background: tokens.surface,
    borderBottom: `1px solid ${t.border.overlayStrong}`,
    height: 56,
    flexShrink: 0,
  },
  topInner: {
    maxWidth: 640,
    margin: '0 auto',
    height: '100%',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  topName: {
    fontFamily: fonts.heading,
    fontStyle: 'italic',
    fontSize: 16,
    fontWeight: 700,
    color: t.text.primary,
  },
  main: {
    flex: 1,
    maxWidth: 640,
    width: '100%',
    margin: '0 auto',
    padding: '32px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    boxSizing: 'border-box',
  },
  muted: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.muted,
    margin: 0,
  },
  errorCard: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    padding: 32,
    textAlign: 'center',
  },
  errorTitle: {
    fontFamily: fonts.heading,
    fontSize: 20,
    fontWeight: 700,
    color: t.text.primary,
    marginBottom: 12,
  },
  errorBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: t.text.secondary,
    margin: '0 0 16px',
    lineHeight: 1.6,
  },
  emailLink: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primaryBrand,
    textDecoration: 'none',
    fontWeight: 500,
  },
  // Hero balance-due card.
  heroCard: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    padding: '24px 28px',
  },
  heroRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  heroLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: t.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overdueChip: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    background: tokens.rubyLight,
    color: tokens.ruby,
    borderRadius: 999,
    padding: '2px 10px',
  },
  heroAmount: {
    fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 36,
    fontWeight: 700,
    color: t.text.primary,
    lineHeight: 1.1,
  },
  heroDue: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.secondary,
    marginTop: 6,
  },
  heroMeta: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.tertiary,
    marginTop: 4,
  },
  // Wraps InvoiceDocument with card chrome.
  docCard: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    overflow: 'hidden',
  },
  // CTA block below the invoice.
  ctaCard: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    padding: '24px 28px',
    textAlign: 'center',
  },
  ctaText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.secondary,
    margin: '0 0 16px',
    lineHeight: 1.6,
  },
  ctaBtn: {
    display: 'inline-block',
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: 600,
    borderRadius: 8,
    padding: '12px 24px',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
  },
  ctaLink: {
    display: 'inline-block',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    color: t.text.primaryBrand,
    textDecoration: 'none',
  },
  // Payment success state.
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: tokens.tealLight,
    color: tokens.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 22,
    fontWeight: 700,
    margin: '0 auto 16px',
  },
  successTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 700,
    color: t.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  // Inline error (Nielsen H9: plain language + next step).
  errorInline: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: tokens.ruby,
    margin: '0 0 16px',
    lineHeight: 1.6,
  },
  // Trust badge row (Razorpay + payment methods).
  trustBadge: {
    background: tokens.bg,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap' as const,
    marginBottom: 12,
  },
  trustSecured: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  trustText: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.secondary,
  },
  trustMethods: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  trustPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontFamily: fonts.body,
    fontSize: 11,
    color: t.text.muted,
    background: tokens.surface,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 999,
    padding: '3px 8px',
    whiteSpace: 'nowrap' as const,
  },
  // Paid badge.
  paidBadge: {
    display: 'inline-block',
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 700,
    background: tokens.tealLight,
    color: tokens.primary,
    borderRadius: 999,
    padding: '4px 14px',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  footer: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
    padding: '20px 24px',
    borderTop: `1px solid ${t.border.subtle}`,
  },
}
