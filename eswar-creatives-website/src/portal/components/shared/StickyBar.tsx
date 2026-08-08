// Pins its children to the bottom of the viewport across the admin content
// area, so a control that belongs to a long list (currently only Pagination)
// stays reachable without scrolling to the end of the table.
//
// Reuses the existing admin sticky-footer treatment from InvoicesAdmin /
// ProposalsAdmin / ClientsList verbatim: position fixed, bottom 0, z-index 40,
// a hairline top border and safe-area-aware bottom padding. Those three are
// mobile-only and so can sit at left 0; this one also runs on desktop, where
// the content area starts after the sidebar, hence the left offset below.
//
// On z-index 40: the portal's rule is that a sticky bar must sit BELOW every
// overlay so it never paints over an open dialog (TopBar states this too, at
// z-index 90). 40 clears page content while staying under modals at 100+,
// SidePanel at 201, the mobile nav drawer at 300, the shared Modal scrim at
// 400, and the lightbox and toasts at 9999.
import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { t } from '../../theme'
import { useBreakpoint } from '../../hooks/useBreakpoint'

export function StickyBar({ children }: { children: ReactNode }) {
  const { isMobile, isTablet } = useBreakpoint()
  const barRef = useRef<HTMLDivElement>(null)
  const [barHeight, setBarHeight] = useState(0)

  // The bar is out of flow, so without a spacer of exactly its height the last
  // table row hides behind it. Measured rather than hardcoded because the bar
  // wraps to two lines on narrow viewports, and a stale constant would either
  // clip the last row or leave a visible gap.
  useLayoutEffect(() => {
    const el = barRef.current
    if (!el) return
    const sync = () => setBarHeight(el.getBoundingClientRect().height)
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Matches AdminShell's sidebar, which is width 240 on desktop, 180 on
  // tablet, and hidden entirely on mobile where the hamburger drawer replaces
  // it. Anchoring to the same values keeps the bar flush with the content
  // column instead of running under the nav.
  const left = isMobile ? 0 : isTablet ? 180 : 240

  // Horizontal padding mirrors AdminShell's own content padding (16px on
  // mobile and tablet, 32px on desktop) so the bar's first control lines up
  // with the table above it. An earlier 24px left the count label 8px adrift
  // of the table's left edge, which read as a misaligned bar rather than as a
  // deliberate inset.
  const padX = isMobile || isTablet ? 16 : 32

  return (
    <>
      <div style={{ height: barHeight }} aria-hidden="true" />
      <div
        ref={barRef}
        style={{
          ...styles.bar,
          left,
          padding: `8px ${padX}px calc(8px + env(safe-area-inset-bottom, 0px))`,
        }}
      >
        {children}
      </div>
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  bar: {
    position: 'fixed',
    right: 0,
    bottom: 0,
    zIndex: 40,
    background: t.background.page,
    borderTop: `1px solid ${t.border.subtle}`,
    // Horizontal padding is applied inline so it can track the breakpoint;
    // the safe-area bottom clearance matches the existing admin sticky
    // footers, so the bar clears the iOS home indicator rather than sitting
    // under it.
    boxSizing: 'border-box',
  },
}
