// Modal for sending or marking outreach touches.
// Email: editable subject + body, calls send-outreach-email edge function.
// LinkedIn: read-only rendered message, Copy + Open LinkedIn + Mark sent.
// All error states follow Nielsen H9: plain language, next step, no raw errors.
import { useEffect, useRef, useState } from 'react'
import { Check, Copy, ExternalLink, X } from 'lucide-react'
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
  | 'suppressed_auto_cancelled'
  | 'send_failed'
  | 'network_error'

const EMAIL_ERROR_MESSAGES: Record<EmailErrorCode, string> = {
  invalid_touch: 'This touch is no longer valid. Refresh the page to continue.',
  no_email: 'This lead has no email address. Add one in the lead drawer before sending.',
  suppressed: 'This contact has unsubscribed or bounced. Touch cancelled.',
  missing_observation: 'A personalized observation is required before sending.',
  unresolved_variables: 'Fill in the highlighted placeholder before sending.',
  daily_cap_reached: 'Daily limit of 25 reached. Come back tomorrow.',
  suppressed_auto_cancelled: 'This contact has unsubscribed or bounced. Touch cancelled.',
  send_failed: 'Could not deliver the email. Check your connection and try again.',
  network_error: 'Network error. Check your connection and try again.',
}

function substitute(template: string, vars: Record<string, string>): string {
  let out = template
  for (const [key, val] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, val)
  }
  return out
}

function renderTemplate(
  template: string,
  lead: TouchRow['lead'],
  portalUrl = 'https://www.eswarcreatives.in'
): string {
  return substitute(template, {
    first_name: lead.first_name,
    company: lead.company,
    specific_observation: lead.specific_observation ?? '',
    flow: 'product',
    unsubscribe_url: `${portalUrl}/unsubscribe/${lead.unsubscribe_token}`,
    topic: '{{topic}}',
  })
}

function findUnresolvedTokens(text: string): string[] {
  const matches = text.match(/\{\{[^}]+\}\}/g)
  return matches ?? []
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

  // Email state
  const initialSubject = touch.step?.subject_template
    ? renderTemplate(touch.step.subject_template, lead)
    : touch.subject_snapshot ?? ''
  const initialBody = touch.step?.body_template
    ? renderTemplate(touch.step.body_template, lead)
    : touch.body_snapshot ?? ''

  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [emailError, setEmailError] = useState<EmailErrorCode | null>(null)
  const [obsValue, setObsValue] = useState(lead.specific_observation ?? '')
  const [savingObs, setSavingObs] = useState(false)

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

  async function handleSendEmail() {
    setSending(true)
    setEmailError(null)
    try {
      const { data, error } = await supabase.functions.invoke('send-outreach-email', {
        body: { touch_id: touch.id },
      })
      if (error) {
        setEmailError('network_error')
        setSending(false)
        return
      }
      if (data?.error) {
        const code = data.error as EmailErrorCode
        setEmailError(code)
        if (code === 'suppressed') {
          // Touch was auto-cancelled server-side
        }
        setSending(false)
        return
      }
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
                  <p style={styles.cappedText}>Daily limit of 25 reached. Come back tomorrow.</p>
                  <button type="button" style={styles.closeOnlyBtn} onClick={onClose}>Close</button>
                </div>
              ) : (
                <>
                  {/* Subject */}
                  <div style={styles.field}>
                    <label style={styles.fieldLabel}>Subject</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      style={styles.input}
                    />
                  </div>
                  {/* Body */}
                  <div style={styles.field}>
                    <label style={styles.fieldLabel}>Message</label>
                    <textarea
                      ref={bodyRef}
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      style={styles.textarea}
                      rows={10}
                    />
                    <span style={styles.charCount}>{body.length} characters</span>
                  </div>
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
                      {EMAIL_ERROR_MESSAGES[emailError]}
                    </div>
                  )}
                  {/* Send button */}
                  <button
                    type="button"
                    style={{ ...styles.primaryBtn, opacity: canSendEmail ? 1 : 0.5 }}
                    onClick={handleSendEmail}
                    disabled={!canSendEmail}
                  >
                    {sending ? 'Sending...' : 'Send email'}
                  </button>
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
}
