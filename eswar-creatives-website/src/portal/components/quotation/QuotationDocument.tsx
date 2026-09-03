// Quotation Module Phase 1 — the branded, print-ready document (Step 4).
// Pure content only, no toolbar: callers (QuotationBuilder's preview step,
// PublicQuotationPage) own Print/PDF/mailto actions around this. Brand comes
// from documentThemes.ts (decision 6 — the tenant's *document* brand, kept
// separate from the shared portal-chrome TenantTheme), never hardcoded here,
// so the same component works for any future tenant.
//
// Copy is deliberately label/total-only — no marketing language, no em
// dashes, no exclamation marks, no rhetorical questions (Tone of Voice
// guide: quotation/invoice documents sit in the lowest-copy tier).
import type { CSSProperties } from 'react'
import { formatPortalDate } from '../../utils/formatDate'
import { getDocumentTheme } from './documentThemes'

export type QuotationDocumentData = {
  quotation_number: string
  created_at: string
  client_name: string
  client_phone: string
  client_email: string | null
  client_address: string | null
  event_type: string
  event_date: string | null
  venue: string | null
  guest_count: number | null
  discount_pct: number
  advance_pct: number
  validity_days: number
  gst_enabled: boolean
  subtotal: number
  discount_amount: number
  gst_amount: number
  total_amount: number
  advance_amount: number
}

export type QuotationDocumentItem = {
  category: string
  label: string
  unit: string | null
  qty: number
  rate: number
  amount: number
  note?: string | null
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function QuotationDocument({
  tenantId,
  quotation,
  items,
}: {
  tenantId: string
  quotation: QuotationDocumentData
  items: QuotationDocumentItem[]
}) {
  const b = getDocumentTheme(tenantId)
  const F = b.fontUI

  const categories: string[] = []
  for (const item of items) {
    if (!categories.includes(item.category)) categories.push(item.category)
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', background: 'white', borderRadius: 4 }}>
      {/* Header */}
      <div style={{ background: b.teal, padding: '36px 52px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: b.gold, fontSize: 20, fontFamily: b.fontDisplay, fontWeight: 700 }}>Newgen Event Studio</div>
          {b.tagline && (
            <div style={{ color: b.gold, fontSize: 13, fontFamily: b.fontDisplay, fontStyle: 'italic', marginTop: 4, opacity: 0.9 }}>
              {b.tagline}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: b.gold, fontSize: 20, fontFamily: b.fontDisplay, fontStyle: 'italic', marginBottom: 6 }}>Quotation</div>
          <div style={{ color: b.cream, fontFamily: F, fontSize: 13, fontWeight: 500 }}>{quotation.quotation_number}</div>
          <div style={{ color: b.cream, fontFamily: F, fontSize: 12, marginTop: 2, opacity: 0.75 }}>Date: {formatPortalDate(quotation.created_at)}</div>
          <div style={{ color: b.cream, fontFamily: F, fontSize: 12, opacity: 0.75 }}>Valid for {quotation.validity_days} days</div>
        </div>
      </div>

      {/* Client + Event */}
      <div style={{ padding: '32px 52px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, borderBottom: `1px solid ${b.gold}33` }}>
        <div>
          <div style={styles.sectionLabel(b, F)}>PREPARED FOR</div>
          <div style={styles.sectionValue(b, F)}>{quotation.client_name}</div>
          <div style={styles.detailBlock(F)}>
            {quotation.client_phone && <div>+91 {quotation.client_phone}</div>}
            {quotation.client_email && <div>{quotation.client_email}</div>}
            {quotation.client_address && <div>{quotation.client_address}</div>}
          </div>
        </div>
        <div>
          <div style={styles.sectionLabel(b, F)}>EVENT DETAILS</div>
          <div style={styles.sectionValue(b, F)}>{quotation.event_type}</div>
          <div style={styles.detailBlock(F)}>
            {quotation.event_date && <div>{formatPortalDate(quotation.event_date)}</div>}
            {quotation.venue && <div>{quotation.venue}</div>}
            {quotation.guest_count && <div>{quotation.guest_count} guests</div>}
          </div>
        </div>
      </div>

      {/* Scope of work */}
      <div style={{ padding: '32px 52px' }}>
        <div style={{ ...styles.sectionLabel(b, F), marginBottom: 16 }}>SCOPE OF WORK</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, padding: '8px 0', borderBottom: `2px solid ${b.teal}` }}>
          {['Item', 'Qty / Unit', 'Rate', 'Amount'].map((h) => (
            <div key={h} style={{ color: b.teal, fontFamily: F, fontSize: 11, letterSpacing: 1.5, fontWeight: 700 }}>{h}</div>
          ))}
        </div>
        {categories.map((cat) => {
          const catItems = items.filter((i) => i.category === cat)
          return (
            <div key={cat}>
              <div style={{ color: b.ochre, fontFamily: F, fontSize: 11, fontWeight: 700, padding: '14px 0 4px', borderBottom: `1px solid ${b.gold}22`, letterSpacing: 0.5 }}>
                {cat.toUpperCase()}
              </div>
              {catItems.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, padding: '10px 0', borderBottom: '1px solid #f4f0ea' }}>
                  <div>
                    <div style={{ color: '#1A1A1A', fontFamily: F, fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                    {item.note && <div style={{ color: '#999', fontFamily: F, fontSize: 11, marginTop: 2 }}>{item.note}</div>}
                  </div>
                  <div style={{ color: '#555', fontFamily: F, fontSize: 13 }}>{item.qty} {item.unit}</div>
                  <div style={{ color: '#555', fontFamily: F, fontSize: 13 }}>{formatCurrency(item.rate)}</div>
                  <div style={{ color: b.teal, fontFamily: F, fontSize: 13, fontWeight: 600 }}>{formatCurrency(item.amount)}</div>
                </div>
              ))}
            </div>
          )
        })}

        {/* Totals */}
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 300 }}>
            <div style={styles.totalsRow}>
              <span style={{ fontFamily: F, fontSize: 13, color: '#555' }}>Subtotal</span>
              <span style={{ fontFamily: F, fontSize: 13, color: '#1A1A1A', fontWeight: 500 }}>{formatCurrency(quotation.subtotal)}</span>
            </div>
            {quotation.discount_pct > 0 && (
              <div style={styles.totalsRow}>
                <span style={{ fontFamily: F, fontSize: 13, color: b.ruby }}>Discount ({quotation.discount_pct}%)</span>
                <span style={{ fontFamily: F, fontSize: 13, color: b.ruby, fontWeight: 500 }}>- {formatCurrency(quotation.discount_amount)}</span>
              </div>
            )}
            {quotation.gst_enabled && (
              <div style={styles.totalsRow}>
                <span style={{ fontFamily: F, fontSize: 13, color: '#555' }}>GST (18%)</span>
                <span style={{ fontFamily: F, fontSize: 13, color: '#1A1A1A', fontWeight: 500 }}>{formatCurrency(quotation.gst_amount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: `2px solid ${b.teal}` }}>
              <span style={{ fontFamily: F, fontSize: 16, color: b.teal, fontWeight: 700 }}>Total</span>
              <span style={{ fontFamily: F, fontSize: 16, color: b.teal, fontWeight: 700 }}>{formatCurrency(quotation.total_amount)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ fontFamily: F, fontSize: 12, color: b.ochre, fontWeight: 500 }}>Advance Required ({quotation.advance_pct}%)</span>
              <span style={{ fontFamily: F, fontSize: 12, color: b.ochre, fontWeight: 700 }}>{formatCurrency(quotation.advance_amount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terms */}
      <div style={{ padding: '0 52px 32px' }}>
        <div style={styles.sectionLabel(b, F)}>TERMS AND CONDITIONS</div>
        <div style={{ color: '#999', fontFamily: F, fontSize: 12, lineHeight: 2, marginTop: 10 }}>
          <div>1. This quotation is valid for {quotation.validity_days} days from the date of issue.</div>
          <div>2. {quotation.advance_pct}% advance payment required to confirm the booking.</div>
          <div>3. Balance payment to be settled before the event date.</div>
          <div>4. Cancellation within 7 days of the event, the advance is non-refundable.</div>
          <div>5. Any additions to scope on the day will be billed separately.</div>
          {quotation.gst_enabled && b.gstin && <div>6. GST at 18% included. GSTIN: {b.gstin}</div>}
        </div>
      </div>

      {/* Footer */}
      {(b.contactLines.length > 0 || b.addressLines.length > 0) && (
        <div style={{ background: b.teal, padding: '24px 52px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: b.cream, fontFamily: F, fontSize: 12, lineHeight: 1.9, opacity: 0.85 }}>
            {b.contactLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <div style={{ textAlign: 'right' }}>
            {b.tagline && <div style={{ color: b.gold, fontFamily: b.fontDisplay, fontStyle: 'italic', fontSize: 14 }}>{b.tagline}</div>}
            {b.addressLines.map((line) => (
              <div key={line} style={{ color: b.cream, fontFamily: F, fontSize: 11, marginTop: 4, opacity: 0.6 }}>{line}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  sectionLabel: (b: { gold: string }, F: string): CSSProperties => ({
    color: b.gold,
    fontSize: 10,
    letterSpacing: 3,
    fontFamily: F,
    fontWeight: 700,
  }),
  sectionValue: (b: { teal: string }, F: string): CSSProperties => ({
    color: b.teal,
    fontSize: 18,
    fontFamily: F,
    fontWeight: 700,
    marginTop: 10,
    marginBottom: 4,
  }),
  detailBlock: (F: string): CSSProperties => ({
    color: '#555',
    fontFamily: F,
    fontSize: 13,
    lineHeight: 1.8,
  }),
  totalsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #E2DDD6',
  } as CSSProperties,
}
