// Minimal reviewer landing for /portal/review and /portal/review/:campaignId.
// Reviewers are routed here at login (see LoginPage.redirectByRole). They see a
// campaign's items and record an Approve / Request changes decision per item via
// review_votes. Kept intentionally lightweight for this phase.
// Theme tokens only; no raw hex; no em dashes; plain-language errors only.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { PortalGuard, type PortalProfile } from '../PortalGuard'
import { PortalNav } from '../PortalNav'
import { tokens, fonts } from '../theme'

type Campaign = { id: string; title: string }
type Item = { id: string; label: string | null; sort_order: number | null }
type Decision = 'approved' | 'changes_requested'

export function ReviewCampaignPage() {
  return (
    <PortalGuard requireRole="reviewer">
      {(profile) => <Review profile={profile} />}
    </PortalGuard>
  )
}

function Review({ profile }: { profile: PortalProfile }) {
  const params = useParams()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [votes, setVotes] = useState<Record<string, Decision>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      // Use the campaign in the URL, else fall back to the first one RLS allows.
      let camp: Campaign | null = null
      if (params.campaignId) {
        const { data, error: cErr } = await supabase
          .from('review_campaigns')
          .select('id, title')
          .eq('id', params.campaignId)
          .maybeSingle()
        if (cErr) throw cErr
        camp = data as Campaign | null
      } else {
        const { data, error: cErr } = await supabase
          .from('review_campaigns')
          .select('id, title')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (cErr) throw cErr
        camp = data as Campaign | null
      }
      setCampaign(camp)

      if (camp) {
        const { data: its, error: iErr } = await supabase
          .from('review_items')
          .select('id, label, sort_order')
          .eq('campaign_id', camp.id)
          .order('sort_order', { ascending: true })
        if (iErr) throw iErr
        setItems((its ?? []) as Item[])

        const { data: vs, error: vErr } = await supabase
          .from('review_votes')
          .select('item_id, decision')
          .eq('campaign_id', camp.id)
        if (vErr) throw vErr
        const map: Record<string, Decision> = {}
        for (const v of vs ?? []) map[(v as { item_id: string }).item_id] = (v as { decision: Decision }).decision
        setVotes(map)
      }
    } catch {
      // H9: plain-language error.
      setError('We could not load this review. Please refresh or contact eswar@eswarcreatives.in')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.campaignId])

  async function vote(item: Item, decision: Decision) {
    if (!campaign) return
    setSavingId(item.id)
    setError(null)
    try {
      const { error: insErr } = await supabase.from('review_votes').insert({
        campaign_id: campaign.id,
        item_id: item.id,
        voter_profile_id: profile.id,
        decision,
      })
      if (insErr) throw insErr
      setVotes((m) => ({ ...m, [item.id]: decision }))
    } catch {
      setError('We could not record your decision. Please try again.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div style={styles.page}>
      <PortalNav showSignOut />
      <main style={styles.container}>
        {loading && <div style={styles.muted}>Loading review...</div>}
        {error && <div style={styles.error}>{error}</div>}

        {!loading && !error && !campaign && (
          // H1: a reviewer with nothing assigned sees a clear, calm empty state.
          <div style={styles.empty}>
            <p style={styles.emptyText}>You have no campaigns to review yet.</p>
          </div>
        )}

        {!loading && !error && campaign && (
          <>
            <h1 style={styles.title}>{campaign.title}</h1>
            {items.length === 0 && <p style={styles.muted}>This campaign has no items yet.</p>}
            <div style={styles.list}>
              {items.map((it) => {
                const current = votes[it.id]
                return (
                  <article key={it.id} style={styles.card}>
                    <span style={styles.itemLabel}>{it.label || 'Untitled item'}</span>
                    <div style={styles.actions}>
                      <button
                        type="button"
                        disabled={savingId === it.id}
                        onClick={() => vote(it, 'approved')}
                        style={{
                          ...styles.approveBtn,
                          ...(current === 'approved' ? styles.approveActive : null),
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={savingId === it.id}
                        onClick={() => vote(it, 'changes_requested')}
                        style={{
                          ...styles.changesBtn,
                          ...(current === 'changes_requested' ? styles.changesActive : null),
                        }}
                      >
                        Request changes
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: tokens.bg, color: tokens.text, fontFamily: fonts.body },
  container: { maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' },
  title: {
    margin: '0 0 24px',
    fontFamily: fonts.heading,
    fontSize: 26,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: tokens.text,
  },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  itemLabel: { fontSize: 15, fontWeight: 600, color: tokens.text },
  actions: { display: 'flex', gap: 10 },
  approveBtn: {
    background: tokens.surface,
    color: tokens.green,
    border: `1px solid ${tokens.green}`,
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: 'pointer',
  },
  approveActive: { background: tokens.greenLight },
  changesBtn: {
    background: tokens.surface,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: 'pointer',
  },
  changesActive: { background: tokens.rubyLight },
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
