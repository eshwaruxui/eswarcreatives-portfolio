// Shared project-stage row type + desktop stage-stepper column. Used by the
// client dashboard and the per-project drill-in view. Compact node + name +
// status pill; click to open the stage detail drawer.
import type { CSSProperties } from 'react'
import { tokens, t, phaseUI, fonts } from '../theme'
import type { StageStatus } from './StageLabel'

export type ProjectStage = {
  id: string
  project_id: string
  stage_number: number
  name: string
  status: StageStatus
  sort_order: number
}

// Map stage status to phaseUI status keys for node/pill styling.
export const STAGE_STATUS_TO_PHASE: Record<string, 'done' | 'active' | 'pending'> = {
  done: 'done',
  in_progress: 'active',
  pending: 'pending',
}

export function StageColumn({
  stage, index, isFirst, isLast, onClick
}: {
  stage: ProjectStage
  index: number
  isFirst: boolean
  isLast: boolean
  onClick: () => void
}) {
  const phaseState = STAGE_STATUS_TO_PHASE[stage.status] ?? 'pending'
  const pill = phaseUI.status[phaseState]
  const filled = stage.status !== 'pending'

  return (
    <div
      style={{
        ...s.phaseCol,
        paddingLeft: isFirst ? 0 : 16,
        paddingRight: isLast ? 0 : 16,
        borderRight: isLast ? 'none' : `1px solid ${t.border.overlayStrong}`,
        cursor: 'pointer',
      }}
      onClick={onClick}
    >
      <div style={s.phaseNodeRow}>
        <span style={{ ...s.phaseNode, ...(filled ? s.phaseNodeFilled : s.phaseNodeIdle) }}>
          {stage.status === 'done' ? '✓' : index + 1}
        </span>
        <span style={{
          ...s.connector,
          background: stage.status === 'done' ? phaseUI.nodeFill : t.background.overlayNormal,
        }} />
      </div>
      <div style={s.phaseBody}>
        <div style={s.phaseNameRow}>
          <span style={{ ...s.phaseName, color: stage.status === 'pending' ? t.text.muted : t.text.primary }}>
            {stage.name}
          </span>
          <span style={{ ...s.statusPill, background: pill.bg, borderColor: pill.border }}>
            {pill.label}
          </span>
        </div>
        <span style={s.toggleHint}>View details</span>
      </div>
    </div>
  )
}

export const s: Record<string, CSSProperties> = {
  phaseCol: { display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 },
  phaseNodeRow: { display: 'flex', alignItems: 'center', width: '100%' },
  phaseNode: {
    width: 32, height: 32, borderRadius: 16, border: '2px solid',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: fonts.body, fontSize: 14, fontWeight: 600, flexShrink: 0,
  },
  phaseNodeFilled: { background: phaseUI.nodeFill, color: tokens.surface, borderColor: t.border.overlayStrong },
  phaseNodeIdle: { background: tokens.surface, color: tokens.textMuted, borderColor: t.background.overlayNormal },
  connector: { flex: 1, height: 2, minWidth: 0 },
  phaseBody: { display: 'flex', flexDirection: 'column', gap: 8 },
  phaseNameRow: { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  phaseName: { fontFamily: fonts.body, fontSize: 15, fontWeight: 600, lineHeight: '20px', letterSpacing: 0.27 },
  statusPill: {
    display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
    borderRadius: 999, border: '1px solid', fontFamily: fonts.body, fontSize: 12,
    fontWeight: 500, color: t.text.primary, whiteSpace: 'nowrap',
  },
  toggleHint: {
    fontFamily: fonts.body, fontSize: 12, fontWeight: 500,
    color: t.text.urlLink, textDecoration: 'none', whiteSpace: 'nowrap',
  },
}
