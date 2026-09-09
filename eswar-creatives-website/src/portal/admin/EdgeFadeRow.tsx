// One horizontal scroll row with edge fades — the mechanic the zone rail
// established (build phase 6): hidden scrollbar, smooth scroll unless the
// user prefers reduced motion, and a 44px gradient at each end that appears
// only while content is hidden past that edge. Extracted so the element
// category row (and anything after it) reuses this exact behaviour instead
// of growing a second implementation.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

export function EdgeFadeRow({
  children,
  fadeColor,
  gap = 4,
  paddingBottom = 2,
  role,
  ariaLabel,
  updateKey,
}: {
  children: ReactNode
  /** The background the fades blend into (the row's surrounding colour). */
  fadeColor: string
  gap?: number
  paddingBottom?: number
  role?: string
  ariaLabel?: string
  /** Changes here re-measure the fades (e.g. when async content arrives). */
  updateKey?: unknown
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [fadeLeft, setFadeLeft] = useState(false)
  const [fadeRight, setFadeRight] = useState(false)

  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  // Edge fades appear only when there is content hidden past that edge.
  const updateFades = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setFadeLeft(el.scrollLeft > 1)
    setFadeRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }, [])

  useEffect(() => {
    updateFades()
    window.addEventListener('resize', updateFades)
    return () => window.removeEventListener('resize', updateFades)
  }, [updateFades, updateKey])

  return (
    <div style={styles.wrap}>
      <style>{`
        .efr-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .efr-scroll::-webkit-scrollbar { display: none; }
      `}</style>
      <div
        ref={scrollRef}
        className="efr-scroll"
        role={role}
        aria-label={ariaLabel}
        onScroll={updateFades}
        style={{
          display: 'flex',
          gap,
          overflowX: 'auto',
          paddingBottom,
          scrollBehavior: reducedMotion ? 'auto' : 'smooth',
        }}
      >
        {children}
      </div>
      {fadeLeft && (
        <div
          style={{ ...styles.fade, left: 0, background: `linear-gradient(to right, ${fadeColor}, transparent)` }}
          aria-hidden="true"
        />
      )}
      {fadeRight && (
        <div
          style={{ ...styles.fade, right: 0, background: `linear-gradient(to left, ${fadeColor}, transparent)` }}
          aria-hidden="true"
        />
      )}
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  wrap: { position: 'relative' },
  fade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 44,
    pointerEvents: 'none',
  },
}
