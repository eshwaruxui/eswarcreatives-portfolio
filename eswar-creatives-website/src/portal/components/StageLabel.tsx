// Shared stage label atom. Used by both the admin ProjectPanel (canEditName=true)
// and the client dashboard (canEditName=false). Clicking the name in admin mode
// opens an inline text field; Escape reverts without saving (H5); Enter/blur
// commits and shows a brief gold underline flash (H1: system status feedback).
import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'
import { mono } from '../admin/ui'

export type StageStatus = 'pending' | 'in_progress' | 'done'

const STATUS_PILL: Record<StageStatus, { bg: string; border: string; color: string; label: string }> = {
  pending:     { bg: t.background.muted,  border: t.border.subtle,  color: t.text.muted,    label: 'Pending' },
  in_progress: { bg: tokens.goldLight,    border: tokens.gold,      color: tokens.goldDark, label: 'In progress' },
  done:        { bg: tokens.greenLight,   border: tokens.green,     color: tokens.green,    label: 'Done' },
}

export function StageLabel({
  stageId,
  stageNumber,
  name,
  status,
  canEditName,
  autoFocus = false,
}: {
  stageId: string
  stageNumber: number
  name: string
  status: StageStatus
  canEditName: boolean
  autoFocus?: boolean
}) {
  const [editing, setEditing] = useState(autoFocus && canEditName)
  const [draft, setDraft] = useState(name)
  const [current, setCurrent] = useState(name)
  const [flash, setFlash] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function commit() {
    const trimmed = draft.trim()
    setEditing(false)
    if (!trimmed || trimmed === current) { setDraft(current); return }
    const { error } = await supabase
      .from('project_stages')
      .update({ name: trimmed, updated_at: new Date().toISOString() })
      .eq('id', stageId)
    if (error) { setDraft(current); return } // H9: never surface raw DB error
    setCurrent(trimmed)
    // H1: brief gold underline flash confirms the save was persisted
    setFlash(true)
    setTimeout(() => setFlash(false), parseInt(motionTokens.durationBase, 10) * 4)
  }

  function startEdit() {
    if (!canEditName) return
    setDraft(current)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  const pill = STATUS_PILL[status]

  return (
    <div style={s.root}>
      <span style={s.stageNum}>Stage {stageNumber}</span>
      <div style={s.nameRow}>
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            autoFocus={autoFocus}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); void commit() }
              // H5: error prevention — Escape reverts without persisting
              if (e.key === 'Escape') { setEditing(false); setDraft(current) }
            }}
            style={s.nameInput}
          />
        ) : (
          <span
            style={{
              ...s.stageName,
              cursor: canEditName ? 'text' : 'default',
              // H1: gold underline pulse confirms the name was saved
              borderBottom: flash
                ? `2px solid ${tokens.gold}`
                : '2px solid transparent',
              transition: `border-color ${motionTokens.durationBase} ${motionTokens.easeDefault}`,
            }}
            onClick={startEdit}
            title={canEditName ? 'Click to rename' : undefined}
          >
            {current}
          </span>
        )}
        <span
          style={{
            ...s.pill,
            background: pill.bg,
            borderColor: pill.border,
            color: pill.color,
          }}
        >
          {pill.label}
        </span>
      </div>
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  root:     { display: 'flex', flexDirection: 'column', gap: 4 },
  stageNum: {
    fontFamily: mono,
    fontSize: 11,
    color: t.text.muted,
    letterSpacing: '0.4px',
    textTransform: 'uppercase',
  },
  nameRow:  { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  stageName: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: 600,
    color: t.text.primary,
    lineHeight: 1.3,
    paddingBottom: 1,
  },
  nameInput: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: 600,
    color: t.text.primary,
    border: `1.5px solid ${t.border.focus}`,
    borderRadius: 4,
    padding: '2px 8px',
    background: tokens.surface,
    outline: 'none',
    width: 200,
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    border: '1px solid',
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 500,
    whiteSpace: 'nowrap',
  },
}
