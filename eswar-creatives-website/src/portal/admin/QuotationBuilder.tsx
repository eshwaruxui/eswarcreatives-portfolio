// Quotation Module Phase 1 — the 3-view create/edit flow, matching the
// validated prototype exactly (newgen-event-studio/claude project files/
// newgen_quotation.jsx): Client+Event form -> Builder (library/search/
// category-tabs on the left, a persistent cart rail with live totals and
// settings on the right) -> Preview. Settings (discount/advance/validity/
// GST) live in the cart rail, not a separate step, so the total updates as
// items are added — that's the progressive-disclosure design, not a
// simplification of a planned 4th step.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, Printer, Mail, Send } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import { ui, mono, formatMoney } from './ui'
import { formatPortalDate } from '../utils/formatDate'
import { ACTIVE_TENANT_ID } from '../tenant/activeTenantId'
import { QuotationDocument, type QuotationDocumentItem } from '../components/quotation/QuotationDocument'
import type { CSSProperties } from 'react'

const EVENT_TYPES = [
  'Wedding Reception', 'Wedding Ceremony', 'Engagement', 'Puberty Function',
  'Baby Shower', 'Ear Piercing Ceremony', 'Housewarming', 'Birthday Celebration',
  'Anniversary', 'Corporate Event', 'Shop / Showroom Opening', 'Office Inauguration',
  'Brand Activation', 'Product Launch', 'Award Function', 'Temple Function',
]

type LibraryItem = { id: string; category: string; name: string; unit: string | null; default_rate: number | null }
type CartItem = QuotationDocumentItem & { key: string; source: 'library' | 'mockup_ai' | 'manual' }

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

function computeTotals(items: CartItem[], discountPct: number, gstEnabled: boolean) {
  const subtotal = items.reduce((sum, i) => sum + i.rate * i.qty, 0)
  const discountAmount = (subtotal * discountPct) / 100
  const afterDiscount = subtotal - discountAmount
  const gstAmount = gstEnabled ? afterDiscount * 0.18 : 0
  const total = afterDiscount + gstAmount
  return { subtotal, discountAmount, gstAmount, total }
}

export function QuotationBuilder() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'

  const [view, setView] = useState<'form' | 'builder' | 'preview'>('form')
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [quotationId, setQuotationId] = useState<string | null>(isNew ? null : id ?? null)
  const [quotationNumber, setQuotationNumber] = useState<string>('')
  const [createdAt, setCreatedAt] = useState<string>(new Date().toISOString())
  const [status, setStatus] = useState<'draft' | 'sent'>('draft')
  const [publicToken, setPublicToken] = useState<string | null>(null)

  const [client, setClient] = useState<ClientForm>({ name: '', phone: '', email: '', address: '' })
  const [eventInfo, setEventInfo] = useState<EventForm>({ type: '', date: '', venue: '', guestCount: '', notes: '' })
  const [items, setItems] = useState<CartItem[]>([])

  const [library, setLibrary] = useState<LibraryItem[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [showManual, setShowManual] = useState(false)
  const [manualItem, setManualItem] = useState({ name: '', category: '', unit: 'per event', rate: '', qty: '1' })

  const [mockupFile, setMockupFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [mockupNotice, setMockupNotice] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [discount, setDiscount] = useState(0)
  const [advance, setAdvance] = useState(50)
  const [validDays, setValidDays] = useState(7)
  const [gstEnabled, setGstEnabled] = useState(false)

  // Load library + (if editing) the existing quotation.
  useEffect(() => {
    void (async () => {
      const { data: libRows } = await supabase
        .from('quotation_item_library')
        .select('id, category, name, unit, default_rate')
        .eq('is_active', true)
        .order('sort_order')
      setLibrary((libRows ?? []) as LibraryItem[])

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
        setDiscount(Number(q.discount_pct) || 0)
        setAdvance(Number(q.advance_pct) || 50)
        setValidDays(Number(q.validity_days) || 7)
        setGstEnabled(!!q.gst_enabled)

        const { data: itemRows } = await supabase
          .from('quotation_items')
          .select('id, category, label, unit, qty, rate, amount, note, source')
          .eq('quotation_id', id)
          .order('sort_order')
        setItems(
          (itemRows ?? []).map((r) => ({
            key: r.id, category: r.category, label: r.label, unit: r.unit,
            qty: Number(r.qty), rate: Number(r.rate), amount: Number(r.amount),
            note: r.note, source: r.source,
          }))
        )
        setView('builder')
      }
      setLoading(false)
    })()
  }, [id, isNew])

  const canProceedFromForm = client.name.trim() && client.phone.trim() && eventInfo.type && eventInfo.date

  // Reserve the real quotation row (and its quotation_number) the moment the
  // admin moves past Step 1, rather than only at the very end — so the
  // number exists as soon as it's shown, and event details survive a
  // navigate-away instead of living only in local state until Preview.
  async function saveClientEvent(): Promise<string | null> {
    setSaving(true)
    setError(null)
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

  // Persist settings + totals + the full item list. Items are synced as a
  // delete-then-insert against the small per-quotation set (typically well
  // under 50 rows), simpler and just as reliable as a diff for this size.
  async function saveScopeAndSettings(qId: string) {
    setSaving(true)
    setError(null)
    const { subtotal, discountAmount, gstAmount, total } = computeTotals(items, discount, gstEnabled)
    const advanceAmount = (total * advance) / 100

    const { error: upErr } = await supabase
      .from('quotations')
      .update({
        discount_pct: discount,
        advance_pct: advance,
        validity_days: validDays,
        gst_enabled: gstEnabled,
        subtotal,
        discount_amount: discountAmount,
        gst_amount: gstAmount,
        total_amount: total,
        advance_amount: advanceAmount,
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
          category: it.category,
          label: it.label,
          unit: it.unit,
          qty: it.qty,
          rate: it.rate,
          amount: it.rate * it.qty,
          note: it.note ?? null,
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
    const success = await saveScopeAndSettings(quotationId)
    if (success) setView('preview')
  }

  async function handleSend() {
    if (!quotationId) return
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
    setItems((prev) => {
      const existing = prev.find((i) => i.label === li.name)
      if (existing) {
        return prev.map((i) => (i.label === li.name ? { ...i, qty: i.qty + 1 } : i))
      }
      return [
        ...prev,
        {
          key: `lib-${li.id}-${Date.now()}`,
          category: li.category, label: li.name, unit: li.unit ?? 'per event',
          qty: 1, rate: li.default_rate ?? 0, amount: 0, source: 'library',
        },
      ]
    })
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key))
  }

  function updateItemQty(key: string, qty: number) {
    if (qty < 1) return
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty } : i)))
  }

  function updateItemRate(key: string, rate: number) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, rate } : i)))
  }

  function addManualItem() {
    if (!manualItem.name.trim() || !manualItem.rate) return
    setItems((prev) => [
      ...prev,
      {
        key: `manual-${Date.now()}`,
        category: manualItem.category || categories[1] || 'Other',
        label: manualItem.name.trim(),
        unit: manualItem.unit || 'per event',
        qty: Number(manualItem.qty) || 1,
        rate: Number(manualItem.rate) || 0,
        amount: 0,
        source: 'manual',
      },
    ])
    setManualItem({ name: '', category: '', unit: 'per event', rate: '', qty: '1' })
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
      const found = (data.data ?? []) as { category: string; label: string; unit: string; qty: number; rate: number }[]
      setItems((prev) => {
        const combined = [...prev]
        for (const f of found) {
          if (!combined.find((i) => i.label === f.label)) {
            combined.push({
              key: `ai-${f.label}-${Date.now()}`,
              category: f.category, label: f.label, unit: f.unit,
              qty: f.qty, rate: f.rate, amount: 0, source: 'mockup_ai',
            })
          }
        }
        return combined
      })
      setMockupNotice(`${found.length} item${found.length === 1 ? '' : 's'} identified and added. Review rates as needed.`)
    } catch {
      setMockupNotice('Could not analyze the mockup. Add items manually.')
    }
    setAnalyzing(false)
  }, [mockupFile])

  const categories = ['All', ...new Set(library.map((i) => i.category))]
  const filteredLibrary = library.filter((li) => {
    const matchCat = activeCategory === 'All' || li.category === activeCategory
    const matchSearch = li.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const { subtotal, discountAmount, gstAmount, total } = computeTotals(items, discount, gstEnabled)
  const advanceAmount = (total * advance) / 100

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
          {client.email && (
            <a
              style={styles.toolbarBtnGhost}
              href={`mailto:${client.email}?subject=${encodeURIComponent(`Quotation ${quotationNumber} - ${eventInfo.type} - Newgen Event Studio`)}&body=${encodeURIComponent(
                `Dear ${client.name},\n\nPlease find your quotation ${quotationNumber} for ${eventInfo.type}${eventInfo.date ? ` on ${formatPortalDate(eventInfo.date)}` : ''}${eventInfo.venue ? ` at ${eventInfo.venue}` : ''}.\n\nTotal: ${formatMoney(total, 'INR')}\nAdvance (${advance}%): ${formatMoney(advanceAmount, 'INR')}\nValid for ${validDays} days.\n\nWarm regards,\nNewgen Event Studio\nWhatsApp: 9176045045`
              )}`}
            >
              <Mail size={14} /> Send via Email
            </a>
          )}
          {status === 'draft' ? (
            <button type="button" style={styles.toolbarBtnPrimary} onClick={() => void handleSend()}>
              <Send size={14} /> Send (activate link)
            </button>
          ) : (
            publicUrl && <span style={styles.publicLink}>{publicUrl}</span>
          )}
        </div>
        <div style={{ padding: '24px 0' }}>
          <QuotationDocument
            tenantId={ACTIVE_TENANT_ID}
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
              subtotal,
              discount_amount: discountAmount,
              gst_amount: gstAmount,
              total_amount: total,
              advance_amount: advanceAmount,
            }}
            items={items}
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
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Special Requirements / Notes</label>
              <textarea style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} rows={3} value={eventInfo.notes} onChange={(e) => setEventInfo({ ...eventInfo, notes: e.target.value })} placeholder="Theme preferences, specific requirements, or client notes" />
            </div>
          </div>
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>
        {/* Left — library */}
        <div>
          <div style={styles.mockupCard}>
            <div style={styles.formCardTitle}>ANALYSE A MOCKUP</div>
            <div style={{ fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary, margin: '6px 0 12px', lineHeight: 1.5 }}>
              Upload a concept image to auto-identify decoration items.
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

          <input style={{ ...inputStyle, marginBottom: 10 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items…" />

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
                  fontFamily: fonts.body, fontSize: 12, fontWeight: activeCategory === cat ? 600 : 400,
                  background: activeCategory === cat ? tokens.primary : '#fff',
                  color: activeCategory === cat ? tokens.gold : t.text.secondary,
                  border: `1px solid ${activeCategory === cat ? tokens.primary : tokens.border}`,
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filteredLibrary.map((li) => {
              const isAdded = items.some((i) => i.label === li.name)
              return (
                <div
                  key={li.id}
                  onClick={() => addLibraryItem(li)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 14px', borderRadius: 6, cursor: 'pointer',
                    background: isAdded ? `${tokens.primary}15` : '#fff',
                    border: `1px solid ${isAdded ? tokens.primary : tokens.border}`,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: isAdded ? 600 : 400, color: t.text.primary }}>{li.name}</div>
                    <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.text.tertiary, marginTop: 2 }}>{li.category} · {li.unit}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: tokens.goldDark }}>
                      {li.default_rate != null ? formatMoney(li.default_rate, 'INR') : '—'}
                    </div>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isAdded ? tokens.primary : '#fff', border: `1.5px solid ${isAdded ? tokens.primary : tokens.border}`,
                      color: isAdded ? tokens.gold : t.text.tertiary, fontSize: 16, fontWeight: 700,
                    }}>
                      {isAdded ? '✓' : '+'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <button type="button" style={styles.manualToggle} onClick={() => setShowManual(!showManual)}>
            + Add Custom Item Manually
          </button>
          {showManual && (
            <div style={styles.manualForm}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Item Name</label>
                  <input style={inputStyle} value={manualItem.name} onChange={(e) => setManualItem({ ...manualItem, name: e.target.value })} placeholder="Custom item name" />
                </div>
                <div>
                  <label style={labelStyle}>Rate (₹)</label>
                  <input type="number" style={inputStyle} value={manualItem.rate} onChange={(e) => setManualItem({ ...manualItem, rate: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label style={labelStyle}>Qty</label>
                  <input type="number" style={inputStyle} value={manualItem.qty} onChange={(e) => setManualItem({ ...manualItem, qty: e.target.value })} />
                </div>
                <div>
                  <label style={labelStyle}>Unit</label>
                  <input style={inputStyle} value={manualItem.unit} onChange={(e) => setManualItem({ ...manualItem, unit: e.target.value })} placeholder="per event" />
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select style={inputStyle} value={manualItem.category} onChange={(e) => setManualItem({ ...manualItem, category: e.target.value })}>
                    <option value="">Select category</option>
                    {categories.filter((c) => c !== 'All').map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <button type="button" style={styles.toolbarBtnPrimary} onClick={addManualItem}>Add to Quotation</button>
            </div>
          )}
        </div>

        {/* Right — cart + settings */}
        <div style={styles.cartRail}>
          <div style={styles.cartHeader}>
            <div style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 700, color: tokens.gold }}>{client.name || 'Client Name'}</div>
            <div style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 500, color: '#fff', marginTop: 2, opacity: 0.85 }}>
              {eventInfo.type}{eventInfo.date ? ` · ${formatPortalDate(eventInfo.date)}` : ''}
            </div>
          </div>

          <div style={styles.cartItems}>
            {items.length === 0 ? (
              <div style={{ color: t.text.tertiary, fontFamily: fonts.body, fontSize: 13, textAlign: 'center', padding: '40px 16px', lineHeight: 1.6 }}>
                Select items from the library, or analyse a mockup to begin
              </div>
            ) : (
              items.map((item) => (
                <div key={item.key} style={styles.cartItem}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, marginRight: 8 }}>
                      <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: t.text.primary }}>{item.label}</div>
                      <div style={{ fontFamily: fonts.body, fontSize: 11, color: t.text.tertiary, marginTop: 1 }}>{item.category}</div>
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
                      <input
                        type="number" value={item.rate}
                        onChange={(e) => updateItemRate(item.key, Number(e.target.value) || 0)}
                        style={{ width: 72, padding: '4px 6px', border: `1px solid ${tokens.border}`, borderRadius: 4, fontFamily: fonts.body, fontSize: 12, fontWeight: 500, color: tokens.primary, textAlign: 'right' }}
                      />
                    </div>
                    <div style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 700, color: tokens.primary, minWidth: 72, textAlign: 'right' }}>
                      {formatMoney(item.rate * item.qty, 'INR')}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div style={styles.settingsPanel}>
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

            <div style={{ borderTop: `1px solid ${tokens.border}`, paddingTop: 10 }}>
              {discount > 0 && (
                <div style={styles.totalLine}>
                  <span style={{ fontFamily: fonts.body, fontSize: 12, color: tokens.ruby }}>Discount ({discount}%)</span>
                  <span style={{ fontFamily: fonts.body, fontSize: 12, color: tokens.ruby, fontWeight: 600 }}>- {formatMoney(discountAmount, 'INR')}</span>
                </div>
              )}
              {gstEnabled && (
                <div style={styles.totalLine}>
                  <span style={{ fontFamily: fonts.body, fontSize: 12, color: t.text.secondary }}>GST (18%)</span>
                  <span style={{ fontFamily: fonts.body, fontSize: 12, color: t.text.secondary }}>{formatMoney(gstAmount, 'INR')}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, paddingTop: 4, borderTop: `1px solid ${tokens.border}` }}>
                <span style={{ fontFamily: fonts.body, fontSize: 16, color: tokens.primary, fontWeight: 700 }}>Total</span>
                <span style={{ fontFamily: fonts.body, fontSize: 16, color: tokens.primary, fontWeight: 700 }}>{formatMoney(total, 'INR')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: fonts.body, fontSize: 12, color: tokens.goldDark, fontWeight: 500 }}>Advance ({advance}%)</span>
                <span style={{ fontFamily: fonts.body, fontSize: 12, color: tokens.goldDark, fontWeight: 700 }}>{formatMoney(advanceAmount, 'INR')}</span>
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
                Add at least one item to continue
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
  mockupCard: { background: '#fff', borderRadius: 8, padding: 20, marginBottom: 16, border: `1px dashed ${tokens.gold}` },
  chooseBtn: {
    padding: '8px 14px', background: tokens.bg, border: `1px solid ${tokens.border}`, color: tokens.primary,
    fontFamily: fonts.body, fontSize: 13, fontWeight: 500, cursor: 'pointer', borderRadius: 4,
  },
  mockupNotice: {
    marginTop: 10, fontFamily: fonts.body, fontSize: 13, color: tokens.primary, fontWeight: 500,
    padding: '8px 12px', background: `${tokens.primary}15`, borderRadius: 4,
  },
  manualToggle: {
    marginTop: 12, width: '100%', padding: 10, background: 'transparent', border: `1px dashed ${tokens.primary}`,
    color: tokens.primary, fontFamily: fonts.body, fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 6,
  },
  manualForm: { background: '#fff', padding: 16, marginTop: 8, border: `1px solid ${tokens.border}`, borderRadius: 6 },
  cartRail: { background: '#fff', border: `1px solid ${tokens.border}`, borderRadius: 8, display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 160px)', overflow: 'hidden' },
  cartHeader: { padding: '16px 20px', background: tokens.primary },
  cartItems: { flex: 1, padding: '12px 16px', overflowY: 'auto' },
  cartItem: { padding: '10px 0', borderBottom: '1px solid #f0ece4' },
  removeBtn: { background: 'none', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: 18, padding: '0 2px', lineHeight: 1 },
  stepperBtn: { width: 24, height: 24, background: tokens.bg, border: `1px solid ${tokens.border}`, cursor: 'pointer', color: tokens.primary, fontFamily: fonts.body, fontSize: 16, fontWeight: 700, borderRadius: 4 },
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
