// Shared ICP score ring: same visual and tier logic used by Smart Shortlist's
// CandidateCard and LeadDrawer's header. A small progress ring plus a tier
// label ("Strong ICP" / "Partial ICP" / "Weak ICP" / "Not scored"), with an
// optional click-to-open popover showing the score's match reason and, when
// unscored, an inline "Score this lead" action (no navigation away).
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Sparkles } from 'lucide-react'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { Spinner } from '../../Spinner'
import type { Vertical } from '../shortlist/types'

export type ScoreTier = 'strong' | 'partial' | 'weak' | 'unscored'
export type ScoringState = 'idle' | 'loading' | 'error'

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

const VERTICAL_LABEL: Record<Vertical, string> = {
  design_systems: 'Design Systems',
  branding: 'Branding',
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
  popoverWidth = 260,
  leadVertical = null,
  scoringState = 'idle',
  onScore,
}: {
  score: number | null
  reason?: string | null
  size?: number
  interactive?: boolean
  popoverWidth?: number
  leadVertical?: Vertical | null
  scoringState?: ScoringState
  onScore?: (vertical: Vertical) => void
}) {
  const [open, setOpen] = useState(false)
  const [pendingVertical, setPendingVertical] = useState<Vertical | null>(null)
  const tier = scoreTier(score)
  const color = TIER_COLOR[tier]
  const label = TIER_LABEL[tier]
  const text = score != null ? `${label} · ${score}` : label
  const effectiveVertical = leadVertical ?? pendingVertical
  const loading = scoringState === 'loading'

  const pill = (
    <span style={s.pillInner}>
      {loading ? <Spinner size={size} color={t.text.muted} /> : <Ring tier={tier} score={score} size={size} />}
      <span style={{ ...s.label, color }}>{loading ? 'Scoring...' : text}</span>
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
              !effectiveVertical ? (
                <>
                  <p style={s.popoverBody}>Choose an ICP profile to score this lead against.</p>
                  <div style={s.verticalRow}>
                    <button type="button" style={s.verticalBtn} onClick={() => setPendingVertical('design_systems')}>
                      {VERTICAL_LABEL.design_systems}
                    </button>
                    <button type="button" style={s.verticalBtn} onClick={() => setPendingVertical('branding')}>
                      {VERTICAL_LABEL.branding}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {scoringState === 'error' && <p style={s.errorText}>Scoring failed. Try again.</p>}
                  <button
                    type="button"
                    style={{ ...s.scoreBtn, opacity: loading ? 0.7 : 1 }}
                    disabled={loading}
                    onClick={() => onScore?.(effectiveVertical)}
                  >
                    {loading ? (
                      <>
                        <Spinner size={12} color={t.text.onPrimary} />
                        Scoring...
                      </>
                    ) : scoringState === 'error' ? (
                      'Retry scoring'
                    ) : (
                      <>
                        <Sparkles size={13} />
                        Score this lead
                      </>
                    )}
                  </button>
                </>
              )
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
    gap: 8,
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
  errorText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.danger,
    margin: 0,
  },
  verticalRow: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  verticalBtn: {
    background: 'none',
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    padding: '5px 10px',
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.secondary,
    cursor: 'pointer',
  },
  scoreBtn: {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.primary,
    color: t.text.onPrimary,
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
