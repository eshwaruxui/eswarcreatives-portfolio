// Today queue tab for the Outreach admin module.
// Shows Overdue (scheduled_for < today) then Due Today sections.
// Handles all edge cases: no email, linkedin awaiting connection, suppressed.
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Mail, Linkedin, Clock, AlertTriangle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { mono, Modal } from '../ui'
import { OutreachSendModal, type TouchRow } from './OutreachSendModal'
import { LeadDrawer } from '../../components/LeadDrawer'
import { showToast as showGlobalToast } from '../toast'

type ScheduledTouch = {
  id: string
  recipient_timezone: string | null
  scheduled_for: string
  subject_snapshot: string | null
  body_snapshot: string | null
  lead: {
    id: string
    first_name: string
    last_name: string | null
    company: string
    email: string | null
    specific_observation: string | null
    unsubscribe_token: string
  } | null
  step: {
    subject_template: string | null
    body_template: string | null
  } | null
}

// Mirrors the substitution + grammar fix applied by the confirm-scheduled-touch
// edge function, so the preview shows exactly what will be sent (not the raw
// template with unresolved {{variables}}).
function resolveTemplate(template: string, lead: NonNullable<ScheduledTouch['lead']>): string {
  const vars: Record<string, string> = {
    first_name: lead.first_name,
    company: lead.company,
    specific_observation: lead.specific_observation ?? '',
    flow: 'product',
    unsubscribe_url: `https://www.eswarcreatives.in/unsubscribe/${lead.unsubscribe_token}`,
    topic: '{{topic}}',
  }
  let out = template
  for (const [key, val] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, val)
  }
  if (lead.company.slice(-1).toLowerCase() === 's') {
    out = out.replaceAll(`${lead.company}'s`, `${lead.company}'`)
  }
  return out
}

type ThreadTouch = {
  id: string
  sent_at: string
  subject: string
  body: string
}

function formatThreadDate(iso: string): string {
  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
  return `${formatted} IST`
}

function useConfirmScheduledTouch(onSuccess: (id: string) => void) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function confirm(touchId: string) {
    setConfirming(touchId)
    setErrors((e) => { const n = { ...e }; delete n[touchId]; return n })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token ?? ''
      const { data, error: fnErr } = await supabase.functions.invoke('confirm-scheduled-touch', {
        body: { touch_id: touchId },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (fnErr || !data || data.error) {
        setErrors((e) => ({ ...e, [touchId]: 'Could not send. Please try again.' }))
      } else {
        onSuccess(touchId)
      }
    } catch {
      setErrors((e) => ({ ...e, [touchId]: 'Network error. Please try again.' }))
    } finally {
      setConfirming(null)
    }
  }

  return { confirming, errors, confirm }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysOverdue(scheduled: string): number {
  const today = new Date(todayStr())
  const sched = new Date(scheduled)
  const diff = Math.floor((today.getTime() - sched.getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

function initials(first: string, last: string | null): string {
  return ((first[0] ?? '') + (last?.[0] ?? '')).toUpperCase()
}

const CHANNEL_LABELS: Record<string, string> = {
  email: 'Review and Send',
  linkedin_connect: 'Send Connect',
  linkedin_dm: 'Send Message',
}

type MotionStats = {
  emailsToday: number
  liTodayCount: number
  repliesWeek: number
  callsWeek: number
}

type FollowUpLead = {
  id: string
  first_name: string
  last_name: string | null
  company: string
  draft_message: string | null
}

export function TodayTab({
  onRefreshCount,
}: {
  onRefreshCount?: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overdue, setOverdue] = useState<TouchRow[]>([])
  const [dueToday, setDueToday] = useState<TouchRow[]>([])
  const [pendingConfirmation, setPendingConfirmation] = useState<ScheduledTouch[]>([])
  const [followUps, setFollowUps] = useState<FollowUpLead[]>([])
  const [activeTouch, setActiveTouch] = useState<TouchRow | null>(null)
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null)
  const [previewTouch, setPreviewTouch] = useState<ScheduledTouch | null>(null)
  const [previewSubjectEdit, setPreviewSubjectEdit] = useState('')
  const [previewBodyEdit, setPreviewBodyEdit] = useState('')
  const [previewSaving, setPreviewSaving] = useState(false)
  const [threadTouches, setThreadTouches] = useState<ThreadTouch[]>([])
  const [threadOpen, setThreadOpen] = useState(false)
  const [motionStats, setMotionStats] = useState<MotionStats>({ emailsToday: 0, liTodayCount: 0, repliesWeek: 0, callsWeek: 0 })
  const [toast, setToast] = useState<string | null>(null)
  const today = todayStr()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1))
      const weekStartStr = weekStart.toISOString().slice(0, 10)

      const [queueRes, emailTodayRes, liTodayRes, repliesRes, callsRes, pendingRes, followUpRes] = await Promise.all([
        supabase
          .from('outreach_touches')
          .select(`
            id, channel, status, scheduled_for,
            subject_snapshot, body_snapshot, step_id,
            lead:leads!lead_id (
              id, first_name, last_name, company, email, linkedin_url,
              specific_observation, unsubscribe_token, status, linkedin_status
            ),
            step:sequence_steps!step_id (
              step_number, channel, subject_template, body_template, requires_connected
            ),
            enrollment:lead_enrollments!enrollment_id (
              id, sequence:sequences!sequence_id (name)
            )
          `)
          .eq('status', 'scheduled')
          .lte('scheduled_for', today)
          .order('scheduled_for', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('outreach_touches')
          .select('id', { count: 'exact', head: true })
          .eq('channel', 'email')
          .eq('status', 'sent')
          .gte('sent_at', `${today}T00:00:00Z`)
          .lte('sent_at', `${today}T23:59:59Z`),
        supabase
          .from('outreach_touches')
          .select('id', { count: 'exact', head: true })
          .in('channel', ['linkedin_connect', 'linkedin_dm'])
          .eq('status', 'sent')
          .gte('sent_at', `${today}T00:00:00Z`)
          .lte('sent_at', `${today}T23:59:59Z`),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'replied')
          .gte('updated_at', `${weekStartStr}T00:00:00Z`),
        supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'meeting_booked')
          .gte('updated_at', `${weekStartStr}T00:00:00Z`),
        supabase
          .from('outreach_touches')
          .select(`
            id, recipient_timezone, scheduled_for, subject_snapshot, body_snapshot,
            lead:leads!lead_id (id, first_name, last_name, company, email, specific_observation, unsubscribe_token),
            step:sequence_steps!step_id (subject_template, body_template)
          `)
          .eq('status', 'scheduled')
          .eq('channel', 'email')
          .gt('scheduled_for', `${today}T23:59:59Z`)
          .order('scheduled_for', { ascending: true })
          .limit(20),
        supabase
          .from('leads')
          .select('id, first_name, last_name, company, draft_message')
          .eq('follow_up_date', today)
          .neq('status', 'not_interested')
          .order('first_name', { ascending: true }),
      ])

      if (queueRes.error) throw queueRes.error
      const rows = (queueRes.data ?? []) as TouchRow[]
      setOverdue(rows.filter((r) => r.scheduled_for < today))
      setDueToday(rows.filter((r) => r.scheduled_for === today))
      setMotionStats({
        emailsToday: emailTodayRes.count ?? 0,
        liTodayCount: liTodayRes.count ?? 0,
        repliesWeek: repliesRes.count ?? 0,
        callsWeek: callsRes.count ?? 0,
      })
      setPendingConfirmation((pendingRes.data ?? []) as ScheduledTouch[])
      setFollowUps((followUpRes.data ?? []) as FollowUpLead[])
    } catch {
      setError('Could not load the queue. Refresh to try again.')
    } finally {
      setLoading(false)
      onRefreshCount?.()
    }
  }

  useEffect(() => { load() }, [])

  function handleSent() {
    setActiveTouch(null)
    load()
  }

  function handleUpdateObservation(leadId: string, obs: string) {
    const update = (rows: TouchRow[]) =>
      rows.map((r) =>
        r.lead.id === leadId
          ? { ...r, lead: { ...r.lead, specific_observation: obs } }
          : r
      )
    setOverdue(update)
    setDueToday(update)
  }

  const { confirming: confirmingId, errors: confirmErrors, confirm } = useConfirmScheduledTouch((id) => {
    setPendingConfirmation((prev) => prev.filter((t) => t.id !== id))
    showToast('Email sent successfully.')
  })

  async function handleMarkFollowUpDone(leadId: string) {
    await supabase.from('leads').update({ follow_up_date: null }).eq('id', leadId)
    setFollowUps((prev) => prev.filter((l) => l.id !== leadId))
    showToast('Follow-up cleared')
  }

  const isEmpty = overdue.length === 0 && dueToday.length === 0

  function previewInitialSubject(touch: ScheduledTouch): string {
    return touch.lead ? resolveTemplate(touch.step?.subject_template ?? touch.subject_snapshot ?? '', touch.lead) : ''
  }
  function previewInitialBody(touch: ScheduledTouch): string {
    return touch.lead ? resolveTemplate(touch.step?.body_template ?? touch.body_snapshot ?? '', touch.lead) : ''
  }

  function openPreview(touch: ScheduledTouch) {
    setPreviewTouch(touch)
    setPreviewSubjectEdit(previewInitialSubject(touch))
    setPreviewBodyEdit(previewInitialBody(touch))
    setThreadOpen(false)
    setThreadTouches([])
    if (touch.lead) loadThread(touch.lead.id, touch.lead)
  }

  async function loadThread(leadId: string, lead: NonNullable<ScheduledTouch['lead']>) {
    const { data } = await supabase
      .from('outreach_touches')
      .select(`
        id, sent_at, subject_snapshot, body_snapshot,
        step:sequence_steps!step_id (subject_template, body_template)
      `)
      .eq('lead_id', leadId)
      .eq('status', 'sent')
      .order('sent_at', { ascending: false })
    type ThreadRow = {
      id: string
      sent_at: string | null
      subject_snapshot: string | null
      body_snapshot: string | null
      step: { subject_template: string | null; body_template: string | null } | null
    }
    const rows = (data ?? []) as ThreadRow[]
    setThreadTouches(rows.map((r) => ({
      id: r.id,
      sent_at: r.sent_at ?? '',
      // Sent touches already carry the exact content that went out (the
      // edge function writes the resolved snapshot at send time) — prefer
      // that historical record over re-resolving the template with current
      // lead data, which could differ from what was actually sent.
      subject: r.subject_snapshot ?? (r.step?.subject_template ? resolveTemplate(r.step.subject_template, lead) : ''),
      body: r.body_snapshot ?? (r.step?.body_template ? resolveTemplate(r.step.body_template, lead) : ''),
    })))
  }

  const previewDirty = !!previewTouch && (
    previewSubjectEdit !== previewInitialSubject(previewTouch) ||
    previewBodyEdit !== previewInitialBody(previewTouch)
  )

  function handlePreviewCloseRequest() {
    if (previewDirty && !window.confirm('You have unsaved changes. Close anyway?')) return
    setPreviewTouch(null)
  }

  async function handleSavePreview() {
    if (!previewTouch) return
    setPreviewSaving(true)
    await supabase
      .from('outreach_touches')
      .update({ subject_snapshot: previewSubjectEdit, body_snapshot: previewBodyEdit, step_id: null })
      .eq('id', previewTouch.id)
    const updatedTouch: ScheduledTouch = {
      ...previewTouch,
      subject_snapshot: previewSubjectEdit,
      body_snapshot: previewBodyEdit,
      step: null,
    }
    setPreviewTouch(updatedTouch)
    setPendingConfirmation((prev) => prev.map((t) => (t.id === updatedTouch.id ? updatedTouch : t)))
    setPreviewSaving(false)
    showGlobalToast('Email content saved', 'success', 2000)
  }

  return (
    <>
      {toast && <div style={styles.toast}>{toast}</div>}
      {activeTouch && (
        <OutreachSendModal
          touch={activeTouch}
          onClose={() => setActiveTouch(null)}
          onSent={handleSent}
          onUpdateObservation={handleUpdateObservation}
        />
      )}
      {activeLeadId && (
        <LeadDrawer
          leadId={activeLeadId}
          onClose={() => setActiveLeadId(null)}
        />
      )}
      {previewTouch && (
        <Modal title="Email preview" onClose={handlePreviewCloseRequest} maxWidth={600} closeOnBackdrop={false}>
          <div style={styles.previewBody}>
            <div style={styles.previewField}>
              <span style={styles.previewLabel}>To</span>
              <span style={styles.previewValue}>
                {previewTouch.lead
                  ? `${previewTouch.lead.first_name} ${previewTouch.lead.last_name ?? ''} <${previewTouch.lead.email ?? 'no email on file'}>`
                  : 'Unknown lead'}
              </span>
            </div>
            <div style={styles.previewField}>
              <span style={styles.previewLabel}>Subject</span>
              <input
                type="text"
                style={styles.previewInput}
                value={previewSubjectEdit}
                onChange={(e) => setPreviewSubjectEdit(e.target.value)}
              />
            </div>
            <div style={styles.previewField}>
              <span style={styles.previewLabel}>Body</span>
              <textarea
                style={styles.previewTextarea}
                value={previewBodyEdit}
                onChange={(e) => setPreviewBodyEdit(e.target.value)}
              />
            </div>
            {threadTouches.length > 0 && (
              <>
                <div style={styles.previewDivider} />
                <button
                  type="button"
                  style={styles.threadToggle}
                  onClick={() => setThreadOpen((o) => !o)}
                >
                  <span style={styles.threadToggleLabel}>Previous emails ({threadTouches.length})</span>
                  {threadOpen ? (
                    <ChevronUp size={16} color={t.text.muted} />
                  ) : (
                    <ChevronDown size={16} color={t.text.muted} />
                  )}
                </button>
                {threadOpen && (
                  <div style={styles.threadList}>
                    {threadTouches.map((pt) => (
                      <PriorEmailCard key={pt.id} touch={pt} />
                    ))}
                  </div>
                )}
              </>
            )}
            <div style={styles.previewActions}>
              {previewDirty && (
                <button
                  type="button"
                  style={{ ...styles.previewSaveBtn, opacity: previewSaving ? 0.6 : 1 }}
                  onClick={handleSavePreview}
                  disabled={previewSaving}
                >
                  {previewSaving ? 'Saving...' : 'Save changes'}
                </button>
              )}
              <button type="button" style={styles.previewCloseBtn} onClick={handlePreviewCloseRequest}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {error && <div style={styles.errorBanner}>{error}</div>}

      {!loading && <MotionTracker stats={motionStats} />}

      {!loading && followUps.length > 0 && (
        <div style={styles.pendingSection}>
          <div style={styles.pendingSectionHeader}>
            <span style={styles.sectionTitle}>Follow-ups today</span>
            <span style={{ ...styles.sectionCount, color: tokens.primary, fontFamily: mono }}>
              {followUps.length}
            </span>
          </div>
          <div style={styles.touchList}>
            {followUps.map((lead) => (
              <div key={lead.id} style={styles.touchCard}>
                <div style={styles.touchMain}>
                  <div
                    role="button"
                    tabIndex={0}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: 'pointer' }}
                    onClick={() => setActiveLeadId(lead.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter') setActiveLeadId(lead.id) }}
                    aria-label={`Open ${lead.first_name} ${lead.last_name ?? ''} detail`}
                  >
                    <div style={styles.avatar}>
                      {((lead.first_name[0] ?? '') + (lead.last_name?.[0] ?? '')).toUpperCase()}
                    </div>
                    <div style={styles.touchInfo}>
                      <span style={styles.touchName}>
                        {lead.first_name} {lead.last_name ?? ''} · {lead.company}
                      </span>
                      {lead.draft_message && (
                        <span style={styles.draftPreview}>
                          {lead.draft_message.length > 100
                            ? lead.draft_message.slice(0, 100) + '…'
                            : lead.draft_message}
                        </span>
                      )}
                    </div>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      style={styles.previewBtn}
                      onClick={() => handleMarkFollowUpDone(lead.id)}
                    >
                      Mark done
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div style={styles.loadingText}>Loading queue...</div>
      ) : isEmpty ? (
        <EmptyQueue />
      ) : (
        <div style={styles.sections}>
          {overdue.length > 0 && (
            <Section
              title="Overdue"
              count={overdue.length}
              isOverdue
              touches={overdue}
              onOpen={setActiveTouch}
              onOpenLeadDrawer={setActiveLeadId}
              onRefresh={load}
            />
          )}
          {dueToday.length > 0 && (
            <Section
              title="Due Today"
              count={dueToday.length}
              isOverdue={false}
              touches={dueToday}
              onOpen={setActiveTouch}
              onOpenLeadDrawer={setActiveLeadId}
              onRefresh={load}
            />
          )}
        </div>
      )}

      {!loading && pendingConfirmation.length > 0 && (
        <div style={styles.pendingSection}>
          <div style={styles.pendingSectionHeader}>
            <span style={styles.sectionTitle}>Pending Confirmation</span>
            <span style={{ ...styles.sectionCount, color: tokens.goldDark, fontFamily: mono }}>
              {pendingConfirmation.length}
            </span>
          </div>
          <div style={styles.touchList}>
            {pendingConfirmation.map((touch) => {
              const lead = touch.lead
              const isConf = confirmingId === touch.id
              const err = confirmErrors[touch.id]
              return (
                <div key={touch.id} style={styles.touchCard}>
                  <div style={styles.touchMain}>
                    <div
                      role="button"
                      tabIndex={0}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: lead ? 'pointer' : 'default' }}
                      onClick={() => lead && setActiveLeadId(lead.id)}
                      onKeyDown={(e) => { if (lead && e.key === 'Enter') setActiveLeadId(lead.id) }}
                      aria-label={lead ? `Open ${lead.first_name} ${lead.last_name ?? ''} detail` : undefined}
                    >
                      <div style={styles.avatar}>
                        {lead ? ((lead.first_name[0] ?? '') + (lead.last_name?.[0] ?? '')).toUpperCase() : '?'}
                      </div>
                      <div style={styles.touchInfo}>
                        <span style={styles.touchName}>
                          {lead ? `${lead.first_name} ${lead.last_name ?? ''} · ${lead.company}` : 'Unknown lead'}
                        </span>
                        <span style={styles.touchMeta}>
                          Scheduled for {new Intl.DateTimeFormat('en-GB', {
                            timeZone: touch.recipient_timezone ?? 'UTC',
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          }).format(new Date(touch.scheduled_for))}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                      {isConf ? (
                        <Loader2 size={16} color={t.text.muted} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <>
                          <button
                            type="button"
                            style={styles.previewBtn}
                            onClick={() => openPreview(touch)}
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            style={styles.actionBtn}
                            disabled={!!confirmingId}
                            onClick={() => confirm(touch.id)}
                          >
                            Confirm and Send
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {err && <div style={styles.pendingErr}>{err}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}

const MOTION_STATS_CONFIG = [
  { key: 'emailsToday' as const, label: 'Emails sent today', target: 5 },
  { key: 'liTodayCount' as const, label: 'LI touches today', target: 5 },
  { key: 'repliesWeek' as const, label: 'Replies this week', target: 3 },
  { key: 'callsWeek' as const, label: 'Calls booked this week', target: 1 },
]

function MotionTracker({ stats }: { stats: MotionStats }) {
  return (
    <div style={styles.motionStrip}>
      {MOTION_STATS_CONFIG.map(({ key, label, target }) => {
        const value = stats[key]
        const met = value >= target
        const fillPct = Math.min((value / target) * 100, 100)
        return (
          <div key={key} style={styles.motionStat}>
            <span style={styles.motionLabel}>{label}</span>
            <div style={styles.motionValueRow}>
              <span style={{ ...styles.motionX, color: met ? tokens.green : t.text.primary }}>
                {value}
              </span>
              <span style={styles.motionSlashY}> / {target}</span>
            </div>
            <div style={styles.motionProgressTrack}>
              <div style={{
                ...styles.motionProgressFill,
                width: `${fillPct}%`,
                background: met ? tokens.greenLight : t.background.tint2,
              }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Section({
  title,
  count,
  isOverdue,
  touches,
  onOpen,
  onOpenLeadDrawer,
  onRefresh,
}: {
  title: string
  count: number
  isOverdue: boolean
  touches: TouchRow[]
  onOpen: (t: TouchRow) => void
  onOpenLeadDrawer: (id: string) => void
  onRefresh: () => void
}) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <span style={styles.sectionTitle}>{title}</span>
        <span style={{
          ...styles.sectionCount,
          color: isOverdue ? tokens.ruby : t.text.tertiary,
          fontFamily: mono,
        }}>
          {count}
        </span>
      </div>
      <div style={styles.touchList}>
        {touches.map((touch) => (
          <TouchRowCard
            key={touch.id}
            touch={touch}
            isOverdue={isOverdue}
            onOpen={onOpen}
            onOpenLeadDrawer={onOpenLeadDrawer}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </div>
  )
}

function TouchRowCard({
  touch,
  isOverdue,
  onOpen,
  onOpenLeadDrawer,
  onRefresh,
}: {
  touch: TouchRow
  isOverdue: boolean
  onOpen: (t: TouchRow) => void
  onOpenLeadDrawer: (id: string) => void
  onRefresh: () => void
}) {
  const lead = touch.lead
  const [snoozing, setSnoozing] = useState(false)

  const overdueCount = daysOverdue(touch.scheduled_for)
  const isEmail = touch.channel === 'email'
  const isDm = touch.channel === 'linkedin_dm'
  const awaitingConnection = isDm && lead.linkedin_status !== 'connected'
  const noEmail = isEmail && !lead.email

  function handleLeadAreaClick(e: React.MouseEvent) {
    e.stopPropagation()
    onOpenLeadDrawer(lead.id)
  }

  async function handleSnooze(days: number) {
    setSnoozing(true)
    const current = new Date(touch.scheduled_for)
    current.setDate(current.getDate() + days)
    // Weekend rollover
    const dow = current.getDay()
    if (dow === 6) current.setDate(current.getDate() + 2)
    if (dow === 0) current.setDate(current.getDate() + 1)
    await supabase
      .from('outreach_touches')
      .update({ scheduled_for: current.toISOString().slice(0, 10) })
      .eq('id', touch.id)
    setSnoozing(false)
    onRefresh()
  }

  async function handleSkip(reason: string) {
    await supabase
      .from('outreach_touches')
      .update({ status: 'skipped', skipped_reason: reason })
      .eq('id', touch.id)
    onRefresh()
  }

  async function handleMarkConnected() {
    await supabase
      .from('leads')
      .update({ linkedin_status: 'connected' })
      .eq('id', lead.id)
    onRefresh()
  }

  return (
    <div style={styles.touchCard}>
      {/* Avatar + info — clickable to open lead drawer */}
      <div
        role="button"
        tabIndex={0}
        style={{ ...styles.touchMain, cursor: 'pointer' }}
        onClick={handleLeadAreaClick}
        onKeyDown={(e) => e.key === 'Enter' && onOpenLeadDrawer(lead.id)}
        aria-label={`Open ${lead.first_name} ${lead.last_name ?? ''} detail`}
      >
        <div style={styles.avatar}>
          {initials(lead.first_name, lead.last_name)}
        </div>
        <div style={styles.touchInfo}>
          <span style={styles.touchName}>
            {lead.first_name} {lead.last_name ?? ''} · {lead.company}
          </span>
          <span style={styles.touchMeta}>
            {touch.enrollment?.sequence?.name ?? 'Sequence'} · Step {touch.step?.step_number ?? '?'}
          </span>
          {isOverdue && overdueCount > 0 && (
            <span style={styles.overdueLabel}>
              <Clock size={11} />
              {overdueCount}d overdue
            </span>
          )}
        </div>
        <ChannelIcon channel={touch.channel} />
      </div>

      {/* No email row */}
      {noEmail && (
        <div style={styles.warningRow}>
          <AlertTriangle size={13} color={tokens.gold} />
          <span style={styles.warningText}>No email address</span>
          <button
            type="button"
            style={styles.inlineBtn}
            onClick={() => onOpenLeadDrawer(lead.id)}
          >
            Add email
          </button>
        </div>
      )}

      {/* Awaiting connection for linkedin_dm */}
      {awaitingConnection ? (
        <div style={styles.awaitingRow}>
          <span style={styles.awaitingLabel}>Waiting on connection</span>
          <button type="button" style={styles.inlineBtn} onClick={handleMarkConnected}>
            Mark connected
          </button>
          <button type="button" style={styles.skipSmall} onClick={() => handleSkip('awaiting_connection')}>
            Skip
          </button>
        </div>
      ) : !noEmail ? (
        <div style={styles.actionRow}>
          <button
            type="button"
            style={styles.actionBtn}
            onClick={() => onOpen(touch)}
          >
            {CHANNEL_LABELS[touch.channel] ?? 'Send'}
          </button>
          <OverflowActions onSkip={handleSkip} onSnooze={handleSnooze} disabled={snoozing} />
        </div>
      ) : null}
    </div>
  )
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === 'email') return <Mail size={16} color={t.text.muted} />
  return <Linkedin size={16} color={t.text.muted} />
}

const SKIP_REASONS = [
  { value: 'not_relevant', label: 'Not relevant' },
  { value: 'bad_timing', label: 'Bad timing' },
  { value: 'already_contacted', label: 'Already contacted' },
  { value: 'other', label: 'Other' },
]

function OverflowActions({
  onSkip,
  onSnooze,
  disabled,
}: {
  onSkip: (reason: string) => void
  onSnooze: (days: number) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [showSkip, setShowSkip] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        style={styles.overflowBtn}
        onClick={() => setOpen((p) => !p)}
        disabled={disabled}
      >
        ...
      </button>
      {open && (
        <div style={styles.dropdown}>
          {showSkip ? (
            <>
              <span style={styles.dropdownLabel}>Skip reason</span>
              {SKIP_REASONS.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  style={styles.dropdownItem}
                  onClick={() => { onSkip(r.value); setOpen(false); setShowSkip(false) }}
                >
                  {r.label}
                </button>
              ))}
              <button type="button" style={styles.dropdownItemMuted} onClick={() => setShowSkip(false)}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button type="button" style={styles.dropdownItem} onClick={() => setShowSkip(true)}>
                Skip
              </button>
              <button type="button" style={styles.dropdownItem} onClick={() => { onSnooze(1); setOpen(false) }}>
                Snooze +1 day
              </button>
              <button type="button" style={styles.dropdownItem} onClick={() => { onSnooze(3); setOpen(false) }}>
                Snooze +3 days
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyQueue() {
  return (
    <div style={styles.emptyState}>
      <h2 style={styles.emptyHeading}>Queue is clear</h2>
      <p style={styles.emptyBody}>
        Nothing due today. Check back tomorrow or{' '}
        <Link to="/portal/admin/outreach?tab=leads" style={styles.emptyLink}>
          add leads
        </Link>{' '}
        to get started.
      </p>
    </div>
  )
}

// Read-only card for a previously sent email in the thread history. Clamps
// the body to 4 lines and only reveals "Show more" when the text actually
// overflows that clamp (checked via scrollHeight vs clientHeight).
function PriorEmailCard({ touch }: { touch: ThreadTouch }) {
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const bodyRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = bodyRef.current
    if (el) setOverflowing(el.scrollHeight > el.clientHeight + 1)
  }, [touch.body])

  return (
    <div style={styles.threadCard}>
      <span style={styles.threadDate}>{formatThreadDate(touch.sent_at)}</span>
      <span style={styles.threadSubject}>{touch.subject || '(no subject)'}</span>
      <p
        ref={bodyRef}
        style={{ ...styles.threadBody, ...(expanded ? null : styles.threadBodyClamped) }}
      >
        {touch.body || '(no content)'}
      </p>
      {!expanded && overflowing && (
        <button type="button" style={styles.threadShowMore} onClick={() => setExpanded(true)}>
          Show more
        </button>
      )}
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  motionStrip: {
    display: 'flex',
    gap: 24,
    flexWrap: 'wrap',
    background: t.background.subtle,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    padding: '12px 16px',
    marginBottom: 16,
  },
  motionStat: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 80,
  },
  motionLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: t.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  motionValueRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 0,
  },
  motionX: {
    fontFamily: mono,
    fontSize: 20,
    fontWeight: 600,
    lineHeight: 1,
  },
  motionSlashY: {
    fontFamily: mono,
    fontSize: 16,
    fontWeight: 400,
    color: t.text.muted,
    lineHeight: 1,
  },
  motionProgressTrack: {
    height: 4,
    borderRadius: 2,
    background: t.border.subtle,
    overflow: 'hidden',
    marginTop: 2,
  },
  motionProgressFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  sections: { display: 'flex', flexDirection: 'column', gap: 32 },
  section: { display: 'flex', flexDirection: 'column', gap: 0 },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
    color: t.text.primary,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: 700,
  },
  touchList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  touchCard: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 10,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  touchMain: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: t.background.tint2,
    color: tokens.primary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  touchInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  touchName: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    color: t.text.primary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  touchMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
  },
  draftPreview: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.muted,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  overdueLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontFamily: mono,
    fontSize: 11,
    color: tokens.ruby,
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    cursor: 'pointer',
    transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  previewBtn: {
    background: 'none',
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '8px 14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  previewBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    maxHeight: '70vh',
    overflowY: 'auto' as const,
  },
  previewField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  previewLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    color: t.text.tertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  previewValue: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
  },
  previewInput: {
    width: '100%',
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    background: t.background.subtle,
    border: `1px solid ${t.border.default}`,
    borderRadius: 4,
    padding: 8,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  previewTextarea: {
    width: '100%',
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 1.6,
    color: t.text.primary,
    background: t.background.subtle,
    border: `1px solid ${t.border.default}`,
    borderRadius: 4,
    padding: 8,
    outline: 'none',
    minHeight: 200,
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  previewActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  },
  previewSaveBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    cursor: 'pointer',
  },
  previewCloseBtn: {
    background: tokens.surface,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '8px 16px',
    cursor: 'pointer',
  },
  previewDivider: {
    height: 1,
    background: t.border.subtle,
  },
  threadToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  },
  threadToggleLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
  },
  threadList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  threadCard: {
    background: t.background.subtle,
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  threadDate: {
    alignSelf: 'flex-end' as const,
    fontFamily: mono,
    fontSize: 11,
    color: t.text.muted,
  },
  threadSubject: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: t.text.primary,
  },
  threadBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap' as const,
    margin: 0,
  },
  threadBodyClamped: {
    display: '-webkit-box' as const,
    WebkitLineClamp: 4,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  },
  threadShowMore: {
    alignSelf: 'flex-start' as const,
    background: 'none',
    border: 'none',
    padding: 0,
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.urlLink,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  overflowBtn: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    color: t.text.secondary,
    fontFamily: mono,
    fontSize: 14,
    fontWeight: 700,
    padding: '6px 10px',
    cursor: 'pointer',
    letterSpacing: 2,
  },
  dropdown: {
    position: 'absolute' as const,
    top: '100%',
    right: 0,
    marginTop: 4,
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    zIndex: 50,
    minWidth: 160,
    display: 'flex',
    flexDirection: 'column',
    padding: '4px 0',
  },
  dropdownLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    color: t.text.muted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
    padding: '6px 12px',
  },
  dropdownItem: {
    background: 'none',
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    padding: '8px 12px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  dropdownItemMuted: {
    background: 'none',
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.muted,
    padding: '8px 12px',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  warningRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: tokens.goldLight,
    border: `1px solid ${tokens.gold}`,
    borderRadius: 6,
    padding: '6px 10px',
  },
  warningText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.goldDark,
    flex: 1,
  },
  awaitingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  awaitingLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
    flex: 1,
  },
  inlineBtn: {
    background: tokens.tealLight,
    color: tokens.primary,
    border: `1px solid ${tokens.accent}`,
    borderRadius: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 10px',
    cursor: 'pointer',
  },
  skipSmall: {
    background: 'none',
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  errorBanner: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 16,
  },
  loadingText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.muted,
    padding: '32px 0',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '80px 24px',
  },
  emptyHeading: {
    fontFamily: fonts.heading,
    fontSize: 22,
    fontWeight: 600,
    color: t.text.primary,
    margin: '0 0 10px',
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.secondary,
    margin: 0,
    lineHeight: 1.5,
  },
  emptyLink: {
    color: t.text.primaryBrand,
    textDecoration: 'underline',
  },
  pendingSection: {
    marginTop: 32,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  pendingSectionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  pendingErr: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.ruby,
    marginTop: 4,
  },
  toast: {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    background: tokens.primary,
    color: '#fff',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    borderRadius: 8,
    padding: '10px 20px',
    zIndex: 9999,
    pointerEvents: 'none' as const,
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
  },
}
