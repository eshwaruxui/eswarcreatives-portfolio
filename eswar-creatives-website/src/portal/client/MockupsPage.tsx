// Client-facing mockups page. Shows the published mockup sets that belong to
// the signed-in client (row-level security does the scoping) and opens the
// shared ClientLightbox for review and feedback.
import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router'
import { ArrowRight, Check, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { type PortalProfile } from '../PortalGuard'
import { CLIENT_NAV_HEIGHT } from './ClientNav'
import { tokens, t, fonts, motionTokens } from '../theme'
import { formatPortalDate } from '../utils/formatDate'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { ClientLightbox } from '../mockups/ClientLightbox'
import { signMockupItems, type LightboxMockup, type LightboxMeta } from '../mockups/signItems'
import type { CSSProperties } from 'react'

type PublishedSet = {
  id: string
  concept_name: string
  phase: string | null
  phase_name: string | null
  task_item: string | null
  created_at: string
  projects: { title: string | null } | null
  mockup_items: { count: number }[]
}

export function MockupsPage() {
  const profile = useOutletContext<PortalProfile>()
  return <Mockups profile={profile} />
}

type SetDecision = 'approved' | 'changes_requested' | 'not_selected'

// Decision -> the concept-level mockup_feedback type written for it.
const FEEDBACK_TYPE: Record<SetDecision, string> = {
  approved: 'concept_approval',
  changes_requested: 'concept_rejection',
  not_selected: 'concept_not_selected',
}

function Mockups({ profile }: { profile: PortalProfile }) {
  const [sets, setSets] = useState<PublishedSet[]>([])
  const [decisions, setDecisions] = useState<Record<string, SetDecision>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isMobile, isTablet } = useBreakpoint()

  // The set currently open in the lightbox, with its signed images loaded.
  const [active, setActive] = useState<{ set: PublishedSet; mockups: LightboxMockup[] } | null>(null)
  const [opening, setOpening] = useState<string | null>(null)

  // This client's concept decision per set (latest wins). Drives the card badge.
  async function loadDecisions(ids: string[]) {
    if (ids.length === 0) return
    const { data } = await supabase
      .from('mockup_feedback')
      .select('set_id, feedback_type, created_at')
      .in('set_id', ids)
      .in('feedback_type', [
        'concept_approval',
        'concept_rejection',
        'concept_not_selected',
        'concept_awaiting',
      ])
      .eq('submitted_by', profile.id)
      .order('created_at', { ascending: true })
    // Latest concept-level row wins; an 'awaiting' marker clears the decision.
    const map: Record<string, SetDecision> = {}
    for (const r of (data ?? []) as { set_id: string; feedback_type: string }[]) {
      if (r.feedback_type === 'concept_awaiting') {
        delete map[r.set_id]
      } else if (r.feedback_type === 'concept_approval') {
        map[r.set_id] = 'approved'
      } else if (r.feedback_type === 'concept_not_selected') {
        map[r.set_id] = 'not_selected'
      } else {
        map[r.set_id] = 'changes_requested'
      }
    }
    setDecisions(map)
  }

  // Record (or reset) this client's concept decision. Optimistic, with a reload
  // on failure so the card never lies about what was saved.
  async function decide(setId: string, kind: SetDecision) {
    setDecisions((p) => ({ ...p, [setId]: kind }))
    const { error: err } = await supabase.from('mockup_feedback').insert({
      set_id: setId,
      item_id: null,
      submitted_by: profile.id,
      feedback_type: FEEDBACK_TYPE[kind],
    })
    if (err) {
      setError('Could not save your decision. Try again.')
      void loadDecisions(sets.map((s) => s.id))
    }
  }

  async function resetDecision(setId: string) {
    setDecisions((p) => {
      const next = { ...p }
      delete next[setId]
      return next
    })
    const { error: err } = await supabase.from('mockup_feedback').insert({
      set_id: setId,
      item_id: null,
      submitted_by: profile.id,
      feedback_type: 'concept_awaiting',
    })
    if (err) {
      setError('Could not change your decision. Try again.')
      void loadDecisions(sets.map((s) => s.id))
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error: err } = await supabase
          .from('mockup_sets')
          .select(
            'id, concept_name, phase, phase_name, task_item, created_at, projects(title), mockup_items(count)'
          )
          .eq('status', 'published')
          .order('created_at', { ascending: false })
        if (err) throw err
        if (cancelled) return
        const rows = (data ?? []) as unknown as PublishedSet[]
        setSets(rows)
        await loadDecisions(rows.map((r) => r.id))
      } catch {
        if (!cancelled) setError('Could not load your mockups. Refresh to try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id])

  async function openSet(set: PublishedSet) {
    setOpening(set.id)
    setError(null)
    try {
      const { data: items, error: err } = await supabase
        .from('mockup_items')
        .select('id, label, storage_path, sort_order')
        .eq('set_id', set.id)
        .order('sort_order', { ascending: true })
      if (err) throw err
      const mockups = await signMockupItems((items ?? []) as { id: string; label: string; storage_path: string }[])
      setActive({ set, mockups })
    } catch {
      setError('Could not open this mockup set. Try again.')
    } finally {
      setOpening(null)
    }
  }

  function metaFor(set: PublishedSet): LightboxMeta {
    return {
      projectName: set.projects?.title ?? '',
      conceptName: set.concept_name,
      phase: set.phase ?? '',
      phaseName: set.phase_name ?? '',
      taskItem: set.task_item ?? '',
      date: set.created_at,
    }
  }

  // Set-level decision summary, shown only once every concept has a decision.
  const decided = sets.map((s) => decisions[s.id]).filter(Boolean) as SetDecision[]
  const allDecided = sets.length > 0 && decided.length === sets.length
  const nApproved = decided.filter((d) => d === 'approved').length
  const nNotSelected = decided.filter((d) => d === 'not_selected').length
  const nChanges = decided.filter((d) => d === 'changes_requested').length

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes ecShimmer{0%{background-position:-200% center}100%{background-position:200% center}}
        .ec-shimmer{background:linear-gradient(90deg,${t.background.subtle} 25%,${t.background.muted} 50%,${t.background.subtle} 75%);background-size:200% 100%;animation:ecShimmer 1.5s linear infinite;border-radius:6px}
      `}</style>
      <main style={{ ...styles.container, padding: `${CLIENT_NAV_HEIGHT + 40}px ${isMobile ? 16 : 24}px 80px` }}>
        <div style={styles.heroBlock}>
          <h1 style={styles.title}>Mockups</h1>
          <p style={styles.subtitle}>Review concept designs and share your feedback.</p>
        </div>

        {allDecided && (
          <div style={styles.summaryBanner}>
            {nApproved} approved · {nNotSelected} not selected · {nChanges} changes requested
          </div>
        )}

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 16 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div className="ec-shimmer" style={{ height: 180, borderRadius: 0 }} />
                <div style={{ padding: 16 }}>
                  <div className="ec-shimmer" style={{ height: 16, width: '70%', marginBottom: 8 }} />
                  <div className="ec-shimmer" style={{ height: 13, width: '45%' }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {error && <div style={styles.error}>{error}</div>}

        {!loading && !error && sets.length === 0 && (
          <div style={styles.empty}>
            <h2 style={styles.emptyTitle}>No mockups yet</h2>
            <p style={styles.mutedBody}>When we publish concept designs, they will appear here.</p>
          </div>
        )}

        {!loading && sets.length > 0 && (
          // 1-col on mobile, 2-col on tablet, 3-col on desktop (spec Step 4).
          <div style={{ ...styles.grid, gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)' }}>
            {sets.map((s) => (
              <article key={s.id} style={styles.card}>
                <div>
                  <h3 style={styles.cardTitle}>{s.concept_name}</h3>
                  <p style={styles.cardMeta}>
                    {s.projects?.title || '-'}
                    {s.phase ? ` · Phase ${s.phase}` : ''}
                  </p>
                  <p style={styles.cardSub}>
                    {s.mockup_items?.[0]?.count ?? 0} image
                    {(s.mockup_items?.[0]?.count ?? 0) === 1 ? '' : 's'} · {formatPortalDate(s.created_at)}
                  </p>
                </div>

                <div style={styles.cardFooter}>
                  {/* Primary exploration action, always visible, on top. */}
                  <button
                    type="button"
                    style={styles.reviewBtn}
                    onClick={() => openSet(s)}
                    disabled={opening === s.id}
                  >
                    {opening === s.id ? 'Opening...' : 'Review Mockups'}
                    <ArrowRight size={15} />
                  </button>

                  {/* Decisions, separated from navigation. */}
                  <div style={styles.decisionSection}>
                    <div style={styles.decisionLabel}>Your decision</div>
                    {decisions[s.id] ? (
                      // Decided: pill + a way back to awaiting.
                      <div style={styles.decidedRow}>
                        <DecisionPill decision={decisions[s.id]!} />
                        <button
                          type="button"
                          style={styles.changeLink}
                          onClick={() => void resetDecision(s.id)}
                        >
                          Change decision
                        </button>
                      </div>
                    ) : (
                      // Awaiting: Approve + Not selected (equal weight), then the
                      // less prominent Request changes (single click each).
                      <>
                        <div style={styles.decisionTwoCol}>
                          <button type="button" style={styles.approveBtn} onClick={() => void decide(s.id, 'approved')}>
                            <Check size={14} /> Approve
                          </button>
                          <button type="button" style={styles.notSelBtn} onClick={() => void decide(s.id, 'not_selected')}>
                            <X size={14} /> Not selected
                          </button>
                        </div>
                        <button
                          type="button"
                          style={styles.requestChangesBtn}
                          onClick={() => void decide(s.id, 'changes_requested')}
                        >
                          Request changes
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {active && (
        <ClientLightbox
          mockups={active.mockups}
          meta={metaFor(active.set)}
          setId={active.set.id}
          isAdmin={false}
          onClose={() => {
            setActive(null)
            // Feedback may have been submitted; refresh the card badges.
            void loadDecisions(sets.map((s) => s.id))
          }}
        />
      )}
    </div>
  )
}

// H1 (visibility of system status): a decided concept advertises where it
// stands. Approved uses success tokens, changes uses the ruby palette, and
// not-selected is a neutral muted pill (t.background.subtle + t.text.muted).
function DecisionPill({ decision }: { decision: SetDecision }) {
  const palette =
    decision === 'approved'
      ? { bg: tokens.greenLight, fg: tokens.green, label: 'Approved' }
      : decision === 'changes_requested'
      ? { bg: tokens.rubyLight, fg: tokens.ruby, label: 'Changes requested' }
      : { bg: t.background.subtle, fg: t.text.muted, label: 'Not selected' }
  return (
    <span style={{ ...styles.statusBadge, background: palette.bg, color: palette.fg }}>
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
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: fonts.body,
  },
  summaryBanner: {
    background: t.background.subtle,
    color: t.text.secondary,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 10,
    padding: '12px 16px',
    marginBottom: 24,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
  },
  cardFooter: { display: 'flex', flexDirection: 'column', gap: 12 },
  // Divider + label separating navigation from the decision controls.
  decisionSection: {
    borderTop: `1px solid ${t.border.subtle}`,
    paddingTop: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  decisionLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: t.text.muted,
  },
  decisionTwoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  approveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: tokens.green,
    color: t.text.onPrimary,
    border: 'none',
    borderRadius: 8,
    // 44px min touch target per H7 (flexibility for mobile context).
    padding: '12px 10px',
    fontFamily: fonts.body,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  // Neutral muted, per the not-selected token rule.
  notSelBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: t.background.subtle,
    color: t.text.muted,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    padding: '12px 10px',
    fontFamily: fonts.body,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: 'pointer',
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  // Less prominent than Approve / Not selected: outlined, full width.
  requestChangesBtn: {
    width: '100%',
    background: 'transparent',
    color: t.text.secondary,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '11px 10px',
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    boxSizing: 'border-box',
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  decidedRow: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  changeLink: {
    background: 'transparent',
    border: 'none',
    color: t.text.primaryBrand,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
  cardTitle: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 15,
    fontWeight: 600,
    color: t.text.primary,
  },
  cardMeta: { margin: '8px 0 0', fontSize: 13, color: t.text.tertiary },
  cardSub: { margin: '4px 0 0', fontSize: 12, color: t.text.tertiary },
  reviewBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    background: 'transparent',
    color: t.text.primary,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '10px 16px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxSizing: 'border-box',
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
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
    color: t.text.primary,
  },
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
}
