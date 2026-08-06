// Compact inline Approved -> Queued -> Sent progress read for an
// outreach_touches row that's gone through the approve flow. Replaces a bare
// "Sends {time}" line, which looked stuck/wrong for the several minutes a
// touch legitimately sits at status='scheduled' after being approved inside
// business hours — confirm-scheduled-touch never sends directly, it always
// hands off to the 5-minute send-confirmed-outreach-touches cron, even when
// the recipient's window is already open. This makes that wait visible
// instead of looking like an unexplained delay. Shared by TodayTab's
// Scheduled section and ActivityTab so both read the same way.
import { tokens, t } from '../../theme'
import { mono } from '../../admin/ui'

function formatStepTime(iso: string, tz: string | null): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz ?? 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso))
}

type StepState = 'done' | 'active' | 'pending'

function colorFor(state: StepState): string {
  if (state === 'done') return tokens.green
  if (state === 'active') return tokens.goldDark
  return t.text.muted
}

export function TouchProgressLine({
  draftConfirmedAt,
  scheduledFor,
  sentAt,
  recipientTimezone,
}: {
  draftConfirmedAt: string | null
  scheduledFor: string
  sentAt?: string | null
  recipientTimezone: string | null
}) {
  if (!draftConfirmedAt) return null

  const isSent = !!sentAt
  // scheduled_for <= now means the recipient's window is already open and
  // the touch is just waiting for the next cron tick (at most 5 minutes) —
  // distinct from a genuine multi-hour/next-day hold.
  const isDue = !isSent && new Date(scheduledFor).getTime() <= Date.now()

  const steps: { label: string; state: StepState }[] = [
    { label: `Approved ${formatStepTime(draftConfirmedAt, recipientTimezone)}`, state: 'done' },
    isSent
      ? { label: `Queued ${formatStepTime(scheduledFor, recipientTimezone)}`, state: 'done' }
      : { label: isDue ? 'Queued — sending shortly' : `Scheduled ${formatStepTime(scheduledFor, recipientTimezone)}, their local time`, state: 'active' },
    { label: isSent ? `Sent ${formatStepTime(sentAt as string, recipientTimezone)}` : 'Sent', state: isSent ? 'done' : 'pending' },
  ]

  return (
    <span style={{ fontFamily: mono, fontSize: 11, whiteSpace: 'nowrap' }}>
      {steps.map((step, i) => (
        <span key={i}>
          {i > 0 && <span style={{ color: t.text.muted }}> {'→'} </span>}
          <span style={{ color: colorFor(step.state) }}>
            {step.state === 'done' ? '✓ ' : ''}{step.label}
          </span>
        </span>
      ))}
    </span>
  )
}
