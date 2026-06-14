import { useEffect, useState, useCallback, useRef, createContext, useContext } from 'react'
import { AnimatePresence } from 'motion/react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PortalGuard, type PortalProfile } from './PortalGuard'
import { PortalNav } from './PortalNav'
import { SwipeCard, cardStyles } from './SwipeCard'
import { tokens, fonts } from './theme'

// Lets content inside Shell open the "My selections" sheet that Shell owns.
const OpenSelectionsContext = createContext<(() => void) | null>(null)

// ── Data shapes ──────────────────────────────────────────────────────
// logo_sketch_sets.client_id references profiles.id, and the table's RLS
// policy is client_id = auth.uid(), so the signed-in profile id is the
// client id we query by.
type SketchSet = {
  id: string
  name: string | null
  project_slug: string
  set_number: number
  total_count: number
  created_at: string
}

type Sketch = { index: number; fileName: string; url: string }

// A completed set, as recorded in logo_sketch_submissions.
type Submission = {
  set_id: string
  accepted_count: number
  passed_count: number
  completed_at: string
}

const BUCKET = 'logo-sketches'

// Load one set's deck: its storage files plus any prior review decisions.
async function fetchSetDeck(
  setId: string
): Promise<{ sketches: Sketch[]; map: Record<number, boolean>; order: number[] }> {
  const { data: files, error: listErr } = await supabase.storage
    .from(BUCKET)
    .list(setId, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
  if (listErr) throw listErr
  const visible = (files ?? []).filter((f) => f.name && !f.name.startsWith('.'))
  const sketches: Sketch[] = visible.map((f, i) => ({
    index: i,
    fileName: f.name,
    url: supabase.storage.from(BUCKET).getPublicUrl(`${setId}/${f.name}`).data.publicUrl,
  }))

  const { data: prior, error: revErr } = await supabase
    .from('logo_sketch_reviews')
    .select('sketch_index, accepted, reviewed_at')
    .eq('set_id', setId)
    .order('reviewed_at', { ascending: true })
  if (revErr) throw revErr
  const map: Record<number, boolean> = {}
  const order: number[] = []
  for (const r of prior ?? []) {
    map[r.sketch_index as number] = r.accepted as boolean
    order.push(r.sketch_index as number)
  }
  return { sketches, map, order }
}

// ── Route entry: PortalGuard already gates auth and hands us the profile ─
export function SketchReviewPage() {
  return (
    <PortalGuard>
      {(profile) => <SketchReview profile={profile} />}
    </PortalGuard>
  )
}

function SketchReview({ profile }: { profile: PortalProfile }) {
  const [sets, setSets] = useState<SketchSet[]>([])
  const [currentSetId, setCurrentSetId] = useState<string | null>(null)
  const [sketches, setSketches] = useState<Sketch[]>([])
  // index -> accepted, for the current set. Restored on load, updated live.
  const [reviews, setReviews] = useState<Record<number, boolean>>({})
  // order decisions were made in, so Undo can reverse the most recent one.
  const [history, setHistory] = useState<number[]>([])
  // Snapshot of review counts per set, used to tell which OTHER sets remain.
  const [otherCounts, setOtherCounts] = useState<Record<string, number>>({})
  // Completed sets for this client, for the progress line and My selections.
  const [submissions, setSubmissions] = useState<Submission[]>([])
  // The client's display name, for the greeting.
  const [displayName, setDisplayName] = useState<string>('')
  // Theme-styled confirmation dialog config. null means no dialog is open.
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false) // gate while a card animates out
  const [lastDir, setLastDir] = useState<1 | -1>(1) // exit direction for the leaving card
  // A rightward (accept) exit flies the card off-screen, which can grow the
  // page and bump the scroll position. Capture scrollY before that card leaves
  // and restore it once the next card has mounted. Refs avoid a re-render.
  const scrollYRef = useRef(0)
  const restoreScrollRef = useRef(false)

  const currentSet = sets.find((s) => s.id === currentSetId) ?? null

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // 0. The client's display name, for the greeting.
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', profile.id)
          .single()
        if (cancelled) return
        if (prof?.full_name) setDisplayName(prof.full_name as string)

        // 1. All sets for this client, in display order.
        const { data: setRows, error: setErr } = await supabase
          .from('logo_sketch_sets')
          .select('id, name, project_slug, set_number, total_count, created_at')
          .eq('client_id', profile.id)
          .order('set_number', { ascending: true })
        if (setErr) throw setErr
        if (cancelled) return

        // 1b. A set is only shown if BOTH its total_count > 0 AND it actually
        //     has image files in storage. Verify the storage side per set so a
        //     stale total_count with an empty bucket never shows an empty deck.
        const candidates = ((setRows ?? []) as SketchSet[]).filter(
          (s) => s.total_count > 0
        )
        const storageCounts = await Promise.all(
          candidates.map(async (s) => {
            const { data: files } = await supabase.storage
              .from(BUCKET)
              .list(s.id, { limit: 1000 })
            const count = (files ?? []).filter(
              (f) => f.name && !f.name.startsWith('.')
            ).length
            return { id: s.id, count }
          })
        )
        if (cancelled) return
        const hasImages = new Set(
          storageCounts.filter((x) => x.count > 0).map((x) => x.id)
        )
        const all = candidates.filter((s) => hasImages.has(s.id))
        setSets(all)
        if (all.length === 0) {
          setLoading(false)
          return
        }

        // 2. Review counts per set, to pick where to start and what remains.
        const ids = all.map((s) => s.id)
        const { data: revRows, error: revErr } = await supabase
          .from('logo_sketch_reviews')
          .select('set_id')
          .in('set_id', ids)
        if (revErr) throw revErr
        if (cancelled) return
        const counts: Record<string, number> = {}
        for (const r of revRows ?? []) {
          counts[r.set_id as string] = (counts[r.set_id as string] ?? 0) + 1
        }
        setOtherCounts(counts)

        // 2b. Completed sets (submission history) for progress and My selections.
        const { data: subRows } = await supabase
          .from('logo_sketch_submissions')
          .select('set_id, accepted_count, passed_count, completed_at')
          .eq('client_id', profile.id)
          .order('completed_at', { ascending: false })
        if (cancelled) return
        setSubmissions((subRows ?? []) as Submission[])

        // 3. Start on the first not-yet-complete set. If every set is complete,
        //    land on the last one (which shows the summary).
        const chosen =
          all.find((s) => (counts[s.id] ?? 0) < s.total_count) ??
          all[all.length - 1] ??
          null
        if (!chosen) {
          setLoading(false)
          return
        }

        const deck = await fetchSetDeck(chosen.id)
        if (cancelled) return
        setCurrentSetId(chosen.id)
        setSketches(deck.sketches)
        setReviews(deck.map)
        setHistory(deck.order)
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

  // Next reviewable set other than the current one that is not complete.
  const curIdx = sets.findIndex((s) => s.id === currentSetId)
  const incompleteOthers = sets.filter(
    (s) =>
      s.id !== currentSetId &&
      s.total_count > 0 &&
      (otherCounts[s.id] ?? 0) < s.total_count
  )
  const nextSet =
    incompleteOthers.find((s) => sets.indexOf(s) > curIdx) ??
    incompleteOthers[0] ??
    null

  // ── Set position, e.g. "Set 2 of 3" across the visible sets ────────
  const totalSets = sets.length
  const currentPosition = curIdx >= 0 ? curIdx + 1 : 1

  // ── Submission ─────────────────────────────────────────────────────
  // Already submitted if a submission row exists for this client today, or we
  // just submitted in this session. Used to lock the Submit button.
  const todayStr = new Date().toDateString()
  const submittedToday = submissions.some(
    (s) => new Date(s.completed_at).toDateString() === todayStr
  )
  const submitDone = justSubmitted || submittedToday
  // After a submit, the done card is replaced by a success state.
  const showSuccess = done && submitDone

  // Upsert one submission row per fully-reviewed set with its accepted/passed
  // tallies. We read the live review rows so every completed set is counted,
  // not just the one on screen.
  const handleSubmitSelections = useCallback(async () => {
    if (submitting || submitDone) return
    setSubmitting(true)
    setError(null)
    try {
      // client_id must match auth.uid() exactly for the RLS insert policy, so
      // read it straight from the session rather than the clients/profiles table.
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const authUserId = session?.user?.id
      if (!authUserId) {
        setError('Your session has expired. Please sign in again.')
        return
      }
      const ids = sets.map((s) => s.id)
      const { data: revRows, error: revErr } = await supabase
        .from('logo_sketch_reviews')
        .select('set_id, accepted')
        .in('set_id', ids)
      if (revErr) {
        console.error('Failed to load reviews for submission:', revErr)
        setError(revErr.message)
        return
      }
      const agg: Record<string, { accepted: number; passed: number; total: number }> = {}
      for (const r of revRows ?? []) {
        const id = r.set_id as string
        const a = agg[id] ?? { accepted: 0, passed: 0, total: 0 }
        if (r.accepted) a.accepted++
        else a.passed++
        a.total++
        agg[id] = a
      }
      const now = new Date().toISOString()
      const rows = sets
        .filter((s) => s.total_count > 0 && (agg[s.id]?.total ?? 0) >= s.total_count)
        .map((s) => ({
          set_id: s.id,
          client_id: authUserId,
          accepted_count: agg[s.id].accepted,
          passed_count: agg[s.id].passed,
          completed_at: now,
        }))
      if (rows.length === 0) return
      const { error: upErr } = await supabase
        .from('logo_sketch_submissions')
        .insert(rows)
      if (upErr) {
        console.error('Failed to submit selections:', upErr)
        setError(upErr.message)
        return
      }
      setSubmissions((prev) => [
        ...rows.map((r) => ({
          set_id: r.set_id,
          accepted_count: r.accepted_count,
          passed_count: r.passed_count,
          completed_at: r.completed_at,
        })),
        ...prev,
      ])
      setJustSubmitted(true)
    } catch (err) {
      console.error('Unexpected error submitting selections:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }, [submitting, submitDone, sets, profile.id])

  // ── Persistence ────────────────────────────────────────────────────
  // Upsert on the (set_id, sketch_index) unique constraint (migration 0015)
  // so re-reviewing a sketch overwrites its prior decision.
  const persistReview = useCallback(
    async (sketch: Sketch, accepted: boolean) => {
      if (!currentSetId) return
      try {
        const { error: upErr } = await supabase
          .from('logo_sketch_reviews')
          .upsert(
            {
              set_id: currentSetId,
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
    [currentSetId]
  )

  const decide = useCallback(
    (accepted: boolean) => {
      if (pending || !current) return
      setPending(true)
      setError(null)
      setLastDir(accepted ? 1 : -1)
      // Only the rightward (accept) exit causes the scroll jump; capture the
      // position now, before the leaving card unmounts.
      if (accepted) {
        scrollYRef.current = window.scrollY
        restoreScrollRef.current = true
      }
      setReviews((prev) => ({ ...prev, [current.index]: accepted }))
      setHistory((prev) => [...prev, current.index])
      void persistReview(current, accepted)
    },
    [pending, current, persistReview]
  )

  const undo = useCallback(async () => {
    if (pending || history.length === 0 || !currentSetId) return
    const idx = history[history.length - 1]
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
        .eq('set_id', currentSetId)
        .eq('sketch_index', idx)
      if (delErr) throw delErr
    } catch (err) {
      // Restore on failure.
      setReviews((prev) => ({ ...prev, [idx]: prevAccepted }))
      setHistory((prev) => [...prev, idx])
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [pending, history, reviews, currentSetId])

  // ── Move to the next set without a page reload ──────────────────────
  const handleReviewNext = useCallback(async () => {
    if (!nextSet || switching) return
    // Freeze the finished set's count so the "more sets?" check stays right.
    if (currentSetId) {
      setOtherCounts((prev) => ({ ...prev, [currentSetId]: reviewedCount }))
    }
    setSwitching(true)
    setError(null)
    try {
      const deck = await fetchSetDeck(nextSet.id)
      setCurrentSetId(nextSet.id)
      setSketches(deck.sketches)
      setReviews(deck.map)
      setHistory(deck.order)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSwitching(false)
    }
  }, [nextSet, switching, currentSetId, reviewedCount])

  // ── Reset all decisions for the current set ─────────────────────────
  const doStartOver = useCallback(async () => {
    if (!currentSetId) return
    setError(null)
    try {
      const { error: delErr } = await supabase
        .from('logo_sketch_reviews')
        .delete()
        .eq('set_id', currentSetId)
      if (delErr) throw delErr
      setReviews({})
      setHistory([])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [currentSetId])

  const handleStartOver = useCallback(() => {
    setConfirm({
      title: 'Reset this set?',
      body: 'This will clear all your decisions for this set. This action cannot be undone.',
      confirmLabel: 'Reset',
      onConfirm: doStartOver,
    })
  }, [doStartOver])

  // ── Clear every review across all sets and return to the start ──────
  const doResetAll = useCallback(async () => {
    setError(null)
    try {
      const ids = sets.map((s) => s.id)
      if (ids.length > 0) {
        const { error: delErr } = await supabase
          .from('logo_sketch_reviews')
          .delete()
          .in('set_id', ids)
        if (delErr) throw delErr
      }
      setOtherCounts({})
      // Return to Set 1, sketch 1.
      const first = sets.find((s) => s.total_count > 0) ?? null
      if (first) {
        const deck = await fetchSetDeck(first.id)
        setCurrentSetId(first.id)
        setSketches(deck.sketches)
        setReviews(deck.map) // empty after the delete
        setHistory(deck.order)
      } else {
        setReviews({})
        setHistory([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [sets])

  const handleResetAll = useCallback(() => {
    setConfirm({
      title: 'Reset all reviews?',
      body: 'This will clear all your decisions across every set. This action cannot be undone.',
      confirmLabel: 'Reset all',
      onConfirm: doResetAll,
    })
  }, [doResetAll])

  // ── Render ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Shell>
        <p style={styles.muted}>Loading sketches...</p>
      </Shell>
    )
  }

  if (error && !currentSet) {
    return (
      <Shell>
        <div style={styles.error}>Error: {error}</div>
      </Shell>
    )
  }

  if (!currentSet) {
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
    <Shell
      submissions={submissions}
      setNames={Object.fromEntries(
        sets.map((s) => [s.id, s.name ?? `Set ${s.set_number}`])
      )}
      onResetAll={handleResetAll}
    >
      <div style={styles.header}>
        <h1 style={styles.title}>Review your logo sketches</h1>
        <p style={styles.subtitle}>
          Swipe right to accept, swipe left to pass. You can undo any decision.
        </p>
        {displayName && (
          <p style={styles.greeting}>
            Hi {displayName}, here are your sketches.
          </p>
        )}
        <p style={styles.setLabel}>
          Set {currentPosition} of {totalSets}
        </p>
      </div>

      {/* Progress (hidden once submitted) */}
      {!showSuccess && (
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
      )}

      {error && <div style={styles.error}>Error: {error}</div>}

      {switching ? (
        <p style={styles.muted}>Loading set...</p>
      ) : showSuccess ? (
        <SubmittedScreen />
      ) : done ? (
        <DoneScreen
          total={total}
          accepted={acceptedCount}
          rejected={rejectedCount}
          canUndo={history.length > 0 && !pending}
          onUndo={undo}
          nextSet={nextSet}
          onReviewNext={handleReviewNext}
          onStartOver={handleStartOver}
          onSubmit={handleSubmitSelections}
          submitDisabled={submitDone || submitting}
          submitLabel={
            submitDone ? 'Submitted' : submitting ? 'Submitting…' : 'Submit my selections'
          }
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
                  style={cardStyles.image}
                  draggable={false}
                />
              </div>
            )}

            <AnimatePresence
              custom={lastDir}
              onExitComplete={() => {
                setPending(false)
                // The next card is mounted by now; put the scroll back where it
                // was before the accept exit so the page does not jump.
                if (restoreScrollRef.current) {
                  const y = scrollYRef.current
                  restoreScrollRef.current = false
                  requestAnimationFrame(() => window.scrollTo(0, y))
                }
              }}
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

      {confirm && (
        <ConfirmDialog
          config={confirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </Shell>
  )
}

// ── Post-submit success state ────────────────────────────────────────
function SubmittedScreen() {
  const openSelections = useContext(OpenSelectionsContext)
  return (
    <div style={styles.success}>
      <div style={styles.successCircle}>
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke={tokens.surface}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <h2 style={styles.successTitle}>Selections submitted.</h2>
      <p style={styles.successBody}>We will be in touch soon.</p>
      <button
        type="button"
        onClick={() => openSelections?.()}
        style={styles.successLink}
      >
        View your selections
      </button>
    </div>
  )
}

// ── Done summary ─────────────────────────────────────────────────────
function DoneScreen({
  total,
  accepted,
  rejected,
  canUndo,
  onUndo,
  nextSet,
  onReviewNext,
  onStartOver,
  onSubmit,
  submitDisabled,
  submitLabel,
}: {
  total: number
  accepted: number
  rejected: number
  canUndo: boolean
  onUndo: () => void
  nextSet: SketchSet | null
  onReviewNext: () => void
  onStartOver: () => void
  onSubmit: () => void
  submitDisabled: boolean
  submitLabel: string
}) {
  return (
    <div style={styles.done}>
      <h2 style={styles.doneTitle}>All sketches reviewed</h2>
      <p style={styles.mutedBody}>
        {nextSet
          ? 'Nice work, this set is complete. Your choices have been saved.'
          : 'All sets complete. We will be in touch soon.'}
      </p>
      <div style={styles.summaryRow}>
        <SummaryStat label="Reviewed" value={total} color={tokens.primary} />
        <SummaryStat label="Accepted" value={accepted} color={tokens.green} />
        <SummaryStat label="Passed" value={rejected} color={tokens.ruby} />
      </div>

      {nextSet && (
        <button type="button" onClick={onReviewNext} style={styles.nextBtn}>
          Review next set
        </button>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitDisabled}
        style={{
          ...styles.submitBtn,
          opacity: submitDisabled ? 0.6 : 1,
          cursor: submitDisabled ? 'default' : 'pointer',
        }}
      >
        {submitLabel}
      </button>

      <div style={styles.doneActions}>
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          style={{ ...styles.undoBtn, opacity: canUndo ? 1 : 0.45 }}
        >
          Undo last decision
        </button>
      </div>

      <button type="button" onClick={onStartOver} style={styles.startOverLink}>
        Start over
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
// The footer row carries "Reset all reviews" on the left and a "View
// selections" link on the right, which opens an inline sheet (no page
// navigation) listing every set this client has completed. Shell owns the
// sheet's open state so every render branch shares one implementation.
function Shell({
  children,
  submissions = [],
  setNames = {},
  onResetAll,
}: {
  children: React.ReactNode
  submissions?: Submission[]
  setNames?: Record<string, string>
  onResetAll?: () => void
}) {
  const [selectionsOpen, setSelectionsOpen] = useState(false)
  return (
    <div style={styles.page}>
      <PortalNav showSignOut />
      <main style={styles.container}>
        <OpenSelectionsContext.Provider value={() => setSelectionsOpen(true)}>
          {children}
        </OpenSelectionsContext.Provider>
        <div style={styles.footerRow}>
          {onResetAll ? (
            <button type="button" onClick={onResetAll} style={styles.resetAllBtn}>
              Reset all reviews
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => setSelectionsOpen(true)}
            style={styles.viewSelectionsLink}
          >
            View selections
          </button>
        </div>
      </main>
      {selectionsOpen && (
        <SelectionsModal
          submissions={submissions}
          setNames={setNames}
          onClose={() => setSelectionsOpen(false)}
        />
      )}
    </div>
  )
}

// ── My selections sheet ──────────────────────────────────────────────
function SelectionsModal({
  submissions,
  setNames,
  onClose,
}: {
  submissions: Submission[]
  setNames: Record<string, string>
  onClose: () => void
}) {
  // Accepted-sketches lightbox. `lightbox` is the set being viewed (null when
  // closed); `viewIndex` is null for the grid and a number for full-size.
  const [lightbox, setLightbox] = useState<{ setId: string; label: string } | null>(null)
  const [images, setImages] = useState<{ name: string; url: string }[]>([])
  const [lightboxLoading, setLightboxLoading] = useState(false)
  const [viewIndex, setViewIndex] = useState<number | null>(null)

  // Reviews are keyed per set (one set belongs to one client), so the accepted
  // sketches for a submission are that set's rows where accepted = true. We use
  // the stored file_name to build the public URL, the same pattern as the deck.
  async function openAccepted(setId: string, label: string) {
    setLightbox({ setId, label })
    setViewIndex(null)
    setImages([])
    setLightboxLoading(true)
    try {
      const { data, error } = await supabase
        .from('logo_sketch_reviews')
        .select('sketch_index, file_name, accepted')
        .eq('set_id', setId)
        .eq('accepted', true)
        .order('sketch_index', { ascending: true })
      if (error) throw error
      const imgs = (data ?? [])
        .filter((r) => r.file_name)
        .map((r) => ({
          name: r.file_name as string,
          url: supabase.storage
            .from(BUCKET)
            .getPublicUrl(`${setId}/${r.file_name as string}`).data.publicUrl,
        }))
      setImages(imgs)
    } catch (err) {
      console.error('Failed to load accepted sketches:', err)
    } finally {
      setLightboxLoading(false)
    }
  }

  function closeLightbox() {
    setLightbox(null)
    setViewIndex(null)
    setImages([])
  }

  return (
    <>
      <div style={styles.overlay} onClick={onClose}>
        <div
          style={styles.sheet}
          role="dialog"
          aria-modal="true"
          aria-label="My selections"
          onClick={(e) => e.stopPropagation()}
        >
          <div style={styles.sheetHead}>
            <h2 style={styles.sheetTitle}>My selections</h2>
            <button
              type="button"
              onClick={onClose}
              style={styles.sheetClose}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          {submissions.length === 0 ? (
            <p style={styles.mutedBody}>No completed sets yet.</p>
          ) : (
            <div style={styles.selectionList}>
              {submissions.map((s, i) => {
                const label = setNames[s.set_id] ?? 'Set'
                return (
                  <div key={`${s.set_id}-${i}`} style={styles.selectionRow}>
                    <div style={styles.selectionTop}>
                      <span style={styles.selectionName}>{label}</span>
                      <span style={styles.selectionDate}>
                        {formatDate(s.completed_at)}
                      </span>
                    </div>
                    <div style={styles.selectionBottom}>
                      <div style={styles.selectionCounts}>
                        <span style={{ color: tokens.green, fontWeight: 600 }}>
                          {s.accepted_count} accepted
                        </span>
                        <span style={styles.counterDivider}>·</span>
                        <span style={{ color: tokens.ruby, fontWeight: 600 }}>
                          {s.passed_count} passed
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAccepted(s.set_id, label)}
                        style={styles.viewAcceptedLink}
                      >
                        View accepted sketches
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <div
          style={styles.lbOverlay}
          onClick={viewIndex === null ? closeLightbox : () => setViewIndex(null)}
        >
          <div style={styles.lbTitle}>{lightbox.label}</div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              closeLightbox()
            }}
            style={styles.lbClose}
            aria-label="Close"
          >
            <X size={22} />
          </button>

          {lightboxLoading ? (
            <p style={styles.lbEmpty}>Loading accepted sketches...</p>
          ) : images.length === 0 ? (
            <p style={styles.lbEmpty}>No accepted sketches for this set.</p>
          ) : viewIndex === null ? (
            <div style={styles.lbGrid} onClick={(e) => e.stopPropagation()}>
              {images.map((img, i) => (
                <button
                  key={img.name}
                  type="button"
                  style={styles.lbThumbBtn}
                  onClick={() => setViewIndex(i)}
                >
                  <img src={img.url} alt={img.name} style={styles.lbThumb} />
                </button>
              ))}
            </div>
          ) : (
            <div style={styles.lbStage} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() =>
                  setViewIndex((i) => ((i as number) - 1 + images.length) % images.length)
                }
                style={styles.lbNav}
                aria-label="Previous"
              >
                <ChevronLeft size={28} />
              </button>
              <img
                src={images[viewIndex].url}
                alt={images[viewIndex].name}
                style={styles.lbFull}
              />
              <button
                type="button"
                onClick={() => setViewIndex((i) => ((i as number) + 1) % images.length)}
                style={styles.lbNav}
                aria-label="Next"
              >
                <ChevronRight size={28} />
              </button>
            </div>
          )}

          {viewIndex !== null && images.length > 0 && (
            <div style={styles.lbCounter}>
              {viewIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ── Theme-styled confirmation dialog (replaces window.confirm) ───────
type ConfirmConfig = {
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void | Promise<void>
}

function ConfirmDialog({
  config,
  onClose,
}: {
  config: ConfirmConfig
  onClose: () => void
}) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-label={config.title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={styles.dialogTitle}>{config.title}</h2>
        <p style={styles.dialogBody}>{config.body}</p>
        <div style={styles.dialogActions}>
          <button type="button" onClick={onClose} style={styles.dialogCancel}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              void config.onConfirm()
              onClose()
            }}
            style={styles.dialogConfirm}
          >
            {config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
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
  setLabel: {
    margin: '10px 0 0',
    display: 'inline-block',
    fontFamily: fonts.heading,
    fontSize: 13,
    fontWeight: 600,
    color: tokens.primary,
    background: tokens.tealLight,
    borderRadius: 999,
    padding: '4px 14px',
  },
  greeting: {
    margin: '12px 0 0',
    fontFamily: fonts.heading,
    fontSize: 17,
    fontWeight: 600,
    color: tokens.text,
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
  nextBtn: {
    width: '100%',
    background: tokens.accent,
    color: tokens.surface,
    border: 'none',
    borderRadius: 12,
    padding: '14px 20px',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: 'pointer',
  },
  submitBtn: {
    width: '100%',
    background: tokens.primary,
    color: tokens.surface,
    border: 'none',
    borderRadius: 12,
    padding: '14px 20px',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: fonts.body,
    marginTop: 12,
  },
  doneActions: {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
    marginTop: 14,
  },
  startOverLink: {
    background: 'transparent',
    border: 'none',
    color: tokens.textMuted,
    fontSize: 13,
    fontFamily: fonts.body,
    textDecoration: 'underline',
    cursor: 'pointer',
    marginTop: 14,
    padding: 0,
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
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 32,
  },
  viewSelectionsLink: {
    fontSize: 13,
    color: tokens.textMuted,
    textDecoration: 'underline',
    background: 'transparent',
    border: 'none',
    fontFamily: fonts.body,
    cursor: 'pointer',
    padding: 0,
  },
  resetAllBtn: {
    background: 'transparent',
    border: 'none',
    color: tokens.ruby,
    fontSize: 13,
    fontFamily: fonts.body,
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
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

  // Post-submit success card
  success: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 16,
    padding: 32,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  successCircle: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: tokens.green,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 22,
    fontWeight: 600,
    color: tokens.text,
  },
  successBody: {
    margin: '8px 0 24px',
    fontSize: 14,
    color: tokens.textMuted,
  },
  successLink: {
    background: 'transparent',
    border: 'none',
    color: tokens.primary, // teal
    fontSize: 13,
    fontFamily: fonts.body,
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
  },

  // Overlay shared by the selections sheet and confirm dialog
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 26, 27, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 50,
  },

  // My selections sheet
  sheet: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '80vh',
    overflowY: 'auto',
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 16px 48px rgba(2, 76, 79, 0.22)',
  },
  sheetHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 20,
    fontWeight: 600,
    color: tokens.text,
  },
  sheetClose: {
    background: 'transparent',
    border: 'none',
    color: tokens.textMuted,
    fontSize: 24,
    lineHeight: 1,
    cursor: 'pointer',
    padding: 0,
  },
  selectionList: { display: 'flex', flexDirection: 'column', gap: 12 },
  selectionRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    padding: '12px 14px',
    borderRadius: 10,
    background: tokens.bg,
    border: `1px solid ${tokens.border}`,
  },
  selectionTop: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 10,
  },
  selectionName: {
    fontFamily: fonts.heading,
    fontSize: 15,
    fontWeight: 600,
    color: tokens.text,
  },
  selectionDate: { fontSize: 12, color: tokens.textMuted },
  selectionBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  selectionCounts: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
  },
  viewAcceptedLink: {
    background: 'transparent',
    border: 'none',
    color: tokens.primary, // teal
    fontSize: 12,
    fontFamily: fonts.body,
    fontWeight: 600,
    textDecoration: 'underline',
    cursor: 'pointer',
    padding: 0,
  },

  // Accepted sketches lightbox
  lbOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.9)',
    zIndex: 110,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  lbTitle: {
    position: 'absolute',
    top: 18,
    left: 20,
    color: tokens.surface,
    fontFamily: fonts.heading,
    fontSize: 15,
    fontWeight: 600,
  },
  lbClose: {
    position: 'absolute',
    top: 14,
    right: 16,
    background: 'transparent',
    border: 'none',
    color: tokens.surface,
    cursor: 'pointer',
    padding: 8,
    display: 'flex',
    zIndex: 2,
  },
  lbEmpty: { color: tokens.surface, fontSize: 14 },
  lbGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: 12,
    width: '100%',
    maxWidth: 900,
    maxHeight: '82vh',
    overflowY: 'auto',
    padding: '8px 4px',
  },
  lbThumbBtn: { background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' },
  lbThumb: {
    width: '100%',
    aspectRatio: '1 / 1',
    objectFit: 'cover',
    borderRadius: 8,
    display: 'block',
  },
  lbStage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
    maxWidth: 1000,
  },
  lbFull: {
    maxWidth: '78vw',
    maxHeight: '82vh',
    objectFit: 'contain',
    borderRadius: 8,
  },
  lbNav: {
    background: 'rgba(255, 255, 255, 0.12)',
    border: 'none',
    color: tokens.surface,
    cursor: 'pointer',
    borderRadius: '50%',
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  lbCounter: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    color: tokens.surface,
    fontSize: 13,
  },

  // Confirm dialog
  dialog: {
    width: '100%',
    maxWidth: 380,
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 16px 48px rgba(2, 76, 79, 0.22)',
  },
  dialogTitle: {
    margin: '0 0 8px',
    fontFamily: fonts.heading,
    fontSize: 19,
    fontWeight: 600,
    color: tokens.text,
  },
  dialogBody: {
    margin: 0,
    fontSize: 14,
    lineHeight: '21px',
    color: tokens.textMuted,
  },
  dialogActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 22,
  },
  dialogCancel: {
    background: 'transparent',
    border: `1px solid ${tokens.border}`,
    color: tokens.primary,
    borderRadius: 10,
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 500,
    fontFamily: fonts.body,
    cursor: 'pointer',
  },
  dialogConfirm: {
    background: tokens.ruby,
    border: '1px solid transparent',
    color: tokens.surface,
    borderRadius: 10,
    padding: '10px 18px',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: 'pointer',
  },
}
