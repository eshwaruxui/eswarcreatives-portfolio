// Client invoices at /portal/invoices. Desktop: table layout. Mobile: card list
// with status and balance due prominent. Opening an invoice on mobile shows a
// full-screen overlay; on desktop a right-side slide-in panel.
// Theme tokens only; no raw hex; no em dashes; plain-language errors only.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router'
import { Download, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { type PortalProfile } from '../PortalGuard'
import { CLIENT_NAV_HEIGHT } from './ClientNav'
import { tokens, t, fonts, motionTokens } from '../theme'
import { formatMoney, formatDate, mono } from '../admin/ui'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { InvoiceDocument, invoiceStatusPill, type InvoiceLine, type InvoicePaymentRow } from '../components/shared/InvoiceDocument'

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
  // Client-computed after fetching invoice_payments; not in the DB row.
  _amountPaid?: number
}

const LOAD_ERROR = 'We could not load your invoices. Please contact eswar@eswarcreatives.in'

type BilledTo = { company: string; contactName: string | null; city: string | null }

// Stored numbers are EC-I-YYYY-NNN; show the cleaner EC-YYYY-NNN (matches admin).
function displayInvoiceNumber(stored: string): string {
  return stored.replace(/^EC-I-/, 'EC-')
}

export function ClientInvoicesPage() {
  const profile = useOutletContext<PortalProfile>()
  return <Invoices profile={profile} />
}

function Invoices({ profile }: { profile: PortalProfile }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [billedTo, setBilledTo] = useState<BilledTo>({ company: '', contactName: null, city: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<Invoice | null>(null)
  const { isMobile } = useBreakpoint()

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
        const rows = (data ?? []) as Invoice[]

        // Batch-fetch payments for partially_paid invoices to show balance due.
        const partialIds = rows.filter((r) => r.status === 'partially_paid').map((r) => r.id)
        if (partialIds.length > 0) {
          const { data: pmtData } = await supabase
            .from('invoice_payments')
            .select('invoice_id, amount')
            .in('invoice_id', partialIds)
          const paidByInvoice: Record<string, number> = {}
          for (const p of pmtData ?? []) {
            paidByInvoice[p.invoice_id as string] = (paidByInvoice[p.invoice_id as string] ?? 0) + Number(p.amount)
          }
          for (const r of rows) {
            if (r.status === 'partially_paid') r._amountPaid = paidByInvoice[r.id] ?? 0
          }
        }

        if (!cancelled) setInvoices(rows)
      } catch {
        if (!cancelled) setError(LOAD_ERROR) // H9: plain-language error.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [profile.id])

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes ecShimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        .ec-shimmer{background:linear-gradient(90deg,${t.background.subtle} 25%,${t.background.muted} 50%,${t.background.subtle} 75%);background-size:200% 100%;animation:ecShimmer 1.5s linear infinite;border-radius:6px}
      `}</style>
      <main style={{ ...styles.container, padding: `${CLIENT_NAV_HEIGHT + 40}px ${isMobile ? 16 : 24}px 80px` }}>
        <h1 style={styles.title}>Invoices</h1>

        {error && <div style={styles.error}>{error}</div>}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div className="ec-shimmer" style={{ height: 13, width: 110 }} />
                  <div className="ec-shimmer" style={{ height: 22, width: 72, borderRadius: 999 }} />
                </div>
                <div className="ec-shimmer" style={{ height: 22, width: 130, margin: '8px 0' }} />
                <div className="ec-shimmer" style={{ height: 13, width: 90 }} />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && invoices.length === 0 && (
          <div style={styles.empty}>
            <p style={styles.emptyText}>Your invoices will appear here.</p>
          </div>
        )}

        {/* Desktop: table. Mobile: card list. */}
        {!loading && !error && invoices.length > 0 && (
          isMobile
            ? <InvoiceCardList invoices={invoices} onOpen={setOpen} />
            : <InvoiceTable invoices={invoices} openId={open?.id ?? null} onOpen={setOpen} />
        )}
      </main>

      {open && (
        <InvoicePanel
          invoice={open}
          billedTo={{ ...billedTo, email: profile.email }}
          isMobile={isMobile}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

// Mobile card list -- each card shows status + amount prominently.
function InvoiceCardList({ invoices, onOpen }: { invoices: Invoice[]; onOpen: (inv: Invoice) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {invoices.map((inv) => {
        const s = invoiceStatusPill(inv.status, inv.due_date)
        const isPartial = inv.status === 'partially_paid'
        const balanceDue = isPartial && inv._amountPaid !== undefined
          ? Math.max(0, Number(inv.amount) - inv._amountPaid)
          : null
        return (
          <button
            key={inv.id}
            type="button"
            style={styles.mobileCard}
            onClick={() => onOpen(inv)}
          >
            {/* Top row: invoice number + status badge */}
            <div style={styles.mobileCardTop}>
              <span style={{ fontFamily: mono, fontSize: 13, color: t.text.secondary }}>
                {displayInvoiceNumber(inv.invoice_number)}
              </span>
              <span style={{ ...styles.badge, background: s.bg, color: s.fg }}>{s.label}</span>
            </div>

            {/* Label if present */}
            {inv.label && (
              <div style={{ fontSize: 14, color: t.text.primary, fontWeight: 600, marginTop: 4 }}>
                {inv.label}
              </div>
            )}

            {/* Amount -- large and prominent */}
            <div style={{ fontFamily: mono, fontSize: 22, fontWeight: 700, color: t.text.primary, marginTop: 8 }}>
              {formatMoney(Number(inv.amount), inv.currency)}
            </div>

            {/* Balance due (partial payments) -- highlighted */}
            {isPartial && balanceDue !== null && (
              <div style={styles.mobileBalanceDue}>
                <span style={{ fontSize: 12, color: t.text.muted }}>Balance due:</span>
                <span style={{ fontFamily: mono, fontWeight: 700, color: tokens.ruby, fontSize: 15 }}>
                  {formatMoney(balanceDue, inv.currency)}
                </span>
              </div>
            )}

            {/* Due date */}
            {inv.due_date && (
              <div style={{ fontSize: 13, color: t.text.tertiary, marginTop: 6 }}>
                Due {formatDate(inv.due_date)}
              </div>
            )}

            <div style={styles.mobileCardCta}>View invoice &rsaquo;</div>
          </button>
        )
      })}
    </div>
  )
}

// Desktop table -- unchanged from original.
function InvoiceTable({ invoices, openId, onOpen }: { invoices: Invoice[]; openId: string | null; onOpen: (inv: Invoice) => void }) {
  return (
    <div style={styles.tableWrap}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Invoice #</th>
            <th style={styles.th}>Label</th>
            <th style={styles.th}>Amount</th>
            <th style={styles.th}>Balance due</th>
            <th style={styles.th}>Due Date</th>
            <th style={styles.th}>Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => {
            const s = invoiceStatusPill(inv.status, inv.due_date)
            const isPartial = inv.status === 'partially_paid'
            const balanceDue = isPartial && inv._amountPaid !== undefined
              ? Math.max(0, Number(inv.amount) - inv._amountPaid)
              : null
            return (
              <tr
                key={inv.id}
                style={{ ...styles.row, ...(openId === inv.id ? styles.rowActive : null) }}
                onClick={() => onOpen(inv)}
              >
                <td style={{ ...styles.td, fontFamily: mono, fontSize: 12 }}>
                  {displayInvoiceNumber(inv.invoice_number)}
                </td>
                <td style={styles.td}>{inv.label || '-'}</td>
                <td style={{ ...styles.td, fontFamily: mono, color: t.text.primary }}>
                  {formatMoney(Number(inv.amount), inv.currency)}
                </td>
                <td style={styles.td}>
                  {isPartial && balanceDue !== null ? (
                    <div style={styles.balanceDueCell}>
                      <span style={{ ...styles.balanceDueAmt, fontFamily: mono }}>
                        {formatMoney(balanceDue, inv.currency)}
                      </span>
                      <span style={styles.viewHistory}>View payment history</span>
                    </div>
                  ) : inv.status === 'paid' ? (
                    <span style={{ fontFamily: mono, color: tokens.green }}>
                      {formatMoney(0, inv.currency)}
                    </span>
                  ) : (
                    <span style={{ fontFamily: mono, color: t.text.muted }}>-</span>
                  )}
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
  )
}

// Clones the invoice element to the body root so it escapes the
// position:fixed panel ancestor that causes per-page repetition in print.
function handleDownloadPDF() {
  const el = document.querySelector<HTMLElement>('.ec-invoice-document')
  if (!el) { window.print(); return }
  document.getElementById('ec-print-root')?.remove()
  const printRoot = document.createElement('div')
  printRoot.id = 'ec-print-root'
  printRoot.appendChild(el.cloneNode(true))
  document.body.appendChild(printRoot)
  document.body.setAttribute('data-ec-printing', 'true')
  const cleanup = () => {
    document.body.removeAttribute('data-ec-printing')
    document.getElementById('ec-print-root')?.remove()
  }
  window.addEventListener('afterprint', cleanup, { once: true })
  window.print()
}

const PANEL_MS = parseInt(motionTokens.durationBase, 10)

function InvoicePanel({
  invoice,
  billedTo,
  isMobile,
  onClose,
}: {
  invoice: Invoice
  billedTo: BilledTo & { email: string | null }
  isMobile: boolean
  onClose: () => void
}) {
  const [shown, setShown] = useState(false)
  const [lines, setLines] = useState<InvoiceLine[]>([])
  const [payments, setPayments] = useState<InvoicePaymentRow[]>([])
  const closingRef = useRef(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Animate out before unmounting so entry and exit are mirrored (H4).
  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setShown(false)
    window.setTimeout(onClose, PANEL_MS)
  }, [onClose])

  // Itemised breakdown (read-own RLS on 0062).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('invoice_line_items')
        .select('label, amount, sort_order')
        .eq('invoice_id', invoice.id)
        .order('sort_order', { ascending: true })
      if (cancelled || !data) return
      setLines(data.map((r) => ({ label: r.label as string, amount: Number(r.amount) })))
    })()
    return () => { cancelled = true }
  }, [invoice.id])

  // Payment history (read-own RLS on 0065).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('invoice_payments')
        .select('paid_on, method, amount, reference_note')
        .eq('invoice_id', invoice.id)
        .order('paid_on', { ascending: true })
      if (cancelled || !data) return
      setPayments(
        data.map((r) => ({
          paid_on: r.paid_on as string,
          method: r.method as string | null,
          amount: Number(r.amount),
          reference_note: r.reference_note as string | null,
        }))
      )
    })()
    return () => { cancelled = true }
  }, [invoice.id])

  const content = (
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
      lines={lines}
      payments={payments.length > 0 ? payments : undefined}
    />
  )

  if (isMobile) {
    // Full-screen overlay: slides up from bottom on entry, back down on exit.
    // Backdrop fades in/out simultaneously with the panel (H4 mirrored motion).
    return (
      <>
        <div
          style={{
            ...styles.backdrop,
            opacity: shown ? 1 : 0,
            transition: `opacity ${motionTokens.durationBase} ${motionTokens.easeDefault}`,
          }}
          onClick={requestClose}
        />
        <div
          style={{
            ...styles.fullscreenOverlay,
            transform: shown ? 'translateY(0)' : 'translateY(100%)',
          }}
          role="dialog"
          aria-label={`Invoice ${displayInvoiceNumber(invoice.invoice_number)}`}
        >
          <div style={styles.fullscreenHeader}>
            <span style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: t.text.primary }}>
              Invoice {displayInvoiceNumber(invoice.invoice_number)}
            </span>
            <button type="button" style={styles.fullscreenClose} onClick={requestClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <div style={styles.fullscreenBody}>
            {content}
            <div style={styles.downloadWrap}>
              <button type="button" style={styles.downloadBtn} onClick={handleDownloadPDF}>
                <Download size={15} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Desktop: right slide-in panel (unchanged).
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
        {content}
        <div style={styles.downloadWrap}>
          <button type="button" style={styles.downloadBtn} onClick={handleDownloadPDF}>
            <Download size={15} />
            Download PDF
          </button>
        </div>
      </aside>
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: tokens.bg, color: t.text.primary, fontFamily: fonts.body },
  container: {
    maxWidth: 880,
    margin: '0 auto',
    // Padding overridden inline with responsive values (16px mobile / 24px desktop).
  },
  title: {
    margin: '0 0 24px',
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: t.text.primary,
  },

  // Mobile card styles.
  mobileCard: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: '16px 18px',
    cursor: 'pointer',
    fontFamily: fonts.body,
    // Min touch height via padding (actual rendered height will be ~100px+).
  },
  mobileCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  mobileBalanceDue: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    background: tokens.rubyLight,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '6px 10px',
  },
  mobileCardCta: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: 600,
    color: tokens.accent,
    fontFamily: fonts.body,
  },

  // Desktop table styles.
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
    color: t.text.tertiary,
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
    color: t.text.secondary,
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
  balanceDueCell: { display: 'flex', flexDirection: 'column' as const, gap: 2 },
  balanceDueAmt: { fontSize: 14, fontWeight: 700, color: tokens.ruby },
  viewHistory: { fontSize: 11, color: tokens.accent, fontFamily: fonts.body, fontWeight: 600, cursor: 'pointer' },
  empty: {
    background: tokens.surface,
    border: `1px dashed ${tokens.border}`,
    borderRadius: 12,
    padding: 40,
    textAlign: 'center',
  },
  emptyText: { margin: 0, fontSize: 15, color: t.text.secondary },
  muted: { color: t.text.secondary, fontSize: 14 },
  error: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 13,
    border: `1px solid ${tokens.ruby}`,
    marginBottom: 16,
  },

  // Shared backdrop.
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(10, 26, 27, 0.4)', zIndex: 200 },

  // Desktop slide-in panel.
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
    color: t.text.muted,
    cursor: 'pointer',
    padding: 6,
    display: 'flex',
    zIndex: 1,
  },

  // Mobile full-screen overlay (slides up from bottom).
  fullscreenOverlay: {
    position: 'fixed',
    inset: 0,
    background: tokens.surface,
    zIndex: 201,
    display: 'flex',
    flexDirection: 'column',
    transition: `transform ${motionTokens.durationBase} ${motionTokens.easeDefault}`,
  },
  fullscreenHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    height: 56,
    flexShrink: 0,
    borderBottom: `1px solid ${tokens.border}`,
  },
  fullscreenClose: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    background: 'transparent',
    border: 'none',
    color: t.text.secondary,
    cursor: 'pointer',
    borderRadius: 8,
    padding: 0,
  },
  fullscreenBody: {
    flex: 1,
    overflowY: 'auto',
  },
  downloadWrap: {
    padding: '0 32px 28px',
  },
  downloadBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    minHeight: 44,
    padding: '10px 18px',
    background: 'transparent',
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
