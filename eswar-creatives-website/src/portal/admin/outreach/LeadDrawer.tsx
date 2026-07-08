// Lead drawer: full lead detail, editable fields, enrollment, timeline, convert to client.
// SidePanel on desktop, full-screen bottom sheet on mobile (handled by SidePanel itself).
import { useEffect, useState } from 'react'
import { ExternalLink, Clock, Mail, Linkedin } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { SidePanel } from '../SidePanel'
import { mono, formatDate } from '../ui'

type LeadStatus =
  | 'new' | 'active' | 'replied' | 'meeting_booked' | 'converted'
  | 'not_interested' | 'unsubscribed' | 'bounced' | 'archived'
type LinkedInStatus = 'none' | 'request_sent' | 'connected' | 'ignored'

export type LeadDetail = {
  id: string
  first_name: string
  last_name: string | null
  email: string | null
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
  step: { step_number: number } | null
  enrollment: { sequence: { name: string } | null } | null
}

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

export function LeadDrawer({
  leadId,
  onClose,
  onConverted,
}: {
  leadId: string
  onClose: () => void
  onConverted?: (clientId: string) => void
}) {
  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([])
  const [timeline, setTimeline] = useState<TouchTimelineRow[]>([])
  const [sequences, setSequences] = useState<SequenceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedSeq, setSelectedSeq] = useState('')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<string | null>(null)
  const [convertOpen, setConvertOpen] = useState(false)

  async function load() {
    setLoading(true)
    const [leadRes, enrollRes, touchRes, seqRes] = await Promise.all([
      supabase.from('leads').select('*').eq('id', leadId).single(),
      supabase.from('lead_enrollments').select(`
        id, sequence_id, status, started_at,
        sequence:sequences!sequence_id (name, segment)
      `).eq('lead_id', leadId).order('started_at', { ascending: false }),
      supabase.from('outreach_touches').select(`
        id, channel, status, scheduled_for, sent_at, opened_at, bounced_at, skipped_reason, subject_snapshot,
        step:sequence_steps!step_id (step_number),
        enrollment:lead_enrollments!enrollment_id (sequence:sequences!sequence_id (name))
      `).eq('lead_id', leadId).order('scheduled_for', { ascending: false }).limit(50),
      supabase.from('sequences').select('id, name, segment, is_active').eq('is_active', true).order('name'),
    ])
    setLead(leadRes.data as LeadDetail)
    setEnrollments((enrollRes.data ?? []) as EnrollmentRow[])
    setTimeline((touchRes.data ?? []) as TouchTimelineRow[])
    setSequences((seqRes.data ?? []) as SequenceRow[])
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

  async function handleEnroll() {
    if (!selectedSeq || !startDate) return
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

  const activeEnrollments = enrollments.filter((e) => e.status === 'active')

  if (loading || !lead) {
    return (
      <SidePanel title="Lead" onClose={onClose} width={520}>
        <p style={{ fontFamily: fonts.body, fontSize: 14, color: t.text.muted }}>Loading...</p>
      </SidePanel>
    )
  }

  return (
    <SidePanel
      title={`${lead.first_name} ${lead.last_name ?? ''}`}
      subtitle={lead.company}
      onClose={onClose}
      width={520}
    >
      <div style={styles.drawerBody}>
        {/* Header chips */}
        <div style={styles.chipRow}>
          <SegmentChip segment={lead.segment} />
          <StatusChip status={lead.status} />
        </div>

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
            <EditableInput value={lead.email ?? ''} onSave={(v) => saveLead({ email: v || null })} type="email" />
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
            <EditableInput value={lead.website ?? ''} onSave={(v) => saveLead({ website: v || null })} />
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
            key={lead.id + 'obs'}
            defaultValue={lead.specific_observation ?? ''}
            style={{ ...styles.textarea, marginTop: 8 }}
            rows={3}
            placeholder="e.g. the onboarding flow drops users after the second step..."
            onBlur={(e) => {
              const val = e.target.value.trim()
              if (val !== (lead.specific_observation ?? '').trim()) {
                saveLead({ specific_observation: val || null })
              }
            }}
          />
        </div>

        {/* LinkedIn status */}
        <Section title="LinkedIn status">
          <FieldRow label="Connection status">
            <select
              style={styles.select}
              value={lead.linkedin_status}
              onChange={(e) => saveLead({ linkedin_status: e.target.value as LinkedInStatus })}
            >
              <option value="none">None</option>
              <option value="request_sent">Request sent</option>
              <option value="connected">Connected</option>
              <option value="ignored">Ignored</option>
            </select>
          </FieldRow>
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
            const mismatch = seq?.segment && seq.segment !== lead.segment
            return (
              <>
                {mismatch && (
                  <p style={styles.warnNote}>This sequence targets a different segment.</p>
                )}
                {enrollError && <p style={styles.errorNote}>{enrollError}</p>}
                <button
                  type="button"
                  style={{ ...styles.primaryBtn, opacity: enrolling ? 0.6 : 1 }}
                  onClick={handleEnroll}
                  disabled={enrolling}
                >
                  {enrolling ? 'Enrolling...' : 'Enroll'}
                </button>
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
            {lead.status === 'archived' && (
              <p style={{ fontFamily: fonts.body, fontSize: 12, color: t.text.muted, margin: 0 }}>
                Archived. Data preserved. Cannot be deleted if touches were sent.
              </p>
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
        </Section>

        {/* Timeline */}
        <Section title="Timeline">
          {timeline.length === 0 ? (
            <p style={styles.mutedText}>No activity yet. Enroll in a sequence to get started.</p>
          ) : (
            <div style={styles.timeline}>
              {timeline.map((touch) => (
                <TimelineEntry key={touch.id} touch={touch} />
              ))}
            </div>
          )}
        </Section>

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
              // Cancel remaining scheduled touches
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
  const stepNum = touch.step?.step_number ?? '?'
  const isEmail = touch.channel === 'email'

  return (
    <div style={styles.timelineEntry}>
      <div style={styles.timelineIcon}>
        {isEmail ? <Mail size={13} color={t.text.muted} /> : <Linkedin size={13} color={t.text.muted} />}
      </div>
      <div style={styles.timelineContent}>
        <span style={styles.timelineLabel}>
          {seqName} Step {stepNum} — {touch.channel.replace('_', ' ')}
        </span>
        <span style={styles.timelineMeta}>
          {touch.status === 'sent' && touch.sent_at ? `Sent ${formatDate(touch.sent_at)}` : null}
          {touch.status === 'skipped' ? `Skipped: ${touch.skipped_reason ?? 'manually'}` : null}
          {touch.status === 'scheduled' ? `Due ${formatDate(touch.scheduled_for)}` : null}
          {touch.status === 'cancelled' ? `Cancelled${touch.skipped_reason ? ': ' + touch.skipped_reason : ''}` : null}
          {touch.status === 'failed' ? 'Failed to send' : null}
          {touch.opened_at ? ' · Opened' : null}
          {touch.bounced_at ? ' · Bounced' : null}
        </span>
      </div>
      <span style={{
        ...styles.timelineBadge,
        background: touch.status === 'sent' ? tokens.greenLight : touch.status === 'failed' ? tokens.rubyLight : t.background.muted,
        color: touch.status === 'sent' ? tokens.green : touch.status === 'failed' ? tokens.ruby : t.text.muted,
      }}>
        {touch.status}
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
    width: 100,
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
  extLink: { color: t.text.primaryBrand, display: 'flex' },
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
