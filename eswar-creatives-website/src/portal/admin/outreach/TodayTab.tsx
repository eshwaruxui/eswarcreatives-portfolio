// Today queue tab for the Outreach admin module.
// Shows Overdue (scheduled_for < today) then Due Today sections.
// Handles all edge cases: no email, linkedin awaiting connection, suppressed.
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Mail, Linkedin, Clock, AlertTriangle, Loader2 } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { mono } from '../ui'
import { formatPortalDate } from '../../utils/formatDate'
import { intentLabel, stepNumberLabel } from '../../utils/touchLabels'
import { OutreachSendModal, type TouchRow } from './OutreachSendModal'
import { LeadDrawer } from '../../components/LeadDrawer'
import { TouchProgressLine } from '../../components/shared/TouchProgressLine'
import {
  TouchPreviewModal,
  PREVIEW_TOUCH_SELECT,
  type PreviewTouch,
} from '../../components/shared/TouchPreviewModal'
import { showToast as showGlobalToast } from '../toast'
import { useReloadableList } from '../../hooks/useReloadableList'
import { useConfirmScheduledTouch } from '../../hooks/useConfirmScheduledTouch'

// The preview modal, its template resolution, and the prior-email thread all
// moved to components/shared/TouchPreviewModal so ActivityTab's "Awaiting
// approval" rows can open the same modal rather than growing a second one.
type ScheduledTouch = PreviewTouch

// Review in Advance touches haven't been approved yet, so scheduled_for is
// only a placeholder day (midnight) — confirm-scheduled-touch doesn't pick
// the real business-hours send time until Approve is clicked. Showing that
// midnight placeholder as "12:00 AM" implied a send time that isn't real
// yet, so this drops the time and says so explicitly instead.
function formatPendingDate(touch: ScheduledTouch): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: touch.recipient_timezone ?? 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(touch.scheduled_for))
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function tomorrowStr(): string {
  return new Date(Date.now() + 86400000).toISOString().slice(0, 10)
}

function daysOverdue(scheduled: string): number {
  const today = new Date(todayStr())
  // scheduled_for is timestamptz (migration 0092) now, so `scheduled` may
  // carry a specific hour — keep this a whole-calendar-day count (matching
  // pre-migration behavior, when the column had no hour at all) by comparing
  // just the date portion, not the precise instant.
  const sched = new Date(scheduled.slice(0, 10))
  const diff = Math.floor((today.getTime() - sched.getTime()) / 86400000)
  return diff > 0 ? diff : 0
}

function initials(first: string, last: string | null): string {
  return ((first[0] ?? '') + (last?.[0] ?? '')).toUpperCase()
}

// Shared row shape for the three simple (non-multi-step) lists on this tab:
// Follow-ups today, Review in Advance, and Scheduled. Each only differs in
// its meta line and right-side actions.
function SimpleTouchRow({
  avatarLabel,
  title,
  meta,
  onOpenLead,
  actions,
  error,
}: {
  avatarLabel: string
  title: string
  meta?: ReactNode
  onOpenLead?: () => void
  actions: ReactNode
  error?: string
}) {
  return (
    <div style={styles.touchCard}>
      <div style={styles.touchMain}>
        <div
          role="button"
          tabIndex={0}
          style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: onOpenLead ? 'pointer' : 'default' }}
          onClick={onOpenLead}
          onKeyDown={(e) => { if (onOpenLead && e.key === 'Enter') onOpenLead() }}
          aria-label={onOpenLead ? `Open ${title} detail` : undefined}
        >
          <div style={styles.avatar}>{avatarLabel}</div>
          <div style={styles.touchInfo}>
            <span style={styles.touchName}>{title}</span>
            {meta}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={(e) => e.stopPropagation()}>
          {actions}
        </div>
      </div>
      {error && <div style={styles.pendingErr}>{error}</div>}
    </div>
  )
}

// Fix 9: enroll_lead still creates every sequence step's touch up front, so
// without this, LinkedIn DM follow-ups (steps 2-4, all gated 'held' once
// requires_connected) can all become due on the same day and pile up as
// separate "Waiting on connection" cards for the same lead. Keep only the
// earliest unresolved step per enrollment so later steps stay hidden until
// the current one is resolved (connected or skipped).
function dedupeByEnrollment(rows: TouchRow[]): TouchRow[] {
  const byEnrollment = new Map<string, TouchRow>()
  const unkeyed: TouchRow[] = []
  for (const row of rows) {
    const key = row.enrollment?.id
    if (!key) { unkeyed.push(row); continue }
    const existing = byEnrollment.get(key)
    // A touch with no linked step (step_id null — e.g. content was edited via
    // Preview before that no longer nulls step_id, or a step was deleted)
    // must never be treated as "earliest": falling back to 0 would make an
    // unknown-step touch always win the earliest-touch comparison against a
    // real step 1, hiding the correctly-numbered touch instead of the
    // unknown one. Unknown sorts last, not first.
    const stepNum = row.step?.step_number ?? Number.POSITIVE_INFINITY
    const existingStepNum = existing?.step?.step_number ?? Number.POSITIVE_INFINITY
    if (!existing || stepNum < existingStepNum) {
      byEnrollment.set(key, row)
    }
  }
  return [...byEnrollment.values(), ...unkeyed]
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
  const { initialLoading, start: startLoad, finish: finishLoad } = useReloadableList()
  const [error, setError] = useState<string | null>(null)
  const [overdue, setOverdue] = useState<TouchRow[]>([])
  const [dueToday, setDueToday] = useState<TouchRow[]>([])
  const [pendingConfirmation, setPendingConfirmation] = useState<ScheduledTouch[]>([])
  const [scheduledApproved, setScheduledApproved] = useState<ScheduledTouch[]>([])
  const [followUps, setFollowUps] = useState<FollowUpLead[]>([])
  const [activeTouch, setActiveTouch] = useState<TouchRow | null>(null)
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null)
  const [previewTouch, setPreviewTouch] = useState<ScheduledTouch | null>(null)
  const [motionStats, setMotionStats] = useState<MotionStats>({ emailsToday: 0, liTodayCount: 0, repliesWeek: 0, callsWeek: 0 })
  const [toast, setToast] = useState<string | null>(null)
  const today = todayStr()

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function load() {
    startLoad()
    setError(null)
    try {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + (weekStart.getDay() === 0 ? -6 : 1))
      const weekStartStr = weekStart.toISOString().slice(0, 10)

      const [queueRes, emailTodayRes, liTodayRes, repliesRes, callsRes, pendingRes, approvedRes, followUpRes] = await Promise.all([
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
              step_number, day_offset, channel, subject_template, body_template, requires_connected
            ),
            enrollment:lead_enrollments!enrollment_id (
              id, sequence:sequences!sequence_id (name)
            )
          `)
          .in('status', ['scheduled', 'held'])
          // scheduled_for is timestamptz (migration 0092) — "due" (Overdue +
          // Due Today combined) means anything up through end of today, not
          // just before midnight, since a real send time now carries an hour.
          .lt('scheduled_for', `${tomorrowStr()}T00:00:00.000Z`)
          // A non-null draft_confirmed_at means someone already clicked
          // Send and the edge function deferred it to a later working-hours
          // window (or it was Approved via Review in Advance) — it's no
          // longer actionable, so it belongs in the Scheduled section below,
          // not Due Today/Overdue, even though scheduled_for is still today.
          .is('draft_confirmed_at', null)
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
          .select(PREVIEW_TOUCH_SELECT)
          .eq('status', 'scheduled')
          .eq('channel', 'email')
          .is('draft_confirmed_at', null)
          .gte('scheduled_for', `${tomorrowStr()}T00:00:00Z`)
          .lte('scheduled_for', `${tomorrowStr()}T23:59:59Z`)
          .order('scheduled_for', { ascending: true })
          .limit(20),
        // Already confirmed and not yet sent — either approved from "Review
        // in Advance", or Sent-but-deferred to a later working-hours window
        // by the send-outreach-email edge function — preview only, no
        // further action needed. No date bound at all: the Overdue/Due
        // Today queue above now excludes anything with draft_confirmed_at
        // set (see .is('draft_confirmed_at', null) there), so a confirmed
        // touch never appears in both places regardless of whether it's
        // scheduled for later today or a future day.
        supabase
          .from('outreach_touches')
          .select(PREVIEW_TOUCH_SELECT)
          .eq('status', 'scheduled')
          .eq('channel', 'email')
          .not('draft_confirmed_at', 'is', null)
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
      const rows = dedupeByEnrollment((queueRes.data ?? []) as TouchRow[])
      // scheduled_for is timestamptz (migration 0092), so this is now an
      // instant comparison rather than a bare-date string match — the query
      // above already bounds everything to <= end of today, so Overdue is
      // just "before today started."
      const todayStartMs = new Date(`${today}T00:00:00.000Z`).getTime()
      // Fix 9: 'held' touches (LinkedIn steps gated behind an accepted
      // connection) are blocked, not late — they always land in Due Today,
      // never Overdue, regardless of how far past their scheduled_for date.
      setOverdue(rows.filter((r) => r.status !== 'held' && new Date(r.scheduled_for).getTime() < todayStartMs))
      setDueToday(rows.filter((r) => r.status === 'held' || new Date(r.scheduled_for).getTime() >= todayStartMs))
      setMotionStats({
        emailsToday: emailTodayRes.count ?? 0,
        liTodayCount: liTodayRes.count ?? 0,
        repliesWeek: repliesRes.count ?? 0,
        callsWeek: callsRes.count ?? 0,
      })
      setPendingConfirmation((pendingRes.data ?? []) as ScheduledTouch[])
      setScheduledApproved((approvedRes.data ?? []) as ScheduledTouch[])
      setFollowUps((followUpRes.data ?? []) as FollowUpLead[])
    } catch {
      setError('Could not load the queue. Refresh to try again.')
    } finally {
      finishLoad()
      onRefreshCount?.()
    }
  }

  useEffect(() => { load() }, [])

  // A touch approved inside business hours still waits for the next
  // send-confirmed-outreach-touches cron tick (up to 5 min) before it
  // actually sends — without this, the Scheduled section looks stuck until
  // a manual reload reveals it already went out. Silent background refresh,
  // not a full reload — load() only shows the skeleton on the true first
  // load (see useReloadableList).
  useEffect(() => {
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

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

  const { confirming: confirmingId, errors: confirmErrors, confirm } = useConfirmScheduledTouch((id, holdUntil, recipientTimezone) => {
    setPendingConfirmation((prev) => {
      const approved = prev.find((t) => t.id === id)
      if (approved) {
        setScheduledApproved((sa) => [
          ...sa,
          {
            ...approved,
            scheduled_for: holdUntil ?? approved.scheduled_for,
            // Without this, the row just-added to Scheduled keeps whatever
            // (often null) recipient_timezone it had before approval, and
            // falls back to UTC — showing a different time than this same
            // toast for the same instant, until a reload re-fetches the
            // real value from the DB.
            recipient_timezone: recipientTimezone ?? approved.recipient_timezone,
            draft_confirmed_at: new Date().toISOString(),
          },
        ])
      }
      return prev.filter((t) => t.id !== id)
    })
    // Use the recipient's actual resolved timezone, not a hardcoded one —
    // Rena being US-based made "ET" look right by coincidence; any non-US
    // lead would show the wrong hour under the old hardcoded America/New_York.
    const when = holdUntil && recipientTimezone
      ? new Intl.DateTimeFormat('en-US', {
          timeZone: recipientTimezone, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
        }).format(new Date(holdUntil))
      : null
    showToast(when ? `Approved — will send ${when}, their local time.` : 'Approved. Will send at the next business-day window.')
  })

  async function handleMarkFollowUpDone(leadId: string) {
    await supabase.from('leads').update({ follow_up_date: null }).eq('id', leadId)
    setFollowUps((prev) => prev.filter((l) => l.id !== leadId))
    showToast('Follow-up cleared')
  }

  const isEmpty = overdue.length === 0 && dueToday.length === 0

  // The modal owns its own edit/save/thread state now — this tab only says
  // which touch is open, whether it's still approvable, and what to do with a
  // saved edit or a successful approve.
  const previewIsPending = !!previewTouch && pendingConfirmation.some((t) => t.id === previewTouch.id)

  function handlePreviewSaved(updated: ScheduledTouch) {
    setPreviewTouch(updated)
    const replace = (prev: ScheduledTouch[]) => prev.map((t) => (t.id === updated.id ? updated : t))
    setPendingConfirmation(replace)
    setScheduledApproved(replace)
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
        <TouchPreviewModal
          key={previewTouch.id}
          touch={previewTouch}
          canApprove={previewIsPending}
          approveError={confirmErrors[previewTouch.id]}
          onApprove={confirm}
          onSaved={handlePreviewSaved}
          onClose={() => setPreviewTouch(null)}
        />
      )}

      {error && <div style={styles.errorBanner}>{error}</div>}

      {!initialLoading && <MotionTracker stats={motionStats} />}

      {!initialLoading && followUps.length > 0 && (
        <div style={styles.pendingSection}>
          <div style={styles.pendingSectionHeader}>
            <span style={styles.sectionTitle}>Follow-ups today</span>
            <span style={{ ...styles.sectionCount, color: tokens.primary, fontFamily: mono }}>
              {followUps.length}
            </span>
          </div>
          <div style={styles.touchList}>
            {followUps.map((lead) => (
              <SimpleTouchRow
                key={lead.id}
                avatarLabel={initials(lead.first_name, lead.last_name)}
                title={`${lead.first_name} ${lead.last_name ?? ''} · ${lead.company}`}
                onOpenLead={() => setActiveLeadId(lead.id)}
                meta={lead.draft_message && (
                  <span style={styles.draftPreview}>
                    {lead.draft_message.length > 100
                      ? lead.draft_message.slice(0, 100) + '…'
                      : lead.draft_message}
                  </span>
                )}
                actions={
                  <button
                    type="button"
                    style={styles.previewBtn}
                    onClick={() => handleMarkFollowUpDone(lead.id)}
                  >
                    Mark done
                  </button>
                }
              />
            ))}
          </div>
        </div>
      )}

      {initialLoading ? (
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

      {!initialLoading && pendingConfirmation.length > 0 && (
        <div style={styles.pendingSection}>
          <div style={styles.pendingSectionHeader}>
            <span style={styles.sectionTitle}>Review in Advance</span>
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
                <SimpleTouchRow
                  key={touch.id}
                  avatarLabel={lead ? initials(lead.first_name, lead.last_name) : '?'}
                  title={lead ? `${lead.first_name} ${lead.last_name ?? ''} · ${lead.company}` : 'Unknown lead'}
                  onOpenLead={lead ? () => setActiveLeadId(lead.id) : undefined}
                  meta={
                    <span
                      style={styles.touchMeta}
                      title="Exact send time is set once you approve — sends go out during business hours (9:30 AM–5:30 PM) in the recipient's local time."
                    >
                      {intentLabel(touch.step?.day_offset ?? null)} · {formatPendingDate(touch)} · Waiting for confirmation
                    </span>
                  }
                  error={err}
                  actions={
                    isConf ? (
                      <Loader2 size={16} color={t.text.muted} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <>
                        <button
                          type="button"
                          style={styles.previewBtn}
                          onClick={() => setPreviewTouch(touch)}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          style={styles.actionBtn}
                          disabled={!!confirmingId}
                          onClick={() => confirm(touch.id)}
                        >
                          Approve
                        </button>
                      </>
                    )
                  }
                />
              )
            })}
          </div>
        </div>
      )}

      {!initialLoading && scheduledApproved.length > 0 && (
        <div style={styles.pendingSection}>
          <div style={styles.pendingSectionHeader}>
            <span style={styles.sectionTitle}>Scheduled</span>
            <span style={{ ...styles.sectionCount, color: tokens.green, fontFamily: mono }}>
              {scheduledApproved.length}
            </span>
          </div>
          <div style={styles.touchList}>
            {scheduledApproved.map((touch) => {
              const lead = touch.lead
              return (
                <SimpleTouchRow
                  key={touch.id}
                  avatarLabel={lead ? initials(lead.first_name, lead.last_name) : '?'}
                  title={lead ? `${lead.first_name} ${lead.last_name ?? ''} · ${lead.company}` : 'Unknown lead'}
                  onOpenLead={lead ? () => setActiveLeadId(lead.id) : undefined}
                  meta={
                    <span style={styles.touchMeta}>
                      {intentLabel(touch.step?.day_offset ?? null)} ·{' '}
                      <TouchProgressLine
                        draftConfirmedAt={touch.draft_confirmed_at}
                        scheduledFor={touch.scheduled_for}
                        recipientTimezone={touch.recipient_timezone}
                      />
                    </span>
                  }
                  actions={
                    <button type="button" style={styles.previewBtn} onClick={() => setPreviewTouch(touch)}>
                      Preview
                    </button>
                  }
                />
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
  // Fix 9: 'held' is the primary signal now (set by enroll_lead / promoted by
  // mark_lead_connected). The linkedin_status fallback covers any row that
  // predates migration 0080 and never got backfilled to 'held'.
  const awaitingConnection = touch.status === 'held' || (isDm && lead.linkedin_status !== 'connected')
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
      // scheduled_for is timestamptz (migration 0092) — write the full
      // instant, preserving whatever time-of-day was already set, instead
      // of truncating back to a bare date.
      .update({ scheduled_for: current.toISOString() })
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
    // Fix 9: mark_lead_connected (migration 0080) flips linkedin_status AND
    // promotes any 'held' touches for this lead to 'scheduled' atomically.
    await supabase.rpc('mark_lead_connected', { p_lead_id: lead.id })
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
            {intentLabel(touch.step?.day_offset ?? null)} · {touch.enrollment?.sequence?.name ?? 'Sequence'} · {stepNumberLabel(touch.step?.step_number)}
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
