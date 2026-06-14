import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { AnimatePresence } from 'motion/react'
import { supabase } from '../lib/supabase'
import { SwipeCard, cardStyles } from './SwipeCard'
import { tokens, fonts } from './theme'

// Public, no-login voting page. Reached at /portal/vote/:token. A voter fills a
// details form (fields driven by the campaign's collect_*/required flags), then
// swipes through every sketch in the campaign's sets. Right/Accept records
// 'pass', left/Reject records 'reject'. On submit we insert one public_votes
// row per decision. No Supabase session is required: the campaign + its sets
// are readable by anyone while the campaign is active, and anyone may insert
// votes (migrations 0019-0021).

const BUCKET = 'logo-sketches'

const GENDER_OPTIONS = [
  'Prefer not to say',
  'Male',
  'Female',
  'Non-binary',
  'Other',
]

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

// One sketch in the flat voting deck (all sets concatenated, in set order).
type DeckCard = {
  key: string
  setId: string
  sketchIndex: number
  url: string
}

type FieldKey = 'name' | 'age' | 'gender' | 'mobile'

export function PublicVotePage() {
  const { token } = useParams<{ token: string }>()

  const [loading, setLoading] = useState(true)
  const [campaign, setCampaign] = useState<Campaign | null>(null)

  const [step, setStep] = useState<'form' | 'vote' | 'done'>('form')
  const [voter, setVoter] = useState({ name: '', age: '', gender: '', mobile: '' })
  const [formError, setFormError] = useState<string | null>(null)

  const [deck, setDeck] = useState<DeckCard[]>([])
  const [deckLoading, setDeckLoading] = useState(false)
  const [decisions, setDecisions] = useState<('pass' | 'reject')[]>([])
  const [pending, setPending] = useState(false)
  const [lastDir, setLastDir] = useState<1 | -1>(1)

  const [submitting, setSubmitting] = useState(false)
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

  // ── Derived voting state ───────────────────────────────────────────
  const position = decisions.length
  const current = deck[position] ?? null
  const next = deck[position + 1] ?? null
  const allVoted = deck.length > 0 && position >= deck.length

  // The deck unmounts when voting completes, so the card-exit onExitComplete
  // that clears `pending` may not fire. Clear it here so a stale gate can't
  // block the Submit step. (Same guard as the client review flow.)
  useEffect(() => {
    if (allVoted) setPending(false)
  }, [allVoted])

  // ── Step 1 -> Step 2: validate, load the deck ──────────────────────
  function collectedRequired(): FieldKey[] {
    if (!campaign) return []
    const missing: FieldKey[] = []
    if (campaign.collect_name && campaign.name_required && !voter.name.trim()) missing.push('name')
    if (campaign.collect_age && campaign.age_required && !voter.age.trim()) missing.push('age')
    if (campaign.collect_gender && campaign.gender_required && !voter.gender) missing.push('gender')
    if (campaign.collect_mobile && campaign.mobile_required && !voter.mobile.trim()) missing.push('mobile')
    return missing
  }

  async function handleNext() {
    if (!campaign) return
    if (collectedRequired().length > 0) {
      setFormError('Please fill in all required fields.')
      return
    }
    setFormError(null)
    setDeckLoading(true)
    setStep('vote')
    try {
      const { data: setRows, error: setErr } = await supabase
        .from('logo_sketch_sets')
        .select('id, set_number')
        .eq('campaign_id', campaign.id)
        .order('set_number', { ascending: true })
      if (setErr) throw setErr

      const flat: DeckCard[] = []
      for (const s of (setRows ?? []) as { id: string }[]) {
        const { data: files } = await supabase.storage
          .from(BUCKET)
          .list(s.id, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })
        const visible = (files ?? []).filter((f) => f.name && !f.name.startsWith('.'))
        visible.forEach((f, i) => {
          flat.push({
            key: `${s.id}:${i}`,
            setId: s.id,
            sketchIndex: i,
            url: supabase.storage.from(BUCKET).getPublicUrl(`${s.id}/${f.name}`).data.publicUrl,
          })
        })
      }
      setDeck(flat)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setDeckLoading(false)
    }
  }

  function decide(accepted: boolean) {
    if (pending || !current) return
    setPending(true)
    setLastDir(accepted ? 1 : -1)
    setDecisions((prev) => [...prev, accepted ? 'pass' : 'reject'])
  }

  // ── Submit all decisions ───────────────────────────────────────────
  async function handleSubmit() {
    if (!campaign || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const rows = deck.map((d, i) => ({
        campaign_id: campaign.id,
        set_id: d.setId,
        voter_name: campaign.collect_name ? voter.name.trim() || null : null,
        voter_age: campaign.collect_age ? voter.age.trim() || null : null,
        voter_gender: campaign.collect_gender ? voter.gender || null : null,
        voter_mobile: campaign.collect_mobile ? voter.mobile.trim() || null : null,
        sketch_index: d.sketchIndex,
        decision: decisions[i],
      }))
      const { error: insErr } = await supabase.from('public_votes').insert(rows)
      if (insErr) throw insErr
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Shell>
        <p style={styles.muted}>Loading...</p>
      </Shell>
    )
  }

  if (!campaign) {
    return (
      <Shell>
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

  return (
    <Shell>
      <div style={styles.header}>
        <h1 style={styles.title}>{campaign.campaign_title}</h1>
        <p style={styles.project}>{campaign.project_name}</p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {step === 'form' && (
        <div style={styles.card}>
          <p style={styles.formIntro}>
            Tell us a little about you, then review the logo options.
          </p>
          {campaign.collect_name && (
            <Field label="Name" required={campaign.name_required}>
              <input
                type="text"
                value={voter.name}
                onChange={(e) => setVoter((v) => ({ ...v, name: e.target.value }))}
                style={styles.input}
              />
            </Field>
          )}
          {campaign.collect_age && (
            <Field label="Age" required={campaign.age_required}>
              <input
                type="text"
                inputMode="numeric"
                value={voter.age}
                onChange={(e) => setVoter((v) => ({ ...v, age: e.target.value }))}
                style={styles.input}
              />
            </Field>
          )}
          {campaign.collect_gender && (
            <Field label="Gender" required={campaign.gender_required}>
              <select
                value={voter.gender}
                onChange={(e) => setVoter((v) => ({ ...v, gender: e.target.value }))}
                style={styles.input}
              >
                <option value="">Select...</option>
                {GENDER_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {campaign.collect_mobile && (
            <Field label="Mobile number" required={campaign.mobile_required}>
              <input
                type="tel"
                value={voter.mobile}
                onChange={(e) => setVoter((v) => ({ ...v, mobile: e.target.value }))}
                placeholder={campaign.mobile_placeholder ?? ''}
                style={styles.input}
              />
            </Field>
          )}

          {formError && <div style={styles.error}>{formError}</div>}

          <button type="button" onClick={handleNext} style={styles.primaryBtn}>
            Next
          </button>
        </div>
      )}

      {step === 'vote' && (
        <>
          {deckLoading ? (
            <p style={styles.muted}>Loading sketches...</p>
          ) : deck.length === 0 ? (
            <div style={styles.empty}>
              <h2 style={styles.emptyTitle}>No sketches to review yet.</h2>
              <p style={styles.mutedBody}>Please check back soon.</p>
            </div>
          ) : allVoted ? (
            <div style={styles.card}>
              <h2 style={styles.doneTitle}>All sketches reviewed</h2>
              <p style={styles.mutedBody}>
                {deck.length} {deck.length === 1 ? 'sketch' : 'sketches'} reviewed.
                Submit to send us your selections.
              </p>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                style={{ ...styles.primaryBtn, opacity: submitting ? 0.6 : 1 }}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          ) : (
            <>
              <div style={styles.progressBlock}>
                <span style={styles.progressLabel}>
                  Sketch {position + 1} of {deck.length}
                </span>
                <div style={styles.track}>
                  <div
                    style={{
                      ...styles.fill,
                      width: `${(position / deck.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div style={styles.deck}>
                {next && (
                  <div style={styles.backCard}>
                    <img src={next.url} alt="" aria-hidden style={cardStyles.image} draggable={false} />
                  </div>
                )}
                <AnimatePresence custom={lastDir} onExitComplete={() => setPending(false)}>
                  {current && (
                    <SwipeCard
                      key={current.key}
                      sketch={current}
                      position={position + 1}
                      total={deck.length}
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
                  Reject
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
            </>
          )}
        </>
      )}

      {step === 'done' && (
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
          <h2 style={styles.successTitle}>Thank you for voting!</h2>
          <p style={styles.successBody}>Your selections have been submitted.</p>
        </div>
      )}
    </Shell>
  )
}

// ── Small building blocks ────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={styles.page}>
      <main style={styles.container}>{children}</main>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required: boolean
  children: React.ReactNode
}) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>
        {label}
        {required && <span style={styles.req}> *</span>}
      </span>
      {children}
    </label>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: tokens.bg,
    color: tokens.text,
    fontFamily: fonts.body,
  },
  container: { maxWidth: 520, margin: '0 auto', padding: '40px 24px 80px' },

  header: { marginBottom: 24, textAlign: 'center' },
  title: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: tokens.primary,
  },
  project: { margin: '8px 0 0', fontSize: 15, color: tokens.textMuted },

  card: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 16,
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  formIntro: { margin: 0, fontSize: 14, color: tokens.textMuted, lineHeight: '22px' },

  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: 600, color: tokens.text },
  req: { color: tokens.ruby },
  input: {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 8,
    border: `1px solid ${tokens.border}`,
    background: tokens.inputBg,
    color: tokens.text,
    fontSize: 14,
    fontFamily: fonts.body,
    boxSizing: 'border-box',
  },

  primaryBtn: {
    width: '100%',
    background: tokens.primary,
    color: tokens.surface,
    border: 'none',
    borderRadius: 12,
    padding: '14px 20px',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: 'pointer',
    marginTop: 4,
  },

  // Progress
  progressBlock: { marginBottom: 16 },
  progressLabel: { fontSize: 13, fontWeight: 600, color: tokens.text },
  track: {
    height: 8,
    borderRadius: 999,
    background: tokens.tealLight,
    overflow: 'hidden',
    marginTop: 8,
  },
  fill: {
    height: '100%',
    background: tokens.accent,
    borderRadius: 999,
    transition: 'width 0.3s ease',
  },

  // Deck
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

  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  decisionBtn: {
    flex: 1,
    maxWidth: 200,
    padding: '13px 20px',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: fonts.body,
    cursor: 'pointer',
    border: '1px solid transparent',
  },
  acceptBtn: { background: tokens.green, color: tokens.surface },
  rejectBtn: {
    background: tokens.surface,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
  },

  doneTitle: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 22,
    fontWeight: 600,
    color: tokens.text,
  },

  // Empty / not active
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
  mutedBody: { color: tokens.textMuted, fontSize: 14, lineHeight: '22px', margin: 0 },
  error: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 13,
    border: `1px solid ${tokens.ruby}33`,
  },

  // Success
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
  successBody: { margin: '8px 0 0', fontSize: 14, color: tokens.textMuted },
}
