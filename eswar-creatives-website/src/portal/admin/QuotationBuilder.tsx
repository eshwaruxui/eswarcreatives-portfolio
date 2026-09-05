// Quotation Module Phase 1.5 — the 3-view create/edit flow, restructured to
// mirror how the client actually quotes: walking the venue from outside in,
// one zone at a time.
//
// Client + event form -> Builder (element catalog by system on the left, a
// persistent cart grouped by zone on the right, with the finish selector and
// live totals in the same panel) -> Preview.
//
// Two things drive the structure:
//   * ZONES. The venue walk is the quoting order, so the cart is grouped by
//     zone, and all 13 zones stay visible in the builder even when empty —
//     an empty zone is an upsell prompt for the operator. Empty zones never
//     reach the client document.
//   * FUNCTIONS. A wedding can carry a reception and a muhurtham. The
//     muhurtham is a separate overnight job, not a discount on the
//     reception, so each function holds its own finish and neither ever
//     inherits from the other.
//
// Zones, systems, finish levels and the element library are all loaded from
// the tenant's own database. No tenant vocabulary is hardcoded here.
//
// Every rupee shown comes from quotationMath.ts. This file does no pricing
// arithmetic of its own — see that module's header for the bug that rule
// exists to prevent.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, Printer, Mail, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import { ui, mono, formatMoney } from './ui'
import { formatDocumentDate } from '../utils/formatDate'
import { ACTIVE_TENANT_ID } from '../tenant/activeTenantId'
import { QuotationDocument, type QuotationDocumentItem, type FinishLabels } from '../components/quotation/QuotationDocument'
import {
  computeTotals,
  effectiveRate,
  lineAmount,
  type PricingContext,
  type QuotationFunctionKey,
} from '../components/quotation/quotationMath'
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

type Zone = { key: string; label: string; sort_order: number }
type SystemRow = { key: string; label: string; scales_with_finish: boolean; sort_order: number }
type FinishLevel = {
  key: string; label: string; description: string | null
  floral_multiplier: number; has_colour_variant: boolean; sort_order: number
}
type LibraryItem = { id: string; system: string; name: string; unit: string | null; default_rate: number | null; is_motion: boolean }

type CartItem = {
  key: string
  functionKey: QuotationFunctionKey
  zoneKey: string | null
  system: string
  label: string
  unit: string | null
  qty: number
  rate: number
  note: string | null
  gerberaFill: boolean
  source: 'library' | 'mockup_ai' | 'manual'
}

type ClientForm = { name: string; phone: string; email: string; address: string }
type EventForm = { type: string; date: string; venue: string; guestCount: string; notes: string }

const inputStyle: CSSProperties = {
  width: '100%', padding: '9px 12px', border: `1px solid ${tokens.border}`,
  borderRadius: 6, fontFamily: fonts.body, fontSize: 14, color: t.text.primary,
  background: '#fff', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: CSSProperties = {
  fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: t.text.secondary,
  marginBottom: 6, display: 'block', letterSpacing: 0.2,
}

export function QuotationBuilder() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'

  const [view, setView] = useState<'form' | 'builder' | 'preview'>('form')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  // Tenant vocabulary, loaded not hardcoded.
  const [zones, setZones] = useState<Zone[]>([])
  const [systems, setSystems] = useState<SystemRow[]>([])
  const [finishLevels, setFinishLevels] = useState<FinishLevel[]>([])
  const [library, setLibrary] = useState<LibraryItem[]>([])

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

  const [mockupFile, setMockupFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [mockupNotice, setMockupNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [discount, setDiscount] = useState(0)
  const [advance, setAdvance] = useState(50)
  const [validDays, setValidDays] = useState(7)
  const [gstEnabled, setGstEnabled] = useState(false)

  useEffect(() => {
    void (async () => {
      const [zonesRes, systemsRes, finishRes, libRes] = await Promise.all([
        supabase.from('quotation_zones').select('key, label, sort_order').order('sort_order'),
        supabase.from('quotation_systems').select('key, label, scales_with_finish, sort_order').order('sort_order'),
        // internal_code is deliberately never selected: it carries the
        // operator's ratio shorthand and must not reach any rendered DOM.
        supabase.from('quotation_finish_levels').select('key, label, description, floral_multiplier, has_colour_variant, sort_order').order('sort_order'),
        supabase.from('quotation_item_library').select('id, system, name, unit, default_rate, is_motion').eq('is_active', true).order('sort_order'),
      ])
      const zoneRows = (zonesRes.data ?? []) as Zone[]
      const finishRows = (finishRes.data ?? []) as FinishLevel[]
      setZones(zoneRows)
      setSystems((systemsRes.data ?? []) as SystemRow[])
      setFinishLevels(finishRows)
      setLibrary((libRes.data ?? []) as LibraryItem[])
      // Deliberately NO default active zone. Defaulting to zone 1 meant the
      // builder opened with "Valet parking area" already selected in teal —
      // and since the zone strip sits above the fold, the first tap on an
      // element silently filed a stage garden into valet parking. Nothing
      // is selected until the operator picks a zone, which is also what
      // makes the cart's "Pick a zone above" instruction literally true.

      if (!isNew && id) {
        const { data: q, error: qErr } = await supabase.from('quotations').select('*').eq('id', id).single()
        if (qErr || !q) {
          setError('Could not load this quotation.')
          setLoading(false)
          return
        }
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

        const { data: itemRows } = await supabase
          .from('quotation_items')
          .select('id, system, zone_key, function_key, label, unit, qty, rate, note, gerbera_fill, source')
          .eq('quotation_id', id)
          .order('sort_order')
        setItems(
          (itemRows ?? []).map((r) => ({
            key: r.id,
            functionKey: r.function_key as QuotationFunctionKey,
            zoneKey: r.zone_key,
            system: r.system,
            label: r.label,
            unit: r.unit,
            qty: Number(r.qty),
            rate: Number(r.rate),
            note: r.note,
            gerberaFill: !!r.gerbera_fill,
            source: r.source,
          }))
        )
        setView('builder')
      } else {
        // Default both functions to the middle of the ladder rather than
        // the cheapest or dearest, so an unset finish is never silently a
        // pricing decision.
        const mid = finishRows[Math.floor(finishRows.length / 2)]
        if (mid) {
          setReceptionFinish((f) => f || mid.key)
          setMuhurthamFinish((f) => f || mid.key)
        }
      }
      setLoading(false)
    })()
  }, [id, isNew])

  const multiplierOf = useCallback(
    (finishKey: string) => Number(finishLevels.find((f) => f.key === finishKey)?.floral_multiplier ?? 1),
    [finishLevels]
  )

  // The one pricing context every rupee on this screen flows through.
  const pricingCtx: PricingContext = useMemo(
    () => ({
      scalesWithFinish: Object.fromEntries(systems.map((s) => [s.key, s.scales_with_finish])),
      multiplierByFunction: {
        reception: multiplierOf(receptionFinish),
        muhurtham: multiplierOf(muhurthamFinish),
      },
    }),
    [systems, multiplierOf, receptionFinish, muhurthamFinish]
  )

  const totals = useMemo(
    () => computeTotals(items, pricingCtx, { discountPct: discount, advancePct: advance, gstEnabled }),
    [items, pricingCtx, discount, advance, gstEnabled]
  )

  const zoneLabel = useCallback((key: string | null) => zones.find((z) => z.key === key)?.label ?? '', [zones])
  const zoneOrder = useCallback((key: string | null) => zones.find((z) => z.key === key)?.sort_order ?? 999, [zones])
  const systemLabel = useCallback((key: string) => systems.find((s) => s.key === key)?.label ?? key, [systems])

  // Nothing may enter the cart until the operator has said where it goes.
  const zoneChosen = activeZone !== ''

  // Every seeded default_rate is 0, which the library renders honestly as
  // "rate TBC". The cart used to turn that into a confident editable 0 with
  // an amount of ₹0, and Send stayed enabled on a ₹0 total — a client could
  // be sent a quotation for nothing. Counted across BOTH functions, because
  // Send activates the whole quotation, not the function on screen.
  const unpricedCount = items.filter((i) => i.rate <= 0).length
  const hasUnpriced = unpricedCount > 0

  const canProceedFromForm = client.name.trim() && client.phone.trim() && eventInfo.type && eventInfo.date
  const muhurthamAvailable = supportsMuhurtham(eventInfo.type)
  const twoFunction = muhurthamAvailable && hasMuhurtham

  // A quotation that is not two-function must never carry muhurtham lines or
  // a stored muhurtham finish, whatever the operator toggled earlier.
  const activeFinishKey = activeFunction === 'muhurtham' ? muhurthamFinish : receptionFinish
  const setActiveFinishKey = activeFunction === 'muhurtham' ? setMuhurthamFinish : setReceptionFinish
  // Which finish offers a colour choice is tenant data, not a key this file
  // knows the name of — the same reason "floral scales with the finish" is
  // a column on quotation_systems rather than a literal in quotationMath.
  const colourVariantOffered =
    finishLevels.find((f) => f.key === activeFinishKey)?.has_colour_variant === true

  async function saveClientEvent(): Promise<string | null> {
    setSaving(true)
    setError(null)
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
      has_muhurtham: muhurthamAvailable && hasMuhurtham,
    }
    if (quotationId) {
      const { error: upErr } = await supabase.from('quotations').update(payload).eq('id', quotationId)
      setSaving(false)
      if (upErr) {
        setError('Could not save. Try again.')
        return null
      }
      return quotationId
    }
    const { data: inserted, error: insErr } = await supabase
      .from('quotations')
      .insert(payload)
      .select('id, quotation_number, created_at')
      .single()
    setSaving(false)
    if (insErr || !inserted) {
      setError('Could not create the quotation. Try again.')
      return null
    }
    setQuotationId(inserted.id)
    setQuotationNumber(inserted.quotation_number)
    setCreatedAt(inserted.created_at)
    navigate(`/portal/admin/quotations/${inserted.id}`, { replace: true })
    return inserted.id
  }

  async function saveScopeAndSettings(qId: string) {
    setSaving(true)
    setError(null)

    const { error: upErr } = await supabase
      .from('quotations')
      .update({
        discount_pct: discount,
        advance_pct: advance,
        validity_days: validDays,
        gst_enabled: gstEnabled,
        has_muhurtham: twoFunction,
        reception_finish_key: receptionFinish || null,
        muhurtham_finish_key: twoFunction ? muhurthamFinish || null : null,
        readymade_variant: readymadeVariant || null,
        muhurtham_reuse: twoFunction ? muhurthamReuse || null : null,
        subtotal: totals.subtotal,
        discount_amount: totals.discountAmount,
        gst_amount: totals.gstAmount,
        total_amount: totals.total,
        advance_amount: totals.advanceAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', qId)
    if (upErr) {
      setSaving(false)
      setError('Could not save the scope. Try again.')
      return false
    }

    await supabase.from('quotation_items').delete().eq('quotation_id', qId)
    if (items.length > 0) {
      const { error: itemsErr } = await supabase.from('quotation_items').insert(
        items.map((it, idx) => ({
          quotation_id: qId,
          function_key: it.functionKey,
          zone_key: it.zoneKey,
          system: it.system,
          label: it.label,
          unit: it.unit,
          qty: it.qty,
          rate: it.rate,
          // Persisted from the same helper the cart and preview render, so
          // the public page re-reads exactly what was quoted.
          amount: lineAmount(it, pricingCtx),
          note: it.note,
          gerbera_fill: it.gerberaFill,
          source: it.source,
          sort_order: idx,
        }))
      )
      if (itemsErr) {
        setSaving(false)
        setError('Could not save the line items. Try again.')
        return false
      }
    }
    setSaving(false)
    return true
  }

  async function handleContinueFromForm() {
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

  function addLibraryItem(li: LibraryItem) {
    if (!activeZone) return
    setItems((prev) => {
      // Same element in the same zone AND the same function is a quantity
      // bump; the same element in another zone is a genuinely separate line.
      const match = prev.find(
        (i) => i.label === li.name && i.zoneKey === activeZone && i.functionKey === activeFunction
      )
      if (match) return prev.map((i) => (i === match ? { ...i, qty: i.qty + 1 } : i))
      return [
        ...prev,
        {
          key: `lib-${li.id}-${Date.now()}`,
          functionKey: activeFunction,
          zoneKey: activeZone,
          system: li.system,
          label: li.name,
          unit: li.unit ?? 'per unit',
          qty: 1,
          rate: Number(li.default_rate ?? 0),
          note: null,
          gerberaFill: false,
          source: 'library',
        },
      ]
    })
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key))
  }
  // Recovery from a misfiling has to be a correction, not a rebuild. Before
  // this, the only line controls were qty -/+ and remove, so a line in the
  // wrong zone meant delete, scroll up, reselect the zone, find the element
  // again, re-add — six lines in the wrong function was a rebuild of the
  // whole function.
  function moveItemZone(key: string, zoneKey: string | null) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, zoneKey } : i)))
  }
  // The finish is scoped to the function, so this is the move that can change
  // a line's money: a floral line priced at the reception's finish reprices
  // at the muhurtham's the moment it lands there. lineAmount() reads
  // functionKey, so the cart, the document and the persisted amount all
  // follow from this one field with no separate recalculation.
  function moveItemFunction(key: string, functionKey: QuotationFunctionKey) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, functionKey } : i)))
  }
  function updateItemQty(key: string, qty: number) {
    if (qty < 1) return
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty } : i)))
  }
  function updateItemRate(key: string, rate: number) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, rate } : i)))
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
        rate: Number(manualItem.rate) || 0,
        note: null,
        gerberaFill: false,
        source: 'manual',
      },
    ])
    setManualItem({ name: '', system: '', unit: 'per unit', rate: '', qty: '1' })
    setShowManual(false)
  }

  const analyzeMockup = useCallback(async () => {
    if (!mockupFile) return
    setAnalyzing(true)
    setMockupNotice('')
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
      setItems((prev) => {
        const combined = [...prev]
        for (const f of found) {
          // Land in the zone the analyser suggested, else the active zone.
          // With no zone chosen the line lands unassigned rather than being
          // filed somewhere arbitrary — it then shows under "Unassigned" in
          // the cart with a zone control on it, which is an honest prompt
          // instead of a silent misfiling.
          const zoneKey =
            f.zone_key && zones.some((z) => z.key === f.zone_key) ? f.zone_key : activeZone || null
          const dupe = combined.find(
            (i) => i.label === f.label && i.zoneKey === zoneKey && i.functionKey === activeFunction
          )
          if (dupe) continue
          combined.push({
            key: `ai-${f.label}-${zoneKey}-${Date.now()}`,
            functionKey: activeFunction,
            zoneKey,
            system: systems.some((s) => s.key === f.system) ? f.system : (systems[0]?.key ?? ''),
            label: f.label,
            unit: f.unit || 'per unit',
            qty: f.qty || 1,
            rate: Number(f.rate) || 0,
            note: null,
            gerberaFill: false,
            source: 'mockup_ai',
          })
        }
        return combined
      })
      setMockupNotice(`${found.length} item${found.length === 1 ? '' : 's'} identified and added. Review zones and rates.`)
    } catch {
      setMockupNotice('Could not analyze the mockup. Add items manually.')
    }
    setAnalyzing(false)
  }, [mockupFile, activeZone, activeFunction, zones, systems])

  const filteredLibrary = library.filter((li) => {
    const matchSystem = activeSystem === 'All' || li.system === activeSystem
    const matchSearch = li.name.toLowerCase().includes(search.toLowerCase())
    return matchSystem && matchSearch
  })

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
    rate: it.rate,
    amount: lineAmount(it, pricingCtx),
    note: it.note,
  }))

  const finishLabels: FinishLabels = {
    reception: finishLevels.find((f) => f.key === receptionFinish)?.label ?? null,
    muhurtham: twoFunction ? finishLevels.find((f) => f.key === muhurthamFinish)?.label ?? null : null,
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
              subtotal: totals.subtotal,
              discount_amount: totals.discountAmount,
              gst_amount: totals.gstAmount,
              total_amount: totals.total,
              advance_amount: totals.advanceAmount,
            }}
            items={docItems}
          />
        </div>
      </div>
    )
  }

  // ── CLIENT + EVENT FORM ─────────────────────────────────────────────
  if (view === 'form') {
    return (
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {error && <div style={styles.error}>{error}</div>}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: fonts.body, fontSize: 22, fontWeight: 700, color: tokens.primary, marginBottom: 4 }}>New Quotation</div>
          <div style={{ fontFamily: fonts.body, fontSize: 14, color: t.text.tertiary }}>Fill in client and event details to get started.</div>
        </div>

        <section style={styles.formCard}>
          <div style={styles.formCardTitle}>CLIENT INFORMATION</div>
          <div style={styles.formGrid}>
            <div>
              <label style={labelStyle}>Client Name *</label>
              <input style={inputStyle} value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} placeholder="Full name" />
            </div>
            <div>
              <label style={labelStyle}>Phone Number *</label>
              <input style={inputStyle} value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} placeholder="9876543210" />
            </div>
            <div>
              <label style={labelStyle}>Email Address</label>
              <input style={inputStyle} value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} placeholder="email@example.com" />
            </div>
            <div>
              <label style={labelStyle}>Address / City</label>
              <input style={inputStyle} value={client.address} onChange={(e) => setClient({ ...client, address: e.target.value })} placeholder="Area, City" />
            </div>
          </div>
        </section>

        <section style={styles.formCard}>
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
              <label style={labelStyle}>Event Date *</label>
              <input type="date" style={inputStyle} value={eventInfo.date} onChange={(e) => setEventInfo({ ...eventInfo, date: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Venue / Mandapam</label>
              <input style={inputStyle} value={eventInfo.venue} onChange={(e) => setEventInfo({ ...eventInfo, venue: e.target.value })} placeholder="Venue name and location" />
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
              <textarea style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} rows={3} value={eventInfo.notes} onChange={(e) => setEventInfo({ ...eventInfo, notes: e.target.value })} placeholder="Theme preferences, specific requirements, or client notes" />
            </div>
          </div>

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

        <button
          type="button"
          disabled={!canProceedFromForm || saving}
          onClick={() => void handleContinueFromForm()}
          style={{
            width: '100%', padding: 14,
            background: canProceedFromForm ? tokens.primary : '#C8C4BC',
            color: canProceedFromForm ? tokens.gold : '#999',
            border: 'none', cursor: canProceedFromForm ? 'pointer' : 'not-allowed',
            fontFamily: fonts.body, fontSize: 15, fontWeight: 700, borderRadius: 6,
          }}
        >
          {saving ? 'Saving...' : 'Build the Scope →'}
        </button>
        {!canProceedFromForm && (
          <div style={{ fontFamily: fonts.body, fontSize: 12, color: t.text.tertiary, textAlign: 'center', marginTop: 8 }}>
            Fill in all required fields (*) to continue
          </div>
        )}
      </div>
    )
  }

  // ── BUILDER ──────────────────────────────────────────────────────────
  return (
    <div>
      {error && <div style={styles.error}>{error}</div>}

      {/* The function switch and the zone strip together answer "where is
          the next tap going to land", so they stay pinned while the operator
          works down the element list. The strip used to scroll away above
          the fold, which is precisely how a stage garden ended up in valet
          parking. top: 56 clears the sticky TopBar; zIndex sits below it. */}
      <div style={styles.placementBar}>
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

      {/* Zone strip — the venue walk. All zones stay visible; an empty one
          is a prompt, not clutter. Wraps to as many rows as it needs rather
          than scrolling sideways: at 1280 the horizontal scroller put only 9
          of the 13 zones within reach, which defeated the point of showing
          all thirteen as upsell prompts. */}
      <div style={styles.zoneStrip}>
        {zones.map((z) => {
          const count = countByZone[z.key] ?? 0
          const isActive = activeZone === z.key
          return (
            <button
              key={z.key}
              type="button"
              onClick={() => setActiveZone(isActive ? '' : z.key)}
              style={{
                padding: '7px 12px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: fonts.body, fontSize: 12, fontWeight: isActive ? 700 : 400,
                background: isActive ? tokens.primary : count > 0 ? `${tokens.primary}12` : '#fff',
                color: isActive ? tokens.gold : count > 0 ? tokens.primary : t.text.tertiary,
                border: `1px solid ${isActive || count > 0 ? tokens.primary : tokens.border}`,
                flexShrink: 0,
              }}
            >
              <span style={{ opacity: 0.55, marginRight: 6 }}>{z.sort_order}</span>
              {z.label}
              {count > 0 && <span style={{ marginLeft: 6, fontWeight: 700 }}>{count}</span>}
            </button>
          )
        })}
      </div>

        {/* The reason the add controls are inert, stated where the operator
            is looking rather than left to be inferred from a greyed-out UI. */}
        {!zoneChosen ? (
          <div style={styles.zonePrompt}>
            Pick a zone above to start adding elements. Nothing can be added until you do.
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>
        {/* Left — element catalog */}
        <div>
          <div style={styles.mockupCard}>
            <div style={styles.formCardTitle}>ANALYSE A MOCKUP</div>
            <div style={{ fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary, margin: '6px 0 12px', lineHeight: 1.5 }}>
              Upload a concept image to auto-identify elements. Items land in the zone the analyser suggests, then the active zone, and otherwise arrive unassigned for you to place from the cart.
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
          </div>

          <input style={{ ...inputStyle, marginBottom: 10 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search all elements…" />

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
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
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filteredLibrary.map((li) => {
              const isAdded = zoneChosen && functionItems.some((i) => i.label === li.name && i.zoneKey === activeZone)
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
                      {systemLabel(li.system)} · {li.unit}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: Number(li.default_rate) > 0 ? tokens.goldDark : t.text.muted }}>
                      {Number(li.default_rate) > 0 ? formatMoney(Number(li.default_rate), 'INR') : 'rate TBC'}
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
            {filteredLibrary.length === 0 && (
              <div style={{ fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary, padding: '24px 0', textAlign: 'center' }}>
                No elements match that search.
              </div>
            )}
          </div>

          <button type="button" style={styles.manualToggle} onClick={() => setShowManual(!showManual)}>
            + Add Custom Element Manually
          </button>
          {showManual && (
            <div style={styles.manualForm}>
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
              <button
                type="button"
                disabled={!zoneChosen || !manualItem.name.trim() || !manualItem.system}
                style={{ ...styles.toolbarBtnPrimary, opacity: zoneChosen && manualItem.name.trim() && manualItem.system ? 1 : 0.5 }}
                onClick={addManualItem}
              >
                Add to Quotation
              </button>
            </div>
          )}
        </div>

        {/* Right — cart, finish, totals */}
        <div style={styles.cartRail}>
          <div style={styles.cartHeader}>
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
                Pick a zone above, then tap elements to add them here.
              </div>
            ) : (
              cartGroups.map((group) => (
                <div key={group.key} style={{ marginBottom: 14 }}>
                  <div style={styles.cartZoneHeading}>{group.label}</div>
                  {group.items.map((item) => {
                    const eff = effectiveRate(item, pricingCtx)
                    const scaled = Math.abs(eff - item.rate) > 0.005
                    const isFloralLike = pricingCtx.scalesWithFinish[item.system] === true
                    const unpriced = item.rate <= 0
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
                          <span style={{ fontFamily: fonts.body, fontSize: 11, color: t.text.tertiary }}>{item.unit}</span>
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <span style={{ fontFamily: fonts.body, fontSize: 11, color: t.text.tertiary }}>₹</span>
                            {/* An unpriced line reads as "rate TBC" here, the
                                same words the library uses, instead of a
                                confident 0 that looks like a decision. */}
                            <input
                              type="number"
                              value={unpriced ? '' : item.rate}
                              placeholder="TBC"
                              onChange={(e) => updateItemRate(item.key, Number(e.target.value) || 0)}
                              title="Base rate before finish"
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
                        {/* Admin-only. Never rendered on any client document. */}
                        {scaled && (
                          <div style={styles.effectiveRateNote} title={`Base ${formatMoney(item.rate, 'INR')} at the selected finish`}>
                            effective {formatMoney(eff, 'INR')} / {item.unit}
                          </div>
                        )}
                        {isFloralLike && (
                          <label style={styles.gerberaToggle}>
                            <input type="checkbox" checked={item.gerberaFill} onChange={() => toggleGerbera(item.key)} style={{ width: 12, height: 12, accentColor: tokens.primary }} />
                            gerbera fill
                          </label>
                        )}

                        {/* Move controls. A line in the wrong place is now a
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
                          {/* Only meaningful when there are two functions to
                              move between. This is the move that reprices:
                              each function carries its own finish. */}
                          {twoFunction && (
                            <button
                              type="button"
                              style={styles.moveFnBtn}
                              title="Move this line to the other function. Floral lines reprice at that function's finish."
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
            {/* Finish applies to the ACTIVE function only. */}
            <label style={{ ...labelStyle, fontSize: 11 }}>
              FINISH{twoFunction ? ` — ${activeFunction === 'reception' ? 'RECEPTION' : 'MUHURTHAM'}` : ''}
            </label>
            <select
              style={{ ...inputStyle, padding: '7px 10px', fontSize: 13, marginBottom: colourVariantOffered ? 8 : 12 }}
              value={activeFinishKey}
              onChange={(e) => setActiveFinishKey(e.target.value)}
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
              {saving ? 'Saving...' : 'Preview and Print →'}
            </button>
            {items.length === 0 && (
              <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.text.tertiary, textAlign: 'center', marginTop: 6 }}>
                Add at least one element to continue
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  error: {
    background: tokens.rubyLight, color: tokens.ruby, border: `1px solid ${tokens.ruby}`,
    borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontFamily: fonts.body, fontSize: 13,
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
  // scroll out of view while elements are being tapped. The negative
  // margins + padding let the background span the full content width so
  // rows passing underneath are covered rather than showing through.
  placementBar: {
    position: 'sticky',
    top: 56,
    zIndex: 80,
    background: tokens.bg,
    margin: '0 -8px 16px',
    padding: '10px 8px 0',
    borderBottom: `1px solid ${tokens.border}`,
  },
  // Wraps to as many rows as the 13 zones need. Deliberately not a
  // horizontal scroller: at 1280 that hid 4 of the 13 behind a sideways
  // scroll, so the zones meant to act as upsell prompts were invisible.
  zoneStrip: {
    display: 'flex', gap: 6, flexWrap: 'wrap',
  },
  zonePrompt: {
    fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: tokens.ruby,
    background: tokens.rubyLight, border: `1px solid ${tokens.ruby}55`,
    borderRadius: 6, padding: '7px 10px', margin: '10px 0',
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
  unpricedNotice: {
    fontFamily: fonts.body, fontSize: 11, lineHeight: 1.5, color: tokens.goldDark,
    background: tokens.goldLight, border: `1px solid ${tokens.gold}`,
    borderRadius: 6, padding: '7px 10px', marginBottom: 10,
  },
  sendBlockedNote: {
    fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: tokens.goldDark,
  },
  mockupCard: { background: '#fff', borderRadius: 8, padding: 20, marginBottom: 16, border: `1px dashed ${tokens.gold}` },
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
  cartRail: {
    background: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 8,
    display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 200px)', overflow: 'hidden',
  },
  cartHeader: { padding: '16px 20px', background: tokens.primary },
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
    fontFamily: fonts.body, fontSize: 10, color: tokens.goldDark, marginTop: 4, textAlign: 'right',
  },
  gerberaToggle: {
    display: 'flex', alignItems: 'center', gap: 5, marginTop: 5,
    fontFamily: fonts.body, fontSize: 10, color: t.text.tertiary, cursor: 'pointer',
  },
  settingsPanel: { padding: '14px 16px', borderTop: `1px solid ${tokens.border}`, background: tokens.bg },
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
