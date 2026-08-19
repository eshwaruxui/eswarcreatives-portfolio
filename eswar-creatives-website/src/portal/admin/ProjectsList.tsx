import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'
import { PageHeader, Card, StatusBadge, mono, ui } from './ui'
import { formatPortalDate } from '../utils/formatDate'
import { showToast } from './toast'
import { usePortal } from '../PortalContext'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { highlightBackgroundStyle, useHighlightRow } from '../hooks/useHighlightRow'
import { ClientFilterBanner } from './ClientFilterBanner'
import { AddProjectModal } from './AddProjectModal'
import { StageLabel } from '../components/StageLabel'
import type { StageStatus } from '../components/StageLabel'
import { TaskList } from '../components/TaskList'
import type { ProjectStageTask } from '../components/TaskList'
import { AttachmentSection } from '../components/AttachmentSection'
import type { ProjectStageAttachment, AttachmentCategory } from '../components/AttachmentSection'
import { ClientNotes } from '../components/ClientNotes'
import { ProposalLinkPicker } from '../components/ProposalLinkPicker'
import type { ProjectStageProposalLink } from '../components/ProposalLinkPicker'
import { OutputsBrowser } from '../components/OutputsBrowser'
import type { OutputFile } from '../components/OutputsBrowser'
import { Lightbox } from '../../components/lightbox/Lightbox'
import type { GalleryImage } from '../../components/lightbox/types'
import { toPreviewItem } from '../utils/toPreviewItem'

// Lightbox chrome is intentionally a dark photo-viewer theme, independent of
// the portal's teal/cream palette -- same rationale as CaseDetailOverlay's
// LIGHTBOX_THEME (src/components/branding/CaseDetailOverlay.tsx) and the
// standalone admin ProjectPanel's matching constant.
const OUTPUTS_LIGHTBOX_THEME = {
  background: '#0F0F0F',
  text: t.text.onPrimary,
  textMuted: 'rgba(255,255,255,0.6)',
  accent: tokens.gold,
  accentForeground: '#000000',
  surface: 'rgba(255,255,255,0.1)',
  border: 'rgba(255,255,255,0.15)',
  radius: '8px',
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Project = {
  id: string
  title: string
  status: string
  current_phase: string | null
  phase_number: number | null
  client_id: string | null
  clients: { company_name: string | null; contact_name: string | null } | null
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

type Proposal = { id: string; proposal_number: string; title: string; status: string }

type Tab = 'overview' | 'stages' | 'notes' | 'outputs' | 'settings'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'stages',   label: 'Stages'   },
  { id: 'notes',    label: 'Notes'    },
  { id: 'outputs',  label: 'Outputs'  },
  { id: 'settings', label: 'Settings' },
]

// Canonical phase pointer kept for the progress ring caption "Phase X of Y".
const PHASE_OPTIONS = [
  { n: 1, name: 'Discovery' },
  { n: 2, name: 'Design'    },
  { n: 3, name: 'Review'    },
  { n: 4, name: 'Delivery'  },
] as const

const STATUS_OPTIONS = [
  { value: 'active',    label: 'Active'    },
  { value: 'on_hold',   label: 'Paused'    },
  { value: 'delivered', label: 'Completed' },
] as const

const ATTACHMENT_CATEGORIES: AttachmentCategory[] = [
  'design_brief',
  'development',
  'output_delivery',
]

const STAGE_STATUS_OPTIONS: { value: StageStatus; label: string }[] = [
  { value: 'pending',     label: 'Upcoming'    },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done',        label: 'Done'        },
]

function clientLabel(p: Project) {
  return p.clients?.company_name || p.clients?.contact_name || '—'
}

// ── ProjectsList ──────────────────────────────────────────────────────────────

export function ProjectsList() {
  const { selectedClientId, clients } = usePortal()
  const { isMobile } = useBreakpoint()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)
  const [openProject, setOpenProject] = useState<Project | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const { highlightId, triggerHighlight } = useHighlightRow()

  async function load() {
    setLoading(true)
    try {
      let query = supabase
        .from('projects')
        .select('id, title, status, current_phase, phase_number, client_id, clients(company_name, contact_name)')
        .order('created_at', { ascending: false })
      if (selectedClientId) query = query.eq('client_id', selectedClientId)
      const { data, error: err } = await query
      if (err) throw err
      setProjects((data ?? []) as unknown as Project[])
    } catch {
      setError('Could not load projects. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [selectedClientId])

  function handleSaved(id: string) {
    setOpenProject(null)
    void load()
    triggerHighlight(id)
  }

  return (
    <>
      <PageHeader
        title="Projects"
        action={
          !isMobile && (
            <button type="button" style={ui.primaryBtn} onClick={() => setShowAdd(true)}>
              <Plus size={16} /> Add project
            </button>
          )
        }
      />
      <ClientFilterBanner />
      {error && <div style={s.error}>{error}</div>}
      {isMobile ? (
        loading ? (
          <p style={{ ...ui.muted, padding: '20px 0' }}>Loading...</p>
        ) : projects.length === 0 ? (
          <p style={{ ...ui.muted, padding: '20px 0' }}>No projects yet.</p>
        ) : (
          <div style={{ ...s.cardStack, paddingBottom: 88 }}>
            <style>{`
              .ec-tap-card { background: ${tokens.surface}; transition: background ${motionTokens.durationFast} ${motionTokens.easeDefault}; }
              .ec-tap-card:active { background: ${t.background.tint1}; }
            `}</style>
            {projects.map((p) => (
              <div
                key={p.id}
                className="ec-tap-card"
                onClick={() => setOpenProject(p)}
                style={{
                  ...s.mobileCard,
                  ...highlightBackgroundStyle(highlightId === p.id),
                }}
              >
                <div style={s.mobileCardTop}>
                  <span style={s.mobileCardTitle}>{p.title}</span>
                  <StatusBadge status={p.status} />
                </div>
                <span style={s.mobileCardClient}>{clientLabel(p)}</span>
                {p.current_phase && (
                  <span style={s.mobileCardStage}>{p.current_phase}</span>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <p style={{ ...ui.muted, padding: 20 }}>Loading...</p>
          ) : projects.length === 0 ? (
            <p style={{ ...ui.muted, padding: 20 }}>No projects yet.</p>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Project</th>
                  <th style={s.th}>Client</th>
                  <th style={s.th}>Stage</th>
                  <th style={s.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setOpenProject(p)}
                    style={{
                      ...s.row,
                      ...(openProject?.id === p.id ? s.rowActive : null),
                      ...highlightBackgroundStyle(highlightId === p.id),
                    }}
                  >
                    <td style={{ ...s.td, fontWeight: 600, color: t.text.primary }}>{p.title}</td>
                    <td style={s.td}>{clientLabel(p)}</td>
                    <td style={s.td}>{p.current_phase || '—'}</td>
                    <td style={s.td}><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Mobile sticky footer "+ Add project", mirrors InvoicesAdmin/ClientsList */}
      {isMobile && (
        <div style={s.stickyFooter}>
          <button type="button" style={s.stickyFooterBtn} onClick={() => setShowAdd(true)}>
            <Plus size={16} />
            Add project
          </button>
        </div>
      )}

      {openProject && (
        <ProjectPanel
          project={openProject}
          onClose={() => setOpenProject(null)}
          onSaved={handleSaved}
        />
      )}

      {showAdd && (
        <AddProjectModal
          clients={clients}
          preselectedClientId={selectedClientId}
          onClose={() => setShowAdd(false)}
          onCreated={(id) => { setShowAdd(false); handleSaved(id) }}
        />
      )}
    </>
  )
}

// ── StageCard (panel-local) ───────────────────────────────────────────────────

function StageCard({
  stage, projectId, tasks, attachments, link, proposals,
  expanded, confirmDeleteId,
  onToggle, onStatusChange, onTasksChange, onAttachmentsChange,
  onLinkChange, onRequestDelete, onCancelDelete, onConfirmDelete,
  idx, onDragStart, onDragOver, onDrop,
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
  const attsByCategory = (cat: AttachmentCategory) => attachments.filter((a) => a.category === cat)

  return (
    <div
      style={s.stageCard}
      draggable
      onDragStart={(e) => onDragStart(e, idx)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, idx)}
    >
      <div style={s.stageHead}>
        <span style={s.stageGrip} aria-hidden><GripVertical size={14} /></span>
        <button type="button" style={s.stageToggle} onClick={onToggle}>
          {expanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
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
        <select
          value={stage.status}
          onChange={(e) => void onStatusChange(stage.id, e.target.value as StageStatus)}
          style={s.statusSelect}
        >
          {STAGE_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {confirmDeleteId === stage.id ? (
          <span style={s.confirmRow}>
            <button type="button" style={s.confirmYes} onClick={() => void onConfirmDelete(stage)}>Delete</button>
            <button type="button" style={s.confirmNo} onClick={onCancelDelete}>Cancel</button>
          </span>
        ) : (
          <button type="button" style={s.stageDeleteBtn} onClick={() => onRequestDelete(stage.id)}>
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {expanded && (
        <div style={s.stageBody}>
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
                  onAttachmentsChange={(atts) =>
                    onAttachmentsChange(stage.stage_number, [
                      ...attachments.filter((a) => a.category !== cat),
                      ...atts,
                    ])
                  }
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── ProjectPanel (4-tab) ──────────────────────────────────────────────────────

function ProjectPanel({
  project,
  onClose,
  onSaved,
}: {
  project: Project
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const { isMobile } = useBreakpoint()
  // Slide-in animation
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Mobile: lock body scroll while the panel covers the full screen.
  useEffect(() => {
    if (!isMobile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isMobile])

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loadError, setLoadError] = useState<string | null>(null)

  // ── Outputs ──
  const [previewState, setPreviewState] = useState<{ items: GalleryImage[]; index: number } | null>(null)
  async function openPreview(files: OutputFile[], clickedIndex: number, folderId: string | null) {
    const groupKey = folderId ?? 'root'
    const signed = await Promise.all(
      files.map((f) => supabase.storage.from('project-outputs').createSignedUrl(f.storage_path, 3600))
    )
    const items = files.map((f, i) => toPreviewItem(f, signed[i].data?.signedUrl ?? '', groupKey))
    setPreviewState({ items, index: clickedIndex })
  }

  // ── Overview ──
  const [projectTitle, setProjectTitle] = useState(project.title)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(project.title)
  const [clientName, setClientName] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [linkedProposalId, setLinkedProposalId] = useState<string | null>(null)
  const [linkedProposalPhaseId, setLinkedProposalPhaseId] = useState<string | null>(null)
  const [linkedProposalLineItemId, setLinkedProposalLineItemId] = useState<string | null>(null)
  const [projectAtts, setProjectAtts] = useState<ProjectStageAttachment[]>([])

  // ── Stages ──
  const [stages, setStages] = useState<ProjectStage[]>([])
  const [tasksByStage, setTasksByStage] = useState<Record<number, ProjectStageTask[]>>({})
  const [attsByStage, setAttsByStage]   = useState<Record<number, ProjectStageAttachment[]>>({})
  const [linksByStage, setLinksByStage] = useState<Record<number, ProjectStageProposalLink | null>>({})
  const [proposals, setProposals]       = useState<Proposal[]>([])
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const dragSrcIdx = useRef<number>(-1)

  // ── Settings ──
  const [statusDraft, setStatusDraft]   = useState(project.status)
  const [timelineDraft, setTimelineDraft] = useState('')
  const [phaseNumber, setPhaseNumber]   = useState<number>(
    project.phase_number && project.phase_number >= 1 && project.phase_number <= 4
      ? project.phase_number
      : (PHASE_OPTIONS.find((p) => p.name === project.current_phase)?.n ?? 1)
  )
  const [saving, setSaving] = useState(false)

  // ── Stage delete impact modal ──
  const [deleteImpactStage, setDeleteImpactStage] = useState<ProjectStage | null>(null)
  const [deleteImpactCounts, setDeleteImpactCounts] = useState<{ tasks: number; atts: number; links: number } | null>(null)
  const [loadingImpact, setLoadingImpact] = useState(false)

  // 5h: timeline extension
  const [showExt, setShowExt]       = useState(false)
  const [extTimeline, setExtTimeline] = useState('')
  const [extReason, setExtReason]   = useState('')
  const [sendingExt, setSendingExt] = useState(false)
  const [extError, setExtError]     = useState<string | null>(null)

  // ── Load ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [projRes, stagesRes, tasksRes, attsRes, linksRes, projAttsRes] = await Promise.all([
          supabase
            .from('projects')
            .select('created_at, timeline, start_date, end_date, linked_proposal_id, linked_proposal_phase_id, linked_proposal_line_item_id')
            .eq('id', project.id)
            .single(),
          supabase
            .from('project_stages')
            .select('*')
            .eq('project_id', project.id)
            .order('sort_order', { ascending: true }),
          supabase
            .from('project_stage_tasks')
            .select('id, title, description, status, sort_order, stage_number, parent_task_id')
            .eq('project_id', project.id)
            .order('sort_order', { ascending: true }),
          supabase
            .from('project_stage_attachments')
            .select('*')
            .eq('project_id', project.id),
          supabase
            .from('project_stage_proposal_links')
            .select('*')
            .eq('project_id', project.id),
          supabase
            .from('project_attachments')
            .select('*')
            .eq('project_id', project.id),
        ])

        if (cancelled) return
        if (projRes.data) {
          const pd = projRes.data as {
            created_at: string
            timeline: string | null
            start_date: string | null
            end_date: string | null
            linked_proposal_id: string | null
            linked_proposal_phase_id: string | null
            linked_proposal_line_item_id: string | null
          }
          setCreatedAt(pd.created_at)
          setTimelineDraft(pd.timeline ?? '')
          setStartDate(pd.start_date ?? '')
          setEndDate(pd.end_date ?? '')
          setLinkedProposalId(pd.linked_proposal_id)
          setLinkedProposalPhaseId(pd.linked_proposal_phase_id)
          setLinkedProposalLineItemId(pd.linked_proposal_line_item_id)
        }
        setProjectAtts((projAttsRes.data ?? []) as ProjectStageAttachment[])

        const stageRows = (stagesRes.data ?? []) as ProjectStage[]
        setStages(stageRows)

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

        // Client name + proposals (non-critical)
        if (project.client_id) {
          const [clientRes, propRes] = await Promise.all([
            supabase.from('clients').select('name, email').eq('id', project.client_id).single(),
            supabase
              .from('proposals')
              .select('id, proposal_number, title, status')
              .eq('client_id', project.client_id)
              .order('created_at', { ascending: false }),
          ])
          if (!cancelled) {
            const cl = clientRes.data as { name: string | null; email: string } | null
            if (cl) setClientName(cl.name || cl.email)
            setProposals((propRes.data ?? []) as Proposal[])
          }
        }
      } catch {
        if (!cancelled) setLoadError('Could not load project details. Refresh to try again.')
      }
    })()
    return () => { cancelled = true }
  }, [project.id])

  // ── Stage actions ─────────────────────────────────────────────────────

  async function updateStageStatus(stageId: string, status: StageStatus) {
    setStages((prev) => prev.map((sg) => sg.id === stageId ? { ...sg, status } : sg))
    await supabase
      .from('project_stages')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', stageId)
  }

  async function addStage() {
    const maxNumber = stages.reduce((m, sg) => Math.max(m, sg.stage_number), 0)
    const maxOrder  = stages.reduce((m, sg) => Math.max(m, sg.sort_order), -1)
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
    if (error || !data) { showToast('Could not add stage.', 'error'); return }
    const newStage = data as ProjectStage
    setStages((prev) => [...prev, newStage])
    setExpandedStageId(newStage.id)
  }

  async function deleteStage(stage: ProjectStage) {
    const paths = (attsByStage[stage.stage_number] ?? []).map((a) => a.storage_path)
    await supabase.from('project_stages').delete().eq('id', stage.id)
    if (paths.length > 0) void supabase.storage.from('stage-attachments').remove(paths)
    setStages((prev) => prev.filter((sg) => sg.id !== stage.id))
    const tb = { ...tasksByStage }; delete tb[stage.stage_number]; setTasksByStage(tb)
    const ab = { ...attsByStage };  delete ab[stage.stage_number];  setAttsByStage(ab)
    const lb = { ...linksByStage }; delete lb[stage.stage_number]; setLinksByStage(lb)
    setConfirmDeleteId(null)
    if (expandedStageId === stage.id) setExpandedStageId(null)
    showToast('Stage deleted.', 'success')
  }

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
      await supabase.from('project_stages').update({ sort_order: sg.sort_order }).eq('id', sg.id)
    }
  }

  // ── Overview: title + date + project-level link ──────────────────────

  async function saveDates() {
    await supabase
      .from('projects')
      .update({
        start_date: startDate || null,
        end_date: endDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)
  }

  async function saveProjectLink(lk: ProjectStageProposalLink | null) {
    const payload = {
      linked_proposal_id: lk?.proposal_id ?? null,
      linked_proposal_phase_id: lk?.proposal_phase_id ?? null,
      linked_proposal_line_item_id: lk?.proposal_line_item_id ?? null,
      updated_at: new Date().toISOString(),
    }
    setLinkedProposalId(lk?.proposal_id ?? null)
    setLinkedProposalPhaseId(lk?.proposal_phase_id ?? null)
    setLinkedProposalLineItemId(lk?.proposal_line_item_id ?? null)
    await supabase.from('projects').update(payload).eq('id', project.id)
  }

  async function requestDeleteWithImpact(stage: ProjectStage) {
    setLoadingImpact(true)
    setDeleteImpactStage(stage)
    const [taskRes, attRes, linkRes] = await Promise.all([
      supabase
        .from('project_stage_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .eq('stage_number', stage.stage_number),
      supabase
        .from('project_stage_attachments')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .eq('stage_number', stage.stage_number),
      supabase
        .from('project_stage_proposal_links')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', project.id)
        .eq('stage_number', stage.stage_number),
    ])
    setDeleteImpactCounts({
      tasks: taskRes.count ?? 0,
      atts:  attRes.count  ?? 0,
      links: linkRes.count ?? 0,
    })
    setLoadingImpact(false)
  }

  async function commitTitle() {
    const trimmed = titleDraft.trim()
    setEditingTitle(false)
    if (!trimmed || trimmed === projectTitle) { setTitleDraft(projectTitle); return }
    setProjectTitle(trimmed)
    await supabase
      .from('projects')
      .update({ title: trimmed, updated_at: new Date().toISOString() })
      .eq('id', project.id)
  }

  // ── Settings: save ────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    const phase = PHASE_OPTIONS.find((p) => p.n === phaseNumber)
    const { error: err } = await supabase
      .from('projects')
      .update({
        status: statusDraft,
        current_phase: phase?.name ?? null,
        phase_number: phaseNumber,
        timeline: timelineDraft.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)
    setSaving(false)
    if (err) { showToast('Could not save. Try again.', 'error'); return }
    showToast('Project saved.', 'success')
    onSaved(project.id)
  }

  // 5h: timeline extension
  async function sendExtension() {
    if (!extTimeline.trim()) { setExtError('Enter the new timeline.'); return }
    setSendingExt(true)
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
      setSendingExt(false)
      setShowExt(false)
      setExtTimeline('')
      setExtReason('')
      showToast('Extension sent to client.', 'success')
    } catch {
      setSendingExt(false)
      setExtError('Could not send the extension. Try again.')
    }
  }

  // ── Status options: include current value if non-canonical ────────────
  const statusOptions = STATUS_OPTIONS.some((o) => o.value === statusDraft)
    ? STATUS_OPTIONS
    : [{ value: statusDraft, label: statusDraft }, ...STATUS_OPTIONS]

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <>
      <div style={s.backdrop} onClick={onClose} />
      <aside
        style={{
          ...s.panel,
          ...(isMobile ? s.panelMobile : null),
          transform: shown ? 'translateX(0)' : isMobile ? 'translateX(100vw)' : 'translateX(100%)',
        }}
        role="dialog"
        aria-label={`Project ${projectTitle}`}
      >
        {/* Close — always visible, 44x44 tap target on mobile */}
        <button
          type="button"
          style={{ ...s.close, ...(isMobile ? s.closeMobile : null) }}
          onClick={onClose}
          aria-label="Close panel"
        >
          <X size={18} />
        </button>

        {/* Panel header */}
        <div style={{ ...s.panelHeader, ...(isMobile ? s.panelHeaderMobile : null) }}>
          <span style={s.panelEyebrow}>Project</span>
          <h2 style={s.panelTitle}>{projectTitle}</h2>
          <p style={s.panelClient}>{clientLabel(project)}</p>
        </div>

        {/* Tab bar — H7: keeps orientation in multi-section panel. Horizontal
            scroll strip on mobile so all 4 tabs stay reachable without wrap. */}
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

        {/* Tab content */}
        <div style={{ ...s.panelBody, ...(isMobile ? s.panelBodyMobile : null) }}>
          {loadError && <div style={s.errorBox}>{loadError}</div>}

          {/* ── Overview ─────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div style={s.tabContent}>
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
                      if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(projectTitle) }
                    }}
                    style={s.input}
                  />
                ) : (
                  <span
                    style={{ ...s.fieldValue, cursor: 'text', borderBottom: `1px dashed ${t.border.medium}` }}
                    onClick={() => { setTitleDraft(projectTitle); setEditingTitle(true) }}
                    title="Click to rename"
                  >
                    {projectTitle}
                  </span>
                )}
              </div>
              <div style={s.field}>
                <span style={s.fieldLabel}>Client</span>
                <span style={s.fieldValue}>{clientName ?? clientLabel(project)}</span>
              </div>
              <div style={s.field}>
                <span style={s.fieldLabel}>Status</span>
                <div style={{ display: 'flex' }}><StatusBadge status={project.status} /></div>
              </div>
              {createdAt && (
                <div style={s.field}>
                  <span style={s.fieldLabel}>Created</span>
                  <span style={s.fieldValue}>{formatPortalDate(createdAt)}</span>
                </div>
              )}

              {/* Project dates */}
              <div style={s.field}>
                <span style={s.fieldLabel}>Project dates</span>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontFamily: fonts.body, fontSize: 11, color: t.text.muted }}>Start</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      onBlur={() => void saveDates()}
                      style={s.input}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontFamily: fonts.body, fontSize: 11, color: t.text.muted }}>End</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      onBlur={() => void saveDates()}
                      style={s.input}
                    />
                  </div>
                </div>
              </div>

              {/* Project-level proposal scope */}
              <div style={s.field}>
                <span style={s.fieldLabel}>Proposal scope</span>
                <ProposalLinkPicker
                  projectId={project.id}
                  stageNumber={-1}
                  link={
                    linkedProposalId
                      ? {
                          id: '',
                          project_id: project.id,
                          stage_number: -1,
                          proposal_id: linkedProposalId,
                          proposal_phase_id: linkedProposalPhaseId,
                          proposal_line_item_id: linkedProposalLineItemId,
                        }
                      : null
                  }
                  canEdit
                  proposals={proposals}
                  skipPersist
                  onLinkChange={(lk) => void saveProjectLink(lk)}
                />
              </div>

              {/* Project-level files */}
              <div style={s.field}>
                <span style={s.fieldLabel}>Project files</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
                  {ATTACHMENT_CATEGORIES.map((cat) => (
                    <AttachmentSection
                      key={cat}
                      projectId={project.id}
                      stageNumber={0}
                      category={cat}
                      attachments={projectAtts.filter((a) => a.category === cat)}
                      canUpload
                      projectLevel
                      onAttachmentsChange={(atts) =>
                        setProjectAtts((prev) => [
                          ...prev.filter((a) => a.category !== cat),
                          ...atts,
                        ])
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Stages ───────────────────────────────────────────── */}
          {activeTab === 'stages' && (
            <div style={s.tabContent}>
              {stages.length === 0 ? (
                <p style={s.emptyText}>No stages yet. Add the first one below.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {stages.map((stage, idx) => (
                    <StageCard
                      key={stage.id}
                      stage={stage}
                      projectId={project.id}
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
                      onTasksChange={(sn, tks) =>
                        setTasksByStage((prev) => ({ ...prev, [sn]: tks }))
                      }
                      onAttachmentsChange={(sn, atts) =>
                        setAttsByStage((prev) => ({ ...prev, [sn]: atts }))
                      }
                      onLinkChange={(sn, lk) =>
                        setLinksByStage((prev) => ({ ...prev, [sn]: lk }))
                      }
                      onRequestDelete={(id) => {
                        const stage = stages.find((sg) => sg.id === id)
                        if (stage) void requestDeleteWithImpact(stage)
                      }}
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
          )}

          {/* ── Notes ────────────────────────────────────────────── */}
          {activeTab === 'notes' && (
            <div style={s.tabContent}>
              <ClientNotes
                projectId={project.id}
                currentUserRole="admin"
                currentUserId=""
              />
            </div>
          )}

          {/* ── Outputs ──────────────────────────────────────────── */}
          {activeTab === 'outputs' && (
            <div style={s.tabContent}>
              <OutputsBrowser projectId={project.id} canEdit onOpenPreview={openPreview} />
              {previewState && (
                <Lightbox
                  images={previewState.items}
                  index={previewState.index}
                  theme={OUTPUTS_LIGHTBOX_THEME}
                  onClose={() => setPreviewState(null)}
                  onNavigate={(i) => setPreviewState((cur) => (cur ? { ...cur, index: i } : cur))}
                />
              )}
            </div>
          )}

          {/* ── Settings ─────────────────────────────────────────── */}
          {activeTab === 'settings' && (
            <div style={s.tabContent}>
              <div style={s.field}>
                <span style={s.fieldLabel}>Project status</span>
                <select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value)}
                  style={s.input}
                >
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div style={s.field}>
                <span style={s.fieldLabel}>Current stage (progress ring pointer)</span>
                <select
                  value={phaseNumber}
                  onChange={(e) => setPhaseNumber(Number(e.target.value))}
                  style={s.input}
                >
                  {PHASE_OPTIONS.map((p) => (
                    <option key={p.n} value={p.n}>{p.n} — {p.name}</option>
                  ))}
                </select>
              </div>

              <div style={s.field}>
                <span style={s.fieldLabel}>Timeline</span>
                <input
                  value={timelineDraft}
                  onChange={(e) => setTimelineDraft(e.target.value)}
                  style={s.input}
                  placeholder="e.g. 6-week engagement"
                />
              </div>

              <div style={s.settingsActions}>
                <button type="button" style={s.secondaryBtn} onClick={onClose} disabled={saving}>
                  Cancel
                </button>
                <button type="button" style={ui.primaryBtn} onClick={() => void handleSave()} disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>

              {/* 5h: timeline extension — active projects only */}
              {(statusDraft === 'active' || project.status === 'active') && (
                <div style={s.extSection}>
                  <span style={s.fieldLabel}>Timeline extension</span>
                  <button type="button" style={s.extBtn} onClick={() => setShowExt(true)}>
                    Send extension request to client
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Stage delete impact modal — full-screen on mobile with stacked actions */}
      {deleteImpactStage && (
        <div
          style={{ ...s.modalOverlay, ...(isMobile ? s.modalOverlayMobile : null) }}
          onClick={() => !loadingImpact && setDeleteImpactStage(null)}
        >
          <div
            style={{ ...s.modalPanel, ...(isMobile ? s.modalPanelMobile : null) }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={s.modalHead}>
              <h3 style={s.modalTitle}>Delete &ldquo;{deleteImpactStage.name}&rdquo;?</h3>
              <button
                type="button"
                style={{ ...s.close, ...(isMobile ? s.closeMobile : null) }}
                onClick={() => setDeleteImpactStage(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            {loadingImpact ? (
              <p style={{ fontFamily: fonts.body, fontSize: 13, color: t.text.secondary }}>Checking impact...</p>
            ) : deleteImpactCounts && (
              <>
                <p style={{ fontFamily: fonts.body, fontSize: 13, color: t.text.primary, margin: '0 0 12px' }}>
                  This will permanently delete:
                </p>
                <ul style={{ fontFamily: fonts.body, fontSize: 13, color: t.text.secondary, margin: '0 0 20px', paddingLeft: 20, lineHeight: 1.8 }}>
                  {deleteImpactCounts.tasks > 0 && (
                    <li>{deleteImpactCounts.tasks} task{deleteImpactCounts.tasks !== 1 ? 's' : ''}</li>
                  )}
                  {deleteImpactCounts.atts > 0 && (
                    <li>{deleteImpactCounts.atts} file{deleteImpactCounts.atts !== 1 ? 's' : ''}</li>
                  )}
                  {deleteImpactCounts.links > 0 && (
                    <li>{deleteImpactCounts.links} proposal link{deleteImpactCounts.links !== 1 ? 's' : ''}</li>
                  )}
                  {deleteImpactCounts.tasks === 0 && deleteImpactCounts.atts === 0 && deleteImpactCounts.links === 0 && (
                    <li>No linked data</li>
                  )}
                </ul>
                <div
                  style={
                    isMobile
                      ? { display: 'flex', flexDirection: 'column', gap: 10 }
                      : { display: 'flex', justifyContent: 'flex-end', gap: 12 }
                  }
                >
                  <button
                    type="button"
                    style={{ ...s.secondaryBtn, ...(isMobile ? s.fullWidthBtn : null) }}
                    onClick={() => setDeleteImpactStage(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    style={{ ...s.deleteImpactBtn, ...(isMobile ? s.fullWidthBtn : null) }}
                    onClick={() => {
                      void deleteStage(deleteImpactStage)
                      setDeleteImpactStage(null)
                      setDeleteImpactCounts(null)
                    }}
                  >
                    Delete stage
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 5h: extension modal — z-index above the panel (>201) */}
      {showExt && (
        <div
          style={{ ...s.modalOverlay, ...(isMobile ? s.modalOverlayMobile : null) }}
          onClick={() => !sendingExt && setShowExt(false)}
        >
          <div
            style={{ ...s.modalPanel, ...(isMobile ? s.modalPanelMobile : null) }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={s.modalHead}>
              <h3 style={s.modalTitle}>Send timeline extension</h3>
              <button
                type="button"
                style={{ ...s.close, ...(isMobile ? s.closeMobile : null) }}
                onClick={() => setShowExt(false)}
                disabled={sendingExt}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            {extError && <div style={s.errorBox}>{extError}</div>}
            <div style={s.field}>
              <span style={s.fieldLabel}>New timeline</span>
              <input
                autoFocus
                value={extTimeline}
                onChange={(e) => setExtTimeline(e.target.value)}
                style={s.input}
                placeholder="e.g. 2 extra weeks, delivery by 15 Aug"
              />
            </div>
            <div style={{ ...s.field, marginTop: 12 }}>
              <span style={s.fieldLabel}>Reason</span>
              <textarea
                value={extReason}
                onChange={(e) => setExtReason(e.target.value)}
                style={{ ...s.input, minHeight: 72, resize: 'vertical' as const }}
                placeholder="Why the timeline needs to change"
              />
            </div>
            <div
              style={
                isMobile
                  ? { display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }
                  : { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }
              }
            >
              <button
                type="button"
                style={{ ...s.secondaryBtn, ...(isMobile ? s.fullWidthBtn : null) }}
                onClick={() => setShowExt(false)}
                disabled={sendingExt}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{ ...ui.primaryBtn, ...(isMobile ? s.fullWidthBtn : null) }}
                onClick={() => void sendExtension()}
                disabled={sendingExt}
              >
                {sendingExt ? 'Sending...' : 'Send'}
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
  error: {
    background: tokens.rubyLight, color: tokens.ruby, border: `1px solid ${tokens.ruby}`,
    borderRadius: 8, padding: '10px 14px', marginBottom: 16,
    fontFamily: fonts.body, fontSize: 13,
  },
  errorBox: {
    background: tokens.rubyLight, color: tokens.ruby, border: `1px solid ${tokens.ruby}`,
    borderRadius: 8, padding: '10px 12px', marginBottom: 12,
    fontFamily: fonts.body, fontSize: 13,
  },

  // Sticky "+ Add project" footer (mobile only)
  stickyFooter: {
    position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 40,
    padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))',
    background: tokens.surface, borderTop: `1px solid ${tokens.border}`,
  },
  stickyFooterBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    width: '100%', height: 48, background: tokens.primary, color: t.text.onPrimary,
    border: 'none', borderRadius: 10, fontFamily: fonts.body, fontSize: 15,
    fontWeight: 600, cursor: 'pointer',
  },

  // Table
  table: { width: '100%', borderCollapse: 'collapse', fontFamily: fonts.body },
  th: {
    textAlign: 'left', padding: '12px 20px', fontSize: 12, fontWeight: 600,
    color: t.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.4,
    borderBottom: `1px solid ${tokens.border}`, background: tokens.bg,
  },
  row: { cursor: 'pointer' },
  rowActive:    { background: tokens.tealLight },
  td: { padding: '14px 20px', fontSize: 14, color: t.text.secondary, borderBottom: `1px solid ${tokens.border}` },

  // Mobile card list (replaces the table below 768px)
  cardStack: { display: 'flex', flexDirection: 'column', gap: 8 },
  // Resting background lives in the .ec-tap-card CSS class (see render), not
  // here, so the :active tap-feedback rule isn't blocked by inline-style
  // specificity. highlightBackgroundStyle still overrides it inline for the
  // "just added" fade (0.6s), independent of the fast tap transition.
  mobileCard: {
    border: `1px solid ${tokens.border}`, borderRadius: 12,
    padding: 16, display: 'flex', flexDirection: 'column', gap: 6, cursor: 'pointer',
  },
  mobileCardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  mobileCardTitle: { fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: t.text.primary },
  mobileCardClient: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary },
  mobileCardStage: { fontFamily: mono, fontSize: 12, color: t.text.muted },

  // Panel shell
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(10, 26, 27, 0.4)', zIndex: 200 },
  panel: {
    position: 'fixed', top: 0, right: 0, height: '100vh', width: 560, maxWidth: '96vw',
    background: tokens.surface, borderLeft: `1px solid ${tokens.border}`,
    boxShadow: '0 12px 48px rgba(2, 76, 79, 0.18)', zIndex: 201,
    display: 'flex', flexDirection: 'column',
    transition: `transform ${motionTokens.durationBase} ${motionTokens.easeEnter}`,
  },
  // Mobile: full-screen overlay, same pattern as SidePanel (deliberately covers
  // the TopBar). Never position:fixed inside — only the panel root itself.
  panelMobile: {
    top: 0, left: 0, right: 0, width: '100vw', height: '100dvh', maxWidth: '100vw',
    borderRadius: 0, border: 'none',
  },
  close: {
    position: 'absolute', top: 14, right: 14, background: tokens.bg,
    border: `1px solid ${tokens.border}`, borderRadius: 8, color: t.text.muted,
    cursor: 'pointer', padding: 6, display: 'flex', zIndex: 1,
  },
  closeMobile: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  // Panel header (always visible)
  panelHeader: {
    padding: '28px 28px 16px',
    borderBottom: `1px solid ${t.border.subtle}`,
    flexShrink: 0,
  },
  panelHeaderMobile: { padding: '20px 48px 16px 16px' },
  panelEyebrow: {
    fontFamily: fonts.body, fontSize: 11, fontWeight: 700,
    letterSpacing: 0.5, textTransform: 'uppercase', color: t.text.tertiary,
    display: 'block', marginBottom: 4,
  },
  panelTitle: { fontFamily: fonts.heading, fontSize: 20, fontWeight: 700, color: t.text.primary, margin: '0 0 4px' },
  panelClient: { fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary, margin: 0 },

  // Tab bar
  tabBar: {
    display: 'flex', gap: 2, borderBottom: `2px solid ${t.border.subtle}`,
    padding: '0 20px', flexShrink: 0,
  },
  // Horizontal scrollable strip on mobile so all 4 tabs stay reachable.
  tabBarMobile: {
    padding: '0 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
    flexWrap: 'nowrap',
  },
  tabBtn: {
    fontFamily: fonts.body, fontSize: 13, fontWeight: 500, color: t.text.secondary,
    background: 'none', border: 'none', padding: '10px 12px', cursor: 'pointer',
    borderBottom: '2px solid transparent', marginBottom: -2,
    borderRadius: '4px 4px 0 0',
    transition: `color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  tabBtnMobile: { minWidth: 80, padding: '12px 16px', flexShrink: 0, whiteSpace: 'nowrap' },
  tabBtnActive: { color: tokens.primary, fontWeight: 600, borderBottomColor: tokens.primary },

  // Tab scrollable body
  panelBody: { flex: 1, overflowY: 'auto', padding: '24px 28px' },
  panelBodyMobile: { padding: '20px 16px', paddingBottom: 80 },
  tabContent: { display: 'flex', flexDirection: 'column', gap: 16 },

  // Fields
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontFamily: fonts.body, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: t.text.tertiary },
  fieldValue: { fontFamily: fonts.body, fontSize: 14, color: t.text.primary, paddingBottom: 2 },
  input: {
    fontFamily: fonts.body, fontSize: 14, color: t.text.primary,
    background: tokens.inputBg, border: `1px solid ${tokens.border}`,
    borderRadius: 8, padding: '9px 11px', width: '100%', boxSizing: 'border-box' as const, outline: 'none',
  },
  emptyText: { fontFamily: fonts.body, fontSize: 14, color: t.text.tertiary, margin: 0 },

  // Settings actions
  settingsActions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  secondaryBtn: {
    background: tokens.surface, color: t.text.primary, border: `1px solid ${tokens.border}`,
    borderRadius: 8, padding: '10px 16px', fontFamily: fonts.body, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  extSection: {
    display: 'flex', flexDirection: 'column', gap: 8,
    marginTop: 24, paddingTop: 24, borderTop: `1px solid ${t.border.subtle}`,
  },
  extBtn: {
    fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: tokens.primary,
    background: tokens.surface, border: `1px solid ${tokens.accent}`,
    borderRadius: 8, padding: '9px 14px', cursor: 'pointer', alignSelf: 'flex-start' as const,
  },

  // Stage list
  stageCard: {
    border: `1px solid ${t.border.subtle}`, borderRadius: 10,
    background: tokens.surface, overflow: 'hidden',
  },
  stageHead: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px',
    background: t.background.subtle, borderBottom: `1px solid ${t.border.subtle}`,
  },
  stageGrip: { cursor: 'grab', color: t.text.muted, display: 'flex', flexShrink: 0 },
  stageToggle: {
    background: 'none', border: 'none', color: t.text.muted,
    cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0,
  },
  stageBody: { padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 16 },
  stageSection: { display: 'flex', flexDirection: 'column', gap: 6 },
  stageSectionLabel: {
    fontFamily: fonts.body, fontSize: 10, fontWeight: 700,
    letterSpacing: 0.6, textTransform: 'uppercase', color: t.text.muted,
  },
  statusSelect: {
    fontFamily: fonts.body, fontSize: 12, color: t.text.secondary,
    background: tokens.surface, border: `1px solid ${t.border.default}`,
    borderRadius: 6, padding: '4px 8px', cursor: 'pointer', flexShrink: 0, outline: 'none',
  },
  stageDeleteBtn: {
    background: 'none', border: 'none', padding: 4, cursor: 'pointer',
    color: t.text.muted, display: 'flex', flexShrink: 0,
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
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontFamily: fonts.body, fontSize: 13, fontWeight: 500, color: tokens.accent,
    background: t.background.tint1, border: `1px solid ${t.border.brand}`,
    borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
  },

  deleteImpactBtn: {
    fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: tokens.surface,
    background: tokens.ruby, border: 'none',
    borderRadius: 8, padding: '10px 16px', cursor: 'pointer',
  },
  fullWidthBtn: { width: '100%', textAlign: 'center' as const, justifyContent: 'center' },

  // Extension modal + stage-delete impact modal (shared overlay/panel)
  modalOverlay: {
    position: 'fixed', inset: 0, background: 'rgba(10, 26, 27, 0.45)',
    zIndex: 320, display: 'flex', alignItems: 'flex-start',
    justifyContent: 'center', padding: '80px 20px', overflowY: 'auto',
  },
  // Mobile: full-screen, same pattern as the shared admin Modal + SidePanel.
  modalOverlayMobile: { padding: 0, alignItems: 'stretch' },
  modalPanel: {
    background: tokens.surface, borderRadius: 12, border: `1px solid ${tokens.border}`,
    padding: 24, width: '100%', maxWidth: 440,
  },
  modalPanelMobile: {
    minHeight: '100dvh', width: '100vw', maxWidth: '100vw', borderRadius: 0,
    border: 'none', boxSizing: 'border-box' as const, padding: '20px 16px 80px',
  },
  modalHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontFamily: fonts.heading, fontSize: 18, fontWeight: 600, color: t.text.primary, margin: 0 },
}
