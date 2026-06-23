// Client dashboard at /portal/projects. Shows the client's active project and a
// read-only phase stepper, plus quick links to proposals and invoices.
// Theme tokens only; no raw hex; no em dashes; plain-language errors only.
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { CSSProperties } from 'react'
import { supabase } from '../lib/supabase'
import { PortalGuard, type PortalProfile } from './PortalGuard'
import { ClientNav, CLIENT_NAV_HEIGHT } from './client/ClientNav'
import { tokens, fonts } from './theme'

// The fixed client journey. The project's phase pointer maps onto these.
const PHASES = ['Discovery', 'Design', 'Review', 'Delivery'] as const

type ProjectRow = {
  id: string
  title: string
  current_phase: string | null
  phase_number: number | null
  status: string
}

export function ClientDashboardPage() {
  return (
    <PortalGuard requireRole="client">
      {(profile) => <Dashboard profile={profile} />}
    </PortalGuard>
  )
}

function Dashboard({ profile }: { profile: PortalProfile }) {
  const [project, setProject] = useState<ProjectRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          if (!cancelled) setProject(null)
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
      <main style={styles.container}>
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

        {/* H6: recognition over recall, quick paths to the two key documents. */}
        <div style={styles.quickGrid}>
          <Link to="/portal/proposals" style={styles.quickCard}>
            <span style={styles.quickTitle}>View Proposal</span>
            <span style={styles.quickSub}>Review and respond to your proposal</span>
          </Link>
          <Link to="/portal/invoices" style={styles.quickCard}>
            <span style={styles.quickTitle}>View Invoices</span>
            <span style={styles.quickSub}>See amounts due and payment status</span>
          </Link>
        </div>
      </main>
    </div>
  )
}

function Stepper({ currentIndex }: { currentIndex: number }) {
  return (
    <div style={styles.stepper} aria-label="Project phase">
      {PHASES.map((phase, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        const circle: CSSProperties = {
          ...styles.stepCircle,
          background: done || active ? tokens.primary : tokens.surface,
          borderColor: done || active ? tokens.primary : tokens.border,
          color: done || active ? tokens.surface : tokens.textMuted,
        }
        return (
          <div key={phase} style={styles.step}>
            <div style={styles.stepRow}>
              {i > 0 && (
                <span
                  style={{
                    ...styles.connector,
                    background: i <= currentIndex ? tokens.primary : tokens.border,
                  }}
                />
              )}
              <span style={circle}>{done ? '✓' : i + 1}</span>
              {i < PHASES.length - 1 && (
                <span
                  style={{
                    ...styles.connector,
                    background: i < currentIndex ? tokens.primary : tokens.border,
                  }}
                />
              )}
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

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: tokens.bg, color: tokens.text, fontFamily: fonts.body },
  container: {
    maxWidth: 880,
    margin: '0 auto',
    padding: `${CLIENT_NAV_HEIGHT + 40}px 24px 80px`,
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
  stepper: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' },
  step: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 },
  stepRow: { display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center' },
  connector: { height: 2, flex: 1, minWidth: 12 },
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
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 22,
    textDecoration: 'none',
  },
  quickTitle: { fontFamily: fonts.heading, fontSize: 16, fontWeight: 600, color: tokens.primary },
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
