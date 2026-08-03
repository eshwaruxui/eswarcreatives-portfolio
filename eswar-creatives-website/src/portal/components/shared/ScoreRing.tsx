// Shared ICP score ring: same visual and tier logic used by Smart Shortlist's
// CandidateCard and LeadDrawer's header. A small progress ring plus a tier
// label ("Strong ICP" / "Partial ICP" / "Weak ICP" / "Not scored"), with an
// optional click-to-open popover showing the score's match reason.
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { tokens, t, fonts, motionTokens } from '../../theme'

export type ScoreTier = 'strong' | 'partial' | 'weak' | 'unscored'

export function scoreTier(score: number | null): ScoreTier {
  if (score == null) return 'unscored'
  if (score >= 80) return 'strong'
  if (score >= 60) return 'partial'
  return 'weak'
}

const TIER_COLOR: Record<ScoreTier, string> = {
  strong: tokens.primary,
  partial: tokens.goldDark,
  weak: t.text.muted,
  unscored: t.text.disabled,
}

const TIER_STROKE: Record<ScoreTier, string> = {
  strong: tokens.accent,
  partial: tokens.gold,
  weak: t.text.muted,
  unscored: t.border.medium,
}

const TIER_LABEL: Record<ScoreTier, string> = {
  strong: 'Strong ICP',
  partial: 'Partial ICP',
  weak: 'Weak ICP',
  unscored: 'Not scored',
}

function Ring({ tier, score, size }: { tier: ScoreTier; score: number | null; size: number }) {
  const strokeWidth = size <= 22 ? 3 : 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.max(0, Math.min(100, score ?? 0))
  const offset = circumference * (1 - pct / 100)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0, transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={t.border.subtle}
        strokeWidth={strokeWidth}
      />
      {tier === 'unscored' ? (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={TIER_STROKE.unscored}
          strokeWidth={strokeWidth}
          strokeDasharray={`${strokeWidth} ${strokeWidth * 1.4}`}
        />
      ) : (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={TIER_STROKE[tier]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: `stroke-dashoffset ${motionTokens.durationBase} ${motionTokens.easeDefault}` }}
        />
      )}
    </svg>
  )
}

export function ScoreRing({
  score,
  reason,
  size = 18,
  interactive = true,
  onRunScoring,
  popoverWidth = 260,
}: {
  score: number | null
  reason?: string | null
  size?: number
  interactive?: boolean
  onRunScoring?: () => void
  popoverWidth?: number
}) {
  const [open, setOpen] = useState(false)
  const tier = scoreTier(score)
  const color = TIER_COLOR[tier]
  const label = TIER_LABEL[tier]
  const text = score != null ? `${label} · ${score}` : label

  const pill = (
    <span style={s.pillInner}>
      <Ring tier={tier} score={score} size={size} />
      <span style={{ ...s.label, color }}>{text}</span>
    </span>
  )

  if (!interactive) {
    return <span style={s.pillStatic}>{pill}</span>
  }

  return (
    <span style={s.wrap}>
      <button
        type="button"
        style={s.pillButton}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`ICP score: ${text}`}
      >
        {pill}
      </button>
      {open && (
        <>
          <div style={s.backdrop} onClick={() => setOpen(false)} />
          <div style={{ ...s.popover, width: popoverWidth }}>
            <span style={{ ...s.popoverTitle, color }}>{text}</span>
            {tier === 'unscored' ? (
              <>
                <p style={s.popoverBody}>
                  This lead has not been through Smart Shortlist scoring yet.
                </p>
                {onRunScoring && (
                  <button
                    type="button"
                    style={s.runLink}
                    onClick={() => {
                      setOpen(false)
                      onRunScoring()
                    }}
                  >
                    Run scoring
                  </button>
                )}
              </>
            ) : (
              <p style={s.popoverBody}>
                {reason ?? 'No score breakdown was recorded for this lead.'}
              </p>
            )}
          </div>
        </>
      )}
    </span>
  )
}

const s: Record<string, CSSProperties> = {
  wrap: { position: 'relative', display: 'inline-flex' },
  pillStatic: { display: 'inline-flex' },
  pillButton: {
    display: 'inline-flex',
    background: 'none',
    border: 'none',
    padding: 0,
    margin: 0,
    cursor: 'pointer',
  },
  pillInner: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '2px 10px',
    borderRadius: 999,
    background: t.background.muted,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
  },
  backdrop: { position: 'fixed', inset: 0, zIndex: 30 },
  popover: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 6,
    background: t.background.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    boxShadow: '0 12px 32px rgba(2, 76, 79, 0.12)',
    padding: 12,
    zIndex: 31,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  popoverTitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 700,
  },
  popoverBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.secondary,
    lineHeight: 1.45,
    margin: 0,
  },
  runLink: {
    alignSelf: 'flex-start',
    background: 'none',
    border: 'none',
    padding: 0,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: tokens.primary,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
}
