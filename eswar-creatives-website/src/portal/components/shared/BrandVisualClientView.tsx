// Read-only client-facing Brand Visual Guide view. Takes its data as props
// and renders with no assumption baked in about who's looking — the real
// client route feeds it RLS-scoped live data, and admin's "Preview as
// client" feeds it the same component with the admin's already-loaded data
// pre-filtered to what a client would actually see (published, visibility
// client/public). Never fetches anything itself.
import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { t, fonts, motionTokens } from '../../theme'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { SidePanel } from '../../admin/SidePanel'
import { BrandVisualCard } from './BrandVisualCard'
import { BrandVisualRenderer } from './BrandVisualRenderer'
import { ExtensionBadge } from './BrandVisualBadge'
import {
  BRAND_VISUAL_CATEGORIES,
  groupsForCategory,
  categoryLabel,
  resolveAuthenticatedFileUrls,
} from '../../utils/brandVisual'
import type { BrandVisualCategory, BrandVisualFileUrls, BrandVisualItem } from '../../utils/brandVisual'

const mono = "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

export function BrandVisualClientView({
  items,
  brandLabel,
  initialCategory = 'guidelines',
  initialGroup,
  onPreviewPublic,
}: {
  items: BrandVisualItem[]
  brandLabel: string
  initialCategory?: BrandVisualCategory
  initialGroup?: string
  // Present on the real client route, and on admin's "Preview as client" —
  // client gets exactly one preview button, "Preview as public", carrying
  // the category the viewer is currently on into that preview.
  onPreviewPublic?: (category: BrandVisualCategory) => void
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

  const desc = `${categoryLabel(activeCategory)} › ${activeGroup}`

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
            <div style={s.crumb}>{desc}</div>
            <h1 style={s.heading}>{activeGroup}</h1>
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
              <BrandVisualCard key={item.id} item={item} onOpen={setOpenItem} />
            ))}
          </div>
        )}

        <BrandVisualNote brandLabel={brandLabel} />
      </div>

      {openItem && <BrandVisualDetailPanel item={openItem} onClose={() => setOpenItem(null)} />}
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
        return (
          <div key={cat.id} style={{ marginBottom: 8 }}>
            <button
              type="button"
              className="pf-focus"
              style={{ ...s.catBtn, borderColor: open ? t.text.primaryBrand : t.border.subtle }}
              onClick={() => onSelect(cat.id, open ? null : cat.groups[0])}
            >
              {cat.label}
            </button>
            {open && (
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
export function BrandVisualDetailPanel({
  item,
  onClose,
  resolveFileUrls = resolveAuthenticatedFileUrls,
}: {
  item: BrandVisualItem
  onClose: () => void
  resolveFileUrls?: (item: BrandVisualItem) => Promise<BrandVisualFileUrls | null>
}) {
  const [fileUrls, setFileUrls] = useState<BrandVisualFileUrls | null>(null)
  const [expanded, setExpanded] = useState(false)

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

  return (
    <>
      <SidePanel title={item.title} subtitle={categoryLabel(item.category)} onClose={onClose}>
        {item.file_type && (
          <div style={{ marginBottom: 12 }}>
            <ExtensionBadge ext={item.file_type} />
          </div>
        )}
        <BrandVisualRenderer item={item} fileUrls={fileUrls} onExpandImage={() => setExpanded(true)} />
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
