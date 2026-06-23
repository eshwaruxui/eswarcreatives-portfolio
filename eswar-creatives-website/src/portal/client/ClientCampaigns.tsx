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
  created_at: string | null
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // RLS restricts this to the signed-in client's own campaigns.
        const { data, error: err } = await supabase
          .from('review_campaigns')
          .select('id, title, status, created_at')
          .order('created_at', { ascending: false })
        if (err) throw err
        if (!cancelled) setCampaigns((data ?? []) as Campaign[])
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
  }, [])

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

        {!loading && !error && campaigns.length === 0 && (
          <div style={styles.empty}>
            <h2 style={styles.emptyTitle}>No campaigns yet</h2>
            <p style={styles.mutedBody}>Your design review campaigns will appear here.</p>
          </div>
        )}

        {!loading && !error && campaigns.length > 0 && (
          <div style={styles.grid}>
            {campaigns.map((c) => (
              <article key={c.id} style={styles.card}>
                <div>
                  <CampaignStatusBadge status={c.status} />
                  <h3 style={styles.cardTitle}>{c.title}</h3>
                  <p style={styles.cardSub}>{formatDate(c.created_at)}</p>
                </div>
                <Link to={`/portal/review/${c.id}`} style={styles.cta}>
                  View campaign
                </Link>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

// active = teal, anything else (closed) = muted.
function CampaignStatusBadge({ status }: { status: string | null }) {
  const isActive = status === 'active'
  const palette = isActive
    ? { background: tokens.tealLight, color: tokens.primary, label: 'Active' }
    : { background: tokens.bg, color: tokens.textMuted, label: 'Closed' }
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
  statusBadge: {
    display: 'inline-block',
    marginBottom: 10,
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: fonts.body,
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
