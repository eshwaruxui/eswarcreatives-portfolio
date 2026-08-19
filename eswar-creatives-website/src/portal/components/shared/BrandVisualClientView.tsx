// Read-only client-facing Brand Visual Guide view. Takes its data as props
// and renders with no assumption baked in about who's looking — the real
// client route feeds it RLS-scoped live data, and admin's "Preview as
// client" feeds it the same component with the admin's already-loaded data
// pre-filtered to what a client would actually see (published, visibility
// client/public). Never fetches anything itself.
import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Globe, Lock, Search, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { t, fonts, motionTokens } from '../../theme'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useBrandVisualThumbnails } from '../../hooks/useBrandVisualThumbnails'
import { SidePanel } from '../../admin/SidePanel'
import { BrandVisualCard } from './BrandVisualCard'
import { BrandVisualRenderer } from './BrandVisualRenderer'
import { ExtensionBadge } from './BrandVisualBadge'
import {
  BRAND_VISUAL_CATEGORIES,
  groupsForCategory,
  categoryLabel,
  isSingleGroupCategory,
  resolveAuthenticatedAttachmentUrls,
  resolveAuthenticatedAttachments,
  resolveAuthenticatedFileUrls,
} from '../../utils/brandVisual'
import type { BrandVisualCategory, BrandVisualFileUrls, BrandVisualItem, BrandVisualItemAttachment } from '../../utils/brandVisual'
import type { ResolvedBrandVisualAttachment } from './BrandVisualRenderer'

const mono = "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

export function BrandVisualClientView({
  items,
  brandLabel,
  initialCategory = 'guidelines',
  initialGroup,
  onPreviewPublic,
  canManagePublish = false,
  onItemUpdated,
}: {
  items: BrandVisualItem[]
  brandLabel: string
  initialCategory?: BrandVisualCategory
  initialGroup?: string
  // Present on the real client route, and on admin's "Preview as client" —
  // client gets exactly one preview button, "Preview as public", carrying
  // the category the viewer is currently on into that preview.
  onPreviewPublic?: (category: BrandVisualCategory) => void
  // True ONLY on the real client route (BrandVisualPage.tsx) -- deliberately
  // absent (defaults false) from admin's "Preview as client" call in
  // BrandVisualTab.tsx, so the publish toggle never renders, and therefore
  // never fires a write, from inside a preview. onItemUpdated is required
  // whenever this is true: the real route owns `items` in its own state and
  // needs to hear about the change to stay in sync.
  canManagePublish?: boolean
  onItemUpdated?: (updated: BrandVisualItem) => void
}) {
  const { isMobile } = useBreakpoint()
  const [activeCategory, setActiveCategory] = useState<BrandVisualCategory>(initialCategory)
  const [activeGroup, setActiveGroup] = useState<string>(initialGroup || groupsForCategory(initialCategory)[0])
  const [search, setSearch] = useState('')
  const [openItem, setOpenItem] = useState<BrandVisualItem | null>(null)

  function selectNav(category: BrandVisualCategory, group: string | null) {
    setActiveCategory(category)
    setActiveGroup(group || groupsForCategory(category)[0])
  }

  const q = search.trim().toLowerCase()
  const visible = items
    .filter((i) => i.category === activeCategory && i.group_label === activeGroup)
    .filter((i) => !q || i.title.toLowerCase().includes(q) || (i.summary ?? '').toLowerCase().includes(q))
    .sort((a, b) => a.sort_order - b.sort_order)

  const flat = isSingleGroupCategory(activeCategory)
  const desc = flat ? categoryLabel(activeCategory) : `${categoryLabel(activeCategory)} › ${activeGroup}`
  const heading = flat ? categoryLabel(activeCategory) : activeGroup
  const thumbnails = useBrandVisualThumbnails(visible, resolveAuthenticatedFileUrls)

  // Previous/Next navigation on the detail panel -- Tone of Voice only for
  // now (see BrandVisualDetailPanel), computed against the same `visible`
  // list the grid renders, so paging through the panel matches what's on
  // screen (including the active search filter).
  const openIndex = openItem ? visible.findIndex((i) => i.id === openItem.id) : -1
  const showNav = openItem?.category === 'tone_of_voice' && openIndex !== -1

  return (
    <div style={{ display: 'flex', gap: 28, flexDirection: isMobile ? 'column' : 'row' }}>
      <BrandVisualSidebar
        activeCategory={activeCategory}
        activeGroup={activeGroup}
        onSelect={selectNav}
        search={search}
        setSearch={setSearch}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.headerRow}>
          <div>
            {!flat && <div style={s.crumb}>{desc}</div>}
            <h1 style={s.heading}>{heading}</h1>
          </div>
          {onPreviewPublic && (
            <button type="button" style={s.previewBtn} onClick={() => onPreviewPublic(activeCategory)}>
              Preview as public
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <div style={s.empty}>Nothing published for you here yet.</div>
        ) : (
          <div style={s.grid}>
            {visible.map((item) => (
              <BrandVisualCard key={item.id} item={item} thumbnailUrl={thumbnails[item.id]} onOpen={setOpenItem} />
            ))}
          </div>
        )}

        <BrandVisualNote brandLabel={brandLabel} />
      </div>

      {openItem && (
        <BrandVisualDetailPanel
          item={openItem}
          onClose={() => setOpenItem(null)}
          onPrevious={showNav ? () => setOpenItem(visible[openIndex - 1]) : undefined}
          onNext={showNav ? () => setOpenItem(visible[openIndex + 1]) : undefined}
          hasPrevious={showNav && openIndex > 0}
          hasNext={showNav && openIndex < visible.length - 1}
          canManagePublish={canManagePublish}
          onItemUpdated={(updated) => {
            setOpenItem(updated)
            onItemUpdated?.(updated)
          }}
        />
      )}
    </div>
  )
}

// ── Sidebar: category accordion + group list + search ──────────────────
export function BrandVisualSidebar({
  activeCategory,
  activeGroup,
  onSelect,
  search,
  setSearch,
}: {
  activeCategory: BrandVisualCategory
  activeGroup: string
  onSelect: (category: BrandVisualCategory, group: string | null) => void
  search: string
  setSearch: (v: string) => void
}) {
  return (
    <div style={s.sidebar}>
      <div style={s.searchWrap}>
        <Search size={14} color={t.text.tertiary} style={s.searchIcon} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search this group"
          className="pf-focus"
          style={s.searchInput}
        />
      </div>
      {BRAND_VISUAL_CATEGORIES.map((cat) => {
        const open = activeCategory === cat.id
        // A single-group category (Tone of Voice) has nothing to
        // disambiguate, so its button is a direct leaf selector — no
        // expand/collapse, no nested one-item group list underneath.
        const flat = isSingleGroupCategory(cat.id)
        return (
          <div key={cat.id} style={{ marginBottom: 8 }}>
            <button
              type="button"
              className="pf-focus"
              style={{ ...s.catBtn, borderColor: open ? t.text.primaryBrand : t.border.subtle }}
              onClick={() => onSelect(cat.id, flat ? cat.groups[0] : open ? null : cat.groups[0])}
            >
              {cat.label}
            </button>
            {open && !flat && (
              <div style={s.groupList}>
                {cat.groups.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className="pf-focus"
                    style={{
                      ...s.groupBtn,
                      background: activeGroup === g ? t.background.tint2 : 'transparent',
                      color: activeGroup === g ? t.text.primaryBrand : t.text.secondary,
                      fontWeight: activeGroup === g ? 600 : 400,
                    }}
                    onClick={() => onSelect(cat.id, g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Detail drawer: shared SidePanel + the content renderer. Used by admin
// (preview), the real client route and the real public route alike —
// `resolveFileUrls` is the one thing that differs between an authenticated
// caller (direct signed URL) and an anonymous one (the token-gated edge
// function), so it's the only thing the caller has to supply.
//
// Previous/Next: a variant realized entirely through SidePanel's existing
// `headerExtra` slot, not a new SidePanel prop -- every other consumer
// (ClientPanel, ProjectPanel, LeadDrawer, EnquiryDrawer,
// LinkedInPostComposer) is unaffected. onPrevious/onNext are optional and
// only ever passed by a caller when the open item is Tone of Voice (see
// BrandVisualClientView/BrandVisualPublicView), so the buttons render only
// there for now, per the standing scope. hasPrevious/hasNext control the
// disabled state at the ends of the list, same convention as Pagination's
// First/Prev/Next/Last -- no wraparound.
export function BrandVisualDetailPanel({
  item,
  onClose,
  resolveFileUrls = resolveAuthenticatedFileUrls,
  resolveAttachments = resolveAuthenticatedAttachments,
  resolveAttachmentUrls = resolveAuthenticatedAttachmentUrls,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  canManagePublish = false,
  onItemUpdated,
}: {
  item: BrandVisualItem
  onClose: () => void
  resolveFileUrls?: (item: BrandVisualItem) => Promise<BrandVisualFileUrls | null>
  // Migration 0097. Two-step, mirroring resolveFileUrls' own split: first
  // the list of attachment rows (authenticated: a direct RLS-scoped query;
  // public: already nested on `item` by the listing RPC, no fetch at all),
  // then each row's own signed URL (authenticated: direct; public: the
  // token-gated get-brand-visual-attachment-url edge function).
  resolveAttachments?: (item: BrandVisualItem) => Promise<BrandVisualItemAttachment[]>
  resolveAttachmentUrls?: (attachment: BrandVisualItemAttachment) => Promise<BrandVisualFileUrls | null>
  onPrevious?: () => void
  onNext?: () => void
  hasPrevious?: boolean
  hasNext?: boolean
  // See BrandVisualClientView's own comment on this prop -- only ever true
  // on the real client route, never during an admin/client preview.
  canManagePublish?: boolean
  onItemUpdated?: (updated: BrandVisualItem) => void
}) {
  const [fileUrls, setFileUrls] = useState<BrandVisualFileUrls | null>(null)
  const [resolvedAttachments, setResolvedAttachments] = useState<ResolvedBrandVisualAttachment[]>([])
  const [expanded, setExpanded] = useState(false)
  const [togglePending, setTogglePending] = useState(false)
  const [toggleError, setToggleError] = useState<string | null>(null)

  async function handleTogglePublic(nextPublic: boolean) {
    setTogglePending(true)
    setToggleError(null)
    const { data, error } = await supabase.rpc('client_set_brand_visual_item_public', {
      p_item_id: item.id,
      p_public: nextPublic,
    })
    setTogglePending(false)
    if (error || !data) {
      setToggleError('Could not update — try again.')
      return
    }
    onItemUpdated?.({ ...item, visibility: (data as { visibility: 'client' | 'public' }).visibility })
  }
  const showPrevNext = !!(onPrevious || onNext)

  useEffect(() => {
    let cancelled = false
    setFileUrls(null)
    if (item.storage_path) {
      resolveFileUrls(item).then((u) => {
        if (!cancelled) setFileUrls(u)
      })
    }
    return () => {
      cancelled = true
    }
  }, [item, resolveFileUrls])

  useEffect(() => {
    let cancelled = false
    setResolvedAttachments([])
    resolveAttachments(item).then(async (list) => {
      if (cancelled || list.length === 0) return
      const resolved = await Promise.all(
        list.map(async (attachment) => ({ attachment, fileUrls: await resolveAttachmentUrls(attachment) }))
      )
      if (!cancelled) setResolvedAttachments(resolved)
    })
    return () => {
      cancelled = true
    }
  }, [item, resolveAttachments, resolveAttachmentUrls])

  return (
    <>
      {/* 720, not SidePanel's 480 default: a type specimen sheet (large
          rendered wordmarks up to ~130px) needs more room than a plain
          document paragraph does. A content-aware hint, not a SidePanel
          change -- the panel is still freely resizable from here. */}
      <SidePanel title={item.title} subtitle={categoryLabel(item.category)} onClose={onClose} width={720}>
        {item.detail.locked && (
          <div style={s.lockedNote}>
            <Lock size={12} /> Locked language — use exactly as written
          </div>
        )}
        {(showPrevNext || canManagePublish) && (
          <div style={s.topActionsRow}>
            <div style={s.prevNextRow}>
              {showPrevNext && (
                <>
                  <button
                    type="button"
                    style={{ ...s.prevNextBtn, ...(!hasPrevious ? s.prevNextBtnDisabled : null) }}
                    onClick={onPrevious}
                    disabled={!hasPrevious}
                    aria-label="Previous item"
                  >
                    <ChevronLeft size={14} /> Previous
                  </button>
                  <button
                    type="button"
                    style={{ ...s.prevNextBtn, ...(!hasNext ? s.prevNextBtnDisabled : null) }}
                    onClick={onNext}
                    disabled={!hasNext}
                    aria-label="Next item"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </>
              )}
            </div>
            {canManagePublish && (
              <div style={s.publishRow}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.visibility === 'public'}
                  aria-label="Make available for public"
                  className="pf-focus"
                  disabled={togglePending}
                  onClick={() => handleTogglePublic(item.visibility !== 'public')}
                  style={{
                    ...s.publishSwitch,
                    background: item.visibility === 'public' ? t.text.primaryBrand : t.border.default,
                    opacity: togglePending ? 0.6 : 1,
                  }}
                >
                  <span
                    style={{
                      ...s.publishSwitchKnob,
                      transform: item.visibility === 'public' ? 'translateX(16px)' : 'translateX(0)',
                    }}
                  />
                </button>
                <div>
                  <div style={s.publishLabel}>
                    <Globe size={12} />
                    {item.visibility === 'public' ? 'Available publicly' : 'Make available for public'}
                  </div>
                  {toggleError && <div style={s.publishError}>{toggleError}</div>}
                </div>
              </div>
            )}
          </div>
        )}
        {item.file_type && (
          <div style={{ marginBottom: 12 }}>
            <ExtensionBadge ext={item.file_type} />
          </div>
        )}
        <BrandVisualRenderer
          item={item}
          fileUrls={fileUrls}
          attachments={resolvedAttachments}
          onExpandImage={() => setExpanded(true)}
        />
      </SidePanel>
      {expanded && fileUrls && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setExpanded(false)}
          style={s.lightboxScrim}
        >
          <button type="button" aria-label="Close" style={s.lightboxClose} onClick={() => setExpanded(false)}>
            <X size={20} />
          </button>
          <img
            src={fileUrls.previewUrl}
            alt={item.title}
            onClick={(e) => e.stopPropagation()}
            style={s.lightboxImg}
          />
        </div>
      )}
    </>
  )
}

// ── Note field — client-only. No table backs this yet (out of the stated
// data model), so it's deliberately shown as a stub rather than accepting
// input that would silently vanish on refresh.
function BrandVisualNote({ brandLabel }: { brandLabel: string }) {
  return (
    <div style={s.noteBox}>
      <h3 style={s.noteHeading}>Notes for the EswarCreatives team</h3>
      <textarea
        disabled
        placeholder={`Leave a note about ${brandLabel}'s brand assets...`}
        rows={3}
        style={s.noteTextarea}
      />
      <p style={s.noteStub}>Not wired up yet — notes don't save in this version.</p>
    </div>
  )
}

// Used by admin's preview buttons to derive what a client/public visitor
// would see from the admin's own already-loaded (unfiltered) item list, so
// preview never issues a second fetch — see BrandVisualTab.
export function filterForPreviewAudience(items: BrandVisualItem[], audience: 'client' | 'public'): BrandVisualItem[] {
  return items.filter((i) => {
    if (i.status !== 'published') return false
    if (audience === 'public') return i.visibility === 'public'
    return i.visibility === 'client' || i.visibility === 'public'
  })
}

const s: Record<string, CSSProperties> = {
  sidebar: { width: 236, flexShrink: 0 },
  searchWrap: { position: 'relative', marginBottom: 16 },
  searchIcon: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' },
  searchInput: {
    width: '100%',
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 10,
    padding: '8px 12px 8px 30px',
    fontSize: 12.5,
    fontFamily: fonts.body,
    color: t.text.primary,
    background: t.background.surface,
    boxSizing: 'border-box',
  },
  catBtn: {
    width: '100%',
    textAlign: 'left',
    background: t.background.subtle,
    border: '1px solid',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
    fontWeight: 600,
    color: t.text.primary,
    cursor: 'pointer',
  },
  groupList: { padding: '8px 4px 2px 8px', display: 'flex', flexDirection: 'column', gap: 2 },
  groupBtn: { textAlign: 'left', border: 'none', borderRadius: 8, padding: '7px 10px', fontSize: 13, cursor: 'pointer' },
  lockedNote: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.tertiary,
    marginBottom: 12,
  },
  topActionsRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 16 },
  prevNextRow: { display: 'flex', alignItems: 'center', gap: 6 },
  prevNextBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: t.background.subtle,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    color: t.text.secondary,
    cursor: 'pointer',
    padding: '6px 10px',
    fontSize: 12.5,
    fontWeight: 600,
    fontFamily: fonts.body,
  },
  prevNextBtnDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  publishRow: { display: 'flex', alignItems: 'center', gap: 10 },
  publishSwitch: {
    position: 'relative',
    width: 36,
    height: 20,
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
    padding: 0,
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  publishSwitchKnob: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: t.background.surface,
    transition: `transform ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  publishLabel: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: t.text.secondary },
  publishError: { fontSize: 11.5, color: t.text.danger, marginTop: 2 },
  headerRow: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 },
  crumb: { fontFamily: mono, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.text.tertiary, marginBottom: 6 },
  heading: { fontFamily: fonts.heading, fontSize: 26, fontWeight: 600, margin: 0, color: t.text.primary },
  previewBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: t.background.surface,
    color: t.text.primary,
    border: `1px solid ${t.border.default}`,
    borderRadius: 10,
    padding: '9px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 },
  empty: { border: `1px dashed ${t.border.default}`, borderRadius: 14, padding: '40px 20px', textAlign: 'center', color: t.text.tertiary, fontSize: 13.5 },
  noteBox: { marginTop: 32, paddingTop: 24, borderTop: `1px solid ${t.border.subtle}` },
  noteHeading: { fontFamily: fonts.heading, fontSize: 16, fontWeight: 600, margin: '0 0 10px', color: t.text.primary },
  noteTextarea: {
    width: '100%',
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 13.5,
    fontFamily: fonts.body,
    color: t.text.secondary,
    resize: 'vertical',
    background: t.background.muted,
    boxSizing: 'border-box',
  },
  noteStub: { fontSize: 12, color: t.text.tertiary, marginTop: 8, fontStyle: 'italic' },
  lightboxScrim: {
    position: 'fixed',
    inset: 0,
    background: t.background.overlayStrong,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    transition: `opacity ${motionTokens.durationBase} ${motionTokens.easeDefault}`,
  },
  lightboxClose: {
    position: 'absolute',
    top: 20,
    right: 20,
    background: t.background.overlayLightStrong,
    border: 'none',
    color: t.text.inverse,
    borderRadius: 8,
    padding: 8,
    cursor: 'pointer',
  },
  lightboxImg: { maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain' },
}
