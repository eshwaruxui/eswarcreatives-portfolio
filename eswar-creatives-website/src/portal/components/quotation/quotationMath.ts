// The ONE implementation of quotation pricing. Phase 1 shipped a bug where
// the cart derived a line's value from qty*rate while the document rendered
// a separately-stored `amount` that nothing kept in sync, so every printed
// line read as zero (fixed in d29803fd). Everything that needs a line value
// or a total — the cart rail, the admin preview, the PDF, persistence —
// calls into this module. Nothing recomputes it locally, and there is
// deliberately no DB-side generated column or trigger doing it a second
// time either.
//
// BUILD 2 (8 Sept): the finish ladder is no longer one global multiplier.
// It is a set of named curves — each a list of ratios per finish level —
// applied to an anchor price that belongs to the item and its unit:
//
//   list price = round(anchor_rate * ratio)     to the nearest rupee
//
// A line with no curve is a flat rate with no finish selection. The ratios
// come from the QUOTATION'S OWN snapshot (quotation_snapshot_curve_steps),
// never from the global tables, so editing the global rate card can never
// reprice an existing quotation.
//
// COMMISSION. The rate card figures already CONTAIN commission — the
// client bakes it in. So "Commission applied" (the default) means the list
// price passes through untouched, and UNCHECKING it strips commission out:
// a flat override is subtracted; a percentage is DIVIDED out (1000 at 10%
// has a base of 909.09, not 900). Commission never reaches any client
// surface; commissionComponent below exists for the builder's internal
// figure only.

export type QuotationFunctionKey = 'reception' | 'muhurtham'

/** Minimum shape this module needs. Callers pass richer objects freely. */
export type PricedLine = {
  qty: number
  /** The rate-card anchor for curved lines; the entered rate for flat ones. */
  anchorRate: number
  curveKey: string | null
  finishLevel: string | null
  commissionApplied: boolean
  /** Per-item flat rupee commission override; null means the global %. */
  commissionFlat: number | null
}

export type PricingContext = {
  /** curve key -> finish level -> ratio, from the quotation's snapshot. */
  ratios: Record<string, Record<string, number>>
  /** The quotation's own frozen commission percentage. */
  commissionPct: number
}

/**
 * The rate-card price for one unit: round(anchor * ratio) for a curved
 * line, the anchor itself for a flat one. A curved line whose finish is
 * not defined on its curve prices at 0 — which the builder already treats
 * as "unpriced", so a data mismatch is a visible TBC, never a silent
 * wrong number.
 */
export function listRate(line: PricedLine, ctx: PricingContext): number {
  if (!line.curveKey) return round2(line.anchorRate)
  const ratio = ctx.ratios[line.curveKey]?.[line.finishLevel ?? '']
  if (ratio === undefined) return 0
  return Math.round(line.anchorRate * ratio)
}

/**
 * What the client is actually charged per unit. Checked (default): the
 * rate card figure exactly — toggling commission ON must never change the
 * number. Unchecked: the commission is stripped out of the figure.
 */
export function unitRate(line: PricedLine, ctx: PricingContext): number {
  const list = listRate(line, ctx)
  if (list <= 0 || line.commissionApplied) return list
  if (line.commissionFlat !== null && line.commissionFlat !== undefined) {
    return round2(Math.max(0, list - line.commissionFlat))
  }
  return round2(list / (1 + ctx.commissionPct / 100))
}

/**
 * The commission rupees contained in one unit at list price — builder-view
 * internal figure ONLY, never rendered on any client surface.
 */
export function commissionComponent(line: PricedLine, ctx: PricingContext): number {
  const list = listRate(line, ctx)
  if (list <= 0) return 0
  if (line.commissionFlat !== null && line.commissionFlat !== undefined) {
    return round2(Math.min(list, line.commissionFlat))
  }
  return round2(list - list / (1 + ctx.commissionPct / 100))
}

/** amount = qty x the charged per-unit rate. */
export function lineAmount(line: PricedLine, ctx: PricingContext): number {
  return round2(line.qty * unitRate(line, ctx))
}

export type TotalsInput = {
  discountPct: number
  advancePct: number
  gstEnabled: boolean
}

export type Totals = {
  subtotal: number
  discountAmount: number
  gstAmount: number
  total: number
  advanceAmount: number
  balanceAmount: number
}

export const GST_RATE = 0.18

// The confirmed advance rule (Build2 sanity findings 3a, confirmed 9 Sept):
// 10% advance to book, the 90% balance due 10 days before event Day 1.
// Per-quotation editable; these are the defaults for NEW quotations only.
export const DEFAULT_ADVANCE_PCT = 10
export const BALANCE_DUE_DAYS_BEFORE_EVENT = 10

/**
 * Balance due date: event Day 1 minus BALANCE_DUE_DAYS_BEFORE_EVENT, as an
 * ISO date string. Computed, never stored, so it re-derives whenever Day 1
 * changes. Null when no event date is set (astrologer-pending) — callers
 * show a worded fallback instead.
 */
export function balanceDueDate(eventDate: string | null | undefined): string | null {
  if (!eventDate) return null
  const d = new Date(`${eventDate}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  d.setDate(d.getDate() - BALANCE_DUE_DAYS_BEFORE_EVENT)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * Whole-quotation totals, built from the same per-line amounts the cart and
 * the document render. Both functions' lines are summed together: a
 * quotation carrying a reception and a muhurtham is one quotation with one
 * total, even though each function's floral work carries its own finish.
 */
export function computeTotals(
  lines: PricedLine[],
  ctx: PricingContext,
  { discountPct, advancePct, gstEnabled }: TotalsInput
): Totals {
  const subtotal = round2(lines.reduce((sum, line) => sum + lineAmount(line, ctx), 0))
  const discountAmount = round2((subtotal * discountPct) / 100)
  const afterDiscount = subtotal - discountAmount
  const gstAmount = round2(gstEnabled ? afterDiscount * GST_RATE : 0)
  const total = round2(afterDiscount + gstAmount)
  const advanceAmount = round2((total * advancePct) / 100)
  const balanceAmount = round2(total - advanceAmount)
  return { subtotal, discountAmount, gstAmount, total, advanceAmount, balanceAmount }
}

// Money is stored as numeric(12,2). Rounding each line as it is computed —
// rather than only at the end — is what keeps the cart, the stored amount,
// the preview, the PDF and the public page agreeing to the rupee, since the
// public page re-renders persisted per-line values it never recomputes.
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
