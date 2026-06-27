// Client dashboard at /portal/projects. Shows a single contextual banner (the
// highest-priority action the client should take), the client's active project
// as a hi-fi project card (header + progress ring + four-phase stepper with
// per-phase status pills), the project documents, and quick links to the other
// sections. Layout, spacing and typography follow the EC Design System master
// (Figma node 4149:31). Theme tokens only; no raw hex; no em dashes; plain
// errors only.
import { useEffect, useState, useSyncExternalStore } from 'react'
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
import type { PhaseState } from './theme'

// The fixed client journey. The project's phase pointer maps onto these.
const PHASES = ['Discovery', 'Design', 'Review', 'Delivery'] as const

type ProjectRow = {
  id: string
  title: string
  current_phase: string | null
  phase_number: number | null
  status: string
}

type PhaseRow = {
  id: string
  phase_name: string
  phase_status: string
  sort_order: number | null
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

// Phase stepper and quick grid collapse to a single column below this width.
function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

export function ClientDashboardPage() {
  const profile = useOutletContext<PortalProfile>()
  return <Dashboard profile={profile} />
}

function Dashboard({ profile }: { profile: PortalProfile }) {
  const [project, setProject] = useState<ProjectRow | null>(null)
  const [phases, setPhases] = useState<PhaseRow[]>([])
  const [documents, setDocuments] = useState<ClientDocument[]>([])
  const [banner, setBanner] = useState<Banner | null>(null)
  const [extensions, setExtensions] = useState<TimelineExtension[]>([])
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const badges = useSyncExternalStore(subscribeBadges, getBadges, getBadges)
  const narrow = useIsNarrow()

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
          if (!cancelled) {
            setProject(null)
            setBanner(null)
          }
          return
        }

        const { data: proj, error: pErr } = await supabase
          .from('projects')
          .select('id, title, current_phase, phase_number, status')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (pErr) throw pErr
        if (!cancelled) setProject((proj as ProjectRow | null) ?? null)

        // Phases and documents for the active project. Documents are sourced from
        // assets, which are project-scoped (no per-phase linkage in the schema yet).
        if (proj?.id) {
          const [phaseRes, assetRes] = await Promise.all([
            supabase
              .from('project_phases')
              .select('id, phase_name, phase_status, sort_order')
              .eq('project_id', proj.id)
              .order('sort_order', { ascending: true }),
            supabase
              .from('assets')
              .select('id, file_name, file_url')
              .eq('project_id', proj.id)
              .order('uploaded_at', { ascending: false }),
          ])
          if (!cancelled) {
            setPhases((phaseRes.data ?? []) as PhaseRow[])
            setDocuments((assetRes.data ?? []) as ClientDocument[])
          }
        }

        // 6d/6f: completed public polls shown as project milestones. Filter by
        // portal_client_id (the active-campaign public-read policy would otherwise
        // surface other clients' polls); totals come from the counts-only RPC.
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

        // Pending timeline extensions (5h). RLS scopes these to the client's
        // own projects, so no extra filter is needed.
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
    return () => {
      cancelled = true
    }
  }, [profile.id])

  // 5h: approve or deny a proposed timeline extension via the SECURITY DEFINER
  // RPC (clients cannot update projects directly).
  async function respondExtension(extId: string, approve: boolean) {
    setRespondingId(extId)
    const { error: rpcErr } = await supabase.rpc('respond_to_timeline_extension', {
      p_extension_id: extId,
      p_approve: approve,
    })
    setRespondingId(null)
    if (rpcErr) {
      // H9: plain-language error, never a raw Supabase string.
      setError('We could not record your response. Please try again.')
      return
    }
    setExtensions((prev) => {
      const remaining = prev.filter((e) => e.id !== extId)
      // Once none remain, retire the timeline banner (its to is /portal/projects).
      if (remaining.length === 0) {
        setBanner((b) => (b && b.to === '/portal/projects' ? null : b))
      }
      return remaining
    })
  }

  // Current step index from the integer pointer, falling back to the text phase.
  const currentIndex = (() => {
    if (!project) return 0
    if (project.phase_number && project.phase_number >= 1)
      return Math.min(project.phase_number - 1, PHASES.length - 1)
    const i = PHASES.findIndex(
      (p) => p.toLowerCase() === (project.current_phase ?? '').toLowerCase()
    )
    return i >= 0 ? i : 0
  })()

  // Per-phase state for the stepper. Prefer the real project_phases status; fall
  // back to the phase pointer when a phase row is missing or still pending.
  const phaseStates: PhaseState[] = PHASES.map((label, i) => {
    const row = phases.find((p) => p.phase_name.toLowerCase() === label.toLowerCase())
    if (row) {
      if (row.phase_status === 'done') return 'done'
      if (row.phase_status === 'in_progress' || row.phase_status === 'blocked') return 'active'
    }
    return i < currentIndex ? 'done' : i === currentIndex ? 'active' : 'pending'
  })

  // Completed phases count full, the active phase counts half, for a smooth ring.
  const progressPct = Math.round(
    (phaseStates.reduce((acc, s) => acc + (s === 'done' ? 1 : s === 'active' ? 0.5 : 0), 0) /
      PHASES.length) *
      100
  )

  return (
    <div style={styles.page}>
      {/* Banner enter + badge entrance keyframes (transform/opacity only). */}
      <style>{`
        @keyframes dashBannerIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes dashBadgeIn{from{transform:scale(0)}to{transform:scale(1)}}
      `}</style>
      <main style={styles.container}>
        {/* H1 (visibility of system status): the single most relevant next action,
            as a fully clickable card that routes to the right place. */}
        {!loading && !error && banner && <BannerCard banner={banner} />}

        {/* 5h: actionable timeline extension cards (the banner above links here). */}
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

        {loading && <div style={styles.muted}>Loading your project...</div>}
        {error && <div style={styles.error}>{error}</div>}

        {!loading && !error && !project && (
          // H1: clear empty state so the client knows nothing is wrong.
          <div style={styles.empty}>
            <p style={styles.emptyText}>
              Your project will appear here once it is confirmed.
            </p>
          </div>
        )}

        {!loading && !error && project && (
          <section style={styles.card}>
            {/* Card header: project name + phase meta on the left, progress ring right. */}
            <div style={styles.cardHeader}>
              <div style={styles.cardHeaderText}>
                <h2 style={styles.projectTitle}>{project.title}</h2>
                <div style={styles.projectMeta}>
                  <span style={styles.metaStrong}>
                    Phase {project.phase_number ?? currentIndex + 1}
                  </span>
                  <span style={styles.metaDot} aria-hidden="true">
                    &bull;
                  </span>
                  <span style={styles.metaLabel}>
                    {project.current_phase ?? PHASES[currentIndex]}
                  </span>
                </div>
              </div>
              <ProgressRing
                percent={progressPct}
                caption={`Phase ${currentIndex + 1} of ${PHASES.length}`}
              />
            </div>

            {/* Four-phase stepper with per-phase status pills. */}
            <div
              style={{
                ...styles.phaseGrid,
                gridTemplateColumns: narrow ? '1fr' : `repeat(${PHASES.length}, minmax(0, 1fr))`,
              }}
              aria-label="Project phase"
            >
              {PHASES.map((label, i) => (
                <PhaseColumn
                  key={label}
                  label={label}
                  index={i}
                  state={phaseStates[i]}
                  isFirst={i === 0}
                  isLast={i === PHASES.length - 1}
                  narrow={narrow}
                />
              ))}
            </div>

            {/* Documents are project-scoped (no per-phase linkage in the schema). */}
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
                      <span style={styles.milestoneIcon} aria-hidden="true">
                        ✓
                      </span>
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
        )}

        {/* H6: recognition over recall, quick paths to every section. */}
        <div style={styles.quickGrid}>
          <QuickCard
            to="/portal/proposals"
            title="View Proposal"
            sub="Review and respond to your proposal"
            badge={badges.proposals}
          />
          <QuickCard
            to="/portal/invoices"
            title="View Invoices"
            sub="See amounts due and payment status"
            badge={badges.invoices}
          />
          <QuickCard
            to="/portal/mockups"
            title="View Mockups"
            sub="Review concept designs and share feedback"
            badge={badges.mockups}
          />
          <QuickCard
            to="/portal/campaigns"
            title="View Campaigns"
            sub="See your design review campaigns"
            badge={false}
          />
        </div>
      </main>
    </div>
  )
}

// Resolve the highest-priority banner. Order matches the spec exactly:
// 1 proposal awaiting -> 2 invoice overdue -> 3 mockup awaiting -> 4 invoice due soon.
async function computeBanner(clientId: string, profileId: string): Promise<Banner | null> {
  // 0. Timeline extension awaiting a response (5h) — highest priority of all.
  // RLS scopes timeline_extensions to the client's own projects.
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
  const today = new Date().toISOString().slice(0, 10)
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

  // 3. Mockup awaiting feedback (a published set with no concept decision yet).
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
      <span aria-hidden="true" style={styles.bannerArrow}>
        &rarr;
      </span>
    </Link>
  )
}

// SVG progress donut. Track is a neutral ring; the arc fills clockwise from the
// top using the brand-subtle teal. Percent sits centred, caption sits beneath.
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
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={phaseUI.nodeFill}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
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

function PhaseColumn({
  label,
  index,
  state,
  isFirst,
  isLast,
  narrow,
}: {
  label: string
  index: number
  state: PhaseState
  isFirst: boolean
  isLast: boolean
  narrow: boolean
}) {
  const done = state === 'done'
  const active = state === 'active'
  const filled = done || active
  const pill = phaseUI.status[state]

  const colStyle: CSSProperties = narrow
    ? {
        ...styles.phaseCol,
        paddingBottom: isLast ? 0 : 16,
        borderBottom: isLast ? 'none' : `1px solid ${t.border.subtle}`,
      }
    : {
        ...styles.phaseCol,
        paddingLeft: isFirst ? 0 : 16,
        paddingRight: isLast ? 0 : 16,
        borderRight: isLast ? 'none' : `1px solid ${t.border.overlayStrong}`,
      }

  return (
    <div style={colStyle}>
      <div style={styles.phaseNodeRow}>
        <span style={{ ...styles.phaseNode, ...(filled ? styles.phaseNodeFilled : styles.phaseNodeIdle) }}>
          {done ? '✓' : index + 1}
        </span>
        {/* Connector is brand only once the phase is complete; otherwise neutral.
            Hidden in the stacked layout, where a long trailing rule reads oddly. */}
        {!narrow && (
          <span
            style={{
              ...styles.connector,
              background: done ? phaseUI.nodeFill : t.background.overlayNormal,
            }}
          />
        )}
      </div>
      <div style={styles.phaseBody}>
        <div style={styles.phaseNameRow}>
          <span
            style={{ ...styles.phaseName, color: state === 'pending' ? t.text.muted : t.text.primary }}
          >
            {label}
          </span>
          <span style={{ ...styles.statusPill, background: pill.bg, borderColor: pill.border }}>
            {pill.label}
          </span>
        </div>
        {/* H8: minimalist link; tasks wiring lands in a later phase. */}
        <Link to="/portal/projects#tasks" style={styles.tasksLink}>
          Tasks &rsaquo;
        </Link>
      </div>
    </div>
  )
}

function QuickCard({
  to,
  title,
  sub,
  badge,
}: {
  to: string
  title: string
  sub: string
  badge: boolean
}) {
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

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: tokens.bg, color: tokens.text, fontFamily: fonts.body },
  container: {
    maxWidth: 1080,
    margin: '0 auto',
    padding: `${CLIENT_NAV_HEIGHT + 40}px 24px 80px`,
  },
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
  extHeading: {
    margin: '0 0 16px',
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: tokens.text,
  },
  extField: { display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 },
  extLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: tokens.textMuted,
  },
  extValue: { fontFamily: fonts.body, fontSize: 15, color: tokens.text, lineHeight: 1.4 },
  extActions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  denyBtn: {
    background: tokens.surface,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '10px 18px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  approveBtn: {
    background: tokens.primary,
    color: tokens.surface,
    border: 'none',
    borderRadius: 8,
    padding: '10px 18px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  // Figma: Fraunces SemiBold 28 / 42, tracking -0.28px, ink #0a1a1b.
  title: {
    margin: '0 0 24px',
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: 600,
    lineHeight: '42px',
    letterSpacing: '-0.28px',
    color: tokens.text,
  },
  // Figma: white card, neutral overlay-strong hairline, radius 16, padding 28.
  card: {
    background: tokens.surface,
    border: `1px solid ${t.border.overlayStrong}`,
    borderRadius: 16,
    padding: 28,
    marginBottom: 24,
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    width: '100%',
  },
  cardHeaderText: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  // Figma: Fraunces SemiBold 20 / 30.
  projectTitle: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 20,
    fontWeight: 600,
    lineHeight: '30px',
    color: tokens.text,
  },
  projectMeta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, flexWrap: 'wrap' },
  metaStrong: { fontFamily: fonts.body, fontWeight: 600, color: t.text.secondary },
  metaDot: { color: t.text.muted },
  metaLabel: { fontFamily: fonts.body, fontWeight: 400, color: t.text.secondary },
  ring: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 },
  ringSvgWrap: {
    position: 'relative',
    width: 64,
    height: 64,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    color: t.text.primary,
  },
  ringCaption: { fontFamily: fonts.body, fontSize: 12, fontWeight: 500, color: t.text.secondary, whiteSpace: 'nowrap' },
  phaseGrid: { display: 'grid', alignItems: 'stretch', marginTop: 24 },
  phaseCol: { display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 },
  phaseNodeRow: { display: 'flex', alignItems: 'center', width: '100%' },
  phaseNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    border: '2px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
  },
  phaseNodeFilled: { background: phaseUI.nodeFill, color: tokens.surface, borderColor: t.border.overlayStrong },
  phaseNodeIdle: { background: tokens.surface, color: tokens.textMuted, borderColor: t.background.overlayNormal },
  connector: { flex: 1, height: 2, minWidth: 0 },
  phaseBody: { display: 'flex', flexDirection: 'column', gap: 8 },
  phaseNameRow: { display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  // Figma: Inter SemiBold 15 / 20, tracking 0.27px.
  phaseName: { fontFamily: fonts.body, fontSize: 15, fontWeight: 600, lineHeight: '20px', letterSpacing: 0.27 },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: 999,
    border: '1px solid',
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 500,
    color: t.text.primary,
    whiteSpace: 'nowrap',
  },
  tasksLink: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 500,
    color: t.text.urlLink, // design-system teal link (Figma library default blue intentionally not used)
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  docsBlock: { marginTop: 24, paddingTop: 20, borderTop: `1px solid ${t.border.subtle}` },
  docsHeading: {
    margin: '0 0 8px',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    color: t.text.secondary,
  },
  // Figma: three-up grid, gap 16; collapses responsively on narrow screens.
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 },
  quickCard: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: tokens.surface,
    border: `1px solid ${t.border.overlayStrong}`,
    borderRadius: 12,
    padding: 22,
    textDecoration: 'none',
    transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  quickTitleRow: { display: 'flex', alignItems: 'center', gap: 8 },
  // Figma: Fraunces SemiBold 16 / 24, neutral ink.
  quickTitle: { fontFamily: fonts.heading, fontSize: 16, fontWeight: 600, lineHeight: '24px', color: t.text.primary },
  quickBadge: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: tokens.ruby,
    flexShrink: 0,
    animation: `dashBadgeIn ${motionTokens.durationFast} ${motionTokens.easeEnter}`,
  },
  quickSub: { fontSize: 13, lineHeight: '19.5px', color: t.text.tertiary },
  empty: {
    background: tokens.surface,
    border: `1px dashed ${t.border.overlayStrong}`,
    borderRadius: 12,
    padding: 40,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyText: { margin: 0, fontSize: 15, color: tokens.textMuted },
  muted: { color: tokens.textMuted, fontSize: 14 },
  error: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 13,
    border: `1px solid ${tokens.ruby}`,
    marginBottom: 24,
  },
  milestonesBlock: { marginTop: 24, paddingTop: 20, borderTop: `1px solid ${t.border.subtle}` },
  milestoneList: { display: 'flex', flexDirection: 'column', gap: 12 },
  milestoneCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    background: t.background.subtle,
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
  },
  milestoneIcon: {
    flexShrink: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    background: tokens.greenLight,
    color: tokens.green,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: 700,
  },
  milestoneMain: { minWidth: 0, flex: 1 },
  milestoneLabel: { fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: t.text.primary },
  milestoneDate: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted, marginTop: 2 },
  milestoneOutcome: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
    marginTop: 6,
    lineHeight: 1.4,
  },
  completePill: {
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: 999,
    background: tokens.greenLight,
    color: tokens.green,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
}
