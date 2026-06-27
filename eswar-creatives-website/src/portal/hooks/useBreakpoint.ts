// Single source of truth for responsive logic across the client portal. Never
// scatter ad-hoc window.innerWidth checks in components: read this hook instead
// (see docs/COMPONENT_PATTERNS.md). Breakpoints: mobile < 768px, tablet
// 768-1024px, desktop > 1024px. Backed by matchMedia so it updates on resize
// and orientation change without a resize listener storm.
import { useEffect, useState } from 'react'

export type Breakpoint = {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

const MOBILE_QUERY = '(max-width: 767px)'
const TABLET_QUERY = '(min-width: 768px) and (max-width: 1024px)'

function read(): Breakpoint {
  if (typeof window === 'undefined') {
    // SSR / non-browser: assume desktop so layouts render at full width.
    return { isMobile: false, isTablet: false, isDesktop: true }
  }
  const isMobile = window.matchMedia(MOBILE_QUERY).matches
  const isTablet = window.matchMedia(TABLET_QUERY).matches
  return { isMobile, isTablet, isDesktop: !isMobile && !isTablet }
}

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(read)

  useEffect(() => {
    const mobile = window.matchMedia(MOBILE_QUERY)
    const tablet = window.matchMedia(TABLET_QUERY)
    const on = () => setBp(read())
    mobile.addEventListener('change', on)
    tablet.addEventListener('change', on)
    // Re-sync once on mount in case the first paint raced the media state.
    on()
    return () => {
      mobile.removeEventListener('change', on)
      tablet.removeEventListener('change', on)
    }
  }, [])

  return bp
}
