// The circular brand mark used in the authenticated shell's header: the
// tenant's disc mark when the config provides one, else a generated
// first-letter avatar. Extracted from TopBar so the signed-out shell
// (PortalNav on the login route) can render the IDENTICAL component instead
// of a similar-looking approximation.
import { tokens, t, fonts, brandName, brandMark } from './theme'
import type { CSSProperties } from 'react'

export function BrandMarkBadge({ size = 28 }: { size?: number }) {
  if (brandMark) {
    return (
      // alt="" — decorative; the wordmark text always sits beside it.
      <img src={brandMark} alt="" width={size} height={size} style={styles.mark} />
    )
  }
  return (
    <span style={{ ...styles.circle, width: size, height: size }}>
      <span style={styles.letter}>{brandName.charAt(0).toLowerCase()}</span>
    </span>
  )
}

const styles: Record<string, CSSProperties> = {
  mark: {
    display: 'block',
    borderRadius: '50%',
    flexShrink: 0,
  },
  circle: {
    borderRadius: '50%',
    background: tokens.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  letter: {
    color: t.text.onPrimary,
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1,
    marginTop: 1,
  },
}
