// Single shared date-display formatter for the portal, so every screen
// renders timestamps the same way instead of each file rolling its own
// Intl.DateTimeFormat options. Always converts to IST (Asia/Kolkata) first.
const IST_TIME_ZONE = 'Asia/Kolkata'

function istDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value)
  return { year: get('year'), month: get('month'), day: get('day') }
}

export function formatPortalDate(dateString: string | null | undefined): string {
  if (!dateString) return '-'

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '-'

  const target = istDateParts(date)
  const today = istDateParts(new Date())

  const isToday =
    target.year === today.year && target.month === today.month && target.day === today.day

  if (isToday) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: IST_TIME_ZONE,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  }

  const sameYear = target.year === today.year

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
  }).format(date)
}

// Same IST basis and same relative-year rule as formatPortalDate, but always
// carries the clock time. formatPortalDate deliberately drops it on any row
// that isn't today — which is right for a "when was this last touched" cell,
// and wrong for a feed whose whole purpose is auditing *when* something fired.
// ActivityTab's TIME column showed a bare "11 Aug" for every row in a batch,
// so a send that went out at 8 PM recipient-local was indistinguishable from
// one inside business hours without querying the database.
//
// Deliberately a sibling in this module rather than a new file or a call-site
// wrapper: formatPortalDate stays the default, both share istDateParts and the
// one IST_TIME_ZONE constant, and there is still exactly one place to change
// how the portal renders a timestamp.
export function formatPortalDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '-'

  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '-'

  const sameYear = istDateParts(date).year === istDateParts(new Date()).year

  return new Intl.DateTimeFormat('en-GB', {
    timeZone: IST_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: sameYear ? undefined : 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}
