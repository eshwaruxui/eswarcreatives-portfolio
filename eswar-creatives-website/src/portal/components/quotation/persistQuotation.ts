// The ONE write path for a quotation's scope and money.
//
// Phase 1 shipped a bug where the cart and the document each derived a line's
// value separately, so every printed line read as zero. quotationMath.ts was
// the answer to that: one implementation of the arithmetic. This module is
// the same answer applied one layer out — one implementation of the *write*.
//
// The bug it exists to prevent, found in the second QA pass on NES-2026-1006:
// the builder computed totals into a `totals` object and then passed that
// object to an `update`. Whenever the component's state and the object it
// passed disagreed — because a save fired before a finish change, or because
// a reload had quietly reset a finish to empty — the row stored a total that
// no longer matched its own stored line items. The database held subtotal
// 52600 while the same items at the same finishes computed 50350, and the
// public page renders stored data, so the client's link and the operator's
// screen showed two different prices for one wedding with nothing to reveal
// the divergence.
//
// So this function does not accept totals. It takes the lines and the
// pricing context and computes them here, immediately before writing, from
// exactly the same helpers the cart and the document render. A caller cannot
// pass a wrong total because a caller cannot pass a total at all.
//
// Tenant-neutral: it names no zone, system or finish, and takes the finish
// multipliers as data via PricingContext, exactly as quotationMath does.
import type { SupabaseClient } from '@supabase/supabase-js'
import { computeTotals, lineAmount, type PricingContext, type QuotationFunctionKey } from './quotationMath'

/** A cart line as the builder holds it. Structural, so the builder's richer
 *  CartItem satisfies it without a conversion step that could drop a field. */
export type PersistableLine = {
  functionKey: QuotationFunctionKey
  zoneKey: string | null
  system: string
  label: string
  unit: string | null
  qty: number
  rate: number
  note: string | null
  gerberaFill: boolean
  source: string
}

/** Everything about a quotation that is not a line item and not a total. */
export type QuotationSettings = {
  discountPct: number
  advancePct: number
  validityDays: number
  gstEnabled: boolean
  twoFunction: boolean
  receptionFinishKey: string
  muhurthamFinishKey: string
  readymadeVariant: string
  muhurthamReuse: string
}

// Discriminated on a string, not a boolean: this project does not compile
// with `strict`, and without strictNullChecks a `true`/`false` literal
// widens to boolean, so `if (!result.ok)` narrows to nothing useful.
export type PersistResult =
  | { status: 'saved'; totals: ReturnType<typeof computeTotals> }
  | { status: 'failed'; stage: 'quotation' | 'items'; message: string }

/**
 * Writes the scope and settings of one quotation, recomputing every money
 * value from `lines` + `ctx` at write time.
 *
 * The muhurtham fields are nulled only when the quotation genuinely is not
 * two-function. That branch is deliberate — a quotation whose muhurtham was
 * switched off must not keep a stale muhurtham finish — but it is also the
 * branch that silently dropped the operator's choices when `twoFunction` was
 * computed from state that had been reset, so it is now the caller's job to
 * pass a `twoFunction` it actually means.
 */
export async function persistQuotationScope(
  supabase: SupabaseClient,
  quotationId: string,
  lines: PersistableLine[],
  ctx: PricingContext,
  settings: QuotationSettings
): Promise<PersistResult> {
  const totals = computeTotals(lines, ctx, {
    discountPct: settings.discountPct,
    advancePct: settings.advancePct,
    gstEnabled: settings.gstEnabled,
  })

  const { error: upErr } = await supabase
    .from('quotations')
    .update({
      discount_pct: settings.discountPct,
      advance_pct: settings.advancePct,
      validity_days: settings.validityDays,
      gst_enabled: settings.gstEnabled,
      has_muhurtham: settings.twoFunction,
      reception_finish_key: settings.receptionFinishKey || null,
      muhurtham_finish_key: settings.twoFunction ? settings.muhurthamFinishKey || null : null,
      readymade_variant: settings.readymadeVariant || null,
      muhurtham_reuse: settings.twoFunction ? settings.muhurthamReuse || null : null,
      subtotal: totals.subtotal,
      discount_amount: totals.discountAmount,
      gst_amount: totals.gstAmount,
      total_amount: totals.total,
      advance_amount: totals.advanceAmount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', quotationId)
  if (upErr) return { status: 'failed', stage: 'quotation', message: upErr.message }

  await supabase.from('quotation_items').delete().eq('quotation_id', quotationId)
  if (lines.length > 0) {
    const { error: itemsErr } = await supabase.from('quotation_items').insert(
      lines.map((it, idx) => ({
        quotation_id: quotationId,
        function_key: it.functionKey,
        zone_key: it.zoneKey,
        system: it.system,
        label: it.label,
        unit: it.unit,
        qty: it.qty,
        rate: it.rate,
        // Same helper the cart and the document render, so a stored line
        // and a rendered line can never be computed differently.
        amount: lineAmount(it, ctx),
        note: it.note,
        gerbera_fill: it.gerberaFill,
        source: it.source,
        sort_order: idx,
      }))
    )
    if (itemsErr) return { status: 'failed', stage: 'items', message: itemsErr.message }
  }

  return { status: 'saved', totals }
}
