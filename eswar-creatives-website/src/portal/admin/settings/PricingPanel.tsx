// Settings > Pricing — the instrument that closes the rate-card gap.
//
// Build 2 landed the pricing data model (curves, curve steps, item rates,
// commission) but nothing in the product could edit it: changing a rate
// meant a SQL migration. Sixty of the 72 catalogue elements read "rate TBC"
// because their rates arrive one conversation at a time as the client
// confirms them — this screen is how each one lands without a deploy.
//
// Three panels, in rising order of blast radius:
//   1. Commission — one number on one row.
//   2. Rate card  — anchors per (item, unit), curve or flat, is_active.
//   3. Curves     — the ratios themselves. One wrong ratio silently
//      reprices everything downstream, so every curve save goes through an
//      explicit impact preview (affected item count + before/after prices)
//      and deleting a referenced curve is refused naming its blockers.
//
// CHANGE SAFETY. Nothing here can alter money already quoted: every
// quotation (drafts included) froze its own copy of the rate card at
// creation (quotation_snapshot_rates / _curve_steps, build 2), and lines
// carry their own anchors. Changes made here apply to quotations created
// AFTER the change — the screen says so where the edits happen.
//
// PRICING LOGIC IS NOT DEFINED HERE. Every preview figure comes from
// quotationMath.listRate — the single pricing implementation the builder,
// the document and persistence already share. This screen edits the data
// that maths reads; it does not restate the maths.
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts } from '../../theme'
import { showToast } from '../toast'
import { Toggle } from '../../components/shared/Toggle'
import { formatPortalDateTime } from '../../utils/formatDate'
import { listRate } from '../../components/quotation/quotationMath'

type SettingsRow = { commission_pct: number; updated_at: string; updated_by: string | null }
type SystemRow = { key: string; label: string; sort_order: number }
type FinishRow = { key: string; label: string; sort_order: number }
type LibraryRow = { id: string; system: string; name: string; unit: string | null; is_active: boolean; sort_order: number }
type RateRow = {
  id: string; item_id: string; unit: string; curve_key: string | null
  anchor_rate: number; commission_flat: number | null; updated_at: string | null
}
type CurveRow = { key: string; label: string; updated_at: string | null }
type StepRow = { curve_key: string; finish_level: string; ratio: string }

/** Ratios travel as strings end to end: numeric(10,6) must arrive exactly
 *  as typed, never through a float round-trip. */
function ratioNumber(rawRatio: string): number {
  return Number.parseFloat(rawRatio)
}

function priceAt(anchor: number, rawRatio: string): number {
  // The one implementation: listRate on a minimal curved line.
  return listRate(
    { qty: 1, anchorRate: anchor, curveKey: 'c', finishLevel: 'f', commissionApplied: true, commissionFlat: null },
    { ratios: { c: { f: ratioNumber(rawRatio) } }, commissionPct: 0 }
  )
}

function formatINR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

const FLAT = '__flat__'

export function PricingPanel() {
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [settings, setSettings] = useState<SettingsRow | null>(null)
  const [systems, setSystems] = useState<SystemRow[]>([])
  const [finishes, setFinishes] = useState<FinishRow[]>([])
  const [library, setLibrary] = useState<LibraryRow[]>([])
  const [rates, setRates] = useState<RateRow[]>([])
  const [curves, setCurves] = useState<CurveRow[]>([])
  const [steps, setSteps] = useState<StepRow[]>([])
  const [profileNames, setProfileNames] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    const [settingsRes, systemsRes, finishRes, libRes, ratesRes, curvesRes, stepsRes] = await Promise.all([
      supabase.from('quotation_pricing_settings').select('commission_pct, updated_at, updated_by').limit(1).single(),
      supabase.from('quotation_systems').select('key, label, sort_order').order('sort_order'),
      supabase.from('quotation_finish_levels').select('key, label, sort_order').order('sort_order'),
      supabase.from('quotation_item_library').select('id, system, name, unit, is_active, sort_order').order('sort_order'),
      supabase.from('quotation_item_rates').select('id, item_id, unit, curve_key, anchor_rate, commission_flat, updated_at').order('unit'),
      supabase.from('quotation_curves').select('key, label, updated_at').order('key'),
      supabase.from('quotation_curve_steps').select('curve_key, finish_level, ratio'),
    ])
    if (settingsRes.error || systemsRes.error || libRes.error || ratesRes.error || curvesRes.error || stepsRes.error) {
      setLoadError(true)
      setLoading(false)
      return
    }
    setSettings(settingsRes.data as SettingsRow)
    setSystems((systemsRes.data ?? []) as SystemRow[])
    setFinishes((finishRes.data ?? []) as FinishRow[])
    setLibrary((libRes.data ?? []) as LibraryRow[])
    setRates(((ratesRes.data ?? []) as RateRow[]).map((r) => ({ ...r, anchor_rate: Number(r.anchor_rate) })))
    setCurves((curvesRes.data ?? []) as CurveRow[])
    setSteps(((stepsRes.data ?? []) as { curve_key: string; finish_level: string; ratio: number | string }[]).map((sr) => ({
      curve_key: sr.curve_key, finish_level: sr.finish_level, ratio: String(sr.ratio),
    })))
    const who = (settingsRes.data as SettingsRow | null)?.updated_by
    if (who) {
      const { data: prof } = await supabase.from('profiles').select('id, full_name').eq('id', who).single()
      if (prof) setProfileNames((prev) => ({ ...prev, [prof.id as string]: (prof.full_name as string) ?? '' }))
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const finishOrder = useCallback(
    (key: string) => finishes.find((f) => f.key === key)?.sort_order ?? 999,
    [finishes]
  )
  const finishLabel = useCallback(
    (key: string) => finishes.find((f) => f.key === key)?.label ?? key,
    [finishes]
  )
  const curveSteps = useCallback(
    (curveKey: string) => steps.filter((sr) => sr.curve_key === curveKey)
      .sort((a, b) => finishOrder(a.finish_level) - finishOrder(b.finish_level)),
    [steps, finishOrder]
  )

  if (loading) return <p style={ps.muted}>Loading pricing configuration…</p>
  if (loadError || !settings) return <p style={ps.muted}>Could not load pricing configuration. Reload the page.</p>

  return (
    <div>
      {/* The change-safety contract, stated once, above everything that
          edits money. Verified behaviour, not aspiration: every quotation
          snapshots the rate card at creation. */}
      <div style={ps.safetyNote}>
        Changes here apply to quotations created after the change. Existing
        quotations, drafts included, keep the rate card they were created
        with, so nothing already quoted moves.
      </div>

      <CommissionCard settings={settings} profileNames={profileNames} onSaved={load} />
      <RateCardEditor
        systems={systems}
        library={library}
        rates={rates}
        curves={curves}
        curveSteps={curveSteps}
        finishLabel={finishLabel}
        onChanged={load}
      />
      <CurvesEditor
        curves={curves}
        curveSteps={curveSteps}
        finishes={finishes}
        finishLabel={finishLabel}
        rates={rates}
        library={library}
        onChanged={load}
      />
    </div>
  )
}

// ── 1. Commission ─────────────────────────────────────────────────────
function CommissionCard({
  settings, profileNames, onSaved,
}: {
  settings: SettingsRow
  profileNames: Record<string, string>
  onSaved: () => Promise<void> | void
}) {
  const [draft, setDraft] = useState(String(settings.commission_pct))
  const [saving, setSaving] = useState(false)
  useEffect(() => { setDraft(String(settings.commission_pct)) }, [settings.commission_pct])

  const parsed = Number(draft)
  const valid = draft.trim() !== '' && Number.isFinite(parsed) && parsed >= 0 && parsed < 100
  const dirty = valid && parsed !== Number(settings.commission_pct)

  async function save() {
    if (!valid) return
    setSaving(true)
    const { error } = await supabase
      .from('quotation_pricing_settings')
      .update({ commission_pct: parsed })
      .eq('id', true)
    setSaving(false)
    if (error) {
      showToast('Could not save the commission percentage. Try again.', 'error')
      return
    }
    showToast('Commission percentage saved.', 'success')
    await onSaved()
  }

  const who = settings.updated_by ? profileNames[settings.updated_by] : null

  return (
    <section style={ps.card}>
      <h2 style={ps.cardTitle}>Commission</h2>
      <p style={ps.cardSub}>
        Commission is baked into the rates Mohan anna quotes — the card
        figures already contain it. This percentage is what gets stripped
        out when “Commission applied” is unticked on a line, and it never
        appears anywhere on the client copy.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <input
          type="number"
          min={0}
          max={99.99}
          step="0.01"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{ ...ps.input, width: 110 }}
        />
        <span style={ps.unitText}>%</span>
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => void save()}
          style={{ ...ps.primaryBtn, opacity: dirty && !saving ? 1 : 0.5 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      {!valid && draft.trim() !== '' && (
        <div style={ps.fieldError}>Enter a percentage between 0 and 99.99.</div>
      )}
      <div style={ps.lastChanged}>
        Last changed {formatPortalDateTime(settings.updated_at)}{who ? ` by ${who}` : ''}
      </div>
    </section>
  )
}

// ── 2. Rate card ──────────────────────────────────────────────────────
type RateDraft = { anchor: string; curveKey: string }
type NewRateDraft = { unit: string; anchor: string; curveKey: string }

function RateCardEditor({
  systems, library, rates, curves, curveSteps, finishLabel, onChanged,
}: {
  systems: SystemRow[]
  library: LibraryRow[]
  rates: RateRow[]
  curves: CurveRow[]
  curveSteps: (curveKey: string) => StepRow[]
  finishLabel: (key: string) => string
  onChanged: () => Promise<void> | void
}) {
  const [search, setSearch] = useState('')
  const [drafts, setDrafts] = useState<Record<string, RateDraft>>({})
  const [newDrafts, setNewDrafts] = useState<Record<string, NewRateDraft>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const knownUnits = useMemo(() => {
    const set = new Set<string>()
    for (const r of rates) set.add(r.unit)
    for (const li of library) if (li.unit) set.add(li.unit)
    return [...set].sort()
  }, [rates, library])

  const ratesByItem = useMemo(() => {
    const map: Record<string, RateRow[]> = {}
    for (const r of rates) (map[r.item_id] = map[r.item_id] ?? []).push(r)
    return map
  }, [rates])

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    return systems
      .map((sys) => ({
        key: sys.key,
        label: sys.label,
        items: library.filter((li) => li.system === sys.key && (!q || li.name.toLowerCase().includes(q))),
      }))
      .filter((g) => g.items.length > 0)
  }, [systems, library, search])

  function draftFor(r: RateRow): RateDraft {
    return drafts[r.id] ?? { anchor: String(r.anchor_rate), curveKey: r.curve_key ?? FLAT }
  }

  function setDraft(id: string, patch: Partial<RateDraft>, base: RateRow) {
    setDrafts((prev) => ({ ...prev, [id]: { ...draftFor(base), ...(prev[id] ?? {}), ...patch } }))
  }

  function validAnchor(v: string): boolean {
    const n = Number(v)
    return v.trim() !== '' && Number.isFinite(n) && n > 0
  }

  async function saveRate(r: RateRow) {
    const d = draftFor(r)
    if (!validAnchor(d.anchor)) {
      showToast('The anchor must be greater than zero.', 'error')
      return
    }
    setBusy(r.id)
    const { error } = await supabase
      .from('quotation_item_rates')
      .update({
        anchor_rate: Number(d.anchor),
        curve_key: d.curveKey === FLAT ? null : d.curveKey,
      })
      .eq('id', r.id)
    setBusy(null)
    if (error) {
      showToast('Could not save that rate. Try again.', 'error')
      return
    }
    setDrafts((prev) => { const next = { ...prev }; delete next[r.id]; return next })
    showToast('Rate saved.', 'success')
    await onChanged()
  }

  async function deleteRate(r: RateRow, itemName: string) {
    if (!window.confirm(`Remove the ${r.unit} rate for ${itemName}? The item goes back to “rate to be confirmed” for that unit. Quotations already created keep their own copy.`)) return
    setBusy(r.id)
    const { error } = await supabase.from('quotation_item_rates').delete().eq('id', r.id)
    setBusy(null)
    if (error) {
      showToast('Could not remove that rate. Try again.', 'error')
      return
    }
    showToast('Rate removed.', 'success')
    await onChanged()
  }

  async function addRate(item: LibraryRow) {
    const d = newDrafts[item.id]
    if (!d) return
    const unit = d.unit.trim()
    if (!unit) {
      showToast('Give the rate a unit.', 'error')
      return
    }
    if ((ratesByItem[item.id] ?? []).some((r) => r.unit.toLowerCase() === unit.toLowerCase())) {
      showToast(`${item.name} already has a ${unit} rate — edit that one instead.`, 'error')
      return
    }
    if (!validAnchor(d.anchor)) {
      showToast('The anchor must be greater than zero.', 'error')
      return
    }
    setBusy(`new-${item.id}`)
    const { error } = await supabase.from('quotation_item_rates').insert({
      item_id: item.id,
      unit,
      anchor_rate: Number(d.anchor),
      curve_key: d.curveKey === FLAT ? null : d.curveKey,
    })
    setBusy(null)
    if (error) {
      showToast('Could not add that rate. Try again.', 'error')
      return
    }
    setNewDrafts((prev) => { const next = { ...prev }; delete next[item.id]; return next })
    showToast(`${item.name} priced.`, 'success')
    await onChanged()
  }

  async function toggleActive(item: LibraryRow, next: boolean) {
    const { error } = await supabase.from('quotation_item_library').update({ is_active: next }).eq('id', item.id)
    if (error) {
      showToast('Could not update that item. Try again.', 'error')
      return
    }
    showToast(next ? `${item.name} is back in the catalogue.` : `${item.name} retired from the catalogue. Its history is untouched.`, 'success')
    await onChanged()
  }

  function finishPreview(curveKey: string, anchor: string) {
    if (!validAnchor(anchor)) return null
    const rows = curveSteps(curveKey)
    if (rows.length === 0) return null
    return rows.map((sr) => `${finishLabel(sr.finish_level)} ${formatINR(priceAt(Number(anchor), sr.ratio))}`).join(' · ')
  }

  return (
    <section style={ps.card}>
      <h2 style={ps.cardTitle}>Rate card</h2>
      <p style={ps.cardSub}>
        The anchor is the full-fresh figure its curve scales from. An item can
        carry one rate per unit — Stage garden prices per running foot and per
        sqft on different curves. “Rate to be confirmed” is the normal state
        for an element whose figure has not been agreed yet.
      </p>
      <input
        style={{ ...ps.input, width: '100%', margin: '14px 0 4px' }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search elements…"
      />

      {groups.map((group) => (
        <div key={group.key}>
          <div style={ps.groupHeading}>{group.label}</div>
          {group.items.map((item) => {
            const itemRates = ratesByItem[item.id] ?? []
            const adding = newDrafts[item.id] !== undefined
            return (
              <div key={item.id} style={{ ...ps.itemRow, opacity: item.is_active ? 1 : 0.55 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={ps.itemName}>{item.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={ps.activeLabel}>{item.is_active ? 'In catalogue' : 'Retired'}</span>
                    <Toggle
                      checked={item.is_active}
                      onChange={(next) => void toggleActive(item, next)}
                      label={`${item.name} active`}
                    />
                  </div>
                </div>

                {itemRates.length === 0 && !adding && (
                  <div style={ps.tbcRow}>
                    <span style={ps.tbcText}>Rate to be confirmed</span>
                    <button
                      type="button"
                      style={ps.linkBtn}
                      onClick={() => setNewDrafts((prev) => ({ ...prev, [item.id]: { unit: item.unit ?? 'per unit', anchor: '', curveKey: FLAT } }))}
                    >
                      + set a rate
                    </button>
                  </div>
                )}

                {itemRates.map((r) => {
                  const d = draftFor(r)
                  const dirty = d.anchor !== String(r.anchor_rate) || d.curveKey !== (r.curve_key ?? FLAT)
                  const preview = d.curveKey !== FLAT ? finishPreview(d.curveKey, d.anchor) : null
                  return (
                    <div key={r.id} style={ps.rateRow}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={ps.rateUnit}>{r.unit}</span>
                        <span style={ps.unitText}>₹</span>
                        <input
                          type="number"
                          min={1}
                          value={d.anchor}
                          onChange={(e) => setDraft(r.id, { anchor: e.target.value }, r)}
                          style={{ ...ps.input, width: 100 }}
                        />
                        <select
                          value={d.curveKey}
                          onChange={(e) => setDraft(r.id, { curveKey: e.target.value }, r)}
                          style={ps.select}
                        >
                          <option value={FLAT}>Flat rate (no finish selection)</option>
                          {curves.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                        </select>
                        {dirty && (
                          <button
                            type="button"
                            disabled={busy === r.id}
                            style={{ ...ps.primaryBtn, padding: '6px 14px' }}
                            onClick={() => void saveRate(r)}
                          >
                            {busy === r.id ? 'Saving…' : 'Save'}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy === r.id}
                          style={ps.dangerLinkBtn}
                          onClick={() => void deleteRate(r, item.name)}
                          title="Remove this rate"
                        >
                          remove
                        </button>
                      </div>
                      {preview && <div style={ps.previewLine}>{preview}</div>}
                      {d.curveKey === FLAT && validNumber(d.anchor) && (
                        <div style={ps.previewLine}>{formatINR(Number(d.anchor))} flat, no finish preview</div>
                      )}
                      {r.updated_at && (
                        <div style={ps.rateChanged}>last changed {formatPortalDateTime(r.updated_at)}</div>
                      )}
                    </div>
                  )
                })}

                {itemRates.length > 0 && !adding && (
                  <button
                    type="button"
                    style={{ ...ps.linkBtn, marginTop: 4 }}
                    onClick={() => setNewDrafts((prev) => ({ ...prev, [item.id]: { unit: '', anchor: '', curveKey: FLAT } }))}
                  >
                    + add a rate for another unit
                  </button>
                )}

                {adding && (
                  <div style={ps.rateRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <input
                        list="pricing-known-units"
                        placeholder="unit (e.g. running ft)"
                        value={newDrafts[item.id]?.unit ?? ''}
                        onChange={(e) => setNewDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], unit: e.target.value } }))}
                        style={{ ...ps.input, width: 140 }}
                      />
                      <span style={ps.unitText}>₹</span>
                      <input
                        type="number"
                        min={1}
                        placeholder="anchor"
                        value={newDrafts[item.id]?.anchor ?? ''}
                        onChange={(e) => setNewDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], anchor: e.target.value } }))}
                        style={{ ...ps.input, width: 100 }}
                      />
                      <select
                        value={newDrafts[item.id]?.curveKey ?? FLAT}
                        onChange={(e) => setNewDrafts((prev) => ({ ...prev, [item.id]: { ...prev[item.id], curveKey: e.target.value } }))}
                        style={ps.select}
                      >
                        <option value={FLAT}>Flat rate (no finish selection)</option>
                        {curves.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                      </select>
                      <button
                        type="button"
                        disabled={busy === `new-${item.id}`}
                        style={{ ...ps.primaryBtn, padding: '6px 14px' }}
                        onClick={() => void addRate(item)}
                      >
                        {busy === `new-${item.id}` ? 'Adding…' : 'Add'}
                      </button>
                      <button
                        type="button"
                        style={ps.linkBtn}
                        onClick={() => setNewDrafts((prev) => { const next = { ...prev }; delete next[item.id]; return next })}
                      >
                        cancel
                      </button>
                    </div>
                    {(newDrafts[item.id]?.curveKey ?? FLAT) !== FLAT && (
                      <div style={ps.previewLine}>
                        {finishPreview(newDrafts[item.id].curveKey, newDrafts[item.id].anchor) ?? 'Type an anchor to preview each finish level.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
      <datalist id="pricing-known-units">
        {knownUnits.map((u) => <option key={u} value={u} />)}
      </datalist>
      {groups.length === 0 && <p style={ps.muted}>No elements match that search.</p>}
    </section>
  )
}

function validNumber(v: string): boolean {
  const n = Number(v)
  return v.trim() !== '' && Number.isFinite(n) && n > 0
}

// ── 3. Curves ─────────────────────────────────────────────────────────
const RATIO_PATTERN = /^(0(\.\d{1,6})?|1(\.0{1,6})?)$/

type CurveDraft = {
  label: string
  steps: { finishLevel: string; ratio: string }[]
}

type CurvePreview = {
  curveKey: string
  draft: CurveDraft
  affectedItems: string[]
  removedLevels: string[]
  examples: {
    itemName: string
    unit: string
    rows: { level: string; before: number | null; after: number | null }[]
  }[]
}

function CurvesEditor({
  curves, curveSteps, finishes, finishLabel, rates, library, onChanged,
}: {
  curves: CurveRow[]
  curveSteps: (curveKey: string) => StepRow[]
  finishes: FinishRow[]
  finishLabel: (key: string) => string
  rates: RateRow[]
  library: LibraryRow[]
  onChanged: () => Promise<void> | void
}) {
  const [openCurve, setOpenCurve] = useState<string | null>(null)
  const [draft, setDraft] = useState<CurveDraft | null>(null)
  const [preview, setPreview] = useState<CurvePreview | null>(null)
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState('')

  const itemName = useCallback(
    (itemId: string) => library.find((li) => li.id === itemId)?.name ?? 'Unknown item',
    [library]
  )
  const ratesOnCurve = useCallback(
    (curveKey: string) => rates.filter((r) => r.curve_key === curveKey),
    [rates]
  )

  function openForEdit(curve: CurveRow) {
    setPreview(null)
    setCreating(false)
    setOpenCurve(curve.key)
    setDraft({
      label: curve.label,
      steps: curveSteps(curve.key).map((sr) => ({ finishLevel: sr.finish_level, ratio: sr.ratio })),
    })
  }

  function openForCreate() {
    setPreview(null)
    setOpenCurve(null)
    setCreating(true)
    setNewKey('')
    setDraft({ label: '', steps: [{ finishLevel: 'full_fresh', ratio: '1.000000' }] })
  }

  /** All the reasons a draft cannot be saved, in the order they bite. */
  function validate(d: CurveDraft): string | null {
    if (creating) {
      if (!/^[a-z][a-z0-9_]{2,40}$/.test(newKey)) return 'The curve key must be a lowercase slug (letters, digits, underscores).'
      if (curves.some((c) => c.key === newKey)) return 'A curve with that key already exists.'
    }
    if (!d.label.trim()) return 'Give the curve a label.'
    if (d.steps.length < 2) return 'A curve keeps at least two steps.'
    const full = d.steps.find((sr) => sr.finishLevel === 'full_fresh')
    if (!full) return 'Every curve carries a full_fresh step. The anchor is by definition the full fresh price.'
    for (const sr of d.steps) {
      if (!RATIO_PATTERN.test(sr.ratio.trim())) return `The ${finishLabel(sr.finishLevel)} ratio must be a number between 0 and 1 with at most six decimals.`
      const n = ratioNumber(sr.ratio)
      if (!(n > 0 && n <= 1)) return `The ${finishLabel(sr.finishLevel)} ratio must be greater than 0 and no greater than 1.`
    }
    if (ratioNumber(full.ratio) !== 1) return 'The full_fresh ratio must be exactly 1.000000. The anchor is the full fresh price.'
    const ordered = [...d.steps].sort(
      (a, b) => (finishes.find((f) => f.key === a.finishLevel)?.sort_order ?? 999) - (finishes.find((f) => f.key === b.finishLevel)?.sort_order ?? 999)
    )
    for (let i = 1; i < ordered.length; i += 1) {
      if (ratioNumber(ordered[i].ratio) >= ratioNumber(ordered[i - 1].ratio)) {
        return `Ratios must descend as the finish steps down: ${finishLabel(ordered[i].finishLevel)} (${ordered[i].ratio}) is not below ${finishLabel(ordered[i - 1].finishLevel)} (${ordered[i - 1].ratio}). A curve that rises is almost certainly a typo.`
      }
    }
    return null
  }

  /** Build the before/after impact preview a curve save must pass through. */
  function buildPreview(curveKey: string, d: CurveDraft): CurvePreview {
    const before = curveSteps(curveKey)
    const beforeMap = Object.fromEntries(before.map((sr) => [sr.finish_level, sr.ratio]))
    const afterMap = Object.fromEntries(d.steps.map((sr) => [sr.finishLevel, sr.ratio]))
    const removedLevels = before.filter((sr) => !(sr.finish_level in afterMap)).map((sr) => sr.finish_level)
    const affected = ratesOnCurve(curveKey)
    const levels = [...new Set([...Object.keys(beforeMap), ...Object.keys(afterMap)])]
      .sort((a, b) => (finishes.find((f) => f.key === a)?.sort_order ?? 999) - (finishes.find((f) => f.key === b)?.sort_order ?? 999))
    const examples = affected.slice(0, 3).map((r) => ({
      itemName: itemName(r.item_id),
      unit: r.unit,
      rows: levels.map((lvl) => ({
        level: lvl,
        before: lvl in beforeMap ? priceAt(r.anchor_rate, beforeMap[lvl]) : null,
        after: lvl in afterMap ? priceAt(r.anchor_rate, afterMap[lvl]) : null,
      })),
    }))
    return {
      curveKey,
      draft: d,
      affectedItems: [...new Set(affected.map((r) => `${itemName(r.item_id)} (${r.unit})`))],
      removedLevels,
      examples,
    }
  }

  function requestSave() {
    if (!draft) return
    const problem = validate(draft)
    if (problem) {
      showToast(problem, 'error')
      return
    }
    if (creating) {
      // A new curve affects nothing yet; save directly.
      void saveCreate(draft)
      return
    }
    if (!openCurve) return
    setPreview(buildPreview(openCurve, draft))
  }

  async function saveCreate(d: CurveDraft) {
    setBusy(true)
    const { error: curveErr } = await supabase.from('quotation_curves').insert({ key: newKey, label: d.label.trim() })
    if (curveErr) {
      setBusy(false)
      showToast('Could not create the curve. Try again.', 'error')
      return
    }
    const { error: stepsErr } = await supabase.from('quotation_curve_steps').insert(
      d.steps.map((sr) => ({ curve_key: newKey, finish_level: sr.finishLevel, ratio: sr.ratio }))
    )
    setBusy(false)
    if (stepsErr) {
      showToast('Curve created but its steps did not save. Open it and try again.', 'error')
    } else {
      showToast('Curve created.', 'success')
    }
    setCreating(false)
    setDraft(null)
    await onChanged()
  }

  async function confirmSave() {
    if (!preview) return
    const { curveKey, draft: d, removedLevels } = preview
    setBusy(true)
    const { error: labelErr } = await supabase.from('quotation_curves').update({ label: d.label.trim() }).eq('key', curveKey)
    if (labelErr) {
      setBusy(false)
      showToast('Could not save the curve. Try again.', 'error')
      return
    }
    const existing = curveSteps(curveKey)
    const existingLevels = new Set(existing.map((sr) => sr.finish_level))
    for (const sr of d.steps) {
      // Ratios travel as the typed string so numeric(10,6) lands exactly.
      const payload = { ratio: sr.ratio }
      const { error } = existingLevels.has(sr.finishLevel)
        ? await supabase.from('quotation_curve_steps').update(payload).eq('curve_key', curveKey).eq('finish_level', sr.finishLevel)
        : await supabase.from('quotation_curve_steps').insert({ curve_key: curveKey, finish_level: sr.finishLevel, ...payload })
      if (error) {
        setBusy(false)
        showToast(`Could not save the ${finishLabel(sr.finishLevel)} step. Reload before retrying.`, 'error')
        return
      }
    }
    for (const lvl of removedLevels) {
      const { error } = await supabase.from('quotation_curve_steps').delete().eq('curve_key', curveKey).eq('finish_level', lvl)
      if (error) {
        setBusy(false)
        showToast(`Could not remove the ${finishLabel(lvl)} step. Reload before retrying.`, 'error')
        return
      }
    }
    setBusy(false)
    setPreview(null)
    setOpenCurve(null)
    setDraft(null)
    showToast('Curve saved. New quotations price against it from now on.', 'success')
    await onChanged()
  }

  async function deleteCurve(curve: CurveRow) {
    const blockers = ratesOnCurve(curve.key)
    if (blockers.length > 0) {
      const names = [...new Set(blockers.map((r) => `${itemName(r.item_id)} (${r.unit})`))]
      showToast(
        `Cannot delete ${curve.label}: ${names.length} rate${names.length === 1 ? '' : 's'} still price on it: ${names.join(', ')}. Move them to another curve first.`,
        'error',
        8000
      )
      return
    }
    if (!window.confirm(`Delete the curve “${curve.label}”? Its steps go with it. Quotations already created keep their own copy.`)) return
    setBusy(true)
    const { error } = await supabase.from('quotation_curves').delete().eq('key', curve.key)
    setBusy(false)
    if (error) {
      showToast('Could not delete the curve. Try again.', 'error')
      return
    }
    if (openCurve === curve.key) { setOpenCurve(null); setDraft(null) }
    showToast('Curve deleted.', 'success')
    await onChanged()
  }

  const editableFinishOptions = (d: CurveDraft) =>
    finishes.filter((f) => !d.steps.some((sr) => sr.finishLevel === f.key))

  return (
    <section style={ps.card}>
      <h2 style={ps.cardTitle}>Finish curves</h2>
      <p style={ps.cardSub}>
        A curve is the list of ratios a finish ladder applies to an item’s
        anchor. It defines which finish levels an item offers: removing a
        step removes that option from every item on the curve. One wrong
        ratio silently reprices everything downstream, so every save shows
        its impact first.
      </p>

      {curves.map((curve) => {
        const stepsRows = curveSteps(curve.key)
        const onCurve = ratesOnCurve(curve.key)
        const isOpen = openCurve === curve.key && draft !== null && !creating
        return (
          <div key={curve.key} style={ps.curveBlock}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div>
                <div style={ps.itemName}>{curve.label}</div>
                <div style={ps.curveMeta}>
                  {curve.key} · {stepsRows.length} steps · prices {onCurve.length} rate{onCurve.length === 1 ? '' : 's'}
                  {curve.updated_at ? ` · last changed ${formatPortalDateTime(curve.updated_at)}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" style={ps.linkBtn} onClick={() => (isOpen ? (setOpenCurve(null), setDraft(null)) : openForEdit(curve))}>
                  {isOpen ? 'close' : 'edit'}
                </button>
                <button type="button" style={ps.dangerLinkBtn} onClick={() => void deleteCurve(curve)}>
                  delete
                </button>
              </div>
            </div>

            {isOpen && draft && (
              <div style={ps.curveEditor}>
                <label style={ps.smallLabel}>LABEL</label>
                <input
                  style={{ ...ps.input, width: 280, marginBottom: 10 }}
                  value={draft.label}
                  onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                />
                {[...draft.steps]
                  .sort((a, b) => (finishes.find((f) => f.key === a.finishLevel)?.sort_order ?? 999) - (finishes.find((f) => f.key === b.finishLevel)?.sort_order ?? 999))
                  .map((sr) => (
                    <div key={sr.finishLevel} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ ...ps.rateUnit, width: 170 }}>{finishLabel(sr.finishLevel)}</span>
                      <input
                        style={{ ...ps.input, width: 120 }}
                        value={sr.ratio}
                        disabled={sr.finishLevel === 'full_fresh'}
                        title={sr.finishLevel === 'full_fresh' ? 'The anchor is by definition the full fresh price. This step is always 1.000000.' : undefined}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            steps: draft.steps.map((x) => (x.finishLevel === sr.finishLevel ? { ...x, ratio: e.target.value } : x)),
                          })
                        }
                      />
                      {sr.finishLevel !== 'full_fresh' && (
                        <button
                          type="button"
                          style={ps.dangerLinkBtn}
                          title="Removing a step removes that finish option from every item on this curve"
                          onClick={() => setDraft({ ...draft, steps: draft.steps.filter((x) => x.finishLevel !== sr.finishLevel) })}
                        >
                          remove step
                        </button>
                      )}
                    </div>
                  ))}
                {editableFinishOptions(draft).length > 0 && (
                  <select
                    style={{ ...ps.select, marginTop: 4 }}
                    value=""
                    onChange={(e) => {
                      if (!e.target.value) return
                      setDraft({ ...draft, steps: [...draft.steps, { finishLevel: e.target.value, ratio: '' }] })
                    }}
                  >
                    <option value="">+ add a finish step…</option>
                    {editableFinishOptions(draft).map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                )}
                <div style={ps.stepWarning}>
                  Removing a step removes that finish option from all {onCurve.length} rate{onCurve.length === 1 ? '' : 's'} on this curve.
                </div>
                <button type="button" style={{ ...ps.primaryBtn, marginTop: 10 }} onClick={requestSave}>
                  Review changes…
                </button>
              </div>
            )}

            {preview && preview.curveKey === curve.key && (
              <div style={ps.previewBox}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  This change reprices {preview.affectedItems.length} rate{preview.affectedItems.length === 1 ? '' : 's'} for NEW quotations
                </div>
                {preview.affectedItems.length > 0 && (
                  <div style={{ marginBottom: 8 }}>{preview.affectedItems.join(', ')}</div>
                )}
                {preview.removedLevels.length > 0 && (
                  <div style={{ marginBottom: 8, color: tokens.ruby, fontWeight: 600 }}>
                    Removes {preview.removedLevels.map(finishLabel).join(', ')} as an option for every item above.
                  </div>
                )}
                {preview.examples.map((ex) => (
                  <div key={`${ex.itemName}-${ex.unit}`} style={{ marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>{ex.itemName} ({ex.unit}):</span>{' '}
                    {ex.rows.map((row) => (
                      <span key={row.level} style={{ marginRight: 10 }}>
                        {finishLabel(row.level)}{' '}
                        {row.before !== null && row.after !== null && row.before !== row.after
                          ? <>{formatINR(row.before)} → <strong>{formatINR(row.after)}</strong></>
                          : row.after === null
                            ? <s>{row.before !== null ? formatINR(row.before) : ''}</s>
                            : formatINR(row.after ?? 0)}
                      </span>
                    ))}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button type="button" disabled={busy} style={ps.primaryBtn} onClick={() => void confirmSave()}>
                    {busy ? 'Saving…' : 'Confirm and save'}
                  </button>
                  <button type="button" style={ps.linkBtn} onClick={() => setPreview(null)}>cancel</button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {!creating ? (
        <button type="button" style={{ ...ps.linkBtn, marginTop: 8 }} onClick={openForCreate}>
          + new curve
        </button>
      ) : (
        draft && (
          <div style={ps.curveEditor}>
            <label style={ps.smallLabel}>KEY (slug, permanent)</label>
            <input style={{ ...ps.input, width: 280, marginBottom: 8 }} value={newKey} onChange={(e) => setNewKey(e.target.value)} placeholder="e.g. pasting_4step" />
            <label style={ps.smallLabel}>LABEL</label>
            <input style={{ ...ps.input, width: 280, marginBottom: 10 }} value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="e.g. Pasting, 4-step" />
            {draft.steps.map((sr) => (
              <div key={sr.finishLevel} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ ...ps.rateUnit, width: 170 }}>{finishLabel(sr.finishLevel)}</span>
                <input
                  style={{ ...ps.input, width: 120 }}
                  value={sr.ratio}
                  disabled={sr.finishLevel === 'full_fresh'}
                  onChange={(e) => setDraft({ ...draft, steps: draft.steps.map((x) => (x.finishLevel === sr.finishLevel ? { ...x, ratio: e.target.value } : x)) })}
                />
                {sr.finishLevel !== 'full_fresh' && (
                  <button type="button" style={ps.dangerLinkBtn} onClick={() => setDraft({ ...draft, steps: draft.steps.filter((x) => x.finishLevel !== sr.finishLevel) })}>
                    remove step
                  </button>
                )}
              </div>
            ))}
            {editableFinishOptions(draft).length > 0 && (
              <select
                style={{ ...ps.select, marginTop: 4 }}
                value=""
                onChange={(e) => {
                  if (!e.target.value) return
                  setDraft({ ...draft, steps: [...draft.steps, { finishLevel: e.target.value, ratio: '' }] })
                }}
              >
                <option value="">+ add a finish step…</option>
                {editableFinishOptions(draft).map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button type="button" disabled={busy} style={ps.primaryBtn} onClick={requestSave}>
                {busy ? 'Creating…' : 'Create curve'}
              </button>
              <button type="button" style={ps.linkBtn} onClick={() => { setCreating(false); setDraft(null) }}>cancel</button>
            </div>
          </div>
        )
      )}
    </section>
  )
}

const ps: Record<string, CSSProperties> = {
  muted: { fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary },
  safetyNote: {
    fontFamily: fonts.body, fontSize: 12, lineHeight: 1.6, color: t.text.secondary,
    background: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 8,
    padding: '10px 14px', marginBottom: 16,
  },
  card: {
    background: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 8,
    padding: 24, marginBottom: 16,
  },
  cardTitle: { fontFamily: fonts.body, fontSize: 16, fontWeight: 700, color: tokens.primary, margin: 0 },
  cardSub: { fontFamily: fonts.body, fontSize: 13, lineHeight: 1.6, color: t.text.tertiary, margin: '6px 0 0' },
  input: {
    padding: '8px 10px', border: `1px solid ${tokens.border}`, borderRadius: 6,
    fontFamily: fonts.body, fontSize: 13, color: t.text.primary, background: '#fff',
    outline: 'none', boxSizing: 'border-box',
  },
  select: {
    padding: '8px 10px', border: `1px solid ${tokens.border}`, borderRadius: 6,
    fontFamily: fonts.body, fontSize: 13, color: t.text.primary, background: '#fff', cursor: 'pointer',
  },
  primaryBtn: {
    padding: '8px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
    background: tokens.primary, color: tokens.gold,
    fontFamily: fonts.body, fontSize: 13, fontWeight: 700,
  },
  linkBtn: {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    fontFamily: fonts.body, fontSize: 12, color: tokens.primary, textDecoration: 'underline',
  },
  dangerLinkBtn: {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    fontFamily: fonts.body, fontSize: 12, color: tokens.ruby, textDecoration: 'underline',
  },
  unitText: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary },
  fieldError: { fontFamily: fonts.body, fontSize: 12, color: tokens.ruby, marginTop: 6 },
  lastChanged: { fontFamily: fonts.body, fontSize: 11, color: t.text.tertiary, marginTop: 10 },
  groupHeading: {
    fontFamily: fonts.body, fontSize: 11, fontWeight: 700, letterSpacing: 1,
    textTransform: 'uppercase', color: tokens.goldDark,
    borderBottom: `1px solid ${tokens.border}`, padding: '14px 0 5px', marginBottom: 4,
  },
  itemRow: { padding: '10px 0', borderBottom: '1px solid #f0ece4' },
  itemName: { fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: t.text.primary },
  activeLabel: { fontFamily: fonts.body, fontSize: 11, color: t.text.tertiary },
  tbcRow: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 },
  tbcText: { fontFamily: fonts.body, fontSize: 12, color: t.text.tertiary },
  rateRow: { marginTop: 8, paddingLeft: 2 },
  rateUnit: { fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: t.text.secondary, minWidth: 84, display: 'inline-block' },
  previewLine: { fontFamily: fonts.body, fontSize: 11, color: tokens.goldDark, marginTop: 5, lineHeight: 1.6 },
  rateChanged: { fontFamily: fonts.body, fontSize: 10, color: t.text.muted, marginTop: 3 },
  curveBlock: { padding: '12px 0', borderBottom: '1px solid #f0ece4' },
  curveMeta: { fontFamily: fonts.body, fontSize: 11, color: t.text.tertiary, marginTop: 2 },
  curveEditor: {
    marginTop: 10, padding: 14, background: tokens.bg,
    border: `1px solid ${tokens.border}`, borderRadius: 8,
  },
  smallLabel: {
    display: 'block', fontFamily: fonts.body, fontSize: 10, fontWeight: 700,
    letterSpacing: 1, color: t.text.tertiary, marginBottom: 4,
  },
  stepWarning: { fontFamily: fonts.body, fontSize: 11, color: tokens.goldDark, marginTop: 8, lineHeight: 1.5 },
  previewBox: {
    marginTop: 10, padding: 14, borderRadius: 8, fontFamily: fonts.body, fontSize: 12,
    lineHeight: 1.7, color: t.text.primary,
    background: '#FFF9EE', border: `1px solid ${tokens.gold}`,
  },
}
