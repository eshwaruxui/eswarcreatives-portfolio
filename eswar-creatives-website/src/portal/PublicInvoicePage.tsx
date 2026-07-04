// Public invoice view — accessible without authentication.
// Reached via /invoice/:token; the token is a uuid generated server-side and
// stored on the invoices row. Fetched via the get_invoice_by_token RPC
// (SECURITY DEFINER, anon-callable) which enforces token + expiry server-side.
// Theme tokens only; no raw hex; no em dashes.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { supabase } from '../lib/supabase'
import {
  InvoiceDocument,
  type InvoiceDoc,
  type InvoiceBilledTo,
  type InvoiceLine,
  type InvoicePaymentRow,
} from './components/shared/InvoiceDocument'
import { tokens, t, fonts } from './theme'
import eswarLogo from '../imports/eswar-logo.svg'
import type { CSSProperties } from 'react'

// Shape of the JSONB returned by get_invoice_by_token.
type TokenPayload = {
  invoice: {
    id: string
    invoice_number: string
    client_name: string | null
    company_name: string | null
    label: string | null
    amount: number
    currency: string
    status: string
    due_date: string | null
    paid_date: string | null
    payment_method: string | null
    notes: string | null
    created_at: string
  }
  line_items: Array<{ label: string; amount: number; sort_order: number }>
  payments: Array<{
    paid_on: string
    method: string | null
    amount: number
    reference_note: string | null
  }>
}

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

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function PublicInvoicePage() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [payload, setPayload] = useState<TokenPayload | null>(null)
  const [expired, setExpired] = useState(false)

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
  }, [token])

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
                    <div style={styles.heroDue}>Due {fmtDate(inv.due_date)}</div>
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

              {/* CTA */}
              <div style={styles.ctaCard}>
                <p style={styles.ctaText}>
                  Sign in to the client portal to manage your invoices and track project progress.
                </p>
                <a
                  href={`/portal/login?return=${encodeURIComponent('/portal/invoices')}`}
                  style={styles.ctaBtn}
                >
                  Pay now / Sign in to take action
                </a>
              </div>
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
    textDecoration: 'none',
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
