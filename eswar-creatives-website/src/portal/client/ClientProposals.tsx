// Client proposals at /portal/proposals. Lists the client's proposals with
// status badges; clicking a card opens a right-side slide-in panel with the
// full proposal and its Accept / Decline actions (ClientProposalPanel).
// Theme tokens only; no raw hex; no em dashes; plain-language errors only.
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { type PortalProfile } from '../PortalGuard'
import { CLIENT_NAV_HEIGHT } from './ClientNav'
import { ClientProposalPanel } from './ClientProposalPanel'
import { tokens, t, fonts } from '../theme'
import { formatMoney } from '../admin/ui'
import { formatDocumentDate } from '../utils/formatDate'
import { useBreakpoint } from '../hooks/useBreakpoint'

type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired'

type Proposal = {
  id: string
  title: string
  vertical: string
  total_amount: number
  currency: string
  status: ProposalStatus
  valid_until: string | null
  created_at: string
}

const LOAD_ERROR =
  'We could not load your proposals. Please refresh or contact eswar@eswarcreatives.in'

// Badge colours from theme tokens only (brief palette).
const BADGE: Record<ProposalStatus, { bg: string; fg: string; label: string }> = {
  draft: { bg: tokens.bg, fg: t.text.tertiary, label: 'Draft' },
  sent: { bg: tokens.tealLight, fg: tokens.primary, label: 'Sent' },
  viewed: { bg: tokens.goldLight, fg: tokens.goldDark, label: 'Viewed' },
  accepted: { bg: tokens.greenLight, fg: tokens.green, label: 'Accepted' },
  declined: { bg: tokens.rubyLight, fg: tokens.ruby, label: 'Declined' },
  expired: { bg: tokens.bg, fg: t.text.tertiary, label: 'Expired' },
}

const VERTICAL_LABEL: Record<string, string> = {
  brand: 'Brand identity',
  saas: 'SaaS design',
}

export function ClientProposalsPage() {
  const profile = useOutletContext<PortalProfile>()
  return <Proposals profile={profile} />
}

function Proposals({ profile }: { profile: PortalProfile }) {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isMobile } = useBreakpoint()

  // Clicking a card opens the full-detail slide-in panel for that proposal.
  const [openId, setOpenId] = useState<string | null>(null)

  async function load() {
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
        setProposals([])
        return
      }
      // Drafts are internal-only. RLS scopes proposals to the client's own rows
      // but does not filter by status, so we exclude drafts here as a
      // defence-in-depth measure. Clients only ever see sent/viewed/accepted/
      // declined/expired proposals, never drafts.
      const { data, error: pErr } = await supabase
        .from('proposals')
        .select('id, title, vertical, total_amount, currency, status, valid_until, created_at')
        .eq('client_id', client.id)
        .not('status', 'eq', 'draft')
        .order('created_at', { ascending: false })
      if (pErr) throw pErr
      setProposals((data ?? []) as Proposal[])
    } catch {
      setError(LOAD_ERROR) // H9: plain-language error.
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id])

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes ecShimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        .ec-shimmer{background:linear-gradient(90deg,${t.background.subtle} 25%,${t.background.muted} 50%,${t.background.subtle} 75%);background-size:200% 100%;animation:ecShimmer 1.5s linear infinite;border-radius:6px}
      `}</style>
      <main style={{ ...styles.container, padding: `${CLIENT_NAV_HEIGHT + 40}px ${isMobile ? 16 : 24}px 80px` }}>
        <h1 style={styles.title}>Proposals</h1>

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
                <div className="ec-shimmer" style={{ height: 18, width: 120 }} />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && proposals.length === 0 && (
          <div style={styles.empty}>
            <p style={styles.emptyText}>
              Your proposals will appear here once we send them.
            </p>
          </div>
        )}

        <div style={styles.list}>
          {proposals.map((p) => {
            const badge = BADGE[p.status]
            return (
              // H7 (flexibility): the whole card is the affordance to open the
              // full proposal; it is a real button for keyboard/AT users.
              <button key={p.id} type="button" style={styles.card} onClick={() => setOpenId(p.id)}>
                <div style={styles.cardHead}>
                  <div style={{ minWidth: 0 }}>
                    <h2 style={styles.cardTitle}>{p.title}</h2>
                    <p style={styles.cardMeta}>
                      {VERTICAL_LABEL[p.vertical] ?? p.vertical}
                      {p.valid_until ? ` · Valid until ${formatDocumentDate(p.valid_until)}` : ''}
                    </p>
                  </div>
                  <span style={{ ...styles.badge, background: badge.bg, color: badge.fg }}>
                    {badge.label}
                  </span>
                </div>

                <p style={styles.amount}>{formatMoney(Number(p.total_amount), p.currency)}</p>
              </button>
            )
          })}
        </div>
      </main>

      {/* Full proposal detail + actions. Refreshing the list on change keeps the
          card badges in step with the panel (H1: visibility of system status). */}
      {openId && (
        <ClientProposalPanel
          proposalId={openId}
          onClose={() => setOpenId(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: tokens.bg, color: t.text.primary, fontFamily: fonts.body },
  container: {
    maxWidth: 760,
    margin: '0 auto',
    // Padding overridden inline with responsive values (16px mobile / 24px desktop).
  },
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
    // Generous padding so the badge reads clearly on small screens.
    flexShrink: 0,
  },
  // H4: consistent text token - neutral not brand (amount is a static value, not interactive)
  amount: { margin: '14px 0 0', fontSize: 18, fontWeight: 600, color: t.text.primary, fontFamily: fonts.body },
  empty: {
    background: tokens.surface,
    border: `1px dashed ${tokens.border}`,
    borderRadius: 12,
    padding: 40,
    textAlign: 'center',
  },
  emptyText: { margin: 0, fontSize: 15, color: t.text.secondary },
  muted: { color: t.text.secondary, fontSize: 14 },
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
