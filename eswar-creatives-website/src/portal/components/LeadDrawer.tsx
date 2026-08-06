// Lead drawer: full lead detail, editable fields, enrollment, timeline, convert to client.
// SidePanel on desktop, full-screen bottom sheet on mobile (handled by SidePanel itself).
import { useEffect, useRef, useState } from 'react'
import { ExternalLink, Clock, Mail, Linkedin, X, Reply, ChevronDown, Sparkles, Loader2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'
import { SidePanel } from '../admin/SidePanel'
import { mono } from '../admin/ui'
import { formatPortalDate } from '../utils/formatDate'
import { showToast } from '../admin/toast'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { ScoreRing, type ScoringState } from './shared/ScoreRing'
import { SegmentSelect } from './shared/SegmentSelect'
import type { Vertical } from './shortlist/types'

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
  follow_up_date: string | null
  draft_message: string | null
  vertical: 'design_systems' | 'branding' | null
  icp_score: number | null
  icp_match_reason: string | null
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
  body_snapshot: string | null
  enrollment_id: string
  step: {
    step_number: number
    day_offset: number | null
    subject_template: string | null
    body_template: string | null
  } | null
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
  const { isMobile } = useBreakpoint()
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [scoringState, setScoringState] = useState<ScoringState>('idle')
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
  const [obsSaveState, setObsSaveState] = useState<'idle' | 'saving'>('idle')
  const [followUpValue, setFollowUpValue] = useState('')
  const [followUpSavedValue, setFollowUpSavedValue] = useState('')
  const [followUpSaving, setFollowUpSaving] = useState(false)

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

  // Outreach skills: multi-select applied when generating/refining the draft
  // message. lastGenerated is the exact text last written by the AI — if the
  // saved value later differs from it, that's a real human edit worth logging
  // as feedback for future generations to learn from.
  const [skills, setSkills] = useState<{ id: string; name: string }[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([])
  const [generatingMessage, setGeneratingMessage] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [lastGenerated, setLastGenerated] = useState<string | null>(null)
  const draftRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    supabase
      .from('outreach_skills')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        const rows = (data ?? []) as { id: string; name: string }[]
        setSkills(rows)
        // Every uploaded skill applies by default; the checkboxes below let
        // an admin narrow it down for a specific message.
        setSelectedSkillIds(rows.map((s) => s.id))
      })
  }, [])

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
      const followUp = lead.follow_up_date ?? ''
      setFollowUpValue(followUp)
      setFollowUpSavedValue(followUp)
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
        id, channel, status, scheduled_for, sent_at, opened_at, bounced_at, skipped_reason, subject_snapshot, body_snapshot, enrollment_id,
        step:sequence_steps!step_id (step_number, day_offset, subject_template, body_template),
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

  async function handleScoreThisLead(vertical: Vertical) {
    if (!lead) return
    const prevLead = lead
    setScoringState('loading')
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token ?? ''
      const { data, error: fnErr } = await supabase.functions.invoke('score-single-lead', {
        body: { lead_id: lead.id, vertical },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (fnErr || typeof data?.icp_score !== 'number') {
        setScoringState('error')
        return
      }

      const icp_score: number = data.icp_score
      const icp_match_reason: string | null = data.icp_match_reason ?? null

      // Optimistic update: show the new score immediately, then persist.
      setLead({ ...prevLead, icp_score, icp_match_reason, vertical })
      setScoringState('idle')

      const { error: updateErr } = await supabase
        .from('leads')
        .update({ icp_score, icp_match_reason, vertical })
        .eq('id', lead.id)
      if (updateErr) {
        setLead(prevLead)
        setScoringState('error')
      }
    } catch {
      setLead(prevLead)
      setScoringState('error')
    }
  }

  async function saveObservation() {
    if (!lead) return
    setObsSaveState('saving')
    const trimmed = obsValue.trim() || null
    await supabase.from('leads').update({ specific_observation: trimmed }).eq('id', lead.id)
    setLead((prev) => prev ? { ...prev, specific_observation: trimmed } : prev)
    setObsSavedValue(obsValue)
    setObsSaveState('idle')
    showToast('Observation saved', 'success')
  }

  async function handleSaveFollowUp() {
    if (!lead) return
    setFollowUpSaving(true)
    const value = followUpValue || null
    await supabase.from('leads').update({ follow_up_date: value }).eq('id', lead.id)
    setLead((prev) => prev ? { ...prev, follow_up_date: value } : prev)
    setFollowUpSavedValue(followUpValue)
    setFollowUpSaving(false)
    if (value) {
      const reminderDate = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'UTC',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(value))
      showToast(`We'll remind you on ${reminderDate}`, 'success')
    }
  }

  // Mirrors OutreachSendModal's renderTemplate exactly (substitution + double
  // -period collapse + em dash strip; no possessive fix, that one's applied
  // server-side only in send-outreach-email) — so "Apply skills" starts from
  // the same text a reviewer would see in "Review and Send", not a message
  // invented independently from raw lead facts.
  function renderReviewAndSendBody(template: string, leadForRender: LeadDetail): string {
    const vars: Record<string, string> = {
      first_name: leadForRender.first_name,
      company: leadForRender.company,
      specific_observation: leadForRender.specific_observation ?? '',
      flow: 'product',
      unsubscribe_url: `https://www.eswarcreatives.in/unsubscribe/${leadForRender.unsubscribe_token}`,
      topic: '{{topic}}',
    }
    let out = template
    for (const [key, val] of Object.entries(vars)) out = out.replaceAll(`{{${key}}}`, val)
    out = out.replace(/\.\s*\./g, '.')
    out = out.replace(/—/g, '')
    return out
  }

  // The lead's next actionable email touch — same one "Review and Send" would
  // open — found from the timeline already loaded for this drawer rather than
  // a second query. Held/scheduled only; earliest scheduled_for first. Returns
  // the full row (not just the step) so callers can name the sequence/step in
  // copy, not just use the template text.
  function findNextEmailTouch(): TouchTimelineRow | null {
    const candidates = timeline
      .filter((row) => row.channel === 'email' && (row.status === 'scheduled' || row.status === 'held') && row.step?.body_template)
      .sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for))
    return candidates[0] ?? null
  }

  function nextEmailTouchLabel(touch: TouchTimelineRow): string {
    return `${touch.enrollment?.sequence?.name ?? 'Sequence'} · Step ${touch.step?.step_number ?? '?'}`
  }

  // Context-aware help text for the Apply skills / Update message button —
  // names the exact step it's drawing from (traceable back to Review and
  // Send), distinguishes a fresh generation from refining an existing draft,
  // and flags the one state where the outcome meaningfully changes: zero
  // skills selected means the rewrite pass still runs but has no style guide
  // to apply, so the result reads close to the raw template.
  function applySkillsHint(): { text: string; warn: boolean } {
    const touch = findNextEmailTouch()
    const hasDraft = !!lead?.draft_message
    const skillCount = selectedSkillIds.length

    if (!touch) {
      return {
        warn: false,
        text: hasDraft
          ? 'No pending email step for this lead — refining the current draft from lead details, not a template.'
          : 'No pending email step for this lead — generating from lead details, not a template.',
      }
    }

    const stepLabel = nextEmailTouchLabel(touch)
    if (skillCount === 0) {
      return {
        warn: true,
        text: `No skills selected — will rewrite the ${stepLabel} email as-is, without any style guide applied.`,
      }
    }
    const skillWord = skillCount === 1 ? 'skill' : 'skills'
    return {
      warn: false,
      text: hasDraft
        ? `Refining the current draft using ${stepLabel} + ${skillCount} ${skillWord}.`
        : `Generating from the ${stepLabel} email + ${skillCount} ${skillWord}.`,
    }
  }

  // Applies the selected skills as a rewrite ON TOP OF the actual Review and
  // Send email for this lead (same template, same rendering recipe) — not an
  // independent generation from lead facts. Falls back to whatever's already
  // in the draft box only when there's no pending email step to render from.
  async function handleApplySkills() {
    if (!lead) return
    setGenerateError(null)
    setGeneratingMessage(true)
    try {
      const nextTouch = findNextEmailTouch()
      const baseMessage = nextTouch?.step?.body_template
        ? renderReviewAndSendBody(nextTouch.step.body_template, lead)
        : draftRef.current?.value ?? ''

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token ?? ''
      const { data, error: fnErr } = await supabase.functions.invoke('generate-outreach-message', {
        body: {
          lead_id: lead.id,
          skill_ids: selectedSkillIds,
          current_draft: baseMessage,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (fnErr || !data || data.error || typeof data.message !== 'string') {
        throw new Error(data?.error ?? 'generation_failed')
      }
      if (draftRef.current) draftRef.current.value = data.message
      setLastGenerated(data.message)
    } catch {
      setGenerateError('Could not generate a message. Please try again.')
    } finally {
      setGeneratingMessage(false)
    }
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
          <SegmentSelect value={lead.segment} onChange={(segment) => saveLead({ segment })} />
          <StatusChip status={lead.status} />
          <ScoreRing
            score={lead.icp_score}
            reason={lead.icp_match_reason}
            size={isMobile ? 20 : 18}
            leadVertical={lead.vertical}
            scoringState={scoringState}
            onScore={handleScoreThisLead}
          />
        </div>

        {lastTouchAt && (
          <span style={styles.lastTouch}>Last touch {formatPortalDate(lastTouchAt)}</span>
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
          {obsValue !== obsSavedValue && (
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
              {obsSaveState === 'saving' ? 'Saving...' : 'Save'}
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

        {/* Follow-up: manual reminder date + staged draft message */}
        <Section title="Follow-up">
          <div style={styles.followUpField}>
            <label style={styles.followUpLabel}>Follow up on</label>
            <input
              type="date"
              style={{ ...styles.dateInput, width: '100%', boxSizing: 'border-box' as const }}
              value={followUpValue}
              onChange={(e) => setFollowUpValue(e.target.value)}
            />
            {followUpValue !== followUpSavedValue && (
              <button
                type="button"
                style={{ ...styles.primaryBtn, width: '100%', height: 36, boxSizing: 'border-box' as const, opacity: followUpSaving ? 0.6 : 1 }}
                onClick={handleSaveFollowUp}
                disabled={followUpSaving}
              >
                {followUpSaving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
          <div style={styles.followUpField}>
            <label style={styles.followUpLabel}>Draft message</label>
            {skills.length > 0 && (
              <div style={styles.skillPicker}>
                {skills.map((skill) => {
                  const checked = selectedSkillIds.includes(skill.id)
                  return (
                    <label key={skill.id} style={styles.skillPickerItem}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedSkillIds((prev) =>
                            checked ? prev.filter((id) => id !== skill.id) : [...prev, skill.id]
                          )
                        }
                      />
                      {skill.name}
                    </label>
                  )
                })}
              </div>
            )}
            {skills.length > 0 && (() => {
              const hint = applySkillsHint()
              return (
                <>
                  <span style={{ ...styles.templateSourceHint, ...(hint.warn ? styles.templateSourceHintWarn : {}) }}>
                    {hint.text}
                  </span>
                  <button
                    type="button"
                    style={{ ...styles.applySkillsBtn, opacity: generatingMessage ? 0.6 : 1 }}
                    onClick={handleApplySkills}
                    disabled={generatingMessage}
                  >
                    {generatingMessage ? (
                      <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Sparkles size={13} />
                    )}
                    {generatingMessage ? 'Generating...' : lead.draft_message ? 'Update message' : 'Apply skills'}
                  </button>
                  {generateError && <div style={styles.warnNote}>{generateError}</div>}
                </>
              )
            })()}
            <textarea
              key={lead.id + 'draft'}
              ref={draftRef}
              defaultValue={lead.draft_message ?? ''}
              style={styles.textarea}
              rows={4}
              placeholder={
                skills.length > 0
                  ? 'Paste or write your next message here, or generate one with Apply skills above.'
                  : 'Paste or write your next message here.'
              }
              onBlur={async (e) => {
                const val = e.target.value.trim()
                if (val !== (lead.draft_message ?? '').trim()) saveLead({ draft_message: val || null })
                if (lastGenerated && val !== lastGenerated.trim()) {
                  await supabase.from('outreach_message_feedback').insert({
                    lead_id: lead.id,
                    skill_ids: selectedSkillIds.length > 0 ? selectedSkillIds : null,
                    generated_text: lastGenerated,
                    edited_text: val,
                  })
                  setLastGenerated(null)
                }
              }}
            />
          </div>
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
  const { isMobile } = useBreakpoint()
  const [expanded, setExpanded] = useState(false)
  const seqName = touch.enrollment?.sequence?.name ?? 'Sequence'
  const isEmail = touch.channel === 'email'
  const isCancelled = touch.status === 'cancelled'
  const isSent = touch.status === 'sent'
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
      <div style={styles.timelineRow}>
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
            {touch.status === 'sent' && touch.sent_at ? `Sent ${formatPortalDate(touch.sent_at)}` : null}
            {touch.status === 'skipped' ? `Skipped: ${touch.skipped_reason ?? 'manually'}` : null}
            {touch.status === 'scheduled' ? `Due ${formatPortalDate(touch.scheduled_for)}` : null}
            {isCancelled ? `Cancelled${touch.skipped_reason ? ': ' + touch.skipped_reason.replace(/_/g, ' ') : ''}` : null}
            {touch.status === 'failed' ? 'Failed to send' : null}
            {touch.opened_at ? ' · Opened' : null}
            {touch.bounced_at ? ' · Bounced' : null}
          </span>
        </div>
        <span style={{ ...styles.timelineBadge, background: badgeBg, color: badgeFg }}>
          {touch.status}
        </span>
        {isSent && (
          <button
            type="button"
            style={styles.chevronBtn}
            onClick={() => setExpanded((o) => !o)}
            aria-label={expanded ? 'Collapse email' : 'Expand email'}
            aria-expanded={expanded}
          >
            <ChevronDown
              size={14}
              color={t.text.muted}
              style={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: `transform ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
              }}
            />
          </button>
        )}
      </div>
      {isSent && expanded && (
        <div style={{ ...styles.touchBodyCard, marginLeft: isMobile ? 0 : 23 }}>
          {touch.subject_snapshot && <div style={styles.touchSubject}>{touch.subject_snapshot}</div>}
          {touch.body_snapshot ? (
            <div style={styles.touchBody}>{touch.body_snapshot}</div>
          ) : (
            <p style={styles.mutedText}>Email content not available</p>
          )}
        </div>
      )}
    </div>
  )
}

function ReplyEntry({ reply }: { reply: ReplyMessageRow }) {
  const { isMobile } = useBreakpoint()
  return (
    <div style={styles.replyRow}>
      <div style={{ ...styles.replyCard, maxWidth: isMobile ? '90%' : '75%' }}>
        <div style={styles.replyHead}>
          <Reply size={13} color={tokens.primary} />
          <span style={styles.replyLabel}>Reply from lead</span>
        </div>
        <p style={styles.replyBody}>{reply.body}</p>
        <span style={styles.replyMeta}>{formatPortalDate(reply.logged_at)}</span>
      </div>
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
  followUpField: { display: 'flex', flexDirection: 'column', gap: 6 },
  followUpLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.secondary,
  },
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
  skillPicker: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px 12px',
    padding: '8px 10px',
    background: t.background.subtle,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
  },
  skillPickerItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.secondary,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  templateSourceHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: t.text.muted,
  },
  templateSourceHintWarn: {
    color: tokens.goldDark,
    fontWeight: 500,
  },
  applySkillsBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    background: tokens.tealLight,
    color: tokens.primary,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '6px 12px',
    cursor: 'pointer',
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
    flexDirection: 'column',
    gap: 8,
    padding: '10px 0',
    borderBottom: `1px solid ${t.border.subtle}`,
  },
  timelineRow: { display: 'flex', alignItems: 'flex-start', gap: 10 },
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
  chevronBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    padding: 4,
    margin: 0,
    cursor: 'pointer',
    flexShrink: 0,
  },
  touchBodyCard: {
    background: t.background.muted,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 300,
    overflowY: 'auto',
  },
  touchSubject: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: t.text.primary,
  },
  touchBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 400,
    color: t.text.secondary,
    whiteSpace: 'pre-wrap',
    lineHeight: 1.5,
  },
  replyRow: { display: 'flex', justifyContent: 'flex-end', padding: '8px 0' },
  replyCard: {
    background: tokens.tealLight,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 10,
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  replyHead: { display: 'flex', alignItems: 'center', gap: 6 },
  replyLabel: { fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: tokens.primary },
  replyBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 400,
    color: t.text.primary,
    whiteSpace: 'pre-wrap',
    lineHeight: 1.5,
    margin: 0,
  },
  replyMeta: { fontFamily: fonts.body, fontSize: 11, color: t.text.muted, alignSelf: 'flex-end' },
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
