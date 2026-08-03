// Shared ICP score ring: same visual and tier logic used by Smart Shortlist's
// CandidateCard and LeadDrawer's header. A small progress ring plus a tier
// label ("Strong ICP" / "Partial ICP" / "Weak ICP" / "Not scored"). Clicking
// the interactive variant opens the shared ICP Score modal with the full
// breakdown and an inline scoring action (no navigation away, ever).
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { Spinner } from '../../Spinner'
import { Modal, mono } from '../../admin/ui'
import type { Vertical } from '../shortlist/types'

export type ScoreTier = 'strong' | 'partial' | 'weak' | 'unscored'
export type ScoringState = 'idle' | 'loading' | 'error'

export function scoreTier(score: number | null): ScoreTier {
  if (score == null) return 'unscored'
  if (score >= 75) return 'strong'
  if (score >= 50) return 'partial'
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
  const strokeWidth = size <= 22 ? 3 : size <= 48 ? 4 : 6
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

// Big ring + score + tier label, with no click/modal behavior of its own.
// Shared so any screen showing a "just-computed" score (e.g. the New
// Shortlist single-lead success state) stays in sync with scoreTier's
// thresholds/colors automatically instead of re-specifying them.
export function ScoreRingDisplay({ score, size = 72 }: { score: number | null; size?: number }) {
  const tier = scoreTier(score)
  const color = TIER_COLOR[tier]
  const label = TIER_LABEL[tier]
  return (
    <div style={s.ringHead}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <Ring tier={tier} score={score} size={size} />
        {score != null && <span style={s.bigScore}>{score}</span>}
      </div>
      <span style={{ ...s.tierLabel, color }}>{label}</span>
    </div>
  )
}

export function ScoreRing({
  score,
  reason,
  size = 18,
  interactive = true,
  leadVertical = null,
  scoringState = 'idle',
  onScore,
}: {
  score: number | null
  reason?: string | null
  size?: number
  interactive?: boolean
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
    <>
      <button
        type="button"
        style={s.pillButton}
        onClick={() => setOpen(true)}
        aria-label={`ICP score: ${text}`}
      >
        {pill}
      </button>

      {open && (
        <Modal title="ICP Score" onClose={() => setOpen(false)}>
          <div style={s.modalBody}>
            <ScoreRingDisplay score={score} />

            {tier === 'unscored' ? (
              <>
                {!effectiveVertical ? (
                  <div style={s.verticalPrompt}>
                    <p style={s.bodyText}>Select a vertical to score this lead.</p>
                    <div style={s.verticalRow}>
                      <button type="button" style={s.verticalBtn} onClick={() => setPendingVertical('design_systems')}>
                        {VERTICAL_LABEL.design_systems}
                      </button>
                      <button type="button" style={s.verticalBtn} onClick={() => setPendingVertical('branding')}>
                        {VERTICAL_LABEL.branding}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {scoringState === 'error' && <p style={s.errorText}>Scoring failed. Try again.</p>}
                    <button
                      type="button"
                      style={{ ...s.primaryBtn, opacity: loading ? 0.7 : 1 }}
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
                )}
              </>
            ) : (
              <>
                <p style={s.bodyText}>{reason ?? 'No score breakdown was recorded for this lead.'}</p>
                <div style={s.divider} />
                {scoringState === 'error' && <p style={s.errorText}>Scoring failed. Try again.</p>}
                <button
                  type="button"
                  style={{ ...s.outlineBtn, opacity: loading ? 0.7 : 1 }}
                  disabled={loading}
                  onClick={() => leadVertical && onScore?.(leadVertical)}
                >
                  {loading ? (
                    <>
                      <Spinner size={12} color={tokens.primary} />
                      Scoring...
                    </>
                  ) : scoringState === 'error' ? (
                    'Retry scoring'
                  ) : (
                    <>
                      <RefreshCw size={13} />
                      Rescore this lead
                    </>
                  )}
                </button>
              </>
            )}

            <div style={s.footer}>
              <button type="button" style={s.closeBtn} onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

const s: Record<string, CSSProperties> = {
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
  modalBody: { display: 'flex', flexDirection: 'column', gap: 16 },
  ringHead: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  bigScore: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontFamily: mono,
    fontSize: 22,
    fontWeight: 700,
    color: t.text.primary,
  },
  tierLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 700,
  },
  bodyText: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 400,
    color: t.text.secondary,
    lineHeight: 1.5,
    margin: 0,
  },
  errorText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.danger,
    margin: 0,
  },
  divider: { height: 1, background: t.border.subtle },
  verticalPrompt: { display: 'flex', flexDirection: 'column', gap: 10 },
  verticalRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  verticalBtn: {
    background: 'none',
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    padding: '6px 12px',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: t.text.secondary,
    cursor: 'pointer',
  },
  primaryBtn: {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.primary,
    color: t.text.onPrimary,
    border: 'none',
    borderRadius: 6,
    padding: '8px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  outlineBtn: {
    alignSelf: 'flex-start',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'none',
    color: tokens.primary,
    border: `1px solid ${tokens.primary}`,
    borderRadius: 6,
    padding: '8px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  closeBtn: {
    background: tokens.surface,
    color: t.text.secondary,
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    padding: '8px 16px',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
