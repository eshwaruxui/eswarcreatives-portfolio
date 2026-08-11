// Activity tab: flat feed of last 200 touches, filterable by channel and status.
// Includes scheduled touches with an inline Approve action (approves and
// holds for the recipient's business-hours window — the actual send happens
// later via the cron, not on click).
import { useEffect, useState } from 'react'
import { Eye, Mail, Linkedin, Clock, Loader2, MailCheck, MousePointerClick } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { mono } from '../ui'
import { formatPortalDate, formatPortalDateTime } from '../../utils/formatDate'
import { stepNumberLabel } from '../../utils/touchLabels'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useReloadableList } from '../../hooks/useReloadableList'
import { LeadDrawer } from '../../components/LeadDrawer'
import { TouchProgressLine } from '../../components/shared/TouchProgressLine'
import { FadeOverflow } from '../../components/shared/FadeOverflow'
import {
  TouchPreviewModal,
  PREVIEW_TOUCH_SELECT,
  type PreviewTouch,
} from '../../components/shared/TouchPreviewModal'
import { SortableTableHeader, toggleMultiSort, type SortableColumn, type SortSpec } from '../../components/shared/SortableTableHeader'
import { SkeletonRow } from '../../components/shared/SkeletonRow'
import { Pagination } from '../../components/shared/Pagination'
import { StickyBar } from '../../components/shared/StickyBar'
import { useConfirmScheduledTouch } from '../../hooks/useConfirmScheduledTouch'
import { usePagination } from '../../hooks/usePagination'

type ActivityRow = {
  id: string
  channel: string
  status: string
  scheduled_for: string
  recipient_timezone: string | null
  draft_confirmed_at: string | null
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
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

// The four delivery columns stay unsortable. They were left out originally
// because the Resend webhook was not live and every value was null; the
// webhook went live 9 Aug 2026, so the reason now is different. Sorting on a
// mostly-null timestamp column buries the populated rows behind whichever
// nulls-first/last the comparator happens to pick, which is worse than the
// chronological default this feed already has.
//
// Widths matter here: Status is the one cell whose content varies wildly in
// length (a bare badge vs. an approved touch's two-line timestamp read), so
// it's left to absorb the slack while Lead and the action column are pinned.
// Without that, a long status pushed Preview/Approve out of the viewport at
// 1280px and squeezed the lead name to nothing.
//
// Delivered, opened and clicked share ONE column rather than getting three.
// Measured at a 1280px viewport before choosing: three separate date columns
// put the table 32px over the 961px content area even at 6px gutters, and
// none of the documented levers close that. The Status column is
// `width: 100%`, so capping its content reclaims nothing at all, and the
// binding constraint turns out to be the uppercase header labels themselves,
// which is exactly the floor COMPONENT_PATTERNS warns about. Three headers
// cost more than the three cells ever would. Collapsing them into one icon
// cluster pays for one header instead of three.
const ACTIVITY_COLUMNS: SortableColumn[] = [
  { key: 'time', label: 'TIME', sortable: true },
  { key: 'lead', label: 'LEAD', sortable: true, width: '140px' },
  { key: 'sequence', label: 'SEQUENCE / STEP', sortable: false },
  { key: 'channel', label: 'CHANNEL', sortable: true },
  { key: 'status', label: 'STATUS', sortable: true },
  { key: 'engagement', label: 'ENGAGED', sortable: false },
  { key: 'bounced', label: 'BOUNCED', sortable: false },
  { key: 'action', label: '', sortable: false, width: '180px' },
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

export function ActivityTab() {
  const { isMobile } = useBreakpoint()
  const [rows, setRows] = useState<ActivityRow[]>([])
  const { initialLoading, start: startLoad, finish: finishLoad } = useReloadableList()
  const [filterChannel, setFilterChannel] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [sorts, setSorts] = useState<SortSpec[]>([])
  const [openLeadId, setOpenLeadId] = useState<string | null>(null)
  const [previewTouch, setPreviewTouch] = useState<PreviewTouch | null>(null)
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  // Sort runs over the whole feed, then the page is sliced out of the result.
  // The other order would sort only the visible window, so page 2 would hold
  // touches that belong on page 1.
  const sorted = applySorting(rows, sorts)
  const {
    currentPage, pageSize, paginatedSlice, goToPage, changePageSize,
    reset: resetPage, pageStart, pageEnd,
  } = usePagination(sorted.length, 25)
  const pageRows = paginatedSlice(sorted)

  async function load() {
    startLoad()
    let q = supabase
      .from('outreach_touches')
      .select(`
        id, channel, status, scheduled_for, recipient_timezone, draft_confirmed_at, sent_at, delivered_at, opened_at, clicked_at, bounced_at, skipped_reason,
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

  // Page 1 on every filter change: staying on page 4 of the previous, wider
  // result set would land on a page the narrowed one no longer has. Kept here
  // rather than inside load() on purpose, since the 30s poll below calls
  // load() too and must never yank the user back to page 1 mid-read.
  useEffect(() => { resetPage(); load() }, [filterChannel, filterStatus])

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

  // This tab's list query is deliberately narrow (it renders 200 rows), so it
  // doesn't carry the lead email/observation/unsubscribe token or the step
  // templates the preview needs. Top those up on demand, using the modal's
  // own exported select so the shape can't drift from TodayTab's.
  async function openPreview(touchId: string) {
    setPreviewLoadingId(touchId)
    setPreviewError(null)
    const { data, error } = await supabase
      .from('outreach_touches')
      .select(PREVIEW_TOUCH_SELECT)
      .eq('id', touchId)
      .single()
    setPreviewLoadingId(null)
    if (error || !data) {
      setPreviewError('Could not load this email. Please try again.')
      return
    }
    setPreviewTouch(data as unknown as PreviewTouch)
  }

  // Mirror a saved edit back onto the open modal's own copy. Nothing in this
  // tab's row rendering shows subject/body, so the list itself needs no
  // update — unlike TodayTab, whose Review in Advance rows do.
  function handlePreviewSaved(updated: PreviewTouch) {
    setPreviewTouch(updated)
    showToast('Email content saved')
  }

  // Every click is additive: a new column appends as the lowest-priority
  // sort key, an already-active one cycles asc -> desc -> removed in place.
  // "Clear sort" (next to the result count) is the way back to no sort at
  // all. Mirrors LeadsTab's handleSort exactly.
  // Re-sorting from page 3 has to return to page 1: a reordered list read from
  // its middle is not the ordering the user just asked for.
  function handleSort(key: string) {
    setSorts((prev) => toggleMultiSort(prev, key))
    resetPage()
  }

  return (
    <>
      {openLeadId && (
        <LeadDrawer
          leadId={openLeadId}
          onClose={() => { setOpenLeadId(null); load() }}
        />
      )}
      {previewTouch && (
        <TouchPreviewModal
          key={previewTouch.id}
          touch={previewTouch}
          // Same rule the row-level Approve button uses: an already-approved
          // touch (draft_confirmed_at set) is waiting on the cron, and
          // confirm-scheduled-touch v11 would reject a second call anyway.
          canApprove={!previewTouch.draft_confirmed_at}
          approveError={errors[previewTouch.id]}
          onApprove={confirm}
          onSaved={handlePreviewSaved}
          onClose={() => setPreviewTouch(null)}
        />
      )}
      {toast && <div style={styles.toast}>{toast}</div>}
      {previewError && <div style={styles.previewLoadError}>{previewError}</div>}

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

      {/* The bare total that used to sit here now lives in the Pagination bar
          below the table, where it reads as a range against the whole set
          ("Showing 1 to 25 of 34 touches") rather than a count with no
          relationship to what is on screen. */}
      {!initialLoading && rows.length > 0 && !isMobile && sorts.length > 0 && (
        <div style={{ ...styles.resultRow, justifyContent: 'flex-end' }}>
          <button
            type="button"
            style={styles.clearSortBtn}
            onClick={() => { setSorts([]); resetPage() }}
          >
            Clear sort{sorts.length > 1 ? ` (${sorts.length})` : ''}
          </button>
        </div>
      )}

      {initialLoading ? (
        // Desktop gets a shaped placeholder table so the header and column
        // rhythm are already in place when the real rows arrive. The mobile
        // card stack has no columns to hold still, so it keeps the text.
        isMobile ? (
          <p style={styles.loading}>Loading activity...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <SortableTableHeader columns={ACTIVITY_COLUMNS} sorts={sorts} onSort={handleSort} />
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} columns={ACTIVITY_COLUMNS.length} />
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : rows.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyHeading}>No activity yet</p>
          <p style={styles.emptyBody}>Enroll your first lead to get started.</p>
        </div>
      ) : isMobile ? (
        <div style={styles.cardStack}>
          <style>{`.ec-tap-card:active { background: ${t.background.tint1}; }`}</style>
          {pageRows.map((row) => {
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
            const canPreview = isScheduled && row.channel === 'email'
            const isPreviewLoading = previewLoadingId === row.id
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
                    {/* Same cluster as the desktop table. The mobile card has
                        no width pressure, but splitting the two would mean two
                        places to keep in step for no benefit. */}
                    {(row.delivered_at || row.opened_at || row.clicked_at) && (
                      <EngagementIcons
                        deliveredAt={row.delivered_at}
                        openedAt={row.opened_at}
                        clickedAt={row.clicked_at}
                      />
                    )}
                    {row.bounced_at && <span style={styles.bounced}>Bounced</span>}
                  </span>
                  <span style={styles.mono}>{formatPortalDateTime(row.sent_at ?? row.scheduled_for)}</span>
                </div>
                {canPreview && (
                  <div style={styles.mobileActions} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      style={{ ...styles.previewBtnMobile, opacity: isPreviewLoading ? 0.6 : 1 }}
                      disabled={isPreviewLoading}
                      onClick={() => openPreview(row.id)}
                    >
                      {isPreviewLoading ? 'Opening...' : 'Preview'}
                    </button>
                    {isApprovable && (
                      isConfirming ? (
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
                      )
                    )}
                  </div>
                )}
                {showsProgressLine && (
                  <TouchProgressLine
                    draftConfirmedAt={row.draft_confirmed_at}
                    scheduledFor={row.scheduled_for}
                    recipientTimezone={row.recipient_timezone}
                    // Same reason as the desktop table: the one-line version
                    // is nowrap and overflows a phone-width card.
                    layout="stacked"
                  />
                )}
                {rowError && <div style={styles.mobileCardError}>{rowError}</div>}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          {/* Measured live at a 1280px viewport: eight columns at the shared
              header's default 12px horizontal padding totalled 1098px against
              a ~992px content area, so the action column sat off-screen. The
              first fix trimmed the gutters to 8px, which brought the table to
              exactly 961px with nothing to spare.
              Re-measured 9 Aug 2026 when OPENED became ENGAGED. Comparing
              intrinsic widths of the old and new header sets over identical
              rows, ENGAGED costs 9px more than OPENED, which put the table
              9px over a budget that had no slack left. 6px gutters reclaim
              8 columns x 2 sides x 2px = 32px, landing at 938px with 23px
              spare. Measured alternatives, for the next person: ENGAGEMENT was
              36px over at 8px gutters and still 4px over at 6px, so the longer
              label genuinely does not fit; SIGNALS and OPENS both fit with
              about 30px spare if this ever needs another few pixels.
              6px matches what LeadsTab already uses. Scoped to this table by
              class so EnquiriesTab keeps the shared 12px default. */}
          <style>{`
            .ec-activity-table th { padding-left: 6px !important; padding-right: 6px !important; }
            .ec-activity-table td { padding-left: 6px !important; padding-right: 6px !important; }
          `}</style>
          <table className="ec-activity-table" style={styles.table}>
            <thead>
              <SortableTableHeader columns={ACTIVITY_COLUMNS} sorts={sorts} onSort={handleSort} />
            </thead>
            <tbody>
              {pageRows.map((row) => {
                const tone = STATUS_TONES[row.status] ?? { bg: t.background.muted, fg: t.text.muted }
                const isScheduled = row.status === 'scheduled'
                const isApprovable = isScheduled && row.channel === 'email' && !row.draft_confirmed_at
                // Only while still pending — once status flips to 'sent'
                // the status badge already says so, and repeating the
                // progress line under every completed row read as clutter.
                const showsProgressLine = isScheduled && row.channel === 'email' && !!row.draft_confirmed_at
                const isConfirming = confirming === row.id
                // Any scheduled email touch can be previewed, approved or not.
                const canPreview = isScheduled && row.channel === 'email'
                const isPreviewLoading = previewLoadingId === row.id
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
                          {formatPortalDateTime(row.sent_at ?? row.scheduled_for)}
                        </span>
                      </td>
                      <td style={{ ...styles.td, ...styles.tdLead }}>
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
                      <td style={{ ...styles.td, ...styles.tdStatus }}>
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
                        {/* Only the approved variant gets the fade. Both of
                            its lines are nowrap and the scheduled one can
                            still outrun a narrow Status column; "Awaiting
                            approval" below is two short words and never
                            needs it. */}
                        {/* maxWidth 190 is measured, not guessed: at a 1280px
                            viewport the table wrapper is 961px, and 190 is the
                            widest cap that brings the table to exactly 961
                            with zero horizontal scroll. 200 left 6px over. */}
                        {showsProgressLine && (
                          <FadeOverflow style={{ ...styles.scheduledMeta, maxWidth: 190 }}>
                            <TouchProgressLine
                              draftConfirmedAt={row.draft_confirmed_at}
                              scheduledFor={row.scheduled_for}
                              recipientTimezone={row.recipient_timezone}
                              layout="stacked"
                            />
                          </FadeOverflow>
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
                        <EngagementIcons
                          deliveredAt={row.delivered_at}
                          openedAt={row.opened_at}
                          clickedAt={row.clicked_at}
                        />
                      </td>
                      <td style={styles.td}>
                        {row.bounced_at && <span style={styles.bounced}>Bounced</span>}
                      </td>
                      <td style={{ ...styles.td, ...styles.tdAction }} onClick={(e) => e.stopPropagation()}>
                        <div style={styles.actionCell}>
                          {/* Offered on approved rows too, not just
                              approvable ones — reading what's about to go out
                              is useful right up until it sends, and TodayTab's
                              Scheduled section behaves the same way. */}
                          {canPreview && (
                            <button
                              type="button"
                              style={{ ...styles.previewBtn, opacity: isPreviewLoading ? 0.6 : 1 }}
                              disabled={isPreviewLoading}
                              onClick={() => openPreview(row.id)}
                            >
                              {isPreviewLoading ? 'Opening...' : 'Preview'}
                            </button>
                          )}
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
                        </div>
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

      {/* Pinned to the viewport bottom so paging a 174-row feed does not mean
          scrolling to the end of the table first. Guarded on a non-empty
          result: with no rows there is nothing to page and the empty state
          should own the screen. */}
      {!initialLoading && sorted.length > 0 && (
        <StickyBar>
          <Pagination
            totalItems={sorted.length}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={goToPage}
            onPageSizeChange={changePageSize}
            pageStart={pageStart}
            pageEnd={pageEnd}
            itemLabel={sorted.length === 1 ? 'touch' : 'touches'}
          />
        </StickyBar>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === 'email') return <Mail size={14} color={t.text.muted} />
  return <Linkedin size={14} color={t.text.muted} />
}

// Delivered, opened and clicked in one cell. Each icon appears only once its
// event has actually been received, so the cluster reads left to right as how
// far down the funnel this email got: delivered, then opened, then clicked.
// The exact time lives in the title attribute rather than on screen, which is
// what buys back the width three date columns would have cost.
//
// tokens.green rather than a t.* role: `t` has no text/icon success token.
// The nearest is t.border.success, which resolves to the identical #1B6B4A
// but means "border", and the Eye here has always used tokens.green. Picking
// a different source for one icon in a cluster of three would collide the two
// token systems inside a single cell for no visual difference.
function EngagementIcons({
  deliveredAt,
  openedAt,
  clickedAt,
}: {
  deliveredAt: string | null
  openedAt: string | null
  clickedAt: string | null
}) {
  if (!deliveredAt && !openedAt && !clickedAt) {
    return <span style={styles.engagementEmpty}>-</span>
  }
  return (
    <span style={styles.engagementCell}>
      {deliveredAt && (
        <MailCheck size={14} color={t.text.muted} aria-label="Delivered">
          <title>{`Delivered ${formatPortalDate(deliveredAt)}`}</title>
        </MailCheck>
      )}
      {openedAt && (
        <Eye size={14} color={tokens.green} aria-label="Opened">
          <title>{`Opened ${formatPortalDate(openedAt)}`}</title>
        </Eye>
      )}
      {clickedAt && (
        <MousePointerClick size={14} color={tokens.green} aria-label="Clicked">
          <title>{`Clicked ${formatPortalDate(clickedAt)}`}</title>
        </MousePointerClick>
      )}
    </span>
  )
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
  // 860 is a floor, not a target: below it the wrapper scrolls rather than
  // crushing the action column. It must stay *under* the real content area at
  // 1280px (~992px) — an earlier 960 was itself forcing the overflow it was
  // meant to prevent, since the table could never shrink to fit.
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 860 },
  resultRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
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
  // Pinned so a long status can never squeeze the lead name to nothing.
  tdLead: { minWidth: 140 },
  // The flexible column: everything else is pinned or sized to its content,
  // so Status absorbs whatever width is left over.
  tdStatus: { width: '100%', minWidth: 180 },
  // Pinned so Preview + Approve always fit side by side on one line and stay
  // inside the viewport at 1280px instead of being pushed off the right edge.
  tdAction: { minWidth: 180 },
  mono: { fontFamily: mono, fontSize: 12, color: t.text.muted },
  engagementCell: { display: 'inline-flex', alignItems: 'center', gap: 6 },
  engagementEmpty: { fontFamily: mono, fontSize: 12, color: t.text.muted },
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
  actionCell: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  // Ghost treatment, matching TodayTab's row-level Preview button — the
  // filled/primary look stays reserved for Approve, the one action that
  // changes state.
  previewBtn: {
    background: 'none',
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    padding: '5px 10px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  previewLoadError: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.ruby,
    marginBottom: 12,
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
  mobileActions: { display: 'flex', gap: 8 },
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
    flex: 1,
  },
  previewBtnMobile: {
    background: 'none',
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '8px 14px',
    minHeight: 44,
    cursor: 'pointer',
    flex: 1,
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
