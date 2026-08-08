// A full table row of shimmer placeholders, for the first load of a list that
// renders as a <table>. Sits one level above the existing Skeleton block: that
// one is a single shimmering rectangle, this is a whole <tr> of them.
//
// The shimmer itself is deliberately not reimplemented here. Skeleton.tsx
// already owns the gradient, the ecShimmer keyframe and the timing, and that
// same keyframe name is emitted by ProgressiveImage and ClientDashboard too.
// A second definition would either collide with those or drift from them, so
// this composes Skeleton rather than restating it.
import type { CSSProperties } from 'react'
import { t, fonts } from '../../theme'
import { Skeleton } from './Skeleton'

export function SkeletonRow({
  columns,
  height = 48,
  animate = true,
}: {
  columns: number
  // Height of the row, so the placeholder occupies the same vertical space as
  // the real rows it stands in for and the table does not resize on load.
  height?: number
  // Off for a static placeholder. Useful when many rows are on screen at once
  // and the combined motion would be more distracting than informative.
  animate?: boolean
}) {
  return (
    <tr style={{ height }}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} style={styles.td}>
          {animate ? (
            <Skeleton height={12} width="70%" />
          ) : (
            <div style={styles.static} />
          )}
        </td>
      ))}
    </tr>
  )
}

const styles: Record<string, CSSProperties> = {
  td: {
    fontFamily: fonts.body,
    padding: '10px 12px',
    borderBottom: `1px solid ${t.border.subtle}`,
    verticalAlign: 'middle',
  },
  static: {
    height: 12,
    width: '70%',
    borderRadius: 6,
    background: t.background.muted,
  },
}
