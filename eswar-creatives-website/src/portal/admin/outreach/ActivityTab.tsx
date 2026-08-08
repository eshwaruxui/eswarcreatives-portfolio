// Activity tab: flat feed of last 200 touches, filterable by channel and status.
// Includes scheduled touches with an inline Approve action (approves and
// holds for the recipient's business-hours window — the actual send happens
// later via the cron, not on click).
import { useEffect, useState } from 'react'
import { Eye, Mail, Linkedin, Clock, Loader2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { mono } from '../ui'
import { formatPortalDate } from '../../utils/formatDate'
import { stepNumberLabel } from '../../utils/touchLabels'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useReloadableList } from '../../hooks/useReloadableList'
import { LeadDrawer } from '../../components/LeadDrawer'
import { TouchProgressLine } from '../../components/shared/TouchProgressLine'
import { SortableTableHeader, toggleMultiSort, type SortableColumn, type SortSpec } from '../../components/shared/SortableTableHeader'

type ActivityRow = {
  id: string
  channel: string
  status: string
  scheduled_for: string
  recipient_timezone: string | null
  draft_confirmed_at: string | null
  sent_at: string | null
  opened_at: string | null
  bounced_at: string | null
  skipped_reason: string | null
  lead: {
    id: string
    first_name: string
    last_name: string | null
    company: string
  } | null
  enrollment: {
    id: string
    sequence: { name: string } | null
  } | null
  step: { step_number: number } | null
}

// A touch is still waiting to happen. Anything else ('sent', 'skipped',
// 'cancelled', 'failed') has reached a terminal state and is history — it
// always stays visible in this feed.
const PENDING_STATUSES = new Set(['scheduled', 'held'])

const STATUS_TONES: Record<string, { bg: string; fg: string }> = {
  sent:      { bg: tokens.greenLight, fg: tokens.green },
  skipped:   { bg: tokens.goldLight, fg: tokens.goldDark },
  cancelled: { bg: t.background.muted, fg: t.text.tertiary },
  failed:    { bg: tokens.rubyLight, fg: tokens.ruby },
  scheduled: { bg: tokens.goldLight, fg: tokens.goldDark },
}

// Opened/Bounced aren't included here — both are still empty for every row
// (the Resend webhook that would populate them isn't live yet), so sorting
// on them wouldn't do anything useful yet.
const ACTIVITY_COLUMNS: SortableColumn[] = [
  { key: 'time', label: 'TIME', sortable: true },
  { key: 'lead', label: 'LEAD', sortable: true },
  { key: 'sequence', label: 'SEQUENCE / STEP', sortable: false },
  { key: 'channel', label: 'CHANNEL', sortable: true },
  { key: 'status', label: 'STATUS', sortable: true },
  { key: 'opened', label: 'OPENED', sortable: false },
  { key: 'bounced', label: 'BOUNCED', sortable: false },
  { key: 'action', label: '', sortable: false },
]

function compareByKey(a: ActivityRow, b: ActivityRow, key: string, dir: 'asc' | 'desc'): number {
  let va: string | null | undefined
  let vb: string | null | undefined
  if (key === 'time') {
    va = a.sent_at ?? a.scheduled_for
    vb = b.sent_at ?? b.scheduled_for
  } else if (key === 'lead') {
    va = a.lead ? (a.lead.last_name ?? a.lead.first_name).toLowerCase() : null
    vb = b.lead ? (b.lead.last_name ?? b.lead.first_name).toLowerCase() : null
  } else if (key === 'channel') {
    va = a.channel
    vb = b.channel
  } else if (key === 'status') {
    va = a.status
    vb = b.status
  }
  if (!va && !vb) return 0
  if (!va) return dir === 'asc' ? 1 : -1
  if (!vb) return dir === 'asc' ? -1 : 1
  return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
}

// Multi-column: earlier entries in `sorts` take priority; ties fall through
// to the next sort key, in order. Mirrors LeadsTab's applySorting exactly.
function applySorting(rows: ActivityRow[], sorts: SortSpec[]): ActivityRow[] {
  if (sorts.length === 0) return rows
  return [...rows].sort((a, b) => {
    for (const { key, dir } of sorts) {
      const cmp = compareByKey(a, b, key, dir)
      if (cmp !== 0) return cmp
    }
    return 0
  })
}

// enroll_lead inserts a touch for *every* step of a sequence at enrollment
// time (migration 0080), all of them 'scheduled' except requires_connected
// steps which start 'held' — nothing is generated progressively as earlier
// steps send, and there's no per-row "blocked by previous step" column. So a
// lead enrolled today immediately produced three rows here, all reading
// "Scheduled / Awaiting approval" at once, implying three emails were lined
// up and actionable when only step 1 actually is.
//
// Only the earliest still-pending step per enrollment is real work; later
// ones are contingent on it. Keep that one and drop the rest. Terminal rows
// (sent/skipped/cancelled/failed) are untouched — this is the Activity feed,
// history is the point — which also means a step 1 that got skipped or
// cancelled correctly promotes step 2 to earliest-pending rather than
// hiding the whole enrollment behind a step that will never send.
//
// Enrollment, not lead, is the grain: a lead enrolled in two sequences has
// two independent progressions and should show the next due step of each.
// Same rule as TodayTab's dedupeByEnrollment, but applied to a mixed feed
// where terminal rows have to survive the filter.
function hideBlockedFutureSteps(rows: ActivityRow[]): ActivityRow[] {
  const earliestPendingId = new Map<string, { id: string; stepNumber: number }>()
  for (const row of rows) {
    if (!PENDING_STATUSES.has(row.status)) continue
    const key = row.enrollment?.id
    if (!key) continue
    // A touch with no linked step (step_id null — a deleted step, or an
    // older edited touch from before Preview stopped nulling step_id) must
    // never win the earliest comparison: falling back to 0 would hide a
    // correctly-numbered step 1 behind an unknown-step row. Unknown sorts
    // last, exactly as in TodayTab's dedupe.
    const stepNumber = row.step?.step_number ?? Number.POSITIVE_INFINITY
    const current = earliestPendingId.get(key)
    if (!current || stepNumber < current.stepNumber) {
      earliestPendingId.set(key, { id: row.id, stepNumber })
    }
  }
  return rows.filter((row) => {
    if (!PENDING_STATUSES.has(row.status)) return true
    const key = row.enrollment?.id
    // No enrollment means no preceding step to be blocked by (one-off touch).
    if (!key) return true
    return earliestPendingId.get(key)?.id === row.id
  })
}

// Approves a touch — does NOT send it. confirm-scheduled-touch only stamps
// draft_confirmed_at and sets scheduled_for to the recipient's next
// business-hours window; the actual Resend call happens later via the
// 5-minute send-confirmed-outreach-touches cron. Mirrors TodayTab.tsx's
// copy of this hook so both screens report the same outcome.
function useConfirmScheduledTouch(
  onSuccess: (id: string, holdUntil?: string, recipientTimezone?: string) => void
) {
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
        setErrors((e) => ({
          ...e,
          [touchId]: data?.error === 'already_approved'
            ? 'Already approved elsewhere. Refresh to see its send time.'
            : 'Could not approve. Please try again.',
        }))
      } else {
        onSuccess(touchId, data.hold_until as string | undefined, data.recipient_timezone as string | undefined)
      }
    } catch {
      setErrors((e) => ({ ...e, [touchId]: 'Network error. Please try again.' }))
    } finally {
      setConfirming(null)
    }
  }

  return { confirming, errors, confirm }
}

export function ActivityTab() {
  const { isMobile } = useBreakpoint()
  const [rows, setRows] = useState<ActivityRow[]>([])
  const { initialLoading, start: startLoad, finish: finishLoad } = useReloadableList()
  const [filterChannel, setFilterChannel] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sorts, setSorts] = useState<SortSpec[]>([])
  const [openLeadId, setOpenLeadId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function load() {
    startLoad()
    let q = supabase
      .from('outreach_touches')
      .select(`
        id, channel, status, scheduled_for, recipient_timezone, draft_confirmed_at, sent_at, opened_at, bounced_at, skipped_reason,
        lead:leads!lead_id (id, first_name, last_name, company),
        enrollment:lead_enrollments!enrollment_id (id, sequence:sequences!sequence_id (name)),
        step:sequence_steps!step_id (step_number)
      `)
      .order('sent_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200)

    if (filterChannel) q = q.eq('channel', filterChannel)
    if (filterStatus) {
      q = q.eq('status', filterStatus)
    }

    const { data } = await q
    // Filter after fetching, not in the query: deciding whether a pending
    // touch is the earliest of its enrollment needs that enrollment's *other*
    // pending rows to compare against, which a single PostgREST filter can't
    // express.
    setRows(hideBlockedFutureSteps((data ?? []) as ActivityRow[]))
    finishLoad()
  }

  useEffect(() => { load() }, [filterChannel, filterStatus])

  // A touch approved inside business hours still waits for the next
  // send-confirmed-outreach-touches cron tick (up to 5 min) before it
  // actually sends — without this, an approved row keeps showing "Queued"
  // until a manual reload reveals it already went out. Silent background
  // refresh, not a full reload — load() only shows the skeleton on the true
  // first load (see useReloadableList). Re-created on filter change so it
  // always polls with the currently selected filters, not stale ones.
  useEffect(() => {
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [filterChannel, filterStatus])

  const { confirming, errors, confirm } = useConfirmScheduledTouch((id, holdUntil, recipientTimezone) => {
    // Status stays 'scheduled' — confirm-scheduled-touch never calls Resend,
    // it only approves and holds. The row now has draft_confirmed_at set, so
    // the Approve action below hides itself instead of allowing a second
    // approve call that could silently reschedule an already-correct send.
    setRows((prev) => prev.map((r) => r.id === id
      ? {
          ...r,
          draft_confirmed_at: new Date().toISOString(),
          scheduled_for: holdUntil ?? r.scheduled_for,
          recipient_timezone: recipientTimezone ?? r.recipient_timezone,
        }
      : r))
    const when = holdUntil && recipientTimezone
      ? new Intl.DateTimeFormat('en-US', {
          timeZone: recipientTimezone, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
        }).format(new Date(holdUntil))
      : null
    showToast(when ? `Approved — will send ${when}, their local time.` : 'Approved. Will send at the next business-day window.')
  })

  // Every click is additive: a new column appends as the lowest-priority
  // sort key, an already-active one cycles asc -> desc -> removed in place.
  // "Clear sort" (next to the result count) is the way back to no sort at
  // all. Mirrors LeadsTab's handleSort exactly.
  function handleSort(key: string) {
    setSorts((prev) => toggleMultiSort(prev, key))
  }

  const sorted = applySorting(rows, sorts)

  return (
    <>
      {openLeadId && (
        <LeadDrawer
          leadId={openLeadId}
          onClose={() => { setOpenLeadId(null); load() }}
        />
      )}
      {toast && <div style={styles.toast}>{toast}</div>}

      <div style={{ ...styles.filterBar, ...(isMobile ? styles.filterBarMobile : null) }}>
        <select style={styles.filterSelect} value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)}>
          <option value="">All channels</option>
          <option value="email">Email</option>
          <option value="linkedin_connect">LinkedIn Connect</option>
          <option value="linkedin_dm">LinkedIn DM</option>
        </select>
        <select style={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="scheduled">Scheduled</option>
          <option value="skipped">Skipped</option>
          <option value="cancelled">Cancelled</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {!initialLoading && rows.length > 0 && (
        <div style={styles.resultRow}>
          <p style={styles.resultCount}>
            {sorted.length} touch{sorted.length !== 1 ? 'es' : ''}
          </p>
          {!isMobile && sorts.length > 0 && (
            <button type="button" style={styles.clearSortBtn} onClick={() => setSorts([])}>
              Clear sort{sorts.length > 1 ? ` (${sorts.length})` : ''}
            </button>
          )}
        </div>
      )}

      {initialLoading ? (
        <p style={styles.loading}>Loading activity...</p>
      ) : rows.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyHeading}>No activity yet</p>
          <p style={styles.emptyBody}>Enroll your first lead to get started.</p>
        </div>
      ) : isMobile ? (
        <div style={styles.cardStack}>
          <style>{`.ec-tap-card:active { background: ${t.background.tint1}; }`}</style>
          {sorted.map((row) => {
            const tone = STATUS_TONES[row.status] ?? { bg: t.background.muted, fg: t.text.muted }
            const isScheduled = row.status === 'scheduled'
            // Already approved (draft_confirmed_at set) — waiting on the
            // cron, not actionable here. Showing Approve again would let a
            // second click silently reschedule an already-correct send.
            const isApprovable = isScheduled && row.channel === 'email' && !row.draft_confirmed_at
            // Only while still pending — once status flips to 'sent' the
            // status badge already says so, and repeating the progress line
            // under every completed row read as clutter, not useful context.
            const showsProgressLine = isScheduled && row.channel === 'email' && !!row.draft_confirmed_at
            const isConfirming = confirming === row.id
            const rowError = errors[row.id]
            return (
              <div key={row.id} style={styles.mobileCard}>
                <div className="ec-tap-card" style={styles.mobileCardTop} onClick={() => row.lead && setOpenLeadId(row.lead.id)}>
                  <div style={styles.leadCell}>
                    <strong style={styles.leadName}>
                      {row.lead ? `${row.lead.first_name} ${row.lead.last_name ?? ''}` : 'Unknown'}
                    </strong>
                    {row.lead && <span style={styles.leadCompany}>{row.lead.company}</span>}
                  </div>
                  <ChannelIcon channel={row.channel} />
                </div>
                <p style={styles.mobileCardSubject}>
                  {row.enrollment?.sequence?.name ?? 'Sequence'}
                  {row.step ? ` · ${stepNumberLabel(row.step.step_number)}` : ''}
                </p>
                <div style={styles.mobileCardBottom}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {isScheduled && <Clock size={11} color={tokens.goldDark} />}
                    <span style={{ ...styles.statusBadge, background: tone.bg, color: tone.fg }}>
                      {row.status}
                    </span>
                    {row.opened_at && <Eye size={13} color={tokens.green} />}
                    {row.bounced_at && <span style={styles.bounced}>Bounced</span>}
                  </span>
                  <span style={styles.mono}>{formatPortalDate(row.sent_at ?? row.scheduled_for)}</span>
                </div>
                {isApprovable && (
                  <div onClick={(e) => e.stopPropagation()}>
                    {isConfirming ? (
                      <Loader2 size={15} color={t.text.muted} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <button
                        type="button"
                        style={styles.confirmBtnMobile}
                        disabled={!!confirming}
                        onClick={() => confirm(row.id)}
                      >
                        Approve
                      </button>
                    )}
                  </div>
                )}
                {showsProgressLine && (
                  <TouchProgressLine
                    draftConfirmedAt={row.draft_confirmed_at}
                    scheduledFor={row.scheduled_for}
                    recipientTimezone={row.recipient_timezone}
                  />
                )}
                {rowError && <div style={styles.mobileCardError}>{rowError}</div>}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <SortableTableHeader columns={ACTIVITY_COLUMNS} sorts={sorts} onSort={handleSort} />
            </thead>
            <tbody>
              {sorted.map((row) => {
                const tone = STATUS_TONES[row.status] ?? { bg: t.background.muted, fg: t.text.muted }
                const isScheduled = row.status === 'scheduled'
                const isApprovable = isScheduled && row.channel === 'email' && !row.draft_confirmed_at
                // Only while still pending — once status flips to 'sent'
                // the status badge already says so, and repeating the
                // progress line under every completed row read as clutter.
                const showsProgressLine = isScheduled && row.channel === 'email' && !!row.draft_confirmed_at
                const isConfirming = confirming === row.id
                const rowError = errors[row.id]
                return (
                  <>
                    <tr
                      key={row.id}
                      style={styles.tr}
                      onClick={() => row.lead && setOpenLeadId(row.lead.id)}
                    >
                      <td style={styles.td}>
                        <span style={styles.mono}>
                          {formatPortalDate(row.sent_at ?? row.scheduled_for)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {row.lead ? (
                          <span style={styles.leadCell}>
                            <strong style={styles.leadName}>{row.lead.first_name} {row.lead.last_name ?? ''}</strong>
                            <span style={styles.leadCompany}>{row.lead.company}</span>
                          </span>
                        ) : (
                          <span style={styles.muted}>Unknown</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.seqCell}>
                          {row.enrollment?.sequence?.name ?? '-'}
                          {row.step ? ` · ${stepNumberLabel(row.step.step_number)}` : ''}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <ChannelIcon channel={row.channel} />
                      </td>
                      <td style={styles.td}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {isScheduled && <Clock size={12} color={tokens.goldDark} />}
                          <span style={{
                            ...styles.statusBadge,
                            background: tone.bg,
                            color: tone.fg,
                          }}>
                            {row.status}
                          </span>
                        </span>
                        {showsProgressLine && (
                          <div style={styles.scheduledMeta}>
                            <TouchProgressLine
                              draftConfirmedAt={row.draft_confirmed_at}
                              scheduledFor={row.scheduled_for}
                              recipientTimezone={row.recipient_timezone}
                            />
                          </div>
                        )}
                        {/* Not yet approved: scheduled_for is still just a
                            placeholder day, not a real business-hours time
                            (same reason TodayTab's Review in Advance rows
                            don't show a raw time either) — showing it here
                            would repeat that same "12:00 AM" bug. */}
                        {isApprovable && (
                          <div style={styles.scheduledMeta}>Awaiting approval</div>
                        )}
                      </td>
                      <td style={styles.td}>
                        {row.opened_at && <Eye size={14} color={tokens.green} />}
                      </td>
                      <td style={styles.td}>
                        {row.bounced_at && <span style={styles.bounced}>Bounced</span>}
                      </td>
                      <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                        {isApprovable && (
                          isConfirming ? (
                            <Loader2 size={15} color={t.text.muted} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <button
                              type="button"
                              style={styles.confirmBtn}
                              disabled={!!confirming}
                              onClick={() => confirm(row.id)}
                            >
                              Approve
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                    {rowError && (
                      <tr key={`${row.id}-err`}>
                        <td colSpan={8} style={styles.rowError}>{rowError}</td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === 'email') return <Mail size={14} color={t.text.muted} />
  return <Linkedin size={14} color={t.text.muted} />
}

const styles: Record<string, CSSProperties> = {
  filterBar: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterBarMobile: { flexWrap: 'nowrap', overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  filterSelect: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '7px 10px',
    outline: 'none',
    flexShrink: 0,
  },
  loading: { fontFamily: fonts.body, fontSize: 14, color: t.text.muted, padding: '24px 0' },
  emptyState: { textAlign: 'center', padding: '60px 24px' },
  emptyHeading: {
    fontFamily: fonts.heading,
    fontSize: 20,
    fontWeight: 600,
    color: t.text.primary,
    margin: '0 0 8px',
  },
  emptyBody: { fontFamily: fonts.body, fontSize: 14, color: t.text.secondary, margin: 0 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 760 },
  resultRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  resultCount: {
    fontFamily: mono,
    fontSize: 12,
    color: t.text.muted,
    margin: 0,
  },
  clearSortBtn: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 500,
    color: t.text.urlLink,
    textDecoration: 'underline',
    cursor: 'pointer',
  },
  tr: { cursor: 'pointer' },
  td: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    padding: '10px 12px',
    borderBottom: `1px solid ${t.border.subtle}`,
    verticalAlign: 'middle',
  },
  mono: { fontFamily: mono, fontSize: 12, color: t.text.muted },
  muted: { color: t.text.muted, fontStyle: 'italic' },
  leadCell: { display: 'flex', flexDirection: 'column', gap: 1 },
  leadName: { fontFamily: fonts.body, fontSize: 13, color: t.text.primary, fontWeight: 600 },
  leadCompany: { fontFamily: fonts.body, fontSize: 11, color: t.text.muted },
  seqCell: { fontFamily: fonts.body, fontSize: 12, color: t.text.secondary },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  scheduledMeta: {
    fontFamily: mono,
    fontSize: 11,
    color: t.text.muted,
    marginTop: 2,
  },
  bounced: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: tokens.ruby,
    fontWeight: 600,
  },
  confirmBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    padding: '5px 10px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  rowError: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.ruby,
    padding: '4px 12px 8px',
    borderBottom: `1px solid ${t.border.subtle}`,
  },

  // Mobile card list
  cardStack: { display: 'flex', flexDirection: 'column', gap: 8 },
  mobileCard: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 10,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  mobileCardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    cursor: 'pointer',
    borderRadius: 6,
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  mobileCardSubject: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.secondary,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mobileCardBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  mobileCardError: { fontFamily: fonts.body, fontSize: 12, color: tokens.ruby },
  // 44px min tap target per the portal-wide rule (spec suggested 32px to match
  // the desktop table's inline button, but the 44px minimum takes precedence).
  confirmBtnMobile: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    minHeight: 44,
    cursor: 'pointer',
    width: '100%',
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
