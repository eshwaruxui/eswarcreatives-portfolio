// Compact inline Approved -> Queued progress read for an outreach_touches
// row that's been approved but hasn't sent yet. Replaces a bare "Sends
// {time}" line, which looked stuck/wrong for the several minutes a touch
// legitimately sits at status='scheduled' after being approved inside
// business hours — confirm-scheduled-touch never sends directly, it always
// hands off to the 5-minute send-confirmed-outreach-touches cron, even when
// the recipient's window is already open. This makes that wait visible
// instead of looking like an unexplained delay.
//
// Callers must stop rendering this once the touch actually reaches
// status='sent' — the Sent status badge already says so at that point, and
// repeating "Approved -> Queued -> Sent" under every completed row read as
// redundant clutter rather than useful in-flight context. Shared by
// TodayTab's Scheduled section and ActivityTab so both read the same way
// while a touch is still pending.
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

export function TouchProgressLine({
  draftConfirmedAt,
  scheduledFor,
  recipientTimezone,
}: {
  draftConfirmedAt: string | null
  scheduledFor: string
  recipientTimezone: string | null
}) {
  if (!draftConfirmedAt) return null

  // scheduled_for <= now means the recipient's window is already open and
  // the touch is just waiting for the next cron tick (at most 5 minutes) —
  // distinct from a genuine multi-hour/next-day hold.
  const isDue = new Date(scheduledFor).getTime() <= Date.now()
  const secondStepLabel = isDue
    ? 'Queued — sending shortly'
    : `Scheduled ${formatStepTime(scheduledFor, recipientTimezone)}, their local time`

  return (
    <span style={{ fontFamily: mono, fontSize: 11, whiteSpace: 'nowrap' }}>
      <span style={{ color: tokens.green }}>✓ Approved {formatStepTime(draftConfirmedAt, recipientTimezone)}</span>
      <span style={{ color: t.text.muted }}> {'→'} </span>
      <span style={{ color: tokens.goldDark }}>{secondStepLabel}</span>
    </span>
  )
}
