// Lead drawer: full lead detail, editable fields, enrollment, timeline, convert to client.
// SidePanel on desktop, full-screen bottom sheet on mobile (handled by SidePanel itself).
import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Clock, Mail, Linkedin, X, Reply } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'
import { SidePanel } from '../admin/SidePanel'
import { mono, formatDate } from '../admin/ui'

type LeadStatus =
  | 'new' | 'active' | 'replied' | 'meeting_booked' | 'converted'
  | 'not_interested' | 'unsubscribed' | 'bounced' | 'archived'
type LinkedInStatus = 'none' | 'request_sent' | 'connected' | 'ignored'

export type LeadDetail = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone_business: string | null
  phone_personal: string | null
  linkedin_url: string | null
  company: string
  role_title: string | null
  website: string | null
  segment: string
  source: string
  country: string | null
  specific_observation: string | null
  status: LeadStatus
  linkedin_status: LinkedInStatus
  notes: string | null
  created_at: string
  unsubscribe_token: string
}

type EnrollmentRow = {
  id: string
  sequence_id: string
  status: string
  started_at: string
  sequence: { name: string; segment: string | null } | null
}

type TouchTimelineRow = {
  id: string
  channel: string
  status: string
  scheduled_for: string
  sent_at: string | null
  opened_at: string | null
  bounced_at: string | null
  skipped_reason: string | null
  subject_snapshot: string | null
  enrollment_id: string
  step: { step_number: number; day_offset: number | null } | null
  enrollment: { sequence: { name: string } | null } | null
}

type ReplyMessageRow = {
  id: string
  body: string
  logged_at: string
}

type TimelineItem =
  | { kind: 'touch'; data: TouchTimelineRow }
  | { kind: 'reply'; data: ReplyMessageRow }

type SequenceRow = {
  id: string
  name: string
  segment: string | null
  is_active: boolean
}

const STATUS_TONES: Record<string, { bg: string; fg: string }> = {
  new:           { bg: t.background.muted, fg: t.text.tertiary },
  active:        { bg: tokens.tealLight, fg: tokens.primary },
  replied:       { bg: tokens.greenLight, fg: tokens.green },
  meeting_booked:{ bg: tokens.goldLight, fg: tokens.goldDark },
  converted:     { bg: tokens.greenLight, fg: tokens.green },
  not_interested:{ bg: t.background.muted, fg: t.text.tertiary },
  unsubscribed:  { bg: tokens.rubyLight, fg: tokens.ruby },
  bounced:       { bg: tokens.rubyLight, fg: tokens.ruby },
  archived:      { bg: t.background.muted, fg: t.text.muted },
}

function StatusChip({ status }: { status: string }) {
  const tone = STATUS_TONES[status] ?? { bg: t.background.muted, fg: t.text.tertiary }
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 999,
      background: tone.bg,
      color: tone.fg,
      fontFamily: fonts.body,
      fontSize: 12,
      fontWeight: 600,
      textTransform: 'capitalize',
      letterSpacing: 0.2,
    }}>
      {status.replace('_', ' ')}
    </span>
  )
}

function SegmentChip({ segment }: { segment: string }) {
  const isSecAI = segment === 'security_ai'
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: 999,
      background: isSecAI ? tokens.tealLight : tokens.goldLight,
      color: isSecAI ? tokens.primary : tokens.goldDark,
      fontFamily: fonts.body,
      fontSize: 11,
      fontWeight: 600,
    }}>
      {isSecAI ? 'Security / AI' : 'SaaS Product'}
    </span>
  )
}

function intentLabel(dayOffset: number | null): string {
  if (dayOffset === null) return 'Touch'
  if (dayOffset === 0) return 'First touch'
  if (dayOffset >= 5) return 'Value drop'
  return 'Follow-up'
}

// Current step = highest step_number among sent touches for this enrollment,
// plus one for the step about to go out next (or 1 if nothing has sent yet).
function currentStepForEnrollment(enrollmentId: string, timeline: TouchTimelineRow[]): number {
  const sentSteps = timeline
    .filter((row) => row.enrollment_id === enrollmentId && row.status === 'sent')
    .map((row) => row.step?.step_number ?? 0)
  return sentSteps.length > 0 ? Math.max(...sentSteps) + 1 : 1
}

function formatIST(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

export function LeadDrawer({
  leadId,
  onClose,
  onConverted,
  onDeleted,
}: {
  leadId: string
  onClose: () => void
  onConverted?: (clientId: string) => void
  onDeleted?: () => void
}) {
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  const [timeline, setTimeline] = useState<TouchTimelineRow[]>([])
  const [replies, setReplies] = useState<ReplyMessageRow[]>([])
  const [sequences, setSequences] = useState<SequenceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSeq, setSelectedSeq] = useState('')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0])
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<string | null>(null)
  const [convertOpen, setConvertOpen] = useState(false)
  const [obsValue, setObsValue] = useState('')
  const [obsSavedValue, setObsSavedValue] = useState('')
  const [obsSaveState, setObsSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')

  // Delete lead state
  const [deleteDialog, setDeleteDialog] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Cancel enrollment state
  const [cancelEnrollId, setCancelEnrollId] = useState<string | null>(null)
  const [cancelEnrollName, setCancelEnrollName] = useState('')
  const [cancelling, setCancelling] = useState(false)

  // Reply state
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [replySaving, setReplySaving] = useState(false)

  // LinkedIn status auto-prompt: shown once when lead loads with status 'none'
  const [showLinkedInPrompt, setShowLinkedInPrompt] = useState(false)

  // Website warning on enroll
  const [websiteWarn, setWebsiteWarn] = useState(false)
  const websiteInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setStartDate(new Date().toISOString().split('T')[0])
  }, [leadId])

  useEffect(() => {
    if (lead?.source === 'linkedin_visitor' && sequences.length > 0 && !selectedSeq) {
      const liSeq = sequences.find((s) => s.name === 'LinkedIn Outreach')
      if (liSeq) setSelectedSeq(liSeq.id)
    }
  }, [lead?.source, sequences])

  useEffect(() => {
    if (lead) {
      const obs = lead.specific_observation ?? ''
      setObsValue(obs)
      setObsSavedValue(obs)
    }
  }, [lead?.id])

  // Show LinkedIn prompt once when lead loads with status 'none'
  useEffect(() => {
    if (lead && lead.linkedin_status === 'none') {
      setShowLinkedInPrompt(true)
    }
  }, [lead?.id])

  async function load() {
    setLoading(true)
    const [leadRes, enrollRes, touchRes, seqRes, replyRes] = await Promise.all([
      supabase.from('leads').select('*').eq('id', leadId).single(),
      supabase.from('lead_enrollments').select(`
        id, sequence_id, status, started_at,
        sequence:sequences!sequence_id (name, segment)
      `).eq('lead_id', leadId).order('started_at', { ascending: false }),
      supabase.from('outreach_touches').select(`
        id, channel, status, scheduled_for, sent_at, opened_at, bounced_at, skipped_reason, subject_snapshot, enrollment_id,
        step:sequence_steps!step_id (step_number, day_offset),
        enrollment:lead_enrollments!enrollment_id (sequence:sequences!sequence_id (name))
      `).eq('lead_id', leadId).order('scheduled_for', { ascending: false }).limit(50),
      supabase.from('sequences').select('id, name, segment, is_active').eq('is_active', true).order('name'),
      supabase.from('reply_messages').select('id, body, logged_at').eq('lead_id', leadId).order('logged_at', { ascending: false }),
    ])
    setLead(leadRes.data as LeadDetail)
    setEnrollments((enrollRes.data ?? []) as EnrollmentRow[])
    setTimeline((touchRes.data ?? []) as TouchTimelineRow[])
    setSequences((seqRes.data ?? []) as SequenceRow[])
    setReplies((replyRes.data ?? []) as ReplyMessageRow[])
    setLoading(false)
  }

  useEffect(() => { load() }, [leadId])

  async function saveLead(updates: Partial<LeadDetail>) {
    if (!lead) return
    setSaving(true)
    await supabase.from('leads').update(updates).eq('id', lead.id)
    setLead((prev) => prev ? { ...prev, ...updates } : prev)
    setSaving(false)
  }

  async function saveObservation() {
    if (!lead) return
    setObsSaveState('saving')
    const trimmed = obsValue.trim() || null
    await supabase.from('leads').update({ specific_observation: trimmed }).eq('id', lead.id)
    setLead((prev) => prev ? { ...prev, specific_observation: trimmed } : prev)
    setObsSavedValue(obsValue)
    setObsSaveState('saved')
    setTimeout(() => setObsSaveState('idle'), 1500)
  }

  async function handleEnroll(skipWebsiteCheck = false) {
    if (!selectedSeq || !startDate) return
    if (!skipWebsiteCheck && !lead?.website) {
      setWebsiteWarn(true)
      return
    }
    setWebsiteWarn(false)
    setEnrolling(true)
    setEnrollError(null)
    const { error: rpcErr } = await supabase.rpc('enroll_lead', {
      p_lead_id: leadId,
      p_sequence_id: selectedSeq,
      p_start_date: startDate,
    })
    if (rpcErr) {
      const msg = rpcErr.message ?? ''
      if (msg.includes('missing_observation')) setEnrollError('Add a personalized observation before enrolling in this email sequence.')
      else if (msg.includes('already_enrolled')) setEnrollError('This lead is already enrolled in this sequence.')
      else setEnrollError('Could not enroll. Check the console and try again.')
    } else {
      await load()
    }
    setEnrolling(false)
  }

  async function handleMarkReplied() {
    if (!lead) return
    await supabase.rpc('mark_lead_replied', { p_lead_id: lead.id })
    await load()
    setConfirmDialog(null)
  }

  async function handleStatusChange(status: LeadStatus) {
    await saveLead({ status })
    setConfirmDialog(null)
  }

  async function handleDeleteLead() {
    if (!lead) return
    setDeleting(true)
    setDeleteError(null)
    // Guard: block delete if any touch was sent
    const { count } = await supabase
      .from('outreach_touches')
      .select('id', { count: 'exact', head: true })
      .eq('lead_id', lead.id)
      .eq('status', 'sent')
    if ((count ?? 0) > 0) {
      setDeleteError('This lead has sent emails and cannot be deleted. Archive instead.')
      setDeleting(false)
      return
    }
    await supabase.from('leads').delete().eq('id', lead.id)
    setDeleting(false)
    setDeleteDialog(false)
    onDeleted?.()
  }

  async function handleCancelEnrollment(enrollmentId: string) {
    setCancelling(true)
    // Cancel scheduled touches for this enrollment
    await supabase
      .from('outreach_touches')
      .update({ status: 'cancelled', skipped_reason: 'enrollment_cancelled' })
      .eq('enrollment_id', enrollmentId)
      .eq('status', 'scheduled')
    // Set enrollment status to cancelled
    await supabase
      .from('lead_enrollments')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() } as Record<string, unknown>)
      .eq('id', enrollmentId)
    setCancelling(false)
    setCancelEnrollId(null)
    await load()
  }

  async function handleLogReply() {
    if (!lead || !replyBody.trim()) return
    setReplySaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('reply_messages').insert({
      lead_id: lead.id,
      body: replyBody.trim(),
      logged_by: session?.user?.id ?? null,
    })
    // Auto-set lead status to 'replied' after first reply
    if (lead.status !== 'replied') {
      await supabase.rpc('mark_lead_replied', { p_lead_id: lead.id })
    }
    setReplyBody('')
    setReplyOpen(false)
    setReplySaving(false)
    await load()
  }

  const activeEnrollments = enrollments.filter((e) => e.status === 'active')

  const lastTouchAt = timeline
    .filter((row) => row.status === 'sent' && row.sent_at)
    .reduce<string | null>((latest, row) => (!latest || row.sent_at! > latest ? row.sent_at! : latest), null)

  // Build combined timeline (touches + replies) sorted by date DESC
  const combinedTimeline: TimelineItem[] = [
    ...timeline.map((t): TimelineItem => ({ kind: 'touch', data: t })),
    ...replies.map((r): TimelineItem => ({ kind: 'reply', data: r })),
  ].sort((a, b) => {
    const dateA = a.kind === 'touch' ? a.data.scheduled_for : a.data.logged_at
    const dateB = b.kind === 'touch' ? b.data.scheduled_for : b.data.logged_at
    return dateB.localeCompare(dateA)
  })

  if (loading || !lead) {
    return (
      <SidePanel title="Lead" onClose={onClose} width={520}>
        <p style={{ fontFamily: fonts.body, fontSize: 14, color: t.text.muted }}>Loading...</p>
      </SidePanel>
    )
  }

  // Double enrollment guard: active enrollment in a DIFFERENT sequence
  const activeInOther = selectedSeq
    ? activeEnrollments.find((e) => e.sequence_id !== selectedSeq)
    : null

  return (
    <SidePanel
      title={`${lead.first_name} ${lead.last_name ?? ''}`}
      subtitle={lead.role_title ? `${lead.company} · ${lead.role_title}` : lead.company}
      onClose={onClose}
      width={520}
    >
      <div style={styles.drawerBody}>
        {/* Header chips */}
        <div style={styles.chipRow}>
          <SegmentChip segment={lead.segment} />
          <StatusChip status={lead.status} />
        </div>

        {lastTouchAt && (
          <span style={styles.lastTouch}>Last touch {formatIST(lastTouchAt)}</span>
        )}

        {error && <div style={styles.errorBanner}>{error}</div>}

        {/* Editable fields */}
        <Section title="Contact info">
          <FieldRow label="First name">
            <EditableInput value={lead.first_name} onSave={(v) => saveLead({ first_name: v })} />
          </FieldRow>
          <FieldRow label="Last name">
            <EditableInput value={lead.last_name ?? ''} onSave={(v) => saveLead({ last_name: v || null })} />
          </FieldRow>
          <FieldRow label="Email">
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <EditableInput value={lead.email ?? ''} onSave={(v) => saveLead({ email: v || null })} type="email" />
              {lead.email && (
                <a href={`mailto:${lead.email}`} style={styles.extLink}>
                  <Mail size={13} />
                </a>
              )}
            </div>
          </FieldRow>
          <FieldRow label="Business phone">
            <EditableInput value={lead.phone_business ?? ''} onSave={(v) => saveLead({ phone_business: v || null })} />
          </FieldRow>
          <FieldRow label="Personal phone">
            <EditableInput value={lead.phone_personal ?? ''} onSave={(v) => saveLead({ phone_personal: v || null })} />
          </FieldRow>
          <FieldRow label="LinkedIn URL">
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <EditableInput value={lead.linkedin_url ?? ''} onSave={(v) => saveLead({ linkedin_url: v || null })} />
              {lead.linkedin_url && (
                <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer" style={styles.extLink}>
                  <ExternalLink size={13} />
                </a>
              )}
            </div>
          </FieldRow>
          <FieldRow label="Role title">
            <EditableInput value={lead.role_title ?? ''} onSave={(v) => saveLead({ role_title: v || null })} />
          </FieldRow>
          <FieldRow label="Company">
            <EditableInput value={lead.company} onSave={(v) => saveLead({ company: v })} />
          </FieldRow>
          <FieldRow label="Website">
            <div ref={websiteInputRef as React.RefObject<HTMLDivElement>}>
              <EditableInput value={lead.website ?? ''} onSave={(v) => saveLead({ website: v || null })} />
            </div>
          </FieldRow>
          <FieldRow label="Country">
            <EditableInput value={lead.country ?? ''} onSave={(v) => saveLead({ country: v || null })} />
          </FieldRow>
        </Section>

        {/* Personalized observation */}
        <div style={styles.obsCard}>
          <span style={styles.obsLabel}>Personalized observation</span>
          <span style={styles.obsHelper}>Written fresh for this lead. All email sends are blocked without it.</span>
          <textarea
            value={obsValue}
            onChange={(e) => setObsValue(e.target.value)}
            style={{ ...styles.textarea, marginTop: 8 }}
            rows={3}
            placeholder="e.g. the dashboard shows all metrics at equal weight with no visual hierarchy to guide the user toward the most actionable signal first."
          />
          <div style={styles.obsFooter}>
            <span style={{
              ...styles.obsCharCount,
              color: obsValue.trim().length > 0 && obsValue.trim().length < 60
                ? tokens.goldDark
                : t.text.muted,
            }}>
              {obsValue.trim().length} chars (target 100-200)
            </span>
          </div>
          {obsValue.trim().length > 0 && obsValue.trim().length < 60 && (
            <p style={styles.obsShortWarn}>
              This observation may be too short to feel specific to this lead.
            </p>
          )}
          <span style={styles.obsQualityHint}>
            Start with the product area, describe what is missing or broken, explain the business impact. Only write what you saw on their actual site.
          </span>
          {(obsValue !== obsSavedValue || obsSaveState === 'saved') && (
            <button
              type="button"
              style={{
                ...styles.primaryBtn,
                alignSelf: 'flex-start' as const,
                marginTop: 6,
                opacity: obsSaveState === 'saving' ? 0.6 : 1,
                transition: `opacity ${motionTokens.durationBase} ${motionTokens.easeDefault}`,
              }}
              onClick={saveObservation}
              disabled={obsSaveState === 'saving'}
            >
              {obsSaveState === 'saved' ? 'Saved' : 'Save'}
            </button>
          )}
        </div>

        {/* LinkedIn status */}
        <Section title="LinkedIn status">
          <FieldRow label="Connection status">
            <select
              style={styles.select}
              value={lead.linkedin_status}
              onChange={(e) => {
                saveLead({ linkedin_status: e.target.value as LinkedInStatus })
                setShowLinkedInPrompt(false)
              }}
            >
              <option value="none">None</option>
              <option value="request_sent">Request sent</option>
              <option value="connected">Connected</option>
              <option value="ignored">Ignored</option>
            </select>
          </FieldRow>
          {showLinkedInPrompt && lead.linkedin_status === 'none' && (
            <div style={styles.linkedInPrompt}>
              <span style={styles.linkedInPromptText}>
                Did you send a connect request? Update status to track follow-ups correctly.
              </span>
              <button
                type="button"
                style={styles.linkedInPromptDismiss}
                onClick={() => setShowLinkedInPrompt(false)}
                aria-label="Dismiss"
              >
                <X size={13} />
              </button>
            </div>
          )}
        </Section>

        {/* Notes */}
        <Section title="Notes">
          <textarea
            key={lead.id + 'notes'}
            defaultValue={lead.notes ?? ''}
            style={styles.textarea}
            rows={3}
            placeholder="Any context about this lead..."
            onBlur={(e) => {
              const val = e.target.value.trim()
              if (val !== (lead.notes ?? '').trim()) saveLead({ notes: val || null })
            }}
          />
        </Section>

        {/* Enroll section */}
        <Section title="Enroll in sequence">
          {/* Active enrollments with cancel button */}
          {activeEnrollments.length > 0 && (
            <div style={styles.activeEnrollList}>
              {activeEnrollments.map((enr) => (
                <div key={enr.id} style={styles.activeEnrollRow}>
                  <span style={styles.activeEnrollName}>
                    {enr.sequence?.name ?? 'Sequence'} · Step {currentStepForEnrollment(enr.id, timeline)}
                  </span>
                  <button
                    type="button"
                    style={styles.cancelEnrollBtn}
                    title="Cancel enrollment"
                    onClick={() => {
                      setCancelEnrollId(enr.id)
                      setCancelEnrollName(enr.sequence?.name ?? 'this sequence')
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Cancel enrollment confirmation */}
          {cancelEnrollId && (
            <div style={styles.confirmCard}>
              <p style={styles.confirmText}>
                Cancel <strong>{cancelEnrollName}</strong> enrollment? Remaining scheduled touches will be cancelled.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  style={{ ...styles.primaryBtn, opacity: cancelling ? 0.6 : 1 }}
                  onClick={() => handleCancelEnrollment(cancelEnrollId)}
                  disabled={cancelling}
                >
                  {cancelling ? 'Cancelling...' : 'Yes, cancel'}
                </button>
                <button type="button" style={styles.outlineBtn} onClick={() => setCancelEnrollId(null)}>
                  Keep
                </button>
              </div>
            </div>
          )}

          <div style={styles.enrollRow}>
            <select
              style={{ ...styles.select, flex: 1 }}
              value={selectedSeq}
              onChange={(e) => { setSelectedSeq(e.target.value); setEnrollError(null) }}
            >
              <option value="">Select sequence...</option>
              {sequences.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.segment && s.segment !== lead.segment ? ' (segment mismatch)' : ''}
                </option>
              ))}
            </select>
            <input
              type="date"
              style={styles.dateInput}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          {selectedSeq && (() => {
            const seq = sequences.find((s) => s.id === selectedSeq)
            const alreadyActive = activeEnrollments.some((e) => e.sequence_id === selectedSeq)
            if (alreadyActive) {
              return <p style={styles.enrollNote}>Already enrolled. See timeline below.</p>
            }
            // Double enrollment guard: active enrollment in a different sequence
            if (activeInOther) {
              return (
                <p style={styles.warnNote}>
                  Already enrolled in <strong>{activeInOther.sequence?.name ?? 'another sequence'}</strong>. Cancel it first or choose the same sequence.
                </p>
              )
            }
            const mismatch = seq?.segment && seq.segment !== lead.segment
            return (
              <>
                {mismatch && (
                  <p style={styles.warnNote}>This sequence targets a different segment.</p>
                )}
                {enrollError && <p style={styles.errorNote}>{enrollError}</p>}
                {websiteWarn && (
                  <div style={styles.websiteWarn}>
                    <p style={styles.websiteWarnText}>
                      No website on file. Writing an observation without reviewing their site reduces reply rate. Add website or proceed anyway?
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        style={styles.outlineBtn}
                        onClick={() => {
                          setWebsiteWarn(false)
                          websiteInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          const input = websiteInputRef.current?.querySelector('input')
                          if (input) input.focus()
                        }}
                      >
                        Add website
                      </button>
                      <button
                        type="button"
                        style={{ ...styles.primaryBtn, opacity: enrolling ? 0.6 : 1 }}
                        onClick={() => handleEnroll(true)}
                        disabled={enrolling}
                      >
                        Enroll anyway
                      </button>
                    </div>
                  </div>
                )}
                {!websiteWarn && (
                  <button
                    type="button"
                    style={{ ...styles.primaryBtn, opacity: enrolling ? 0.6 : 1 }}
                    onClick={() => handleEnroll(false)}
                    disabled={enrolling}
                  >
                    {enrolling ? 'Enrolling...' : 'Enroll'}
                  </button>
                )}
              </>
            )
          })()}
        </Section>

        {/* Status actions */}
        <Section title="Actions">
          <div style={styles.actionRow}>
            {(lead.status === 'new' || lead.status === 'active') && (
              <>
                <button
                  type="button"
                  style={styles.outlineBtn}
                  onClick={() => setConfirmDialog('replied')}
                >
                  Mark replied
                </button>
                <button
                  type="button"
                  style={styles.outlineBtn}
                  onClick={() => handleStatusChange('meeting_booked')}
                >
                  Meeting booked
                </button>
                <button type="button" style={styles.ghostBtn} onClick={() => handleStatusChange('not_interested')}>
                  Not interested
                </button>
              </>
            )}
            {(lead.status === 'replied' || lead.status === 'meeting_booked') && (
              <>
                <button type="button" style={styles.primaryBtn} onClick={() => setConvertOpen(true)}>
                  Convert to client
                </button>
                <button type="button" style={styles.ghostBtn} onClick={() => handleStatusChange('not_interested')}>
                  Not interested
                </button>
              </>
            )}
            {lead.status !== 'archived' && (
              <button type="button" style={styles.ghostBtn} onClick={() => handleStatusChange('archived')}>
                Archive
              </button>
            )}
          </div>
          {confirmDialog === 'replied' && (
            <div style={styles.confirmCard}>
              <p style={styles.confirmText}>This will stop all active sequences for this lead. Continue?</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" style={styles.primaryBtn} onClick={handleMarkReplied}>
                  Confirm
                </button>
                <button type="button" style={styles.outlineBtn} onClick={() => setConfirmDialog(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Delete lead */}
          <button
            type="button"
            style={styles.destructiveGhostBtn}
            onClick={() => { setDeleteDialog(true); setDeleteError(null) }}
          >
            Delete lead
          </button>
          {deleteDialog && (
            <div style={styles.deleteCard}>
              <p style={styles.deleteText}>
                Delete <strong>{lead.first_name}</strong>? This cannot be undone.
              </p>
              {deleteError && <p style={styles.deleteErrorText}>{deleteError}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  style={{ ...styles.rubyBtn, opacity: deleting ? 0.6 : 1 }}
                  onClick={handleDeleteLead}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
                <button type="button" style={styles.outlineBtn} onClick={() => { setDeleteDialog(false); setDeleteError(null) }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* Timeline */}
        <Section title="Timeline">
          {combinedTimeline.length === 0 ? (
            <p style={styles.mutedText}>No activity yet. Enroll in a sequence to get started.</p>
          ) : (
            <div style={styles.timeline}>
              {combinedTimeline.map((item) =>
                item.kind === 'touch' ? (
                  <TimelineEntry key={item.data.id} touch={item.data} />
                ) : (
                  <ReplyEntry key={item.data.id} reply={item.data} />
                )
              )}
            </div>
          )}
        </Section>

        {/* Log reply */}
        {lead.status !== 'replied' && (
          <Section title="Log a reply">
            {!replyOpen ? (
              <button
                type="button"
                style={styles.ghostBtn}
                onClick={() => setReplyOpen(true)}
              >
                + Log a reply from this lead
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <textarea
                  style={styles.textarea}
                  rows={3}
                  placeholder="Paste or summarize the reply..."
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    style={{ ...styles.primaryBtn, opacity: (replySaving || !replyBody.trim()) ? 0.5 : 1 }}
                    onClick={handleLogReply}
                    disabled={replySaving || !replyBody.trim()}
                  >
                    {replySaving ? 'Saving...' : 'Save reply'}
                  </button>
                  <button type="button" style={styles.outlineBtn} onClick={() => { setReplyOpen(false); setReplyBody('') }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Convert to client modal */}
        {convertOpen && (
          <ConvertModal
            lead={lead}
            onClose={() => setConvertOpen(false)}
            onConverted={async (clientId) => {
              await supabase
                .from('leads')
                .update({ converted_client_id: clientId, status: 'converted' })
                .eq('id', lead.id)
              await supabase
                .from('outreach_touches')
                .update({ status: 'cancelled', skipped_reason: 'lead_converted' })
                .eq('lead_id', lead.id)
                .eq('status', 'scheduled')
              setConvertOpen(false)
              await load()
              onConverted?.(clientId)
            }}
          />
        )}
      </div>
    </SidePanel>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.section}>
      <h3 style={styles.sectionTitle}>{title}</h3>
      {children}
    </div>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={styles.fieldRow}>
      <span style={styles.fieldLabel}>{label}</span>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}

function EditableInput({
  value,
  onSave,
  type = 'text',
}: {
  value: string
  onSave: (v: string) => void
  type?: string
}) {
  return (
    <input
      type={type}
      defaultValue={value}
      style={styles.inlineInput}
      onBlur={(e) => {
        if (e.target.value !== value) onSave(e.target.value)
      }}
    />
  )
}

function TimelineEntry({ touch }: { touch: TouchTimelineRow }) {
  const seqName = touch.enrollment?.sequence?.name ?? 'Sequence'
  const isEmail = touch.channel === 'email'
  const isCancelled = touch.status === 'cancelled'
  const label = intentLabel(touch.step?.day_offset ?? null)

  const badgeBg =
    touch.status === 'sent' ? tokens.greenLight :
    touch.status === 'failed' ? tokens.rubyLight :
    isCancelled ? t.background.muted :
    t.background.muted

  const badgeFg =
    touch.status === 'sent' ? tokens.green :
    touch.status === 'failed' ? tokens.ruby :
    isCancelled ? t.text.disabled :
    t.text.muted

  return (
    <div style={{
      ...styles.timelineEntry,
      opacity: isCancelled ? 0.6 : 1,
    }}>
      <div style={styles.timelineIcon}>
        {isEmail ? <Mail size={13} color={isCancelled ? t.text.disabled : t.text.muted} /> : <Linkedin size={13} color={isCancelled ? t.text.disabled : t.text.muted} />}
      </div>
      <div style={styles.timelineContent}>
        <span style={{
          ...styles.timelineLabel,
          textDecoration: isCancelled ? 'line-through' : 'none',
          color: isCancelled ? t.text.muted : t.text.primary,
        }}>
          {label}
        </span>
        <span style={styles.timelineSeq}>{seqName}</span>
        <span style={styles.timelineMeta}>
          {touch.status === 'sent' && touch.sent_at ? `Sent ${formatDate(touch.sent_at)}` : null}
          {touch.status === 'skipped' ? `Skipped: ${touch.skipped_reason ?? 'manually'}` : null}
          {touch.status === 'scheduled' ? `Due ${formatDate(touch.scheduled_for)}` : null}
          {isCancelled ? `Cancelled${touch.skipped_reason ? ': ' + touch.skipped_reason.replace(/_/g, ' ') : ''}` : null}
          {touch.status === 'failed' ? 'Failed to send' : null}
          {touch.opened_at ? ' · Opened' : null}
          {touch.bounced_at ? ' · Bounced' : null}
        </span>
      </div>
      <span style={{ ...styles.timelineBadge, background: badgeBg, color: badgeFg }}>
        {touch.status}
      </span>
    </div>
  )
}

function ReplyEntry({ reply }: { reply: ReplyMessageRow }) {
  const preview = reply.body.length > 100 ? reply.body.slice(0, 100) + '…' : reply.body
  return (
    <div style={styles.timelineEntry}>
      <div style={styles.timelineIcon}>
        <Reply size={13} color={tokens.green} />
      </div>
      <div style={styles.timelineContent}>
        <span style={{ ...styles.timelineLabel, color: tokens.green }}>Reply logged</span>
        <span style={styles.timelineMeta}>{preview}</span>
        <span style={{ ...styles.timelineMeta, marginTop: 2 }}>{formatDate(reply.logged_at)}</span>
      </div>
      <span style={{ ...styles.timelineBadge, background: tokens.greenLight, color: tokens.green }}>
        reply
      </span>
    </div>
  )
}

function ConvertModal({
  lead,
  onClose,
  onConverted,
}: {
  lead: LeadDetail
  onClose: () => void
  onConverted: (clientId: string) => void
}) {
  const [name, setName] = useState(`${lead.first_name} ${lead.last_name ?? ''}`.trim())
  const [email, setEmail] = useState(lead.email ?? '')
  const [company, setCompany] = useState(lead.company)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!name || !company) { setError('Name and company are required.'); return }
    setCreating(true)
    setError(null)
    const { data, error: fnErr } = await supabase.functions.invoke('admin-create-client', {
      body: { name, email: email || undefined, company_name: company, currency: 'USD' },
    })
    if (fnErr || !data?.clientId) {
      setError('Could not create client record. Try again.')
      setCreating(false)
      return
    }
    onConverted(data.clientId)
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.convertPanel}>
        <h3 style={styles.convertTitle}>Convert to client</h3>
        <p style={styles.convertHint}>
          Creates a client record. The lead record is preserved with status "converted".
        </p>
        <div style={styles.convertFields}>
          <label style={styles.convertLabel}>
            Full name *
            <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label style={styles.convertLabel}>
            Email
            <input type="email" style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label style={styles.convertLabel}>
            Company *
            <input style={styles.input} value={company} onChange={(e) => setCompany(e.target.value)} />
          </label>
        </div>
        {error && <div style={styles.errorBanner}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" style={styles.outlineBtn} onClick={onClose}>Cancel</button>
          <button
            type="button"
            style={{ ...styles.primaryBtn, opacity: creating ? 0.6 : 1 }}
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? 'Creating...' : 'Create client'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  drawerBody: { display: 'flex', flexDirection: 'column', gap: 24 },
  chipRow: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  section: { display: 'flex', flexDirection: 'column', gap: 12 },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
    fontWeight: 600,
    color: t.text.primary,
    margin: 0,
    paddingBottom: 8,
    borderBottom: `1px solid ${t.border.subtle}`,
  },
  fieldRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minHeight: 32,
  },
  fieldLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
    width: 110,
    flexShrink: 0,
  },
  inlineInput: {
    width: '100%',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: 'transparent',
    border: `1px solid transparent`,
    borderRadius: 6,
    padding: '4px 8px',
    outline: 'none',
    transition: `border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '9px 12px',
    outline: 'none',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    lineHeight: 1.5,
  },
  select: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '7px 10px',
    outline: 'none',
  },
  obsCard: {
    background: t.background.tint1,
    border: `1px solid ${t.border.brand}`,
    borderRadius: 8,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
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
  obsFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  obsCharCount: {
    fontFamily: mono,
    fontSize: 11,
  },
  obsShortWarn: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.goldDark,
    background: tokens.goldLight,
    border: `1px solid ${tokens.gold}`,
    borderRadius: 6,
    padding: '5px 9px',
    margin: 0,
  },
  obsQualityHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: t.text.muted,
    lineHeight: 1.45,
  },
  linkedInPrompt: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    background: tokens.goldLight,
    border: `1px solid ${tokens.gold}`,
    borderRadius: 8,
    padding: '9px 12px',
    marginTop: 8,
  },
  linkedInPromptText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.goldDark,
    flex: 1,
    margin: 0,
    lineHeight: 1.45,
  },
  linkedInPromptDismiss: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 2,
    color: tokens.goldDark,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  websiteWarn: {
    background: tokens.goldLight,
    border: `1px solid ${tokens.gold}`,
    borderRadius: 8,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  websiteWarnText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.goldDark,
    margin: 0,
    lineHeight: 1.45,
  },
  activeEnrollList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 6,
    marginBottom: 4,
  },
  activeEnrollRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: tokens.tealLight,
    borderRadius: 8,
    padding: '7px 10px',
  },
  activeEnrollName: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.primary,
    fontWeight: 500,
  },
  cancelEnrollBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    color: t.text.muted,
    display: 'flex',
    alignItems: 'center',
    borderRadius: 4,
    flexShrink: 0,
  },
  enrollRow: { display: 'flex', gap: 8 },
  dateInput: {
    fontFamily: mono,
    fontSize: 13,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '7px 10px',
    outline: 'none',
  },
  enrollNote: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted, margin: 0 },
  warnNote: { fontFamily: fonts.body, fontSize: 12, color: tokens.goldDark, margin: 0 },
  errorNote: { fontFamily: fonts.body, fontSize: 12, color: tokens.ruby, margin: 0 },
  actionRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  primaryBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    cursor: 'pointer',
  },
  outlineBtn: {
    background: tokens.surface,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 13,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '7px 12px',
    cursor: 'pointer',
  },
  ghostBtn: {
    background: 'none',
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.muted,
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '4px 0',
  },
  destructiveGhostBtn: {
    background: 'none',
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.ruby,
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '4px 0',
    marginTop: 4,
  },
  rubyBtn: {
    background: tokens.ruby,
    color: '#fff',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    cursor: 'pointer',
  },
  confirmCard: {
    background: tokens.rubyLight,
    border: `1px solid ${t.border.danger}`,
    borderRadius: 8,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  confirmText: { fontFamily: fonts.body, fontSize: 13, color: tokens.ruby, margin: 0 },
  deleteCard: {
    background: tokens.rubyLight,
    border: `1px solid ${t.border.danger}`,
    borderRadius: 8,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  deleteText: { fontFamily: fonts.body, fontSize: 13, color: tokens.ruby, margin: 0 },
  deleteErrorText: { fontFamily: fonts.body, fontSize: 12, color: tokens.ruby, margin: 0, fontWeight: 500 },
  timeline: { display: 'flex', flexDirection: 'column', gap: 0 },
  timelineEntry: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '10px 0',
    borderBottom: `1px solid ${t.border.subtle}`,
  },
  timelineIcon: { flexShrink: 0, marginTop: 2 },
  timelineContent: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  timelineLabel: { fontFamily: fonts.body, fontSize: 13, color: t.text.primary },
  timelineSeq: { fontFamily: fonts.body, fontSize: 11, color: t.text.muted },
  timelineMeta: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted },
  timelineBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    flexShrink: 0,
  },
  mutedText: { fontFamily: fonts.body, fontSize: 13, color: t.text.muted, margin: 0 },
  errorBanner: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
  },
  extLink: { color: t.text.urlLink, display: 'flex' },
  lastTouch: {
    fontFamily: mono,
    fontSize: 12,
    color: t.text.muted,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: t.background.scrim,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 400,
  },
  convertPanel: {
    background: tokens.surface,
    borderRadius: 12,
    border: `1px solid ${t.border.default}`,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  convertTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: t.text.primary,
    margin: 0,
  },
  convertHint: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary, margin: 0 },
  convertFields: { display: 'flex', flexDirection: 'column', gap: 12 },
  convertLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
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
    padding: '9px 12px',
    outline: 'none',
    fontWeight: 400,
  },
}
