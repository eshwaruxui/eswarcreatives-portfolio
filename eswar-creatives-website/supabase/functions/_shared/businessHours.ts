// Shared business-hours scheduling policy for outreach email sends. Single
// source of truth for both send-outreach-email (the direct "Send email"
// click) and confirm-scheduled-touch (the "Review in Advance" early-approval
// click) — both must apply the exact same rule: emails only go out between
// 9:30 AM and 5:30 PM in the RECIPIENT's own local time, Monday-Friday, to
// keep sends inside their working hours.
//
// The 4-step policy:
//   1. Recipient's local time is before 9:30 AM (on a weekday) -> hold for
//      9:30 AM today, local.
//   2. Between 9:30 AM and 5:30 PM (weekday) -> send now.
//   3. After 5:30 PM, or today is a weekend in the recipient's zone -> hold
//      for 9:30 AM on the next business day (Mon-Fri only), local.

export const COUNTRY_TZ: Record<string, string> = {
  US: "America/New_York",
  GB: "Europe/London",
  IN: "Asia/Kolkata",
  DE: "Europe/Berlin",
  FR: "Europe/Paris",
  AU: "Australia/Sydney",
  CA: "America/Toronto",
  SG: "Asia/Singapore",
  AE: "Asia/Dubai",
  JP: "Asia/Tokyo",
};

export function resolveTimezone(
  recipientTimezone: string | null | undefined,
  country: string | null | undefined
): string {
  if (recipientTimezone) return recipientTimezone;
  const cc = (country ?? "US").toUpperCase();
  return COUNTRY_TZ[cc] ?? "America/New_York";
}

// Converts a wall-clock date/time in a given IANA zone to the equivalent UTC
// instant. 2-pass convergence, DST-safe, no external date library needed
// (Deno's edge runtime has no built-in timezone-aware wall-clock converter).
export function zonedWallTimeToUtc(
  y: number,
  m: number,
  d: number,
  hh: number,
  mm: number,
  timeZone: string
): Date {
  let utcGuess = Date.UTC(y, m - 1, d, hh, mm);
  for (let i = 0; i < 2; i++) {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    const parts = dtf.formatToParts(new Date(utcGuess));
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)!.value, 10);
    const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"));
    utcGuess += Date.UTC(y, m - 1, d, hh, mm) - asIfUtc;
  }
  return new Date(utcGuess);
}

type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: string;
};

function localParts(date: Date, timeZone: string): LocalParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour: parseInt(get("hour"), 10) % 24,
    minute: parseInt(get("minute"), 10),
    weekday: get("weekday"),
  };
}

function isWeekend(weekday: string): boolean {
  return weekday === "Sat" || weekday === "Sun";
}

// Always advances at least one calendar day (in the recipient's zone) from
// `from`, skipping weekends, landing on the next weekday.
function nextBusinessDayDate(
  from: { year: number; month: number; day: number },
  timeZone: string
): { year: number; month: number; day: number } {
  let anchor = new Date(Date.UTC(from.year, from.month - 1, from.day, 12));
  let parts: LocalParts;
  do {
    anchor = new Date(anchor.getTime() + 86400000);
    parts = localParts(anchor, timeZone);
  } while (isWeekend(parts.weekday));
  return { year: parts.year, month: parts.month, day: parts.day };
}

const WINDOW_OPEN_MIN = 9 * 60 + 30; // 9:30 AM
const WINDOW_CLOSE_MIN = 17 * 60 + 30; // 5:30 PM

export type SendDecision = { sendNow: boolean; scheduledFor: Date };

export function computeSendDecision(now: Date, timeZone: string): SendDecision {
  const local = localParts(now, timeZone);

  if (isWeekend(local.weekday)) {
    const nextDay = nextBusinessDayDate(local, timeZone);
    return {
      sendNow: false,
      scheduledFor: zonedWallTimeToUtc(nextDay.year, nextDay.month, nextDay.day, 9, 30, timeZone),
    };
  }

  const minutesNow = local.hour * 60 + local.minute;

  if (minutesNow < WINDOW_OPEN_MIN) {
    return {
      sendNow: false,
      scheduledFor: zonedWallTimeToUtc(local.year, local.month, local.day, 9, 30, timeZone),
    };
  }

  if (minutesNow <= WINDOW_CLOSE_MIN) {
    return { sendNow: true, scheduledFor: now };
  }

  const nextDay = nextBusinessDayDate(local, timeZone);
  return {
    sendNow: false,
    scheduledFor: zonedWallTimeToUtc(nextDay.year, nextDay.month, nextDay.day, 9, 30, timeZone),
  };
}
