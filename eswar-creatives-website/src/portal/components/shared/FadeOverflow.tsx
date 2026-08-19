// Clips overflowing content and fades its trailing edge out to the page
// surface, so a value that's too long reads as "continues past here" rather
// than as a hard cut mid-character.
//
// On the endpoint colour: the portal has no CSS custom properties at all —
// `theme.ts` exports plain JS objects (`tokens`, `t`), and nothing in
// src/portal defines a `--surface-page`. A bare `var(--surface-page)` would
// therefore be an invalid gradient stop, which drops the whole `background`
// declaration and leaves no fade at all. So the var is emitted *with* a
// theme-token fallback: `var(--surface-page, #FAFAF9)`. It works today off
// `t.background.page`, and defers to the custom property automatically if the
// portal ever grows one. No hex is written here — the fallback is read from
// the token, so it followed the page canvas automatically when that moved off
// the old cream #FAF8F4 on 9 August 2026.
import type { CSSProperties, ReactNode } from 'react'
import { t } from '../../theme'

export function FadeOverflow({
  children,
  direction = 'horizontal',
  width = 48,
  height = 32,
  surfaceVar = '--surface-page',
  // Overrides the fallback the endpoint resolves to when surfaceVar is (as
  // always, today) undefined. Default unchanged: t.background.page. Added
  // for callers whose real background isn't the page canvas — e.g. the
  // shared Modal, whose panel fill is tokens.bg or t.background.surface
  // depending on size, never t.background.page. Since the portal still
  // defines zero CSS custom properties, this fallback is what actually
  // renders; naming a different surfaceVar alone changes nothing.
  fallbackColor,
  // Whether the gradient itself renders. Default unchanged (true) — every
  // existing caller mounts/unmounts FadeOverflow entirely to control this,
  // and keeps working exactly as before. Added for a caller that must keep
  // its own wrapper mounted at a *stable* tree position regardless of
  // whether a fade is currently needed -- toggling `active` only adds or
  // removes the gradient overlay, never the wrapper or children, so nothing
  // inside ever unmounts. See Modal's own use of this: conditionally
  // mounting/unmounting FadeOverflow around a ref'd scrollable body used to
  // remount that body's DOM node on every fade-state recalculation (i.e.
  // most keystrokes), resetting its scrollTop to 0.
  active = true,
  style,
}: {
  children: ReactNode
  direction?: 'horizontal' | 'vertical'
  // Size of the fade itself, not of the content: px along the axis being
  // faded (width for horizontal, height for vertical).
  width?: number
  height?: number
  // Name of a CSS custom property to use as the gradient endpoint. Falls back
  // to t.background.page (or fallbackColor, if given) when that property
  // isn't defined — see the note above.
  surfaceVar?: string
  fallbackColor?: string
  active?: boolean
  // Escape hatch for the wrapper (e.g. giving it a max-width in a table cell).
  style?: CSSProperties
}) {
  const isHorizontal = direction === 'horizontal'
  const endpoint = `var(${surfaceVar}, ${fallbackColor ?? t.background.page})`

  const fade: CSSProperties = isHorizontal
    ? {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
        width,
        background: `linear-gradient(to right, transparent, ${endpoint})`,
        pointerEvents: 'none',
      }
    : {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height,
        background: `linear-gradient(to bottom, transparent, ${endpoint})`,
        pointerEvents: 'none',
      }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', ...style }}>
      {children}
      {active && <div style={fade} aria-hidden="true" />}
    </div>
  )
}
