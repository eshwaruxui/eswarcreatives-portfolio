// The ONE implementation of quotation pricing. Phase 1 shipped a bug where
// the cart derived a line's value from qty*rate while the document rendered
// a separately-stored `amount` that nothing kept in sync, so every printed
// line read as zero (fixed in d29803fd). Everything that needs a line value
// or a total — the cart rail, the admin preview, the PDF, persistence —
// calls into this module. Nothing recomputes it locally, and there is
// deliberately no DB-side generated column or trigger doing it a second
// time either.
//
// Tenant-neutral by construction: the rule "floral work scales with the
// chosen finish" is not encoded here as a system key. It arrives as data
// via `scalesWithFinish` (quotation_systems.scales_with_finish), so this
// file names no tenant's vocabulary.

export type QuotationFunctionKey = 'reception' | 'muhurtham'

/** Minimum shape this module needs. Callers pass richer objects freely. */
export type PricedLine = {
  system: string
  qty: number
  rate: number
  functionKey: QuotationFunctionKey
}

export type PricingContext = {
  /** system key -> whether the finish multiplier applies to it. */
  scalesWithFinish: Record<string, boolean>
  /** function -> multiplier. Each function carries its OWN finish; a
   *  muhurtham never inherits the reception's, and vice versa. */
  multiplierByFunction: Record<QuotationFunctionKey, number>
}

/**
 * The effective per-unit rate for a line: the base rate, scaled by the
 * finish multiplier of the line's own function when its system scales.
 * Surfaced in the admin cart so the operator can see what a finish choice
 * actually does to a rate. Never shown to the client.
 */
export function effectiveRate(line: PricedLine, ctx: PricingContext): number {
  const scales = ctx.scalesWithFinish[line.system] === true
  const multiplier = scales ? (ctx.multiplierByFunction[line.functionKey] ?? 1) : 1
  return line.rate * multiplier
}

/** amount = qty x rate x (finish multiplier when the system scales). */
export function lineAmount(line: PricedLine, ctx: PricingContext): number {
  return round2(line.qty * effectiveRate(line, ctx))
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
}

export const GST_RATE = 0.18

/**
 * Whole-quotation totals, built from the same per-line amounts the cart and
 * the document render. Both functions' lines are summed together: a
 * quotation carrying a reception and a muhurtham is one quotation with one
 * total, even though each function priced its floral work at its own finish.
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
  return { subtotal, discountAmount, gstAmount, total, advanceAmount }
}

// Money is stored as numeric(12,2). Rounding each line as it is computed —
// rather than only at the end — is what keeps the cart, the stored amount,
// the preview, the PDF and the public page agreeing to the rupee, since the
// public page re-renders persisted per-line values it never recomputes.
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
