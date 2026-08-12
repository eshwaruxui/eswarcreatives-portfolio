// One rule for displaying outreach_touches.scheduled_for.
//
// scheduled_for is only a real send time once draft_confirmed_at is set.
// Before that it is an enrollment placeholder: enroll_lead (migration 0080)
// inserts every step of a sequence up front with
// `next_business_day(start_date + day_offset)`, a bare date, which lands in
// the timestamptz column as midnight UTC. computeSendDecision has not run on
// it. The real recipient-local instant is picked by confirm-scheduled-touch
// when an admin clicks Approve.
//
// Rendering that placeholder through a time formatter invents a send time
// that does not exist. Midnight UTC reads as "5:30 AM" in IST and as
// "8:00 PM" the previous evening in America/New_York, so the placeholder
// looks precise and looks wrong, and in both cases it names an hour no
// scheduler ever chose.
//
// TodayTab found this first (its Review in Advance section showed a bare
// "12:00 AM") and solved it locally. LeadDrawer's Timeline and LeadsTab's
// NEXT TOUCH column then reproduced the same bug independently, because the
// rule lived inside one component instead of somewhere all three could reach.
// This module is that somewhere. Any surface showing scheduled_for goes
// through here.
import { formatPortalDate } from './formatDate'

// Established portal wording for this state, already in use in TodayTab's
// Review in Advance rows. Reused verbatim rather than reworded, so the same
// state does not acquire a second name.
export const AWAITING_APPROVAL_LABEL = 'Waiting for confirmation'

// For title attributes on width-constrained surfaces, where the label itself
// would widen a column. Explains what the date does and does not mean.
export const AWAITING_APPROVAL_TITLE =
  'Planned day only. The exact send time is chosen in the recipient’s local business hours when this touch is approved.'

/**
 * True when scheduled_for is still an enrollment placeholder rather than a
 * scheduled instant. Callers that need to append a label or a tooltip branch
 * on this; callers that only render the value do not need it.
 */
export function isAwaitingApproval(
  draftConfirmedAt: string | null | undefined,
): boolean {
  return !draftConfirmedAt
}

/**
 * Renders scheduled_for honestly.
 *
 * Approved: unchanged behaviour, the real time via formatPortalDate, which
 * keeps the portal's one date-display contract (including '-' for null and
 * unparseable input, so callers must not add their own fallback).
 *
 * Not yet approved: the planned day with no clock time at all.
 *
 * `weekday` is off by default because the two table surfaces using this are
 * width-constrained (see the Dense Table Width Pattern); TodayTab opts in, so
 * its existing rendering is unchanged by the extraction.
 */
export function formatScheduledFor(
  scheduledFor: string | null | undefined,
  draftConfirmedAt: string | null | undefined,
  opts?: { timeZone?: string | null; weekday?: boolean },
): string {
  if (!scheduledFor) return '-'

  if (!isAwaitingApproval(draftConfirmedAt)) return formatPortalDate(scheduledFor)

  const date = new Date(scheduledFor)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: opts?.timeZone ?? 'UTC',
    weekday: opts?.weekday ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
  }).format(date)
}
