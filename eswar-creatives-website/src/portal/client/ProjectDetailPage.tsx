// Client per-project drill-in at /portal/projects/:id. Read-only view of a
// single project: Overview (header, progress ring, timeline-extension
// approve/deny), Stages (stepper + read-only detail drawer), Notes
// (ClientNotes), Outputs (read-only folder/file browser). Reuses the same
// stage sub-components as /portal/dashboard. RLS is trusted for the "not
// your project" case — a project id that returns no row (wrong client or
// nonexistent) collapses into the same "Project not found" state.
import { useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { type PortalProfile } from '../PortalGuard'
import { CLIENT_NAV_HEIGHT } from './ClientNav'
import { tokens, t, fonts } from '../theme'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { SidePanel } from '../admin/SidePanel'
import { StageLabel } from '../components/StageLabel'
import type { ProjectStageTask } from '../components/TaskList'
import type { ProjectStageAttachment } from '../components/AttachmentSection'
import type { ProjectStageProposalLink } from '../components/ProposalLinkPicker'
import { ClientNotes } from '../components/ClientNotes'
import { ProgressRing } from '../components/ProgressRing'
import { StageColumn } from '../components/StageColumn'
import type { ProjectStage } from '../components/StageColumn'
import { StageCarousel } from '../components/StageCarousel'
import { StageContent } from '../components/StageContent'
import { TabBar, TabFadeIn } from '../components/TabBar'
import { OutputsBrowser } from '../components/OutputsBrowser'
import type { OutputFile } from '../components/OutputsBrowser'
import { Lightbox } from '../../components/lightbox/Lightbox'
import type { GalleryImage } from '../../components/lightbox/types'
import { toPreviewItem } from '../utils/toPreviewItem'

// Lightbox chrome is intentionally a dark photo-viewer theme, independent of
// the portal's teal/cream palette -- same rationale as CaseDetailOverlay's
// LIGHTBOX_THEME (src/components/branding/CaseDetailOverlay.tsx) and the
// admin ProjectPanel's matching constant.
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

const PHASES = ['Discovery', 'Design', 'Review', 'Delivery'] as const

type ProjectRow = {
  id: string
  title: string
  current_phase: string | null
  phase_number: number | null
  status: string
}

type TimelineExtension = {
  id: string
  new_timeline: string
  reason: string | null
}

type Tab = 'overview' | 'stages' | 'notes' | 'outputs'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'stages',   label: 'Stages'   },
  { id: 'notes',    label: 'Notes'    },
  { id: 'outputs',  label: 'Outputs'  },
]

export function ProjectDetailPage() {
  const profile = useOutletContext<PortalProfile>()
  const { id } = useParams<{ id: string }>()
  return <ProjectDetail profile={profile} projectId={id ?? ''} />
}

function ProjectDetail({ profile, projectId }: { profile: PortalProfile; projectId: string }) {
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [previewState, setPreviewState] = useState<{ items: GalleryImage[]; index: number } | null>(null)

  async function openPreview(files: OutputFile[], clickedIndex: number, folderId: string | null) {
    const groupKey = folderId ?? 'root'
    const signed = await Promise.all(
      files.map((f) => supabase.storage.from('project-outputs').createSignedUrl(f.storage_path, 3600))
    )
    const items = files.map((f, i) => toPreviewItem(f, signed[i].data?.signedUrl ?? '', groupKey))
    setPreviewState({ items, index: clickedIndex })
  }
  const [project, setProject] = useState<ProjectRow | null>(null)
  const [stages, setStages]   = useState<ProjectStage[]>([])
  const [tasksByStage, setTasksByStage]     = useState<Record<number, ProjectStageTask[]>>({})
  const [attsByStage, setAttsByStage]       = useState<Record<number, ProjectStageAttachment[]>>({})
  const [linksByStage, setLinksByStage]     = useState<Record<number, ProjectStageProposalLink | null>>({})
  const [drawerStage, setDrawerStage] = useState<ProjectStage | null>(null)
  const [extensions, setExtensions] = useState<TimelineExtension[]>([])
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isMobile } = useBreakpoint()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      setNotFound(false)
      try {
        const { data: proj, error: pErr } = await supabase
          .from('projects')
          .select('id, title, current_phase, phase_number, status')
          .eq('id', projectId)
          .maybeSingle()
        if (pErr) throw pErr
        if (!proj) {
          if (!cancelled) setNotFound(true)
          return
        }
        if (!cancelled) setProject(proj as ProjectRow)

        const [stagesRes, tasksRes, attsRes, linksRes, extRes] = await Promise.all([
          supabase
            .from('project_stages')
            .select('*')
            .eq('project_id', proj.id)
            .order('sort_order', { ascending: true }),
          supabase
            .from('project_stage_tasks')
            .select('id, title, description, status, sort_order, stage_number, parent_task_id')
            .eq('project_id', proj.id)
            .order('sort_order', { ascending: true }),
          supabase
            .from('project_stage_attachments')
            .select('*')
            .eq('project_id', proj.id),
          supabase
            .from('project_stage_proposal_links')
            .select('*')
            .eq('project_id', proj.id),
          supabase
            .from('timeline_extensions')
            .select('id, new_timeline, reason')
            .eq('project_id', proj.id)
            .eq('status', 'pending')
            .order('sent_at', { ascending: false }),
        ])

        if (cancelled) return

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

        setExtensions((extRes.data ?? []) as TimelineExtension[])
      } catch {
        // H9: plain-language error, never a raw Supabase string.
        if (!cancelled)
          setError('We could not load this project. Please refresh or contact eswar@eswarcreatives.in')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [projectId])

  async function respondExtension(extId: string, approve: boolean) {
    setRespondingId(extId)
    const { error: rpcErr } = await supabase.rpc('respond_to_timeline_extension', {
      p_extension_id: extId,
      p_approve: approve,
    })
    setRespondingId(null)
    if (rpcErr) {
      setError('We could not record your response. Please try again.')
      return
    }
    setExtensions((prev) => prev.filter((e) => e.id !== extId))
  }

  const currentIndex = (() => {
    if (!project) return 0
    if (project.phase_number && project.phase_number >= 1)
      return Math.min(project.phase_number - 1, PHASES.length - 1)
    const i = PHASES.findIndex(
      (p) => p.toLowerCase() === (project.current_phase ?? '').toLowerCase()
    )
    return i >= 0 ? i : 0
  })()

  const allTasks = Object.values(tasksByStage).flat()
  const progressPct = (() => {
    if (allTasks.length > 0) {
      const done = allTasks.filter((tk) => tk.status === 'done').length
      return Math.round((done / allTasks.length) * 100)
    }
    if (stages.length === 0) return 0
    return Math.round(
      (stages.reduce((acc, sg) => acc + (sg.status === 'done' ? 1 : sg.status === 'in_progress' ? 0.5 : 0), 0) /
        stages.length) * 100
    )
  })()

  const activeStage = stages.find((sg) => sg.status === 'in_progress') ?? stages[0] ?? null

  return (
    <div style={styles.page}>
      <main style={{ ...styles.container, padding: `${CLIENT_NAV_HEIGHT + 40}px ${isMobile ? 16 : 24}px 80px` }}>
        <Link to="/portal/projects" style={styles.backLink}>&larr; Back to Projects</Link>

        {loading && <p style={styles.muted}>Loading...</p>}
        {error && <div style={styles.error}>{error}</div>}
        {!loading && notFound && (
          <div style={styles.empty}>
            <p style={styles.emptyText}>Project not found.</p>
          </div>
        )}

        {!loading && !notFound && project && (
          <>
            <h1 style={styles.title}>{project.title}</h1>

            <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

            <TabFadeIn key={activeTab}>
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {extensions.map((ext) => (
                    <section key={ext.id} style={styles.extCard}>
                      <h2 style={styles.extHeading}>Timeline update proposed</h2>
                      <div style={styles.extField}>
                        <span style={styles.extLabel}>New timeline</span>
                        <span style={styles.extValue}>{ext.new_timeline}</span>
                      </div>
                      {ext.reason && (
                        <div style={styles.extField}>
                          <span style={styles.extLabel}>Reason</span>
                          <span style={styles.extValue}>{ext.reason}</span>
                        </div>
                      )}
                      <div style={styles.extActions}>
                        <button
                          type="button"
                          style={styles.denyBtn}
                          onClick={() => void respondExtension(ext.id, false)}
                          disabled={respondingId === ext.id}
                        >
                          Deny
                        </button>
                        <button
                          type="button"
                          style={styles.approveBtn}
                          onClick={() => void respondExtension(ext.id, true)}
                          disabled={respondingId === ext.id}
                        >
                          {respondingId === ext.id ? 'Saving...' : 'Approve'}
                        </button>
                      </div>
                    </section>
                  ))}

                  <section style={styles.card}>
                    <div style={styles.cardHeader}>
                      <div style={styles.cardHeaderText}>
                        <div style={styles.projectMeta}>
                          <span style={styles.metaStrong}>
                            Stage {activeStage?.stage_number ?? (currentIndex + 1)}
                          </span>
                          <span style={styles.metaDot} aria-hidden="true">&bull;</span>
                          <span style={styles.metaLabel}>
                            {activeStage?.name ?? (project.current_phase ?? PHASES[currentIndex])}
                          </span>
                        </div>
                      </div>
                      <ProgressRing
                        percent={progressPct}
                        caption={`Phase ${currentIndex + 1} of ${PHASES.length}`}
                      />
                    </div>

                    {project.status === 'on_hold' && (
                      <div style={styles.statusBannerNeutral}>
                        This project is currently on hold. We will be in touch soon.
                      </div>
                    )}
                    {(project.status === 'delivered' || project.status === 'completed') && (
                      <div style={styles.statusBannerGreen}>
                        This project is complete. Thank you for working with us.
                      </div>
                    )}
                  </section>
                </div>
              )}

              {activeTab === 'stages' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {stages.length === 0 && (
                    <div style={styles.empty}>
                      <p style={styles.emptyText}>No stages added yet.</p>
                    </div>
                  )}
                  {!isMobile && stages.length > 0 && (
                    <div
                      style={{
                        ...styles.stageGrid,
                        gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))`,
                      }}
                      aria-label="Project stages"
                    >
                      {stages.map((stage, i) => (
                        <StageColumn
                          key={stage.id}
                          stage={stage}
                          index={i}
                          isFirst={i === 0}
                          isLast={i === stages.length - 1}
                          onClick={() => setDrawerStage(stage)}
                        />
                      ))}
                    </div>
                  )}
                  {isMobile && stages.length > 0 && (
                    <StageCarousel
                      stages={stages}
                      onStageClick={(stage) => setDrawerStage(stage)}
                    />
                  )}
                </div>
              )}

              {activeTab === 'notes' && (
                <ClientNotes
                  projectId={project.id}
                  currentUserRole="client"
                  currentUserId={profile.id}
                />
              )}

              {activeTab === 'outputs' && (
                <>
                  <OutputsBrowser projectId={project.id} canEdit={false} onOpenPreview={openPreview} />
                  {previewState && (
                    <Lightbox
                      images={previewState.items}
                      index={previewState.index}
                      theme={OUTPUTS_LIGHTBOX_THEME}
                      onClose={() => setPreviewState(null)}
                      onNavigate={(i) => setPreviewState((cur) => (cur ? { ...cur, index: i } : cur))}
                    />
                  )}
                </>
              )}
            </TabFadeIn>

            {drawerStage && (
              <SidePanel
                title={drawerStage.name}
                subtitle={`Stage ${drawerStage.stage_number}`}
                onClose={() => setDrawerStage(null)}
                width={480}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <StageLabel
                    stageId={drawerStage.id}
                    stageNumber={drawerStage.stage_number}
                    name={drawerStage.name}
                    status={drawerStage.status}
                    canEditName={false}
                  />
                  <StageContent
                    stage={drawerStage}
                    tasks={tasksByStage[drawerStage.stage_number] ?? []}
                    attachments={attsByStage[drawerStage.stage_number] ?? []}
                    link={linksByStage[drawerStage.stage_number] ?? null}
                  />
                </div>
              </SidePanel>
            )}
          </>
        )}
      </main>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: tokens.bg, color: tokens.text, fontFamily: fonts.body },
  container: { maxWidth: 1080, margin: '0 auto' },
  backLink: {
    display: 'inline-block',
    marginBottom: 16,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    color: t.text.urlLink,
    textDecoration: 'none',
  },
  muted: { fontFamily: fonts.body, fontSize: 14, color: t.text.secondary },
  title: {
    margin: '0 0 20px',
    fontFamily: fonts.heading, fontSize: 28, fontWeight: 600, lineHeight: '42px',
    letterSpacing: '-0.28px', color: tokens.text,
  },
  card: {
    background: tokens.surface, border: `1px solid ${t.border.overlayStrong}`,
    borderRadius: 16, padding: 28,
  },
  cardHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 16, width: '100%',
  },
  cardHeaderText: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  projectMeta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, flexWrap: 'wrap' },
  metaStrong: { fontFamily: fonts.body, fontWeight: 600, color: t.text.secondary },
  metaDot: { color: t.text.muted },
  metaLabel: { fontFamily: fonts.body, fontWeight: 400, color: t.text.secondary },
  stageGrid: { display: 'grid', alignItems: 'stretch' },
  statusBannerNeutral: {
    marginTop: 16, padding: '10px 16px', borderRadius: 8,
    background: t.background.muted, border: `1px solid ${t.border.default}`,
    fontFamily: fonts.body, fontSize: 13, color: t.text.secondary, lineHeight: 1.5,
  },
  statusBannerGreen: {
    marginTop: 16, padding: '10px 16px', borderRadius: 8,
    background: tokens.greenLight, border: `1px solid ${tokens.green}`,
    fontFamily: fonts.body, fontSize: 13, color: tokens.green, fontWeight: 500, lineHeight: 1.5,
  },
  extCard: {
    background: tokens.surface,
    border: `1px solid ${tokens.gold}`,
    borderLeft: `4px solid ${tokens.gold}`,
    borderRadius: 12,
    padding: 24,
  },
  extHeading: { margin: '0 0 16px', fontFamily: fonts.heading, fontSize: 18, fontWeight: 600, color: tokens.text },
  extField: { display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 },
  extLabel: { fontFamily: fonts.body, fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', color: tokens.textMuted },
  extValue: { fontFamily: fonts.body, fontSize: 15, color: tokens.text, lineHeight: 1.4 },
  extActions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  denyBtn: {
    background: tokens.surface, color: tokens.ruby, border: `1px solid ${tokens.ruby}`,
    borderRadius: 8, padding: '10px 18px', fontFamily: fonts.body, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  approveBtn: {
    background: tokens.primary, color: tokens.surface, border: 'none',
    borderRadius: 8, padding: '10px 18px', fontFamily: fonts.body, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  empty: {
    background: tokens.surface, border: `1px dashed ${t.border.overlayStrong}`,
    borderRadius: 12, padding: 40, textAlign: 'center',
  },
  emptyText: { margin: 0, fontSize: 15, color: tokens.textMuted },
  error: {
    background: tokens.rubyLight, color: tokens.ruby, padding: '12px 14px',
    borderRadius: 8, fontSize: 13, border: `1px solid ${tokens.ruby}`, marginBottom: 24,
  },
}
