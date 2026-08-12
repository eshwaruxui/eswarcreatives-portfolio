// Leads tab: search, filter chips, sortable table (desktop), card stack (mobile).
import { useEffect, useState } from 'react'
import { Upload, UserPlus, Linkedin, Search, ArrowUpDown, Check } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useSearchParams } from 'react-router'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { mono } from '../ui'
import { formatPortalDate } from '../../utils/formatDate'
import { formatScheduledFor, isAwaitingApproval, AWAITING_APPROVAL_TITLE } from '../../utils/scheduledFor'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { useReloadableList } from '../../hooks/useReloadableList'
import { SortableTableHeader, toggleMultiSort, type SortableColumn, type SortSpec } from '../../components/shared/SortableTableHeader'
import { Skeleton } from '../../components/shared/Skeleton'
import { Pagination } from '../../components/shared/Pagination'
import { StickyBar } from '../../components/shared/StickyBar'
import { usePagination } from '../../hooks/usePagination'
import { SegmentSelect, SEGMENT_LABELS } from '../../components/shared/SegmentSelect'
import { AddLeadModal } from './AddLeadModal'
import { CsvImportModal } from './CsvImportModal'
import { LeadDrawer } from '../../components/LeadDrawer'

type LeadRow = {
  id: string
  first_name: string
  last_name: string | null
  company: string
  email: string | null
  linkedin_url: string | null
  role_title: string | null
  notes: string | null
  segment: string
  status: string
  source: string | null
  linkedin_status: string
  specific_observation: string | null
  icp_score: number | null
  created_at: string
  last_touch_at?: string | null
  next_touch_at?: string | null
  // Null means the next touch is still an enrollment placeholder, so
  // next_touch_at is a planned day and not a send time. See utils/scheduledFor.
  next_touch_draft_confirmed_at?: string | null
  enrolled?: boolean
}

// Mobile "Sort" bottom sheet options — Name/Company/Status/Date Added per spec.
// Status wasn't a sortable desktop column before; added here (and to
// applySorting below) since a bottom sheet needs a fixed, meaningful set.
// Mobile stays single-column (no shift-click gesture on touch), so picking
// an option here always replaces the sort outright.
const SORT_SHEET_OPTIONS: { key: string; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'company', label: 'Company' },
  { key: 'status', label: 'Status' },
  { key: 'created_at', label: 'Date Added' },
]

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

function initials(first: string, last: string | null) {
  return ((first[0] ?? '') + (last?.[0] ?? '')).toUpperCase()
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  new:           { bg: t.background.muted, fg: t.text.tertiary },
  active:        { bg: tokens.tealLight, fg: tokens.primary },
  replied:       { bg: tokens.greenLight, fg: tokens.green },
  meeting_booked:{ bg: tokens.goldLight, fg: tokens.goldDark },
  converted:     { bg: tokens.greenLight, fg: tokens.green },
  not_interested:{ bg: t.background.muted, fg: t.text.tertiary },
  unsubscribed:  { bg: tokens.rubyLight, fg: tokens.ruby },
  bounced:       { bg: tokens.rubyLight, fg: tokens.ruby },
  archived:      { bg: t.background.muted, fg: t.text.muted },
}

function StatusChip({ status }: { status: string }) {
  const tone = STATUS_COLORS[status] ?? { bg: t.background.muted, fg: t.text.tertiary }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      background: tone.bg,
      color: tone.fg,
      fontFamily: fonts.body,
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  )
}

// List-view ICP indicator. Same tier cutoffs as ScoreRing (75/50), unified
// across the drawer, modal, and this dense table row.
function icpDotColor(score: number | null): string {
  if (score == null) return 'transparent'
  if (score >= 75) return tokens.accent
  if (score >= 50) return tokens.gold
  return t.text.muted
}

function IcpIndicator({ score }: { score: number | null }) {
  if (score == null) {
    return (
      <span style={styles.icpCell} title="Not scored yet">
        <span style={styles.icpDotOutline} />
      </span>
    )
  }
  return (
    <span style={styles.icpCell}>
      <span style={{ ...styles.icpDot, background: icpDotColor(score) }} />
      <span style={styles.icpScoreText}>{score}</span>
    </span>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      style={{
        ...styles.filterChip,
        ...(active ? styles.filterChipActive : {}),
      }}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function compareByKey(a: LeadRow, b: LeadRow, key: string, dir: 'asc' | 'desc'): number {
  // ICP score: nulls always sort last, regardless of direction.
  if (key === 'icp_score') {
    const av = a.icp_score
    const bv = b.icp_score
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    return dir === 'asc' ? av - bv : bv - av
  }

  let va: string | null | undefined
  let vb: string | null | undefined
  if (key === 'name') {
    va = (a.last_name ?? a.first_name).toLowerCase()
    vb = (b.last_name ?? b.first_name).toLowerCase()
  } else if (key === 'company') {
    va = a.company.toLowerCase()
    vb = b.company.toLowerCase()
  } else if (key === 'last_touch') {
    va = a.last_touch_at ?? ''
    vb = b.last_touch_at ?? ''
  } else if (key === 'next_touch') {
    va = a.next_touch_at ?? ''
    vb = b.next_touch_at ?? ''
  } else if (key === 'created_at') {
    va = a.created_at
    vb = b.created_at
  } else if (key === 'status') {
    va = a.status
    vb = b.status
  } else if (key === 'segment') {
    // Sort by the displayed label, not the raw db value — matches what the
    // user is actually looking at in the Segment column.
    va = (SEGMENT_LABELS[a.segment] ?? a.segment).toLowerCase()
    vb = (SEGMENT_LABELS[b.segment] ?? b.segment).toLowerCase()
  }
  if (!va && !vb) return 0
  if (!va) return dir === 'asc' ? 1 : -1
  if (!vb) return dir === 'asc' ? -1 : 1
  return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
}

// Multi-column: earlier entries in `sorts` take priority; ties fall through
// to the next sort key, in order.
function applySorting(leads: LeadRow[], sorts: SortSpec[]): LeadRow[] {
  if (sorts.length === 0) return leads
  return [...leads].sort((a, b) => {
    for (const { key, dir } of sorts) {
      const cmp = compareByKey(a, b, key, dir)
      if (cmp !== 0) return cmp
    }
    return 0
  })
}

const LEAD_COLUMNS: SortableColumn[] = [
  { key: 'name', label: 'LEAD', sortable: true },
  { key: 'company', label: 'COMPANY', sortable: true },
  { key: 'segment', label: 'SEGMENT', sortable: true },
  { key: 'status', label: 'STATUS', sortable: true },
  { key: 'icp_score', label: 'ICP', sortable: true, hideOnMobile: true },
  { key: 'linkedin', label: 'LINKEDIN', sortable: false, hideOnMobile: true },
  { key: 'last_touch', label: 'LAST TOUCH', sortable: true },
  { key: 'next_touch', label: 'NEXT TOUCH', sortable: true },
  { key: 'created_at', label: 'CREATED', sortable: true, hideOnMobile: true },
  { key: 'action', label: '', sortable: false },
]

export function LeadsTab() {
  const { isMobile } = useBreakpoint()
  const [leads, setLeads] = useState<LeadRow[]>([])
  const { initialLoading, refreshing, start: startLoad, finish: finishLoad } = useReloadableList()
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterEnrollment, setFilterEnrollment] = useState<'all' | 'enrolled' | 'not_enrolled'>('all')
  const [filterSource, setFilterSource] = useState<string[]>([])
  const [filterMissingObs, setFilterMissingObs] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [sorts, setSorts] = useState<SortSpec[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showCsv, setShowCsv] = useState(false)
  const [showSortSheet, setShowSortSheet] = useState(false)
  const [openLeadId, setOpenLeadId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  // ?addLead=1 URL param opens the modal
  useEffect(() => {
    if (searchParams.get('addLead') === '1') {
      setShowAdd(true)
      setSearchParams((prev) => {
        prev.delete('addLead')
        return prev
      }, { replace: true })
    }
  }, [])

  // ?leadId=<id> opens that lead's drawer directly. Used by the Enquiries
  // tab's "View lead" link after a convert-to-lead action.
  useEffect(() => {
    const leadId = searchParams.get('leadId')
    if (leadId) {
      setOpenLeadId(leadId)
      setSearchParams((prev) => {
        prev.delete('leadId')
        return prev
      }, { replace: true })
    }
  }, [])

  async function load() {
    startLoad()
    setError(null)
    try {
      let q = supabase
        .from('leads')
        .select('id, first_name, last_name, company, email, linkedin_url, role_title, notes, segment, status, source, linkedin_status, specific_observation, icp_score, created_at')
        .order('created_at', { ascending: false })

      if (filterStatus.length > 0) q = q.in('status', filterStatus)
      if (filterMissingObs) {
        q = q
          .or('specific_observation.is.null,specific_observation.eq.')
          .not('status', 'in', '(converted,archived,unsubscribed)')
      }

      const { data, error: err } = await q
      if (err) throw err

      const ids = (data ?? []).map((l) => l.id)
      let lastMap: Record<string, string> = {}
      let nextMap: Record<string, { at: string; draftConfirmedAt: string | null }> = {}
      let enrolledSet = new Set<string>()

      if (ids.length > 0) {
        const today = new Date().toISOString().slice(0, 10)
        const [lastRes, nextRes, enrollRes] = await Promise.all([
          supabase
            .from('outreach_touches')
            .select('lead_id, sent_at')
            .in('lead_id', ids)
            .eq('status', 'sent')
            .order('sent_at', { ascending: false }),
          supabase
            .from('outreach_touches')
            // draft_confirmed_at comes along because scheduled_for is only a
            // real time once it is set; without it this column cannot tell an
            // approved send from an enrollment placeholder.
            .select('lead_id, scheduled_for, draft_confirmed_at')
            .in('lead_id', ids)
            .eq('status', 'scheduled')
            .gte('scheduled_for', today)
            .order('scheduled_for', { ascending: true }),
          supabase
            .from('lead_enrollments')
            .select('lead_id')
            .in('lead_id', ids)
            .not('status', 'eq', 'completed'),
        ])
        for (const t of (lastRes.data ?? [])) {
          if (!lastMap[t.lead_id]) lastMap[t.lead_id] = t.sent_at
        }
        for (const t of (nextRes.data ?? [])) {
          if (!nextMap[t.lead_id]) {
            nextMap[t.lead_id] = { at: t.scheduled_for, draftConfirmedAt: t.draft_confirmed_at }
          }
        }
        for (const e of (enrollRes.data ?? [])) {
          enrolledSet.add(e.lead_id)
        }
      }

      setLeads((data ?? []).map((l) => ({
        ...l,
        last_touch_at: lastMap[l.id] ?? null,
        next_touch_at: nextMap[l.id]?.at ?? null,
        next_touch_draft_confirmed_at: nextMap[l.id]?.draftConfirmedAt ?? null,
        enrolled: enrolledSet.has(l.id),
      })))
    } catch {
      setError('Could not load leads. Refresh to try again.')
    } finally {
      finishLoad()
    }
  }

  useEffect(() => { load() }, [filterStatus, filterMissingObs])

  function handleDrawerClose() {
    setOpenLeadId(null)
    load()
  }

  async function handleSegmentChange(leadId: string, segment: string) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, segment } : l)))
    await supabase.from('leads').update({ segment }).eq('id', leadId)
  }

  // Every click is additive: a new column appends as the lowest-priority sort
  // key, an already-active one cycles asc -> desc -> removed in place. No
  // modifier key — "Clear sort" (rendered next to the result count) is the
  // way back to no sort at all.
  // Back to page 1 on a sort change: a reordered list read from its middle is
  // not the ordering the user just asked for.
  function handleSort(key: string) {
    setSorts((prev) => toggleMultiSort(prev, key))
    resetPage()
  }

  function toggleStatusFilter(val: string) {
    setFilterStatus((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val])
  }

  function toggleSourceFilter(val: string) {
    setFilterSource((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val])
  }

  const q = debouncedSearch.toLowerCase()
  const filtered = leads.filter((lead) => {
    if (q) {
      const text = [
        lead.first_name, lead.last_name, lead.company, lead.email,
        lead.role_title, lead.linkedin_url, lead.notes,
      ].join(' ').toLowerCase()
      if (!text.includes(q)) return false
    }
    if (filterEnrollment === 'enrolled' && !lead.enrolled) return false
    if (filterEnrollment === 'not_enrolled' && lead.enrolled) return false
    if (filterSource.length > 0 && !filterSource.includes(lead.source ?? '')) return false
    return true
  })

  // Sort the whole filtered set first, then slice the page out of it. Slicing
  // before sorting would order only the visible window.
  const sorted = applySorting(filtered, sorts)
  const {
    currentPage, pageSize, paginatedSlice, goToPage, changePageSize,
    reset: resetPage, pageStart, pageEnd,
  } = usePagination(sorted.length, 25)
  const pageLeads = paginatedSlice(sorted)

  // Any narrowing of the result set returns to page 1. Covers the four
  // client-side filters and the search box as well as the two that refetch,
  // since all of them change how many rows there are to page through and a
  // page 4 that no longer exists would otherwise render empty. Declared here
  // rather than beside the other effects because it needs resetPage, which
  // usePagination above only just returned.
  useEffect(() => {
    resetPage()
  }, [debouncedSearch, filterStatus, filterEnrollment, filterSource, filterMissingObs, resetPage])

  return (
    <>
      {showAdd && (
        <AddLeadModal
          onClose={() => setShowAdd(false)}
          onSaved={(id) => { setShowAdd(false); setOpenLeadId(id); load() }}
        />
      )}
      {showCsv && (
        <CsvImportModal
          onClose={() => setShowCsv(false)}
          onImported={() => { setShowCsv(false); load() }}
        />
      )}
      {openLeadId && (
        <LeadDrawer
          leadId={openLeadId}
          onClose={handleDrawerClose}
          onDeleted={() => {
            setLeads((prev) => prev.filter((l) => l.id !== openLeadId))
            setOpenLeadId(null)
            setToast('Lead deleted')
            setTimeout(() => setToast(null), 2500)
          }}
        />
      )}
      {toast && <div style={styles.toast}>{toast}</div>}

      {/* Search */}
      <div style={styles.searchRow}>
        <div style={styles.searchWrap}>
          <Search size={15} color={t.text.muted} style={{ flexShrink: 0 }} />
          <input
            style={styles.searchInput}
            type="search"
            placeholder="Search by name, company, email, role, or LinkedIn URL..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={styles.actions}>
          <button type="button" style={styles.outlineBtn} onClick={() => setShowCsv(true)}>
            <Upload size={14} />
            Import CSV
          </button>
          <button type="button" style={styles.primaryBtn} onClick={() => setShowAdd(true)}>
            <UserPlus size={14} />
            Add lead
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div style={styles.chipGroups}>
        <div style={styles.chipGroup}>
          {[
            { val: 'active', label: 'Active' },
            { val: 'unsubscribed', label: 'Suppressed' },
            { val: 'converted', label: 'Converted' },
          ].map(({ val, label }) => (
            <FilterChip
              key={val}
              label={label}
              active={filterStatus.includes(val)}
              onClick={() => toggleStatusFilter(val)}
            />
          ))}
        </div>
        <div style={styles.chipGroup}>
          <FilterChip label="In Sequence" active={filterEnrollment === 'enrolled'} onClick={() => setFilterEnrollment((p) => p === 'enrolled' ? 'all' : 'enrolled')} />
          <FilterChip label="Not Enrolled" active={filterEnrollment === 'not_enrolled'} onClick={() => setFilterEnrollment((p) => p === 'not_enrolled' ? 'all' : 'not_enrolled')} />
        </div>
        <div style={styles.chipGroup}>
          {['linkedin', 'screenshot', 'manual'].map((src) => (
            <FilterChip
              key={src}
              label={src.charAt(0).toUpperCase() + src.slice(1)}
              active={filterSource.includes(src)}
              onClick={() => toggleSourceFilter(src)}
            />
          ))}
        </div>
        <label style={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={filterMissingObs}
            onChange={(e) => setFilterMissingObs(e.target.checked)}
          />
          Missing observation
        </label>
      </div>

      {/* Sort controls only. The count moved into the Pagination bar below the
          list, where it reads as a range against the whole set. */}
      {!initialLoading && (
        <div style={{ ...styles.resultRow, justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {!isMobile && sorts.length > 0 && (
              <button
                type="button"
                style={styles.clearSortBtn}
                onClick={() => { setSorts([]); resetPage() }}
              >
                Clear sort{sorts.length > 1 ? ` (${sorts.length})` : ''}
              </button>
            )}
            {isMobile && (
              <button type="button" style={styles.sortSheetBtn} onClick={() => setShowSortSheet(true)}>
                <ArrowUpDown size={13} />
                Sort
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile sort bottom sheet */}
      {showSortSheet && (
        <>
          <div style={styles.sheetScrim} onClick={() => setShowSortSheet(false)} />
          <div style={styles.sheet} role="dialog" aria-label="Sort leads">
            <div style={styles.sheetHandle} />
            {SORT_SHEET_OPTIONS.map((opt) => {
              const active = sorts.length > 0 && sorts[0].key === opt.key
              return (
                <button
                  key={opt.key}
                  type="button"
                  style={styles.sheetRow}
                  onClick={() => {
                    setSorts([{ key: opt.key, dir: 'asc' }])
                    resetPage()
                    setShowSortSheet(false)
                  }}
                >
                  <span style={{ color: active ? tokens.primary : t.text.primary, fontWeight: active ? 600 : 400 }}>
                    {opt.label}
                  </span>
                  {active && <Check size={16} color={tokens.primary} />}
                </button>
              )
            })}
          </div>
        </>
      )}

      {error && <div style={styles.errorBanner}>{error}</div>}

      {initialLoading ? (
        isMobile ? (
          <div style={styles.cardStack}>
            {Array.from({ length: 6 }).map((_, i) => <MobileCardSkeleton key={i} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <SortableTableHeader columns={LEAD_COLUMNS} sorts={sorts} onSort={handleSort} />
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => <LeadRowSkeleton key={i} />)}
              </tbody>
            </table>
          </div>
        )
      ) : sorted.length === 0 ? (
        <div style={styles.emptyState}>
          {q || filterStatus.length > 0 || filterEnrollment !== 'all' || filterSource.length > 0 ? (
            <>
              <Search size={28} color={t.text.muted} />
              <p style={styles.emptyHeading}>No leads found</p>
              <p style={styles.emptyBody}>Try a different name, company, or adjust your filters.</p>
            </>
          ) : (
            <>
              <p style={styles.emptyHeading}>No leads yet</p>
              <p style={styles.emptyBody}>Add your first lead or import from CSV to get started.</p>
            </>
          )}
        </div>
      ) : isMobile ? (
        <div style={{ ...styles.cardStack, ...styles.fadeContent, opacity: refreshing ? 0.6 : 1 }}>
          <style>{`
            @keyframes ecFadeIn { from { opacity: 0; } to { opacity: 1; } }
            .ec-tap-card { background: ${tokens.surface}; transition: background ${motionTokens.durationFast} ${motionTokens.easeDefault}; }
            .ec-tap-card:active { background: ${t.background.tint1}; }
          `}</style>
          {pageLeads.map((lead) => (
            <MobileCard
              key={lead.id}
              lead={lead}
              onOpen={() => setOpenLeadId(lead.id)}
              onSegmentChange={(v) => handleSegmentChange(lead.id, v)}
            />
          ))}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', ...styles.fadeContent, opacity: refreshing ? 0.6 : 1 }}>
          {/* Ten columns at the shared header's default 12px gutters totalled
              1167px against a 961px content area at 1280px, so the table
              scrolled sideways by 206px. Gutters, the lead and company text
              caps below, and this segment cap together bring it to exactly
              961 with zero overflow.
              6px rather than 8px is measured, not chosen: at 8px the table
              still ran 9px over, because once the cells are capped the column
              headers ("LAST TOUCH", "NEXT TOUCH") become the binding floor
              and no further text trimming helps. Verified at every page size
              (10, 25, 50, 100), since intrinsic width grows with row count.
              Scoped by class so ActivityTab (its own 8px) and EnquiriesTab
              (the shared 12px) are both untouched.
              The segment cap lives here rather than in SegmentSelect because
              that component is shared with LeadDrawer, where the dropdown has
              room to render its longest label in full. */}
          <style>{`
            @keyframes ecFadeIn { from { opacity: 0; } to { opacity: 1; } }
            .ec-leads-table th { padding-left: 6px !important; padding-right: 6px !important; }
            .ec-leads-table td { padding-left: 6px !important; padding-right: 6px !important; }
            .ec-leads-table td select { max-width: 114px; }
          `}</style>
          <table className="ec-leads-table" style={styles.table}>
            <thead>
              <SortableTableHeader columns={LEAD_COLUMNS} sorts={sorts} onSort={handleSort} />
            </thead>
            <tbody>
              {pageLeads.map((lead) => (
                <tr key={lead.id} style={styles.tr} onClick={() => setOpenLeadId(lead.id)}>
                  <td style={styles.td}>
                    <div style={styles.leadCell}>
                      <div style={styles.avatar}>{initials(lead.first_name, lead.last_name)}</div>
                      <div style={styles.leadText}>
                        <div
                          style={{ ...styles.leadName, ...styles.ellipsis }}
                          title={`${lead.first_name} ${lead.last_name ?? ''}`.trim()}
                        >
                          {lead.first_name} {lead.last_name ?? ''}
                        </div>
                        <div style={{ ...styles.leadCompany, ...styles.ellipsis }} title={lead.company}>
                          {lead.company}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.monoCell, ...styles.companyCellText }} title={lead.company}>
                      {lead.company}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <SegmentSelect value={lead.segment} onChange={(v) => handleSegmentChange(lead.id, v)} />
                  </td>
                  <td style={styles.td}><StatusChip status={lead.status} /></td>
                  <td style={styles.td}><IcpIndicator score={lead.icp_score} /></td>
                  <td style={styles.td}>
                    <LinkedInStatusIcon status={lead.linkedin_status} />
                  </td>
                  <td style={styles.td}>
                    <span style={styles.monoCell}>
                      {lead.last_touch_at ? formatPortalDate(lead.last_touch_at) : '-'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {/* The label itself would widen this column (see the Dense
                        Table Width Pattern), so an unapproved row drops the
                        clock time and carries the explanation in the title. */}
                    <span
                      style={styles.monoCell}
                      title={isAwaitingApproval(lead.next_touch_draft_confirmed_at) && lead.next_touch_at
                        ? AWAITING_APPROVAL_TITLE
                        : undefined}
                    >
                      {formatScheduledFor(lead.next_touch_at, lead.next_touch_draft_confirmed_at)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.monoCell}>
                      {formatPortalDate(lead.created_at)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      type="button"
                      style={styles.openBtn}
                      onClick={(e) => { e.stopPropagation(); setOpenLeadId(lead.id) }}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pinned to the viewport bottom, so paging 267 leads does not require
          scrolling past every row first. Hidden on an empty result, where the
          empty state should own the screen. */}
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
            itemLabel={sorted.length === 1 ? 'lead' : 'leads'}
          />
        </StickyBar>
      )}
    </>
  )
}

function LinkedInStatusIcon({ status }: { status: string }) {
  const colors: Record<string, string> = {
    none: t.text.disabled,
    request_sent: tokens.goldDark,
    connected: tokens.green,
    ignored: tokens.ruby,
  }
  return <Linkedin size={15} color={colors[status] ?? t.text.muted} />
}

function MobileCard({
  lead,
  onOpen,
  onSegmentChange,
}: {
  lead: LeadRow
  onOpen: () => void
  onSegmentChange: (segment: string) => void
}) {
  return (
    <div className="ec-tap-card" style={styles.mobileCard} onClick={onOpen}>
      <div style={styles.mobileCardHead}>
        <div style={styles.avatar}>{initials(lead.first_name, lead.last_name)}</div>
        <div style={{ flex: 1 }}>
          <div style={styles.leadName}>{lead.first_name} {lead.last_name ?? ''}</div>
          <div style={styles.leadCompany}>{lead.company}</div>
        </div>
        <StatusChip status={lead.status} />
      </div>
      <div style={styles.mobileCardFoot}>
        <div style={styles.mobileCardFootLeft}>
          <SegmentSelect value={lead.segment} onChange={onSegmentChange} />
          <IcpIndicator score={lead.icp_score} />
        </div>
        {/* Same rule as the desktop cell. The foot is a nowrap flex row
            sharing its width with the segment select and the ICP dot, so the
            label would squeeze them; dropping the clock time is the part that
            matters, and the planned day on its own is not misleading. */}
        {lead.next_touch_at && (
          <span
            style={styles.mobileNextTouch}
            title={isAwaitingApproval(lead.next_touch_draft_confirmed_at) ? AWAITING_APPROVAL_TITLE : undefined}
          >
            Next: {formatScheduledFor(lead.next_touch_at, lead.next_touch_draft_confirmed_at)}
          </span>
        )}
      </div>
    </div>
  )
}

// First-load placeholders only (see useReloadableList) - a background reload
// after closing the drawer keeps real rows on screen instead of swapping to
// these, which is what actually fixes the scroll-reset bug.
function LeadRowSkeleton() {
  return (
    <tr style={styles.tr}>
      <td style={styles.td}>
        <div style={styles.leadCell}>
          <Skeleton width={32} height={32} borderRadius={999} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Skeleton width={110} height={13} />
            <Skeleton width={80} height={11} />
          </div>
        </div>
      </td>
      <td style={styles.td}><Skeleton width={90} height={12} /></td>
      <td style={styles.td}><Skeleton width={70} height={20} borderRadius={999} /></td>
      <td style={styles.td}><Skeleton width={60} height={20} borderRadius={999} /></td>
      <td style={styles.td}><Skeleton width={40} height={12} /></td>
      <td style={styles.td}><Skeleton width={15} height={15} borderRadius={999} /></td>
      <td style={styles.td}><Skeleton width={60} height={12} /></td>
      <td style={styles.td}><Skeleton width={60} height={12} /></td>
      <td style={styles.td}><Skeleton width={60} height={12} /></td>
      <td style={styles.td}><Skeleton width={50} height={26} /></td>
    </tr>
  )
}

function MobileCardSkeleton() {
  return (
    <div style={styles.mobileCard}>
      <div style={styles.mobileCardHead}>
        <Skeleton width={32} height={32} borderRadius={999} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Skeleton width={130} height={13} />
          <Skeleton width={95} height={11} />
        </div>
        <Skeleton width={60} height={20} borderRadius={999} />
      </div>
      <div style={styles.mobileCardFoot}>
        <Skeleton width={80} height={18} borderRadius={999} />
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  searchWrap: {
    flex: 1,
    minWidth: 200,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '8px 12px',
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: 'transparent',
    border: 'none',
    outline: 'none',
  },
  chipGroups: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 10,
  },
  chipGroup: { display: 'flex', gap: 6, alignItems: 'center' },
  filterChip: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 500,
    color: t.text.secondary,
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 999,
    padding: '4px 12px',
    cursor: 'pointer',
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  filterChipActive: {
    background: tokens.tealLight,
    color: tokens.primary,
    border: `1px solid ${tokens.accent}`,
    fontWeight: 600,
  },
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
  sortSheetBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 12px',
    minHeight: 32,
    cursor: 'pointer',
  },
  // Mobile sort bottom sheet
  sheetScrim: {
    position: 'fixed',
    inset: 0,
    zIndex: 299,
    background: t.background.scrim,
  },
  sheet: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 300,
    width: '100vw',
    background: tokens.surface,
    borderRadius: '16px 16px 0 0',
    padding: '8px 8px calc(8px + env(safe-area-inset-bottom, 0px))',
    boxSizing: 'border-box',
    boxShadow: '0 -12px 32px rgba(2, 76, 79, 0.14)',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 999,
    background: t.border.medium,
    margin: '4px auto 8px',
  },
  sheetRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    height: 48,
    padding: '0 16px',
    background: 'none',
    border: 'none',
    borderRadius: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'left',
  },
  actions: { display: 'flex', gap: 8 },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    cursor: 'pointer',
  },
  outlineBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.surface,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 13,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '7px 12px',
    cursor: 'pointer',
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
    cursor: 'pointer',
  },
  errorBanner: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 12,
  },
  fadeContent: {
    animation: `ecFadeIn ${motionTokens.durationBase} ${motionTokens.easeEnter}`,
    transition: `opacity ${motionTokens.durationBase} ${motionTokens.easeDefault}`,
  },
  emptyState: { textAlign: 'center', padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 },
  emptyHeading: {
    fontFamily: fonts.heading,
    fontSize: 20,
    fontWeight: 600,
    color: t.text.primary,
    margin: '0 0 8px',
  },
  emptyBody: { fontFamily: fonts.body, fontSize: 14, color: t.text.secondary, margin: 0 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 860 },
  tr: {
    cursor: 'pointer',
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  td: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    padding: '12px',
    borderBottom: `1px solid ${t.border.subtle}`,
    verticalAlign: 'middle',
  },
  leadCell: { display: 'flex', alignItems: 'center', gap: 10 },
  // The lead column was the single widest cell at 235px, because the avatar
  // plus two nowrap text lines could grow without limit. Capping the text
  // block (not the cell: a max-width on a <td> is ignored under auto table
  // layout) is what actually holds the column down. 104 and the 86 below are
  // measured: the table starts overflowing again at 120 and 100.
  leadText: { minWidth: 0, maxWidth: 104 },
  ellipsis: {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  companyCellText: {
    display: 'block',
    maxWidth: 86,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: t.background.tint2,
    color: tokens.primary,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  leadName: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: t.text.primary,
    whiteSpace: 'nowrap',
  },
  leadCompany: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
    whiteSpace: 'nowrap',
  },
  monoCell: {
    fontFamily: mono,
    fontSize: 12,
    color: t.text.secondary,
  },
  icpCell: { display: 'inline-flex', alignItems: 'center', gap: 6 },
  icpDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  icpDotOutline: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    border: `1px solid ${t.border.medium}`,
    flexShrink: 0,
  },
  icpScoreText: {
    fontFamily: mono,
    fontSize: 12,
    color: t.text.secondary,
  },
  openBtn: {
    background: 'none',
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.primaryBrand,
    padding: '4px 10px',
    cursor: 'pointer',
  },
  cardStack: { display: 'flex', flexDirection: 'column', gap: 10 },
  // Resting background lives in the .ec-tap-card CSS class (see render) so the
  // :active tap-feedback rule isn't blocked by inline-style specificity.
  mobileCard: {
    border: `1px solid ${t.border.default}`,
    borderRadius: 10,
    padding: '14px 16px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  mobileCardHead: { display: 'flex', alignItems: 'center', gap: 10 },
  mobileCardFoot: { display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  mobileCardFootLeft: { display: 'flex', gap: 8, alignItems: 'center' },
  mobileNextTouch: {
    fontFamily: mono,
    fontSize: 11,
    color: t.text.muted,
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
