// Read-only public Brand Visual Guide view. No portal chrome at all: no
// sidebar, no account menu, just a branded header and three top tabs. Same
// rule as the client view — takes its data as props, never fetches, so the
// real /brand/:token route and admin's "Preview as public" (from either the
// admin tab or from inside a client preview) all render this one component.
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { t, fonts } from '../../theme'
import { useBrandVisualThumbnails } from '../../hooks/useBrandVisualThumbnails'
import { BrandVisualCard } from './BrandVisualCard'
import { BrandVisualDetailPanel } from './BrandVisualClientView'
import {
  BRAND_VISUAL_CATEGORIES,
  isSingleGroupCategory,
  resolvePublicAttachmentUrls,
  resolvePublicAttachments,
  resolvePublicFileUrls,
} from '../../utils/brandVisual'
import type { BrandVisualCategory, BrandVisualItem } from '../../utils/brandVisual'

export function BrandVisualPublicView({
  items,
  brandLabel,
  initialCategory = 'guidelines',
}: {
  items: BrandVisualItem[]
  brandLabel: string
  initialCategory?: BrandVisualCategory
}) {
  const [activeCategory, setActiveCategory] = useState<BrandVisualCategory>(initialCategory)
  const [openItem, setOpenItem] = useState<BrandVisualItem | null>(null)

  const cat = BRAND_VISUAL_CATEGORIES.find((c) => c.id === activeCategory)!
  const catItems = items.filter((i) => i.category === activeCategory)
  const thumbnails = useBrandVisualThumbnails(catItems, resolvePublicFileUrls)

  // Shared by the flat grid below and the Previous/Next nav, so paging
  // through the detail panel matches the order actually on screen.
  const flatSortedItems = isSingleGroupCategory(activeCategory)
    ? [...catItems].sort((a, b) => a.sort_order - b.sort_order)
    : []
  const openIndex = openItem ? flatSortedItems.findIndex((i) => i.id === openItem.id) : -1
  // Tone of Voice only for now, same as BrandVisualClientView.
  const showNav = openItem?.category === 'tone_of_voice' && openIndex !== -1

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.brandName}>{brandLabel}</div>
        <div style={s.tabs}>
          {BRAND_VISUAL_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className="pf-focus"
              style={{
                ...s.tabBtn,
                borderBottomColor: activeCategory === c.id ? t.text.primaryBrand : 'transparent',
                color: activeCategory === c.id ? t.text.primary : t.text.secondary,
              }}
              onClick={() => setActiveCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div style={s.body}>
        {catItems.length === 0 && <div style={s.empty}>Nothing here yet.</div>}
        {isSingleGroupCategory(activeCategory) ? (
          // A single-group category (Tone of Voice) has nothing to
          // subdivide, so it renders as one flat grid with no group
          // heading, rather than a "General" section title that would
          // just restate the tab itself.
          <div style={s.grid}>
            {flatSortedItems.map((item) => (
              <BrandVisualCard key={item.id} item={item} thumbnailUrl={thumbnails[item.id]} onOpen={setOpenItem} />
            ))}
          </div>
        ) : (
          cat.groups.map((g) => {
            const groupItems = catItems.filter((i) => i.group_label === g).sort((a, b) => a.sort_order - b.sort_order)
            if (groupItems.length === 0) return null
            return (
              <div key={g} style={{ marginBottom: 32 }}>
                <h2 style={s.groupHeading}>{g}</h2>
                <div style={s.grid}>
                  {groupItems.map((item) => (
                    <BrandVisualCard key={item.id} item={item} thumbnailUrl={thumbnails[item.id]} onOpen={setOpenItem} />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div style={s.footer}>Brand guidelines presented via EswarCreatives</div>

      {openItem && (
        <BrandVisualDetailPanel
          item={openItem}
          onClose={() => setOpenItem(null)}
          resolveFileUrls={resolvePublicFileUrls}
          resolveAttachments={resolvePublicAttachments}
          resolveAttachmentUrls={resolvePublicAttachmentUrls}
          onPrevious={showNav ? () => setOpenItem(flatSortedItems[openIndex - 1]) : undefined}
          onNext={showNav ? () => setOpenItem(flatSortedItems[openIndex + 1]) : undefined}
          hasPrevious={showNav && openIndex > 0}
          hasNext={showNav && openIndex < flatSortedItems.length - 1}
        />
      )}
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: t.background.page, fontFamily: fonts.body, color: t.text.primary },
  header: { background: t.background.subtle, padding: '48px 24px 0', textAlign: 'center', borderBottom: `1px solid ${t.border.subtle}` },
  brandName: { fontFamily: fonts.heading, fontWeight: 700, fontSize: 32, color: t.text.primary },
  tabs: { display: 'flex', justifyContent: 'center', gap: 4, marginTop: 24 },
  tabBtn: {
    padding: '10px 18px',
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'transparent',
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
  },
  body: { maxWidth: 960, margin: '0 auto', padding: '32px 24px 24px' },
  empty: { border: `1px dashed ${t.border.default}`, borderRadius: 14, padding: '40px 20px', textAlign: 'center', color: t.text.tertiary, fontSize: 13.5 },
  groupHeading: { fontFamily: fonts.heading, fontSize: 16, fontWeight: 600, color: t.text.primary, marginBottom: 12 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 },
  footer: {
    textAlign: 'center',
    padding: '20px 24px 40px',
    fontSize: 11.5,
    color: t.text.tertiary,
    fontFamily: "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  },
}
