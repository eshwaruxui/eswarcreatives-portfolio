// Quotation Module — the branded, print-ready document (Step 3 of the
// builder, and the whole of the public /quotation/:token page).
//
// Pure renderer. It never computes a line's value: `amount` arrives already
// derived by quotationMath.ts (live in the admin preview, persisted for the
// public page), which is what keeps the cart, the PDF and the public page
// agreeing to the rupee. See that module's header for the bug this avoids.
//
// Scope reads as the venue walk: function, then zone in quoting order, then
// the elements in that zone. A zone with no lines never appears here — an
// empty zone is a prompt for the operator in the builder, not something a
// client should read.
//
// Brand comes from documentThemes.ts (the tenant's *document* brand, kept
// separate from the shared portal-chrome TenantTheme), never hardcoded, so
// the same component serves any future tenant.
//
// Copy is deliberately label/total-only — no marketing language, no em
// dashes, no exclamation marks, no rhetorical questions (Tone of Voice
// guide: quotation/invoice documents sit in the lowest-copy tier).
//
// HARD RULE: the finish ladder reaches the client as a LABEL and nothing
// else. No internal code, no ratio, no percentage, ever — not here, not in
// the PDF, not on the public page.
import type { CSSProperties } from 'react'
import { formatPortalDate } from '../../utils/formatDate'
import { getDocumentTheme } from './documentThemes'
import type { QuotationFunctionKey } from './quotationMath'

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
  has_muhurtham?: boolean
}

export type QuotationDocumentItem = {
  functionKey: QuotationFunctionKey
  zoneKey: string | null
  zoneLabel: string | null
  zoneOrder: number
  system: string
  label: string
  unit: string | null
  qty: number
  rate: number
  amount: number
  note?: string | null
}

/** Client-facing finish label per function. Never a code or a ratio. */
export type FinishLabels = {
  reception: string | null
  muhurtham: string | null
}

const FUNCTION_LABELS: Record<QuotationFunctionKey, string> = {
  reception: 'Reception',
  muhurtham: 'Muhurtham',
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

type ZoneGroup = { key: string; label: string; order: number; items: QuotationDocumentItem[] }

/** Zones in quoting order, empty ones dropped. */
function groupByZone(items: QuotationDocumentItem[]): ZoneGroup[] {
  const groups = new Map<string, ZoneGroup>()
  for (const item of items) {
    // A line with no zone (a pre-zones record, or one never assigned) still
    // has to appear somewhere rather than vanish from a priced document.
    const key = item.zoneKey ?? '__unzoned__'
    const existing = groups.get(key)
    if (existing) {
      existing.items.push(item)
    } else {
      groups.set(key, {
        key,
        label: item.zoneLabel ?? 'Additional items',
        order: item.zoneKey ? item.zoneOrder : 9999,
        items: [item],
      })
    }
  }
  return [...groups.values()].sort((a, b) => a.order - b.order)
}

export function QuotationDocument({
  tenantId,
  quotation,
  items,
  finishLabels,
}: {
  tenantId: string
  quotation: QuotationDocumentData
  items: QuotationDocumentItem[]
  finishLabels: FinishLabels
}) {
  const b = getDocumentTheme(tenantId)
  const F = b.fontUI

  const receptionItems = items.filter((i) => i.functionKey === 'reception')
  const muhurthamItems = items.filter((i) => i.functionKey === 'muhurtham')

  // Only name the functions when there are genuinely two of them. On a
  // single-function quotation a "Reception" heading would be actively wrong
  // for a birthday or a shop opening, which also run as one function.
  const isTwoFunction = muhurthamItems.length > 0
  type Section = { key: QuotationFunctionKey; heading: string | null; items: QuotationDocumentItem[] }
  const sections: Section[] = isTwoFunction
    ? ([
        { key: 'reception', heading: FUNCTION_LABELS.reception, items: receptionItems },
        { key: 'muhurtham', heading: FUNCTION_LABELS.muhurtham, items: muhurthamItems },
      ] as Section[]).filter((s) => s.items.length > 0)
    : [{ key: 'reception', heading: null, items }]

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

      {/* Scope of work — function, then zone in quoting order */}
      <div style={{ padding: '32px 52px' }}>
        <div style={{ ...styles.sectionLabel(b, F), marginBottom: 16 }}>SCOPE OF WORK</div>

        {sections.map((section) => {
          const finishLabel = finishLabels[section.key]
          return (
            <div key={section.key} style={{ marginBottom: sections.length > 1 ? 28 : 0 }}>
              {section.heading && (
                <div style={{ color: b.teal, fontFamily: b.fontDisplay, fontSize: 20, fontWeight: 700, marginBottom: 2, paddingTop: 4 }}>
                  {section.heading}
                </div>
              )}
              {finishLabel && (
                <div style={{ color: b.ochre, fontFamily: F, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
                  Finish: {finishLabel}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, padding: '8px 0', borderBottom: `2px solid ${b.teal}` }}>
                {['Item', 'Qty / Unit', 'Rate', 'Amount'].map((h) => (
                  <div key={h} style={{ color: b.teal, fontFamily: F, fontSize: 11, letterSpacing: 1.5, fontWeight: 700 }}>{h}</div>
                ))}
              </div>

              {groupByZone(section.items).map((zone) => (
                <div key={zone.key}>
                  <div style={{ color: b.ochre, fontFamily: F, fontSize: 11, fontWeight: 700, padding: '14px 0 4px', borderBottom: `1px solid ${b.gold}22`, letterSpacing: 0.5 }}>
                    {zone.label.toUpperCase()}
                  </div>
                  {zone.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 8, padding: '10px 0', borderBottom: '1px solid #f4f0ea' }}>
                      <div>
                        <div style={{ color: '#1A1A1A', fontFamily: F, fontSize: 13, fontWeight: 500 }}>{item.label}</div>
                        {item.note && <div style={{ color: '#999', fontFamily: F, fontSize: 11, marginTop: 2 }}>{item.note}</div>}
                      </div>
                      <div style={{ color: '#555', fontFamily: F, fontSize: 13 }}>{item.qty} {item.unit}</div>
                      <div style={{ color: '#555', fontFamily: F, fontSize: 13 }}>{formatCurrency(item.amount / (item.qty || 1))}</div>
                      <div style={{ color: b.teal, fontFamily: F, fontSize: 13, fontWeight: 600 }}>{formatCurrency(item.amount)}</div>
                    </div>
                  ))}
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
