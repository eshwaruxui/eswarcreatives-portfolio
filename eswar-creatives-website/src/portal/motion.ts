// Portal motion tokens. The code counterpart of docs/MOTION_SYSTEM.md, which is
// the reference for what each value is for.
//
// IMPORTANT, read before importing:
//
// `theme.ts` ALSO exports a symbol named `motionTokens`, with a flat shape
// (`durationFast`, `easeEnter`) rather than the nested one below
// (`duration.fast`, `easing.enter`). Every call site in the portal currently
// imports that one. Nothing imports this file yet, by design: migrating the
// ~60 existing call sites is a single atomic pass, not opportunistic work.
//
// While both exist:
//   1. Existing code keeps importing from `theme.ts`.
//   2. Never import both into the same file.
//   3. New code needing a value `theme.ts` lacks (micro, moderate, slower,
//      expressive, snap, emphasized, distance.*, delay.*) imports from here.
//
// Reading `motionTokens.durationFast` off THIS object yields `undefined`, which
// serializes into a CSS string as the literal text "undefined" and silently
// kills the transition with no console error. Check which module you imported
// from before reading a key.
//
// Three values deliberately diverge from `theme.ts` and are reconciled when the
// call sites migrate (see MOTION_SYSTEM.md section 4.1):
//   - duration.slow is 360ms here, `durationSlow` is 350ms there.
//   - easing.standard is a different curve from `easeDefault`.
//   - duration.shimmer records the live 1.5s, not the 1.4s originally specced.

export const motionTokens = {
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
