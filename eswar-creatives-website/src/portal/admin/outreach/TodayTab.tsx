// Today queue tab for the Outreach admin module.
// Shows Overdue (scheduled_for < today) then Due Today sections.
// Handles all edge cases: no email, linkedin awaiting connection, suppressed.
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Mail, Linkedin, Clock, AlertTriangle } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { mono } from '../ui'
import { OutreachSendModal, type TouchRow } from './OutreachSendModal'

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

export function TodayTab({
  onOpenLeadDrawer,
}: {
  onOpenLeadDrawer: (leadId: string) => void
}) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overdue, setOverdue] = useState<TouchRow[]>([])
  const [dueToday, setDueToday] = useState<TouchRow[]>([])
  const [activeTouch, setActiveTouch] = useState<TouchRow | null>(null)
  const today = todayStr()

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: err } = await supabase
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
        .order('created_at', { ascending: true })

      if (err) throw err
      const rows = (data ?? []) as TouchRow[]
      setOverdue(rows.filter((r) => r.scheduled_for < today))
      setDueToday(rows.filter((r) => r.scheduled_for === today))
    } catch {
      setError('Could not load the queue. Refresh to try again.')
    } finally {
      setLoading(false)
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

  const isEmpty = overdue.length === 0 && dueToday.length === 0

  return (
    <>
      {activeTouch && (
        <OutreachSendModal
          touch={activeTouch}
          onClose={() => setActiveTouch(null)}
          onSent={handleSent}
          onUpdateObservation={handleUpdateObservation}
        />
      )}

      {error && <div style={styles.errorBanner}>{error}</div>}

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
              onOpenLeadDrawer={onOpenLeadDrawer}
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
              onOpenLeadDrawer={onOpenLeadDrawer}
              onRefresh={load}
            />
          )}
        </div>
      )}
    </>
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
      {/* Avatar + info */}
      <div style={styles.touchMain}>
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

const styles: Record<string, CSSProperties> = {
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
}
