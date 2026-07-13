// Modal for sending or marking outreach touches.
// Email: editable subject + body, calls send-outreach-email edge function.
// LinkedIn: read-only rendered message, Copy + Open LinkedIn + Mark sent.
// All error states follow Nielsen H9: plain language, next step, no raw errors.
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Copy, ExternalLink, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { mono } from '../ui'

export type TouchRow = {
  id: string
  channel: string
  status: string
  scheduled_for: string
  subject_snapshot: string | null
  body_snapshot: string | null
  step_id: string | null
  lead: {
    id: string
    first_name: string
    last_name: string | null
    company: string
    email: string | null
    linkedin_url: string | null
    specific_observation: string | null
    unsubscribe_token: string
    status: string
    linkedin_status: string
  }
  step: {
    step_number: number
    channel: string
    subject_template: string | null
    body_template: string
    requires_connected: boolean
  } | null
  enrollment: {
    id: string
    sequence: { name: string } | null
  } | null
}

type EmailErrorCode =
  | 'invalid_touch'
  | 'no_email'
  | 'suppressed'
  | 'missing_observation'
  | 'unresolved_variables'
  | 'daily_cap_reached'
  | 'send_failed'
  | 'network_error'

const EMAIL_ERROR_MESSAGES: Record<string, string> = {
  daily_cap_reached: 'Daily sending limit of 25 reached. Try again tomorrow.',
  missing_observation: 'Add a specific observation for this lead before sending.',
  unresolved_variables: 'Message contains unfilled placeholders. Review and complete them.',
  suppressed: 'This lead has unsubscribed or bounced. Email cancelled.',
  no_email: 'This lead has no email address. Add one first.',
  send_failed: 'Email delivery failed. Check Resend dashboard and try again.',
  invalid_touch: 'This touch is no longer valid. Refresh and try again.',
  network_error: 'Something went wrong. Please try again.',
}

function emailErrorMessage(code: string | null): string {
  if (!code) return ''
  return EMAIL_ERROR_MESSAGES[code] ?? 'Something went wrong. Please try again.'
}

function substitute(template: string, vars: Record<string, string>): string {
  let out = template
  for (const [key, val] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, val)
  }
  return out
}

const EM_DASH_RE = /—/g

function collapseDoublePeriods(text: string): string {
  return text.replace(/\.\s*\./g, '.')
}

function stripEmDashes(text: string): { cleaned: string; hadEmDash: boolean } {
  const hadEmDash = EM_DASH_RE.test(text)
  EM_DASH_RE.lastIndex = 0
  return { cleaned: text.replace(EM_DASH_RE, ''), hadEmDash }
}

function hasSignOffWithoutDesignSystems(text: string): boolean {
  return /eswarcreatives\.in(?!\/design-systems)/.test(text)
}

function renderTemplate(
  template: string,
  lead: TouchRow['lead'],
  portalUrl = 'https://www.eswarcreatives.in'
): string {
  const raw = substitute(template, {
    first_name: lead.first_name,
    company: lead.company,
    specific_observation: lead.specific_observation ?? '',
    flow: 'product',
    unsubscribe_url: `${portalUrl}/unsubscribe/${lead.unsubscribe_token}`,
    topic: '{{topic}}',
  })
  return collapseDoublePeriods(raw)
}

function findUnresolvedTokens(text: string): string[] {
  const matches = text.match(/\{\{[^}]+\}\}/g)
  return matches ?? []
}

type PriorTouch = {
  id: string
  step_number: number
  sent_at: string
  subject_snapshot: string | null
  body_snapshot: string | null
  opened_at: string | null
}

function PreviousMessages({ enrollmentId, currentTouchId }: { enrollmentId: string; currentTouchId: string }) {
  const [open, setOpen] = useState(false)
  const [priors, setPriors] = useState<PriorTouch[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    supabase
      .from('outreach_touches')
      .select(`
        id, sent_at, subject_snapshot, body_snapshot, opened_at,
        step:sequence_steps!step_id (step_number)
      `)
      .eq('enrollment_id', enrollmentId)
      .neq('id', currentTouchId)
      .eq('status', 'sent')
      .eq('channel', 'email')
      .order('sent_at', { ascending: true })
      .then(({ data }) => {
        const rows = (data ?? []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          step_number: (r.step as { step_number: number } | null)?.step_number ?? 0,
          sent_at: r.sent_at as string,
          subject_snapshot: r.subject_snapshot as string | null,
          body_snapshot: r.body_snapshot as string | null,
          opened_at: r.opened_at as string | null,
        }))
        setPriors(rows)
        setLoaded(true)
      })
  }, [enrollmentId, currentTouchId])

  if (loaded && priors.length === 0) return null

  const firstPrior = priors[0]
  const collapseLabel = firstPrior
    ? `Step ${firstPrior.step_number} sent ${new Date(firstPrior.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} — tap to review`
    : 'Previous messages — tap to review'

  return (
    <div style={prevStyles.container}>
      <button
        type="button"
        style={prevStyles.toggle}
        onClick={() => setOpen((p) => !p)}
      >
        <span style={prevStyles.toggleLabel}>{collapseLabel}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div style={prevStyles.list}>
          {priors.map((p) => {
            const bodyLines = (p.body_snapshot ?? '').split('\n').filter(Boolean).slice(0, 3)
            return (
              <div key={p.id} style={prevStyles.entry}>
                <div style={prevStyles.entryHeader}>
                  <span style={prevStyles.stepLabel}>Step {p.step_number}</span>
                  <span style={prevStyles.sentDate}>
                    {new Date(p.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                  {p.opened_at && (
                    <span style={prevStyles.openedChip}>
                      <span style={prevStyles.greenDot} />
                      Opened
                    </span>
                  )}
                </div>
                {p.subject_snapshot && (
                  <p style={prevStyles.subject}>{p.subject_snapshot}</p>
                )}
                <p style={prevStyles.bodyPreview}>{bodyLines.join('\n')}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const prevStyles: Record<string, CSSProperties> = {
  container: {
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    overflow: 'hidden',
  },
  toggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    background: t.background.subtle,
    border: 'none',
    padding: '9px 12px',
    cursor: 'pointer',
    gap: 8,
  },
  toggleLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.secondary,
    textAlign: 'left' as const,
    flex: 1,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    background: t.background.subtle,
    borderTop: `1px solid ${t.border.subtle}`,
  },
  entry: {
    padding: '10px 12px',
    borderBottom: `1px solid ${t.border.subtle}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  entryHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  stepLabel: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: 700,
    color: t.text.tertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  sentDate: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: t.text.muted,
    flex: 1,
  },
  openedChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontFamily: fonts.body,
    fontSize: 11,
    color: tokens.green,
    fontWeight: 500,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: tokens.green,
    display: 'inline-block',
    flexShrink: 0,
  },
  subject: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.primary,
    margin: 0,
  },
  bodyPreview: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
    margin: 0,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap' as const,
  },
}

type CheckLevel = 'green' | 'amber' | 'red'

type QualityCheck = {
  label: string
  level: CheckLevel
  pass: boolean
}

function QualityChecklist({
  subject,
  body,
  observation,
  seqName,
}: {
  subject: string
  body: string
  observation: string | null
  seqName: string
}) {
  const [expanded, setExpanded] = useState(false)

  const paragraphs = body.split(/\n\n+/).filter((p) => p.trim().length > 0)
  const isOnboardingSeq = /(onboarding)/i.test(seqName)

  const checks: QualityCheck[] = [
    {
      label: 'Subject does not contain "onboarding" for non-onboarding sequences',
      level: 'amber',
      pass: isOnboardingSeq || !/onboarding/i.test(subject),
    },
    {
      label: 'Body has 4 distinct paragraphs (double line breaks present)',
      level: 'amber',
      pass: paragraphs.length >= 4,
    },
    {
      label: 'No em dashes detected',
      level: 'red',
      pass: !EM_DASH_RE.test(body + subject),
    },
    {
      label: 'Sign-off uses /design-systems URL',
      level: 'amber',
      pass: !hasSignOffWithoutDesignSystems(body + subject),
    },
    {
      label: 'No unresolved {{variables}} remaining',
      level: 'red',
      pass: findUnresolvedTokens(body).length === 0,
    },
    {
      label: 'Specific observation is not empty',
      level: 'red',
      pass: !!(observation && observation.trim().length > 0),
    },
  ]

  // Reset lastIndex for EM_DASH_RE after test
  EM_DASH_RE.lastIndex = 0

  const passed = checks.filter((c) => c.pass).length
  const total = checks.length
  const allPass = passed === total

  const DOT_COLORS: Record<CheckLevel, string> = {
    green: tokens.green,
    amber: tokens.gold,
    red: tokens.ruby,
  }

  return (
    <div style={checkStyles.container}>
      <button
        type="button"
        style={checkStyles.header}
        onClick={() => setExpanded((p) => !p)}
      >
        <span style={{
          ...checkStyles.count,
          color: allPass ? tokens.green : t.text.secondary,
        }}>
          {passed}/{total} checks passed
        </span>
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {expanded && (
        <div style={checkStyles.list}>
          {checks.map((c, i) => (
            <div key={i} style={checkStyles.row}>
              <span style={{
                ...checkStyles.dot,
                background: c.pass ? tokens.green : DOT_COLORS[c.level],
              }} />
              <span style={{
                ...checkStyles.label,
                color: c.pass ? t.text.secondary : (c.level === 'red' ? tokens.ruby : tokens.goldDark),
              }}>
                {c.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const checkStyles: Record<string, CSSProperties> = {
  container: {
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    background: t.background.subtle,
    border: 'none',
    padding: '8px 12px',
    cursor: 'pointer',
    gap: 8,
  },
  count: {
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 600,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    background: t.background.subtle,
    borderTop: `1px solid ${t.border.subtle}`,
    padding: '6px 12px 10px',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '5px 0',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'inline-block',
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 12,
  },
}

export function OutreachSendModal({
  touch,
  onClose,
  onSent,
  onUpdateObservation,
}: {
  touch: TouchRow
  onClose: () => void
  onSent: () => void
  onUpdateObservation: (leadId: string, obs: string) => void
}) {
  const lead = touch.lead
  const isEmail = touch.channel === 'email'
  const isLinkedInConnect = touch.channel === 'linkedin_connect'
  const isLinkedInDm = touch.channel === 'linkedin_dm'
  const isLinkedIn = isLinkedInConnect || isLinkedInDm

  const stepNum = touch.step?.step_number ?? 1
  const seqName = touch.enrollment?.sequence?.name ?? 'Sequence'

  // Email state — strip em dashes from initial render, track removal for warning
  const _rawSubject = touch.step?.subject_template
    ? renderTemplate(touch.step.subject_template, lead)
    : touch.subject_snapshot ?? ''
  const _rawBody = touch.step?.body_template
    ? renderTemplate(touch.step.body_template, lead)
    : touch.body_snapshot ?? ''
  const { cleaned: initialSubject, hadEmDash: subjectHadEmDash } = stripEmDashes(_rawSubject)
  const { cleaned: initialBody, hadEmDash: bodyHadEmDash } = stripEmDashes(_rawBody)
  const initialEmDashRemoved = subjectHadEmDash || bodyHadEmDash

  const draftKey = `draft_touch_${touch.id}`

  const [subject, setSubject] = useState(() => {
    try {
      const saved = localStorage.getItem(draftKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.subject) return parsed.subject as string
      }
    } catch { /* ignore */ }
    return initialSubject
  })
  const [body, setBody] = useState(() => {
    try {
      const saved = localStorage.getItem(draftKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.body) return parsed.body as string
      }
    } catch { /* ignore */ }
    return initialBody
  })
  const [draftRestored, setDraftRestored] = useState(() => {
    try {
      const saved = localStorage.getItem(`draft_touch_${touch.id}`)
      return !!saved
    } catch { return false }
  })
  const [draftSaveLabel, setDraftSaveLabel] = useState<'Save draft' | 'Saved'>('Save draft')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [emailError, setEmailError] = useState<EmailErrorCode | null>(null)
  const [obsValue, setObsValue] = useState(lead.specific_observation ?? '')
  const [savingObs, setSavingObs] = useState(false)
  const [emDashRemoved] = useState(initialEmDashRemoved)

  const signOffWarn = isEmail && hasSignOffWithoutDesignSystems(body + subject)

  // Auto-save draft on subject/body change (debounced 1s)
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!isEmail) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ subject, body }))
      } catch { /* ignore */ }
    }, 1000)
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    }
  }, [subject, body, isEmail, draftKey])

  // LinkedIn state
  const renderedLinkedIn = touch.step?.body_template
    ? renderTemplate(touch.step.body_template, lead)
    : touch.body_snapshot ?? ''
  const liCharCount = renderedLinkedIn.length
  const liOverLimit = isLinkedInConnect && liCharCount > 299
  const liHasUnresolved = renderedLinkedIn.includes('{{')
  const [copyLabel, setCopyLabel] = useState<'Copy message' | 'Copied'>('Copy message')
  const [markingSent, setMarkingSent] = useState(false)

  // Auto-close on success after 1.5s
  useEffect(() => {
    if (sent) {
      const t = setTimeout(onSent, 1500)
      return () => clearTimeout(t)
    }
  }, [sent, onSent])

  // Escape closes
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const unresolvedInBody = findUnresolvedTokens(body)
  const canSendEmail =
    !sending &&
    !sent &&
    emailError !== 'daily_cap_reached' &&
    emailError !== 'suppressed' &&
    unresolvedInBody.length === 0 &&
    (emailError !== 'missing_observation' || obsValue.trim().length > 0)

  async function handleSaveObservation() {
    if (!obsValue.trim()) return
    setSavingObs(true)
    await supabase
      .from('leads')
      .update({ specific_observation: obsValue.trim() })
      .eq('id', lead.id)
    onUpdateObservation(lead.id, obsValue.trim())
    // Re-render the body with the new observation
    const newBody = touch.step?.body_template
      ? renderTemplate(touch.step.body_template, { ...lead, specific_observation: obsValue.trim() })
      : body
    setBody(newBody)
    setEmailError(null)
    setSavingObs(false)
  }

  function handleSaveDraft() {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ subject, body }))
    } catch { /* ignore */ }
    setDraftSaveLabel('Saved')
    setTimeout(() => setDraftSaveLabel('Save draft'), 1500)
  }

  async function handleSendEmail() {
    setSending(true)
    setEmailError(null)
    try {
      const { data, error } = await supabase.functions.invoke('send-outreach-email', {
        body: { touch_id: touch.id },
      })
      if (data?.error) {
        setEmailError(data.error as EmailErrorCode)
        setSending(false)
        return
      }
      if (error) {
        setEmailError('network_error')
        setSending(false)
        return
      }
      // Clear draft on successful send
      try { localStorage.removeItem(draftKey) } catch { /* ignore */ }
      setSent(true)
    } catch {
      setEmailError('network_error')
      setSending(false)
    }
  }

  async function handleMarkLinkedInSent() {
    setMarkingSent(true)
    const updates: Record<string, unknown> = { status: 'sent', sent_at: new Date().toISOString() }
    await supabase.from('outreach_touches').update(updates).eq('id', touch.id)
    if (isLinkedInConnect) {
      await supabase.from('leads').update({ linkedin_status: 'request_sent' }).eq('id', lead.id)
    }
    setMarkingSent(false)
    onSent()
  }

  async function handleSkip(reason = 'skipped_manually') {
    await supabase
      .from('outreach_touches')
      .update({ status: 'skipped', skipped_reason: reason })
      .eq('id', touch.id)
    onClose()
  }

  function handleCopy() {
    navigator.clipboard.writeText(renderedLinkedIn).catch(() => {})
    setCopyLabel('Copied')
    setTimeout(() => setCopyLabel('Copy message'), 2000)
  }

  const bodyRef = useRef<HTMLTextAreaElement>(null)

  // Highlight unresolved tokens in body textarea is tricky in plain HTML;
  // we instead show an inline warning banner listing the tokens.
  const renderBodyWithHighlights = () => {
    if (unresolvedInBody.length === 0) return null
    return (
      <div style={styles.unresolvedBanner}>
        Fill in the highlighted placeholder before sending:{' '}
        {unresolvedInBody.map((tok, i) => (
          <span key={i} style={styles.unresolvedChip}>{tok}</span>
        ))}
      </div>
    )
  }

  const title = isEmail
    ? `Email: Step ${stepNum}`
    : isLinkedInConnect
    ? `LinkedIn Connect: Step ${stepNum}`
    : `LinkedIn DM: Step ${stepNum}`

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.head}>
          <div>
            <h2 style={styles.title}>{title}</h2>
            <p style={styles.sub}>{seqName} · {lead.first_name} {lead.last_name ?? ''} at {lead.company}</p>
          </div>
          <button type="button" style={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div style={styles.body}>
          {/* ── Email ── */}
          {isEmail && (
            <>
              {sent ? (
                <div style={styles.successState}>
                  <Check size={32} color={tokens.green} />
                  <span style={styles.successLabel}>Sent</span>
                </div>
              ) : emailError === 'daily_cap_reached' ? (
                <div style={styles.cappedState}>
                  <p style={styles.cappedText}>{emailErrorMessage('daily_cap_reached')}</p>
                  <button type="button" style={styles.closeOnlyBtn} onClick={onClose}>Close</button>
                </div>
              ) : (
                <>
                  {/* Draft restored badge */}
                  {draftRestored && (
                    <div style={styles.draftRestoredBadge}>Draft restored</div>
                  )}
                  {/* Step 2+: previous messages context panel */}
                  {stepNum > 1 && touch.enrollment?.id && (
                    <PreviousMessages
                      enrollmentId={touch.enrollment.id}
                      currentTouchId={touch.id}
                    />
                  )}
                  {/* Subject */}
                  <div style={styles.field}>
                    <label style={styles.fieldLabel}>Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => { setSubject(e.target.value); setDraftRestored(false) }}
                      style={styles.input}
                    />
                  </div>
                  {/* Body */}
                  <div style={styles.field}>
                    <label style={styles.fieldLabel}>Message</label>
                    <textarea
                      ref={bodyRef}
                      value={body}
                      onChange={(e) => { setBody(e.target.value); setDraftRestored(false) }}
                      style={{ ...styles.textarea, whiteSpace: 'pre-wrap' }}
                      rows={10}
                    />
                    <span style={styles.charCount}>{body.length} characters</span>
                  </div>
                  {/* Em dash removal warning */}
                  {emDashRemoved && (
                    <div style={styles.emDashBanner}>
                      Em dash removed. Review the sentence.
                    </div>
                  )}
                  {/* Sign-off URL warning */}
                  {signOffWarn && (
                    <div style={styles.signOffWarnBanner}>
                      Sign-off link may point to homepage. Check before sending.
                    </div>
                  )}
                  {/* Unresolved tokens warning */}
                  {renderBodyWithHighlights()}
                  {/* Missing observation inline editor */}
                  {emailError === 'missing_observation' && (
                    <div style={styles.obsCard}>
                      <span style={styles.obsLabel}>Personalized observation</span>
                      <span style={styles.obsHelper}>Written fresh per lead. Required before sending.</span>
                      <textarea
                        value={obsValue}
                        onChange={(e) => setObsValue(e.target.value)}
                        style={{ ...styles.textarea, marginTop: 8 }}
                        rows={3}
                        placeholder="e.g. the onboarding flow drops users after the second step..."
                      />
                      <button
                        type="button"
                        style={{ ...styles.primaryBtn, marginTop: 8, opacity: savingObs ? 0.6 : 1 }}
                        onClick={handleSaveObservation}
                        disabled={savingObs || !obsValue.trim()}
                      >
                        {savingObs ? 'Saving...' : 'Save observation'}
                      </button>
                    </div>
                  )}
                  {/* Generic error */}
                  {emailError &&
                    emailError !== 'missing_observation' &&
                    emailError !== 'unresolved_variables' && (
                    <div style={styles.errorBanner}>
                      {emailErrorMessage(emailError)}
                    </div>
                  )}
                  {/* Pre-send quality checklist */}
                  <QualityChecklist
                    subject={subject}
                    body={body}
                    observation={lead.specific_observation}
                    seqName={seqName}
                  />
                  {/* Actions row: Save draft + Send */}
                  <div style={styles.sendRow}>
                    <button
                      type="button"
                      style={styles.draftBtn}
                      onClick={handleSaveDraft}
                    >
                      {draftSaveLabel}
                    </button>
                    <button
                      type="button"
                      style={{ ...styles.primaryBtn, flex: 1, opacity: canSendEmail ? 1 : 0.5 }}
                      onClick={handleSendEmail}
                      disabled={!canSendEmail}
                    >
                      {sending ? 'Sending...' : 'Send email'}
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── LinkedIn ── */}
          {isLinkedIn && (
            <>
              <div style={styles.liMessage}>
                {liHasUnresolved ? (
                  <p style={styles.liUnresolved}>
                    {renderedLinkedIn.split(/(\{\{[^}]+\}\})/g).map((part, i) =>
                      /^\{\{/.test(part) ? (
                        <mark key={i} style={styles.liHighlight}>{part}</mark>
                      ) : (
                        <span key={i}>{part}</span>
                      )
                    )}
                  </p>
                ) : (
                  <p style={styles.liText}>{renderedLinkedIn}</p>
                )}
              </div>
              {isLinkedInConnect && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{
                    ...styles.charCountLi,
                    color: liOverLimit ? tokens.ruby : t.text.muted,
                  }}>
                    {liCharCount} / 300
                  </span>
                </div>
              )}
              {liHasUnresolved && (
                <div style={styles.liHint}>
                  Edit this message before marking sent. The highlighted placeholder must be filled in.
                  Mark sent is disabled until all placeholders are replaced.
                </div>
              )}
              {/* Actions */}
              <div style={styles.liActions}>
                <button type="button" style={styles.outlineBtn} onClick={handleCopy}>
                  <Copy size={14} />
                  {copyLabel}
                </button>
                <button
                  type="button"
                  style={{
                    ...styles.outlineBtn,
                    ...(lead.linkedin_url ? {} : styles.disabledBtn),
                  }}
                  onClick={() => lead.linkedin_url && window.open(lead.linkedin_url, '_blank', 'noopener')}
                  disabled={!lead.linkedin_url}
                  title={!lead.linkedin_url ? 'Add LinkedIn URL to this lead first' : undefined}
                >
                  <ExternalLink size={14} />
                  Open LinkedIn profile
                </button>
              </div>
              {!lead.linkedin_url && (
                <p style={styles.liNoUrl}>Add LinkedIn URL to this lead first.</p>
              )}
              <button
                type="button"
                style={{
                  ...styles.primaryBtn,
                  opacity: markingSent || liHasUnresolved ? 0.5 : 1,
                }}
                onClick={handleMarkLinkedInSent}
                disabled={markingSent || liHasUnresolved}
              >
                {markingSent ? 'Marking...' : 'Mark sent'}
              </button>
              <button
                type="button"
                style={styles.skipLink}
                onClick={() => handleSkip('skipped_manually')}
              >
                Skip this step
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: t.background.scrim,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '60px 20px',
    zIndex: 200,
    overflowY: 'auto',
  },
  panel: {
    background: tokens.surface,
    borderRadius: 12,
    border: `1px solid ${t.border.default}`,
    width: '100%',
    maxWidth: 560,
    display: 'flex',
    flexDirection: 'column',
  },
  head: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    padding: '20px 24px',
    borderBottom: `1px solid ${t.border.subtle}`,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: t.text.primary,
    margin: 0,
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.muted,
    margin: '4px 0 0',
  },
  closeBtn: {
    background: t.background.subtle,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    color: t.text.tertiary,
    cursor: 'pointer',
    padding: 6,
    display: 'flex',
    flexShrink: 0,
  },
  body: {
    padding: 24,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.tertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '10px 12px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '10px 12px',
    outline: 'none',
    resize: 'vertical' as const,
    lineHeight: 1.55,
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  charCount: {
    fontFamily: mono,
    fontSize: 11,
    color: t.text.muted,
    alignSelf: 'flex-end',
  },
  charCountLi: {
    fontFamily: mono,
    fontSize: 12,
    color: t.text.muted,
  },
  unresolvedBanner: {
    background: tokens.rubyLight,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.ruby,
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
    alignItems: 'center',
  },
  unresolvedChip: {
    background: tokens.ruby,
    color: '#fff',
    borderRadius: 4,
    padding: '2px 6px',
    fontFamily: mono,
    fontSize: 12,
  },
  errorBanner: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
  },
  emDashBanner: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '8px 12px',
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 500,
  },
  signOffWarnBanner: {
    background: tokens.goldLight,
    color: tokens.goldDark,
    border: `1px solid ${tokens.gold}`,
    borderRadius: 8,
    padding: '8px 12px',
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 500,
  },
  obsCard: {
    background: t.background.tint1,
    border: `1px solid ${t.border.brand}`,
    borderRadius: 8,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  obsLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: t.text.primaryBrand,
  },
  obsHelper: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.tertiary,
  },
  primaryBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '11px 20px',
    cursor: 'pointer',
    transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
    alignSelf: 'stretch',
  },
  outlineBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.surface,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '8px 14px',
    cursor: 'pointer',
  },
  disabledBtn: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  closeOnlyBtn: {
    background: tokens.surface,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 14,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '10px 20px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  cappedState: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    alignItems: 'flex-start',
  },
  cappedText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.secondary,
    margin: 0,
  },
  successState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: '32px 0',
  },
  successLabel: {
    fontFamily: fonts.heading,
    fontSize: 20,
    fontWeight: 600,
    color: tokens.green,
  },
  liMessage: {
    background: tokens.bg,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    padding: '14px 16px',
  },
  liText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    margin: 0,
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
  },
  liUnresolved: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    margin: 0,
    lineHeight: 1.55,
    whiteSpace: 'pre-wrap',
  },
  liHighlight: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    borderRadius: 3,
    padding: '1px 4px',
    fontFamily: mono,
    fontSize: 13,
  },
  liHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.ruby,
    background: tokens.rubyLight,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '8px 12px',
  },
  liActions: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  liNoUrl: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
    margin: 0,
  },
  skipLink: {
    background: 'none',
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.muted,
    cursor: 'pointer',
    padding: '4px 0',
    textDecoration: 'underline',
    alignSelf: 'flex-start',
  },
  sendRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'stretch',
  },
  draftBtn: {
    background: tokens.surface,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '11px 16px',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  draftRestoredBadge: {
    display: 'inline-block',
    alignSelf: 'flex-start',
    background: t.background.tint1,
    color: t.text.primaryBrand,
    border: `1px solid ${t.border.brand}`,
    borderRadius: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 500,
    padding: '4px 10px',
  },
}
