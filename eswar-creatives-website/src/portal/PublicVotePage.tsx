import { useEffect, useState, createContext, useContext } from 'react'
import { useParams } from 'react-router'
import { AnimatePresence } from 'motion/react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import confetti from 'canvas-confetti'
import { supabase } from '../lib/supabase'
import { SwipeCard, cardStyles } from './SwipeCard'
import { tokens, fonts } from './theme'

// Public, no-login voting page (/portal/vote/:token). A voter answers the
// campaign's detail fields one screen at a time, then reviews each set of
// sketches with the same swipe UI as the client flow (SketchReviewPage). All
// decisions are kept in local state until Submit, which writes one public_votes
// row per decision. No Supabase session is required (migrations 0019-0022).

const BUCKET = 'logo-sketches'

const GENDER_OPTIONS = ['Prefer not to say', 'Male', 'Female', 'Non-binary', 'Other']

// Lets the submitted screen open the "View selections" sheet that Shell owns.
const OpenSelectionsContext = createContext<(() => void) | null>(null)

type Campaign = {
  id: string
  campaign_title: string
  project_name: string
  collect_name: boolean
  name_required: boolean
  collect_age: boolean
  age_required: boolean
  collect_gender: boolean
  gender_required: boolean
  collect_mobile: boolean
  mobile_required: boolean
  mobile_placeholder: string | null
}

type SetRow = { id: string; name: string | null; set_number: number }
type Sketch = { index: number; url: string }
type FieldKey = 'name' | 'age' | 'gender' | 'mobile'
type FormField = { key: FieldKey; label: string; required: boolean; type: string }
type ConfirmConfig = { title: string; body: string; confirmLabel: string; onConfirm: () => void }
// A completed (or in-progress) set summary for the View selections sheet.
type Completed = {
  setId: string
  label: string
  accepted: number
  passed: number
  acceptedImages: { url: string }[]
}

// Confetti: fire once from both bottom corners on submit success.
function fireConfetti() {
  const colors = [tokens.primary, tokens.gold, tokens.green, tokens.bg]
  confetti({ particleCount: 120, angle: 60, spread: 70, startVelocity: 45, origin: { x: 0, y: 1 }, colors })
  confetti({ particleCount: 120, angle: 120, spread: 70, startVelocity: 45, origin: { x: 1, y: 1 }, colors })
}

export function PublicVotePage() {
  const { token } = useParams<{ token: string }>()

  const [loading, setLoading] = useState(true)
  const [campaign, setCampaign] = useState<Campaign | null>(null)

  const [step, setStep] = useState<'form' | 'vote'>('form')
  const [formStep, setFormStep] = useState(0)
  const [voter, setVoter] = useState({ name: '', age: '', gender: '', mobile: '' })
  const [formError, setFormError] = useState<string | null>(null)

  const [deckLoading, setDeckLoading] = useState(false)
  const [sets, setSets] = useState<SetRow[]>([])
  const [sketchesBySet, setSketchesBySet] = useState<Record<string, Sketch[]>>({})
  const [currentSetId, setCurrentSetId] = useState<string | null>(null)
  // index -> accepted (true = Accept/green/pass), per set. Local until submit.
  const [reviewsBySet, setReviewsBySet] = useState<Record<string, Record<number, boolean>>>({})
  // order decisions were made in, per set, so Undo can reverse the most recent.
  const [historyBySet, setHistoryBySet] = useState<Record<string, number[]>>({})

  const [pending, setPending] = useState(false)
  const [lastDir, setLastDir] = useState<1 | -1>(1)
  const [confirm, setConfirm] = useState<ConfirmConfig | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Load the campaign by token (must be active) ────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!token) {
        setLoading(false)
        return
      }
      try {
        const { data, error: err } = await supabase
          .from('public_campaigns')
          .select(
            'id, campaign_title, project_name, collect_name, name_required, collect_age, age_required, collect_gender, gender_required, collect_mobile, mobile_required, mobile_placeholder'
          )
          .eq('voting_token', token)
          .eq('status', 'active')
          .maybeSingle()
        if (err) throw err
        if (cancelled) return
        setCampaign((data as Campaign) ?? null)
      } catch {
        if (!cancelled) setCampaign(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  // ── Voter detail stepper ───────────────────────────────────────────
  const formFields: FormField[] = campaign
    ? ([
        campaign.collect_name && { key: 'name', label: 'Name', required: campaign.name_required, type: 'text' },
        campaign.collect_age && { key: 'age', label: 'Age', required: campaign.age_required, type: 'number' },
        campaign.collect_gender && { key: 'gender', label: 'Gender', required: campaign.gender_required, type: 'select' },
        campaign.collect_mobile && { key: 'mobile', label: 'Mobile number', required: campaign.mobile_required, type: 'tel' },
      ].filter(Boolean) as FormField[])
    : []
  const currentField = formFields[formStep] ?? null
  const isLastField = formStep >= formFields.length - 1

  function goNextField() {
    const f = formFields[formStep]
    if (f && f.required && !String(voter[f.key]).trim()) {
      setFormError('This field is required.')
      return
    }
    setFormError(null)
    if (isLastField) void startVoting()
    else setFormStep((s) => s + 1)
  }

  function goPrevField() {
    setFormError(null)
    setFormStep((s) => Math.max(0, s - 1))
  }

  // ── Load every set's deck, then begin voting ───────────────────────
  async function startVoting() {
    if (!campaign) return
    setDeckLoading(true)
    setStep('vote')
    try {
      const { data: setRows, error: setErr } = await supabase
        .from('logo_sketch_sets')
        .select('id, name, set_number')
        .eq('campaign_id', campaign.id)
        .order('set_number', { ascending: true })
      if (setErr) throw setErr

      const bySet: Record<string, Sketch[]> = {}
      for (const s of (setRows ?? []) as SetRow[]) {
        const { data: files } = await supabase.storage
          .from(BUCKET)
          .list(s.id, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
        const visible = (files ?? []).filter((f) => f.name && !f.name.startsWith('.'))
        bySet[s.id] = visible.map((f, i) => ({
          index: i,
          url: supabase.storage.from(BUCKET).getPublicUrl(`${s.id}/${f.name}`).data.publicUrl,
        }))
      }
      const withImages = ((setRows ?? []) as SetRow[]).filter((s) => (bySet[s.id]?.length ?? 0) > 0)
      setSketchesBySet(bySet)
      setSets(withImages)
      setCurrentSetId(withImages[0]?.id ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setDeckLoading(false)
    }
  }

  // ── Derived state for the current set ──────────────────────────────
  const currentSet = sets.find((s) => s.id === currentSetId) ?? null
  const sketches = (currentSetId && sketchesBySet[currentSetId]) || []
  const reviews = (currentSetId && reviewsBySet[currentSetId]) || {}
  const history = (currentSetId && historyBySet[currentSetId]) || []

  const total = sketches.length
  const reviewedCount = Object.keys(reviews).length
  const acceptedCount = Object.values(reviews).filter(Boolean).length
  const rejectedCount = reviewedCount - acceptedCount
  const remaining = sketches.filter((s) => !(s.index in reviews))
  const current = remaining[0] ?? null
  const next = remaining[1] ?? null
  const done = total > 0 && remaining.length === 0

  const reviewedOf = (id: string) => Object.keys(reviewsBySet[id] ?? {}).length
  const totalOf = (id: string) => sketchesBySet[id]?.length ?? 0
  const curIdx = sets.findIndex((s) => s.id === currentSetId)
  const incompleteOthers = sets.filter(
    (s) => s.id !== currentSetId && totalOf(s.id) > 0 && reviewedOf(s.id) < totalOf(s.id)
  )
  const nextSet =
    incompleteOthers.find((s) => sets.indexOf(s) > curIdx) ?? incompleteOthers[0] ?? null
  const totalSets = sets.length
  const currentPosition = curIdx >= 0 ? curIdx + 1 : 1

  const allReviewed =
    sets.length > 0 && sets.every((s) => totalOf(s.id) > 0 && reviewedOf(s.id) >= totalOf(s.id))
  const showSuccess = justSubmitted

  // Finishing a set unmounts the deck mid-exit, so onExitComplete may not clear
  // `pending`. Clear it here so the next set's first card is not stuck.
  useEffect(() => {
    if (done) setPending(false)
  }, [done])

  // ── Decisions (local only) ─────────────────────────────────────────
  function decide(accepted: boolean) {
    if (pending || !current || !currentSetId) return
    setPending(true)
    setLastDir(accepted ? 1 : -1)
    const idx = current.index
    setReviewsBySet((prev) => ({
      ...prev,
      [currentSetId]: { ...(prev[currentSetId] ?? {}), [idx]: accepted },
    }))
    setHistoryBySet((prev) => ({
      ...prev,
      [currentSetId]: [...(prev[currentSetId] ?? []), idx],
    }))
  }

  function undo() {
    if (pending || history.length === 0 || !currentSetId) return
    const idx = history[history.length - 1]
    setHistoryBySet((prev) => ({ ...prev, [currentSetId]: (prev[currentSetId] ?? []).slice(0, -1) }))
    setReviewsBySet((prev) => {
      const nextMap = { ...(prev[currentSetId] ?? {}) }
      delete nextMap[idx]
      return { ...prev, [currentSetId]: nextMap }
    })
  }

  function handleReviewNext() {
    if (!nextSet) return
    setCurrentSetId(nextSet.id)
    setPending(false)
  }

  function doStartOver() {
    if (!currentSetId) return
    setReviewsBySet((prev) => ({ ...prev, [currentSetId]: {} }))
    setHistoryBySet((prev) => ({ ...prev, [currentSetId]: [] }))
  }

  function doResetAll() {
    setReviewsBySet({})
    setHistoryBySet({})
    setPending(false)
    setCurrentSetId(sets[0]?.id ?? null)
  }

  const handleStartOver = () =>
    setConfirm({
      title: 'Reset this set?',
      body: 'This will clear all your decisions for this set. This action cannot be undone.',
      confirmLabel: 'Reset',
      onConfirm: doStartOver,
    })
  const handleResetAll = () =>
    setConfirm({
      title: 'Reset all reviews?',
      body: 'This will clear all your decisions across every set. This action cannot be undone.',
      confirmLabel: 'Reset all',
      onConfirm: doResetAll,
    })

  // ── Submit every decision as public_votes rows ─────────────────────
  async function handleSubmit() {
    if (!campaign || submitting || justSubmitted) return
    setSubmitting(true)
    setError(null)
    try {
      const rows: Record<string, unknown>[] = []
      for (const s of sets) {
        const r = reviewsBySet[s.id] ?? {}
        for (const [idxStr, accepted] of Object.entries(r)) {
          rows.push({
            campaign_id: campaign.id,
            set_id: s.id,
            voter_name: campaign.collect_name ? voter.name.trim() || null : null,
            voter_age: campaign.collect_age ? voter.age.trim() || null : null,
            voter_gender: campaign.collect_gender ? voter.gender || null : null,
            voter_mobile: campaign.collect_mobile ? voter.mobile.trim() || null : null,
            sketch_index: Number(idxStr),
            decision: accepted ? 'pass' : 'reject',
          })
        }
      }
      if (rows.length === 0) {
        setSubmitting(false)
        return
      }
      const { error: insErr } = await supabase.from('public_votes').insert(rows)
      if (insErr) throw insErr
      setJustSubmitted(true)
      fireConfetti()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  // Completed-set summaries for the View selections sheet (local decisions).
  const completed: Completed[] = sets
    .map((s) => {
      const r = reviewsBySet[s.id] ?? {}
      const keys = Object.keys(r)
      if (keys.length === 0) return null
      const accepted = keys.filter((k) => r[Number(k)]).length
      return {
        setId: s.id,
        label: s.name ?? `Set ${s.set_number}`,
        accepted,
        passed: keys.length - accepted,
        acceptedImages: (sketchesBySet[s.id] ?? [])
          .filter((sk) => r[sk.index] === true)
          .map((sk) => ({ url: sk.url })),
      }
    })
    .filter(Boolean) as Completed[]

  // ── Render ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Shell completed={[]}>
        <p style={styles.muted}>Loading...</p>
      </Shell>
    )
  }

  if (!campaign) {
    return (
      <Shell completed={[]}>
        <div style={styles.empty}>
          <h2 style={styles.emptyTitle}>This voting link is not active.</h2>
          <p style={styles.mutedBody}>
            The campaign may not have started yet or has been closed. Please check
            with whoever shared the link.
          </p>
        </div>
      </Shell>
    )
  }

  // ── Step 1: voter details stepper ──────────────────────────────────
  if (step === 'form') {
    return (
      <Shell completed={[]} hideFooter>
        <div style={styles.stepper}>
          <div style={styles.stepHead}>
            <h1 style={styles.stepCampaign}>{campaign.campaign_title}</h1>
            <p style={styles.stepProject}>{campaign.project_name}</p>
          </div>

          {formFields.length === 0 ? (
            <div style={styles.stepBody}>
              <p style={styles.mutedBody}>Ready when you are.</p>
              <button type="button" onClick={startVoting} style={styles.primaryBtn}>
                Start voting →
              </button>
            </div>
          ) : (
            <>
              <div style={styles.stepTopBar}>
                {formStep > 0 ? (
                  <button type="button" onClick={goPrevField} style={styles.backBtn} aria-label="Back">
                    <ChevronLeft size={22} />
                  </button>
                ) : (
                  <span style={{ width: 40 }} />
                )}
              </div>

              {currentField && (
                <div style={styles.stepBody}>
                  <label style={styles.stepLabel} htmlFor="vote-field">
                    {currentField.label}
                    {currentField.required && <span style={styles.req}> *</span>}
                  </label>
                  {currentField.type === 'select' ? (
                    <select
                      id="vote-field"
                      value={voter.gender}
                      onChange={(e) => setVoter((v) => ({ ...v, gender: e.target.value }))}
                      style={styles.stepInput}
                    >
                      <option value="">Select...</option>
                      {GENDER_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="vote-field"
                      autoFocus
                      type={currentField.type === 'number' ? 'text' : currentField.type}
                      inputMode={currentField.type === 'number' ? 'numeric' : undefined}
                      value={voter[currentField.key]}
                      onChange={(e) => setVoter((v) => ({ ...v, [currentField.key]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          goNextField()
                        }
                      }}
                      placeholder={currentField.key === 'mobile' ? campaign.mobile_placeholder ?? '' : ''}
                      style={styles.stepInput}
                    />
                  )}
                  {formError && <p style={styles.stepError}>{formError}</p>}
                </div>
              )}

              <div style={styles.stepDots} aria-hidden>
                {formFields.map((f, i) => (
                  <span
                    key={f.key}
                    style={{
                      ...styles.dot,
                      background: i === formStep ? tokens.primary : tokens.border,
                      width: i === formStep ? 24 : 8,
                    }}
                  />
                ))}
              </div>

              <button type="button" onClick={goNextField} style={styles.primaryBtn}>
                {isLastField ? 'Start voting →' : 'Next'}
              </button>
            </>
          )}
        </div>
      </Shell>
    )
  }

  // ── Step 2: voting (mirrors SketchReviewPage) ──────────────────────
  return (
    <Shell completed={completed} onResetAll={allReviewed || reviewedCount > 0 ? handleResetAll : undefined}>
      <div style={styles.header}>
        <h1 style={styles.title}>Review your logo sketches</h1>
        <p style={styles.subtitle}>
          Swipe right to accept, swipe left to pass. You can undo any decision.
        </p>
        <p style={styles.greeting}>{campaign.campaign_title}</p>
        {currentSet && (
          <p style={styles.setLabel}>
            Set {currentPosition} of {totalSets}
          </p>
        )}
      </div>

      {!showSuccess && currentSet && (
        <div style={styles.progressBlock}>
          <div style={styles.progressMeta}>
            <span style={styles.progressLabel}>
              {reviewedCount} of {total} reviewed
            </span>
            <span style={styles.counters}>
              <span style={{ ...styles.counter, color: tokens.green }}>{acceptedCount} accepted</span>
              <span style={styles.counterDivider}>·</span>
              <span style={{ ...styles.counter, color: tokens.ruby }}>{rejectedCount} passed</span>
            </span>
          </div>
          <div style={styles.track}>
            <div style={{ ...styles.fill, width: `${total ? (reviewedCount / total) * 100 : 0}%` }} />
          </div>
        </div>
      )}

      {error && <div style={styles.error}>{error}</div>}

      {deckLoading ? (
        <p style={styles.muted}>Loading sketches...</p>
      ) : sets.length === 0 ? (
        <div style={styles.empty}>
          <h2 style={styles.emptyTitle}>No sketches to review yet.</h2>
          <p style={styles.mutedBody}>Please check back soon.</p>
        </div>
      ) : showSuccess ? (
        <SubmittedScreen />
      ) : done ? (
        <DoneScreen
          total={total}
          accepted={acceptedCount}
          rejected={rejectedCount}
          canUndo={history.length > 0 && !pending}
          onUndo={undo}
          hasNextSet={!!nextSet}
          onReviewNext={handleReviewNext}
          onStartOver={handleStartOver}
          onSubmit={handleSubmit}
          submitDisabled={submitting}
          submitLabel={submitting ? 'Submitting…' : 'Submit my selections'}
        />
      ) : (
        <div style={styles.deckWrap}>
          <div style={styles.deck}>
            {next && (
              <div style={styles.backCard}>
                <img src={next.url} alt="" aria-hidden style={cardStyles.image} draggable={false} />
              </div>
            )}
            <AnimatePresence custom={lastDir} onExitComplete={() => setPending(false)}>
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
              style={{ ...styles.undoBtn, opacity: history.length === 0 ? 0.45 : 1 }}
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

      {confirm && <ConfirmDialog config={confirm} onClose={() => setConfirm(null)} />}
    </Shell>
  )
}

// ── Post-submit success state ────────────────────────────────────────
function SubmittedScreen() {
  const openSelections = useContext(OpenSelectionsContext)
  return (
    <div style={styles.success}>
      <div style={styles.successCircle}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={tokens.surface} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>
      <h2 style={styles.successTitle}>Thank you for voting!</h2>
      <p style={styles.successBody}>Your selections have been submitted.</p>
      <button type="button" onClick={() => openSelections?.()} style={styles.successLink}>
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
  hasNextSet,
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
  hasNextSet: boolean
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
        {hasNextSet
          ? 'Nice work, this set is complete.'
          : 'All sets complete. Submit to send us your selections.'}
      </p>
      <div style={styles.summaryRow}>
        <SummaryStat label="Reviewed" value={total} color={tokens.primary} />
        <SummaryStat label="Accepted" value={accepted} color={tokens.green} />
        <SummaryStat label="Passed" value={rejected} color={tokens.ruby} />
      </div>

      {hasNextSet && (
        <button type="button" onClick={onReviewNext} style={styles.nextBtn}>
          Review next set
        </button>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitDisabled}
        style={{ ...styles.submitBtn, opacity: submitDisabled ? 0.6 : 1, cursor: submitDisabled ? 'default' : 'pointer' }}
      >
        {submitLabel}
      </button>

      <div style={styles.doneActions}>
        <button type="button" onClick={onUndo} disabled={!canUndo} style={{ ...styles.undoBtn, opacity: canUndo ? 1 : 0.45 }}>
          Undo last decision
        </button>
      </div>

      <button type="button" onClick={onStartOver} style={styles.startOverLink}>
        Start over
      </button>
    </div>
  )
}

function SummaryStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={styles.summaryStat}>
      <span style={{ ...styles.summaryValue, color }}>{value}</span>
      <span style={styles.summaryLabel}>{label}</span>
    </div>
  )
}

// ── Page shell with footer (Reset all reviews / View selections) ─────
function Shell({
  children,
  completed,
  onResetAll,
  hideFooter,
}: {
  children: React.ReactNode
  completed: Completed[]
  onResetAll?: () => void
  hideFooter?: boolean
}) {
  const [selectionsOpen, setSelectionsOpen] = useState(false)
  return (
    <div style={styles.page}>
      <main style={styles.container}>
        <OpenSelectionsContext.Provider value={() => setSelectionsOpen(true)}>
          {children}
        </OpenSelectionsContext.Provider>
        {!hideFooter && (
          <div style={styles.footerRow}>
            {onResetAll ? (
              <button type="button" onClick={onResetAll} style={styles.resetAllBtn}>
                Reset all reviews
              </button>
            ) : (
              <span />
            )}
            <button type="button" onClick={() => setSelectionsOpen(true)} style={styles.viewSelectionsLink}>
              View selections
            </button>
          </div>
        )}
      </main>
      {selectionsOpen && (
        <SelectionsModal completed={completed} onClose={() => setSelectionsOpen(false)} />
      )}
    </div>
  )
}

// ── My selections sheet (local decisions, with accepted-image lightbox) ─
function SelectionsModal({ completed, onClose }: { completed: Completed[]; onClose: () => void }) {
  const [lightbox, setLightbox] = useState<{ images: { url: string }[]; label: string } | null>(null)
  const [viewIndex, setViewIndex] = useState<number | null>(null)

  function open(c: Completed) {
    setLightbox({ images: c.acceptedImages, label: c.label })
    setViewIndex(null)
  }
  function closeLightbox() {
    setLightbox(null)
    setViewIndex(null)
  }

  return (
    <>
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.sheet} role="dialog" aria-modal="true" aria-label="My selections" onClick={(e) => e.stopPropagation()}>
          <div style={styles.sheetHead}>
            <h2 style={styles.sheetTitle}>My selections</h2>
            <button type="button" onClick={onClose} style={styles.sheetClose} aria-label="Close">
              ×
            </button>
          </div>
          {completed.length === 0 ? (
            <p style={styles.mutedBody}>No decisions yet.</p>
          ) : (
            <div style={styles.selectionList}>
              {completed.map((c) => (
                <div key={c.setId} style={styles.selectionRow}>
                  <div style={styles.selectionTop}>
                    <span style={styles.selectionName}>{c.label}</span>
                  </div>
                  <div style={styles.selectionBottom}>
                    <div style={styles.selectionCounts}>
                      <span style={{ color: tokens.green, fontWeight: 600 }}>{c.accepted} accepted</span>
                      <span style={styles.counterDivider}>·</span>
                      <span style={{ color: tokens.ruby, fontWeight: 600 }}>{c.passed} passed</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => open(c)}
                      disabled={c.acceptedImages.length === 0}
                      style={{ ...styles.viewAcceptedLink, opacity: c.acceptedImages.length === 0 ? 0.4 : 1 }}
                    >
                      View accepted sketches
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {lightbox && (
        <div style={styles.lbOverlay} onClick={viewIndex === null ? closeLightbox : () => setViewIndex(null)}>
          <div style={styles.lbTitle}>{lightbox.label}</div>
          <button type="button" onClick={(e) => { e.stopPropagation(); closeLightbox() }} style={styles.lbClose} aria-label="Close">
            <X size={22} />
          </button>

          {lightbox.images.length === 0 ? (
            <p style={styles.lbEmpty}>No accepted sketches for this set.</p>
          ) : viewIndex === null ? (
            <div style={styles.lbGrid} onClick={(e) => e.stopPropagation()}>
              {lightbox.images.map((img, i) => (
                <button key={img.url} type="button" style={styles.lbThumbBtn} onClick={() => setViewIndex(i)}>
                  <img src={img.url} alt="" style={styles.lbThumb} />
                </button>
              ))}
            </div>
          ) : (
            <div style={styles.lbStage} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setViewIndex((i) => ((i as number) - 1 + lightbox.images.length) % lightbox.images.length)}
                style={styles.lbNav}
                aria-label="Previous"
              >
                <ChevronLeft size={28} />
              </button>
              <img src={lightbox.images[viewIndex].url} alt="" style={styles.lbFull} />
              <button
                type="button"
                onClick={() => setViewIndex((i) => ((i as number) + 1) % lightbox.images.length)}
                style={styles.lbNav}
                aria-label="Next"
              >
                <ChevronRight size={28} />
              </button>
            </div>
          )}

          {viewIndex !== null && lightbox.images.length > 0 && (
            <div style={styles.lbCounter}>
              {viewIndex + 1} / {lightbox.images.length}
            </div>
          )}
        </div>
      )}
    </>
  )
}

// ── Theme-styled confirmation dialog ─────────────────────────────────
function ConfirmDialog({ config, onClose }: { config: ConfirmConfig; onClose: () => void }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} role="alertdialog" aria-modal="true" aria-label={config.title} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.dialogTitle}>{config.title}</h2>
        <p style={styles.dialogBody}>{config.body}</p>
        <div style={styles.dialogActions}>
          <button type="button" onClick={onClose} style={styles.dialogCancel}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              config.onConfirm()
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

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: tokens.bg, color: tokens.text, fontFamily: fonts.body },
  container: { maxWidth: 520, margin: '0 auto', padding: '40px 24px 80px' },

  // Voter detail stepper
  stepper: { minHeight: '70vh', display: 'flex', flexDirection: 'column' },
  stepHead: { textAlign: 'center', marginBottom: 'auto' },
  stepCampaign: { margin: 0, fontFamily: fonts.heading, fontSize: 24, fontWeight: 600, letterSpacing: '-0.01em', color: tokens.primary },
  stepProject: { margin: '6px 0 0', fontSize: 14, color: tokens.textMuted },
  stepTopBar: { display: 'flex', alignItems: 'center', minHeight: 40 },
  backBtn: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', border: `1px solid ${tokens.border}`, background: tokens.surface, color: tokens.primary, cursor: 'pointer', padding: 0 },
  stepBody: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 16, textAlign: 'center', padding: '24px 0' },
  stepLabel: { fontFamily: fonts.heading, fontSize: 22, fontWeight: 600, color: tokens.text },
  req: { color: tokens.ruby },
  stepInput: { width: '100%', maxWidth: 360, padding: '14px 16px', borderRadius: 10, border: `1px solid ${tokens.border}`, background: tokens.surface, color: tokens.text, fontSize: 16, fontFamily: fonts.body, textAlign: 'center', boxSizing: 'border-box' },
  stepError: { margin: 0, fontSize: 13, color: tokens.ruby },
  stepDots: { display: 'flex', gap: 8, justifyContent: 'center', margin: '8px 0 20px' },
  dot: { height: 8, borderRadius: 999, transition: 'width 0.2s ease, background 0.2s ease' },

  primaryBtn: { width: '100%', background: tokens.primary, color: tokens.surface, border: 'none', borderRadius: 12, padding: '14px 20px', fontSize: 15, fontWeight: 600, fontFamily: fonts.body, cursor: 'pointer' },

  header: { marginBottom: 24, textAlign: 'center' },
  title: { margin: 0, fontFamily: fonts.heading, fontSize: 28, fontWeight: 600, letterSpacing: '-0.01em', color: tokens.text },
  subtitle: { margin: '8px 0 0', fontSize: 15, color: tokens.textMuted, lineHeight: '22px' },
  greeting: { margin: '12px 0 0', fontFamily: fonts.heading, fontSize: 17, fontWeight: 600, color: tokens.text },
  setLabel: { margin: '10px 0 0', display: 'inline-block', fontFamily: fonts.heading, fontSize: 13, fontWeight: 600, color: tokens.primary, background: tokens.tealLight, borderRadius: 999, padding: '4px 14px' },

  progressBlock: { marginBottom: 24 },
  progressMeta: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 13, fontWeight: 600, color: tokens.text },
  counters: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  counter: { fontWeight: 600 },
  counterDivider: { color: tokens.textMuted },
  track: { height: 8, borderRadius: 999, background: tokens.tealLight, overflow: 'hidden' },
  fill: { height: '100%', background: tokens.accent, borderRadius: 999, transition: 'width 0.3s ease' },

  deckWrap: { marginTop: 8 },
  deck: { position: 'relative', width: '100%', aspectRatio: '4 / 5', marginBottom: 24 },
  backCard: { position: 'absolute', inset: 0, background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 20, overflow: 'hidden', transform: 'scale(0.95) translateY(10px)', opacity: 0.7 },

  controls: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 },
  decisionBtn: { flex: 1, maxWidth: 160, padding: '13px 20px', borderRadius: 12, fontSize: 15, fontWeight: 600, fontFamily: fonts.body, cursor: 'pointer', border: '1px solid transparent' },
  acceptBtn: { background: tokens.green, color: tokens.surface },
  rejectBtn: { background: tokens.surface, color: tokens.ruby, border: `1px solid ${tokens.ruby}` },
  undoBtn: { background: 'transparent', border: `1px solid ${tokens.border}`, color: tokens.primary, padding: '13px 18px', borderRadius: 12, fontSize: 14, fontWeight: 500, fontFamily: fonts.body, cursor: 'pointer' },

  done: { background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 16, padding: 32, textAlign: 'center' },
  doneTitle: { margin: '0 0 8px', fontFamily: fonts.heading, fontSize: 22, fontWeight: 600, color: tokens.text },
  summaryRow: { display: 'flex', justifyContent: 'center', gap: 32, margin: '24px 0' },
  summaryStat: { display: 'flex', flexDirection: 'column', gap: 4 },
  summaryValue: { fontFamily: fonts.heading, fontSize: 30, fontWeight: 700, lineHeight: 1 },
  summaryLabel: { fontSize: 12, color: tokens.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 },
  nextBtn: { width: '100%', background: tokens.accent, color: tokens.surface, border: 'none', borderRadius: 12, padding: '14px 20px', fontSize: 15, fontWeight: 600, fontFamily: fonts.body, cursor: 'pointer' },
  submitBtn: { width: '100%', background: tokens.primary, color: tokens.surface, border: 'none', borderRadius: 12, padding: '14px 20px', fontSize: 15, fontWeight: 600, fontFamily: fonts.body, marginTop: 12 },
  doneActions: { display: 'flex', justifyContent: 'center', gap: 12, marginTop: 14 },
  startOverLink: { background: 'transparent', border: 'none', color: tokens.textMuted, fontSize: 13, fontFamily: fonts.body, textDecoration: 'underline', cursor: 'pointer', marginTop: 14, padding: 0 },

  empty: { background: tokens.surface, border: `1px dashed ${tokens.border}`, borderRadius: 12, padding: 40, textAlign: 'center' },
  emptyTitle: { margin: '0 0 8px', fontFamily: fonts.heading, fontSize: 20, fontWeight: 600, color: tokens.text },
  muted: { color: tokens.textMuted, fontSize: 14 },
  mutedBody: { color: tokens.textMuted, fontSize: 14, lineHeight: '22px', margin: 0 },
  error: { background: tokens.rubyLight, color: tokens.ruby, padding: '12px 14px', borderRadius: 8, fontSize: 13, border: `1px solid ${tokens.ruby}33`, marginBottom: 16 },

  footerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 32 },
  viewSelectionsLink: { fontSize: 13, color: tokens.textMuted, textDecoration: 'underline', background: 'transparent', border: 'none', fontFamily: fonts.body, cursor: 'pointer', padding: 0 },
  resetAllBtn: { background: 'transparent', border: 'none', color: tokens.ruby, fontSize: 13, fontFamily: fonts.body, textDecoration: 'underline', cursor: 'pointer', padding: 0 },

  success: { background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 16, padding: 32, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  successCircle: { width: 64, height: 64, borderRadius: '50%', background: tokens.green, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  successTitle: { margin: 0, fontFamily: fonts.heading, fontSize: 22, fontWeight: 600, color: tokens.text },
  successBody: { margin: '8px 0 24px', fontSize: 14, color: tokens.textMuted },
  successLink: { background: 'transparent', border: 'none', color: tokens.primary, fontSize: 13, fontFamily: fonts.body, textDecoration: 'underline', cursor: 'pointer', padding: 0 },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(10, 26, 27, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 },
  sheet: { width: '100%', maxWidth: 440, maxHeight: '80vh', overflowY: 'auto', background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 16, padding: 24, boxShadow: '0 16px 48px rgba(2, 76, 79, 0.22)' },
  sheetHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetTitle: { margin: 0, fontFamily: fonts.heading, fontSize: 20, fontWeight: 600, color: tokens.text },
  sheetClose: { background: 'transparent', border: 'none', color: tokens.textMuted, fontSize: 24, lineHeight: 1, cursor: 'pointer', padding: 0 },
  selectionList: { display: 'flex', flexDirection: 'column', gap: 12 },
  selectionRow: { display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', borderRadius: 10, background: tokens.bg, border: `1px solid ${tokens.border}` },
  selectionTop: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  selectionName: { fontFamily: fonts.heading, fontSize: 15, fontWeight: 600, color: tokens.text },
  selectionBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  selectionCounts: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 },
  viewAcceptedLink: { background: 'transparent', border: 'none', color: tokens.primary, fontSize: 12, fontFamily: fonts.body, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', padding: 0 },

  lbOverlay: { position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.9)', zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
  lbTitle: { position: 'absolute', top: 18, left: 20, color: tokens.surface, fontFamily: fonts.heading, fontSize: 15, fontWeight: 600 },
  lbClose: { position: 'absolute', top: 14, right: 16, background: 'transparent', border: 'none', color: tokens.surface, cursor: 'pointer', padding: 8, display: 'flex', zIndex: 2 },
  lbEmpty: { color: tokens.surface, fontSize: 14 },
  lbGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, width: '100%', maxWidth: 900, maxHeight: '82vh', overflowY: 'auto', padding: '8px 4px' },
  lbThumbBtn: { background: 'transparent', border: 'none', padding: 0, cursor: 'pointer' },
  lbThumb: { width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 8, display: 'block' },
  lbStage: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, width: '100%', maxWidth: 1000 },
  lbFull: { maxWidth: '78vw', maxHeight: '82vh', objectFit: 'contain', borderRadius: 8 },
  lbNav: { background: 'rgba(255, 255, 255, 0.12)', border: 'none', color: tokens.surface, cursor: 'pointer', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  lbCounter: { position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', color: tokens.surface, fontSize: 13 },

  dialog: { width: '100%', maxWidth: 380, background: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: 16, padding: 24, boxShadow: '0 16px 48px rgba(2, 76, 79, 0.22)' },
  dialogTitle: { margin: '0 0 8px', fontFamily: fonts.heading, fontSize: 19, fontWeight: 600, color: tokens.text },
  dialogBody: { margin: 0, fontSize: 14, lineHeight: '21px', color: tokens.textMuted },
  dialogActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 },
  dialogCancel: { background: 'transparent', border: `1px solid ${tokens.border}`, color: tokens.primary, borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 500, fontFamily: fonts.body, cursor: 'pointer' },
  dialogConfirm: { background: tokens.ruby, border: '1px solid transparent', color: tokens.surface, borderRadius: 10, padding: '10px 18px', fontSize: 14, fontWeight: 600, fontFamily: fonts.body, cursor: 'pointer' },
}
