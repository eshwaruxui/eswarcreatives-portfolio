// Persistent invoice preview. On desktop it is a drawer sliding in from the
// right while the invoice list stays visible and scrollable on the left; below
// 768px it becomes a bottom sheet. Replaces the old popup InvoiceModal.
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, fonts } from '../theme'
import { mono, formatDate } from './ui'
import type { CSSProperties } from 'react'

export type PreviewInvoice = {
  id: string
  invoice_number: string
  client_name: string | null
  company_name: string | null
  label: string | null
  amount: number
  currency: string
  status: string
  due_date: string | null
  notes: string | null
  created_at: string
  client_id: string | null
}

// Indian-locale currency with paise, e.g. ₹1,09,740.00; USD uses 1,09,740 -> US grouping.
function formatAmount(amount: number, currency: string): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    const symbol = currency === 'INR' ? '₹' : '$'
    return `${symbol}${amount.toLocaleString(locale, { minimumFractionDigits: 2 })}`
  }
}

const STATUS_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  paid: { bg: tokens.greenLight, fg: tokens.green, label: 'Paid' },
  overdue: { bg: tokens.rubyLight, fg: tokens.ruby, label: 'Overdue' },
}
function statusPill(status: string) {
  return STATUS_PILL[status] ?? { bg: tokens.goldLight, fg: tokens.goldDark, label: 'Pending' }
}

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

export function InvoicePreview({
  invoice,
  numberLabel,
  onClose,
}: {
  invoice: PreviewInvoice
  // Display-formatted invoice number (see Change 6). Falls back to the raw value.
  numberLabel?: string
  onClose: () => void
}) {
  const narrow = useIsNarrow()
  const [shown, setShown] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [city, setCity] = useState<string | null>(null)

  // Trigger the slide-in transition once mounted.
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // Email + city are not on the invoice row; fetch them from the linked client.
  useEffect(() => {
    let cancelled = false
    setEmail(null)
    setCity(null)
    if (!invoice.client_id) return
    ;(async () => {
      const { data } = await supabase
        .from('clients')
        .select('country, profiles(email)')
        .eq('id', invoice.client_id)
        .maybeSingle()
      if (cancelled || !data) return
      const prof = data.profiles as { email?: string } | { email?: string }[] | null
      const e = Array.isArray(prof) ? prof[0]?.email : prof?.email
      setEmail(e ?? null)
      setCity((data as { country?: string }).country ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [invoice.client_id])

  const pill = statusPill(invoice.status)
  const number = numberLabel ?? invoice.invoice_number
  const company = invoice.company_name || invoice.client_name || 'Client'

  const panelStyle: CSSProperties = narrow
    ? {
        ...styles.panelBase,
        ...styles.sheet,
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
      }
    : {
        ...styles.panelBase,
        ...styles.drawer,
        transform: shown ? 'translateX(0)' : 'translateX(100%)',
      }

  return (
    <>
      {/* Backdrop only on the mobile bottom sheet; the desktop drawer leaves the
          list interactive. */}
      {narrow && <div style={styles.backdrop} onClick={onClose} />}
      <aside style={panelStyle} role="dialog" aria-label={`Invoice ${number}`}>
        <button type="button" style={styles.close} onClick={onClose} aria-label="Close preview">
          <X size={18} />
        </button>

        <div style={styles.body}>
          <header style={styles.topRow}>
            <div style={styles.brand}>
              <div style={styles.logo}>e</div>
              <div>
                <div style={styles.studio}>Eswar Creatives</div>
                <div style={styles.studioSub}>Design & website studio</div>
                <div style={styles.studioEmail}>hello@eswarcreatives.in</div>
              </div>
            </div>
            <div style={styles.invoiceMeta}>
              <div style={styles.invoiceWord}>Invoice</div>
              <div style={styles.invoiceNum}>{number}</div>
              <span style={{ ...styles.pill, background: pill.bg, color: pill.fg }}>{pill.label}</span>
            </div>
          </header>

          <div style={styles.twoCol}>
            <section>
              <div style={styles.sectionLabel}>Billed to</div>
              <div style={styles.billCompany}>{company}</div>
              {invoice.client_name && <div style={styles.billLine}>{invoice.client_name}</div>}
              {email && <div style={styles.billLine}>{email}</div>}
              {city && <div style={styles.billLine}>{city}</div>}
            </section>
            <section style={styles.detailsCol}>
              <div style={styles.sectionLabel}>Details</div>
              <DetailLine k="Issued" v={formatDate(invoice.created_at)} />
              <DetailLine k="Due" v={formatDate(invoice.due_date)} />
              <DetailLine k="Currency" v={invoice.currency} />
            </section>
          </div>

          <div style={styles.rule} />

          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.thLeft}>Description</th>
                <th style={styles.thRight}>Qty</th>
                <th style={styles.thRight}>Rate</th>
                <th style={styles.thRight}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.tdLeft}>{invoice.label || 'Professional services'}</td>
                <td style={styles.tdNum}>1</td>
                <td style={styles.tdNum}>{formatAmount(Number(invoice.amount), invoice.currency)}</td>
                <td style={styles.tdNum}>{formatAmount(Number(invoice.amount), invoice.currency)}</td>
              </tr>
            </tbody>
          </table>

          <div style={styles.totals}>
            <div style={styles.subRow}>
              <span style={styles.subLabel}>Subtotal</span>
              <span style={styles.subNum}>{formatAmount(Number(invoice.amount), invoice.currency)}</span>
            </div>
            <div style={styles.totalBand}>
              <span style={styles.totalLabel}>Total due</span>
              <span style={styles.totalNum}>{formatAmount(Number(invoice.amount), invoice.currency)}</span>
            </div>
          </div>

          {invoice.notes && (
            <div style={styles.notes}>
              <div style={styles.notesLabel}>Notes</div>
              <p style={styles.notesBody}>{invoice.notes}</p>
            </div>
          )}

          <footer style={styles.footer}>eswarcreatives.in · Thank you for your business</footer>
        </div>
      </aside>
    </>
  )
}

function DetailLine({ k, v }: { k: string; v: string }) {
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailKey}>{k}</span>
      <span style={styles.detailVal}>{v}</span>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 26, 27, 0.4)',
    zIndex: 200,
  },
  panelBase: {
    position: 'fixed',
    background: tokens.surface,
    zIndex: 201,
    boxShadow: '0 12px 48px rgba(2, 76, 79, 0.18)',
    transition: 'transform 0.28s ease',
    overflowY: 'auto',
  },
  drawer: {
    top: 0,
    right: 0,
    height: '100vh',
    width: 480,
    maxWidth: '92vw',
    borderLeft: `1px solid ${tokens.border}`,
  },
  sheet: {
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88vh',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
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
  body: { padding: 32 },
  topRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  brand: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    background: tokens.primary,
    color: '#fff',
    fontFamily: fonts.heading,
    fontWeight: 700,
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  studio: { fontFamily: fonts.heading, fontSize: 16, fontWeight: 700, color: tokens.text },
  studioSub: { fontFamily: fonts.body, fontSize: 12, color: tokens.textMuted, marginTop: 1 },
  studioEmail: { fontFamily: fonts.body, fontSize: 12, color: tokens.textMuted },
  invoiceMeta: { textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' },
  invoiceWord: { fontFamily: fonts.heading, fontSize: 28, fontWeight: 700, color: tokens.primary, lineHeight: 1 },
  invoiceNum: { fontFamily: mono, fontSize: 13, color: tokens.textMuted },
  pill: {
    display: 'inline-block',
    padding: '3px 12px',
    borderRadius: 999,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
  },
  twoCol: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 24,
    marginTop: 28,
  },
  detailsCol: { minWidth: 180 },
  sectionLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: tokens.textMuted,
    marginBottom: 8,
  },
  billCompany: { fontFamily: fonts.body, fontSize: 15, fontWeight: 700, color: tokens.text },
  billLine: { fontFamily: fonts.body, fontSize: 13, color: tokens.textMuted, marginTop: 2 },
  detailRow: { display: 'flex', justifyContent: 'space-between', gap: 16, padding: '3px 0' },
  detailKey: { fontFamily: fonts.body, fontSize: 13, color: tokens.textMuted },
  detailVal: { fontFamily: mono, fontSize: 13, color: tokens.text },
  rule: { height: 2, background: tokens.primary, margin: '24px 0' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thLeft: {
    textAlign: 'left',
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: tokens.textMuted,
    padding: '0 0 8px',
  },
  thRight: {
    textAlign: 'right',
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: tokens.textMuted,
    padding: '0 0 8px',
  },
  tdLeft: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: tokens.text,
    padding: '10px 0',
    borderTop: `1px solid ${tokens.border}`,
  },
  tdNum: {
    fontFamily: mono,
    fontSize: 13,
    color: tokens.text,
    textAlign: 'right',
    padding: '10px 0',
    borderTop: `1px solid ${tokens.border}`,
    whiteSpace: 'nowrap',
  },
  totals: { marginTop: 16 },
  subRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 2px' },
  subLabel: { fontFamily: fonts.body, fontSize: 13, color: tokens.textMuted },
  subNum: { fontFamily: mono, fontSize: 13, color: tokens.text },
  totalBand: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: tokens.primary,
    borderRadius: 8,
    padding: '12px 14px',
    marginTop: 8,
  },
  totalLabel: { fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: '#fff' },
  totalNum: { fontFamily: mono, fontSize: 18, fontWeight: 700, color: '#fff' },
  notes: { marginTop: 20, background: tokens.bg, borderRadius: 8, padding: 14 },
  notesLabel: { fontFamily: fonts.body, fontSize: 12, fontWeight: 700, color: tokens.text, marginBottom: 4 },
  notesBody: { fontFamily: fonts.body, fontSize: 13, color: tokens.textMuted, margin: 0, lineHeight: 1.5 },
  footer: {
    marginTop: 28,
    textAlign: 'center',
    fontFamily: mono,
    fontSize: 12,
    color: tokens.textMuted,
  },
}
