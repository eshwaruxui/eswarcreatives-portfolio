// Subtle ring spinner shared across the portal. Animates transform (rotate)
// only, per the motion rules in theme.ts. Keyframes are rendered inline as a
// <style> tag, matching the existing pattern in MockupsAdmin.
import type { CSSProperties } from 'react'
import { tokens } from './theme'

export function Spinner({
  size = 14,
  color = tokens.textMuted,
}: {
  size?: number
  color?: string
}) {
  const ring: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    border: `2px solid ${color}`,
    borderTopColor: 'transparent',
    display: 'inline-block',
    boxSizing: 'border-box',
    animation: 'portalSpin 600ms linear infinite',
  }
  return (
    <>
      <style>{`@keyframes portalSpin{to{transform:rotate(360deg)}}`}</style>
      <span style={ring} aria-hidden="true" />
    </>
  )
}
