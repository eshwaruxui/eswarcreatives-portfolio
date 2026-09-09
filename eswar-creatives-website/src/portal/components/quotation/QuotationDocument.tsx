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
import { formatDocumentDate } from '../../utils/formatDate'
import { getDocumentTheme } from './documentThemes'
import { KolamTileDefs } from './KolamPattern'
import { balanceDueDate, type QuotationFunctionKey } from './quotationMath'

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
  day_count?: number
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
  /** The line's OWN finish, as a client-facing label. Null for flat lines
   *  (no curve) — those never print a finish. Never a key, code or ratio. */
  finishLabel?: string | null
}

/** Client-facing finish label per function. Never a code or a ratio. */
export type FinishLabels = {
  reception: string | null
  muhurtham: string | null
}

/**
 * "Reception setup retained, with additions" / "Setup fully changed for the
 * muhurtham" — already a client-facing sentence, never the stored key.
 * This is a commitment the client is paying for and the most consequential
 * line on some two-function weddings, so it prints on the document rather
 * than living only in the builder.
 */
export type MuhurthamReuseLabel = string | null

export type QuotationDocumentSession = { day_number: number; slot: string }

const SLOT_PRINT_LABELS: Record<string, string> = { morning: 'Morning', evening: 'Evening' }

/** "3 days. Day 1: Morning and Evening. Day 2: Evening." Sessions sort
 *  Morning before Evening regardless of the order they arrive in. */
function daySummary(dayCount: number, sessions: QuotationDocumentSession[]): string | null {
  if (!dayCount || sessions.length === 0) return null
  const slotRank = (slot: string) => (slot === 'morning' ? 0 : 1)
  const parts: string[] = []
  for (let d = 1; d <= dayCount; d += 1) {
    const forDay = sessions
      .filter((x) => x.day_number === d)
      .sort((a, z) => slotRank(a.slot) - slotRank(z.slot))
      .map((x) => SLOT_PRINT_LABELS[x.slot] ?? x.slot)
    if (forDay.length > 0) parts.push(`Day ${d}: ${forDay.join(' and ')}`)
  }
  if (parts.length === 0) return null
  return `${dayCount} day${dayCount > 1 ? 's' : ''}. ${parts.join('. ')}.`
}

const FUNCTION_LABELS: Record<QuotationFunctionKey, string> = {
  reception: 'Reception',
  muhurtham: 'Muhurtham',
}

/**
 * Renders a stored phone number, adding the tenant's dial code only when the
 * number does not already carry one.
 *
 * The stored value is authoritative and is never rewritten: pasting
 * "+91 98407 12233" out of WhatsApp is the normal way these numbers arrive,
 * and the previous unconditional "+91 " prefix turned that into
 * "+91 +91 98407 12233" on a client-facing document.
 *
 * A leading "+" is the only signal treated as "a country code is present".
 * A bare leading "91" deliberately is not: a ten-digit Indian mobile can
 * legitimately begin 91 (Newgen's own 9176045045 does), so inferring from
 * digits would mangle real local numbers to fix a case the "+" already
 * covers.
 */
function formatPhone(stored: string, dialCode: string | null): string {
  const value = stored.trim()
  if (!value || !dialCode) return value
  return value.startsWith('+') ? value : `${dialCode} ${value}`
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
  muhurthamReuseLabel = null,
  sessions = [],
}: {
  tenantId: string
  quotation: QuotationDocumentData
  items: QuotationDocumentItem[]
  finishLabels: FinishLabels
  muhurthamReuseLabel?: MuhurthamReuseLabel
  sessions?: QuotationDocumentSession[]
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

  // Per-function subtotal for the section footer rows (display only —
  // authoritative totals are the stored quotation figures below).
  const sectionSubtotal = (list: QuotationDocumentItem[]) =>
    list.reduce((sum, i) => sum + i.amount, 0)

  const balDue = balanceDueDate(quotation.event_date)
  const balanceAmount = Math.round((quotation.total_amount - quotation.advance_amount + Number.EPSILON) * 100) / 100
  const inWords = rupeesInWords(quotation.total_amount)

  return (
    // data-clarity-mask: the rendered document carries the client's name,
    // phone, address and event date; the whole thing is masked in any
    // Clarity recording (admin preview and public page alike).
    //
    // Visual system lifted from the approved reference
    // (design-reference/newgen-quotation-sheet-reference.html): masthead with
    // the kolam lattice + metallic sheen, meta band, per-function scope
    // tables with zone mini-headers, right-aligned totals, amount-in-words
    // strip, numbered terms, deep-teal footer. All data stays live; the
    // reference's sample content never ships.
    <div className="ngq-doc" data-clarity-mask="True">
      <style>{docCss(b)}</style>

      {/* Masthead */}
      <header className="ngq-mast">
        <svg className="ngp-pattern" aria-hidden="true"><KolamTileDefs /><rect width="100%" height="100%" fill="url(#ngp-kolam-tile)" /></svg>
        <div className="ngp-sheen" aria-hidden="true" />
        {b.logoSrc ? (
          <div className="ngq-lockup">
            <img src={b.logoSrc} alt="Newgen Event Studio. Your vision, their memory." />
          </div>
        ) : (
          <div className="ngq-lockup-text">
            <div className="ngq-lockup-name">Newgen Event Studio</div>
            {b.tagline && <div className="ngq-lockup-tag">{b.tagline}</div>}
          </div>
        )}
        <div className="ngq-docmeta">
          <p className="ngq-doctype">Quotation</p>
          <div className="ngq-docno">{quotation.quotation_number}</div>
          <div className="ngq-docdates">
            Issued {formatDocumentDate(quotation.created_at)}<br />
            Valid for {quotation.validity_days} days
          </div>
        </div>
      </header>

      {/* Meta band — every live field the document has always carried. */}
      <section className="ngq-meta">
        <div>
          <p className="ngq-eyebrow">Prepared for</p>
          <p className="ngq-party">{quotation.client_name}</p>
          <dl className="ngq-dl">
            {quotation.client_phone && (<><dt>Mobile</dt><dd>{formatPhone(quotation.client_phone, b.defaultDialCode)}</dd></>)}
            {quotation.client_email && (<><dt>Email</dt><dd>{quotation.client_email}</dd></>)}
            {quotation.client_address && (<><dt>Address</dt><dd>{quotation.client_address}</dd></>)}
          </dl>
        </div>
        <div>
          <p className="ngq-eyebrow">Event</p>
          <p className="ngq-party">{quotation.event_type}</p>
          <dl className="ngq-dl">
            {quotation.event_date && (<><dt>Date</dt><dd>{formatDocumentDate(quotation.event_date)}</dd></>)}
            {(() => {
              const summary = daySummary(quotation.day_count ?? 0, sessions)
              return summary ? (<><dt>Days</dt><dd>{summary}</dd></>) : null
            })()}
            {quotation.venue && (<><dt>Venue</dt><dd>{quotation.venue}</dd></>)}
            {quotation.guest_count ? (<><dt>Guests</dt><dd>{quotation.guest_count}</dd></>) : null}
          </dl>
        </div>
      </section>

      {/* Scope of work — function, then zone in quoting order */}
      <section className="ngq-scope">
        <p className="ngq-section-label">Scope of work</p>

        {sections.map((section) => {
          // The scope-level finish chip prints ONLY when every curved line
          // in this function carries that same finish. Mixed finishes print
          // per line instead — a chip saying one finish over a line at
          // another misstates what the client is buying. Flat lines (no
          // finish) never block the chip.
          const curvedLines = section.items.filter((i) => i.finishLabel != null)
          const uniformFinish =
            curvedLines.length > 0 &&
            curvedLines.every((i) => i.finishLabel === finishLabels[section.key])
          const finishLabel = uniformFinish ? finishLabels[section.key] : null
          return (
            <div key={section.key} className="ngq-fn">
              <div className="ngq-fn-head">
                <h2 className="ngq-fn-name">{section.heading ?? '\u00A0'}</h2>
                <div className="ngq-fn-terms">
                  {finishLabel && <span className="ngq-chip">{finishLabel}</span>}
                  {/* Only under the muhurtham: it describes what happens to
                      the reception setup. */}
                  {section.key === 'muhurtham' && muhurthamReuseLabel && (
                    <span className="ngq-chip ngq-chip-set">{muhurthamReuseLabel}</span>
                  )}
                </div>
              </div>
              <table className="ngq-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="ngq-qty">Quantity</th>
                    <th className="ngq-n">Rate</th>
                    <th className="ngq-n">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {groupByZone(section.items).map((zone) => (
                    [
                      <tr key={`${zone.key}-head`} className="ngq-zone"><td colSpan={4}>{zone.label}</td></tr>,
                      ...zone.items.map((item, idx) => (
                        <tr key={`${zone.key}-${idx}`}>
                          <td className="ngq-item">
                            {item.label}
                            {item.finishLabel && <span className="ngq-item-finish">{item.finishLabel}</span>}
                            {item.note && <span className="ngq-item-note">{item.note}</span>}
                          </td>
                          <td className="ngq-qty">{item.qty} × {item.unit ?? 'unit'}</td>
                          <td className="ngq-n ngq-rate">{formatNumber(item.amount / (item.qty || 1))}</td>
                          <td className="ngq-n ngq-amt">{formatNumber(item.amount)}</td>
                        </tr>
                      )),
                    ]
                  ))}
                </tbody>
              </table>
              {sections.length > 1 && (
                <div className="ngq-fn-sub">
                  <span>{section.heading}</span>
                  <span><b>{formatNumber(sectionSubtotal(section.items))}</b></span>
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* Totals — stored figures, never recomputed here. */}
      <section className="ngq-totals">
        <table>
          <tbody>
            <tr><td>Subtotal</td><td className="ngq-n">{formatNumber(quotation.subtotal)}</td></tr>
            {quotation.discount_pct > 0 && (
              <tr className="ngq-discount"><td>Discount ({quotation.discount_pct}%)</td><td className="ngq-n">- {formatNumber(quotation.discount_amount)}</td></tr>
            )}
            {quotation.gst_enabled && (
              <tr><td>GST at 18%</td><td className="ngq-n">{formatNumber(quotation.gst_amount)}</td></tr>
            )}
            <tr className="ngq-grand"><td>Total</td><td className="ngq-n">{formatCurrency(quotation.total_amount)}</td></tr>
            <tr className="ngq-adv"><td>Advance ({quotation.advance_pct}%) due now</td><td className="ngq-n">{formatCurrency(quotation.advance_amount)}</td></tr>
            <tr className="ngq-bal">
              <td>Balance ({100 - quotation.advance_pct}%) due {balDue ? formatDocumentDate(balDue) : '10 days before the event'}</td>
              <td className="ngq-n">{formatCurrency(balanceAmount)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Amount in words */}
      {inWords && (
        <p className="ngq-words">
          Amount in words&nbsp;&nbsp;<b>{inWords}</b>
        </p>
      )}

      {/* Terms — live text (phase 6 advance rule), reference styling. */}
      <section className="ngq-terms">
        <p className="ngq-section-label">Terms and conditions</p>
        <ol>
          <li>This quotation is valid for {quotation.validity_days} days from the date of issue.</li>
          <li>{quotation.advance_pct}% advance payment required to confirm the booking.</li>
          <li>
            The balance {100 - quotation.advance_pct}% is due 10 days before the event
            {balDue ? ` (by ${formatDocumentDate(balDue)})` : ''}.
          </li>
          <li>Cancellation within 7 days of the event, the advance is non-refundable.</li>
          <li>Any additions to scope on the day will be billed separately.</li>
          {quotation.gst_enabled && b.gstin && <li>GST at 18% included. GSTIN: {b.gstin}</li>}
        </ol>
      </section>

      {/* Footer */}
      {(b.contactLines.length > 0 || b.addressLines.length > 0) && (
        <footer className="ngq-foot">
          <div>
            {b.contactLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
          <div className="ngq-foot-r">
            {b.tagline && <span className="ngq-foot-tag">{b.tagline}</span>}
            {b.addressLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
            {(b.gstin || b.sac) && (
              <div className="ngq-foot-reg">
                {b.gstin ? `GSTIN ${b.gstin}` : ''}{b.gstin && b.sac ? ' \u00B7 ' : ''}{b.sac ? `SAC ${b.sac}` : ''}
              </div>
            )}
          </div>
        </footer>
      )}
    </div>
  )
}

/** Plain en-IN grouped number, no currency sign — the reference reserves the
 *  rupee sign for the grand total and the advance/balance rows. */
function formatNumber(amount: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function twoDigits(n: number): string {
  if (n < 20) return ONES[n]
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100)
  const rest = n % 100
  return `${h ? ONES[h] + ' Hundred' + (rest ? ' ' : '') : ''}${rest ? twoDigits(rest) : ''}`
}

/** Indian-system rupees in words: crore / lakh / thousand / hundred.
 *  Whole rupees only (documents print rounded rupees throughout). */
function rupeesInWords(amount: number): string | null {
  const n = Math.round(amount)
  if (!Number.isFinite(n) || n <= 0) return null
  if (n >= 1_00_00_00_000) return null
  const crore = Math.floor(n / 1_00_00_000)
  const lakh = Math.floor((n % 1_00_00_000) / 1_00_000)
  const thousand = Math.floor((n % 1_00_000) / 1000)
  const rest = n % 1000
  const parts: string[] = []
  if (crore) parts.push(`${twoDigits(crore)} Crore`)
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`)
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`)
  if (rest) parts.push(threeDigits(rest))
  return `${parts.join(' ')} rupees only`
}

/** The reference sheet's CSS, namespaced ngq-/ngp- so nothing leaks into the
 *  portal chrome. Brandable colours come from the tenant document theme; the
 *  neutrals (ink/paper/sand/rules) are the reference's own print palette,
 *  deliberately separate from the portal token layer per the decision log.
 *  print-color-adjust: exact keeps the teal bands, the kolam pattern and the
 *  sheen in the print/PDF path. */
function docCss(b: ReturnType<typeof getDocumentTheme>): string {
  return `
.ngq-doc{
  --ink:#0E1A1B; --ink-2:#3A4A4B; --ink-3:#66787A;
  --teal:${b.teal}; --teal-deep:#02373B; --teal-wash:#E8F3F4;
  --gold:#8A6A22; --gold-leaf:${b.gold}; --gold-wash:#F9F4E8;
  --paper:#FBF9F5; --sand:#EFE9DE; --rule:#DED6C6; --rule-soft:#EBE5D9;
  max-width:820px; margin:0 auto; background:var(--paper);
  font-family:${b.fontUI}; font-size:14px; line-height:1.55; color:var(--ink);
  -webkit-font-smoothing:antialiased; font-variant-numeric:tabular-nums;
  box-shadow:0 1px 2px rgba(14,26,27,.10), 0 18px 50px rgba(14,26,27,.13);
  -webkit-print-color-adjust:exact; print-color-adjust:exact;
}
.ngq-doc .ngp-pattern{
  position:absolute; inset:0; width:100%; height:100%;
  color:var(--ngp-color, var(--gold-leaf));
  opacity:var(--ngp-opacity, 1);
  transform:scale(var(--ngp-tile-scale, 1));
  transform-origin:50% 50%;
  z-index:-1; pointer-events:none;
}
.ngq-doc .ngp-sheen{
  position:absolute; inset:0;
  background:linear-gradient(180deg,
    rgba(2,16,17,.34) 0%, rgba(255,255,255,.05) 24%, rgba(255,255,255,.48) 50%,
    rgba(255,255,255,.05) 76%, rgba(2,16,17,.34) 100%);
  mix-blend-mode:overlay;
  opacity:var(--ngp-sheen-opacity, .68);
  z-index:-1; pointer-events:none;
}
.ngq-mast{
  position:relative; isolation:isolate; overflow:hidden;
  background:var(--teal); color:#F4F1E9;
  padding:36px 44px 30px;
  display:flex; justify-content:space-between; align-items:flex-start; gap:28px;
  --ngp-color:#FFFFFF; --ngp-opacity:.3; --ngp-tile-scale:1.4; --ngp-sheen-opacity:.68;
}
.ngq-lockup{width:172px; flex-shrink:0; position:relative; z-index:1}
.ngq-lockup img{display:block; width:100%; height:auto}
.ngq-lockup-text{position:relative; z-index:1}
.ngq-lockup-name{color:var(--gold-leaf); font-size:20px; font-weight:700}
.ngq-lockup-tag{color:var(--gold-leaf); font-size:13px; font-style:italic; margin-top:4px; opacity:.9}
.ngq-docmeta{text-align:right; position:relative; z-index:1}
.ngq-doctype{font-size:10.5px; font-weight:600; letter-spacing:.20em; text-transform:uppercase; color:var(--gold-leaf); margin:0 0 8px}
.ngq-docno{font-size:22px; font-weight:600; letter-spacing:-.01em; color:#FFFFFF; line-height:1.1}
.ngq-docdates{margin-top:7px; font-size:12px; color:#BDD2D2; line-height:1.6}
.ngq-meta{display:grid; grid-template-columns:1fr 1fr; gap:0; border-bottom:1px solid var(--rule)}
.ngq-meta > div{padding:22px 44px 20px}
.ngq-meta > div + div{border-left:1px solid var(--rule-soft)}
.ngq-eyebrow{font-size:10px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:var(--gold); margin:0 0 9px}
.ngq-party{font-size:17px; font-weight:600; letter-spacing:-.01em; margin:0 0 3px}
.ngq-dl{display:grid; grid-template-columns:auto 1fr; gap:4px 14px; font-size:13px; margin:0}
.ngq-dl dt{color:var(--ink-3)}
.ngq-dl dd{margin:0; color:var(--ink-2)}
.ngq-scope{padding:26px 44px 0}
.ngq-section-label{font-size:10px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:var(--gold); margin:0 0 18px}
.ngq-fn{margin-bottom:30px}
.ngq-fn-head{
  display:flex; align-items:baseline; justify-content:space-between;
  gap:16px; flex-wrap:wrap; padding-bottom:9px; border-bottom:2px solid var(--teal);
}
.ngq-fn-name{font-size:19px; font-weight:600; letter-spacing:-.015em; color:var(--teal); margin:0}
.ngq-fn-terms{display:flex; gap:8px; flex-wrap:wrap}
.ngq-chip{
  font-size:11px; font-weight:500; padding:3px 10px; border-radius:3px;
  background:var(--gold-wash); color:var(--gold); border:1px solid var(--rule); white-space:nowrap;
}
.ngq-chip-set{background:var(--teal-wash); color:var(--teal); border-color:#CBE0E1}
.ngq-table{width:100%; border-collapse:collapse; margin-top:2px}
.ngq-table thead th{
  font-size:9.5px; font-weight:600; letter-spacing:.13em; text-transform:uppercase;
  color:var(--ink-3); text-align:left; padding:11px 0 8px; border-bottom:1px solid var(--rule);
}
.ngq-table th.ngq-n, .ngq-table td.ngq-n{text-align:right}
.ngq-table th.ngq-qty, .ngq-table td.ngq-qty{text-align:right; white-space:nowrap}
.ngq-zone td{
  padding:15px 0 5px; font-size:9.5px; font-weight:600; letter-spacing:.13em;
  text-transform:uppercase; color:var(--teal); border-bottom:0;
}
.ngq-table tbody td{padding:8px 0; border-bottom:1px solid var(--rule-soft); font-size:13.5px}
.ngq-table tbody tr.ngq-zone td{border-bottom:0}
.ngq-item{padding-right:16px}
.ngq-item-finish{display:block; font-size:11px; color:var(--gold); margin-top:1px}
.ngq-item-note{display:block; font-size:11.5px; color:var(--ink-3); margin-top:1px}
.ngq-amt{font-weight:600; width:110px}
.ngq-rate{color:var(--ink-2); width:96px}
.ngq-fn-sub{
  display:flex; justify-content:flex-end; gap:26px;
  padding:11px 0 0; font-size:12.5px; color:var(--ink-2);
}
.ngq-fn-sub b{color:var(--ink); font-weight:600}
.ngq-totals{padding:4px 44px 0; display:flex; justify-content:flex-end}
.ngq-totals table{width:340px; margin:0; border-collapse:collapse}
.ngq-totals td{padding:8px 0; font-size:13.5px; border-bottom:1px solid var(--rule-soft)}
.ngq-totals td.ngq-n{font-weight:500; text-align:right}
.ngq-totals tr.ngq-discount td{color:${b.ruby}}
.ngq-totals tr.ngq-grand td{
  border-top:2px solid var(--teal); border-bottom:0;
  padding-top:12px; font-size:19px; font-weight:600; color:var(--teal); letter-spacing:-.015em;
}
.ngq-totals tr.ngq-adv td{border-bottom:0; padding-top:6px; font-size:13px; color:var(--gold); font-weight:500}
.ngq-totals tr.ngq-bal td{border-bottom:0; padding-top:2px; font-size:13px; color:var(--ink-2); font-weight:500}
.ngq-words{
  margin:22px 44px 0; padding:13px 16px;
  background:var(--sand); border-left:3px solid var(--gold-leaf);
  font-size:12.5px; color:var(--ink-2);
}
.ngq-words b{color:var(--ink); font-weight:600}
.ngq-terms{padding:26px 44px 30px}
.ngq-terms ol{margin:0; padding-left:17px; font-size:11.5px; color:var(--ink-2); line-height:1.75}
.ngq-terms li{margin-bottom:2px}
.ngq-terms li::marker{color:var(--ink-3)}
.ngq-foot{
  background:var(--teal-deep); color:#C6D6D6;
  padding:22px 44px;
  display:flex; justify-content:space-between; gap:28px; flex-wrap:wrap;
  font-size:11.5px; line-height:1.7;
}
.ngq-foot-r{text-align:right}
.ngq-foot-tag{color:var(--gold-leaf); font-style:italic; font-size:12px}
.ngq-foot-reg{color:#8FA9A9; margin-top:5px}
@media (max-width:720px){
  .ngq-meta{grid-template-columns:1fr}
  .ngq-meta > div + div{border-left:0; border-top:1px solid var(--rule-soft)}
  .ngq-mast{flex-direction:column; padding:26px 24px}
  .ngq-docmeta{text-align:left}
  .ngq-scope,.ngq-terms{padding-left:24px; padding-right:24px}
  .ngq-totals{padding-left:24px; padding-right:24px}
  .ngq-words{margin-left:24px; margin-right:24px}
  .ngq-foot{padding:20px 24px}
  .ngq-foot-r{text-align:left}
  .ngq-totals table{width:100%}
}
@media print{
  .ngq-doc{box-shadow:none; max-width:none}
  .ngq-fn{break-inside:avoid}
  .ngq-table tr{break-inside:avoid}
  @page{margin:12mm}
}
`
}
