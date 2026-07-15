// Admin project side panel — rebuilt for the stage module.
// 4 tabs: Overview (identity), Stages (data-driven from project_stages),
// Notes (ClientNotes shared atom), Settings (status, timeline extension).
// Preserves the 5h timeline extension modal.
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'
import { StatusBadge, mono, formatDate, relativeTime as _rt, ui } from './ui'
import { SidePanel } from './SidePanel'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { showToast } from './toast'
import { StageLabel } from '../components/StageLabel'
import type { StageStatus } from '../components/StageLabel'
import { TaskList } from '../components/TaskList'
import type { ProjectStageTask } from '../components/TaskList'
import { AttachmentSection } from '../components/AttachmentSection'
import type { ProjectStageAttachment, AttachmentCategory } from '../components/AttachmentSection'
import { ClientNotes } from '../components/ClientNotes'
import { ProposalLinkPicker } from '../components/ProposalLinkPicker'
import type { ProjectStageProposalLink } from '../components/ProposalLinkPicker'

// ── Types ─────────────────────────────────────────────────────────────────────

type Project = {
  id: string
  title: string
  status: string
  current_phase: string | null
  timeline: string | null
  created_at: string
  client_id: string | null
}

type ProjectStage = {
  id: string
  project_id: string
  stage_number: number
  name: string
  status: StageStatus
  sort_order: number
  created_at: string
}

type Proposal = {
  id: string
  proposal_number: string
  title: string
  status: string
}

type Client = { id: string; name: string | null; email: string }

type Tab = 'overview' | 'stages' | 'notes' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'stages',   label: 'Stages'   },
  { id: 'notes',    label: 'Notes'    },
  { id: 'settings', label: 'Settings' },
]

const STAGE_STATUS_OPTIONS: { value: StageStatus; label: string }[] = [
  { value: 'pending',     label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done',        label: 'Done' },
]

const ATTACHMENT_CATEGORIES: AttachmentCategory[] = [
  'design_brief',
  'development',
  'output_delivery',
]

// ── StageCard ─────────────────────────────────────────────────────────────────

function StageCard({
  stage,
  projectId,
  tasks,
  attachments,
  link,
  proposals,
  expanded,
  confirmDeleteId,
  onToggle,
  onStatusChange,
  onTasksChange,
  onAttachmentsChange,
  onLinkChange,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  idx,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  stage: ProjectStage
  projectId: string
  tasks: ProjectStageTask[]
  attachments: ProjectStageAttachment[]
  link: ProjectStageProposalLink | null
  proposals: Proposal[]
  expanded: boolean
  confirmDeleteId: string | null
  onToggle: () => void
  onStatusChange: (stageId: string, status: StageStatus) => Promise<void>
  onTasksChange: (stageNumber: number, tasks: ProjectStageTask[]) => void
  onAttachmentsChange: (stageNumber: number, atts: ProjectStageAttachment[]) => void
  onLinkChange: (stageNumber: number, link: ProjectStageProposalLink | null) => void
  onRequestDelete: (id: string) => void
  onCancelDelete: () => void
  onConfirmDelete: (stage: ProjectStage) => Promise<void>
  idx: number
  onDragStart: (e: DragEvent<HTMLDivElement>, idx: number) => void
  onDragOver: (e: DragEvent<HTMLDivElement>) => void
  onDrop: (e: DragEvent<HTMLDivElement>, idx: number) => void
}) {
  const attsByCategory = (cat: AttachmentCategory) =>
    attachments.filter((a) => a.category === cat)

  return (
    <div
      style={s.stageCard}
      draggable
      onDragStart={(e) => onDragStart(e, idx)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, idx)}
    >
      {/* Stage card header row */}
      <div style={s.stageCardHead}>
        <span style={s.stageGrip} aria-hidden>
          <GripVertical size={14} />
        </span>
        <button
          type="button"
          style={s.stageToggle}
          onClick={onToggle}
          aria-label={expanded ? 'Collapse stage' : 'Expand stage'}
        >
          {expanded
            ? <ChevronDown size={15} />
            : <ChevronRight size={15} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <StageLabel
            stageId={stage.id}
            stageNumber={stage.stage_number}
            name={stage.name}
            status={stage.status}
            canEditName
          />
        </div>
        {/* Status selector */}
        <select
          value={stage.status}
          onChange={(e) => void onStatusChange(stage.id, e.target.value as StageStatus)}
          style={s.statusSelect}
          aria-label="Stage status"
        >
          {STAGE_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {/* H5: inline delete confirm */}
        {confirmDeleteId === stage.id ? (
          <span style={s.confirmRow}>
            <button type="button" style={s.confirmYes} onClick={() => void onConfirmDelete(stage)}>
              Delete
            </button>
            <button type="button" style={s.confirmNo} onClick={onCancelDelete}>
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            style={s.stageDeleteBtn}
            onClick={() => onRequestDelete(stage.id)}
            aria-label={`Delete stage ${stage.stage_number}`}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Stage expanded content */}
      {expanded && (
        <div style={s.stageBody}>
          {/* Proposal link */}
          <div style={s.stageSection}>
            <span style={s.stageSectionLabel}>Scope link</span>
            <ProposalLinkPicker
              projectId={projectId}
              stageNumber={stage.stage_number}
              link={link}
              canEdit
              proposals={proposals}
              onLinkChange={(l) => onLinkChange(stage.stage_number, l)}
            />
          </div>

          {/* Tasks */}
          <div style={s.stageSection}>
            <span style={s.stageSectionLabel}>Tasks</span>
            <TaskList
              projectId={projectId}
              stageNumber={stage.stage_number}
              tasks={tasks}
              canEdit
              onTasksChange={(tks) => onTasksChange(stage.stage_number, tks)}
            />
          </div>

          {/* Attachments — 3 categories */}
          <div style={s.stageSection}>
            <span style={s.stageSectionLabel}>Files</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ATTACHMENT_CATEGORIES.map((cat) => (
                <AttachmentSection
                  key={cat}
                  projectId={projectId}
                  stageNumber={stage.stage_number}
                  category={cat}
                  attachments={attsByCategory(cat)}
                  canUpload
                  onAttachmentsChange={(atts) => {
                    // Merge updated category into the full stage attachments
                    const others = attachments.filter((a) => a.category !== cat)
                    onAttachmentsChange(stage.stage_number, [...others, ...atts])
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ProjectPanel ───────────────────────────────────────────────────────────────

export function ProjectPanel({
  projectId,
  onClose,
}: {
  projectId: string
  onClose: () => void
}) {
  const { isMobile } = useBreakpoint()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // Core data
  const [project, setProject]     = useState<Project | null>(null)
  const [client, setClient]       = useState<Client | null>(null)
  const [stages, setStages]       = useState<ProjectStage[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading]     = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Per-stage derived state
  const [tasksByStage, setTasksByStage]   = useState<Record<number, ProjectStageTask[]>>({})
  const [attsByStage, setAttsByStage]     = useState<Record<number, ProjectStageAttachment[]>>({})
  const [linksByStage, setLinksByStage]   = useState<Record<number, ProjectStageProposalLink | null>>({})

  // Stage UI state
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const dragSrcIdx = useRef<number>(-1)

  // Overview: inline title edit
  const [titleDraft, setTitleDraft]   = useState('')
  const [editingTitle, setEditingTitle] = useState(false)

  // Settings: project-level edits
  const [statusDraft, setStatusDraft]   = useState('')
  const [timelineDraft, setTimelineDraft] = useState('')
  const [savingSettings, setSavingSettings] = useState(false)

  // 5h: timeline extension modal
  const [showExt, setShowExt]     = useState(false)
  const [extTimeline, setExtTimeline] = useState('')
  const [extReason, setExtReason]   = useState('')
  const [sending, setSending]       = useState(false)
  const [extError, setExtError]     = useState<string | null>(null)

  // ── Load ────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [projRes, stagesRes, tasksRes, attsRes, linksRes] = await Promise.all([
          supabase
            .from('projects')
            .select('id, title, status, current_phase, timeline, created_at, client_id')
            .eq('id', projectId)
            .single(),
          supabase
            .from('project_stages')
            .select('*')
            .eq('project_id', projectId)
            .order('sort_order', { ascending: true }),
          supabase
            .from('project_stage_tasks')
            .select('id, title, description, status, sort_order, stage_number')
            .eq('project_id', projectId)
            .order('sort_order', { ascending: true }),
          supabase
            .from('project_stage_attachments')
            .select('*')
            .eq('project_id', projectId),
          supabase
            .from('project_stage_proposal_links')
            .select('*')
            .eq('project_id', projectId),
        ])

        if (projRes.error) throw projRes.error
        if (cancelled) return

        const proj = projRes.data as Project
        setProject(proj)
        setTitleDraft(proj.title)
        setStatusDraft(proj.status)
        setTimelineDraft(proj.timeline ?? '')

        const stageRows = (stagesRes.data ?? []) as ProjectStage[]
        setStages(stageRows)

        // Group tasks + attachments + links by stage_number
        const taskMap: Record<number, ProjectStageTask[]> = {}
        for (const tk of (tasksRes.data ?? []) as (ProjectStageTask & { stage_number: number })[]) {
          ;(taskMap[tk.stage_number] ??= []).push(tk)
        }
        setTasksByStage(taskMap)

        const attMap: Record<number, ProjectStageAttachment[]> = {}
        for (const att of (attsRes.data ?? []) as ProjectStageAttachment[]) {
          ;(attMap[att.stage_number] ??= []).push(att)
        }
        setAttsByStage(attMap)

        const linkMap: Record<number, ProjectStageProposalLink | null> = {}
        for (const lk of (linksRes.data ?? []) as ProjectStageProposalLink[]) {
          linkMap[lk.stage_number] = lk
        }
        setLinksByStage(linkMap)

        // Fetch client + proposals in parallel (non-critical, ignore errors)
        if (proj.client_id) {
          const [clientRes, propRes] = await Promise.all([
            supabase
              .from('clients')
              .select('id, name, email')
              .eq('id', proj.client_id)
              .single(),
            supabase
              .from('proposals')
              .select('id, proposal_number, title, status')
              .eq('client_id', proj.client_id)
              .order('created_at', { ascending: false }),
          ])
          if (!cancelled) {
            if (clientRes.data) setClient(clientRes.data as Client)
            setProposals((propRes.data ?? []) as Proposal[])
          }
        }
      } catch {
        // H9: never surface raw DB error to admin UI
        if (!cancelled) setLoadError('Could not load this project. Refresh to try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [projectId])

  // ── Stage actions ────────────────────────────────────────────────────

  async function updateStageStatus(stageId: string, status: StageStatus) {
    setStages((prev) => prev.map((sg) => sg.id === stageId ? { ...sg, status } : sg))
    await supabase
      .from('project_stages')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', stageId)
  }

  async function addStage() {
    if (!project) return
    const maxNumber  = stages.reduce((m, sg) => Math.max(m, sg.stage_number), 0)
    const maxOrder   = stages.reduce((m, sg) => Math.max(m, sg.sort_order), -1)
    const stageNumber = maxNumber + 1
    const { data, error } = await supabase
      .from('project_stages')
      .insert({
        project_id: project.id,
        stage_number: stageNumber,
        name: `Stage ${stageNumber}`,
        status: 'pending',
        sort_order: maxOrder + 1,
      })
      .select('*')
      .single()
    if (error || !data) { showToast('Could not add stage. Try again.', 'error'); return }
    const newStage = data as ProjectStage
    setStages((prev) => [...prev, newStage])
    setExpandedStageId(newStage.id)
  }

  async function deleteStage(stage: ProjectStage) {
    // Collect storage paths before deleting (CASCADE cleans DB rows)
    const stageAtts = attsByStage[stage.stage_number] ?? []
    const paths = stageAtts.map((a) => a.storage_path)
    await supabase.from('project_stages').delete().eq('id', stage.id)
    if (paths.length > 0) {
      void supabase.storage.from('stage-attachments').remove(paths)
    }
    setStages((prev) => prev.filter((sg) => sg.id !== stage.id))
    const newTasksByStage   = { ...tasksByStage }
    const newAttsByStage    = { ...attsByStage }
    const newLinksByStage   = { ...linksByStage }
    delete newTasksByStage[stage.stage_number]
    delete newAttsByStage[stage.stage_number]
    delete newLinksByStage[stage.stage_number]
    setTasksByStage(newTasksByStage)
    setAttsByStage(newAttsByStage)
    setLinksByStage(newLinksByStage)
    setConfirmDeleteId(null)
    if (expandedStageId === stage.id) setExpandedStageId(null)
    showToast('Stage deleted.', 'success')
  }

  // Native HTML5 drag-to-reorder stages
  function onStageDragStart(e: DragEvent<HTMLDivElement>, idx: number) {
    dragSrcIdx.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }

  async function onStageDrop(e: DragEvent<HTMLDivElement>, targetIdx: number) {
    e.preventDefault()
    const src = dragSrcIdx.current
    if (src < 0 || src === targetIdx) return
    const reordered = [...stages]
    const [moved] = reordered.splice(src, 1)
    reordered.splice(targetIdx, 0, moved)
    const withOrders = reordered.map((sg, i) => ({ ...sg, sort_order: i }))
    setStages(withOrders)
    for (const sg of withOrders) {
      await supabase
        .from('project_stages')
        .update({ sort_order: sg.sort_order, updated_at: new Date().toISOString() })
        .eq('id', sg.id)
    }
  }

  // ── Overview: title edit ─────────────────────────────────────────────

  async function commitTitle() {
    const trimmed = titleDraft.trim()
    setEditingTitle(false)
    if (!trimmed || trimmed === project?.title) { setTitleDraft(project?.title ?? ''); return }
    setProject((p) => p ? { ...p, title: trimmed } : p)
    await supabase
      .from('projects')
      .update({ title: trimmed, updated_at: new Date().toISOString() })
      .eq('id', projectId)
  }

  // ── Settings: save ───────────────────────────────────────────────────

  async function saveSettings() {
    if (!project) return
    setSavingSettings(true)
    const { error } = await supabase
      .from('projects')
      .update({
        status: statusDraft,
        timeline: timelineDraft.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)
    setSavingSettings(false)
    if (error) { showToast('Could not save. Try again.', 'error'); return }
    setProject((p) => p ? { ...p, status: statusDraft, timeline: timelineDraft.trim() || null } : p)
    showToast('Project updated.', 'success')
  }

  // 5h: send timeline extension
  async function sendExtension() {
    if (!project) return
    if (!extTimeline.trim()) { setExtError('Enter the new timeline.'); return }
    setSending(true)
    setExtError(null)
    try {
      const { data: sess } = await supabase.auth.getUser()
      const uid = sess.user?.id ?? null
      const { data: ext, error: insErr } = await supabase
        .from('timeline_extensions')
        .insert({
          project_id: project.id,
          new_timeline: extTimeline.trim(),
          reason: extReason.trim() || null,
          created_by: uid,
        })
        .select('id')
        .single()
      if (insErr) throw insErr
      if (project.client_id) {
        await supabase.from('client_notifications').insert({
          client_id: project.client_id,
          type: 'timeline_extension',
          reference_id: (ext as { id: string }).id,
        })
      }
      setSending(false)
      setShowExt(false)
      setExtTimeline('')
      setExtReason('')
      showToast('Extension sent to client.', 'success')
    } catch {
      setSending(false)
      setExtError('Could not send the extension. Try again.')
    }
  }

  // ── Render helpers ───────────────────────────────────────────────────

  const currentUserId = ''  // resolved inside ClientNotes from session

  function OverviewTab() {
    return (
      <div style={s.tabContent}>
        {/* Project name */}
        <div style={s.field}>
          <span style={s.fieldLabel}>Project name</span>
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => void commitTitle()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void commitTitle()
                if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(project?.title ?? '') }
              }}
              style={s.titleInput}
            />
          ) : (
            <span
              style={s.titleDisplay}
              onClick={() => { setTitleDraft(project?.title ?? ''); setEditingTitle(true) }}
              title="Click to rename"
            >
              {project?.title}
            </span>
          )}
        </div>

        {/* Client */}
        <div style={s.field}>
          <span style={s.fieldLabel}>Client</span>
          <span style={s.fieldValue}>
            {client ? (client.name || client.email) : (
              <span style={{ color: t.text.muted }}>No client linked</span>
            )}
          </span>
        </div>

        {/* Status */}
        <div style={s.field}>
          <span style={s.fieldLabel}>Status</span>
          <StatusBadge status={project?.status ?? 'active'} />
        </div>

        {/* Created */}
        <div style={s.field}>
          <span style={s.fieldLabel}>Created</span>
          <span style={s.fieldValue}>{project ? formatDate(project.created_at) : ''}</span>
        </div>

        {/* Timeline */}
        {project?.timeline && (
          <div style={s.field}>
            <span style={s.fieldLabel}>Timeline</span>
            <span style={s.fieldValue}>{project.timeline}</span>
          </div>
        )}
      </div>
    )
  }

  function StagesTab() {
    return (
      <div style={s.tabContent}>
        {stages.length === 0 ? (
          <div style={s.emptyState}>
            <p style={s.emptyText}>No stages yet. Add the first one below.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {stages.map((stage, idx) => (
              <StageCard
                key={stage.id}
                stage={stage}
                projectId={projectId}
                tasks={tasksByStage[stage.stage_number] ?? []}
                attachments={attsByStage[stage.stage_number] ?? []}
                link={linksByStage[stage.stage_number] ?? null}
                proposals={proposals}
                expanded={expandedStageId === stage.id}
                confirmDeleteId={confirmDeleteId}
                onToggle={() =>
                  setExpandedStageId((prev) => (prev === stage.id ? null : stage.id))
                }
                onStatusChange={updateStageStatus}
                onTasksChange={(sn, tks) => setTasksByStage((prev) => ({ ...prev, [sn]: tks }))}
                onAttachmentsChange={(sn, atts) => setAttsByStage((prev) => ({ ...prev, [sn]: atts }))}
                onLinkChange={(sn, lk) => setLinksByStage((prev) => ({ ...prev, [sn]: lk }))}
                onRequestDelete={setConfirmDeleteId}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onConfirmDelete={deleteStage}
                idx={idx}
                onDragStart={onStageDragStart}
                onDragOver={(e) => e.preventDefault()}
                onDrop={onStageDrop}
              />
            ))}
          </div>
        )}
        <button type="button" style={s.addStageBtn} onClick={() => void addStage()}>
          <Plus size={14} />
          Add stage
        </button>
      </div>
    )
  }

  function NotesTab() {
    return (
      <div style={s.tabContent}>
        <ClientNotes
          projectId={projectId}
          currentUserRole="admin"
          currentUserId={currentUserId}
        />
      </div>
    )
  }

  function SettingsTab() {
    return (
      <div style={s.tabContent}>
        <div style={s.field}>
          <span style={s.fieldLabel}>Project status</span>
          <select
            value={statusDraft}
            onChange={(e) => setStatusDraft(e.target.value)}
            style={s.settingsSelect}
          >
            {['active', 'paused', 'completed', 'cancelled'].map((v) => (
              <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
            ))}
          </select>
        </div>

        <div style={s.field}>
          <span style={s.fieldLabel}>Timeline description</span>
          <input
            value={timelineDraft}
            onChange={(e) => setTimelineDraft(e.target.value)}
            style={s.settingsInput}
            placeholder="e.g. 6-week engagement"
          />
        </div>

        <button
          type="button"
          style={ui.primaryBtn}
          onClick={() => void saveSettings()}
          disabled={savingSettings}
        >
          {savingSettings ? 'Saving...' : 'Save changes'}
        </button>

        {/* 5h: timeline extension — active projects only */}
        {(project?.status === 'active' || statusDraft === 'active') && (
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: `1px solid ${t.border.subtle}` }}>
            <p style={s.fieldLabel}>Timeline extension</p>
            <button type="button" style={s.extBtn} onClick={() => setShowExt(true)}>
              Send extension request to client
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Main render ──────────────────────────────────────────────────────

  return (
    <>
      <SidePanel
        title={project?.title ?? 'Project'}
        subtitle={project ? `Created ${formatDate(project.created_at)}` : undefined}
        onClose={onClose}
        width={560}
        headerExtra={project ? <StatusBadge status={project.status} /> : undefined}
      >
        {loading ? (
          <p style={s.muted}>Loading...</p>
        ) : loadError || !project ? (
          <p style={s.errorText}>{loadError ?? 'Project not found.'}</p>
        ) : (
          <>
            {/* Tab bar — H7: keeps users oriented in the panel hierarchy.
                Horizontal scroll strip on mobile so all 4 tabs stay reachable. */}
            <div style={{ ...s.tabBar, ...(isMobile ? s.tabBarMobile : null) }}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  style={{
                    ...s.tabBtn,
                    ...(isMobile ? s.tabBtnMobile : null),
                    ...(activeTab === tab.id ? s.tabBtnActive : {}),
                  }}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && <OverviewTab />}
            {activeTab === 'stages'   && <StagesTab />}
            {activeTab === 'notes'    && <NotesTab />}
            {activeTab === 'settings' && <SettingsTab />}
          </>
        )}
      </SidePanel>

      {/* 5h: timeline extension modal — z-index above the drawer (>201) */}
      {showExt && (
        <div style={s.modalOverlay} onClick={() => !sending && setShowExt(false)}>
          <div style={s.modalPanel} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHead}>
              <h3 style={s.modalTitle}>Send timeline extension</h3>
              <button
                type="button"
                style={s.modalClose}
                onClick={() => setShowExt(false)}
                disabled={sending}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            {extError && <div style={s.modalError}>{extError}</div>}
            <label style={s.field}>
              <span style={s.fieldLabel}>New timeline</span>
              <input
                value={extTimeline}
                onChange={(e) => setExtTimeline(e.target.value)}
                style={s.settingsInput}
                placeholder="e.g. 2 extra weeks, delivery by 15 Aug"
                autoFocus
              />
            </label>
            <label style={{ ...s.field, marginTop: 12 }}>
              <span style={s.fieldLabel}>Reason</span>
              <textarea
                value={extReason}
                onChange={(e) => setExtReason(e.target.value)}
                style={{ ...s.settingsInput, minHeight: 72, resize: 'vertical' as const }}
                placeholder="Why the timeline needs to change"
              />
            </label>
            <div style={s.modalActions}>
              <button
                type="button"
                style={s.cancelBtn}
                onClick={() => setShowExt(false)}
                disabled={sending}
              >
                Cancel
              </button>
              <button
                type="button"
                style={ui.primaryBtn}
                onClick={() => void sendExtension()}
                disabled={sending}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, CSSProperties> = {
  muted: { fontFamily: fonts.body, fontSize: 14, color: t.text.secondary, margin: 0 },
  errorText: { fontFamily: fonts.body, fontSize: 14, color: tokens.ruby, margin: 0 },

  // Tab bar
  tabBar: {
    display: 'flex',
    gap: 2,
    borderBottom: `2px solid ${t.border.subtle}`,
    marginBottom: 20,
    flexShrink: 0,
  },
  tabBarMobile: {
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
    flexWrap: 'nowrap',
  },
  tabBtn: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    color: t.text.secondary,
    background: 'none',
    border: 'none',
    padding: '8px 14px',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
    borderRadius: '4px 4px 0 0',
    transition: `color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  tabBtnMobile: { minWidth: 80, padding: '12px 16px', flexShrink: 0, whiteSpace: 'nowrap' },
  tabBtnActive: {
    color: tokens.primary,
    fontWeight: 600,
    borderBottomColor: tokens.primary,
  },

  // Tab content wrapper
  tabContent: { display: 'flex', flexDirection: 'column', gap: 16 },

  // Fields
  field: { display: 'flex', flexDirection: 'column', gap: 4 },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: t.text.muted,
  },
  fieldValue: { fontFamily: fonts.body, fontSize: 14, color: t.text.primary },
  titleDisplay: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: t.text.primary,
    cursor: 'text',
    borderBottom: `1px dashed ${t.border.medium}`,
    paddingBottom: 2,
    display: 'inline',
  },
  titleInput: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: t.text.primary,
    border: `1.5px solid ${t.border.focus}`,
    borderRadius: 6,
    padding: '4px 8px',
    background: tokens.surface,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },

  // Stage list
  stageCard: {
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 10,
    background: tokens.surface,
    overflow: 'hidden',
  },
  stageCardHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 12px',
    background: t.background.subtle,
    borderBottom: `1px solid ${t.border.subtle}`,
  },
  stageGrip: {
    cursor: 'grab',
    color: t.text.muted,
    display: 'flex',
    flexShrink: 0,
  },
  stageToggle: {
    background: 'none',
    border: 'none',
    color: t.text.muted,
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    flexShrink: 0,
  },
  stageBody: {
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  stageSection: { display: 'flex', flexDirection: 'column', gap: 6 },
  stageSectionLabel: {
    fontFamily: fonts.body,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: t.text.muted,
  },
  statusSelect: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.secondary,
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    padding: '4px 8px',
    cursor: 'pointer',
    flexShrink: 0,
    outline: 'none',
  },
  stageDeleteBtn: {
    background: 'none',
    border: 'none',
    padding: 4,
    cursor: 'pointer',
    color: t.text.muted,
    display: 'flex',
    flexShrink: 0,
    transition: `color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  confirmRow: { display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 },
  confirmYes: {
    fontFamily: fonts.body, fontSize: 11, fontWeight: 600, color: tokens.ruby,
    background: tokens.rubyLight, border: `1px solid ${tokens.ruby}`,
    borderRadius: 4, padding: '2px 8px', cursor: 'pointer',
  },
  confirmNo: {
    fontFamily: fonts.body, fontSize: 11, color: t.text.secondary,
    background: 'none', border: `1px solid ${t.border.default}`,
    borderRadius: 4, padding: '2px 8px', cursor: 'pointer',
  },

  addStageBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    color: tokens.accent,
    background: t.background.tint1,
    border: `1px solid ${t.border.brand}`,
    borderRadius: 8,
    padding: '8px 14px',
    cursor: 'pointer',
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },

  emptyState: { padding: '32px 0', textAlign: 'center' as const },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: t.text.tertiary, margin: 0 },

  // Settings inputs
  settingsSelect: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '9px 11px',
    width: '100%',
    boxSizing: 'border-box' as const,
    outline: 'none',
    cursor: 'pointer',
  },
  settingsInput: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '9px 11px',
    width: '100%',
    boxSizing: 'border-box' as const,
    outline: 'none',
  },
  extBtn: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: tokens.primary,
    background: tokens.surface,
    border: `1px solid ${tokens.accent}`,
    borderRadius: 8,
    padding: '9px 14px',
    cursor: 'pointer',
  },

  // Timeline extension modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 26, 27, 0.45)',
    zIndex: 320,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '80px 20px',
    overflowY: 'auto',
  },
  modalPanel: {
    background: tokens.surface,
    borderRadius: 12,
    border: `1px solid ${tokens.border}`,
    padding: 24,
    width: '100%',
    maxWidth: 440,
  },
  modalHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: t.text.primary,
    margin: 0,
  },
  modalClose: {
    background: 'transparent',
    border: 'none',
    color: t.text.muted,
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
  },
  modalError: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '10px 12px',
    marginBottom: 12,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  cancelBtn: {
    background: tokens.surface,
    color: t.text.primary,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '10px 16px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
