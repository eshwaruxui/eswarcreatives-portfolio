// Client proposals at /portal/proposals. Lists the client's proposals with
// status badges; clicking a card opens a right-side slide-in panel with the
// full proposal and its Accept / Decline actions (ClientProposalPanel).
// Theme tokens only; no raw hex; no em dashes; plain-language errors only.
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { PortalGuard, type PortalProfile } from '../PortalGuard'
import { ClientNav, CLIENT_NAV_HEIGHT } from './ClientNav'
import { ClientProposalPanel } from './ClientProposalPanel'
import { tokens, t, fonts } from '../theme'
import { formatMoney, formatDate } from '../admin/ui'

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
  draft: { bg: tokens.bg, fg: tokens.textMuted, label: 'Draft' },
  sent: { bg: tokens.tealLight, fg: tokens.primary, label: 'Sent' },
  viewed: { bg: tokens.goldLight, fg: tokens.goldDark, label: 'Viewed' },
  accepted: { bg: tokens.greenLight, fg: tokens.green, label: 'Accepted' },
  declined: { bg: tokens.rubyLight, fg: tokens.ruby, label: 'Declined' },
  expired: { bg: tokens.bg, fg: tokens.textMuted, label: 'Expired' },
}

const VERTICAL_LABEL: Record<string, string> = {
  brand: 'Brand identity',
  saas: 'SaaS design',
}

export function ClientProposalsPage() {
  return (
    <PortalGuard requireRole="client">
      {(profile) => <Proposals profile={profile} />}
    </PortalGuard>
  )
}

function Proposals({ profile }: { profile: PortalProfile }) {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      const { data, error: pErr } = await supabase
        .from('proposals')
        .select('id, title, vertical, total_amount, currency, status, valid_until, created_at')
        .eq('client_id', client.id)
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
      <ClientNav profile={profile} />
      <main style={styles.container}>
        <h1 style={styles.title}>Proposals</h1>

        {error && <div style={styles.error}>{error}</div>}
        {loading && <div style={styles.muted}>Loading your proposals...</div>}

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
                      {p.valid_until ? ` · Valid until ${formatDate(p.valid_until)}` : ''}
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
  page: { minHeight: '100vh', background: tokens.bg, color: tokens.text, fontFamily: fonts.body },
  container: {
    maxWidth: 760,
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
  cardTitle: { margin: 0, fontFamily: fonts.heading, fontSize: 18, fontWeight: 600, color: tokens.text },
  cardMeta: { margin: '6px 0 0', fontSize: 13, color: tokens.textMuted },
  badge: {
    padding: '4px 12px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
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
  emptyText: { margin: 0, fontSize: 15, color: tokens.textMuted },
  muted: { color: tokens.textMuted, fontSize: 14 },
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
