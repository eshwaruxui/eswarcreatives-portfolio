// Shared formal-invoice document, rendered identically in the admin invoice
// preview drawer and the client invoice panel so both portals show the same
// invoice (one template, two surfaces). The caller supplies the slide-in chrome
// (drawer / panel + close button); this component owns the document body only.
// Theme tokens only; no raw hex; no em dashes.
import type { CSSProperties } from 'react'
import { tokens, t, fonts } from '../../theme'
import { mono, formatDate } from '../../admin/ui'

export type InvoiceDoc = {
  // Already display-formatted (e.g. EC-2026-001).
  number: string
  status: string
  label: string | null
  amount: number
  currency: string
  issuedDate: string | null
  dueDate: string | null
  paidDate?: string | null
  paymentMethod?: string | null
  notes: string | null
}

export type InvoiceBilledTo = {
  company: string
  contactName?: string | null
  email?: string | null
  city?: string | null
}

// Itemised breakdown (from invoice_line_items). When absent, the document falls
// back to a single line built from the invoice label + amount.
export type InvoiceLine = { label: string; amount: number }

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

// Indian-locale currency with paise, e.g. INR 1,09,740.00; USD uses US grouping.
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

// Single source of truth for the invoice status pill, shared by both portals.
// Pass dueDate so an unpaid invoice past its due date reads as Overdue even when
// the stored status is still 'pending'.
export function invoiceStatusPill(
  status: string,
  dueDate?: string | null
): { bg: string; fg: string; label: string } {
  if (status === 'paid') return { bg: tokens.greenLight, fg: tokens.green, label: 'Paid' }
  if (status === 'overdue' || (dueDate && dueDate < todayISO()))
    return { bg: tokens.rubyLight, fg: tokens.ruby, label: 'Overdue' }
  return { bg: tokens.goldLight, fg: tokens.goldDark, label: 'Pending' }
}

export function InvoiceDocument({
  invoice,
  billedTo,
  lines,
}: {
  invoice: InvoiceDoc
  billedTo: InvoiceBilledTo
  lines?: InvoiceLine[]
}) {
  const pill = invoiceStatusPill(invoice.status, invoice.dueDate)
  // Itemised lines when present, otherwise a single line from label + amount.
  const items: InvoiceLine[] =
    lines && lines.length > 0
      ? lines
      : [{ label: invoice.label || 'Professional services', amount: Number(invoice.amount) }]
  const total = items.reduce((sum, l) => sum + Number(l.amount), 0)

  return (
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
          <div style={styles.invoiceNum}>{invoice.number}</div>
          <span style={{ ...styles.pill, background: pill.bg, color: pill.fg }}>{pill.label}</span>
        </div>
      </header>

      <div style={styles.twoCol}>
        <section>
          <div style={styles.sectionLabel}>Billed to</div>
          <div style={styles.billCompany}>{billedTo.company}</div>
          {billedTo.contactName && <div style={styles.billLine}>{billedTo.contactName}</div>}
          {billedTo.email && <div style={styles.billLine}>{billedTo.email}</div>}
          {billedTo.city && <div style={styles.billLine}>{billedTo.city}</div>}
        </section>
        <section style={styles.detailsCol}>
          <div style={styles.sectionLabel}>Details</div>
          <DetailLine k="Issued" v={formatDate(invoice.issuedDate)} />
          <DetailLine k="Due" v={formatDate(invoice.dueDate)} />
          {invoice.paidDate && <DetailLine k="Paid" v={formatDate(invoice.paidDate)} />}
          {invoice.paymentMethod && <DetailLine k="Method" v={invoice.paymentMethod} />}
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
          {items.map((line, i) => (
            <tr key={i}>
              <td style={styles.tdLeft}>{line.label || 'Professional services'}</td>
              <td style={styles.tdNum}>1</td>
              <td style={styles.tdNum}>{formatAmount(Number(line.amount), invoice.currency)}</td>
              <td style={styles.tdNum}>{formatAmount(Number(line.amount), invoice.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={styles.totals}>
        <div style={styles.subRow}>
          <span style={styles.subLabel}>Subtotal</span>
          <span style={styles.subNum}>{formatAmount(total, invoice.currency)}</span>
        </div>
        <div style={styles.totalBand}>
          <span style={styles.totalLabel}>Total due</span>
          <span style={styles.totalNum}>{formatAmount(total, invoice.currency)}</span>
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
  body: { padding: 32 },
  topRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 },
  brand: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 6,
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.heading,
    fontWeight: 700,
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  studio: { fontFamily: fonts.heading, fontSize: 16, fontWeight: 700, color: t.text.primary },
  studioSub: { fontFamily: fonts.body, fontSize: 12, color: t.text.tertiary, marginTop: 1 },
  studioEmail: { fontFamily: fonts.body, fontSize: 12, color: t.text.tertiary },
  invoiceMeta: { textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' },
  invoiceWord: { fontFamily: fonts.heading, fontSize: 28, fontWeight: 700, color: tokens.primary, lineHeight: 1 },
  invoiceNum: { fontFamily: mono, fontSize: 13, color: t.text.tertiary },
  pill: {
    display: 'inline-block',
    padding: '3px 12px',
    borderRadius: 999,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
  },
  twoCol: { display: 'flex', justifyContent: 'space-between', gap: 24, marginTop: 28 },
  detailsCol: { minWidth: 180 },
  sectionLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: t.text.tertiary,
    marginBottom: 8,
  },
  billCompany: { fontFamily: fonts.body, fontSize: 15, fontWeight: 700, color: t.text.primary },
  billLine: { fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary, marginTop: 2 },
  detailRow: { display: 'flex', justifyContent: 'space-between', gap: 16, padding: '3px 0' },
  detailKey: { fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary },
  detailVal: { fontFamily: mono, fontSize: 13, color: t.text.primary },
  rule: { height: 2, background: tokens.primary, margin: '24px 0' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thLeft: {
    textAlign: 'left',
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: t.text.tertiary,
    padding: '0 0 8px',
  },
  thRight: {
    textAlign: 'right',
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: t.text.tertiary,
    padding: '0 0 8px',
  },
  tdLeft: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    padding: '10px 0',
    borderTop: `1px solid ${t.border.default}`,
  },
  tdNum: {
    fontFamily: mono,
    fontSize: 13,
    color: t.text.primary,
    textAlign: 'right',
    padding: '10px 0',
    borderTop: `1px solid ${t.border.default}`,
    whiteSpace: 'nowrap',
  },
  totals: { marginTop: 16 },
  subRow: { display: 'flex', justifyContent: 'space-between', padding: '6px 2px' },
  subLabel: { fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary },
  subNum: { fontFamily: mono, fontSize: 13, color: t.text.primary },
  totalBand: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: tokens.primary,
    borderRadius: 8,
    padding: '12px 14px',
    marginTop: 8,
  },
  totalLabel: { fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: t.text.onPrimary },
  totalNum: { fontFamily: mono, fontSize: 18, fontWeight: 700, color: t.text.onPrimary },
  notes: { marginTop: 20, background: tokens.bg, borderRadius: 8, padding: 14 },
  notesLabel: { fontFamily: fonts.body, fontSize: 12, fontWeight: 700, color: t.text.primary, marginBottom: 4 },
  notesBody: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary, margin: 0, lineHeight: 1.5 },
  footer: { marginTop: 28, textAlign: 'center', fontFamily: mono, fontSize: 12, color: t.text.tertiary },
}
