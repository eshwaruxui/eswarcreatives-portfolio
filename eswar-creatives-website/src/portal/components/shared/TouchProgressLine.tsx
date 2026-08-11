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
  layout = 'inline',
}: {
  draftConfirmedAt: string | null
  scheduledFor: string
  recipientTimezone: string | null
  // 'inline' is the original single-line "Approved … → Scheduled …" read, kept
  // as the default so TodayTab's Scheduled cards are unchanged. 'stacked'
  // splits it over two lines for ActivityTab, whose table row has to fit a
  // lead, a sequence, a status *and* two action buttons — as one line the
  // full string ran ~65 characters and pushed Preview/Approve off-screen at
  // 1280px. See Section 1's 8 Aug entry.
  layout?: 'inline' | 'stacked'
}) {
  if (!draftConfirmedAt) return null

  // Three distinct states, not two.
  //
  // A touch whose scheduled_for has just passed is genuinely mid-flight,
  // waiting on the next cron tick (at most 5 minutes). But the cron can also
  // decline to send a due row and write nothing — it skips anything outside
  // the recipient's 9:30 AM-5:30 PM local window, and anything that loses its
  // slot to the 25/day cap. In both cases scheduled_for stays in the past
  // indefinitely, so past-due alone stopped meaning "sending shortly".
  //
  // Rendering a stale past timestamp as an imminent send was the honest-UI
  // cost of keeping that cron check stateless; this is where it's paid back.
  // Well past its slot means the row is waiting for a window to reopen, and
  // says so rather than naming a time that has already gone.
  //
  // 15 minutes = three cron ticks, enough that a genuinely queued touch is
  // never mislabelled by a slow tick or a little clock skew.
  const DEFERRED_AFTER_MS = 15 * 60 * 1000
  const overdueByMs = Date.now() - new Date(scheduledFor).getTime()
  const isDue = overdueByMs >= 0
  const isDeferred = overdueByMs >= DEFERRED_AFTER_MS

  const secondStepLabel = isDeferred
    ? 'Waiting for next available window'
    : isDue
      ? 'Queued — sending shortly'
      : `Scheduled ${formatStepTime(scheduledFor, recipientTimezone)}, their local time`

  // Gold is the in-flight treatment and is reserved for a touch that really is
  // about to go. A deferred row is passive waiting, so it recedes to muted
  // alongside a genuine future hold — the label carries the distinction.
  const isInFlight = isDue && !isDeferred

  if (layout === 'stacked') {
    return (
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontFamily: mono, fontSize: 11, color: tokens.green, whiteSpace: 'nowrap' }}>
          ✓ Approved {formatStepTime(draftConfirmedAt, recipientTimezone)}
        </span>
        {/* A genuine future hold is passive context and recedes to muted. An
            already-due touch waiting on the cron keeps the gold in-flight
            treatment — that's the state PR #21 added this component to make
            visible in the first place, and muting it would undo that. A
            deferred row is waiting, not in flight, so it takes muted too. */}
        <span style={{
          fontFamily: mono,
          fontSize: 10,
          color: isInFlight ? tokens.goldDark : t.text.muted,
          whiteSpace: 'nowrap',
        }}>
          {secondStepLabel}
        </span>
      </span>
    )
  }

  return (
    <span style={{ fontFamily: mono, fontSize: 11, whiteSpace: 'nowrap' }}>
      <span style={{ color: tokens.green }}>✓ Approved {formatStepTime(draftConfirmedAt, recipientTimezone)}</span>
      <span style={{ color: t.text.muted }}> {'→'} </span>
      {/* Only the new deferred state changes tone here. The inline layout has
          always shown a genuine future hold in gold too (unlike 'stacked',
          which mutes it), and restyling that is not this change's business. */}
      <span style={{ color: isDeferred ? t.text.muted : tokens.goldDark }}>{secondStepLabel}</span>
    </span>
  )
}
