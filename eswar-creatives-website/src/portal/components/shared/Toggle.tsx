// Minimal on/off switch, first built for the Phase 2 module-toggle admin
// screen. Same visual language as BrandVisualClientView's own unextracted
// publish switch (36x20 track, 16px knob) — not a refactor of that one,
// just matching its language so the portal doesn't grow a second look for
// the same control.
import type { CSSProperties } from 'react'
import { t, motionTokens } from '../../theme'

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        ...s.track,
        background: checked ? t.text.primaryBrand : t.border.default,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <span style={{ ...s.knob, transform: checked ? 'translateX(16px)' : 'translateX(0)' }} />
    </button>
  )
}

const s: Record<string, CSSProperties> = {
  track: {
    position: 'relative',
    width: 36,
    height: 20,
    borderRadius: 10,
    border: 'none',
    flexShrink: 0,
    padding: 0,
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  knob: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 16,
    height: 16,
    borderRadius: '50%',
    background: t.background.surface,
    transition: `transform ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
}
