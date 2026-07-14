// Client dashboard at /portal/projects. Shows a single contextual banner (the
// highest-priority action the client should take), the client's active project
// as a hi-fi project card (header + progress ring + data-driven stage stepper
// from project_stages), the project documents, and quick links to the other
// sections. Layout, spacing and typography follow the EC Design System master
// (Figma node 4149:31). Theme tokens only; no raw hex; no em dashes; plain
// errors only.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useOutletContext } from 'react-router'
import type { CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { type PortalProfile } from './PortalGuard'
import { CLIENT_NAV_HEIGHT } from './client/ClientNav'
import { getBadges, subscribeBadges } from './client/clientNotifications'
import { DocumentChips } from './client/DocumentChips'
import type { ClientDocument } from './client/DocumentChips'
import { formatDate } from './admin/ui'
import { tokens, t, fonts, motionTokens, phaseUI } from './theme'
import { useBreakpoint } from './hooks/useBreakpoint'
import { TaskList } from './components/TaskList'
import type { ProjectStageTask } from './components/TaskList'
import { AttachmentSection } from './components/AttachmentSection'
import type { ProjectStageAttachment, AttachmentCategory } from './components/AttachmentSection'
import { ProposalLinkPicker } from './components/ProposalLinkPicker'
import type { ProjectStageProposalLink } from './components/ProposalLinkPicker'
import { ClientNotes } from './components/ClientNotes'

// Kept only for the "Phase X of Y" progress ring caption. Never used for stage data.
const PHASES = ['Discovery', 'Design', 'Review', 'Delivery'] as const

const ATTACHMENT_CATEGORIES: AttachmentCategory[] = [
  'design_brief',
  'development',
  'output_delivery',
]

// Map stage status to phaseUI status keys for node/pill styling.
const STAGE_STATUS_TO_PHASE: Record<string, 'done' | 'active' | 'pending'> = {
  done: 'done',
  in_progress: 'active',
  pending: 'pending',
}

type ProjectRow = {
  id: string
  title: string
  current_phase: string | null
  phase_number: number | null
  status: string
}

type ProjectStage = {
  id: string
  project_id: string
  stage_number: number
  name: string
  status: 'pending' | 'in_progress' | 'done'
  sort_order: number
}

type TimelineExtension = {
  id: string
  new_timeline: string
  reason: string | null
}

// A completed public poll shown as a project milestone. total_votes is summed
// from the ownership-gated vote-summary RPC (counts only, no voter PII).
type Milestone = {
  id: string
  title: string
  createdAt: string | null
  totalVotes: number
}

// One banner shown at a time, highest priority wins. variant drives the palette.
type BannerVariant = 'ruby' | 'gold' | 'teal'
type Banner = { text: string; to: string; variant: BannerVariant }

export function ClientDashboardPage() {
  const profile = useOutletContext<PortalProfile>()
  return <Dashboard profile={profile} />
}

function Dashboard({ profile }: { profile: PortalProfile }) {
  const [project, setProject] = useState<ProjectRow | null>(null)
  const [stages, setStages]   = useState<ProjectStage[]>([])
  const [tasksByStage, setTasksByStage]     = useState<Record<number, ProjectStageTask[]>>({})
  const [attsByStage, setAttsByStage]       = useState<Record<number, ProjectStageAttachment[]>>({})
  const [linksByStage, setLinksByStage]     = useState<Record<number, ProjectStageProposalLink | null>>({})
  const [expandedStageIds, setExpandedStageIds] = useState<Set<string>>(new Set())
  const [documents, setDocuments]   = useState<ClientDocument[]>([])
  const [banner, setBanner]         = useState<Banner | null>(null)
  const [extensions, setExtensions] = useState<TimelineExtension[]>([])
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [clientId, setClientId]     = useState<string | null>(null)
  const badges = useSyncExternalStore(subscribeBadges, getBadges, getBadges)
  const { isMobile, isTablet } = useBreakpoint()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Resolve this profile's client row, then its most recent active project.
        const { data: client, error: cErr } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle()
        if (cErr) throw cErr

        if (!client) {
          if (!cancelled) { setProject(null); setBanner(null) }
          return
        }
        if (!cancelled) setClientId(client.id)

        const { data: proj, error: pErr } = await supabase
          .from('projects')
          .select('id, title, current_phase, phase_number, status')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (pErr) throw pErr
        if (!cancelled) setProject((proj as ProjectRow | null) ?? null)

        if (proj?.id) {
          // Fetch stages, tasks, attachments, links, and documents in parallel.
          const [stagesRes, tasksRes, attsRes, linksRes, assetRes] = await Promise.all([
            supabase
              .from('project_stages')
              .select('*')
              .eq('project_id', proj.id)
              .order('sort_order', { ascending: true }),
            supabase
              .from('project_stage_tasks')
              .select('id, title, description, status, sort_order, stage_number')
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
              .from('assets')
              .select('id, file_name, file_url')
              .eq('project_id', proj.id)
              .order('uploaded_at', { ascending: false }),
          ])

          if (!cancelled) {
            const stageRows = (stagesRes.data ?? []) as ProjectStage[]
            setStages(stageRows)

            // Auto-expand in_progress stages on load; done/pending start collapsed.
            setExpandedStageIds(
              new Set(stageRows.filter((sg) => sg.status === 'in_progress').map((sg) => sg.id))
            )

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

            setDocuments((assetRes.data ?? []) as ClientDocument[])
          }
        }

        // 6d/6f: completed public polls shown as project milestones.
        const { data: pollRows } = await supabase
          .from('public_campaigns')
          .select('id, campaign_title, created_at')
          .eq('portal_client_id', client.id)
          .order('created_at', { ascending: false })
        const ms = await Promise.all(
          ((pollRows ?? []) as { id: string; campaign_title: string; created_at: string | null }[]).map(
            async (p) => {
              const { data: summary } = await supabase.rpc('get_portal_campaign_vote_summary', {
                p_campaign_id: p.id,
              })
              const totalVotes = ((summary ?? []) as { total: number }[]).reduce(
                (n, r) => n + Number(r.total),
                0
              )
              return { id: p.id, title: p.campaign_title, createdAt: p.created_at, totalVotes }
            }
          )
        )
        if (!cancelled) setMilestones(ms)

        // Pending timeline extensions (5h). RLS scopes to the client's own projects.
        const { data: extRows } = await supabase
          .from('timeline_extensions')
          .select('id, new_timeline, reason')
          .eq('status', 'pending')
          .order('sent_at', { ascending: false })
        if (!cancelled) setExtensions((extRows ?? []) as TimelineExtension[])

        const next = await computeBanner(client.id, profile.id)
        if (!cancelled) setBanner(next)
      } catch {
        // H9: plain-language error, never a raw Supabase string.
        if (!cancelled)
          setError(
            'We could not load your project. Please refresh or contact eswar@eswarcreatives.in'
          )
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [profile.id])

  // 5h: approve or deny a proposed timeline extension via SECURITY DEFINER RPC.
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
    setExtensions((prev) => {
      const remaining = prev.filter((e) => e.id !== extId)
      if (remaining.length === 0) {
        setBanner((b) => (b && b.to === '/portal/projects' ? null : b))
      }
      return remaining
    })
  }

  function toggleStage(stageId: string, status: string) {
    // in_progress is always expanded; pending is always collapsed — only done toggles.
    if (status !== 'done') return
    setExpandedStageIds((prev) => {
      const next = new Set(prev)
      if (next.has(stageId)) next.delete(stageId)
      else next.add(stageId)
      return next
    })
  }

  // Current step index from the integer pointer, falling back to the text phase.
  // Used ONLY for the "Phase X of Y" ring caption — not for stage display logic.
  const currentIndex = (() => {
    if (!project) return 0
    if (project.phase_number && project.phase_number >= 1)
      return Math.min(project.phase_number - 1, PHASES.length - 1)
    const i = PHASES.findIndex(
      (p) => p.toLowerCase() === (project.current_phase ?? '').toLowerCase()
    )
    return i >= 0 ? i : 0
  })()

  // Progress derives from actual stage statuses.
  const progressPct = stages.length === 0 ? 0 : Math.round(
    (stages.reduce((acc, sg) => acc + (sg.status === 'done' ? 1 : sg.status === 'in_progress' ? 0.5 : 0), 0) /
      stages.length) * 100
  )

  return (
    <div style={styles.page}>
      {/* Banner and shimmer keyframes */}
      <style>{`
        @keyframes dashBannerIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dashBadgeIn{from{transform:scale(0)}to{transform:scale(1)}}
        .ec-phase-track{scroll-padding-left:16px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
        .ec-phase-track::-webkit-scrollbar{display:none}
        @keyframes ecShimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        .ec-shimmer{background:linear-gradient(90deg,${t.background.subtle} 25%,${t.background.muted} 50%,${t.background.subtle} 75%);background-size:200% 100%;animation:ecShimmer 1.5s linear infinite;border-radius:6px}
      `}</style>
      <main style={{ ...styles.container, padding: `${CLIENT_NAV_HEIGHT + 40}px ${isMobile ? 16 : 24}px 80px` }}>
        {/* H1: single highest-priority action as a fully clickable banner. */}
        {!loading && !error && banner && <BannerCard banner={banner} />}

        {/* 5h: actionable timeline extension cards */}
        {!loading && !error && extensions.map((ext) => (
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

        <h1 style={styles.title}>Your project</h1>

        {loading && <ProjectSkeleton />}
        {error && <div style={styles.error}>{error}</div>}

        {!loading && !error && !project && (
          <div style={styles.empty}>
            <p style={styles.emptyText}>
              Your project will appear here once it is confirmed.
            </p>
          </div>
        )}

        {!loading && !error && project && (
          <>
            <section style={styles.card}>
              {/* Card header: project name + phase meta on the left, progress ring right. */}
              <div style={styles.cardHeader}>
                <div style={styles.cardHeaderText}>
                  <h2 style={styles.projectTitle}>{project.title}</h2>
                  <div style={styles.projectMeta}>
                    <span style={styles.metaStrong}>
                      Phase {project.phase_number ?? currentIndex + 1}
                    </span>
                    <span style={styles.metaDot} aria-hidden="true">&bull;</span>
                    <span style={styles.metaLabel}>
                      {project.current_phase ?? PHASES[currentIndex]}
                    </span>
                  </div>
                </div>
                {/* "Phase X of Y" caption intentionally preserved from original design. */}
                <ProgressRing
                  percent={progressPct}
                  caption={`Phase ${currentIndex + 1} of ${PHASES.length}`}
                />
              </div>

              {/* Desktop: data-driven stage stepper with expand/collapse. */}
              {!isMobile && stages.length > 0 && (
                <div style={{ marginTop: 24 }}>
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
                        expanded={expandedStageIds.has(stage.id)}
                        onToggle={() => toggleStage(stage.id, stage.status)}
                      />
                    ))}
                  </div>
                  {/* Expanded stage content: full-width panel below the header row */}
                  {stages.map((stage) =>
                    expandedStageIds.has(stage.id) ? (
                      <div key={stage.id} style={styles.stageDetailPanel}>
                        <StageContent
                          stage={stage}
                          tasks={tasksByStage[stage.stage_number] ?? []}
                          attachments={attsByStage[stage.stage_number] ?? []}
                          link={linksByStage[stage.stage_number] ?? null}
                        />
                      </div>
                    ) : null
                  )}
                </div>
              )}

              {/* Documents */}
              {documents.length > 0 && (
                <div style={styles.docsBlock}>
                  <h3 style={styles.docsHeading}>Documents</h3>
                  <DocumentChips documents={documents} />
                </div>
              )}

              {/* 6d/6f: completed public polls as read-only project milestones. */}
              {milestones.length > 0 && (
                <div style={styles.milestonesBlock}>
                  <h3 style={styles.docsHeading}>Milestones</h3>
                  <div style={styles.milestoneList}>
                    {milestones.map((m) => (
                      <div key={m.id} style={styles.milestoneCard}>
                        <span style={styles.milestoneIcon} aria-hidden="true">&#10003;</span>
                        <div style={styles.milestoneMain}>
                          <div style={styles.milestoneLabel}>{m.title}</div>
                          <div style={styles.milestoneDate}>{formatDate(m.createdAt)}</div>
                          <div style={styles.milestoneOutcome}>
                            {m.totalVotes} votes collected. Top concepts shortlisted.
                          </div>
                        </div>
                        <span style={styles.completePill}>Complete</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Mobile: snap-scroll stage carousel */}
            {isMobile && stages.length > 0 && (
              <StageCarousel
                stages={stages}
                tasksByStage={tasksByStage}
                attsByStage={attsByStage}
                linksByStage={linksByStage}
                expandedStageIds={expandedStageIds}
                onToggle={toggleStage}
              />
            )}

            {/* Client notes section — appears below the project card */}
            <section style={styles.notesSection}>
              <h2 style={styles.notesHeading}>Messages</h2>
              <ClientNotes
                projectId={project.id}
                currentUserRole="client"
                currentUserId={profile.id}
              />
            </section>
          </>
        )}

        {/* H6: recognition over recall, quick paths to every section. */}
        <div style={{ ...styles.quickGrid, gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          <QuickCard to="/portal/proposals" title="View Proposal"   sub="Review and respond to your proposal" badge={badges.proposals} />
          <QuickCard to="/portal/invoices"  title="View Invoices"   sub="See amounts due and payment status"   badge={badges.invoices} />
          <QuickCard to="/portal/mockups"   title="View Mockups"    sub="Review concept designs and share feedback" badge={badges.mockups} />
          <QuickCard to="/portal/campaigns" title="View Campaigns"  sub="See your design review campaigns"    badge={false} />
        </div>
      </main>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

// Resolve the highest-priority banner.
async function computeBanner(clientId: string, profileId: string): Promise<Banner | null> {
  // 0. Timeline extension awaiting a response (5h).
  const { data: pendingExt } = await supabase
    .from('timeline_extensions')
    .select('id')
    .eq('status', 'pending')
    .limit(1)
  if (pendingExt && pendingExt.length > 0) {
    return {
      text: 'Your project timeline has been updated. Please review and respond.',
      to: '/portal/projects',
      variant: 'ruby',
    }
  }

  // 1. Proposal awaiting action.
  const { data: sentProposals } = await supabase
    .from('proposals')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'sent')
    .limit(1)
  if (sentProposals && sentProposals.length > 0) {
    return {
      text: 'Your proposal is ready for review. Accept or decline to get started.',
      to: '/portal/proposals',
      variant: 'ruby',
    }
  }

  // 2 & 4. Invoice states (one query, split into overdue vs due-soon).
  const today   = new Date().toISOString().slice(0, 10)
  const horizon = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10)
  const { data: invoices } = await supabase
    .from('invoices')
    .select('status, due_date')
    .eq('client_id', clientId)
    .in('status', ['pending', 'overdue'])
  const invoiceRows = (invoices ?? []) as { status: string; due_date: string | null }[]
  const overdue = invoiceRows.some(
    (r) => r.status === 'overdue' || (r.due_date !== null && r.due_date < today)
  )
  if (overdue) {
    return {
      text: 'You have an overdue invoice. Please review payment details.',
      to: '/portal/invoices',
      variant: 'ruby',
    }
  }

  // 3. Mockup awaiting feedback.
  const { data: sets } = await supabase
    .from('mockup_sets')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'published')
  const setIds = ((sets ?? []) as { id: string }[]).map((s) => s.id)
  if (setIds.length > 0) {
    const { data: feedback } = await supabase
      .from('mockup_feedback')
      .select('set_id')
      .in('set_id', setIds)
      .in('feedback_type', ['concept_approval', 'concept_rejection'])
      .eq('submitted_by', profileId)
    const decided = new Set(((feedback ?? []) as { set_id: string }[]).map((r) => r.set_id))
    if (setIds.some((id) => !decided.has(id))) {
      return {
        text: 'New concept designs are ready for your review.',
        to: '/portal/mockups',
        variant: 'gold',
      }
    }
  }

  // 4. Invoice due within 7 days.
  const dueSoon = invoiceRows.some(
    (r) => r.due_date !== null && r.due_date >= today && r.due_date <= horizon
  )
  if (dueSoon) {
    return {
      text: 'An invoice is due soon.',
      to: '/portal/invoices',
      variant: 'teal',
    }
  }

  return null
}

function BannerCard({ banner }: { banner: Banner }) {
  const palette: Record<BannerVariant, CSSProperties> = {
    ruby: { background: tokens.ruby, color: tokens.surface },
    gold: { background: tokens.gold, color: tokens.text },
    teal: { background: tokens.accent, color: tokens.surface },
  }
  return (
    <Link to={banner.to} style={{ ...styles.banner, ...palette[banner.variant] }}>
      <span style={styles.bannerText}>{banner.text}</span>
      <span aria-hidden="true" style={styles.bannerArrow}>&rarr;</span>
    </Link>
  )
}

function ProgressRing({ percent, caption }: { percent: number; caption: string }) {
  const size = 64
  const stroke = 6
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(100, percent))
  const offset = circumference * (1 - clamped / 100)
  return (
    <div style={styles.ring}>
      <div style={styles.ringSvgWrap}>
        <svg width={size} height={size} role="img" aria-label={`${clamped} percent complete`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={t.border.default} strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={phaseUI.nodeFill} strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: `stroke-dashoffset ${motionTokens.durationSlow} ${motionTokens.easeEnter}` }}
          />
        </svg>
        <span style={styles.ringPct}>{clamped}%</span>
      </div>
      <span style={styles.ringCaption}>{caption}</span>
    </div>
  )
}

// Desktop stage column: compact node + name + pill. Toggleable for done stages.
function StageColumn({
  stage, index, isFirst, isLast, expanded, onToggle
}: {
  stage: ProjectStage
  index: number
  isFirst: boolean
  isLast: boolean
  expanded: boolean
  onToggle: () => void
}) {
  const phaseState = STAGE_STATUS_TO_PHASE[stage.status] ?? 'pending'
  const pill = phaseUI.status[phaseState]
  const filled = stage.status !== 'pending'
  const canToggle = stage.status === 'done'

  return (
    <div style={{
      ...styles.phaseCol,
      paddingLeft: isFirst ? 0 : 16,
      paddingRight: isLast ? 0 : 16,
      borderRight: isLast ? 'none' : `1px solid ${t.border.overlayStrong}`,
      cursor: canToggle ? 'pointer' : 'default',
    }}
    onClick={canToggle ? onToggle : undefined}
    >
      <div style={styles.phaseNodeRow}>
        <span style={{ ...styles.phaseNode, ...(filled ? styles.phaseNodeFilled : styles.phaseNodeIdle) }}>
          {stage.status === 'done' ? '✓' : index + 1}
        </span>
        <span style={{
          ...styles.connector,
          background: stage.status === 'done' ? phaseUI.nodeFill : t.background.overlayNormal,
        }} />
      </div>
      <div style={styles.phaseBody}>
        <div style={styles.phaseNameRow}>
          <span style={{ ...styles.phaseName, color: stage.status === 'pending' ? t.text.muted : t.text.primary }}>
            {stage.name}
          </span>
          <span style={{ ...styles.statusPill, background: pill.bg, borderColor: pill.border }}>
            {pill.label}
          </span>
        </div>
        {canToggle && (
          <span style={styles.toggleHint}>{expanded ? 'Hide details' : 'Show details'}</span>
        )}
        {stage.status === 'in_progress' && (
          <span style={styles.toggleHint}>In progress</span>
        )}
      </div>
    </div>
  )
}

// Full expanded stage content (read-only). Used in both desktop panel + mobile card.
function StageContent({
  stage, tasks, attachments, link
}: {
  stage: ProjectStage
  tasks: ProjectStageTask[]
  attachments: ProjectStageAttachment[]
  link: ProjectStageProposalLink | null
}) {
  const hasContent = tasks.length > 0
    || attachments.length > 0
    || link != null

  if (!hasContent) {
    return (
      <p style={{ fontFamily: fonts.body, fontSize: 13, color: t.text.muted, margin: 0 }}>
        No details added yet.
      </p>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {link && (
        <ProposalLinkPicker
          projectId={stage.project_id}
          stageNumber={stage.stage_number}
          link={link}
          canEdit={false}
          onLinkChange={() => {}}
        />
      )}
      {tasks.length > 0 && (
        <TaskList
          projectId={stage.project_id}
          stageNumber={stage.stage_number}
          tasks={tasks}
          canEdit={false}
          onTasksChange={() => {}}
        />
      )}
      {ATTACHMENT_CATEGORIES.map((cat) => (
        <AttachmentSection
          key={cat}
          projectId={stage.project_id}
          stageNumber={stage.stage_number}
          category={cat}
          attachments={attachments.filter((a) => a.category === cat)}
          canUpload={false}
          onAttachmentsChange={() => {}}
        />
      ))}
    </div>
  )
}

// Mobile snap-scroll stage carousel.
function StageCarousel({
  stages, tasksByStage, attsByStage, linksByStage, expandedStageIds, onToggle
}: {
  stages: ProjectStage[]
  tasksByStage: Record<number, ProjectStageTask[]>
  attsByStage: Record<number, ProjectStageAttachment[]>
  linksByStage: Record<number, ProjectStageProposalLink | null>
  expandedStageIds: Set<string>
  onToggle: (stageId: string, status: string) => void
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
    <div style={styles.carouselOuter}>
      <div ref={trackRef} className="ec-phase-track" style={styles.carouselTrack} aria-label="Project stages">
        {stages.map((stage) => {
          const phaseState = STAGE_STATUS_TO_PHASE[stage.status] ?? 'pending'
          const pill = phaseUI.status[phaseState]
          const expanded = expandedStageIds.has(stage.id)
          const canToggle = stage.status === 'done'
          const filled = stage.status !== 'pending'
          return (
            <div key={stage.id} style={styles.carouselCardWrap}>
              <div style={{
                ...styles.phaseCardInner,
                ...(stage.status === 'in_progress' ? styles.phaseCardActive : {}),
              }}>
                <div style={styles.phaseCardNodeRow}>
                  <span style={{ ...styles.phaseNode, ...(filled ? styles.phaseNodeFilled : styles.phaseNodeIdle) }}>
                    {stage.status === 'done' ? '✓' : stage.stage_number}
                  </span>
                </div>
                <div style={styles.phaseCardBody}>
                  <div style={styles.phaseNameRow}>
                    <span style={{ ...styles.phaseName, color: stage.status === 'pending' ? t.text.muted : t.text.primary }}>
                      {stage.name}
                    </span>
                    <span style={{ ...styles.statusPill, background: pill.bg, borderColor: pill.border }}>
                      {pill.label}
                    </span>
                  </div>
                  {canToggle && (
                    <button
                      type="button"
                      style={styles.carouselToggleBtn}
                      onClick={() => onToggle(stage.id, stage.status)}
                    >
                      {expanded ? 'Hide details' : 'Show details'}
                    </button>
                  )}
                </div>
                {/* Expanded content inline in the card */}
                {expanded && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${t.border.subtle}` }}>
                    <StageContent
                      stage={stage}
                      tasks={tasksByStage[stage.stage_number] ?? []}
                      attachments={attsByStage[stage.stage_number] ?? []}
                      link={linksByStage[stage.stage_number] ?? null}
                    />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <div style={styles.dots} aria-hidden="true">
        {stages.map((_, i) => (
          <span
            key={i}
            style={i === activeDot
              ? { ...styles.dot, ...styles.dotActive }
              : { ...styles.dot, ...styles.dotIdle }
            }
          />
        ))}
      </div>
    </div>
  )
}

function ProjectSkeleton() {
  return (
    <div style={{ background: tokens.surface, border: `1px solid ${t.border.overlayStrong}`, borderRadius: 16, padding: 28, marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ flex: 1, marginRight: 16 }}>
          <div className="ec-shimmer" style={{ height: 22, width: '55%', marginBottom: 10 }} />
          <div className="ec-shimmer" style={{ height: 14, width: '35%' }} />
        </div>
        <div className="ec-shimmer" style={{ width: 64, height: 64, borderRadius: 32, flexShrink: 0 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="ec-shimmer" style={{ width: 32, height: 32, borderRadius: 16 }} />
            <div className="ec-shimmer" style={{ height: 14, width: '80%' }} />
            <div className="ec-shimmer" style={{ height: 10, width: '50%' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function QuickCard({ to, title, sub, badge }: { to: string; title: string; sub: string; badge: boolean }) {
  return (
    <Link to={to} style={styles.quickCard}>
      <span style={styles.quickTitleRow}>
        <span style={styles.quickTitle}>{title}</span>
        {badge && <span style={styles.quickBadge} role="status" aria-label="New activity" />}
      </span>
      <span style={styles.quickSub}>{sub}</span>
    </Link>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

type BannerVariant = 'ruby' | 'gold' | 'teal'

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: tokens.bg, color: tokens.text, fontFamily: fonts.body },
  container: { maxWidth: 1080, margin: '0 auto' },
  banner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '18px 22px',
    borderRadius: 12,
    marginBottom: 28,
    textDecoration: 'none',
    fontWeight: 600,
    fontSize: 15,
    animation: `dashBannerIn ${motionTokens.durationBase} ${motionTokens.easeEnter}`,
  },
  bannerText: { lineHeight: 1.4 },
  bannerArrow: { fontSize: 20, flexShrink: 0 },
  extCard: {
    background: tokens.surface,
    border: `1px solid ${tokens.gold}`,
    borderLeft: `4px solid ${tokens.gold}`,
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
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
  title: {
    margin: '0 0 24px',
    fontFamily: fonts.heading, fontSize: 28, fontWeight: 600, lineHeight: '42px',
    letterSpacing: '-0.28px', color: tokens.text,
  },
  card: {
    background: tokens.surface, border: `1px solid ${t.border.overlayStrong}`,
    borderRadius: 16, padding: 28, marginBottom: 24,
  },
  cardHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 16, width: '100%',
  },
  cardHeaderText: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  projectTitle: {
    margin: 0, fontFamily: fonts.heading, fontSize: 20, fontWeight: 600,
    lineHeight: '30px', color: tokens.text,
  },
  projectMeta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, flexWrap: 'wrap' },
  metaStrong: { fontFamily: fonts.body, fontWeight: 600, color: t.text.secondary },
  metaDot: { color: t.text.muted },
  metaLabel: { fontFamily: fonts.body, fontWeight: 400, color: t.text.secondary },
  ring: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 },
  ringSvgWrap: {
    position: 'relative', width: 64, height: 64, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  ringPct: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: t.text.primary,
  },
  ringCaption: { fontFamily: fonts.body, fontSize: 12, fontWeight: 500, color: t.text.secondary, whiteSpace: 'nowrap' },

  // Stage grid (replaces phaseGrid — same CSS grid approach, now dynamic column count)
  stageGrid: { display: 'grid', alignItems: 'stretch' },
  stageDetailPanel: {
    marginTop: 16,
    padding: '16px 20px',
    background: t.background.subtle,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 10,
  },
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

  // Mobile carousel
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
    background: 'none', border: 'none', padding: 0,
    fontFamily: fonts.body, fontSize: 12, fontWeight: 500,
    color: t.text.urlLink, cursor: 'pointer', textAlign: 'left' as const,
  },
  dots: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 12 },
  dot: { height: 6, borderRadius: 999, flexShrink: 0, transition: `all ${motionTokens.durationFast} ${motionTokens.easeDefault}` },
  dotActive: { width: 16, background: tokens.primary },
  dotIdle: { width: 6, background: t.border.default },

  // Docs + milestones (unchanged)
  docsBlock: { marginTop: 24, paddingTop: 20, borderTop: `1px solid ${t.border.subtle}` },
  docsHeading: { margin: '0 0 8px', fontFamily: fonts.body, fontSize: 13, fontWeight: 500, color: t.text.secondary },
  milestonesBlock: { marginTop: 24, paddingTop: 20, borderTop: `1px solid ${t.border.subtle}` },
  milestoneList: { display: 'flex', flexDirection: 'column', gap: 12 },
  milestoneCard: {
    display: 'flex', alignItems: 'flex-start', gap: 14, padding: 16,
    background: t.background.subtle, border: `1px solid ${t.border.default}`, borderRadius: 12,
  },
  milestoneIcon: {
    flexShrink: 0, width: 32, height: 32, borderRadius: 16, background: tokens.greenLight,
    color: tokens.green, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 15, fontWeight: 700,
  },
  milestoneMain: { minWidth: 0, flex: 1 },
  milestoneLabel: { fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: t.text.primary },
  milestoneDate: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted, marginTop: 2 },
  milestoneOutcome: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary, marginTop: 6, lineHeight: 1.4 },
  completePill: {
    flexShrink: 0, display: 'inline-flex', alignItems: 'center', padding: '4px 10px',
    borderRadius: 999, background: tokens.greenLight, color: tokens.green,
    fontFamily: fonts.body, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
  },

  // Client notes section
  notesSection: {
    background: tokens.surface,
    border: `1px solid ${t.border.overlayStrong}`,
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
  },
  notesHeading: {
    margin: '0 0 16px',
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: t.text.primary,
  },

  // Quick grid (unchanged)
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 },
  quickCard: {
    position: 'relative', display: 'flex', flexDirection: 'column', gap: 6,
    background: tokens.surface, border: `1px solid ${t.border.overlayStrong}`,
    borderRadius: 12, padding: 22, textDecoration: 'none',
    transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  quickTitleRow: { display: 'flex', alignItems: 'center', gap: 8 },
  quickTitle: { fontFamily: fonts.heading, fontSize: 16, fontWeight: 600, lineHeight: '24px', color: t.text.primary },
  quickBadge: {
    width: 8, height: 8, borderRadius: '50%', background: tokens.ruby, flexShrink: 0,
    animation: `dashBadgeIn ${motionTokens.durationFast} ${motionTokens.easeEnter}`,
  },
  quickSub: { fontSize: 13, lineHeight: '19.5px', color: t.text.tertiary },
  empty: {
    background: tokens.surface, border: `1px dashed ${t.border.overlayStrong}`,
    borderRadius: 12, padding: 40, textAlign: 'center', marginBottom: 24,
  },
  emptyText: { margin: 0, fontSize: 15, color: tokens.textMuted },
  error: {
    background: tokens.rubyLight, color: tokens.ruby, padding: '12px 14px',
    borderRadius: 8, fontSize: 13, border: `1px solid ${tokens.ruby}`, marginBottom: 24,
  },
}
