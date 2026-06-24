// Client dashboard at /portal/projects. Shows a single contextual banner (the
// highest-priority action the client should take), the client's active project
// with a read-only phase stepper, and quick links to the other sections.
// Theme tokens only; no raw hex; no em dashes; plain-language errors only.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router'
import type { CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { PortalGuard, type PortalProfile } from './PortalGuard'
import { ClientNav, CLIENT_NAV_HEIGHT } from './client/ClientNav'
import { getBadges, subscribeBadges } from './client/clientNotifications'
import type { BadgeSection } from './client/clientNotifications'
import { DocumentChips } from './client/DocumentChips'
import type { ClientDocument } from './client/DocumentChips'
import { tokens, fonts, motionTokens } from './theme'

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

// One banner shown at a time, highest priority wins. variant drives the palette.
type BannerVariant = 'ruby' | 'gold' | 'teal'
type Banner = { text: string; to: string; variant: BannerVariant }

export function ClientDashboardPage() {
  return (
    <PortalGuard requireRole="client">
      {(profile) => <Dashboard profile={profile} />}
    </PortalGuard>
  )
}

function Dashboard({ profile }: { profile: PortalProfile }) {
  const [project, setProject] = useState<ProjectRow | null>(null)
  const [phases, setPhases] = useState<PhaseRow[]>([])
  const [documents, setDocuments] = useState<ClientDocument[]>([])
  const [banner, setBanner] = useState<Banner | null>(null)
  const [extensions, setExtensions] = useState<TimelineExtension[]>([])
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const badges = useSyncExternalStore(subscribeBadges, getBadges, getBadges)

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

  return (
    <div style={styles.page}>
      <ClientNav profile={profile} />
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
            <h2 style={styles.projectTitle}>{project.title}</h2>
            <Stepper currentIndex={currentIndex} />
          </section>
        )}

        {!loading && !error && project && phases.length > 0 && (
          <section style={styles.card}>
            <h3 style={styles.sectionHeading}>Phases</h3>
            <div style={styles.phaseList}>
              {phases.map((ph) => (
                <div key={ph.id} style={styles.phaseRow}>
                  <div>
                    <div style={styles.phaseName}>{ph.phase_name}</div>
                    {/* H8: minimalist link; tasks wiring lands in Phase 6. */}
                    <Link to="/portal/projects#tasks" style={styles.tasksLink}>
                      View tasks &rarr;
                    </Link>
                  </div>
                  <span style={styles.phaseStatus}>{formatPhaseStatus(ph.phase_status)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {!loading && !error && project && (
          <section style={styles.card}>
            <h3 style={styles.sectionHeading}>Documents</h3>
            <DocumentChips documents={documents} />
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

function Stepper({ currentIndex }: { currentIndex: number }) {
  return (
    // H6: grid with equal columns guarantees every circle and label is centred,
    // including the first (Discovery) and last (Delivery) steps.
    <div style={styles.stepper} aria-label="Project phase">
      {PHASES.map((phase, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        const isFirst = i === 0
        const isLast = i === PHASES.length - 1
        const circle: CSSProperties = {
          ...styles.stepCircle,
          background: done || active ? tokens.primary : tokens.surface,
          borderColor: done || active ? tokens.primary : tokens.border,
          color: done || active ? tokens.surface : tokens.textMuted,
        }
        return (
          <div key={phase} style={styles.step}>
            <div style={styles.stepRow}>
              {/* End connectors are transparent so each circle stays centred. */}
              <span
                style={{
                  ...styles.connector,
                  background: isFirst
                    ? 'transparent'
                    : i <= currentIndex
                      ? tokens.primary
                      : tokens.border,
                }}
              />
              <span style={circle}>{done ? '✓' : i + 1}</span>
              <span
                style={{
                  ...styles.connector,
                  background: isLast
                    ? 'transparent'
                    : i < currentIndex
                      ? tokens.primary
                      : tokens.border,
                }}
              />
            </div>
            <span
              style={{
                ...styles.stepLabel,
                color: active ? tokens.primary : tokens.textMuted,
                fontWeight: active ? 600 : 500,
              }}
            >
              {phase}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function formatPhaseStatus(s: string): string {
  switch (s) {
    case 'in_progress':
      return 'In progress'
    case 'done':
      return 'Done'
    case 'blocked':
      return 'Blocked'
    default:
      return 'Pending'
  }
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: tokens.bg, color: tokens.text, fontFamily: fonts.body },
  container: {
    maxWidth: 880,
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
  title: {
    margin: '0 0 24px',
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: tokens.text,
  },
  card: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 28,
    marginBottom: 24,
  },
  projectTitle: {
    margin: '0 0 28px',
    fontFamily: fonts.heading,
    fontSize: 20,
    fontWeight: 600,
    color: tokens.text,
  },
  sectionHeading: {
    margin: '0 0 16px',
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
    color: tokens.text,
  },
  phaseList: { display: 'flex', flexDirection: 'column', gap: 4 },
  phaseRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '12px 0',
    borderBottom: `1px solid ${tokens.border}`,
  },
  phaseName: { fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: tokens.text },
  tasksLink: {
    display: 'inline-block',
    marginTop: 4,
    color: tokens.accent,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
  },
  phaseStatus: { fontFamily: fonts.body, fontSize: 13, color: tokens.textMuted, flexShrink: 0 },
  stepper: {
    display: 'grid',
    gridTemplateColumns: `repeat(${PHASES.length}, 1fr)`,
    alignItems: 'start',
  },
  step: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  stepRow: { display: 'flex', alignItems: 'center', width: '100%' },
  connector: { height: 2, flex: 1, minWidth: 0 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: `2px solid ${tokens.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 600,
    flexShrink: 0,
  },
  stepLabel: { fontSize: 13, textAlign: 'center', fontFamily: fonts.body },
  quickGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  quickCard: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 22,
    textDecoration: 'none',
    transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  quickTitleRow: { display: 'flex', alignItems: 'center', gap: 8 },
  quickTitle: { fontFamily: fonts.heading, fontSize: 16, fontWeight: 600, color: tokens.primary },
  quickBadge: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: tokens.ruby,
    flexShrink: 0,
    animation: `dashBadgeIn ${motionTokens.durationFast} ${motionTokens.easeEnter}`,
  },
  quickSub: { fontSize: 13, color: tokens.textMuted },
  empty: {
    background: tokens.surface,
    border: `1px dashed ${tokens.border}`,
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
}
