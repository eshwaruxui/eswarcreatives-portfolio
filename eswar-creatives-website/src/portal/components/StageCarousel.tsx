// Mobile snap-scroll stage carousel. Tap a card to open the stage detail
// drawer. Used by the client dashboard and the per-project drill-in view.
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { tokens, t, phaseUI, fonts, motionTokens } from '../theme'
import type { ProjectStage } from './StageColumn'
import { STAGE_STATUS_TO_PHASE, s as columnStyles } from './StageColumn'

export function StageCarousel({
  stages, onStageClick
}: {
  stages: ProjectStage[]
  onStageClick: (stage: ProjectStage) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const activeIdx = stages.findIndex((sg) => sg.status === 'in_progress')
  const [activeDot, setActiveDot] = useState(Math.max(0, activeIdx))

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const cardWidth = window.innerWidth * 0.85
    const idx = Math.max(0, activeIdx)
    track.scrollLeft = idx * (cardWidth + 12)
    setActiveDot(idx)
  }, [activeIdx])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const onScroll = () => {
      const cardWidth = window.innerWidth * 0.85
      const idx = Math.round(track.scrollLeft / (cardWidth + 12))
      setActiveDot(Math.max(0, Math.min(stages.length - 1, idx)))
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => track.removeEventListener('scroll', onScroll)
  }, [stages.length])

  return (
    <div style={s.carouselOuter}>
      <div ref={trackRef} className="ec-phase-track" style={s.carouselTrack} aria-label="Project stages">
        {stages.map((stage) => {
          const phaseState = STAGE_STATUS_TO_PHASE[stage.status] ?? 'pending'
          const pill = phaseUI.status[phaseState]
          const filled = stage.status !== 'pending'
          return (
            <div key={stage.id} style={s.carouselCardWrap}>
              <button
                type="button"
                style={{
                  ...s.phaseCardInner,
                  ...(stage.status === 'in_progress' ? s.phaseCardActive : {}),
                  width: '100%',
                  textAlign: 'left' as const,
                  cursor: 'pointer',
                }}
                onClick={() => onStageClick(stage)}
              >
                <div style={s.phaseCardNodeRow}>
                  <span style={{ ...columnStyles.phaseNode, ...(filled ? columnStyles.phaseNodeFilled : columnStyles.phaseNodeIdle) }}>
                    {stage.status === 'done' ? '✓' : stage.stage_number}
                  </span>
                </div>
                <div style={s.phaseCardBody}>
                  <div style={columnStyles.phaseNameRow}>
                    <span style={{ ...columnStyles.phaseName, color: stage.status === 'pending' ? t.text.muted : t.text.primary }}>
                      {stage.name}
                    </span>
                    <span style={{ ...columnStyles.statusPill, background: pill.bg, borderColor: pill.border }}>
                      {pill.label}
                    </span>
                  </div>
                  <span style={s.carouselToggleBtn}>Tap to view details</span>
                </div>
              </button>
            </div>
          )
        })}
      </div>
      <div style={s.dots} aria-hidden="true">
        {stages.map((_, i) => (
          <span
            key={i}
            style={i === activeDot
              ? { ...s.dot, ...s.dotActive }
              : { ...s.dot, ...s.dotIdle }
            }
          />
        ))}
      </div>
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  carouselOuter: { marginLeft: -16, marginRight: -16, marginBottom: 24 },
  carouselTrack: {
    display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory',
    paddingLeft: 16, paddingRight: 16, paddingBottom: 4, gap: 12,
  },
  carouselCardWrap: { scrollSnapAlign: 'start', flexShrink: 0, width: '85vw' },
  phaseCardInner: {
    background: tokens.surface, border: `1px solid ${t.border.overlayStrong}`,
    borderRadius: 12, padding: 20, display: 'flex', flexDirection: 'column',
    gap: 12, boxSizing: 'border-box',
  },
  phaseCardActive: { border: `1px solid ${tokens.primary}`, background: tokens.tealLight },
  phaseCardNodeRow: { display: 'flex', alignItems: 'center' },
  phaseCardBody: { display: 'flex', flexDirection: 'column', gap: 8 },
  carouselToggleBtn: {
    fontFamily: fonts.body, fontSize: 12, fontWeight: 500,
    color: t.text.urlLink, display: 'block', marginTop: 4,
  },
  dots: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 },
  dot: { height: 6, borderRadius: 999, flexShrink: 0, transition: `all ${motionTokens.durationFast} ${motionTokens.easeDefault}` },
  dotActive: { width: 16, background: tokens.primary },
  dotIdle: { width: 6, background: t.border.default },
}
