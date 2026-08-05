// Client projects at /portal/projects. Lists every project the client has
// (not just the most recent one, unlike /portal/dashboard); clicking a card
// navigates to the full per-project drill-in at /portal/projects/:id.
// Theme tokens only; no raw hex; no em dashes; plain-language errors only.
import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { type PortalProfile } from '../PortalGuard'
import { CLIENT_NAV_HEIGHT } from './ClientNav'
import { tokens, t, fonts } from '../theme'
import { formatPortalDate } from '../utils/formatDate'
import { useBreakpoint } from '../hooks/useBreakpoint'

type ProjectRow = {
  id: string
  title: string
  current_phase: string | null
  status: string
  created_at: string
}

const LOAD_ERROR =
  'We could not load your projects. Please refresh or contact eswar@eswarcreatives.in'

// Status vocabulary has drifted across the admin UI over time (active/on_hold/
// delivered/closed from the base schema, plus completed/paused/cancelled seen
// in some admin panels) — fall back to a neutral badge for anything unmapped
// rather than showing nothing.
const STATUS_BADGE: Record<string, { bg: string; fg: string; label: string }> = {
  active:    { bg: tokens.tealLight,  fg: tokens.primary, label: 'Active' },
  on_hold:   { bg: tokens.goldLight,  fg: tokens.goldDark, label: 'On hold' },
  paused:    { bg: tokens.goldLight,  fg: tokens.goldDark, label: 'On hold' },
  delivered: { bg: tokens.greenLight, fg: tokens.green,   label: 'Delivered' },
  completed: { bg: tokens.greenLight, fg: tokens.green,   label: 'Delivered' },
  closed:    { bg: tokens.bg,         fg: t.text.tertiary, label: 'Closed' },
  cancelled: { bg: tokens.rubyLight,  fg: tokens.ruby,    label: 'Cancelled' },
}

function statusBadge(status: string) {
  return STATUS_BADGE[status] ?? { bg: tokens.bg, fg: t.text.tertiary, label: status }
}

export function ProjectsListPage() {
  const profile = useOutletContext<PortalProfile>()
  return <Projects profile={profile} />
}

function Projects({ profile }: { profile: PortalProfile }) {
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isMobile } = useBreakpoint()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: client, error: cErr } = await supabase
          .from('clients')
          .select('id')
          .eq('profile_id', profile.id)
          .maybeSingle()
        if (cErr) throw cErr
        if (!client) {
          if (!cancelled) setProjects([])
          return
        }
        const { data, error: pErr } = await supabase
          .from('projects')
          .select('id, title, current_phase, status, created_at')
          .eq('client_id', client.id)
          .order('created_at', { ascending: false })
        if (pErr) throw pErr
        if (!cancelled) setProjects((data ?? []) as ProjectRow[])
      } catch {
        if (!cancelled) setError(LOAD_ERROR) // H9: plain-language error.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [profile.id])

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes ecShimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        .ec-shimmer{background:linear-gradient(90deg,${t.background.subtle} 25%,${t.background.muted} 50%,${t.background.subtle} 75%);background-size:200% 100%;animation:ecShimmer 1.5s linear infinite;border-radius:6px}
      `}</style>
      <main style={{ ...styles.container, padding: `${CLIENT_NAV_HEIGHT + 40}px ${isMobile ? 16 : 24}px 80px` }}>
        <h1 style={styles.title}>Projects</h1>

        {error && <div style={styles.error}>{error}</div>}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 12, padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ flex: 1, marginRight: 12 }}>
                    <div className="ec-shimmer" style={{ height: 18, width: '60%', marginBottom: 8 }} />
                    <div className="ec-shimmer" style={{ height: 13, width: '40%' }} />
                  </div>
                  <div className="ec-shimmer" style={{ height: 26, width: 72, borderRadius: 999, flexShrink: 0 }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && projects.length === 0 && (
          <div style={styles.empty}>
            <p style={styles.emptyText}>
              Your projects will appear here once one is confirmed.
            </p>
          </div>
        )}

        <div style={styles.list}>
          {projects.map((p) => {
            const badge = statusBadge(p.status)
            return (
              <Link key={p.id} to={`/portal/projects/${p.id}`} style={styles.card}>
                <div style={styles.cardHead}>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={styles.cardTitle}>{p.title}</h2>
                    <p style={styles.cardMeta}>
                      {p.current_phase ? p.current_phase : 'In progress'} · Started {formatPortalDate(p.created_at)}
                    </p>
                  </div>
                  <span style={{ ...styles.badge, background: badge.bg, color: badge.fg }}>
                    {badge.label}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: tokens.bg, color: t.text.primary, fontFamily: fonts.body },
  container: { maxWidth: 760, margin: '0 auto' },
  title: {
    margin: '0 0 24px',
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: t.text.primary,
  },
  list: { display: 'flex', flexDirection: 'column', gap: 16 },
  card: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 22,
    cursor: 'pointer',
    fontFamily: fonts.body,
    textDecoration: 'none',
    boxSizing: 'border-box',
  },
  cardHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  cardTitle: { margin: 0, fontFamily: fonts.heading, fontSize: 18, fontWeight: 600, color: t.text.primary },
  cardMeta: { margin: '6px 0 0', fontSize: 13, color: t.text.tertiary },
  badge: {
    padding: '6px 12px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  empty: {
    background: tokens.surface,
    border: `1px dashed ${tokens.border}`,
    borderRadius: 12,
    padding: 40,
    textAlign: 'center',
  },
  emptyText: { margin: 0, fontSize: 15, color: t.text.secondary },
  error: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 13,
    border: `1px solid ${tokens.ruby}`,
    marginBottom: 16,
  },
}
