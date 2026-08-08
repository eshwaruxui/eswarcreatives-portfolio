// Shared pagination bar for admin list screens. Pairs with usePagination,
// which owns the state; this component is presentational and reports clicks
// back through onPageChange / onPageSizeChange.
//
// Deliberately does not animate itself on a page change. The bar staying
// still is what makes the content above it read as the thing that changed;
// animating both at once reads as the whole screen reloading.
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { mono } from '../../admin/ui'
import { useBreakpoint } from '../../hooks/useBreakpoint'

const GAP = 'gap' as const

// Always show the first page, the last page, the current page and its two
// neighbours. Everything else collapses to an ellipsis, which caps the run at
// five number buttons: 1 ... 4 5 6 ... 12.
export function pageList(current: number, total: number): (number | typeof GAP)[] {
  const shown = new Set<number>([1, total, current - 1, current, current + 1])
  const pages = [...shown].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)

  const out: (number | typeof GAP)[] = []
  let prev: number | null = null
  for (const p of pages) {
    if (prev !== null && p - prev > 1) out.push(GAP)
    out.push(p)
    prev = p
  }
  return out
}

export function Pagination({
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,
  showPageSizeSelector = true,
  showItemCount = true,
  itemLabel = 'items',
  pageStart,
  pageEnd,
  isLoading = false,
}: {
  totalItems: number
  pageSize: number
  currentPage: number
  onPageChange: (page: number) => void
  pageSizeOptions?: number[]
  onPageSizeChange?: (size: number) => void
  showPageSizeSelector?: boolean
  showItemCount?: boolean
  // Plural noun for the count label: "Showing 26 to 50 of 189 touches".
  itemLabel?: string
  // Supplied by usePagination so the label can never disagree with the slice
  // actually rendered above it.
  pageStart: number
  pageEnd: number
  // Disables every control while a fetch is in flight, so a second click
  // cannot queue a page change against data that is about to be replaced.
  isLoading?: boolean
}) {
  const { isMobile } = useBreakpoint()
  const [hover, setHover] = useState<string | null>(null)
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Nothing to page through and nothing to count.
  if (totalItems === 0) return null

  const countLabel = showItemCount ? (
    <p style={styles.count}>
      Showing {pageStart} to {pageEnd} of {totalItems} {itemLabel}
    </p>
  ) : null

  const sizeSelector = showPageSizeSelector && onPageSizeChange ? (
    <label style={styles.sizeLabel}>
      <span style={styles.sizeLabelText}>Rows</span>
      <select
        style={{ ...styles.sizeSelect, ...(isLoading ? styles.btnDisabled : null) }}
        value={pageSize}
        disabled={isLoading}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
      >
        {pageSizeOptions.map((size) => (
          <option key={size} value={size}>{size}</option>
        ))}
      </select>
    </label>
  ) : null

  // A single page needs no navigation, but it must not become a dead end. The
  // page size selector is the only route back to a paged view, and hiding it
  // along with the nav left no way to get from "39 rows at 50 per page" to a
  // smaller page size. The selector stays; the nav and the count go.
  if (totalPages <= 1) {
    return sizeSelector
      ? <div style={{ ...styles.bar, justifyContent: 'flex-end' }}>{sizeSelector}</div>
      : null
  }

  const atFirst = currentPage <= 1
  const atLast = currentPage >= totalPages

  function navBtn(
    key: string,
    label: string,
    icon: typeof ChevronLeft,
    targetPage: number,
    disabled: boolean
  ) {
    const Icon = icon
    const off = disabled || isLoading
    return (
      <button
        key={key}
        type="button"
        aria-label={label}
        title={label}
        style={{
          ...styles.navBtn,
          ...(off ? styles.btnDisabled : null),
          ...(!off && hover === key ? styles.btnHover : null),
        }}
        disabled={off}
        onClick={() => onPageChange(targetPage)}
        onMouseEnter={() => setHover(key)}
        onMouseLeave={() => setHover((h) => (h === key ? null : h))}
      >
        <Icon size={14} />
      </button>
    )
  }

  return (
    <div style={{ ...styles.bar, ...(isMobile ? styles.barMobile : null) }}>
      {countLabel}

      <div style={styles.controls}>
        {sizeSelector}

        <div style={styles.pageNav}>
          {navBtn('first', 'First page', ChevronsLeft, 1, atFirst)}
          {navBtn('prev', 'Previous page', ChevronLeft, currentPage - 1, atFirst)}

          {pageList(currentPage, totalPages).map((entry, i) => {
            if (entry === GAP) {
              return <span key={`gap-${i}`} style={styles.ellipsis}>...</span>
            }
            const isActive = entry === currentPage
            const key = `p-${entry}`
            return (
              <button
                key={key}
                type="button"
                aria-label={`Page ${entry}`}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  ...styles.pageBtn,
                  ...(isActive ? styles.pageBtnActive : null),
                  ...(isLoading ? styles.btnDisabled : null),
                  ...(!isLoading && !isActive && hover === key ? styles.btnHover : null),
                }}
                disabled={isLoading}
                onClick={() => onPageChange(entry)}
                onMouseEnter={() => setHover(key)}
                onMouseLeave={() => setHover((h) => (h === key ? null : h))}
              >
                {entry}
              </button>
            )
          })}

          {navBtn('next', 'Next page', ChevronRight, currentPage + 1, atLast)}
          {navBtn('last', 'Last page', ChevronsRight, totalPages, atLast)}
        </div>
      </div>
    </div>
  )
}

const transition = `background ${motionTokens.durationFast} ${motionTokens.easeDefault}, opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}, color ${motionTokens.durationFast} ${motionTokens.easeDefault}`

const styles: Record<string, CSSProperties> = {
  // Controls only, no chrome. The separator, background and spacing belong to
  // whatever container the bar sits in (StickyBar today), so a non-sticky
  // caller can frame it differently without fighting a border it did not ask
  // for, and the two never double up.
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  barMobile: {
    justifyContent: 'center',
    textAlign: 'center',
  },
  count: {
    fontFamily: mono,
    fontSize: 12,
    color: t.text.muted,
    margin: 0,
  },
  controls: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  sizeLabel: { display: 'inline-flex', alignItems: 'center', gap: 6 },
  sizeLabelText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
  },
  sizeSelect: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '5px 8px',
    outline: 'none',
    cursor: 'pointer',
  },
  pageNav: { display: 'flex', alignItems: 'center', gap: 4 },
  // Matches SortableTableHeader's visual weight: same body font, same 12px
  // scale, same muted-until-active treatment.
  pageBtn: {
    minWidth: 30,
    height: 30,
    padding: '0 8px',
    background: 'none',
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.secondary,
    cursor: 'pointer',
    transition,
  },
  pageBtnActive: {
    background: tokens.primary,
    borderColor: tokens.primary,
    color: t.text.onPrimary,
  },
  navBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    padding: 0,
    background: 'none',
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 6,
    color: t.text.secondary,
    cursor: 'pointer',
    transition,
  },
  btnHover: {
    background: t.background.muted,
    color: t.text.primary,
  },
  btnDisabled: {
    color: t.text.muted,
    opacity: 0.5,
    cursor: 'default',
    pointerEvents: 'none',
  },
  ellipsis: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
    padding: '0 2px',
    userSelect: 'none',
  },
}
