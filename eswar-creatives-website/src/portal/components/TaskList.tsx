// Shared task list atom. Admin (canEdit=true): draggable rows, inline title
// edit, status cycle, delete confirm, subtask support. Client (canEdit=false):
// read-only rows with progress bar. Both views share the same task data type
// so the parent can maintain a single source of truth.
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { CheckCircle2, Circle, Clock, CornerDownRight, GripVertical, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'

export type ProjectStageTask = {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in_progress' | 'done'
  sort_order: number
  parent_task_id?: string | null
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
  const dragSrcParentId = useRef<string | null | undefined>(undefined)

  // Keep local tasks in sync with prop changes from parent re-fetches.
  useEffect(() => {
    setTasks([...initialTasks].sort((a, b) => a.sort_order - b.sort_order))
  }, [initialTasks])

  function sync(next: ProjectStageTask[]) {
    setTasks(next)
    onTasksChange(next)
  }

  async function cycleStatus(task: ProjectStageTask) {
    const next = STATUS_NEXT[task.status]
    sync(tasks.map((tk) => (tk.id === task.id ? { ...tk, status: next } : tk)))
    await supabase
      .from('project_stage_tasks')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', task.id)
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
    const topLevel = tasks.filter((t) => !t.parent_task_id)
    const maxOrder = topLevel.reduce((m, tk) => Math.max(m, tk.sort_order), -1)
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
        parent_task_id: null,
        created_by: uid,
      })
      .select('id, title, description, status, sort_order, parent_task_id')
      .single()
    setAdding(false)
    if (error || !data) return
    sync([...tasks, data as ProjectStageTask])
    setNewTitle('')
  }

  async function addSubtask(parentId: string) {
    if (adding) return
    setAdding(true)
    const siblings = tasks.filter((t) => t.parent_task_id === parentId)
    const maxOrder = siblings.reduce((m, tk) => Math.max(m, tk.sort_order), -1)
    const { data: sess } = await supabase.auth.getUser()
    const uid = sess.user?.id ?? null
    const { data, error } = await supabase
      .from('project_stage_tasks')
      .insert({
        project_id: projectId,
        stage_number: stageNumber,
        title: 'New subtask',
        status: 'pending',
        sort_order: maxOrder + 1,
        parent_task_id: parentId,
        created_by: uid,
      })
      .select('id, title, description, status, sort_order, parent_task_id')
      .single()
    setAdding(false)
    if (error || !data) return
    const newTask = data as ProjectStageTask
    sync([...tasks, newTask])
    setEditingId(newTask.id)
    setEditDraft('New subtask')
  }

  function onDragStart(e: DragEvent, idx: number, parentId: string | null | undefined) {
    dragSrcIdx.current = idx
    dragSrcParentId.current = parentId ?? null
    e.dataTransfer.effectAllowed = 'move'
  }

  async function onDrop(e: DragEvent, targetIdx: number, targetParentId: string | null | undefined) {
    e.preventDefault()
    const normalizedParent = targetParentId ?? null
    if (dragSrcParentId.current !== normalizedParent) return
    const src = dragSrcIdx.current
    if (src < 0 || src === targetIdx) return

    const scopeTasks = tasks
      .filter((tk) => (tk.parent_task_id ?? null) === normalizedParent)
      .sort((a, b) => a.sort_order - b.sort_order)

    const reordered = [...scopeTasks]
    const [moved] = reordered.splice(src, 1)
    reordered.splice(targetIdx, 0, moved)
    const updatedScope = reordered.map((tk, i) => ({ ...tk, sort_order: i }))

    const newTasks = tasks.map((tk) => {
      const updated = updatedScope.find((u) => u.id === tk.id)
      return updated ?? tk
    })
    sync(newTasks)
    for (const tk of updatedScope) {
      await supabase
        .from('project_stage_tasks')
        .update({ sort_order: tk.sort_order, updated_at: new Date().toISOString() })
        .eq('id', tk.id)
    }
  }

  const topLevel = tasks
    .filter((tk) => !tk.parent_task_id)
    .sort((a, b) => a.sort_order - b.sort_order)

  const allDone  = tasks.filter((tk) => tk.status === 'done').length
  const allTotal = tasks.length

  // ── Read-only client view ─────────────────────────────────────────────
  if (!canEdit) {
    return (
      <div>
        {allTotal > 0 && (
          <div style={s.progressWrap}>
            <span style={s.progressLabel}>
              {allDone} of {allTotal} tasks complete
            </span>
            <div style={s.progressTrack}>
              <div
                style={{
                  ...s.progressFill,
                  width: `${allTotal > 0 ? (allDone / allTotal) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
        {allTotal === 0 ? (
          <p style={s.emptyClient}>No tasks added yet.</p>
        ) : (
          <ul style={s.list}>
            {topLevel.map((task) => {
              const subtasks = tasks
                .filter((tk) => tk.parent_task_id === task.id)
                .sort((a, b) => a.sort_order - b.sort_order)
              return (
                <>
                  <li key={task.id} style={s.rowClient}>
                    <TaskStatusIcon status={task.status} interactive={false} />
                    <span
                      style={{
                        ...s.titleText,
                        textDecoration: task.status === 'done' ? 'line-through' : 'none',
                        opacity: task.status === 'done' ? 0.5 : 1,
                      }}
                    >
                      {task.title}
                    </span>
                  </li>
                  {subtasks.map((sub) => (
                    <li key={sub.id} style={{ ...s.rowClient, paddingLeft: 24 }}>
                      <CornerDownRight size={12} color={t.text.muted} style={{ flexShrink: 0 }} />
                      <TaskStatusIcon status={sub.status} interactive={false} />
                      <span
                        style={{
                          ...s.titleText,
                          fontSize: 12,
                          textDecoration: sub.status === 'done' ? 'line-through' : 'none',
                          opacity: sub.status === 'done' ? 0.5 : 1,
                        }}
                      >
                        {sub.title}
                      </span>
                    </li>
                  ))}
                </>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  // ── Admin (editable) view ─────────────────────────────────────────────
  return (
    <div>
      {topLevel.length === 0 ? (
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
          {topLevel.map((task, topIdx) => {
            const subtasks = tasks
              .filter((tk) => tk.parent_task_id === task.id)
              .sort((a, b) => a.sort_order - b.sort_order)
            return (
              <>
                <li
                  key={task.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, topIdx, null)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => void onDrop(e, topIdx, null)}
                  onMouseEnter={() => setHoveredId(task.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={s.rowAdmin}
                >
                  <span style={s.grip} aria-hidden="true">
                    <GripVertical size={14} />
                  </span>
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
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      style={s.titleInput}
                    />
                  ) : (
                    <span
                      style={s.titleText}
                      onClick={() => { setEditingId(task.id); setEditDraft(task.title) }}
                    >
                      {task.title}
                    </span>
                  )}
                  {hoveredId === task.id && (
                    <button
                      type="button"
                      style={s.subtaskBtn}
                      onClick={() => void addSubtask(task.id)}
                      title="Add subtask"
                    >
                      + subtask
                    </button>
                  )}
                  {confirmDeleteId === task.id ? (
                    <span style={s.confirmRow}>
                      <span style={s.confirmLabel}>Delete?</span>
                      <button type="button" style={s.confirmYes} onClick={() => void deleteTask(task.id)}>Yes</button>
                      <button type="button" style={s.confirmNo} onClick={() => setConfirmDeleteId(null)}>No</button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      aria-label="Delete task"
                      style={{ ...s.deleteBtn, opacity: hoveredId === task.id ? 1 : 0 }}
                      onClick={() => setConfirmDeleteId(task.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </li>

                {/* Subtasks */}
                {subtasks.map((sub, subIdx) => (
                  <li
                    key={sub.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, subIdx, task.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => void onDrop(e, subIdx, task.id)}
                    onMouseEnter={() => setHoveredId(sub.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{ ...s.rowAdmin, paddingLeft: 24 }}
                  >
                    <CornerDownRight size={12} color={t.text.muted} style={{ flexShrink: 0 }} />
                    <span style={{ ...s.grip, opacity: 0.5 }} aria-hidden="true">
                      <GripVertical size={12} />
                    </span>
                    <TaskStatusIcon
                      status={sub.status}
                      interactive
                      onClick={() => void cycleStatus(sub)}
                    />
                    {editingId === sub.id ? (
                      <input
                        autoFocus
                        value={editDraft}
                        onChange={(e) => setEditDraft(e.target.value)}
                        onBlur={() => void commitEdit(sub)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void commitEdit(sub)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        style={{ ...s.titleInput, fontSize: 12 }}
                      />
                    ) : (
                      <span
                        style={{ ...s.titleText, fontSize: 12 }}
                        onClick={() => { setEditingId(sub.id); setEditDraft(sub.title) }}
                      >
                        {sub.title}
                      </span>
                    )}
                    {confirmDeleteId === sub.id ? (
                      <span style={s.confirmRow}>
                        <button type="button" style={s.confirmYes} onClick={() => void deleteTask(sub.id)}>Yes</button>
                        <button type="button" style={s.confirmNo} onClick={() => setConfirmDeleteId(null)}>No</button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        aria-label="Delete subtask"
                        style={{ ...s.deleteBtn, opacity: hoveredId === sub.id ? 1 : 0 }}
                        onClick={() => setConfirmDeleteId(sub.id)}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </li>
                ))}
              </>
            )
          })}
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
          <button type="button" style={s.addBtn} onClick={() => void addTask()} disabled={adding}>
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
  subtaskBtn: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: t.text.muted,
    background: 'none',
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 4,
    padding: '1px 6px',
    cursor: 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
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
    background: t.text.secondary,
    borderRadius: 999,
    transition: `width ${motionTokens.durationBase} ${motionTokens.easeEnter}`,
  },
}
