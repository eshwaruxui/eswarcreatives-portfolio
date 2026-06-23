// Client-facing mockups page. Shows the published mockup sets that belong to
// the signed-in client (row-level security does the scoping) and opens the
// shared ClientLightbox for review and feedback.
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { PortalGuard, type PortalProfile } from '../PortalGuard'
import { ClientNav, CLIENT_NAV_HEIGHT } from './ClientNav'
import { tokens, fonts } from '../theme'
import { formatDate } from '../admin/ui'
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
  return (
    <PortalGuard requireRole="client">{(profile) => <Mockups profile={profile} />}</PortalGuard>
  )
}

type SetDecision = 'approved' | 'changes_requested'

function Mockups({ profile }: { profile: PortalProfile }) {
  const [sets, setSets] = useState<PublishedSet[]>([])
  const [decisions, setDecisions] = useState<Record<string, SetDecision>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      .in('feedback_type', ['concept_approval', 'concept_rejection'])
      .eq('submitted_by', profile.id)
      .order('created_at', { ascending: true })
    const map: Record<string, SetDecision> = {}
    for (const r of (data ?? []) as { set_id: string; feedback_type: string }[]) {
      map[r.set_id] = r.feedback_type === 'concept_approval' ? 'approved' : 'changes_requested'
    }
    setDecisions(map)
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

  return (
    <div style={styles.page}>
      <ClientNav profile={profile} />

      <main style={styles.container}>
        <div style={styles.heroBlock}>
          <h1 style={styles.title}>Mockups</h1>
          <p style={styles.subtitle}>Review concept designs and share your feedback.</p>
        </div>

        {loading && <div style={styles.muted}>Loading mockups...</div>}
        {error && <div style={styles.error}>{error}</div>}

        {!loading && !error && sets.length === 0 && (
          <div style={styles.empty}>
            <h2 style={styles.emptyTitle}>No mockups yet</h2>
            <p style={styles.mutedBody}>When we publish concept designs, they will appear here.</p>
          </div>
        )}

        {!loading && sets.length > 0 && (
          <div style={styles.grid}>
            {sets.map((s) => (
              <article key={s.id} style={styles.card}>
                <div>
                  <MockupStatusBadge decision={decisions[s.id]} />
                  <h3 style={styles.cardTitle}>{s.concept_name}</h3>
                  <p style={styles.cardMeta}>
                    {s.projects?.title || '-'}
                    {s.phase ? ` · Phase ${s.phase}` : ''}
                  </p>
                  <p style={styles.cardSub}>
                    {s.mockup_items?.[0]?.count ?? 0} image
                    {(s.mockup_items?.[0]?.count ?? 0) === 1 ? '' : 's'} · {formatDate(s.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  style={styles.reviewBtn}
                  onClick={() => openSet(s)}
                  disabled={opening === s.id}
                >
                  {opening === s.id ? 'Opening...' : 'Review Mockups'}
                </button>
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

// H1 (visibility of system status): every set advertises where it stands.
function MockupStatusBadge({ decision }: { decision?: SetDecision }) {
  const palette =
    decision === 'approved'
      ? { bg: tokens.greenLight, fg: tokens.green, label: 'Approved' }
      : decision === 'changes_requested'
      ? { bg: tokens.rubyLight, fg: tokens.ruby, label: 'Changes requested' }
      : { bg: tokens.goldLight, fg: tokens.goldDark, label: 'Awaiting your review' }
  return (
    <span style={{ ...styles.statusBadge, background: palette.bg, color: palette.fg }}>
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
  cardTitle: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 15,
    fontWeight: 600,
    color: tokens.text,
  },
  cardMeta: { margin: '8px 0 0', fontSize: 13, color: tokens.textMuted },
  cardSub: { margin: '4px 0 0', fontSize: 12, color: tokens.textMuted },
  reviewBtn: {
    alignSelf: 'flex-start',
    background: tokens.primary,
    color: tokens.surface,
    border: 'none',
    borderRadius: 8,
    padding: '9px 16px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
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
    color: tokens.text,
  },
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
