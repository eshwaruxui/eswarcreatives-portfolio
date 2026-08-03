// Shared sortable table header row, so every admin table (leads, enquiries,
// and any future list) cycles and displays sort state the same way instead of
// each screen reimplementing its own header buttons and chevrons.
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { t, fonts } from '../../theme'
import { useBreakpoint } from '../../hooks/useBreakpoint'

export type SortDir = 'asc' | 'desc' | null

export type SortableColumn = {
  key: string
  label: string
  sortable?: boolean
  width?: string
  hideOnMobile?: boolean
}

// Single source of truth for the asc -> desc -> clear cycle, so callers wire
// their sort state to this instead of each reimplementing the transition.
export function nextSortState(
  sortKey: string | null,
  sortDir: SortDir,
  clickedKey: string
): { key: string | null; dir: SortDir } {
  if (sortKey !== clickedKey) return { key: clickedKey, dir: 'asc' }
  if (sortDir === 'asc') return { key: clickedKey, dir: 'desc' }
  return { key: null, dir: null }
}

export function SortableTableHeader({
  columns,
  sortKey,
  sortDir,
  onSort,
}: {
  columns: SortableColumn[]
  sortKey: string | null
  sortDir: SortDir
  onSort: (key: string) => void
}) {
  const { isMobile } = useBreakpoint()
  const [hoverKey, setHoverKey] = useState<string | null>(null)

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

          const isActive = sortKey === col.key
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
              >
                <span style={{ color: labelColor }}>{col.label}</span>
                {isActive ? (
                  sortDir === 'asc' ? (
                    <ChevronUp size={12} color={t.text.primaryBrand} />
                  ) : (
                    <ChevronDown size={12} color={t.text.primaryBrand} />
                  )
                ) : isHovered ? (
                  <ChevronsUpDown size={12} color={t.text.muted} />
                ) : null}
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
}
