// Client proposals at /portal/proposals. Lists the client's proposals with
// status badges and, for live proposals, inline Accept / Decline actions.
// Accept calls the confirm-proposal edge function (creates project + deposit
// invoice atomically); Decline records an optional reason via decline_proposal.
// Theme tokens only; no raw hex; no em dashes; plain-language errors only.
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { PortalGuard, type PortalProfile } from '../PortalGuard'
import { ClientNav, CLIENT_NAV_HEIGHT } from './ClientNav'
import { tokens, fonts } from '../theme'
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

  // Per-row action state.
  const [busyId, setBusyId] = useState<string | null>(null)
  const [decliningId, setDecliningId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

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

  async function handleAccept(p: Proposal) {
    setBusyId(p.id)
    setError(null)
    try {
      const { error: fnErr } = await supabase.functions.invoke('confirm-proposal', {
        body: { proposal_id: p.id },
      })
      if (fnErr) throw fnErr
      await load()
    } catch {
      // H9: never surface raw function/Supabase errors to the client.
      setError(
        'We could not accept this proposal. Please try again or contact eswar@eswarcreatives.in'
      )
    } finally {
      setBusyId(null)
    }
  }

  async function handleDecline(p: Proposal) {
    setBusyId(p.id)
    setError(null)
    try {
      const { error: rpcErr } = await supabase.rpc('decline_proposal', {
        p_proposal_id: p.id,
        p_reason: reason,
      })
      if (rpcErr) throw rpcErr
      setDecliningId(null)
      setReason('')
      await load()
    } catch {
      setError(
        'We could not record your decision. Please try again or contact eswar@eswarcreatives.in'
      )
    } finally {
      setBusyId(null)
    }
  }

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
            const live = p.status === 'sent' || p.status === 'viewed'
            const locked =
              p.status === 'accepted' || p.status === 'declined' || p.status === 'expired'
            const badge = BADGE[p.status]
            return (
              <article key={p.id} style={styles.card}>
                <div style={styles.cardHead}>
                  <div>
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

                {/* Live proposals: Accept / Decline. H5 (error prevention): the
                    decline reason is confirmed in a second step, not on one tap. */}
                {live && decliningId !== p.id && (
                  <div style={styles.actions}>
                    <button
                      type="button"
                      style={styles.acceptBtn}
                      disabled={busyId === p.id}
                      onClick={() => handleAccept(p)}
                    >
                      {busyId === p.id ? 'Working...' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      style={styles.declineBtn}
                      disabled={busyId === p.id}
                      onClick={() => {
                        setDecliningId(p.id)
                        setReason('')
                        setError(null)
                      }}
                    >
                      Decline
                    </button>
                  </div>
                )}

                {live && decliningId === p.id && (
                  <div style={styles.declineBox}>
                    <label style={styles.declineLabel}>
                      Reason (optional)
                      <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        style={styles.textarea}
                        placeholder="Let us know if there is anything you would like to change."
                      />
                    </label>
                    <div style={styles.actions}>
                      <button
                        type="button"
                        style={styles.declineBtn}
                        disabled={busyId === p.id}
                        onClick={() => handleDecline(p)}
                      >
                        {busyId === p.id ? 'Working...' : 'Confirm decline'}
                      </button>
                      {/* H3: a clear way out of the decline step. */}
                      <button
                        type="button"
                        style={styles.cancelBtn}
                        disabled={busyId === p.id}
                        onClick={() => {
                          setDecliningId(null)
                          setReason('')
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {locked && (
                  <p style={styles.lockedNote}>
                    {p.status === 'accepted' && 'You accepted this proposal. Your project is underway.'}
                    {p.status === 'declined' && 'You declined this proposal.'}
                    {p.status === 'expired' && 'This proposal has expired.'}
                  </p>
                )}
              </article>
            )
          })}
        </div>
      </main>
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
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 22,
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
  amount: { margin: '14px 0 0', fontSize: 18, fontWeight: 600, color: tokens.accent, fontFamily: fonts.body },
  actions: { display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' },
  acceptBtn: {
    background: tokens.primary,
    color: tokens.surface,
    border: 'none',
    borderRadius: 8,
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: 'pointer',
  },
  declineBtn: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: 'pointer',
  },
  cancelBtn: {
    background: 'transparent',
    color: tokens.textMuted,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: fonts.body,
    cursor: 'pointer',
  },
  declineBox: { marginTop: 16 },
  declineLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    color: tokens.text,
  },
  textarea: {
    minHeight: 70,
    resize: 'vertical',
    background: tokens.inputBg,
    color: tokens.text,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '10px 12px',
    fontSize: 14,
    fontFamily: fonts.body,
    outline: 'none',
  },
  lockedNote: { margin: '14px 0 0', fontSize: 14, color: tokens.textMuted },
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
