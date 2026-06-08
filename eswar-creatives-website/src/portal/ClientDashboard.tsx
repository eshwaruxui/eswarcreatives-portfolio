import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { supabase } from '../lib/supabase'
import { PortalGuard, type PortalProfile } from './PortalGuard'
import { tokens, fonts, statusPalette } from './theme'

type ProposalRow = {
  id: string
  slug: string
  title: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined'
  total_min_cents: number | null
  total_max_cents: number | null
  currency: string
  valid_until: string | null
  sent_at: string | null
}

type ClientRow = {
  id: string
  company_name: string | null
  contact_name: string | null
}

export function ClientDashboardPage() {
  return (
    <PortalGuard>
      {(profile) => <Dashboard profile={profile} />}
    </PortalGuard>
  )
}

function Dashboard({ profile }: { profile: PortalProfile }) {
  const navigate = useNavigate()
  const [client, setClient] = useState<ClientRow | null>(null)
  const [proposals, setProposals] = useState<ProposalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: c, error: cErr } = await supabase
          .from('clients')
          .select('id, company_name, contact_name')
          .eq('profile_id', profile.id)
          .maybeSingle()
        if (cErr) throw cErr
        if (cancelled) return
        setClient(c as ClientRow | null)

        const { data: p, error: pErr } = await supabase
          .from('proposals')
          .select('id, slug, title, status, total_min_cents, total_max_cents, currency, valid_until, sent_at')
          .order('sent_at', { ascending: false, nullsFirst: false })
        if (pErr) throw pErr
        if (cancelled) return
        setProposals((p ?? []) as ProposalRow[])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [profile.id])

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/portal/login', { replace: true })
  }

  const clientLabel = client?.contact_name && client?.company_name
    ? `${client.contact_name} · ${client.company_name}`
    : client?.contact_name ?? client?.company_name ?? profile.email
  const greeting = client?.contact_name
    ? `Welcome, ${client.contact_name}`
    : `Welcome, ${profile.email}`

  return (
    <div style={styles.page}>
      <header style={styles.topbar}>
        <div style={styles.topbarInner}>
          <div style={styles.brandRow}>
            <div style={styles.logoCircle}>
              <span style={styles.logoLetter}>e</span>
            </div>
            <span style={styles.brandName}>Eswar Creatives</span>
          </div>
          <div style={styles.topbarRight}>
            <span style={styles.clientLabel}>{clientLabel}</span>
            <button onClick={handleSignOut} style={styles.signout} type="button">Sign out</button>
          </div>
        </div>
      </header>

      <main style={styles.container}>
        <div style={styles.heroBlock}>
          <h1 style={styles.title}>{greeting}</h1>
          {client?.company_name && (
            <p style={styles.subtitle}>Proposals and project updates for {client.company_name}.</p>
          )}
        </div>

        {loading && <div style={styles.muted}>Loading proposals…</div>}
        {error && <div style={styles.error}>Error: {error}</div>}

        {!loading && !error && proposals.length === 0 && (
          <div style={styles.empty}>
            <h2 style={styles.emptyTitle}>No proposals yet</h2>
            <p style={styles.mutedBody}>
              When we send you a proposal, it will appear here.
              We’ll also let you know by email.
            </p>
          </div>
        )}

        {!loading && proposals.length > 0 && (
          <div style={styles.list}>
            <h2 style={styles.h2}>Proposals</h2>
            {proposals.map((p) => {
              const isHovered = hoveredId === p.id
              return (
                <Link
                  key={p.id}
                  to={`/portal/proposals/${p.slug}`}
                  style={styles.cardLink}
                  onMouseEnter={() => setHoveredId(p.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <article style={{
                    ...styles.card,
                    borderColor: isHovered ? tokens.accent : tokens.border,
                    boxShadow: isHovered
                      ? '0 8px 24px rgba(2, 76, 79, 0.10)'
                      : '0 1px 3px rgba(2, 76, 79, 0.04)',
                    transform: isHovered ? 'translateY(-1px)' : 'none',
                  }}>
                    <div style={styles.cardHead}>
                      <h3 style={styles.cardTitle}>{p.title}</h3>
                      <StatusBadge status={p.status} />
                    </div>
                    <p style={styles.cardPrice}>{formatPriceRange(p)}</p>
                    <p style={styles.cardMeta}>
                      {p.sent_at && <span>Sent {formatDate(p.sent_at)}</span>}
                      {p.valid_until && <span> · Valid until {formatDate(p.valid_until)}</span>}
                    </p>
                  </article>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

function StatusBadge({ status }: { status: ProposalRow['status'] }) {
  const p = statusPalette[status]
  return (
    <span
      style={{
        background: p.bg,
        color: p.fg,
        padding: '4px 12px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        fontFamily: fonts.body,
        whiteSpace: 'nowrap',
      }}
    >
      {p.label}
    </span>
  )
}

function formatPriceRange(p: ProposalRow): string {
  if (p.total_min_cents == null || p.total_max_cents == null) return ''
  const sym = p.currency === 'INR' ? '₹' : p.currency === 'USD' ? '$' : `${p.currency} `
  const fmt = (cents: number) => {
    const major = cents / 100
    if (p.currency === 'INR') {
      if (major >= 100000) return `${(major / 100000).toFixed(major % 100000 === 0 ? 0 : 2)}L`
      return major.toLocaleString('en-IN')
    }
    return major.toLocaleString('en-US')
  }
  return `${sym}${fmt(p.total_min_cents)} – ${sym}${fmt(p.total_max_cents)}`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch { return iso }
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: tokens.bg,
    color: tokens.text,
    fontFamily: fonts.body,
  },

  // ── Top bar
  topbar: {
    background: tokens.surface,
    borderBottom: `1px solid ${tokens.border}`,
  },
  topbarInner: {
    maxWidth: 880,
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  brandRow: { display: 'flex', alignItems: 'center', gap: 10 },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: tokens.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: tokens.gold,
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    lineHeight: 1,
    marginTop: 1,
  },
  brandName: {
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
    color: tokens.text,
    letterSpacing: '-0.005em',
  },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 16 },
  clientLabel: { fontSize: 13, color: tokens.textMuted },
  signout: {
    background: 'transparent',
    border: `1px solid ${tokens.border}`,
    color: tokens.primary,
    padding: '7px 14px',
    borderRadius: 8,
    fontSize: 13,
    fontFamily: fonts.body,
    fontWeight: 500,
    cursor: 'pointer',
  },

  // ── Container & hero
  container: { maxWidth: 880, margin: '0 auto', padding: '40px 24px 80px' },
  heroBlock: { marginBottom: 36 },
  title: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: tokens.text,
  },
  subtitle: { margin: '8px 0 0', fontSize: 15, color: tokens.textMuted, lineHeight: '22px' },

  // ── List
  h2: {
    margin: '0 0 14px',
    fontSize: 12,
    fontWeight: 600,
    color: tokens.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontFamily: fonts.body,
  },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  cardLink: { textDecoration: 'none', color: 'inherit' },
  card: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 22,
    transition: 'border-color 0.18s, box-shadow 0.18s, transform 0.18s',
  },
  cardHead: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  cardTitle: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: tokens.text,
    lineHeight: '24px',
    letterSpacing: '-0.005em',
  },
  cardPrice: {
    margin: '0 0 6px',
    fontSize: 15,
    color: tokens.accent,
    fontWeight: 600,
    fontFamily: fonts.body,
  },
  cardMeta: { margin: 0, fontSize: 12, color: tokens.textMuted },

  // ── Empty / muted / error
  empty: {
    background: tokens.surface,
    border: `1px dashed ${tokens.border}`,
    borderRadius: 12,
    padding: 40,
    textAlign: 'center',
  },
  emptyTitle: {
    margin: '0 0 8px',
    fontFamily: fonts.heading,
    fontSize: 20,
    fontWeight: 600,
    color: tokens.text,
  },
  muted: { color: tokens.textMuted, fontSize: 14 },
  mutedBody: { color: tokens.textMuted, fontSize: 14, lineHeight: '22px', margin: 0 },
  error: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 13,
    border: `1px solid ${tokens.ruby}33`,
  },
}
