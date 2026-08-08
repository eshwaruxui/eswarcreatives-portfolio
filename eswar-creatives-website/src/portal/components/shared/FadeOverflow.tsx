// Clips overflowing content and fades its trailing edge out to the page
// surface, so a value that's too long reads as "continues past here" rather
// than as a hard cut mid-character.
//
// On the endpoint colour: the portal has no CSS custom properties at all —
// `theme.ts` exports plain JS objects (`tokens`, `t`), and nothing in
// src/portal defines a `--surface-page`. A bare `var(--surface-page)` would
// therefore be an invalid gradient stop, which drops the whole `background`
// declaration and leaves no fade at all. So the var is emitted *with* a
// theme-token fallback: `var(--surface-page, #FAF8F4)`. It works today off
// `t.background.page`, and defers to the custom property automatically if the
// portal ever grows one. No hex is written here — the fallback is read from
// the token.
import type { CSSProperties, ReactNode } from 'react'
import { t } from '../../theme'

export function FadeOverflow({
  children,
  direction = 'horizontal',
  width = 48,
  height = 32,
  surfaceVar = '--surface-page',
  style,
}: {
  children: ReactNode
  direction?: 'horizontal' | 'vertical'
  // Size of the fade itself, not of the content: px along the axis being
  // faded (width for horizontal, height for vertical).
  width?: number
  height?: number
  // Name of a CSS custom property to use as the gradient endpoint. Falls back
  // to t.background.page when that property isn't defined — see the note
  // above.
  surfaceVar?: string
  // Escape hatch for the wrapper (e.g. giving it a max-width in a table cell).
  style?: CSSProperties
}) {
  const isHorizontal = direction === 'horizontal'
  const endpoint = `var(${surfaceVar}, ${t.background.page})`

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
      <div style={fade} aria-hidden="true" />
    </div>
  )
}
