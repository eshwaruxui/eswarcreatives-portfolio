// Shared sortable table header row, so every admin table (leads, enquiries,
// and any future list) cycles and displays sort state the same way instead of
// each screen reimplementing its own header buttons and chevrons.
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { t, fonts } from '../../theme'
import { useBreakpoint } from '../../hooks/useBreakpoint'

export type SortDir = 'asc' | 'desc' | null

export type SortSpec = { key: string; dir: 'asc' | 'desc' }

export type SortableColumn = {
  key: string
  label: string
  sortable?: boolean
  width?: string
  hideOnMobile?: boolean
}

// Single source of truth for the asc -> desc -> clear cycle, so single-sort
// callers (EnquiriesTab) wire their sort state to this instead of each
// reimplementing the transition.
export function nextSortState(
  sortKey: string | null,
  sortDir: SortDir,
  clickedKey: string
): { key: string | null; dir: SortDir } {
  if (sortKey !== clickedKey) return { key: clickedKey, dir: 'asc' }
  if (sortDir === 'asc') return { key: clickedKey, dir: 'desc' }
  return { key: null, dir: null }
}

// Multi-column counterpart: every click is additive — no modifier key. A
// fresh column is appended as the lowest-priority sort key (asc); a column
// already in the list cycles asc -> desc -> removed, in place, without
// touching the others. (Originally required holding Shift to add a second
// column; changed to plain-click-additive since the modifier was never
// discovered in practice.) Order in the returned array is priority order —
// use the "Clear sort" affordance in the caller to reset to no sort at all.
export function toggleMultiSort(sorts: SortSpec[], clickedKey: string): SortSpec[] {
  const idx = sorts.findIndex((sp) => sp.key === clickedKey)
  if (idx === -1) return [...sorts, { key: clickedKey, dir: 'asc' }]
  if (sorts[idx].dir === 'asc') {
    const next = [...sorts]
    next[idx] = { key: clickedKey, dir: 'desc' }
    return next
  }
  return sorts.filter((sp) => sp.key !== clickedKey)
}

export function SortableTableHeader({
  columns,
  sortKey = null,
  sortDir = null,
  sorts,
  onSort,
}: {
  columns: SortableColumn[]
  // Single-column mode (existing callers, e.g. EnquiriesTab).
  sortKey?: string | null
  sortDir?: SortDir
  // Multi-column mode: pass sorts (priority-ordered) instead. When present,
  // sortKey/sortDir are ignored and numbered priority badges are shown once
  // more than one column is active.
  sorts?: SortSpec[]
  onSort: (key: string) => void
}) {
  const { isMobile } = useBreakpoint()
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const multi = !!sorts

  return (
    <tr>
      {columns
        .filter((col) => !(isMobile && col.hideOnMobile))
        .map((col) => {
          const thStyle = { ...s.th, ...(col.width ? { width: col.width } : {}) }

          if (!col.sortable) {
            return (
              <th key={col.key} style={thStyle}>
                {col.label}
              </th>
            )
          }

          const activeDir: 'asc' | 'desc' | null = multi
            ? sorts!.find((sp) => sp.key === col.key)?.dir ?? null
            : sortKey === col.key ? (sortDir as 'asc' | 'desc' | null) : null
          const priority = multi && sorts!.length > 1 ? sorts!.findIndex((sp) => sp.key === col.key) : -1
          const isActive = activeDir !== null
          const isHovered = hoverKey === col.key
          const labelColor = isActive || isHovered ? t.text.primary : t.text.muted

          return (
            <th key={col.key} style={thStyle}>
              <button
                type="button"
                style={s.sortBtn}
                onClick={() => onSort(col.key)}
                onMouseEnter={() => setHoverKey(col.key)}
                onMouseLeave={() => setHoverKey((k) => (k === col.key ? null : k))}
                title={multi ? 'Click to sort by this column too · click again to reverse · click a third time to remove it' : undefined}
              >
                <span style={{ color: labelColor }}>{col.label}</span>
                {priority >= 0 && <span style={s.priorityBadge}>{priority + 1}</span>}
                {/* Icon slot is always present (never unmounted) so its width
                    never changes on hover/active — that's what was causing
                    every later column to jump on an auto-layout table. */}
                <span style={s.sortIcon}>
                  {isActive ? (
                    activeDir === 'asc' ? (
                      <ChevronUp size={12} color={t.text.primaryBrand} />
                    ) : (
                      <ChevronDown size={12} color={t.text.primaryBrand} />
                    )
                  ) : (
                    <ChevronsUpDown size={12} color={isHovered ? t.text.muted : 'transparent'} />
                  )}
                </span>
              </button>
            </th>
          )
        })}
    </tr>
  )
}

const s: Record<string, CSSProperties> = {
  th: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 500,
    color: t.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    padding: '8px 12px',
    textAlign: 'left',
    borderBottom: `1px solid ${t.border.subtle}`,
    whiteSpace: 'nowrap',
  },
  sortBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sortIcon: {
    display: 'inline-flex',
    width: 12,
    height: 12,
    flexShrink: 0,
  },
  priorityBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 14,
    height: 14,
    padding: '0 3px',
    borderRadius: 7,
    background: t.text.primaryBrand,
    color: t.background.surface,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 0,
    fontFamily: fonts.body,
    flexShrink: 0,
  },
}
