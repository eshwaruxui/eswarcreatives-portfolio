// Client-facing campaigns page at /portal/campaigns. Lists the design review
// campaigns that belong to the signed-in client (row-level security scopes the
// rows) and links into each campaign's review page.
// Theme tokens only; no raw hex; no em dashes; plain-language errors only.
import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { type PortalProfile } from '../PortalGuard'
import { CLIENT_NAV_HEIGHT } from './ClientNav'
import { ClientConceptSetPanel } from './ClientConceptSetPanel'
import { formatDate, mono } from '../admin/ui'
import { tokens, t, fonts, motionTokens } from '../theme'
import { useBreakpoint } from '../hooks/useBreakpoint'

type Campaign = {
  id: string
  title: string
  status: string | null
  visibility: string | null
  created_at: string | null
}

// Raw submission row joined to its set. The submission's own set_name column is
// unused (always null in practice); the real name lives on logo_sketch_sets.
type RawSubmission = {
  id: string
  accepted_count: number
  passed_count: number
  completed_at: string
  set_id: string
  logo_sketch_sets: {
    name: string | null
    project_slug: string | null
    campaign_id: string | null
  } | null
}

// One set within a campaign, reduced to its latest submission. campaignId is the
// public_campaigns row the set belongs to (null when unlinked); the concept-set
// panel needs it to fetch public-poll vote counts.
type SetSummary = {
  setId: string
  name: string
  campaignId: string | null
  accepted: number
  passed: number
  completedAt: string
}

// A campaign groups all of a client's sets under one project_slug, since the
// sketch sets are not linked to a campaign row (campaign_id is unused here).
type CampaignSummary = {
  slug: string
  label: string
  sets: SetSummary[]
  totalAccepted: number
  totalPassed: number
  latestAt: string
}

// Turn a project_slug like "newgen-branding-2026" into "Newgen Branding 2026".
function campaignLabel(slug: string): string {
  if (!slug) return 'Logo concept voting'
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
}

// Group submissions into campaigns. Submissions arrive newest-first, so the
// first one seen per set is its latest; we keep that and ignore earlier revotes.
function groupSubmissions(rows: RawSubmission[]): CampaignSummary[] {
  const byCampaign = new Map<string, CampaignSummary>()
  const seenSets = new Set<string>()

  for (const row of rows) {
    if (seenSets.has(row.set_id)) continue
    seenSets.add(row.set_id)

    const slug = row.logo_sketch_sets?.project_slug ?? 'unknown'
    const setSummary: SetSummary = {
      setId: row.set_id,
      name: row.logo_sketch_sets?.name || 'Concept set',
      campaignId: row.logo_sketch_sets?.campaign_id ?? null,
      accepted: row.accepted_count,
      passed: row.passed_count,
      completedAt: row.completed_at,
    }

    let camp = byCampaign.get(slug)
    if (!camp) {
      camp = {
        slug,
        label: campaignLabel(slug),
        sets: [],
        totalAccepted: 0,
        totalPassed: 0,
        latestAt: row.completed_at,
      }
      byCampaign.set(slug, camp)
    }
    camp.sets.push(setSummary)
    camp.totalAccepted += row.accepted_count
    camp.totalPassed += row.passed_count
    if (row.completed_at > camp.latestAt) camp.latestAt = row.completed_at
  }

  // Newest campaign first, by most recent activity.
  return [...byCampaign.values()].sort((a, b) => (a.latestAt < b.latestAt ? 1 : -1))
}

// A finished public poll surfaced in the client portal as a read-only record.
type CompletedPoll = {
  id: string
  title: string
  createdAt: string | null
  decisionNote: string | null
  totalVotes: number
  topConcepts: string[]
}

// Counts-only row from get_portal_campaign_vote_summary (never voter PII).
type VoteSummaryRow = {
  set_id: string
  sketch_index: number
  passed: number
  rejected: number
  total: number
}

// Load the signed-in client's completed public polls with vote aggregates. The
// explicit portal_client_id filter is essential: public_campaigns also carries a
// "read any active campaign" policy, so an unfiltered select would surface other
// clients' active polls. Per-concept counts come from the ownership-gated RPC, so
// no voter PII is ever read here. Concept names are synthesised from the set name
// and sketch position, matching the panel.
async function loadCompletedPolls(profileId: string): Promise<CompletedPoll[]> {
  const { data: clientRow } = await supabase
    .from('clients')
    .select('id')
    .eq('profile_id', profileId)
    .single()
  if (!clientRow) return []

  const { data: polls } = await supabase
    .from('public_campaigns')
    .select('id, campaign_title, created_at, portal_decision_note')
    .eq('portal_client_id', clientRow.id)
    .order('created_at', { ascending: false })
  if (!polls || polls.length === 0) return []

  return Promise.all(
    polls.map(async (p) => {
      const [summaryRes, setsRes] = await Promise.all([
        supabase.rpc('get_portal_campaign_vote_summary', { p_campaign_id: p.id }),
        supabase.from('logo_sketch_sets').select('id, name').eq('campaign_id', p.id),
      ])
      const setName = new Map(
        ((setsRes.data ?? []) as { id: string; name: string | null }[]).map((s) => [s.id, s.name])
      )
      const rows = (summaryRes.data ?? []) as VoteSummaryRow[]
      const totalVotes = rows.reduce((n, r) => n + Number(r.total), 0)
      const topConcepts = [...rows]
        .sort((a, b) => Number(b.passed) - Number(a.passed))
        .slice(0, 3)
        .map((r) => `${setName.get(r.set_id) || 'Concept set'} · Concept ${r.sketch_index + 1}`)
      return {
        id: p.id as string,
        title: p.campaign_title as string,
        createdAt: p.created_at as string | null,
        decisionNote: p.portal_decision_note as string | null,
        totalVotes,
        topConcepts,
      }
    })
  )
}

export function ClientCampaignsPage() {
  const profile = useOutletContext<PortalProfile>()
  return <Campaigns profile={profile} />
}

function Campaigns({ profile }: { profile: PortalProfile }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [history, setHistory] = useState<CampaignSummary[]>([])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [completedPolls, setCompletedPolls] = useState<CompletedPoll[]>([])
  const { isMobile } = useBreakpoint()
  // The concept set whose selections panel is open, plus its campaign label.
  const [panelSet, setPanelSet] = useState<
    { setId: string; name: string; campaignId: string | null; campaignName: string } | null
  >(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // RLS restricts campaigns to the signed-in client's own rows (private)
        // plus any public ones surfaced to them.
        const [campRes, subRes, polls] = await Promise.all([
          supabase
            .from('review_campaigns')
            .select('id, title, status, visibility, created_at')
            .order('created_at', { ascending: false }),
          // 6e: prior submission history. client_id on submissions is the auth
          // user id; RLS also scopes this to the client's own rows. We embed the
          // set so we can show its real name and group by its project_slug.
          supabase
            .from('logo_sketch_submissions')
            .select(
              'id, accepted_count, passed_count, completed_at, set_id, logo_sketch_sets(name, project_slug, campaign_id)'
            )
            .eq('client_id', profile.id)
            .order('completed_at', { ascending: false }),
          // 6d/6f: completed public polls linked to this client, with aggregates.
          loadCompletedPolls(profile.id),
        ])
        if (campRes.error) throw campRes.error
        if (!cancelled) {
          setCampaigns((campRes.data ?? []) as Campaign[])
          setHistory(groupSubmissions((subRes.data ?? []) as unknown as RawSubmission[]))
          setCompletedPolls(polls)
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
      <main style={{ ...styles.container, padding: `${CLIENT_NAV_HEIGHT + 40}px ${isMobile ? 16 : 24}px 80px` }}>
        <div style={styles.heroBlock}>
          <h1 style={styles.title}>Campaigns</h1>
          <p style={styles.subtitle}>Your design review campaigns.</p>
        </div>

        {loading && <div style={styles.muted}>Loading campaigns...</div>}
        {error && <div style={styles.error}>{error}</div>}

        {!loading &&
          !error &&
          campaigns.length === 0 &&
          history.length === 0 &&
          completedPolls.length === 0 && (
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

        {/* 6e: submission history, grouped by campaign. Each campaign shows one
            summary row with total accepted/passed; expanding reveals the actual
            set names and their individual counts. */}
        {!loading && !error && history.length > 0 && (
          <section style={styles.historyBlock}>
            <h2 style={styles.historyHeading}>Submission history</h2>
            <div style={styles.historyList}>
              {history.map((camp) => {
                const open = !!expanded[camp.slug]
                const setLabel = camp.sets.length === 1 ? 'set' : 'sets'
                return (
                  <div key={camp.slug}>
                    <button
                      type="button"
                      style={styles.campaignRow}
                      onClick={() =>
                        setExpanded((m) => ({ ...m, [camp.slug]: !m[camp.slug] }))
                      }
                      aria-expanded={open}
                    >
                      <span style={{ ...styles.chevron, ...(open ? styles.chevronOpen : null) }}>
                        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </span>
                      <span style={styles.campaignText}>
                        <span style={styles.historyName}>{camp.label}</span>
                        <span style={styles.historyMeta}>
                          {formatDate(camp.latestAt)} · {camp.sets.length} {setLabel} ·{' '}
                          {camp.totalAccepted} accepted / {camp.totalPassed} passed
                        </span>
                      </span>
                    </button>
                    {open && (
                      <div style={styles.setList}>
                        {camp.sets.map((s) => (
                          <div key={s.setId} style={styles.setRow}>
                            <div style={{ minWidth: 0 }}>
                              <div style={styles.setName}>{s.name}</div>
                              <div style={styles.historyMeta}>
                                {formatDate(s.completedAt)} · {s.accepted} accepted /{' '}
                                {s.passed} passed
                              </div>
                            </div>
                            <button
                              type="button"
                              style={styles.historyLinkButton}
                              onClick={() =>
                                setPanelSet({
                                  setId: s.setId,
                                  name: s.name,
                                  campaignId: s.campaignId,
                                  campaignName: camp.label,
                                })
                              }
                            >
                              View selections
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* 6d/6f: completed public polls as a read-only track record. No actions
            and no hover affordances, so nothing reads as interactive (H4). */}
        {!loading && !error && completedPolls.length > 0 && (
          <section style={styles.historyBlock}>
            <h2 style={styles.historyHeading}>Completed polls</h2>
            <div style={styles.pollList}>
              {completedPolls.map((poll) => (
                <article key={poll.id} style={styles.pollCard}>
                  <div style={styles.pollHead}>
                    <h3 style={styles.pollTitle}>{poll.title}</h3>
                    <span style={styles.closedPill}>Closed</span>
                  </div>
                  <div style={styles.pollMeta}>
                    {formatDate(poll.createdAt)} ·{' '}
                    <span style={styles.pollVotes}>{poll.totalVotes}</span> votes collected
                  </div>

                  {poll.topConcepts.length > 0 && (
                    <div style={styles.topConcepts}>
                      <div style={styles.topConceptsLabel}>Top concepts</div>
                      <ol style={styles.topConceptsList}>
                        {poll.topConcepts.map((name, i) => (
                          <li key={i} style={styles.topConceptItem}>
                            {name}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {poll.decisionNote && (
                    <div style={styles.decisionNote}>{poll.decisionNote}</div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      {panelSet && (
        <ClientConceptSetPanel
          campaignId={panelSet.campaignId}
          setId={panelSet.setId}
          setName={panelSet.name}
          campaignName={panelSet.campaignName}
          onClose={() => setPanelSet(null)}
        />
      )}
    </div>
  )
}

// draft = muted, active = teal, closed = ruby-muted.
function CampaignStatusBadge({ status }: { status: string | null }) {
  const map: Record<string, { background: string; color: string; label: string }> = {
    active: { background: tokens.tealLight, color: tokens.primary, label: 'Active' },
    closed: { background: tokens.rubyLight, color: tokens.ruby, label: 'Closed' },
    draft: { background: tokens.bg, color: t.text.tertiary, label: 'Draft' },
  }
  const palette = map[status ?? 'draft'] ?? map.draft
  return (
    <span style={{ ...styles.statusBadge, background: palette.background, color: palette.color }}>
      {palette.label}
    </span>
  )
}

const styles: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: tokens.bg, color: t.text.primary, fontFamily: fonts.body },
  container: { maxWidth: 980, margin: '0 auto' },
  heroBlock: { marginBottom: 32 },
  title: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: t.text.primary,
  },
  subtitle: { margin: '8px 0 0', fontSize: 15, color: t.text.secondary },
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
    color: t.text.primary,
  },
  historyList: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    overflow: 'hidden',
  },
  campaignRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '16px 20px',
    border: 'none',
    borderBottom: `1px solid ${tokens.border}`,
    background: tokens.surface,
    cursor: 'pointer',
    textAlign: 'left',
  },
  // Standing accordion chevron pattern: muted collapsed, brand expanded, with a
  // fast colour transition (see docs/COMPONENT_PATTERNS.md). The down/right swap
  // serves as the rotation here.
  chevron: {
    flexShrink: 0,
    display: 'inline-flex',
    color: t.text.muted,
    transition: `color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  chevronOpen: { color: t.text.primaryBrand },
  campaignText: { minWidth: 0, flex: 1 },
  setList: { background: tokens.bg, borderBottom: `1px solid ${tokens.border}` },
  setRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '14px 20px 14px 48px',
    borderTop: `1px solid ${tokens.border}`,
  },
  setName: { fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: t.text.primary },
  historyName: { display: 'block', fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: t.text.primary },
  historyMeta: { display: 'block', fontFamily: fonts.body, fontSize: 13, color: t.text.tertiary, marginTop: 2 },
  historyLink: {
    color: tokens.accent,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  historyLinkButton: {
    background: 'transparent',
    border: 'none',
    // 44px min touch target via padding (H7: flexibility for mobile context).
    padding: '12px 0',
    cursor: 'pointer',
    color: tokens.accent,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  cardTitle: { margin: 0, fontFamily: fonts.heading, fontSize: 15, fontWeight: 600, color: t.text.primary },
  cardSub: { margin: '6px 0 0', fontSize: 12, color: t.text.tertiary },
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
  emptyTitle: { margin: '0 0 8px', fontFamily: fonts.heading, fontSize: 20, fontWeight: 600, color: t.text.primary },
  muted: { color: t.text.secondary, fontSize: 14 },
  mutedBody: { color: t.text.secondary, fontSize: 14, margin: 0 },
  error: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 13,
    border: `1px solid ${tokens.ruby}`,
  },
  pollList: { display: 'flex', flexDirection: 'column', gap: 12 },
  pollCard: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 20,
  },
  pollHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 6,
  },
  pollTitle: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
    color: t.text.primary,
  },
  closedPill: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: fonts.body,
    background: t.background.subtle,
    color: t.text.muted,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  pollMeta: { fontFamily: fonts.body, fontSize: 13, color: t.text.muted, marginBottom: 14 },
  pollVotes: { fontFamily: mono, color: t.text.primary },
  topConcepts: { marginBottom: 14 },
  topConceptsLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: t.text.muted,
    marginBottom: 6,
  },
  topConceptsList: {
    margin: 0,
    paddingLeft: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  topConceptItem: { fontFamily: fonts.body, fontSize: 14, color: t.text.primary },
  decisionNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 1.5,
    color: t.text.secondary,
    background: t.background.subtle,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '12px 14px',
  },
}
