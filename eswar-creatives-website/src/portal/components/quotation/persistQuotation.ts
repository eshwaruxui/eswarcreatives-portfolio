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
// passed disagreed, the row stored a total that no longer matched its own
// stored line items, and the public page renders stored data. So this
// function does not accept totals. It takes the lines and the pricing
// context and computes them here, immediately before writing, from exactly
// the same helpers the cart and the document render. A caller cannot pass a
// wrong total because a caller cannot pass a total at all.
//
// BUILD 2: a line now persists everything its price is computed FROM
// (anchor, curve, finish level, commission flags) as well as the computed
// rate and amount, so the stored row is auditable against the quotation's
// own rate-card snapshot. Days and sessions ride along in the same write:
// they are quotation structure, and splitting them into a second save path
// would recreate exactly the state-drift this module exists to prevent.
//
// Tenant-neutral: it names no zone, system, finish or curve, and takes the
// snapshot ratios as data via PricingContext, exactly as quotationMath does.
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  computeTotals,
  lineAmount,
  unitRate,
  type PricingContext,
  type QuotationFunctionKey,
} from './quotationMath'

/** A cart line as the builder holds it. Structural, so the builder's richer
 *  CartItem satisfies it without a conversion step that could drop a field. */
export type PersistableLine = {
  functionKey: QuotationFunctionKey
  zoneKey: string | null
  system: string
  label: string
  unit: string | null
  qty: number
  anchorRate: number
  curveKey: string | null
  finishLevel: string | null
  commissionApplied: boolean
  commissionFlat: number | null
  note: string | null
  gerberaFill: boolean
  source: string
}

export type PersistableSession = {
  dayNumber: number
  slot: 'morning' | 'evening'
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
  dayCount: number
}

// Discriminated on a string, not a boolean: this project does not compile
// with `strict`, and without strictNullChecks a `true`/`false` literal
// widens to boolean, so `if (!result.ok)` narrows to nothing useful.
export type PersistResult =
  | { status: 'saved'; totals: ReturnType<typeof computeTotals> }
  | { status: 'failed'; stage: 'quotation' | 'items' | 'sessions'; message: string }

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
  settings: QuotationSettings,
  sessions: PersistableSession[]
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
      day_count: settings.dayCount,
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
        anchor_rate: it.anchorRate,
        curve_key: it.curveKey,
        finish_level: it.curveKey ? it.finishLevel : null,
        commission_applied: it.commissionApplied,
        commission_flat: it.commissionFlat,
        // Same helpers the cart and the document render, so a stored line
        // and a rendered line can never be computed differently.
        rate: unitRate(it, ctx),
        amount: lineAmount(it, ctx),
        note: it.note,
        gerbera_fill: it.gerberaFill,
        source: it.source,
        sort_order: idx,
      }))
    )
    if (itemsErr) return { status: 'failed', stage: 'items', message: itemsErr.message }
  }

  await supabase.from('quotation_day_sessions').delete().eq('quotation_id', quotationId)
  if (sessions.length > 0) {
    const { error: sessErr } = await supabase.from('quotation_day_sessions').insert(
      sessions.map((s, idx) => ({
        quotation_id: quotationId,
        day_number: s.dayNumber,
        slot: s.slot,
        sort_order: idx,
      }))
    )
    if (sessErr) return { status: 'failed', stage: 'sessions', message: sessErr.message }
  }

  return { status: 'saved', totals }
}
