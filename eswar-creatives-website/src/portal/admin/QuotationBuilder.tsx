// Quotation Module build 2 — the 3-view create/edit flow, priced from the
// audited curve model locked with the client on 8 Sept 2026.
//
// Client + event form -> Builder (element catalog by system on the left, a
// persistent cart grouped by zone on the right, with finish and totals in
// the same panel) -> Preview.
//
// What drives the structure:
//   * ZONES. The venue walk is the quoting order, so the cart is grouped by
//     zone, and all 14 zones stay visible in the builder even when empty —
//     an empty zone is an upsell prompt for the operator. Empty zones never
//     reach the client document.
//   * FUNCTIONS. A wedding can carry a reception and a muhurtham. The
//     muhurtham is a separate overnight job, not a discount on the
//     reception, so each function holds its own finish and neither ever
//     inherits from the other.
//   * CURVES. Pricing is round(anchor * ratio) from the quotation's OWN
//     rate-card snapshot, frozen at creation. A line's finish can only be
//     a level its curve defines; a line with no curve is a flat rate with
//     no finish selection. The global rate card is never a live dependency
//     of an existing quotation.
//   * COMMISSION. The rate card already contains it. The per-line checkbox
//     (checked by default) leaves the figure exactly as the card holds it;
//     unchecking strips it (divide for the percentage, subtract for a flat
//     override). Internal figure only — never on a client surface.
//
// Zones, systems, finish levels, curves, venues and the element library are
// all loaded from the tenant's own database. No tenant vocabulary is
// hardcoded here.
//
// Every rupee shown comes from quotationMath.ts. This file does no pricing
// arithmetic of its own — see that module's header for the bug that rule
// exists to prevent.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, Printer, Mail, Send, Pencil, Info, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import { ui, mono, formatMoney, Modal } from './ui'
import { formatDocumentDate } from '../utils/formatDate'
import { ACTIVE_TENANT_ID } from '../tenant/activeTenantId'
import { ZoneRail } from './ZoneRail'
import { EdgeFadeRow } from './EdgeFadeRow'
import { PersistentDrawer } from './PersistentDrawer'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { ChevronsRight, ChevronsLeft } from 'lucide-react'
import { QuotationDocument, type QuotationDocumentItem, type FinishLabels } from '../components/quotation/QuotationDocument'
import {
  computeTotals,
  unitRate,
  listRate,
  commissionComponent,
  lineAmount,
  type PricingContext,
  type QuotationFunctionKey,
} from '../components/quotation/quotationMath'
import {
  persistQuotationScope,
  type QuotationSettings,
  type PersistableSession,
} from '../components/quotation/persistQuotation'
import type { CSSProperties } from 'react'

const EVENT_TYPES = [
  'Wedding Reception', 'Wedding Ceremony', 'Engagement', 'Puberty Function',
  'Baby Shower', 'Ear Piercing Ceremony', 'Housewarming', 'Birthday Celebration',
  'Anniversary', 'Corporate Event', 'Shop / Showroom Opening', 'Office Inauguration',
  'Brand Activation', 'Product Launch', 'Award Function', 'Temple Function',
]

// Community changes what actually gets built (a muhurtham backdrop instead
// of a mandapam, or no mandapam at all), so it is captured on the event step
// and left for the operator to act on. Optional, and never rendered on the
// client document.
const COMMUNITIES = ['Brahmin', 'Nadar', 'Other']

// Muhurtham is only offered for wedding-type events. Interpretation: the
// two event types whose names carry "Wedding". Every other type runs as a
// single function.
function supportsMuhurtham(eventType: string): boolean {
  return eventType.toLowerCase().includes('wedding')
}

// "Evening reception", never "night". Muhurtham is the morning slot.
const SLOT_LABELS: Record<'morning' | 'evening', string> = {
  morning: 'Morning',
  evening: 'Evening',
}

type Zone = { key: string; label: string; sort_order: number }
type SystemRow = { key: string; label: string; scales_with_finish: boolean; sort_order: number }
type FinishLevel = {
  key: string; label: string; description: string | null
  has_colour_variant: boolean; sort_order: number
}
type LibraryItem = { id: string; system: string; name: string; unit: string | null; default_rate: number | null; is_motion: boolean }

/** One row of the quotation's own frozen rate card. */
type SnapshotRate = {
  itemName: string
  unit: string
  curveKey: string | null
  anchorRate: number
  commissionFlat: number | null
}

type CartItem = {
  key: string
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
  source: 'library' | 'mockup_ai' | 'manual'
}

type SessionRow = { key: string; dayNumber: number; slot: 'morning' | 'evening' }

/** A mockup-extraction candidate. NOTHING enters the quotation until the
 *  operator ticks it and confirms — the user selects, the system does not
 *  decide. Checkboxes start UNCHECKED by design. */
type MockupCandidate = {
  key: string
  checked: boolean
  system: string
  label: string
  unit: string
  qty: number
  rate: number
  zoneKey: string | null
}

type ClientForm = { name: string; phone: string; email: string; address: string }
type EventForm = { type: string; date: string; venue: string; guestCount: string; notes: string }

// Widened from the original 380px column (phase 4 item 5): at 380 the header,
// line rows and footer read congested once real item names and finish
// selectors are in play.
const SUMMARY_DRAWER_WIDTH = 460

const inputStyle: CSSProperties = {
  width: '100%', padding: '9px 12px', border: `1px solid ${tokens.border}`,
  borderRadius: 6, fontFamily: fonts.body, fontSize: 14, color: t.text.primary,
  background: '#fff', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: CSSProperties = {
  fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: t.text.secondary,
  marginBottom: 6, display: 'block', letterSpacing: 0.2,
}

let sessionKeySeq = 0
function newSessionKey(): string {
  sessionKeySeq += 1
  return `sess-${sessionKeySeq}-${Date.now()}`
}

// Sessions render and persist in chronological order everywhere: by day,
// then Morning before Evening — never insertion order.
const SLOT_RANK: Record<'morning' | 'evening', number> = { morning: 0, evening: 1 }
function sortSessions(rows: SessionRow[]): SessionRow[] {
  return [...rows].sort(
    (a, z) => a.dayNumber - z.dayNumber || SLOT_RANK[a.slot] - SLOT_RANK[z.slot]
  )
}

/** Every day 1..dayCount holds at least one session (a new day defaults to
 *  one Evening session); days beyond the count are dropped; a day holds at
 *  most two sessions (default one, option to add a second). */
function normalizeSessions(dayCount: number, prev: SessionRow[]): SessionRow[] {
  const out: SessionRow[] = []
  for (let d = 1; d <= dayCount; d += 1) {
    const forDay = prev.filter((s) => s.dayNumber === d).slice(0, 2)
    if (forDay.length === 0) out.push({ key: newSessionKey(), dayNumber: d, slot: 'evening' })
    else out.push(...forDay)
  }
  return sortSessions(out)
}

/** Venue combobox: filter by typing, pick from the list, or keep a new name
 *  not on it — the new name persists as a venue row on save. */
function VenueCombobox({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  const [open, setOpen] = useState(false)
  const filtered = options.filter((o) => o.toLowerCase().includes(value.trim().toLowerCase()))
  const isNew = value.trim() !== '' && !options.some((o) => o.toLowerCase() === value.trim().toLowerCase())
  return (
    <div style={{ position: 'relative' }}>
      <input
        style={inputStyle}
        data-clarity-mask="True"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Type to search venues, or enter a new one"
      />
      {open && (filtered.length > 0 || isNew) && (
        <div style={styles.comboList}>
          {filtered.map((o) => (
            <button
              key={o}
              type="button"
              style={styles.comboOption}
              onMouseDown={(e) => { e.preventDefault(); onChange(o); setOpen(false) }}
            >
              {o}
            </button>
          ))}
          {isNew && (
            <div style={styles.comboNewNote}>
              “{value.trim()}” is not on the list — it will be saved as a new venue.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function QuotationBuilder() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'

  const [view, setView] = useState<'form' | 'builder' | 'preview'>('form')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  // Surfaced in the cart rail: the operator must be able to tell whether
  // what they are looking at has reached the database.
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const [quotationId, setQuotationId] = useState<string | null>(isNew ? null : id ?? null)
  const [quotationNumber, setQuotationNumber] = useState('')
  const [createdAt, setCreatedAt] = useState(new Date().toISOString())
  const [status, setStatus] = useState<'draft' | 'sent'>('draft')
  const [publicToken, setPublicToken] = useState<string | null>(null)

  const [client, setClient] = useState<ClientForm>({ name: '', phone: '', email: '', address: '' })
  const [eventInfo, setEventInfo] = useState<EventForm>({ type: '', date: '', venue: '', guestCount: '', notes: '' })
  const [community, setCommunity] = useState('')
  const [communityOther, setCommunityOther] = useState('')
  const [items, setItems] = useState<CartItem[]>([])

  // Days and sessions — explicit selection, never inferred from dates. A
  // day holds a LIST of sessions (the client confirmed one day can carry
  // more than one event).
  const [dayCount, setDayCount] = useState(1)
  const [sessions, setSessions] = useState<SessionRow[]>(() => normalizeSessions(1, []))

  // Tenant vocabulary, loaded not hardcoded.
  const [zones, setZones] = useState<Zone[]>([])
  const [systems, setSystems] = useState<SystemRow[]>([])
  const [finishLevels, setFinishLevels] = useState<FinishLevel[]>([])
  const [library, setLibrary] = useState<LibraryItem[]>([])
  const [venues, setVenues] = useState<string[]>([])

  // The quotation's OWN rate card, copied onto it at creation. Pricing
  // reads this and only this — never the global tables.
  const [snapshotRates, setSnapshotRates] = useState<SnapshotRate[]>([])
  const [ratios, setRatios] = useState<Record<string, Record<string, number>>>({})
  const [commissionPct, setCommissionPct] = useState(0)
  // No write may happen before the snapshot is in memory: a curved line
  // priced against an absent ratio computes 0, and an autosave firing in
  // that window would overwrite correct stored amounts with zeros.
  const [snapshotLoaded, setSnapshotLoaded] = useState(false)

  const [activeFunction, setActiveFunction] = useState<QuotationFunctionKey>('reception')
  const [activeZone, setActiveZone] = useState<string>('')
  const [hasMuhurtham, setHasMuhurtham] = useState(false)
  const [muhurthamReuse, setMuhurthamReuse] = useState<'retain_with_additions' | 'fully_changed' | ''>('')
  const [receptionFinish, setReceptionFinish] = useState('')
  const [muhurthamFinish, setMuhurthamFinish] = useState('')
  const [readymadeVariant, setReadymadeVariant] = useState<'with_red' | 'without_red' | ''>('')

  const [search, setSearch] = useState('')
  const [activeSystem, setActiveSystem] = useState('All')
  const [showManual, setShowManual] = useState(false)
  const [manualItem, setManualItem] = useState({ name: '', system: '', unit: 'per unit', rate: '', qty: '1' })

  // Disclosure on the intake form: venue, guests, community and notes sit
  // behind one quiet control. Auto-opened when an existing quotation
  // already carries any of them.
  const [showEventDetails, setShowEventDetails] = useState(false)
  const [missingNote, setMissingNote] = useState<string[]>([])

  // Days/sessions inline editor on the builder (summary always visible).
  const [editingDays, setEditingDays] = useState(false)

  // The finish/discount/advance/validity/GST controls collapse into one
  // "Quotation settings" group so the line list gets the panel height
  // (client feedback: two lines already clipped behind the finish block).
  const [showQuotationSettings, setShowQuotationSettings] = useState(false)

  // The id this session has already hydrated from the database. Set both on
  // load and immediately after insert, so the post-insert URL change never
  // triggers a reload that overwrites unsaved in-memory state.
  const loadedIdRef = useRef<string | null>(null)
  const [vocabLoaded, setVocabLoaded] = useState(false)

  const [mockupFile, setMockupFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [mockupNotice, setMockupNotice] = useState('')
  const [mockupCandidates, setMockupCandidates] = useState<MockupCandidate[]>([])
  const fileRef = useRef<HTMLInputElement>(null)
  // The quote summary lives in a non-modal drawer (PersistentDrawer), open by
  // default. Collapsing hands the full width back to the catalogue; a slim
  // tab (desktop) or bottom bar (mobile) keeps the item count and running
  // total visible and reopens it. Escape collapses (handled by the drawer).
  const [summaryOpen, setSummaryOpen] = useState(true)
  const { isMobile } = useBreakpoint()

  const [discount, setDiscount] = useState(0)
  const [advance, setAdvance] = useState(50)
  const [validDays, setValidDays] = useState(7)
  const [gstEnabled, setGstEnabled] = useState(false)

  // Vocabulary is tenant reference data: it depends on nothing in the URL
  // and is fetched exactly once.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const [zonesRes, systemsRes, finishRes, libRes, venuesRes] = await Promise.all([
        supabase.from('quotation_zones').select('key, label, sort_order').order('sort_order'),
        supabase.from('quotation_systems').select('key, label, scales_with_finish, sort_order').order('sort_order'),
        // internal_code is deliberately never selected: it carries the
        // operator's ratio shorthand and must not reach any rendered DOM.
        supabase.from('quotation_finish_levels').select('key, label, description, has_colour_variant, sort_order').order('sort_order'),
        supabase.from('quotation_item_library').select('id, system, name, unit, default_rate, is_motion').eq('is_active', true).order('sort_order'),
        supabase.from('quotation_venues').select('name').eq('is_active', true).order('name'),
      ])
      if (cancelled) return
      const finishRows = (finishRes.data ?? []) as FinishLevel[]
      setZones((zonesRes.data ?? []) as Zone[])
      setSystems((systemsRes.data ?? []) as SystemRow[])
      setFinishLevels(finishRows)
      setLibrary((libRes.data ?? []) as LibraryItem[])
      setVenues(((venuesRes.data ?? []) as { name: string }[]).map((v) => v.name))
      // Deliberately NO default active zone (see the zone strip note below).
      //
      // Both functions default to the middle of the ladder rather than the
      // cheapest or dearest, so an unset finish is never silently a pricing
      // decision. Functional updates, so a finish the operator has already
      // chosen (or one a loaded quotation supplied) is never overwritten by
      // this arriving late.
      const mid = finishRows[Math.floor(finishRows.length / 2)]
      if (mid) {
        setReceptionFinish((f) => f || mid.key)
        setMuhurthamFinish((f) => f || mid.key)
      }
      setVocabLoaded(true)
    })()
    return () => { cancelled = true }
  }, [])

  // The quotation's own rate-card snapshot, created by a DB trigger the
  // moment the quotation row is inserted, so it exists by the time this
  // effect can run for either a loaded or a freshly created quotation.
  useEffect(() => {
    if (!quotationId) return
    let cancelled = false
    void (async () => {
      const [ratesRes, stepsRes] = await Promise.all([
        supabase
          .from('quotation_snapshot_rates')
          .select('item_name, unit, curve_key, anchor_rate, commission_flat')
          .eq('quotation_id', quotationId)
          .order('unit'),
        supabase
          .from('quotation_snapshot_curve_steps')
          .select('curve_key, finish_level, ratio')
          .eq('quotation_id', quotationId),
      ])
      if (cancelled) return
      setSnapshotRates(
        ((ratesRes.data ?? []) as { item_name: string; unit: string; curve_key: string | null; anchor_rate: number; commission_flat: number | null }[]).map((r) => ({
          itemName: r.item_name,
          unit: r.unit,
          curveKey: r.curve_key,
          anchorRate: Number(r.anchor_rate),
          commissionFlat: r.commission_flat === null ? null : Number(r.commission_flat),
        }))
      )
      const map: Record<string, Record<string, number>> = {}
      for (const s of (stepsRes.data ?? []) as { curve_key: string; finish_level: string; ratio: number }[]) {
        if (!map[s.curve_key]) map[s.curve_key] = {}
        map[s.curve_key][s.finish_level] = Number(s.ratio)
      }
      setRatios(map)
      const ok = !ratesRes.error && !stepsRes.error
      setSnapshotLoaded(ok)
      // A failed snapshot fetch must be loud: with snapshotLoaded false
      // every save path is (correctly) blocked, and silence here would
      // let an hour of cart edits pile up with no way to store them.
      if (!ok) setError('Could not load this quotation’s rate card. Reload the page before editing.')
    })()
    return () => { cancelled = true }
  }, [quotationId])

  // Loading an EXISTING quotation. Guarded by loadedIdRef so it never runs
  // for a quotation this session created itself (the post-insert navigate
  // changes the :id param; without the guard the reload would write the
  // fresh row's NULLs over the operator's in-memory choices — the
  // NES-2026-1006 bug).
  useEffect(() => {
    if (isNew || !id) { setLoading(false); return }
    if (loadedIdRef.current === id) { setLoading(false); return }
    let cancelled = false
    void (async () => {
      const { data: q, error: qErr } = await supabase.from('quotations').select('*').eq('id', id).single()
      if (cancelled) return
      if (qErr || !q) {
        setError('Could not load this quotation.')
        setLoading(false)
        return
      }
      loadedIdRef.current = q.id
      setQuotationId(q.id)
      setQuotationNumber(q.quotation_number)
      setCreatedAt(q.created_at)
      setStatus(q.status)
      setPublicToken(q.public_token)
      setClient({
        name: q.client_name ?? '', phone: q.client_phone ?? '',
        email: q.client_email ?? '', address: q.client_address ?? '',
      })
      setEventInfo({
        type: q.event_type ?? '', date: q.event_date ?? '', venue: q.venue ?? '',
        guestCount: q.guest_count ? String(q.guest_count) : '', notes: q.notes ?? '',
      })
      setShowEventDetails(!!(q.venue || q.guest_count || q.community || q.notes))
      if (q.community) {
        setCommunity(COMMUNITIES.includes(q.community) ? q.community : 'Other')
        if (!COMMUNITIES.includes(q.community)) setCommunityOther(q.community)
      }
      setHasMuhurtham(!!q.has_muhurtham)
      setMuhurthamReuse(q.muhurtham_reuse ?? '')
      setReceptionFinish(q.reception_finish_key ?? '')
      setMuhurthamFinish(q.muhurtham_finish_key ?? '')
      setReadymadeVariant(q.readymade_variant ?? '')
      setDiscount(Number(q.discount_pct) || 0)
      setAdvance(Number(q.advance_pct) || 50)
      setValidDays(Number(q.validity_days) || 7)
      setGstEnabled(!!q.gst_enabled)
      setCommissionPct(Number(q.commission_pct) || 0)
      const loadedDayCount = Number(q.day_count) || 1
      setDayCount(loadedDayCount)

      const [{ data: itemRows }, { data: sessionRows }] = await Promise.all([
        supabase
          .from('quotation_items')
          .select('id, system, zone_key, function_key, label, unit, qty, rate, anchor_rate, curve_key, finish_level, commission_applied, commission_flat, note, gerbera_fill, source')
          .eq('quotation_id', id)
          .order('sort_order'),
        supabase
          .from('quotation_day_sessions')
          .select('id, day_number, slot')
          .eq('quotation_id', id)
          .order('day_number')
          .order('sort_order'),
      ])
      if (cancelled) return
      setItems(
        (itemRows ?? []).map((r) => ({
          key: r.id,
          functionKey: r.function_key as QuotationFunctionKey,
          zoneKey: r.zone_key,
          system: r.system,
          label: r.label,
          unit: r.unit,
          qty: Number(r.qty),
          // Lines from before the curve model carry no anchor; their
          // stored rate becomes a flat anchor so nothing changes value.
          anchorRate: r.anchor_rate !== null ? Number(r.anchor_rate) : Number(r.rate),
          curveKey: r.curve_key,
          finishLevel: r.finish_level,
          commissionApplied: r.commission_applied !== false,
          commissionFlat: r.commission_flat === null ? null : Number(r.commission_flat),
          note: r.note,
          gerberaFill: !!r.gerbera_fill,
          source: r.source,
        }))
      )
      setSessions(
        normalizeSessions(
          loadedDayCount,
          (sessionRows ?? []).map((s) => ({
            key: s.id as string,
            dayNumber: Number(s.day_number),
            slot: s.slot as 'morning' | 'evening',
          }))
        )
      )
      setView('builder')
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [id, isNew])

  // The one pricing context every rupee on this screen flows through: the
  // quotation's own snapshot ratios and its frozen commission percentage.
  const pricingCtx: PricingContext = useMemo(
    () => ({ ratios, commissionPct }),
    [ratios, commissionPct]
  )

  const totals = useMemo(
    () => computeTotals(items, pricingCtx, { discountPct: discount, advancePct: advance, gstEnabled }),
    [items, pricingCtx, discount, advance, gstEnabled]
  )

  const zoneLabel = useCallback((key: string | null) => zones.find((z) => z.key === key)?.label ?? '', [zones])
  const zoneOrder = useCallback((key: string | null) => zones.find((z) => z.key === key)?.sort_order ?? 999, [zones])
  const systemLabel = useCallback((key: string) => systems.find((s) => s.key === key)?.label ?? key, [systems])
  const finishLabel = useCallback((key: string) => finishLevels.find((f) => f.key === key)?.label ?? key, [finishLevels])
  const finishOrder = useCallback((key: string) => finishLevels.find((f) => f.key === key)?.sort_order ?? 999, [finishLevels])

  /** The finish levels a curve actually defines, in ladder order. The UI
   *  shows only these — a curve with no step for a level does not offer
   *  that level. */
  const curveLevels = useCallback(
    (curveKey: string) => Object.keys(ratios[curveKey] ?? {}).sort((a, b) => finishOrder(a) - finishOrder(b)),
    [ratios, finishOrder]
  )

  /** The level a curved line lands on when `wanted` is asked of it: the
   *  exact level when the curve defines it, otherwise the nearest defined
   *  step (ties go to the fuller finish). Never silently prices — a curve
   *  with no levels at all yields null, which renders as unpriced. */
  const resolveFinish = useCallback(
    (curveKey: string, wanted: string): string | null => {
      const levels = curveLevels(curveKey)
      if (levels.length === 0) return null
      if (levels.includes(wanted)) return wanted
      // No finish asked for at all (a stored NULL function finish): the
      // curve's fullest level, never a silent nearest-to-nothing pick.
      if (!wanted) return levels[0]
      const target = finishOrder(wanted)
      return levels.reduce((best, lvl) => {
        const d = Math.abs(finishOrder(lvl) - target)
        const bd = Math.abs(finishOrder(best) - target)
        if (d < bd) return lvl
        if (d === bd && finishOrder(lvl) < finishOrder(best)) return lvl
        return best
      }, levels[0])
    },
    [curveLevels, finishOrder]
  )

  // Nothing may enter the cart until the operator has said where it goes.
  const zoneChosen = activeZone !== ''

  // Unpriced lines cannot be sent. With curves this also catches a curved
  // line whose finish its curve does not define (prices at 0), so a data
  // mismatch is a visible TBC rather than a silent wrong number. Counted
  // across BOTH functions, because Send activates the whole quotation.
  const unpricedCount = items.filter((i) => unitRate(i, pricingCtx) <= 0).length
  const hasUnpriced = unpricedCount > 0

  // Required to create: client name, phone, event type. The date is
  // OPTIONAL in practice — muhurtham dates come from an astrologer and are
  // often unknown at first enquiry.
  const missingRequired = useMemo(() => {
    const missing: string[] = []
    if (!client.name.trim()) missing.push('client name')
    if (!client.phone.trim()) missing.push('phone number')
    if (!eventInfo.type) missing.push('event type')
    return missing
  }, [client.name, client.phone, eventInfo.type])

  const muhurthamAvailable = supportsMuhurtham(eventInfo.type)
  const twoFunction = muhurthamAvailable && hasMuhurtham

  // Switching muhurtham OFF (or changing the event type off Wedding) must
  // not strand its lines: they would stay in the totals and print on the
  // client document while the function switch that reveals them is hidden.
  // They move to the reception — visible, correctable, deletable — and
  // curved ones reprice at the reception's finish like any function move.
  useEffect(() => {
    if (twoFunction) return
    setActiveFunction('reception')
    setItems((prev) =>
      prev.some((i) => i.functionKey === 'muhurtham')
        ? prev.map((i) =>
            i.functionKey === 'muhurtham'
              ? {
                  ...i,
                  functionKey: 'reception' as QuotationFunctionKey,
                  finishLevel: i.curveKey
                    ? resolveFinish(i.curveKey, receptionFinish) ?? i.finishLevel
                    : i.finishLevel,
                }
              : i
          )
        : prev
    )
  }, [twoFunction, resolveFinish, receptionFinish])

  const activeFinishKey = activeFunction === 'muhurtham' ? muhurthamFinish : receptionFinish
  // Which finish offers a colour choice is tenant data, not a key this file
  // knows the name of.
  const colourVariantOffered =
    finishLevels.find((f) => f.key === activeFinishKey)?.has_colour_variant === true

  /** The function-level finish selector: sets the function's finish AND
   *  re-defaults every curved line in that function onto it (or the
   *  nearest level its curve defines). This is the "one selector
   *  recalculates all floral work" behaviour from the walkthrough; a line
   *  can still be deviated afterwards with its own selector. */
  const changeFunctionFinish = useCallback(
    (fn: QuotationFunctionKey, finishKey: string) => {
      if (fn === 'reception') setReceptionFinish(finishKey)
      else setMuhurthamFinish(finishKey)
      setItems((prev) =>
        prev.map((i) =>
          i.functionKey === fn && i.curveKey
            // ?? keeps the line's current finish if the snapshot hasn't
            // arrived yet (resolveFinish knows no levels then) — a remap
            // must never null a finish and silently price a line at 0.
            ? { ...i, finishLevel: resolveFinish(i.curveKey, finishKey) ?? i.finishLevel }
            : i
        )
      )
    },
    [resolveFinish]
  )

  /** Persists any new venue name so the next quotation offers it. */
  async function persistVenueIfNew() {
    const v = eventInfo.venue.trim()
    if (!v) return
    if (venues.some((n) => n.toLowerCase() === v.toLowerCase())) return
    // Unique-violation on a concurrent insert is harmless; ignore errors.
    await supabase.from('quotation_venues').insert({ name: v })
    setVenues((prev) => [...prev, v].sort((a, b) => a.localeCompare(b)))
  }

  async function saveSessions(qId: string): Promise<boolean> {
    const { error: delErr } = await supabase.from('quotation_day_sessions').delete().eq('quotation_id', qId)
    if (delErr) return false
    const rows = sessions.map((s, idx) => ({
      quotation_id: qId, day_number: s.dayNumber, slot: s.slot, sort_order: idx,
    }))
    if (rows.length === 0) return true
    const { error: sessErr } = await supabase.from('quotation_day_sessions').insert(rows)
    return !sessErr
  }

  async function saveClientEvent(): Promise<string | null> {
    setSaving(true)
    setError(null)
    await persistVenueIfNew()
    const resolvedCommunity = community === 'Other' ? communityOther.trim() || null : community || null
    const payload = {
      client_name: client.name.trim(),
      client_phone: client.phone.trim(),
      client_email: client.email.trim() || null,
      client_address: client.address.trim() || null,
      event_type: eventInfo.type,
      event_date: eventInfo.date || null,
      venue: eventInfo.venue.trim() || null,
      guest_count: eventInfo.guestCount ? Number(eventInfo.guestCount) : null,
      notes: eventInfo.notes.trim() || null,
      community: resolvedCommunity,
      day_count: dayCount,
      has_muhurtham: muhurthamAvailable && hasMuhurtham,
      // muhurtham_reuse is chosen on THIS step, so it has to be written by
      // this save (the NES-2026-1006 lesson).
      muhurtham_reuse:
        muhurthamAvailable && hasMuhurtham ? muhurthamReuse || null : null,
      // Carried so a freshly inserted row is never a row with no finish.
      reception_finish_key: receptionFinish || null,
      muhurtham_finish_key:
        muhurthamAvailable && hasMuhurtham ? muhurthamFinish || null : null,
    }
    if (quotationId) {
      const { error: upErr } = await supabase.from('quotations').update(payload).eq('id', quotationId)
      const sessionsOk = !upErr && (await saveSessions(quotationId))
      setSaving(false)
      if (upErr || !sessionsOk) {
        setError('Could not save. Try again.')
        return null
      }
      return quotationId
    }
    const { data: inserted, error: insErr } = await supabase
      .from('quotations')
      .insert(payload)
      .select('id, quotation_number, created_at, commission_pct')
      .single()
    if (insErr || !inserted) {
      setSaving(false)
      setError('Could not create the quotation. Try again.')
      return null
    }
    // Claim the id BEFORE navigating. The navigate below changes the :id
    // param, and without this the load effect would fetch the row we just
    // created and write its NULLs over the state that created it.
    loadedIdRef.current = inserted.id
    setQuotationId(inserted.id)
    setQuotationNumber(inserted.quotation_number)
    setCreatedAt(inserted.created_at)
    setCommissionPct(Number(inserted.commission_pct) || 0)
    const sessionsOk = await saveSessions(inserted.id)
    setSaving(false)
    if (!sessionsOk) {
      setError('Created, but the day sessions did not save. They will retry with the next change.')
    }
    navigate(`/portal/admin/quotations/${inserted.id}`, { replace: true })
    return inserted.id
  }

  // Everything this screen persists about scope and money, in one object,
  // so the autosave effect and the explicit saves cannot drift apart.
  const scopeSettings: QuotationSettings = useMemo(
    () => ({
      discountPct: discount,
      advancePct: advance,
      validityDays: validDays,
      gstEnabled,
      twoFunction,
      receptionFinishKey: receptionFinish,
      muhurthamFinishKey: muhurthamFinish,
      readymadeVariant,
      muhurthamReuse,
      dayCount,
    }),
    [discount, advance, validDays, gstEnabled, twoFunction, receptionFinish,
     muhurthamFinish, readymadeVariant, muhurthamReuse, dayCount]
  )

  const persistableSessions: PersistableSession[] = useMemo(
    () => sessions.map((s) => ({ dayNumber: s.dayNumber, slot: s.slot })),
    [sessions]
  )

  // The save chain — see saveScopeAndSettings below.
  const saveChainRef = useRef<Promise<boolean>>(Promise.resolve(true))

  // Note there is no `totals` argument. persistQuotationScope recomputes
  // every money value from the lines and the pricing context at write time,
  // so a stored total cannot disagree with the stored lines it came from.
  //
  // Saves are CHAINED on saveChainRef: the debounced autosave doesn't await
  // an in-flight save, and an explicit save can start while an autosave
  // timer is still armed — unserialized, an older save landing after a
  // newer one would win. Each queued save reads state from its call time.
  const saveScopeAndSettings = useCallback(
    (qId: string): Promise<boolean> => {
      const run = async (): Promise<boolean> => {
      // Same guard as the autosave effect, for the explicit save paths:
      // writing lines against an absent snapshot would store zeros.
      if (!snapshotLoaded) {
        setError('Still loading the rate card for this quotation. Try again in a moment.')
        return false
      }
      setSaveState('saving')
      const result = await persistQuotationScope(supabase, qId, items, pricingCtx, scopeSettings, persistableSessions)
      if (result.status === 'failed') {
        setSaveState('error')
        setError(
          result.stage === 'items'
            ? 'Could not save the line items. Try again.'
            : result.stage === 'sessions'
              ? 'Could not save the day sessions. Try again.'
              : 'Could not save the scope. Try again.'
        )
        return false
      }
      setSaveState('saved')
      setError(null)
      return true
      }
      const chained = saveChainRef.current.then(run, run)
      saveChainRef.current = chained
      return chained
    },
    [items, pricingCtx, scopeSettings, persistableSessions, snapshotLoaded]
  )

  // Autosave. The stored row is what the client's public link renders, so
  // any window where the screen and the database disagree is a window where
  // Newgen quotes one price on the phone and the client reads another.
  // Skipped until the quotation exists and the builder is actually showing.
  useEffect(() => {
    if (!quotationId || view !== 'builder' || !vocabLoaded || !snapshotLoaded) return
    setSaveState('dirty')
    const timer = setTimeout(() => { void saveScopeAndSettings(quotationId) }, 900)
    return () => clearTimeout(timer)
  }, [quotationId, view, vocabLoaded, snapshotLoaded, saveScopeAndSettings])

  async function handleContinueFromForm() {
    if (missingRequired.length > 0) {
      setMissingNote(missingRequired)
      return
    }
    setMissingNote([])
    const savedId = await saveClientEvent()
    if (savedId) setView('builder')
  }

  async function handleGoToPreview() {
    if (!quotationId) return
    if (await saveScopeAndSettings(quotationId)) setView('preview')
  }

  async function handleSend() {
    // Guarded here as well as on the button: activating the public link is
    // the irreversible step that puts a price in front of a client.
    if (!quotationId || hasUnpriced) return
    const expiresAt = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString()
    const { data, error: sendErr } = await supabase
      .from('quotations')
      .update({ status: 'sent', public_token_expires_at: expiresAt })
      .eq('id', quotationId)
      .select('status, public_token')
      .single()
    if (!sendErr && data) {
      setStatus(data.status as 'draft' | 'sent')
      setPublicToken(data.public_token)
    }
  }

  /** The snapshot rate rows for one item name, one per unit. */
  const ratesForItem = useCallback(
    (itemName: string) => snapshotRates.filter((r) => r.itemName === itemName),
    [snapshotRates]
  )

  /** The rate row an add should start from: the one matching the library
   *  item's own unit ('per sqft' matches the snapshot's 'sqft'), falling
   *  back to the first — never silently a different unit than the catalog
   *  shows when a matching one exists. */
  const defaultRateFor = useCallback(
    (itemName: string, libUnit: string | null): SnapshotRate | undefined => {
      const rates = ratesForItem(itemName)
      if (rates.length === 0) return undefined
      const norm = (u: string) => u.toLowerCase().replace(/^per\s+/, '').trim()
      const wanted = libUnit ? norm(libUnit) : ''
      return rates.find((r) => norm(r.unit) === wanted) ?? rates[0]
    },
    [ratesForItem]
  )

  /** Builds a cart line from a snapshot rate row (curved or flat). */
  const lineFromRate = useCallback(
    (base: Omit<CartItem, 'unit' | 'anchorRate' | 'curveKey' | 'finishLevel' | 'commissionFlat'>, sr: SnapshotRate): CartItem => {
      const fnFinish = base.functionKey === 'muhurtham' ? muhurthamFinish : receptionFinish
      return {
        ...base,
        unit: sr.unit,
        anchorRate: sr.anchorRate,
        curveKey: sr.curveKey,
        finishLevel: sr.curveKey ? resolveFinish(sr.curveKey, fnFinish) : null,
        commissionFlat: sr.commissionFlat,
      }
    },
    [muhurthamFinish, receptionFinish, resolveFinish]
  )

  function addLibraryItem(li: LibraryItem) {
    if (!activeZone) return
    setItems((prev) => {
      // Same element in the same zone AND the same function is a quantity
      // bump; the same element in another zone is a genuinely separate line.
      const match = prev.find(
        (i) => i.label === li.name && i.zoneKey === activeZone && i.functionKey === activeFunction
      )
      if (match) return prev.map((i) => (i === match ? { ...i, qty: i.qty + 1 } : i))
      const base = {
        key: `lib-${li.id}-${Date.now()}`,
        functionKey: activeFunction,
        zoneKey: activeZone,
        system: li.system,
        label: li.name,
        qty: 1,
        commissionApplied: true,
        note: null,
        gerberaFill: false,
        source: 'library' as const,
      }
      const sr = defaultRateFor(li.name, li.unit)
      if (sr) {
        return [...prev, lineFromRate(base, sr)]
      }
      return [
        ...prev,
        {
          ...base,
          unit: li.unit ?? 'per unit',
          anchorRate: Number(li.default_rate ?? 0),
          curveKey: null,
          finishLevel: null,
          commissionFlat: null,
        },
      ]
    })
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key))
  }
  // Recovery from a misfiling has to be a correction, not a rebuild.
  function moveItemZone(key: string, zoneKey: string | null) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, zoneKey } : i)))
  }
  // The finish is scoped to the function, so this is the move that can
  // change a line's money: a curved line re-defaults onto the destination
  // function's finish the moment it lands there.
  function moveItemFunction(key: string, functionKey: QuotationFunctionKey) {
    const fnFinish = functionKey === 'muhurtham' ? muhurthamFinish : receptionFinish
    setItems((prev) =>
      prev.map((i) =>
        i.key === key
          ? {
              ...i,
              functionKey,
              finishLevel: i.curveKey
                ? resolveFinish(i.curveKey, fnFinish) ?? i.finishLevel
                : i.finishLevel,
            }
          : i
      )
    )
  }
  function updateItemQty(key: string, qty: number) {
    if (qty < 1) return
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty } : i)))
  }
  // "Per quotation edits write to that copy": the editable number on a line
  // is its own anchor. The global card is untouched, and other lines keep
  // theirs.
  function updateItemAnchor(key: string, anchorRate: number) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, anchorRate } : i)))
  }
  function updateItemFinish(key: string, finishLevel: string) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, finishLevel } : i)))
  }
  function toggleItemCommission(key: string) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, commissionApplied: !i.commissionApplied } : i)))
  }
  /** Switching a line's unit swaps in that unit's anchor and curve from the
   *  quotation's snapshot (Stage garden per running foot and per sqft are
   *  different anchors on different curves). */
  function changeItemUnit(key: string, unit: string) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.key !== key) return i
        const sr = ratesForItem(i.label).find((r) => r.unit === unit)
        if (!sr) return { ...i, unit }
        const fnFinish = i.functionKey === 'muhurtham' ? muhurthamFinish : receptionFinish
        return {
          ...i,
          unit: sr.unit,
          anchorRate: sr.anchorRate,
          curveKey: sr.curveKey,
          commissionFlat: sr.commissionFlat,
          finishLevel: sr.curveKey
            ? resolveFinish(sr.curveKey, i.finishLevel ?? fnFinish)
            : null,
        }
      })
    )
  }
  function toggleGerbera(key: string) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, gerberaFill: !i.gerberaFill } : i)))
  }

  function addManualItem() {
    if (!manualItem.name.trim() || !manualItem.system || !activeZone) return
    setItems((prev) => [
      ...prev,
      {
        key: `manual-${Date.now()}`,
        functionKey: activeFunction,
        zoneKey: activeZone,
        system: manualItem.system,
        label: manualItem.name.trim(),
        unit: manualItem.unit || 'per unit',
        qty: Number(manualItem.qty) || 1,
        anchorRate: Number(manualItem.rate) || 0,
        curveKey: null,
        finishLevel: null,
        commissionApplied: true,
        commissionFlat: null,
        note: null,
        gerberaFill: false,
        source: 'manual',
      },
    ])
    setManualItem({ name: '', system: '', unit: 'per unit', rate: '', qty: '1' })
    setShowManual(false)
  }

  // Analysis produces CANDIDATES, not lines. Every row arrives unchecked;
  // nothing touches the quotation until the operator picks and confirms.
  // This is what the client asked for directly: upload a design, see the
  // ten to fifteen items come back, keep only the ones he picks.
  const analyzeMockup = useCallback(async () => {
    if (!mockupFile) return
    setAnalyzing(true)
    setMockupNotice('')
    setMockupCandidates([])
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(mockupFile)
      })
      const { data, error: fnErr } = await supabase.functions.invoke('analyze-quotation-mockup', {
        body: { image_base64: base64, media_type: mockupFile.type },
      })
      if (fnErr || !data || data.error) {
        setMockupNotice('Could not analyze the mockup. Add items manually.')
        setAnalyzing(false)
        return
      }
      const found = (data.data ?? []) as {
        system: string; label: string; unit: string; qty: number; rate: number; zone_key: string | null
      }[]
      setMockupCandidates(
        found.map((f, idx) => ({
          key: `cand-${idx}-${Date.now()}`,
          checked: false,
          system: systems.some((s) => s.key === f.system) ? f.system : (systems[0]?.key ?? ''),
          label: f.label,
          unit: f.unit || 'per unit',
          qty: f.qty || 1,
          rate: Number(f.rate) || 0,
          zoneKey: f.zone_key && zones.some((z) => z.key === f.zone_key) ? f.zone_key : null,
        }))
      )
      setMockupNotice(
        found.length === 0
          ? 'No elements identified in this mockup.'
          : `${found.length} candidate${found.length === 1 ? '' : 's'} identified. Tick the ones to add. Nothing is added until you confirm.`
      )
    } catch {
      setMockupNotice('Could not analyze the mockup. Add items manually.')
    }
    setAnalyzing(false)
  }, [mockupFile, zones, systems])

  function toggleCandidate(key: string) {
    setMockupCandidates((prev) => prev.map((c) => (c.key === key ? { ...c, checked: !c.checked } : c)))
  }
  function setCandidateZone(key: string, zoneKey: string | null) {
    setMockupCandidates((prev) => prev.map((c) => (c.key === key ? { ...c, zoneKey } : c)))
  }

  const checkedCandidateCount = mockupCandidates.filter((c) => c.checked).length

  function addSelectedCandidates() {
    const chosen = mockupCandidates.filter((c) => c.checked)
    if (chosen.length === 0) return
    setItems((prev) => {
      const combined = [...prev]
      for (const c of chosen) {
        // Land in the candidate's zone, else the active zone, else
        // unassigned — an honest prompt instead of a silent misfiling.
        const zoneKey = c.zoneKey ?? (activeZone || null)
        const dupe = combined.find(
          (i) => i.label === c.label && i.zoneKey === zoneKey && i.functionKey === activeFunction
        )
        if (dupe) continue
        const base = {
          key: `ai-${c.label}-${zoneKey}-${Date.now()}`,
          functionKey: activeFunction,
          zoneKey,
          system: c.system,
          label: c.label,
          qty: c.qty,
          commissionApplied: true,
          note: null,
          gerberaFill: false,
          source: 'mockup_ai' as const,
        }
        // A candidate matching a rate-card item prices from the snapshot;
        // anything else lands flat at the analyser's guess for review.
        const sr = defaultRateFor(c.label, c.unit)
        if (sr) combined.push(lineFromRate(base, sr))
        else combined.push({ ...base, unit: c.unit, anchorRate: c.rate, curveKey: null, finishLevel: null, commissionFlat: null })
      }
      return combined
    })
    setMockupCandidates([])
    setMockupNotice(`${chosen.length} item${chosen.length === 1 ? '' : 's'} added. Review zones and rates in the cart.`)
  }

  const filteredLibrary = library.filter((li) => {
    const matchSystem = activeSystem === 'All' || li.system === activeSystem
    const matchSearch = li.name.toLowerCase().includes(search.toLowerCase())
    return matchSystem && matchSearch
  })

  // Quick mitigation for the seventy-row flat list (the full catalogue
  // treatment stays parked): sticky group headings in the existing system
  // order, priced items above rate-TBC within each group. Array.sort is
  // stable, so equal-priced items keep their seeded order.
  const groupedLibrary = useMemo(() => {
    const isPriced = (li: LibraryItem) =>
      defaultRateFor(li.name, li.unit) !== undefined || Number(li.default_rate) > 0
    return systems
      .map((sys) => ({
        key: sys.key,
        label: sys.label,
        items: [...filteredLibrary.filter((li) => li.system === sys.key)]
          .sort((a, b) => Number(isPriced(b)) - Number(isPriced(a))),
      }))
      .filter((g) => g.items.length > 0)
    // filteredLibrary is derived fresh each render; this memo keys off its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systems, library, activeSystem, search, defaultRateFor])

  const functionItems = items.filter((i) => i.functionKey === activeFunction)
  const countByZone = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const i of functionItems) if (i.zoneKey) counts[i.zoneKey] = (counts[i.zoneKey] ?? 0) + 1
    return counts
  }, [functionItems])

  // Cart, grouped by zone in quoting order.
  const cartGroups = useMemo(() => {
    const groups = new Map<string, { key: string; label: string; order: number; items: CartItem[] }>()
    for (const item of functionItems) {
      const key = item.zoneKey ?? '__unzoned__'
      const g = groups.get(key)
      if (g) g.items.push(item)
      else groups.set(key, {
        key,
        label: item.zoneKey ? zoneLabel(item.zoneKey) : 'Unassigned',
        order: item.zoneKey ? zoneOrder(item.zoneKey) : 9999,
        items: [item],
      })
    }
    return [...groups.values()].sort((a, b) => a.order - b.order)
  }, [functionItems, zoneLabel, zoneOrder])

  const docItems: QuotationDocumentItem[] = items.map((it) => ({
    functionKey: it.functionKey,
    zoneKey: it.zoneKey,
    zoneLabel: it.zoneKey ? zoneLabel(it.zoneKey) : null,
    zoneOrder: zoneOrder(it.zoneKey),
    system: it.system,
    label: it.label,
    unit: it.unit,
    qty: it.qty,
    rate: unitRate(it, pricingCtx),
    amount: lineAmount(it, pricingCtx),
    note: it.note,
    finishLabel: it.curveKey && it.finishLevel ? finishLabel(it.finishLevel) : null,
  }))

  // The two client-facing sentences for the reuse decision, matching
  // get_quotation_by_token's mapping exactly so the admin preview and the
  // public page cannot word the same commitment differently.
  const MUHURTHAM_REUSE_LABELS: Record<string, string> = {
    retain_with_additions: 'Reception setup retained, with additions',
    fully_changed: 'Setup fully changed for the muhurtham',
  }
  const muhurthamReuseLabel =
    twoFunction && muhurthamReuse ? MUHURTHAM_REUSE_LABELS[muhurthamReuse] ?? null : null

  const finishLabels: FinishLabels = {
    reception: finishLevels.find((f) => f.key === receptionFinish)?.label ?? null,
    muhurtham: twoFunction ? finishLevels.find((f) => f.key === muhurthamFinish)?.label ?? null : null,
  }

  const sessionsSummary = useMemo(() => {
    const parts: string[] = []
    for (let d = 1; d <= dayCount; d += 1) {
      const forDay = sessions.filter((s) => s.dayNumber === d)
      if (forDay.length === 0) continue
      parts.push(`Day ${d}: ${forDay.map((s) => SLOT_LABELS[s.slot]).join(' + ')}`)
    }
    return parts.join(' · ')
  }, [dayCount, sessions])

  function setDayCountNormalized(n: number) {
    setDayCount(n)
    setSessions((prev) => normalizeSessions(n, prev))
  }
  function addSessionToDay(dayNumber: number) {
    setSessions((prev) => {
      const forDay = prev.filter((s) => s.dayNumber === dayNumber)
      if (forDay.length >= 2) return prev
      const slot = forDay.some((s) => s.slot === 'evening') ? 'morning' : 'evening'
      return sortSessions([...prev, { key: newSessionKey(), dayNumber, slot: slot as 'morning' | 'evening' }])
    })
  }
  function removeSession(key: string) {
    setSessions((prev) => {
      const target = prev.find((s) => s.key === key)
      if (!target) return prev
      // A day always keeps at least one session.
      if (prev.filter((s) => s.dayNumber === target.dayNumber).length <= 1) return prev
      return prev.filter((s) => s.key !== key)
    })
  }
  function setSessionSlot(key: string, slot: 'morning' | 'evening') {
    setSessions((prev) => sortSessions(prev.map((s) => (s.key === key ? { ...s, slot } : s))))
  }

  // Days and sessions controls — shared between the intake form's own step
  // and the builder's always-visible strip.
  function renderDaysSessions(compact: boolean) {
    return (
      <div>
        <div style={{ display: 'flex', gap: 6, marginBottom: compact ? 8 : 12 }}>
          {[1, 2, 3].map((n) => {
            const isActive = dayCount === n
            return (
              <button
                key={n}
                type="button"
                onClick={() => setDayCountNormalized(n)}
                style={{
                  padding: compact ? '5px 12px' : '8px 18px', borderRadius: 6, cursor: 'pointer',
                  fontFamily: fonts.body, fontSize: compact ? 12 : 13, fontWeight: isActive ? 700 : 500,
                  background: isActive ? tokens.primary : '#fff',
                  color: isActive ? tokens.gold : t.text.secondary,
                  border: `1px solid ${isActive ? tokens.primary : tokens.border}`,
                }}
              >
                {n} day{n > 1 ? 's' : ''}
              </button>
            )
          })}
        </div>
        {Array.from({ length: dayCount }, (_, idx) => idx + 1).map((d) => {
          const forDay = sessions.filter((s) => s.dayNumber === d)
          return (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 700, color: tokens.primary, width: 46 }}>Day {d}</span>
              {forDay.map((s) => (
                <span key={s.key} style={styles.sessionChip}>
                  <select
                    value={s.slot}
                    onChange={(e) => setSessionSlot(s.key, e.target.value as 'morning' | 'evening')}
                    style={styles.sessionSelect}
                  >
                    <option value="morning">{SLOT_LABELS.morning}</option>
                    <option value="evening">{SLOT_LABELS.evening}</option>
                  </select>
                  {forDay.length > 1 && (
                    <button type="button" style={styles.removeBtn} onClick={() => removeSession(s.key)} title="Remove this session">×</button>
                  )}
                </span>
              ))}
              {forDay.length < 2 && (
                <button type="button" style={styles.linkBtn} onClick={() => addSessionToDay(d)}>
                  + add a session
                </button>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) return <p style={ui.muted}>Loading...</p>

  // ── PREVIEW ──────────────────────────────────────────────────────────
  if (view === 'preview' && quotationId) {
    const publicUrl = publicToken ? `${window.location.origin}/quotation/${publicToken}` : null
    return (
      <div>
        <div style={styles.previewToolbar} className="no-print">
          <button type="button" style={styles.toolbarBtnGhost} onClick={() => setView('builder')}>
            <ArrowLeft size={14} /> Edit
          </button>
          <button type="button" style={styles.toolbarBtnPrimary} onClick={() => window.print()}>
            <Printer size={14} /> Print / Save PDF
          </button>
          {client.email && !hasUnpriced && (
            <a
              style={styles.toolbarBtnGhost}
              href={`mailto:${client.email}?subject=${encodeURIComponent(`Quotation ${quotationNumber} - ${eventInfo.type} - Newgen Event Studio`)}&body=${encodeURIComponent(
                `Dear ${client.name},\n\nPlease find your quotation ${quotationNumber} for ${eventInfo.type}${eventInfo.date ? ` on ${formatDocumentDate(eventInfo.date)}` : ''}${eventInfo.venue ? ` at ${eventInfo.venue}` : ''}.\n\nTotal: ${formatMoney(totals.total, 'INR')}\nAdvance (${advance}%): ${formatMoney(totals.advanceAmount, 'INR')}\nValid for ${validDays} days.\n\nWarm regards,\nNewgen Event Studio\nWhatsApp: 9176045045`
              )}`}
            >
              <Mail size={14} /> Send via Email
            </a>
          )}
          {status === 'draft' ? (
            <button
              type="button"
              disabled={hasUnpriced}
              title={hasUnpriced ? 'Every line needs a rate before this can be sent' : undefined}
              style={{
                ...styles.toolbarBtnPrimary,
                background: hasUnpriced ? '#C8C4BC' : tokens.primary,
                color: hasUnpriced ? '#999' : tokens.gold,
                cursor: hasUnpriced ? 'not-allowed' : 'pointer',
              }}
              onClick={() => void handleSend()}
            >
              <Send size={14} /> Send (activate link)
            </button>
          ) : (
            publicUrl && <span style={styles.publicLink}>{publicUrl}</span>
          )}
          {/* Preview and Print stay available on an unpriced draft on
              purpose: printing the draft to walk Mohan through it and collect
              the missing rates is a real step in how these get built. Only
              the two paths that put the document in front of a *client* —
              the public link and the client email — are held back. */}
          {hasUnpriced && (
            <span style={styles.sendBlockedNote}>
              {unpricedCount} {unpricedCount === 1 ? 'line still needs' : 'lines still need'} a rate before this can be sent
            </span>
          )}
        </div>
        <div style={{ padding: '24px 0' }}>
          <QuotationDocument
            tenantId={ACTIVE_TENANT_ID}
            finishLabels={finishLabels}
            quotation={{
              quotation_number: quotationNumber,
              created_at: createdAt,
              client_name: client.name,
              client_phone: client.phone,
              client_email: client.email || null,
              client_address: client.address || null,
              event_type: eventInfo.type,
              event_date: eventInfo.date || null,
              venue: eventInfo.venue || null,
              guest_count: eventInfo.guestCount ? Number(eventInfo.guestCount) : null,
              discount_pct: discount,
              advance_pct: advance,
              validity_days: validDays,
              gst_enabled: gstEnabled,
              has_muhurtham: twoFunction,
              day_count: dayCount,
              subtotal: totals.subtotal,
              discount_amount: totals.discountAmount,
              gst_amount: totals.gstAmount,
              total_amount: totals.total,
              advance_amount: totals.advanceAmount,
            }}
            items={docItems}
            muhurthamReuseLabel={muhurthamReuseLabel}
            sessions={sessions.map((x) => ({ day_number: x.dayNumber, slot: x.slot }))}
          />
        </div>
      </div>
    )
  }

  // ── CLIENT + EVENT FORM ─────────────────────────────────────────────
  // Disclosed by importance, not by sequence: the four-field client grid,
  // then event type + date, with the rest behind one quiet control. NOT a
  // one-field-at-a-time flow — the operator runs this many times a day on
  // phone calls, receiving answers out of order.
  if (view === 'form') {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {error && <div style={styles.error}>{error}</div>}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: fonts.body, fontSize: 22, fontWeight: 700, color: tokens.primary, marginBottom: 4 }}>New Quotation</div>
          <div style={{ fontFamily: fonts.body, fontSize: 14, color: t.text.tertiary }}>Fill in client and event details to get started.</div>
        </div>

        <section className="ec-squircle" style={styles.formCard}>
          <div style={styles.formCardTitle}>CLIENT INFORMATION</div>
          <div style={styles.formGrid}>
            <div>
              <label style={labelStyle}>Client Name *</label>
              <input style={inputStyle} data-clarity-mask="True" value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} placeholder="Full name" />
            </div>
            <div>
              <label style={labelStyle}>Phone Number *</label>
              <input style={inputStyle} data-clarity-mask="True" value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} placeholder="9876543210" />
            </div>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input style={inputStyle} data-clarity-mask="True" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div>
              <label style={labelStyle}>Address / City</label>
              <input style={inputStyle} data-clarity-mask="True" value={client.address} onChange={(e) => setClient({ ...client, address: e.target.value })} placeholder="Area, City" />
            </div>
          </div>
        </section>

        <section className="ec-squircle" style={styles.formCard}>
          <div style={styles.formCardTitle}>EVENT INFORMATION</div>
          <div style={styles.formGrid}>
            <div>
              <label style={labelStyle}>Event Type *</label>
              <select style={inputStyle} value={eventInfo.type} onChange={(e) => setEventInfo({ ...eventInfo, type: e.target.value })}>
                <option value="">Select event type</option>
                {EVENT_TYPES.map((t2) => <option key={t2}>{t2}</option>)}
              </select>
            </div>
            <div>
              {/* Optional in practice: muhurtham dates come from an
                  astrologer and are often unknown at first enquiry. */}
              <label style={labelStyle}>Event Date</label>
              <input type="date" style={inputStyle} data-clarity-mask="True" value={eventInfo.date} onChange={(e) => setEventInfo({ ...eventInfo, date: e.target.value })} />
            </div>
          </div>

          {!showEventDetails ? (
            <button type="button" style={styles.disclosureBtn} onClick={() => setShowEventDetails(true)}>
              + Add event details (venue, guests, community, notes)
            </button>
          ) : (
            <div style={{ ...styles.formGrid, marginTop: 16 }}>
              <div>
                <label style={labelStyle}>Venue</label>
                <VenueCombobox
                  value={eventInfo.venue}
                  onChange={(v) => setEventInfo({ ...eventInfo, venue: v })}
                  options={venues}
                />
              </div>
              <div>
                <label style={labelStyle}>Expected Guests</label>
                <input style={inputStyle} value={eventInfo.guestCount} onChange={(e) => setEventInfo({ ...eventInfo, guestCount: e.target.value })} placeholder="e.g. 300" />
              </div>
              <div>
                <label style={labelStyle}>Community</label>
                <select style={inputStyle} value={community} onChange={(e) => setCommunity(e.target.value)}>
                  <option value="">Not specified</option>
                  {COMMUNITIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              {community === 'Other' && (
                <div>
                  <label style={labelStyle}>Community (specify)</label>
                  <input style={inputStyle} value={communityOther} onChange={(e) => setCommunityOther(e.target.value)} placeholder="Community name" />
                </div>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Special Requirements / Notes</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} data-clarity-mask="True" rows={3} value={eventInfo.notes} onChange={(e) => setEventInfo({ ...eventInfo, notes: e.target.value })} placeholder="Theme preferences, specific requirements, or client notes" />
              </div>
            </div>
          )}

          {muhurthamAvailable && (
            <div style={styles.muhurthamBox}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={hasMuhurtham} onChange={(e) => setHasMuhurtham(e.target.checked)} style={{ width: 15, height: 15, accentColor: tokens.primary }} />
                <span style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: tokens.primary }}>
                  This quotation includes a Muhurtham
                </span>
              </label>
              <div style={{ fontFamily: fonts.body, fontSize: 12, color: t.text.tertiary, marginTop: 6, lineHeight: 1.5 }}>
                Muhurtham is quoted as its own function with its own finish, not as a variation of the reception.
              </div>
              {hasMuhurtham && (
                <div style={{ marginTop: 12 }}>
                  <label style={labelStyle}>Is the reception setup retained with additions, or fully changed?</label>
                  <select style={inputStyle} value={muhurthamReuse} onChange={(e) => setMuhurthamReuse(e.target.value as typeof muhurthamReuse)}>
                    <option value="">Not decided yet</option>
                    <option value="retain_with_additions">Retained with additions</option>
                    <option value="fully_changed">Fully changed</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </section>

        {/* The one part that earns its own step: the number of days
            determines how many session controls appear. */}
        <section className="ec-squircle" style={styles.formCard}>
          <div style={styles.formCardTitle}>DAYS AND SESSIONS</div>
          <div style={{ fontFamily: fonts.body, fontSize: 12, color: t.text.tertiary, margin: '8px 0 14px', lineHeight: 1.5 }}>
            One day can carry more than one event. Muhurtham is the morning slot; the reception is the evening.
          </div>
          {renderDaysSessions(false)}
        </section>

        {/* Not a grey refusal: the button carries a live count of what
            remains, and tapping it names the missing fields. */}
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleContinueFromForm()}
          style={{
            width: '100%', padding: 14,
            background: missingRequired.length === 0 ? tokens.primary : `${tokens.primary}CC`,
            color: tokens.gold,
            border: 'none', cursor: 'pointer',
            fontFamily: fonts.body, fontSize: 15, fontWeight: 700, borderRadius: 6,
          }}
        >
          {saving
            ? 'Saving...'
            : missingRequired.length === 0
              ? 'Build the Scope →'
              : `${missingRequired.length} detail${missingRequired.length === 1 ? '' : 's'} to go`}
        </button>
        {missingRequired.length > 0 && (
          <div style={{
            fontFamily: fonts.body, fontSize: 12, textAlign: 'center', marginTop: 8,
            color: missingNote.length > 0 ? tokens.ruby : t.text.tertiary,
            fontWeight: missingNote.length > 0 ? 600 : 400,
          }}>
            Still needed: {missingRequired.join(', ')}
          </div>
        )}
      </div>
    )
  }

  // ── BUILDER ──────────────────────────────────────────────────────────
  return (
    <div
      style={{
        // The open drawer's width is taken FROM the catalogue, not laid over
        // it; collapsing hands it back (Eswar, build 4 revision).
        paddingRight: !isMobile && summaryOpen ? SUMMARY_DRAWER_WIDTH + 20 : 0,
        transition: 'padding-right 0.28s ease',
      }}
    >
      {error && <div style={styles.error}>{error}</div>}

      {/* Page header. One H1 only: the event type. The venue is the H2.
          Everything else is supporting metadata — visual prominence does
          not have to follow heading level. */}
      <header style={{ marginBottom: 12, position: 'relative' }}>
        {/* One pencil, top right: general details (title, venue, client
            contact). Days and sessions have their own entry point, the
            ruby chip below (phase 5 items 4, 5, 11). */}
        <button
          type="button"
          style={styles.headerEditBtn}
          onClick={() => setView('form')}
          aria-label="Edit event details"
          title="Edit event details"
        >
          <Pencil size={15} />
        </button>
        <h1 style={styles.pageH1}>{eventInfo.type || 'Quotation'}</h1>
        {eventInfo.venue.trim() !== '' && <h2 style={styles.pageH2}>{eventInfo.venue.trim()}</h2>}
        <div style={styles.headerMeta} data-clarity-mask="True">
          {quotationNumber && <span style={{ fontFamily: mono }}>{quotationNumber}</span>}
          {/* The chip IS the tap target for the day/session editor. */}
          <button
            type="button"
            className="ec-squircle"
            style={styles.daysChip}
            onClick={() => setEditingDays(true)}
            aria-haspopup="dialog"
            title="Edit days and sessions"
          >
            {[
              eventInfo.date ? formatDocumentDate(eventInfo.date) : null,
              `${dayCount} day${dayCount > 1 ? 's' : ''}`,
              sessionsSummary || null,
            ].filter(Boolean).join(' · ')}
          </button>
          <span>{client.name}{client.phone ? ` · ${client.phone}` : ''}</span>
        </div>
      </header>

      {editingDays && (
        <Modal title="Days and sessions" onClose={() => setEditingDays(false)}>
          {renderDaysSessions(true)}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button type="button" style={ui.primaryBtn} onClick={() => setEditingDays(false)}>
              Done
            </button>
          </div>
        </Modal>
      )}

      {/* The function switch and the zone strip together answer "where is
          the next tap going to land", so they stay pinned while the operator
          works down the element list. top: 56 clears the sticky TopBar. */}
      <div className="ec-squircle" style={styles.placementBar}>
      {twoFunction && (
        <div style={styles.functionSwitch}>
          {(['reception', 'muhurtham'] as QuotationFunctionKey[]).map((fn) => {
            const count = items.filter((i) => i.functionKey === fn).length
            const isActive = activeFunction === fn
            return (
              <button
                key={fn}
                type="button"
                onClick={() => setActiveFunction(fn)}
                style={{
                  flex: 1, padding: '10px 16px', border: 'none', cursor: 'pointer',
                  background: isActive ? tokens.primary : 'transparent',
                  color: isActive ? tokens.gold : t.text.secondary,
                  fontFamily: fonts.body, fontSize: 14, fontWeight: isActive ? 700 : 500,
                  borderRadius: 6,
                }}
              >
                {fn === 'reception' ? 'Reception' : 'Muhurtham'}
                {count > 0 && <span style={{ marginLeft: 8, opacity: 0.8, fontSize: 12 }}>{count}</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* Zone rail — the venue walk as a scrollable row of icon tiles
          (docs/Newgen_Zone_Rail_Spec.md). All 14 zones stay within reach;
          an empty one is a prompt, not clutter. */}
      <ZoneRail
        zones={zones}
        countByZone={countByZone}
        activeZone={activeZone}
        onSelect={(key) => setActiveZone(activeZone === key ? '' : key)}
      />

        {/* The reason the add controls are inert, stated where the operator
            is looking rather than left to be inferred from a greyed-out UI. */}
        {!zoneChosen ? (
          // Plain helper text, not a box: the old bordered treatment read
          // as an input to type into (phase 5 item 2).
          <div style={styles.zonePrompt}>
            <Info size={13} aria-hidden="true" />
            Pick a zone to start adding elements.
          </div>
        ) : (
          <div style={styles.zoneActiveNote}>
            Adding to <strong style={{ fontWeight: 700 }}>{zoneLabel(activeZone)}</strong>
            {twoFunction ? ` · ${activeFunction === 'reception' ? 'Reception' : 'Muhurtham'}` : ''}
            {' · '}
            <button type="button" style={styles.linkBtn} onClick={() => setActiveZone('')}>clear</button>
          </div>
        )}
      </div>

      <div>
        {/* Element catalog — full width; the summary drawer's space is
            reserved by the page-level paddingRight while it is open. */}
        <div>
          <div className="ec-squircle" style={styles.mockupCard}>
            <div style={styles.formCardTitle}>ANALYSE A MOCKUP</div>
            <div style={{ fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary, margin: '6px 0 12px', lineHeight: 1.5 }}>
              Upload a concept image to identify elements. Analysis returns a candidate list,
              and you pick which ones to add. Nothing lands in the quotation until you confirm.
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => setMockupFile(e.target.files?.[0] ?? null)} />
              <button type="button" style={styles.chooseBtn} onClick={() => fileRef.current?.click()}>
                {mockupFile ? mockupFile.name.slice(0, 22) + '…' : 'Choose Image'}
              </button>
              <button
                type="button"
                disabled={!mockupFile || analyzing}
                style={{ ...styles.toolbarBtnPrimary, opacity: !mockupFile || analyzing ? 0.5 : 1 }}
                onClick={() => void analyzeMockup()}
              >
                {analyzing ? 'Analysing…' : 'Analyse'}
              </button>
            </div>
            {mockupNotice && <div style={styles.mockupNotice}>{mockupNotice}</div>}

            {mockupCandidates.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {mockupCandidates.map((c) => (
                  <div key={c.key} style={styles.candidateRow}>
                    <input
                      type="checkbox"
                      checked={c.checked}
                      onChange={() => toggleCandidate(c.key)}
                      style={{ width: 15, height: 15, accentColor: tokens.primary, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: t.text.primary }}>
                        {c.label}
                        <span style={{ fontWeight: 400, color: t.text.tertiary }}> · {systemLabel(c.system)} · qty {c.qty}</span>
                      </div>
                    </div>
                    <select
                      value={c.zoneKey ?? ''}
                      onChange={(e) => setCandidateZone(c.key, e.target.value || null)}
                      title="Zone this candidate would land in"
                      style={styles.moveSelect}
                    >
                      <option value="">Unassigned</option>
                      {zones.map((z) => (
                        <option key={z.key} value={z.key}>{z.sort_order}. {z.label}</option>
                      ))}
                    </select>
                    <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: ratesForItem(c.label).length > 0 ? tokens.goldDark : t.text.muted, width: 84, textAlign: 'right' }}>
                      {ratesForItem(c.label).length > 0
                        ? 'rate card'
                        : c.rate > 0 ? formatMoney(c.rate, 'INR') : 'rate TBC'}
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                  <button
                    type="button"
                    disabled={checkedCandidateCount === 0}
                    style={{ ...styles.toolbarBtnPrimary, opacity: checkedCandidateCount === 0 ? 0.5 : 1 }}
                    onClick={addSelectedCandidates}
                  >
                    Add selected ({checkedCandidateCount})
                  </button>
                  <button type="button" style={styles.toolbarBtnGhost} onClick={() => { setMockupCandidates([]); setMockupNotice('') }}>
                    Discard all
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={15} color={t.text.tertiary} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} aria-hidden="true" />
            <input style={{ ...inputStyle, paddingLeft: 34 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search all elements…" />
          </div>

          {/* One scrollable line, never a second row: same edge-fade
              mechanic as the zone rail (Eswar, build 4). Chip styling is
              unchanged; only the wrapping behaviour differs. */}
          <div style={{ marginBottom: 12 }}>
            <EdgeFadeRow fadeColor={tokens.bg} gap={6} ariaLabel="Element categories" updateKey={systems.length}>
              {['All', ...systems.map((s) => s.key)].map((key) => {
                const label = key === 'All' ? 'All' : systemLabel(key)
                const isActive = activeSystem === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveSystem(key)}
                    style={{
                      padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                      fontFamily: fonts.body, fontSize: 12, fontWeight: isActive ? 600 : 400,
                      background: isActive ? tokens.primary : '#fff',
                      color: isActive ? tokens.gold : t.text.secondary,
                      border: `1px solid ${isActive ? tokens.primary : tokens.border}`,
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </EdgeFadeRow>
          </div>

          <div style={styles.catalogueScroll}>
            {groupedLibrary.map((group) => (
              <div key={group.key}>
                <div className="ec-squircle" style={styles.catalogueGroupHeading}>{group.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                  {group.items.map((li) => {
                    const isAdded = zoneChosen && functionItems.some((i) => i.label === li.name && i.zoneKey === activeZone)
                    const rates = ratesForItem(li.name)
                    const sr = defaultRateFor(li.name, li.unit)
                    // The EFFECTIVE price at the active function's current
                    // finish — the figure adding this item actually lands
                    // at — not the anchor. Recomputes when the finish
                    // changes; a null-curve rate stays flat.
                    const rowPrice = sr
                      ? listRate(
                          {
                            qty: 1,
                            anchorRate: sr.anchorRate,
                            curveKey: sr.curveKey,
                            finishLevel: sr.curveKey ? resolveFinish(sr.curveKey, activeFinishKey) : null,
                            commissionApplied: true,
                            commissionFlat: sr.commissionFlat,
                          },
                          pricingCtx
                        )
                      : Number(li.default_rate ?? 0)
                    return (
                      <div
                        key={li.id}
                        onClick={() => addLibraryItem(li)}
                        title={zoneChosen ? undefined : 'Pick a zone first'}
                        aria-disabled={!zoneChosen}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '11px 14px', borderRadius: 6,
                          cursor: zoneChosen ? 'pointer' : 'not-allowed',
                          opacity: zoneChosen ? 1 : 0.55,
                          background: isAdded ? `${tokens.primary}15` : '#fff',
                          border: `1px solid ${isAdded ? tokens.primary : tokens.border}`,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: isAdded ? 600 : 400, color: t.text.primary }}>
                            {li.name}
                            {li.is_motion && <span style={styles.motionTag}>motor</span>}
                          </div>
                          <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.text.tertiary, marginTop: 2 }}>
                            {systemLabel(li.system)}
                            {rates.length > 0
                              ? ` · ${rates.map((r) => r.unit).join(' / ')}`
                              : ` · ${li.unit}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: rowPrice > 0 ? tokens.goldDark : t.text.muted }}>
                            {rowPrice > 0
                              ? `${formatMoney(rowPrice, 'INR')} / ${sr ? sr.unit : li.unit}`
                              : 'rate TBC'}
                          </div>
                          <div style={{
                            width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: isAdded ? tokens.primary : '#fff',
                            border: `1.5px solid ${isAdded ? tokens.primary : zoneChosen ? tokens.border : '#DDD8D0'}`,
                            color: isAdded ? tokens.gold : zoneChosen ? t.text.tertiary : '#C8C4BC', fontSize: 16, fontWeight: 700,
                          }}>
                            {isAdded ? '✓' : '+'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {filteredLibrary.length === 0 && (
              <div style={{ fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary, padding: '24px 0', textAlign: 'center' }}>
                No elements match that search.
              </div>
            )}
          </div>

          <button type="button" style={styles.manualToggle} onClick={() => setShowManual(true)}>
            + Add Custom Element Manually
          </button>
          {/* A dialog, not an inline expansion: the form no longer pushes
              the catalogue down (phase 5 item 9). Closes on add or cancel;
              the shared Modal supplies Escape and backdrop behaviour. */}
          {showManual && (
            <Modal title="Add custom element" onClose={() => setShowManual(false)}>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Element Name</label>
                  <input style={inputStyle} value={manualItem.name} onChange={(e) => setManualItem({ ...manualItem, name: e.target.value })} placeholder="Custom element name" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>System *</label>
                  <select style={inputStyle} value={manualItem.system} onChange={(e) => setManualItem({ ...manualItem, system: e.target.value })}>
                    <option value="">Select system</option>
                    {systems.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Rate (₹)</label>
                  <input type="number" style={inputStyle} value={manualItem.rate} onChange={(e) => setManualItem({ ...manualItem, rate: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label style={labelStyle}>Qty</label>
                  <input type="number" style={inputStyle} value={manualItem.qty} onChange={(e) => setManualItem({ ...manualItem, qty: e.target.value })} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Unit</label>
                  <input style={inputStyle} value={manualItem.unit} onChange={(e) => setManualItem({ ...manualItem, unit: e.target.value })} placeholder="per unit" />
                </div>
              </div>
              <div style={{ fontFamily: fonts.body, fontSize: 11, color: zoneChosen ? t.text.tertiary : tokens.ruby, marginBottom: 10 }}>
                {zoneChosen ? `Lands in ${zoneLabel(activeZone)}.` : 'Pick a zone above before adding this.'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" style={styles.toolbarBtnGhost} onClick={() => setShowManual(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!zoneChosen || !manualItem.name.trim() || !manualItem.system}
                  style={{ ...styles.toolbarBtnPrimary, opacity: zoneChosen && manualItem.name.trim() && manualItem.system ? 1 : 0.5 }}
                  onClick={addManualItem}
                >
                  Add to Quotation
                </button>
              </div>
            </div>
            </Modal>
          )}
        </div>

        {/* Right — cart, finish, totals */}
        {/* Quote summary as a non-modal drawer (InvoicePreview's pattern via
            PersistentDrawer): open by default, the catalogue stays clickable
            beside it, Escape or the chevron collapses it. Inside, the teal
            header pins top, the totals/Preview block pins bottom, and only
            the line items scroll (Eswar, build 4). */}
        <PersistentDrawer
          open={summaryOpen}
          onClose={() => setSummaryOpen(false)}
          width={SUMMARY_DRAWER_WIDTH}
          topOffset={isMobile ? 0 : 56}
          ariaLabel="Quote summary"
        >
        <div style={styles.cartRail}>
          <div style={styles.cartHeader} data-clarity-mask="True">
            <button
              type="button"
              style={styles.collapseBtn}
              onClick={() => setSummaryOpen(false)}
              aria-label="Collapse quote summary"
              title="Collapse (Esc)"
            >
              <ChevronsRight size={16} />
            </button>
            <div style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 700, color: tokens.gold }}>{client.name || 'Client Name'}</div>
            <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 500, color: '#fff', marginTop: 2, opacity: 0.85 }}>
              {eventInfo.type}{eventInfo.date ? ` · ${formatDocumentDate(eventInfo.date)}` : ''}
            </div>
            {twoFunction && (
              <div style={{ fontFamily: fonts.body, fontSize: 11, color: tokens.gold, marginTop: 4, opacity: 0.9 }}>
                Showing: {activeFunction === 'reception' ? 'Reception' : 'Muhurtham'}
              </div>
            )}
          </div>

          <div style={styles.cartItems}>
            {functionItems.length === 0 ? (
              <div style={{ color: t.text.tertiary, fontFamily: fonts.body, fontSize: 13, textAlign: 'center', padding: '40px 16px', lineHeight: 1.6 }}>
                {zoneChosen
                  ? `Tap elements on the left to add them to ${zoneLabel(activeZone)}.`
                  : 'Pick a zone to start adding elements.'}
              </div>
            ) : (
              cartGroups.map((group) => (
                <div key={group.key} style={{ marginBottom: 14 }}>
                  <div style={styles.cartZoneHeading}>{group.label}</div>
                  {group.items.map((item) => {
                    const charged = unitRate(item, pricingCtx)
                    const commission = commissionComponent(item, pricingCtx)
                    const isFloralLike = systems.find((s) => s.key === item.system)?.scales_with_finish === true
                    const unpriced = charged <= 0
                    const unitOptions = ratesForItem(item.label)
                    const levels = item.curveKey ? curveLevels(item.curveKey) : []
                    return (
                      <div key={item.key} style={styles.cartItem}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1, marginRight: 8 }}>
                            <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: t.text.primary }}>{item.label}</div>
                            <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.text.tertiary, marginTop: 1 }}>{systemLabel(item.system)}</div>
                          </div>
                          <button type="button" style={styles.removeBtn} onClick={() => removeItem(item.key)}>×</button>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <button type="button" style={styles.stepperBtn} onClick={() => updateItemQty(item.key, item.qty - 1)}>-</button>
                            <span style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: tokens.primary, width: 26, textAlign: 'center' }}>{item.qty}</span>
                            <button type="button" style={styles.stepperBtn} onClick={() => updateItemQty(item.key, item.qty + 1)}>+</button>
                          </div>
                          {unitOptions.length > 1 ? (
                            <select
                              value={item.unit ?? ''}
                              onChange={(e) => changeItemUnit(item.key, e.target.value)}
                              title="This element prices per more than one unit"
                              style={styles.unitSelect}
                            >
                              {unitOptions.map((r) => <option key={r.unit} value={r.unit}>{r.unit}</option>)}
                            </select>
                          ) : (
                            <span style={{ fontFamily: fonts.body, fontSize: 11, color: t.text.tertiary }}>{item.unit}</span>
                          )}
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ fontFamily: fonts.body, fontSize: 11, color: t.text.tertiary }}>₹</span>
                            {/* The editable number is the line's own ANCHOR —
                                the per-quotation copy, never the global card.
                                An unpriced line reads "TBC", not a confident 0. */}
                            <input
                              type="number"
                              value={item.anchorRate > 0 ? item.anchorRate : ''}
                              placeholder="TBC"
                              onChange={(e) => updateItemAnchor(item.key, Number(e.target.value) || 0)}
                              title={item.curveKey ? 'Anchor rate: the full-fresh figure the curve scales from' : 'Rate'}
                              style={{
                                width: 68, padding: '4px 6px', borderRadius: 4, textAlign: 'right',
                                border: `1px solid ${unpriced ? tokens.goldDark : tokens.border}`,
                                fontFamily: fonts.body, fontSize: 12, fontWeight: 500, color: tokens.primary,
                              }}
                            />
                          </div>
                          <div style={{
                            fontFamily: fonts.body, fontSize: unpriced ? 11 : 13, fontWeight: 700,
                            color: unpriced ? t.text.muted : tokens.primary, minWidth: 70, textAlign: 'right',
                          }}>
                            {unpriced ? 'rate TBC' : formatMoney(lineAmount(item, pricingCtx), 'INR')}
                          </div>
                        </div>

                        {/* Finish, only the levels this line's curve defines.
                            A flat line (no curve) offers no finish at all. */}
                        {item.curveKey && levels.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                            <select
                              value={item.finishLevel ?? ''}
                              onChange={(e) => updateItemFinish(item.key, e.target.value)}
                              title="Finish for this line: only the levels its curve defines"
                              style={styles.moveSelect}
                            >
                              {item.finishLevel == null && <option value="">choose finish…</option>}
                              {levels.map((lvl) => <option key={lvl} value={lvl}>{finishLabel(lvl)}</option>)}
                            </select>
                            {!unpriced && charged !== item.anchorRate && (
                              <span style={styles.effectiveRateNote} title={`Anchor ${formatMoney(item.anchorRate, 'INR')} at ${item.finishLevel ? finishLabel(item.finishLevel) : 'this finish'}`}>
                                {formatMoney(charged, 'INR')} / {item.unit}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Commission — internal figure, admin builder ONLY.
                            Checked (default): the rate card figure exactly.
                            Unchecked: stripped (divide for %, subtract for flat). */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                          <label style={styles.commissionToggle}>
                            <input
                              type="checkbox"
                              checked={item.commissionApplied}
                              onChange={() => toggleItemCommission(item.key)}
                              style={{ width: 12, height: 12, accentColor: tokens.primary }}
                            />
                            Commission applied
                          </label>
                          {commission > 0 && (
                            <span style={styles.commissionNote}>
                              {item.commissionApplied
                                ? `incl. ${formatMoney(commission, 'INR')}/unit`
                                : `stripped ${item.commissionFlat !== null ? formatMoney(commission, 'INR') : `${commissionPct}%`} → ${formatMoney(charged, 'INR')}/unit`}
                            </span>
                          )}
                        </div>

                        {isFloralLike && (
                          <label style={styles.gerberaToggle}>
                            <input type="checkbox" checked={item.gerberaFill} onChange={() => toggleGerbera(item.key)} style={{ width: 12, height: 12, accentColor: tokens.primary }} />
                            gerbera fill
                          </label>
                        )}

                        {/* Move controls. A line in the wrong place is a
                            correction, not a delete-and-rebuild. */}
                        <div style={styles.moveRow}>
                          <select
                            value={item.zoneKey ?? ''}
                            onChange={(e) => moveItemZone(item.key, e.target.value || null)}
                            title="Move this line to another zone"
                            style={styles.moveSelect}
                          >
                            <option value="">Unassigned</option>
                            {zones.map((z) => (
                              <option key={z.key} value={z.key}>{z.sort_order}. {z.label}</option>
                            ))}
                          </select>
                          {twoFunction && (
                            <button
                              type="button"
                              style={styles.moveFnBtn}
                              title="Move this line to the other function. Curved lines reprice at that function's finish."
                              onClick={() =>
                                moveItemFunction(item.key, item.functionKey === 'reception' ? 'muhurtham' : 'reception')
                              }
                            >
                              → {item.functionKey === 'reception' ? 'Muhurtham' : 'Reception'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          <div style={styles.settingsPanel}>
            {/* Collapsed by default: the summary row carries the current
                values, and the freed height goes to the line list above. */}
            <button
              type="button"
              className="ec-disclosure-row"
              style={styles.settingsSummaryRow}
              onClick={() => setShowQuotationSettings((v) => !v)}
              aria-expanded={showQuotationSettings}
            >
              <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {showQuotationSettings ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                Quotation settings
              </span>
              <span style={styles.settingsSummaryValues}>
                {finishLabels[activeFunction] ?? 'No finish'}
                {discount > 0 ? ` · ${discount}% discount` : ''}
                {` · ${advance}% advance · ${validDays}d · GST ${gstEnabled ? 'on' : 'off'}`}
              </span>
            </button>

            {showQuotationSettings && (
              <div style={{ marginTop: 10 }}>
                {/* Finish applies to the ACTIVE function: it re-defaults every
                    curved line in that function (or the nearest level a 3-step
                    curve offers). A line can still be deviated on its own row. */}
                <label style={{ ...labelStyle, fontSize: 11 }}>
                  FINISH{twoFunction ? ` — ${activeFunction === 'reception' ? 'RECEPTION' : 'MUHURTHAM'}` : ''}
                </label>
                <select
                  style={{ ...inputStyle, padding: '7px 10px', fontSize: 13, marginBottom: colourVariantOffered ? 8 : 12 }}
                  value={activeFinishKey}
                  onChange={(e) => changeFunctionFinish(activeFunction, e.target.value)}
                >
                  {finishLevels.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                </select>
                {colourVariantOffered && (
                  <select
                    style={{ ...inputStyle, padding: '7px 10px', fontSize: 13, marginBottom: 12 }}
                    value={readymadeVariant}
                    onChange={(e) => setReadymadeVariant(e.target.value as typeof readymadeVariant)}
                  >
                    <option value="">Colour: not specified</option>
                    <option value="with_red">With red (traditional)</option>
                    <option value="without_red">Without red (pink, peach, white, beige)</option>
                  </select>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>DISCOUNT %</label>
                    <input type="number" style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }} value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>ADVANCE %</label>
                    <input type="number" style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }} value={advance} onChange={(e) => setAdvance(Number(e.target.value) || 0)} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: 11 }}>VALID (DAYS)</label>
                    <input type="number" style={{ ...inputStyle, padding: '7px 10px', fontSize: 13 }} value={validDays} onChange={(e) => setValidDays(Number(e.target.value) || 1)} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18 }}>
                    <input type="checkbox" id="gst" checked={gstEnabled} onChange={(e) => setGstEnabled(e.target.checked)} style={{ width: 15, height: 15, accentColor: tokens.primary }} />
                    <label htmlFor="gst" style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 500, color: tokens.primary, cursor: 'pointer' }}>GST 18%</label>
                  </div>
                </div>
              </div>
            )}

            {/* The client's public link renders the STORED row, so the
                operator needs to know whether what they are looking at has
                got there yet. */}
            <div style={styles.saveState}>
              {saveState === 'saving' && 'Saving…'}
              {saveState === 'dirty' && 'Unsaved changes'}
              {saveState === 'saved' && 'All changes saved'}
              {saveState === 'error' && (
                <span style={{ color: tokens.ruby, fontWeight: 700 }}>Not saved. Retrying on next change</span>
              )}
            </div>

            {hasUnpriced && (
              <div style={styles.unpricedNotice}>
                {unpricedCount} {unpricedCount === 1 ? 'line has' : 'lines have'} no rate yet. The total below is
                incomplete, and this quotation cannot be sent until every line is priced.
              </div>
            )}

            <div style={{ borderTop: `1px solid ${tokens.border}`, paddingTop: 10 }}>
              {twoFunction && (
                <div style={{ ...styles.totalLine, opacity: 0.75 }}>
                  <span style={{ fontFamily: fonts.body, fontSize: 11, color: t.text.tertiary }}>Both functions included</span>
                </div>
              )}
              {discount > 0 && (
                <div style={styles.totalLine}>
                  <span style={{ fontFamily: fonts.body, fontSize: 12, color: tokens.ruby }}>Discount ({discount}%)</span>
                  <span style={{ fontFamily: fonts.body, fontSize: 12, color: tokens.ruby, fontWeight: 600 }}>- {formatMoney(totals.discountAmount, 'INR')}</span>
                </div>
              )}
              {gstEnabled && (
                <div style={styles.totalLine}>
                  <span style={{ fontFamily: fonts.body, fontSize: 12, color: t.text.secondary }}>GST (18%)</span>
                  <span style={{ fontFamily: fonts.body, fontSize: 12, color: t.text.secondary }}>{formatMoney(totals.gstAmount, 'INR')}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, paddingTop: 4, borderTop: `1px solid ${tokens.border}` }}>
                <span style={{ fontFamily: fonts.body, fontSize: 16, color: tokens.primary, fontWeight: 700 }}>Total</span>
                <span style={{ fontFamily: fonts.body, fontSize: 16, color: tokens.primary, fontWeight: 700 }}>{formatMoney(totals.total, 'INR')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: fonts.body, fontSize: 12, color: tokens.goldDark, fontWeight: 500 }}>Advance ({advance}%)</span>
                <span style={{ fontFamily: fonts.body, fontSize: 12, color: tokens.goldDark, fontWeight: 700 }}>{formatMoney(totals.advanceAmount, 'INR')}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={items.length === 0 || saving}
              onClick={() => void handleGoToPreview()}
              style={{
                marginTop: 12, width: '100%', padding: 13, borderRadius: 6, border: 'none',
                background: items.length > 0 ? tokens.primary : '#C8C4BC',
                color: items.length > 0 ? tokens.gold : '#999',
                cursor: items.length > 0 ? 'pointer' : 'not-allowed',
                fontFamily: fonts.body, fontSize: 14, fontWeight: 700,
              }}
            >
              {saveState === 'saving' ? 'Saving...' : 'Preview and Print →'}
            </button>
            {items.length === 0 && (
              <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.text.tertiary, textAlign: 'center', marginTop: 6 }}>
                Add at least one element to continue
              </div>
            )}
          </div>
        </div>
        </PersistentDrawer>

        {/* Collapsed state: the item count and running total stay visible,
            and this control reopens the drawer. Desktop: a slim tab on the
            right edge. Mobile: a bottom bar. Both are plain buttons, so
            keyboard access comes for free. */}
        {!summaryOpen && (
          isMobile ? (
            <button
              type="button"
              style={styles.summaryBarMobile}
              onClick={() => setSummaryOpen(true)}
              aria-expanded={false}
              aria-label={`Open quote summary, ${items.length} item${items.length === 1 ? '' : 's'}, total ${formatMoney(totals.total, 'INR')}`}
            >
              <span>{items.length} item{items.length === 1 ? '' : 's'}</span>
              <span style={{ fontWeight: 700 }}>{formatMoney(totals.total, 'INR')}</span>
              <span style={styles.summaryBarHint}>
                <ChevronsLeft size={14} style={{ transform: 'rotate(90deg)' }} />
                View summary
              </span>
            </button>
          ) : (
            <button
              type="button"
              style={styles.summaryTab}
              onClick={() => setSummaryOpen(true)}
              aria-expanded={false}
              aria-label={`Open quote summary, ${items.length} item${items.length === 1 ? '' : 's'}, total ${formatMoney(totals.total, 'INR')}`}
            >
              <ChevronsLeft size={14} />
              <span style={styles.summaryTabText}>
                {items.length} item{items.length === 1 ? '' : 's'} · {formatMoney(totals.total, 'INR')}
              </span>
            </button>
          )
        )}
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  error: {
    background: tokens.rubyLight, color: tokens.ruby, border: `1px solid ${tokens.ruby}`,
    borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontFamily: fonts.body, fontSize: 13,
  },
  pageH1: {
    fontFamily: fonts.body, fontSize: 24, fontWeight: 700, color: tokens.primary,
    margin: 0, lineHeight: 1.25,
  },
  pageH2: {
    fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: tokens.goldDark,
    margin: '2px 0 0', lineHeight: 1.35,
  },
  headerMeta: {
    display: 'flex', flexWrap: 'wrap', gap: '4px 14px', marginTop: 6,
    fontFamily: fonts.body, fontSize: 12, color: t.text.tertiary, alignItems: 'center',
  },
  headerEditBtn: {
    position: 'absolute', top: 0, right: 0,
    width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 8,
    color: tokens.primary, cursor: 'pointer',
  },
  // Ruby on a grey squircle: the date/duration/session trio is the tap
  // target for the day/session dialog (phase 5 items 5 and 11).
  daysChip: {
    display: 'inline-flex', alignItems: 'center',
    padding: '4px 10px', background: '#EFECE5', border: 'none', borderRadius: 8,
    fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: tokens.ruby,
    cursor: 'pointer',
  },
  daysEditorBox: {
    marginTop: 10, padding: 12, background: '#fff',
    border: `1px solid ${tokens.border}`, borderRadius: 8,
  },
  sessionChip: {
    display: 'inline-flex', alignItems: 'center', gap: 2,
    border: `1px solid ${tokens.border}`, borderRadius: 6, padding: '2px 4px', background: '#fff',
  },
  sessionSelect: {
    border: 'none', background: 'transparent', fontFamily: fonts.body, fontSize: 12,
    color: tokens.primary, fontWeight: 600, cursor: 'pointer', outline: 'none',
  },
  comboList: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
    background: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 6,
    marginTop: 4, maxHeight: 220, overflowY: 'auto', boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
  },
  comboOption: {
    display: 'block', width: '100%', textAlign: 'left', padding: '9px 12px',
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: fonts.body, fontSize: 13, color: t.text.primary,
  },
  comboNewNote: {
    padding: '8px 12px', fontFamily: fonts.body, fontSize: 11, color: tokens.goldDark,
    borderTop: `1px solid ${tokens.border}`, lineHeight: 1.4,
  },
  disclosureBtn: {
    marginTop: 16, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: tokens.primary,
    textDecoration: 'underline', textUnderlineOffset: 3,
  },
  candidateRow: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0',
    borderBottom: '1px solid #f0ece4',
  },
  commissionToggle: {
    display: 'flex', alignItems: 'center', gap: 5,
    fontFamily: fonts.body, fontSize: 10, color: t.text.tertiary, cursor: 'pointer',
  },
  commissionNote: {
    fontFamily: fonts.body, fontSize: 10, color: tokens.goldDark,
  },
  unitSelect: {
    padding: '3px 4px', borderRadius: 4, border: `1px solid ${tokens.gold}`,
    background: tokens.goldLight, fontFamily: fonts.body, fontSize: 11,
    color: tokens.goldDark, fontWeight: 600, cursor: 'pointer',
  },
  formCard: { background: '#fff', borderRadius: 8, padding: 28, marginBottom: 16, border: `1px solid ${tokens.border}` },
  formCardTitle: { fontFamily: fonts.body, fontSize: 13, fontWeight: 700, color: tokens.primary, letterSpacing: 1.5 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 },
  muhurthamBox: {
    marginTop: 20, padding: 16, borderRadius: 8,
    background: `${tokens.primary}08`, border: `1px solid ${tokens.primary}25`,
  },
  functionSwitch: {
    display: 'flex', gap: 4, padding: 4, marginBottom: 12,
    background: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 8,
  },
  // Pinned under the 56px sticky TopBar (zIndex 90), so the strip cannot
  // scroll out of view while elements are being tapped.
  placementBar: {
    position: 'sticky',
    top: 56,
    zIndex: 80,
    background: tokens.bg,
    margin: '0 -8px 16px',
    padding: '10px 8px 4px',
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
  },
  // Neutral guidance, not an error: this is a friendly empty state, and
  // red fill read as "something failed" (client feedback, 8 Sept).
  zonePrompt: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontFamily: fonts.body, fontSize: 12, color: t.text.secondary,
    padding: '9px 2px', margin: '4px 0',
  },
  zoneActiveNote: {
    fontFamily: fonts.body, fontSize: 12, color: t.text.secondary, padding: '9px 2px',
  },
  linkBtn: {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    fontFamily: fonts.body, fontSize: 12, color: tokens.primary, textDecoration: 'underline',
  },
  moveRow: {
    display: 'flex', alignItems: 'center', gap: 6, marginTop: 6,
  },
  moveSelect: {
    flex: 1, minWidth: 0, padding: '3px 6px', borderRadius: 4,
    border: `1px solid ${tokens.border}`, background: '#fff',
    fontFamily: fonts.body, fontSize: 11, color: t.text.secondary, cursor: 'pointer',
  },
  moveFnBtn: {
    padding: '3px 8px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
    border: `1px solid ${tokens.border}`, background: '#fff',
    fontFamily: fonts.body, fontSize: 11, fontWeight: 600, color: tokens.primary,
  },
  saveState: {
    fontFamily: fonts.body, fontSize: 10, color: t.text.tertiary,
    textAlign: 'right', minHeight: 13, marginBottom: 6, letterSpacing: 0.2,
  },
  unpricedNotice: {
    fontFamily: fonts.body, fontSize: 11, lineHeight: 1.5, color: tokens.goldDark,
    background: tokens.goldLight, border: `1px solid ${tokens.gold}`,
    borderRadius: 6, padding: '7px 10px', marginBottom: 10,
  },
  sendBlockedNote: {
    fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: tokens.goldDark,
  },
  // The catalogue scrolls in its own region (like the cart rail) so the
  // group headings can stick to its top edge.
  catalogueScroll: {
    maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', position: 'relative',
  },
  catalogueGroupHeading: {
    position: 'sticky', top: 0, zIndex: 2,
    background: '#EFECE5', padding: '7px 10px 6px', borderRadius: 8,
    fontFamily: fonts.body, fontSize: 11, fontWeight: 700, letterSpacing: 1,
    textTransform: 'uppercase', color: tokens.goldDark,
    marginBottom: 6,
  },
  mockupCard: { background: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, border: `1px dashed ${tokens.gold}` },
  chooseBtn: {
    padding: '8px 14px', background: tokens.bg, border: `1px solid ${tokens.border}`, color: tokens.primary,
    fontFamily: fonts.body, fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 4,
  },
  mockupNotice: {
    marginTop: 10, fontFamily: fonts.body, fontSize: 13, color: tokens.primary, fontWeight: 500,
    padding: '8px 12px', background: `${tokens.primary}15`, borderRadius: 4,
  },
  motionTag: {
    marginLeft: 6, fontSize: 9, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
    color: tokens.goldDark, background: tokens.goldLight, padding: '1px 5px', borderRadius: 3,
  },
  manualToggle: {
    marginTop: 12, width: '100%', padding: 10, background: 'transparent', border: `1px dashed ${tokens.primary}`,
    color: tokens.primary, fontFamily: fonts.body, fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 6,
  },
  manualForm: { background: '#fff', padding: 16, marginTop: 8, border: `1px solid ${tokens.border}`, borderRadius: 6 },
  // Fills the PersistentDrawer: header top, items flex-1 scroll, settings
  // panel bottom. The drawer itself owns position, border and shadow.
  cartRail: {
    background: '#fff',
    // flex: 1 + minHeight: 0 (not height: 100%) so it fills the drawer on
    // desktop AND resolves inside the auto-height mobile bottom sheet.
    display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden',
  },
  cartHeader: { padding: '16px 44px 16px 20px', background: tokens.primary, flexShrink: 0, position: 'relative' },
  collapseBtn: {
    position: 'absolute', top: 12, right: 10,
    width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', border: 'none', borderRadius: 6,
    color: tokens.gold, cursor: 'pointer',
  },
  // Ruby, not teal (phase 4 item 3): the collapsed tab carries the running
  // total and must read high-attention, not blend in as a neutral control.
  summaryTab: {
    position: 'fixed', right: 0, top: '45%', zIndex: 119,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: '12px 7px', background: tokens.ruby, color: t.text.inverse,
    border: 'none', borderRadius: '8px 0 0 8px', cursor: 'pointer',
    boxShadow: '-4px 2px 12px rgba(176, 13, 45, 0.22)',
  },
  summaryTabText: {
    writingMode: 'vertical-rl', fontFamily: fonts.body, fontSize: 12,
    fontWeight: 600, letterSpacing: '0.02em', whiteSpace: 'nowrap',
  },
  // Same ruby as the desktop tab: it is the same collapsed-summary control
  // in a different frame.
  summaryBarMobile: {
    position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 119,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    padding: '13px 16px', background: tokens.ruby, color: t.text.inverse,
    border: 'none', cursor: 'pointer', fontFamily: fonts.body, fontSize: 14, fontWeight: 600,
  },
  summaryBarHint: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 12, fontWeight: 500, opacity: 0.9,
  },
  cartItems: { flex: 1, padding: '12px 16px', overflowY: 'auto' },
  cartZoneHeading: {
    fontFamily: fonts.body, fontSize: 10, fontWeight: 700, letterSpacing: 1,
    textTransform: 'uppercase', color: tokens.goldDark, padding: '6px 0 4px',
    borderBottom: `1px solid ${tokens.border}`, marginBottom: 4,
  },
  cartItem: { padding: '10px 0', borderBottom: '1px solid #f0ece4' },
  removeBtn: { background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 18, padding: '0 2px', lineHeight: 1 },
  stepperBtn: { width: 24, height: 24, background: tokens.bg, border: `1px solid ${tokens.border}`, cursor: 'pointer', color: tokens.primary, fontFamily: fonts.body, fontSize: 16, fontWeight: 700, borderRadius: 4 },
  effectiveRateNote: {
    fontFamily: fonts.body, fontSize: 10, color: tokens.goldDark, whiteSpace: 'nowrap',
  },
  gerberaToggle: {
    display: 'flex', alignItems: 'center', gap: 5, marginTop: 5,
    fontFamily: fonts.body, fontSize: 10, color: t.text.tertiary, cursor: 'pointer',
  },
  // No flexShrink: 0 here on purpose: if the expanded settings form ever
  // exceeds the panel height on a short viewport, this block shrinks and
  // scrolls internally instead of clipping the Total and Preview button
  // out of reach. At normal heights it keeps its natural size, pinned.
  settingsPanel: { padding: '10px 16px 14px', borderTop: `1px solid ${tokens.border}`, background: tokens.bg, overflowY: 'auto' },
  settingsSummaryRow: {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    background: 'none', border: 'none', padding: '8px 10px', margin: '0 -10px',
    borderRadius: 8, cursor: 'pointer',
    fontFamily: fonts.body, fontSize: 12, color: tokens.primary, textAlign: 'left',
    marginBottom: 4,
  },
  settingsSummaryValues: {
    fontFamily: fonts.body, fontSize: 11, color: t.text.tertiary,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
  },
  totalLine: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  previewToolbar: { display: 'flex', gap: 10, alignItems: 'center', padding: '12px 0', flexWrap: 'wrap' },
  toolbarBtnGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${tokens.primary}`,
    color: tokens.primary, padding: '8px 16px', cursor: 'pointer', fontFamily: fonts.body, fontSize: 13, fontWeight: 500,
    borderRadius: 4, textDecoration: 'none',
  },
  toolbarBtnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 6, background: tokens.primary, border: 'none',
    color: tokens.gold, padding: '8px 20px', cursor: 'pointer', fontFamily: fonts.body, fontSize: 13, fontWeight: 700, borderRadius: 4,
  },
  publicLink: { fontFamily: mono, fontSize: 12, color: t.text.tertiary },
}
