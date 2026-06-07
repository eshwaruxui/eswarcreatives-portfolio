import { useEffect, useState, useCallback } from 'react'
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'motion/react'
import { supabase } from '../lib/supabase'
import { PortalGuard, type PortalProfile } from './PortalGuard'
import { tokens, fonts } from './theme'

// ── Data shapes ──────────────────────────────────────────────────────
// logo_sketch_sets.client_id references profiles.id, and the table's RLS
// policy is client_id = auth.uid(), so the signed-in profile id is the
// client id we query by.
type SketchSet = {
  id: string
  project_slug: string
  set_number: number
  total_count: number
  created_at: string
}

type Sketch = { index: number; fileName: string; url: string }

const BUCKET = 'logo-sketches'
const SWIPE_THRESHOLD = 120 // px of horizontal travel that commits a decision

// ── Route entry: PortalGuard already gates auth and hands us the profile ─
export function SketchReviewPage() {
  return (
    <PortalGuard>
      {(profile) => <SketchReview profile={profile} />}
    </PortalGuard>
  )
}

function SketchReview({ profile }: { profile: PortalProfile }) {
  const [set, setSet] = useState<SketchSet | null>(null)
  const [sketches, setSketches] = useState<Sketch[]>([])
  // index -> accepted. Restored on mount, then updated optimistically.
  const [reviews, setReviews] = useState<Record<number, boolean>>({})
  // order decisions were made in, so Undo can reverse the most recent one.
  const [history, setHistory] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false) // gate while a card animates out

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // 1. Active set: newest set owned by this client.
        const { data: setRow, error: setErr } = await supabase
          .from('logo_sketch_sets')
          .select('id, project_slug, set_number, total_count, created_at')
          .eq('client_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (setErr) throw setErr
        if (cancelled) return
        if (!setRow) {
          setLoading(false)
          return
        }
        const activeSet = setRow as SketchSet
        setSet(activeSet)

        // 2. Sketch files live in logo-sketches/{set_id}/{file_name}.
        //    The set row only stores a count, so we list the folder to learn
        //    the actual file names.
        const { data: files, error: listErr } = await supabase.storage
          .from(BUCKET)
          .list(activeSet.id, {
            limit: 1000,
            sortBy: { column: 'name', order: 'asc' },
          })
        if (listErr) throw listErr
        if (cancelled) return

        const visible = (files ?? []).filter(
          (f) => f.name && !f.name.startsWith('.')
        )
        const built: Sketch[] = visible.map((f, i) => {
          const { data } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(`${activeSet.id}/${f.name}`)
          return { index: i, fileName: f.name, url: data.publicUrl }
        })
        setSketches(built)

        // 3. Restore any prior decisions so returning clients resume where
        //    they left off (and Undo can reach restored reviews too).
        const { data: prior, error: revErr } = await supabase
          .from('logo_sketch_reviews')
          .select('sketch_index, accepted, reviewed_at')
          .eq('set_id', activeSet.id)
          .order('reviewed_at', { ascending: true })
        if (revErr) throw revErr
        if (cancelled) return

        const map: Record<number, boolean> = {}
        const order: number[] = []
        for (const r of prior ?? []) {
          map[r.sketch_index as number] = r.accepted as boolean
          order.push(r.sketch_index as number)
        }
        setReviews(map)
        setHistory(order)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile.id])

  // ── Derived state ──────────────────────────────────────────────────
  const total = sketches.length
  const reviewedCount = Object.keys(reviews).length
  const acceptedCount = Object.values(reviews).filter(Boolean).length
  const rejectedCount = reviewedCount - acceptedCount
  const remaining = sketches.filter((s) => !(s.index in reviews))
  const current = remaining[0] ?? null
  const next = remaining[1] ?? null
  const done = total > 0 && remaining.length === 0

  // ── Persistence ────────────────────────────────────────────────────
  // Upsert on the (set_id, sketch_index) unique constraint (migration 0015)
  // so re-reviewing a sketch overwrites its prior decision.
  const persistReview = useCallback(
    async (sketch: Sketch, accepted: boolean) => {
      if (!set) return
      try {
        const { error: upErr } = await supabase
          .from('logo_sketch_reviews')
          .upsert(
            {
              set_id: set.id,
              sketch_index: sketch.index,
              file_name: sketch.fileName,
              accepted,
              reviewed_at: new Date().toISOString(),
            },
            { onConflict: 'set_id,sketch_index' }
          )
        if (upErr) throw upErr
      } catch (err) {
        // Roll the optimistic update back so the card returns to the deck.
        setReviews((prev) => {
          const nextMap = { ...prev }
          delete nextMap[sketch.index]
          return nextMap
        })
        setHistory((prev) => prev.filter((i) => i !== sketch.index))
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [set]
  )

  const decide = useCallback(
    (accepted: boolean) => {
      if (pending || !current) return
      setPending(true)
      setError(null)
      setReviews((prev) => ({ ...prev, [current.index]: accepted }))
      setHistory((prev) => [...prev, current.index])
      void persistReview(current, accepted)
    },
    [pending, current, persistReview]
  )

  const undo = useCallback(async () => {
    if (pending || history.length === 0 || !set) return
    const idx = history[history.length - 1]
    const sketch = sketches.find((s) => s.index === idx)
    const prevAccepted = reviews[idx]
    // Optimistic remove.
    setHistory((prev) => prev.slice(0, -1))
    setReviews((prev) => {
      const nextMap = { ...prev }
      delete nextMap[idx]
      return nextMap
    })
    setError(null)
    try {
      const { error: delErr } = await supabase
        .from('logo_sketch_reviews')
        .delete()
        .eq('set_id', set.id)
        .eq('sketch_index', idx)
      if (delErr) throw delErr
    } catch (err) {
      // Restore on failure.
      if (sketch) {
        setReviews((prev) => ({ ...prev, [idx]: prevAccepted }))
        setHistory((prev) => [...prev, idx])
      }
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [pending, history, reviews, sketches, set])

  // ── Render ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Shell>
        <p style={styles.muted}>Loading sketches...</p>
      </Shell>
    )
  }

  if (error && !set) {
    return (
      <Shell>
        <div style={styles.error}>Error: {error}</div>
      </Shell>
    )
  }

  if (!set || total === 0) {
    return (
      <Shell>
        <div style={styles.empty}>
          <h2 style={styles.emptyTitle}>No sketches uploaded yet</h2>
          <p style={styles.mutedBody}>
            When your logo sketches are ready, they will appear here for you to
            review. We will email you as soon as they are up.
          </p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div style={styles.header}>
        <h1 style={styles.title}>Review your logo sketches</h1>
        <p style={styles.subtitle}>
          Swipe right to accept, swipe left to pass. You can undo any decision.
        </p>
      </div>

      {/* Progress */}
      <div style={styles.progressBlock}>
        <div style={styles.progressMeta}>
          <span style={styles.progressLabel}>
            {reviewedCount} of {total} reviewed
          </span>
          <span style={styles.counters}>
            <span style={{ ...styles.counter, color: tokens.green }}>
              {acceptedCount} accepted
            </span>
            <span style={styles.counterDivider}>·</span>
            <span style={{ ...styles.counter, color: tokens.ruby }}>
              {rejectedCount} passed
            </span>
          </span>
        </div>
        <div style={styles.track}>
          <div
            style={{
              ...styles.fill,
              width: `${total ? (reviewedCount / total) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {error && <div style={styles.error}>Error: {error}</div>}

      {done ? (
        <DoneScreen
          total={total}
          accepted={acceptedCount}
          rejected={rejectedCount}
          canUndo={history.length > 0 && !pending}
          onUndo={undo}
        />
      ) : (
        <div style={styles.deckWrap}>
          <div style={styles.deck}>
            {/* Back card for depth */}
            {next && (
              <div style={styles.backCard}>
                <img
                  src={next.url}
                  alt=""
                  aria-hidden
                  style={styles.image}
                  draggable={false}
                />
              </div>
            )}

            <AnimatePresence
              custom={reviews[current?.index ?? -1]}
              onExitComplete={() => setPending(false)}
            >
              {current && (
                <SwipeCard
                  key={current.index}
                  sketch={current}
                  position={reviewedCount + 1}
                  total={total}
                  onDecide={decide}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div style={styles.controls}>
            <button
              type="button"
              onClick={() => decide(false)}
              disabled={pending}
              style={{ ...styles.decisionBtn, ...styles.rejectBtn }}
            >
              Pass
            </button>
            <button
              type="button"
              onClick={undo}
              disabled={pending || history.length === 0}
              style={{
                ...styles.undoBtn,
                opacity: history.length === 0 ? 0.45 : 1,
              }}
            >
              Undo
            </button>
            <button
              type="button"
              onClick={() => decide(true)}
              disabled={pending}
              style={{ ...styles.decisionBtn, ...styles.acceptBtn }}
            >
              Accept
            </button>
          </div>
        </div>
      )}
    </Shell>
  )
}

// ── Swipeable card ───────────────────────────────────────────────────
function SwipeCard({
  sketch,
  position,
  total,
  onDecide,
}: {
  sketch: Sketch
  position: number
  total: number
  onDecide: (accepted: boolean) => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-12, 12])
  const acceptOpacity = useTransform(x, [40, 140], [0, 1])
  const rejectOpacity = useTransform(x, [-140, -40], [1, 0])

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 600) {
      onDecide(true)
    } else if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -600) {
      onDecide(false)
    }
  }

  return (
    <motion.div
      style={{ ...styles.card, x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.6}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.96, opacity: 0, y: 8 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={(accepted: boolean) => ({
        x: accepted ? 480 : -480,
        opacity: 0,
        rotate: accepted ? 16 : -16,
        transition: { duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] },
      })}
      whileTap={{ cursor: 'grabbing' }}
    >
      <motion.span
        style={{ ...styles.stamp, ...styles.acceptStamp, opacity: acceptOpacity }}
      >
        Accept
      </motion.span>
      <motion.span
        style={{ ...styles.stamp, ...styles.rejectStamp, opacity: rejectOpacity }}
      >
        Pass
      </motion.span>

      <img
        src={sketch.url}
        alt={`Logo sketch ${position} of ${total}`}
        style={styles.image}
        draggable={false}
      />
      <div style={styles.cardFoot}>
        <span style={styles.cardFootText}>
          Sketch {position} of {total}
        </span>
      </div>
    </motion.div>
  )
}

// ── Done summary ─────────────────────────────────────────────────────
function DoneScreen({
  total,
  accepted,
  rejected,
  canUndo,
  onUndo,
}: {
  total: number
  accepted: number
  rejected: number
  canUndo: boolean
  onUndo: () => void
}) {
  return (
    <div style={styles.done}>
      <h2 style={styles.doneTitle}>All sketches reviewed</h2>
      <p style={styles.mutedBody}>
        Thank you, your choices have been saved. We will take it from here and
        refine the directions you accepted.
      </p>
      <div style={styles.summaryRow}>
        <SummaryStat label="Reviewed" value={total} color={tokens.primary} />
        <SummaryStat label="Accepted" value={accepted} color={tokens.green} />
        <SummaryStat label="Passed" value={rejected} color={tokens.ruby} />
      </div>
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        style={{ ...styles.undoBtn, opacity: canUndo ? 1 : 0.45 }}
      >
        Undo last decision
      </button>
    </div>
  )
}

function SummaryStat({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div style={styles.summaryStat}>
      <span style={{ ...styles.summaryValue, color }}>{value}</span>
      <span style={styles.summaryLabel}>{label}</span>
    </div>
  )
}

// ── Page shell ───────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={styles.page}>
      <main style={styles.container}>{children}</main>
    </div>
  )
}

// ── Styles (theme tokens only) ───────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: tokens.bg, // Atelier cream
    color: tokens.text,
    fontFamily: fonts.body,
  },
  container: {
    maxWidth: 520,
    margin: '0 auto',
    padding: '40px 24px 80px',
  },

  header: { marginBottom: 24, textAlign: 'center' },
  title: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: tokens.text,
  },
  subtitle: {
    margin: '8px 0 0',
    fontSize: 15,
    color: tokens.textMuted,
    lineHeight: '22px',
  },

  // Progress
  progressBlock: { marginBottom: 24 },
  progressMeta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: { fontSize: 13, fontWeight: 600, color: tokens.text },
  counters: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  counter: { fontWeight: 600 },
  counterDivider: { color: tokens.textMuted },
  track: {
    height: 8,
    borderRadius: 999,
    background: tokens.tealLight,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    background: tokens.accent,
    borderRadius: 999,
    transition: 'width 0.3s ease',
  },

  // Deck
  deckWrap: { marginTop: 8 },
  deck: {
    position: 'relative',
    width: '100%',
    aspectRatio: '4 / 5',
    marginBottom: 24,
  },
  backCard: {
    position: 'absolute',
    inset: 0,
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 20,
    overflow: 'hidden',
    transform: 'scale(0.95) translateY(10px)',
    opacity: 0.7,
  },
  card: {
    position: 'absolute',
    inset: 0,
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 20,
    overflow: 'hidden',
    boxShadow: '0 12px 32px rgba(2, 76, 79, 0.12)',
    cursor: 'grab',
    display: 'flex',
    flexDirection: 'column',
    touchAction: 'pan-y',
  },
  image: {
    width: '100%',
    flex: 1,
    minHeight: 0,
    objectFit: 'contain',
    background: tokens.bg,
    userSelect: 'none',
    pointerEvents: 'none',
  },
  cardFoot: {
    padding: '12px 16px',
    borderTop: `1px solid ${tokens.border}`,
    background: tokens.surface,
  },
  cardFootText: { fontSize: 13, color: tokens.textMuted, fontWeight: 500 },

  // Swipe stamps
  stamp: {
    position: 'absolute',
    top: 20,
    padding: '6px 14px',
    borderRadius: 8,
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
    zIndex: 2,
    pointerEvents: 'none',
  },
  acceptStamp: {
    right: 20,
    color: tokens.green,
    border: `2px solid ${tokens.green}`,
    background: tokens.greenLight,
    transform: 'rotate(8deg)',
  },
  rejectStamp: {
    left: 20,
    color: tokens.ruby,
    border: `2px solid ${tokens.ruby}`,
    background: tokens.rubyLight,
    transform: 'rotate(-8deg)',
  },

  // Controls
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  decisionBtn: {
    flex: 1,
    maxWidth: 160,
    padding: '13px 20px',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: 'pointer',
    border: '1px solid transparent',
  },
  acceptBtn: {
    background: tokens.green,
    color: tokens.surface,
  },
  rejectBtn: {
    background: tokens.surface,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
  },
  undoBtn: {
    background: 'transparent',
    border: `1px solid ${tokens.border}`,
    color: tokens.primary,
    padding: '13px 18px',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 500,
    fontFamily: fonts.body,
    cursor: 'pointer',
  },

  // Done
  done: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 16,
    padding: 32,
    textAlign: 'center',
  },
  doneTitle: {
    margin: '0 0 8px',
    fontFamily: fonts.heading,
    fontSize: 22,
    fontWeight: 600,
    color: tokens.text,
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 32,
    margin: '24px 0',
  },
  summaryStat: { display: 'flex', flexDirection: 'column', gap: 4 },
  summaryValue: {
    fontFamily: fonts.heading,
    fontSize: 30,
    fontWeight: 700,
    lineHeight: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: tokens.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: 600,
  },

  // Empty / muted / error
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
  mutedBody: {
    color: tokens.textMuted,
    fontSize: 14,
    lineHeight: '22px',
    margin: 0,
  },
  error: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 13,
    border: `1px solid ${tokens.ruby}33`,
    marginBottom: 16,
  },
}
