// Client-facing campaigns page at /portal/campaigns. Lists the design review
// campaigns that belong to the signed-in client (row-level security scopes the
// rows) and links into each campaign's review page.
// Theme tokens only; no raw hex; no em dashes; plain-language errors only.
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { PortalGuard, type PortalProfile } from '../PortalGuard'
import { ClientNav, CLIENT_NAV_HEIGHT } from './ClientNav'
import { formatDate } from '../admin/ui'
import { tokens, fonts, motionTokens } from '../theme'

type Campaign = {
  id: string
  title: string
  status: string | null
  visibility: string | null
  created_at: string | null
}

type Submission = {
  id: string
  set_name: string | null
  accepted_count: number
  passed_count: number
  completed_at: string
}

export function ClientCampaignsPage() {
  return (
    <PortalGuard requireRole="client">
      {(profile) => <Campaigns profile={profile} />}
    </PortalGuard>
  )
}

function Campaigns({ profile }: { profile: PortalProfile }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // RLS restricts campaigns to the signed-in client's own rows (private)
        // plus any public ones surfaced to them.
        const [campRes, subRes] = await Promise.all([
          supabase
            .from('review_campaigns')
            .select('id, title, status, visibility, created_at')
            .order('created_at', { ascending: false }),
          // 6e: prior submission history. client_id on submissions is the auth
          // user id; RLS also scopes this to the client's own rows.
          supabase
            .from('logo_sketch_submissions')
            .select('id, set_name, accepted_count, passed_count, completed_at')
            .eq('client_id', profile.id)
            .order('completed_at', { ascending: false }),
        ])
        if (campRes.error) throw campRes.error
        if (!cancelled) {
          setCampaigns((campRes.data ?? []) as Campaign[])
          setSubmissions((subRes.data ?? []) as Submission[])
        }
      } catch {
        // H9: plain-language error, never a raw Supabase string.
        if (!cancelled)
          setError('We could not load your campaigns. Please refresh or contact eswar@eswarcreatives.in')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile.id])

  return (
    <div style={styles.page}>
      <ClientNav profile={profile} />
      <main style={styles.container}>
        <div style={styles.heroBlock}>
          <h1 style={styles.title}>Campaigns</h1>
          <p style={styles.subtitle}>Your design review campaigns.</p>
        </div>

        {loading && <div style={styles.muted}>Loading campaigns...</div>}
        {error && <div style={styles.error}>{error}</div>}

        {!loading && !error && campaigns.length === 0 && submissions.length === 0 && (
          <div style={styles.empty}>
            <h2 style={styles.emptyTitle}>No campaigns yet</h2>
            <p style={styles.mutedBody}>Your design review campaigns will appear here.</p>
          </div>
        )}

        {!loading && !error && campaigns.length > 0 && (
          <div style={styles.grid}>
            {campaigns.map((c) => {
              const closed = c.status === 'closed'
              return (
                <article key={c.id} style={styles.card}>
                  <div>
                    <div style={styles.badgeRow}>
                      <CampaignStatusBadge status={c.status} />
                      {/* 6d: public campaigns are flagged so the client can tell
                          them apart from private ones. */}
                      {c.visibility === 'public' && <span style={styles.publicBadge}>Public</span>}
                    </div>
                    <h3 style={styles.cardTitle}>{c.title}</h3>
                    <p style={styles.cardSub}>{formatDate(c.created_at)}</p>
                  </div>
                  {/* 6g: closed campaigns are read-only (results only, no voting). */}
                  <Link to={`/portal/review/${c.id}`} style={styles.cta}>
                    {closed ? 'View results' : 'View campaign'}
                  </Link>
                </article>
              )
            })}
          </div>
        )}

        {/* 6e: submission history, only when the client has prior submissions. */}
        {!loading && !error && submissions.length > 0 && (
          <section style={styles.historyBlock}>
            <h2 style={styles.historyHeading}>Submission history</h2>
            <div style={styles.historyList}>
              {submissions.map((s) => (
                <div key={s.id} style={styles.historyRow}>
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.historyName}>{s.set_name || 'Concept set'}</div>
                    <div style={styles.historyMeta}>
                      {formatDate(s.completed_at)} · {s.accepted_count} accepted / {s.passed_count} passed
                    </div>
                  </div>
                  <Link to="/portal/sketch-review" style={styles.historyLink}>
                    View selections
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

// draft = muted, active = teal, closed = ruby-muted.
function CampaignStatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { background: string; color: string; label: string }> = {
    active: { background: tokens.tealLight, color: tokens.primary, label: 'Active' },
    closed: { background: tokens.rubyLight, color: tokens.ruby, label: 'Closed' },
    draft: { background: tokens.bg, color: tokens.textMuted, label: 'Draft' },
  }
  const palette = map[status ?? 'draft'] ?? map.draft
  return (
    <span style={{ ...styles.statusBadge, background: palette.background, color: palette.color }}>
      {palette.label}
    </span>
  )
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: tokens.bg, color: tokens.text, fontFamily: fonts.body },
  container: { maxWidth: 980, margin: '0 auto', padding: `${CLIENT_NAV_HEIGHT + 40}px 24px 80px` },
  heroBlock: { marginBottom: 32 },
  title: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: tokens.text,
  },
  subtitle: { margin: '8px 0 0', fontSize: 15, color: tokens.textMuted },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16,
  },
  card: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 16,
    minHeight: 150,
  },
  badgeRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: fonts.body,
  },
  publicBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: fonts.body,
    background: tokens.goldLight,
    color: tokens.goldDark,
  },
  historyBlock: { marginTop: 40 },
  historyHeading: {
    margin: '0 0 16px',
    fontFamily: fonts.heading,
    fontSize: 20,
    fontWeight: 600,
    color: tokens.text,
  },
  historyList: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    overflow: 'hidden',
  },
  historyRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '16px 20px',
    borderBottom: `1px solid ${tokens.border}`,
  },
  historyName: { fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: tokens.text },
  historyMeta: { fontFamily: fonts.body, fontSize: 13, color: tokens.textMuted, marginTop: 2 },
  historyLink: {
    color: tokens.accent,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  cardTitle: { margin: 0, fontFamily: fonts.heading, fontSize: 15, fontWeight: 600, color: tokens.text },
  cardSub: { margin: '6px 0 0', fontSize: 12, color: tokens.textMuted },
  cta: {
    alignSelf: 'flex-start',
    background: tokens.primary,
    color: tokens.surface,
    border: 'none',
    borderRadius: 8,
    padding: '9px 16px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  empty: {
    background: tokens.surface,
    border: `1px dashed ${tokens.border}`,
    borderRadius: 12,
    padding: 40,
    textAlign: 'center',
  },
  emptyTitle: { margin: '0 0 8px', fontFamily: fonts.heading, fontSize: 20, fontWeight: 600, color: tokens.text },
  muted: { color: tokens.textMuted, fontSize: 14 },
  mutedBody: { color: tokens.textMuted, fontSize: 14, margin: 0 },
  error: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 13,
    border: `1px solid ${tokens.ruby}`,
  },
}
