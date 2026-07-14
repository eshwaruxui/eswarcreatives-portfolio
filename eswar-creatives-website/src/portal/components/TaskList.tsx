// Shared task list atom. Admin (canEdit=true): draggable rows, inline title
// edit, status cycle, delete confirm. Client (canEdit=false): read-only rows
// with progress bar. Both views share the same task data type and callbacks so
// the parent can maintain a single source of truth.
import { useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { CheckCircle2, Circle, Clock, GripVertical, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'

export type ProjectStageTask = {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'done'
  sort_order: number
}

const STATUS_NEXT: Record<string, ProjectStageTask['status']> = {
  pending: 'in_progress',
  in_progress: 'done',
  done: 'pending',
}

function TaskStatusIcon({
  status,
  interactive,
  onClick,
}: {
  status: string
  interactive: boolean
  onClick?: () => void
}) {
  const Icon = status === 'done' ? CheckCircle2 : status === 'in_progress' ? Clock : Circle
  const color =
    status === 'done'
      ? tokens.green
      : status === 'in_progress'
      ? tokens.gold
      : t.border.medium
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      aria-label={interactive ? `Mark ${STATUS_NEXT[status]}` : status}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: interactive ? 'pointer' : 'default',
        color,
        display: 'flex',
        flexShrink: 0,
        transition: `color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
      }}
    >
      <Icon size={18} />
    </button>
  )
}

export function TaskList({
  projectId,
  stageNumber,
  tasks: initialTasks,
  canEdit,
  onTasksChange,
}: {
  projectId: string
  stageNumber: number
  tasks: ProjectStageTask[]
  canEdit: boolean
  onTasksChange: (tasks: ProjectStageTask[]) => void
}) {
  const [tasks, setTasks] = useState<ProjectStageTask[]>(
    [...initialTasks].sort((a, b) => a.sort_order - b.sort_order)
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding] = useState(false)
  const dragSrcIdx = useRef<number>(-1)

  function sync(next: ProjectStageTask[]) {
    setTasks(next)
    onTasksChange(next)
  }

  async function cycleStatus(task: ProjectStageTask) {
    const next = STATUS_NEXT[task.status]
    // H1: optimistic update gives instant visual feedback
    sync(tasks.map((tk) => (tk.id === task.id ? { ...tk, status: next } : tk)))
    await supabase
      .from('project_stage_tasks')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', task.id)
    // H9: silent on failure; parent can reload to correct any mismatch
  }

  async function commitEdit(task: ProjectStageTask) {
    const trimmed = editDraft.trim()
    setEditingId(null)
    if (!trimmed || trimmed === task.title) return
    sync(tasks.map((tk) => (tk.id === task.id ? { ...tk, title: trimmed } : tk)))
    await supabase
      .from('project_stage_tasks')
      .update({ title: trimmed, updated_at: new Date().toISOString() })
      .eq('id', task.id)
  }

  async function deleteTask(id: string) {
    sync(tasks.filter((tk) => tk.id !== id))
    setConfirmDeleteId(null)
    await supabase.from('project_stage_tasks').delete().eq('id', id)
  }

  async function addTask() {
    const trimmed = newTitle.trim()
    if (!trimmed || adding) return
    setAdding(true)
    const maxOrder = tasks.reduce((m, tk) => Math.max(m, tk.sort_order), -1)
    const { data: sess } = await supabase.auth.getUser()
    const uid = sess.user?.id ?? null
    const { data, error } = await supabase
      .from('project_stage_tasks')
      .insert({
        project_id: projectId,
        stage_number: stageNumber,
        title: trimmed,
        status: 'pending',
        sort_order: maxOrder + 1,
        created_by: uid,
      })
      .select('id, title, description, status, sort_order')
      .single()
    setAdding(false)
    if (error || !data) return // H9: input stays; user can retry
    sync([...tasks, data as ProjectStageTask])
    setNewTitle('')
  }

  function onDragStart(e: DragEvent, idx: number) {
    dragSrcIdx.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }

  async function onDrop(e: DragEvent, targetIdx: number) {
    e.preventDefault()
    const src = dragSrcIdx.current
    if (src < 0 || src === targetIdx) return
    const reordered = [...tasks]
    const [moved] = reordered.splice(src, 1)
    reordered.splice(targetIdx, 0, moved)
    const withOrders = reordered.map((tk, i) => ({ ...tk, sort_order: i }))
    sync(withOrders)
    for (const tk of withOrders) {
      await supabase
        .from('project_stage_tasks')
        .update({ sort_order: tk.sort_order, updated_at: new Date().toISOString() })
        .eq('id', tk.id)
    }
  }

  const doneCount = tasks.filter((tk) => tk.status === 'done').length
  const total = tasks.length

  // ── Read-only client view ─────────────────────────────────────────────
  if (!canEdit) {
    return (
      <div>
        {total > 0 && (
          <div style={s.progressWrap}>
            <span style={s.progressLabel}>
              {doneCount} of {total} tasks complete
            </span>
            <div style={s.progressTrack}>
              <div
                style={{
                  ...s.progressFill,
                  width: `${total > 0 ? (doneCount / total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
        {total === 0 ? (
          <p style={s.emptyClient}>No tasks added yet.</p>
        ) : (
          <ul style={s.list}>
            {tasks.map((task) => (
              <li key={task.id} style={s.rowClient}>
                <TaskStatusIcon status={task.status} interactive={false} />
                <span
                  style={{
                    ...s.titleText,
                    textDecoration: task.status === 'done' ? 'line-through' : 'none',
                    opacity: task.status === 'done' ? 0.5 : 1,
                    transition: `opacity ${motionTokens.durationBase} ${motionTokens.easeDefault}`,
                  }}
                >
                  {task.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  // ── Admin (editable) view ─────────────────────────────────────────────
  return (
    <div>
      {tasks.length === 0 ? (
        <div style={{ marginBottom: 8 }}>
          <button
            type="button"
            style={s.emptyAddBtn}
            onClick={() =>
              document
                .getElementById(`newtask-${projectId}-${stageNumber}`)
                ?.focus()
            }
          >
            + Add first task
          </button>
        </div>
      ) : (
        <ul style={s.list}>
          {tasks.map((task, idx) => (
            <li
              key={task.id}
              draggable
              onDragStart={(e) => onDragStart(e, idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => void onDrop(e, idx)}
              onMouseEnter={() => setHoveredId(task.id)}
              onMouseLeave={() => { setHoveredId(null) }}
              style={s.rowAdmin}
            >
              <span style={s.grip} aria-hidden="true">
                <GripVertical size={14} />
              </span>
              {/* H1: clicking cycles status with instant icon swap */}
              <TaskStatusIcon
                status={task.status}
                interactive
                onClick={() => void cycleStatus(task)}
              />
              {editingId === task.id ? (
                <input
                  autoFocus
                  value={editDraft}
                  onChange={(e) => setEditDraft(e.target.value)}
                  onBlur={() => void commitEdit(task)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void commitEdit(task)
                    // H5: Escape reverts without saving
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  style={s.titleInput}
                />
              ) : (
                <span
                  style={s.titleText}
                  onClick={() => {
                    setEditingId(task.id)
                    setEditDraft(task.title)
                  }}
                >
                  {task.title}
                </span>
              )}
              {/* H5: inline confirmation prevents accidental deletion */}
              {confirmDeleteId === task.id ? (
                <span style={s.confirmRow}>
                  <span style={s.confirmLabel}>Delete?</span>
                  <button
                    type="button"
                    style={s.confirmYes}
                    onClick={() => void deleteTask(task.id)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    style={s.confirmNo}
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  aria-label="Delete task"
                  style={{
                    ...s.deleteBtn,
                    opacity: hoveredId === task.id ? 1 : 0,
                  }}
                  onClick={() => setConfirmDeleteId(task.id)}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <div style={s.addRow}>
        <Plus size={14} color={t.text.muted} />
        <input
          id={`newtask-${projectId}-${stageNumber}`}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void addTask() }}
          placeholder="Add a task and press Enter"
          disabled={adding}
          style={s.addInput}
        />
        {newTitle.trim() && (
          <button
            type="button"
            style={s.addBtn}
            onClick={() => void addTask()}
            disabled={adding}
          >
            {adding ? '...' : 'Add'}
          </button>
        )}
      </div>
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  list:  { listStyle: 'none', margin: '0 0 4px', padding: 0, display: 'flex', flexDirection: 'column', gap: 2 },
  rowAdmin: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 4px',
    borderRadius: 6,
    background: 'transparent',
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  rowClient: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0' },
  grip: { cursor: 'grab', flexShrink: 0, display: 'flex', color: t.text.muted },
  titleText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    flex: 1,
    cursor: 'text',
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    lineHeight: 1.4,
  },
  titleInput: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    flex: 1,
    border: `1px solid ${t.border.focus}`,
    borderRadius: 4,
    padding: '2px 6px',
    background: tokens.surface,
    outline: 'none',
    minWidth: 0,
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    padding: 2,
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    color: tokens.ruby,
    transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  confirmRow: { display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 },
  confirmLabel: { fontFamily: fonts.body, fontSize: 12, color: t.text.secondary },
  confirmYes: {
    fontFamily: fonts.body, fontSize: 12, color: tokens.ruby,
    background: 'none', border: `1px solid ${tokens.ruby}`,
    borderRadius: 4, padding: '1px 8px', cursor: 'pointer',
  },
  confirmNo: {
    fontFamily: fonts.body, fontSize: 12, color: t.text.secondary,
    background: 'none', border: `1px solid ${t.border.default}`,
    borderRadius: 4, padding: '1px 8px', cursor: 'pointer',
  },
  emptyAddBtn: {
    background: 'none',
    border: `1px dashed ${t.border.medium}`,
    borderRadius: 6,
    padding: '8px 16px',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.tertiary,
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left' as const,
  },
  emptyClient: { fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary, margin: 0 },
  addRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTop: `1px solid ${t.border.subtle}`,
    marginTop: 4,
  },
  addInput: {
    fontFamily: fonts.body, fontSize: 13, color: t.text.primary,
    background: 'none', border: 'none', outline: 'none', flex: 1, padding: '3px 0',
  },
  addBtn: {
    fontFamily: fonts.body, fontSize: 12, fontWeight: 600,
    color: tokens.primary, background: t.background.tint1,
    border: `1px solid ${t.border.brand}`, borderRadius: 4,
    padding: '3px 10px', cursor: 'pointer',
  },
  progressWrap: { marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 4 },
  progressLabel: { fontFamily: fonts.body, fontWeight: 500, fontSize: 12, color: t.text.muted },
  progressTrack: { height: 4, background: t.background.muted, borderRadius: 999, overflow: 'hidden' },
  progressFill: {
    height: '100%',
    background: tokens.accent,
    borderRadius: 999,
    transition: `width ${motionTokens.durationBase} ${motionTokens.easeEnter}`,
  },
}
