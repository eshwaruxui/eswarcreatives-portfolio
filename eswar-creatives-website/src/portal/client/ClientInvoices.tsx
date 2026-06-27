// Client invoices at /portal/invoices. A table of the client's invoices; each
// row opens a right-side slide-in panel with the payment detail. Badge logic is
// simplified for the client to paid / unpaid / overdue.
// Theme tokens only; no raw hex; no em dashes; plain-language errors only.
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { PortalGuard, type PortalProfile } from '../PortalGuard'
import { ClientNav, CLIENT_NAV_HEIGHT } from './ClientNav'
import { tokens, fonts } from '../theme'
import { formatMoney, formatDate, mono } from '../admin/ui'
import { InvoiceDocument, invoiceStatusPill } from '../components/shared/InvoiceDocument'

type Invoice = {
  id: string
  invoice_number: string
  label: string | null
  amount: number
  currency: string
  status: string
  due_date: string | null
  pct_of_total: number | null
  paid_date: string | null
  payment_method: string | null
  notes: string | null
  created_at: string
}

const LOAD_ERROR = 'We could not load your invoices. Please contact eswar@eswarcreatives.in'

type BilledTo = { company: string; contactName: string | null; city: string | null }

// Stored numbers are EC-I-YYYY-NNN; show the cleaner EC-YYYY-NNN (matches admin).
function displayInvoiceNumber(stored: string): string {
  return stored.replace(/^EC-I-/, 'EC-')
}

export function ClientInvoicesPage() {
  return (
    <PortalGuard requireRole="client">
      {(profile) => <Invoices profile={profile} />}
    </PortalGuard>
  )
}

function Invoices({ profile }: { profile: PortalProfile }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [billedTo, setBilledTo] = useState<BilledTo>({ company: '', contactName: null, city: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Invoice | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: client, error: cErr } = await supabase
          .from('clients')
          .select('id, company_name, contact_name, country')
          .eq('profile_id', profile.id)
          .maybeSingle()
        if (cErr) throw cErr
        if (!client) {
          if (!cancelled) setInvoices([])
          return
        }
        if (!cancelled) {
          setBilledTo({
            company: client.company_name || profile.full_name || 'Client',
            contactName: client.contact_name ?? null,
            city: (client as { country?: string }).country ?? null,
          })
        }
        const { data, error: iErr } = await supabase
          .from('invoices')
          .select(
            'id, invoice_number, label, amount, currency, status, due_date, pct_of_total, paid_date, payment_method, notes, created_at'
          )
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
        if (iErr) throw iErr
        if (!cancelled) setInvoices((data ?? []) as Invoice[])
      } catch {
        if (!cancelled) setError(LOAD_ERROR) // H9: plain-language error.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile.id])

  return (
    <div style={styles.page}>
      <ClientNav profile={profile} />
      <main style={styles.container}>
        <h1 style={styles.title}>Invoices</h1>

        {error && <div style={styles.error}>{error}</div>}
        {loading && <div style={styles.muted}>Loading your invoices...</div>}

        {!loading && !error && invoices.length === 0 && (
          <div style={styles.empty}>
            <p style={styles.emptyText}>Your invoices will appear here.</p>
          </div>
        )}

        {!loading && !error && invoices.length > 0 && (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Invoice #</th>
                  <th style={styles.th}>Label</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Due Date</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const s = invoiceStatusPill(inv.status, inv.due_date)
                  return (
                    // H6: each row is clearly actionable and opens its detail.
                    <tr
                      key={inv.id}
                      style={{ ...styles.row, ...(open?.id === inv.id ? styles.rowActive : null) }}
                      onClick={() => setOpen(inv)}
                    >
                      <td style={{ ...styles.td, fontFamily: mono, fontSize: 12 }}>
                        {displayInvoiceNumber(inv.invoice_number)}
                      </td>
                      <td style={styles.td}>{inv.label || '-'}</td>
                      <td style={{ ...styles.td, fontFamily: mono, color: tokens.text }}>
                        {formatMoney(Number(inv.amount), inv.currency)}
                      </td>
                      <td style={styles.td}>{formatDate(inv.due_date)}</td>
                      <td style={styles.td}>
                        <span style={{ ...styles.badge, background: s.bg, color: s.fg }}>{s.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {open && (
        <InvoicePanel
          invoice={open}
          billedTo={{ ...billedTo, email: profile.email }}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

function InvoicePanel({
  invoice,
  billedTo,
  onClose,
}: {
  invoice: Invoice
  billedTo: BilledTo & { email: string | null }
  onClose: () => void
}) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(t)
  }, [])

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <aside
        style={{ ...styles.panel, transform: shown ? 'translateX(0)' : 'translateX(100%)' }}
        role="dialog"
        aria-label={`Invoice ${displayInvoiceNumber(invoice.invoice_number)}`}
      >
        <button type="button" style={styles.close} onClick={onClose} aria-label="Close panel">
          <X size={18} />
        </button>

        {/* Same template as the admin invoice preview (one shared document). */}
        <InvoiceDocument
          invoice={{
            number: displayInvoiceNumber(invoice.invoice_number),
            status: invoice.status,
            label: invoice.label,
            amount: Number(invoice.amount),
            currency: invoice.currency,
            issuedDate: invoice.created_at,
            dueDate: invoice.due_date,
            paidDate: invoice.paid_date,
            paymentMethod: invoice.payment_method,
            notes: invoice.notes,
          }}
          billedTo={billedTo}
        />
      </aside>
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: tokens.bg, color: tokens.text, fontFamily: fonts.body },
  container: {
    maxWidth: 880,
    margin: '0 auto',
    padding: `${CLIENT_NAV_HEIGHT + 40}px 24px 80px`,
  },
  title: {
    margin: '0 0 24px',
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: tokens.text,
  },
  tableWrap: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontFamily: fonts.body },
  th: {
    textAlign: 'left',
    padding: '12px 20px',
    fontSize: 12,
    fontWeight: 600,
    color: tokens.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    borderBottom: `1px solid ${tokens.border}`,
    background: tokens.bg,
  },
  row: { cursor: 'pointer' },
  rowActive: { background: tokens.tealLight },
  td: {
    padding: '14px 20px',
    fontSize: 14,
    color: tokens.textMuted,
    borderBottom: `1px solid ${tokens.border}`,
    verticalAlign: 'middle',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  },
  empty: {
    background: tokens.surface,
    border: `1px dashed ${tokens.border}`,
    borderRadius: 12,
    padding: 40,
    textAlign: 'center',
  },
  emptyText: { margin: 0, fontSize: 15, color: tokens.textMuted },
  muted: { color: tokens.textMuted, fontSize: 14 },
  error: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 13,
    border: `1px solid ${tokens.ruby}`,
    marginBottom: 16,
  },

  // Slide-in panel (mirrors the admin InvoicePreview drawer pattern).
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(10, 26, 27, 0.4)', zIndex: 200 },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    height: '100vh',
    width: 480,
    maxWidth: '92vw',
    background: tokens.surface,
    borderLeft: `1px solid ${tokens.border}`,
    boxShadow: '0 12px 48px rgba(2, 76, 79, 0.18)',
    zIndex: 201,
    transition: 'transform 0.28s ease',
    overflowY: 'auto',
  },
  close: {
    position: 'absolute',
    top: 14,
    right: 14,
    background: tokens.bg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    color: tokens.textMuted,
    cursor: 'pointer',
    padding: 6,
    display: 'flex',
    zIndex: 1,
  },
}
