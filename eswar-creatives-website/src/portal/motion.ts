// Portal motion tokens. The code counterpart of docs/MOTION_SYSTEM.md, which is
// the reference for what each value is for.
//
// The export is named `motionSystem`, deliberately NOT `motionTokens`.
// `theme.ts` already exports `motionTokens` with a flat shape (`durationFast`,
// `easeEnter`) and every one of the ~60 current call sites imports that. Two
// same-named exports with incompatible shapes would mean an import from the
// wrong module reads `motionTokens.durationFast` as `undefined`, which
// serializes into a CSS string as the literal text "undefined" and silently
// kills the transition with no console error. Distinct names make that
// impossible, and let both objects be imported into one file during the
// migration.
//
// Nothing imports this file yet. Migrating the existing `theme.ts` call sites
// is a single atomic pass (MOTION_SYSTEM.md, Phase 2), not opportunistic work,
// because that pass also has to reconcile three real divergences:
//   - duration.slow is 360ms here, `durationSlow` is 350ms in theme.ts.
//   - easing.standard is a different curve from theme.ts's `easeDefault`.
//   - duration.shimmer records the live 1.5s, not the 1.4s originally specced.
//
// Until then: new code needing a value theme.ts lacks (micro, moderate, slower,
// expressive, snap, emphasized, distance.*, delay.*) imports `motionSystem`
// from here. Everything else keeps importing `motionTokens` from theme.ts.
//
// First real consumer: SidePanel.tsx's resize handle (MOTION_SYSTEM.md 7.4),
// which is also what brings `byDistancePanelMs` below out of "specced, not
// implemented" (4.3) into actual use.

export const motionSystem = {
  duration: {
    instant: '0ms',
    micro: '80ms',
    fast: '120ms',
    base: '200ms',
    moderate: '280ms',
    slow: '360ms',
    slower: '480ms',
    expressive: '640ms',
    // Accepted exception, outside the transition scale: a looping
    // perceived-performance pattern, not a UI transition. Value matches the
    // nine live `ecShimmer` / `.ec-shimmer` call sites.
    shimmer: '1500ms',
  },
  delay: {
    none: '0ms',
    short: '40ms',
    base: '80ms',
    long: '160ms',
  },
  easing: {
    linear: 'linear',
    standard: 'cubic-bezier(0.2,0,0,1)',
    enter: 'cubic-bezier(0,0,0.2,1)',
    exit: 'cubic-bezier(0.4,0,1,1)',
    emphasized: 'cubic-bezier(0.2,0,0,1.2)',
    snap: 'cubic-bezier(0.16,1,0.3,1)',
  },
  distance: {
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '16px',
    xl: '24px',
  },
} as const

// motion.duration.byDistance.panel (MOTION_SYSTEM.md 4.3): 60ms per 100px of
// travel, clamped to [200ms, 420ms]. A function, not a token object member,
// since it depends on a runtime distance rather than a fixed value — e.g. a
// SidePanel resize committed programmatically (not mid-drag) animates for
// however far the width actually has to move, not a flat duration that would
// read as too slow for a small change and too abrupt for a large one.
export function byDistancePanelMs(distancePx: number): number {
  const raw = (Math.abs(distancePx) / 100) * 60
  return Math.min(420, Math.max(200, Math.round(raw)))
}
