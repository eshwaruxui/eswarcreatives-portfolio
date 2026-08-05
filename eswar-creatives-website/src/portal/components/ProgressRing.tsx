// Shared progress ring atom. Used by the client dashboard and the per-project
// drill-in view; percent-complete visual with a caption underneath.
import type { CSSProperties } from 'react'
import { t, phaseUI, fonts, motionTokens } from '../theme'

export function ProgressRing({ percent, caption }: { percent: number; caption: string }) {
  const size = 64
  const stroke = 6
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, percent))
  const offset = circumference * (1 - clamped / 100)
  return (
    <div style={s.ring}>
      <div style={s.ringSvgWrap}>
        <svg width={size} height={size} role="img" aria-label={`${clamped} percent complete`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.border.default} strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={phaseUI.nodeFill} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: `stroke-dashoffset ${motionTokens.durationSlow} ${motionTokens.easeEnter}` }}
          />
        </svg>
        <span style={s.ringPct}>{clamped}%</span>
      </div>
      <span style={s.ringCaption}>{caption}</span>
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  ring: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 },
  ringSvgWrap: {
    position: 'relative', width: 64, height: 64, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  ringPct: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: t.text.primary,
  },
  ringCaption: { fontFamily: fonts.body, fontSize: 12, fontWeight: 500, color: t.text.secondary, whiteSpace: 'nowrap' },
}
