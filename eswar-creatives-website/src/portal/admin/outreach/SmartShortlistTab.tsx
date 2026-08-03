// Smart Shortlist tab: runs listing page (Fix 2). ICP configuration lives in
// Settings now (Fix 1); creating a run happens in NewShortlistModal (Fix 2/3);
// reviewing results happens in a SidePanel (Fix 2) instead of an inline section.
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { ChevronDown, ChevronUp, Sparkles, Archive, Trash2, Eye, ArchiveRestore } from 'lucide-react'
import { useNavigate } from 'react-router'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts } from '../../theme'
import { mono, EmptyState } from '../ui'
import { formatPortalDate } from '../../utils/formatDate'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { SidePanel } from '../SidePanel'
import { CandidateCard } from '../../components/shortlist/CandidateCard'
import { NewShortlistModal } from './NewShortlistModal'
import {
  VERTICAL_LABELS,
  CHANNEL_LABELS,
  runVolume,
  type Vertical,
  type ICPConfig,
  type ShortlistRun,
  type ShortlistCandidate,
} from '../../components/shortlist/types'

type HistoryCounts = Record<string, { screenshots: number; candidates: number; added: number }>

export function SmartShortlistTab() {
  const { isMobile } = useBreakpoint()
  const navigate = useNavigate()

  const [icpConfigs, setIcpConfigs] = useState<Record<Vertical, ICPConfig | null>>({
    design_systems: null,
    branding: null,
  })
  const [summaryVertical, setSummaryVertical] = useState<Vertical>('design_systems')

  const [historyRuns, setHistoryRuns] = useState<ShortlistRun[]>([])
  const [historyCounts, setHistoryCounts] = useState<HistoryCounts>({})
  const [showArchived, setShowArchived] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const [showNewShortlist, setShowNewShortlist] = useState(false)
  const [reviewRun, setReviewRun] = useState<ShortlistRun | null>(null)
  const [reviewCandidates, setReviewCandidates] = useState<ShortlistCandidate[]>([])
  const [reviewOpen, setReviewOpen] = useState(false)

  async function loadIcpConfigs() {
    const { data } = await supabase.from('icp_configs').select('*')
    const map: Record<Vertical, ICPConfig | null> = { design_systems: null, branding: null }
    for (const row of (data ?? []) as ICPConfig[]) map[row.vertical] = row
    setIcpConfigs(map)
  }

  async function loadHistory() {
    const [{ data: runs }, { data: shots }, { data: cands }] = await Promise.all([
      supabase.from('shortlist_runs').select('*').order('created_at', { ascending: false }),
      supabase.from('shortlist_run_screenshots').select('run_id'),
      supabase.from('shortlist_candidates').select('run_id, decision'),
    ])
    setHistoryRuns((runs ?? []) as ShortlistRun[])
    const counts: HistoryCounts = {}
    for (const s of shots ?? []) {
      counts[s.run_id] = counts[s.run_id] ?? { screenshots: 0, candidates: 0, added: 0 }
      counts[s.run_id].screenshots++
    }
    for (const c of cands ?? []) {
      counts[c.run_id] = counts[c.run_id] ?? { screenshots: 0, candidates: 0, added: 0 }
      counts[c.run_id].candidates++
      if (c.decision === 'added') counts[c.run_id].added++
    }
    setHistoryCounts(counts)
  }

  useEffect(() => { loadIcpConfigs(); loadHistory() }, [])

  async function loadCandidatesForRun(runId: string) {
    const { data } = await supabase
      .from('shortlist_candidates')
      .select('*')
      .eq('run_id', runId)
      .order('icp_score', { ascending: false })
    setReviewCandidates((data ?? []) as ShortlistCandidate[])
  }

  async function openReview(run: ShortlistRun) {
    setReviewRun(run)
    await loadCandidatesForRun(run.id)
    setReviewOpen(true)
  }

  async function handleArchiveRun(runId: string, archive: boolean) {
    await supabase
      .from('shortlist_runs')
      .update({ status: archive ? 'archived' : 'complete' })
      .eq('id', runId)
    await loadHistory()
  }

  async function handleDeleteRun(runId: string) {
    await supabase.from('shortlist_runs').delete().eq('id', runId)
    setConfirmDeleteId(null)
    if (reviewRun?.id === runId) {
      setReviewOpen(false)
      setReviewRun(null)
      setReviewCandidates([])
    }
    await loadHistory()
  }

  function updateCandidate(updated: ShortlistCandidate) {
    setReviewCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    setHistoryCounts((prev) => {
      const runId = updated.run_id
      const existing = prev[runId] ?? { screenshots: 0, candidates: 0, added: 0 }
      if (updated.decision === 'added') {
        return { ...prev, [runId]: { ...existing, added: existing.added + 1 } }
      }
      return prev
    })
  }

  const visibleHistory = showArchived ? historyRuns : historyRuns.filter((r) => r.status !== 'archived')
  const archivedCount = historyRuns.filter((r) => r.status === 'archived').length

  const activeCfg = icpConfigs[summaryVertical]
  const icpPreview = activeCfg?.icp_text ? truncate(activeCfg.icp_text, 80) : null

  return (
    <div style={s.root}>
      {showNewShortlist && (
        <NewShortlistModal onClose={() => setShowNewShortlist(false)} />
      )}

      {reviewOpen && reviewRun && (
        <SidePanel
          title="Review shortlist"
          subtitle={`${VERTICAL_LABELS[reviewRun.vertical]} · ${formatPortalDate(reviewRun.created_at)} · ${reviewCandidates.length} candidates`}
          onClose={() => setReviewOpen(false)}
        >
          <ReviewPanelContent run={reviewRun} candidates={reviewCandidates} onUpdated={updateCandidate} />
        </SidePanel>
      )}

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div style={s.pageHeaderRow}>
        <h1 style={s.pageTitle}>Smart Shortlist</h1>
        <button type="button" style={s.newRunBtn} onClick={() => setShowNewShortlist(true)}>
          <Sparkles size={15} />
          New shortlist
        </button>
      </div>

      {/* ── ICP summary card (Fix 1) ────────────────────────────────────── */}
      <div style={s.card}>
        <div style={s.summaryHead}>
          <span style={s.summaryTitle}>ICP</span>
          <div style={s.vertTabs}>
            {(['design_systems', 'branding'] as Vertical[]).map((v) => (
              <button
                key={v}
                type="button"
                style={{ ...s.vertTab, ...(summaryVertical === v ? s.vertTabActive : null) }}
                onClick={() => setSummaryVertical(v)}
              >
                {VERTICAL_LABELS[v]}
              </button>
            ))}
          </div>
        </div>
        {icpPreview ? (
          <p style={s.summaryText}>{icpPreview}</p>
        ) : (
          <p style={s.warningBanner}>
            No ICP configured for this vertical. Add one in Settings before running.
          </p>
        )}
        <button type="button" style={s.editLink} onClick={() => navigate('/portal/admin/settings')}>
          Edit in Settings
        </button>
      </div>

      {/* ── Previous runs (Fix 2: now the main content) ─────────────────── */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>Previous runs</h2>

        {visibleHistory.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={32} />}
            heading="No shortlists yet"
            body="Run your first one to find your next clients."
          />
        ) : isMobile ? (
          <div style={s.histCardStack}>
            {visibleHistory.map((run) => (
              <HistoryCard
                key={run.id}
                run={run}
                counts={historyCounts[run.id]}
                confirmDeleteId={confirmDeleteId}
                onView={() => openReview(run)}
                onArchive={() => handleArchiveRun(run.id, run.status !== 'archived')}
                onDeleteRequest={() => setConfirmDeleteId(run.id)}
                onDeleteCancel={() => setConfirmDeleteId(null)}
                onDeleteConfirm={() => handleDeleteRun(run.id)}
              />
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Date</th>
                  <th style={s.th}>Vertical</th>
                  <th style={s.th}>Channel</th>
                  <th style={s.th}>Screenshots</th>
                  <th style={s.th}>Candidates</th>
                  <th style={s.th}>Added</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}></th>
                </tr>
              </thead>
              <tbody>
                {visibleHistory.map((run) => {
                  const counts = historyCounts[run.id] ?? { screenshots: 0, candidates: 0, added: 0 }
                  return (
                    <tr key={run.id}>
                      <td style={s.td}><span style={s.monoCell}>{formatPortalDate(run.created_at)}</span></td>
                      <td style={s.td}><VerticalPill vertical={run.vertical} /></td>
                      <td style={s.td}>{run.channel === 'both' ? 'Email + LinkedIn' : CHANNEL_LABELS[run.channel]}</td>
                      <td style={s.td}>{counts.screenshots}</td>
                      <td style={s.td}>{counts.candidates}</td>
                      <td style={s.td}>{counts.added}</td>
                      <td style={s.td}><RunStatusPill status={run.status} /></td>
                      <td style={s.td}>
                        {confirmDeleteId === run.id ? (
                          <span style={s.confirmRow}>
                            <button type="button" style={s.confirmYes} onClick={() => handleDeleteRun(run.id)}>Delete</button>
                            <button type="button" style={s.confirmNo} onClick={() => setConfirmDeleteId(null)}>Cancel</button>
                          </span>
                        ) : (
                          <div style={s.rowActions}>
                            <button type="button" style={s.iconBtn} title="View" onClick={() => openReview(run)}>
                              <Eye size={14} color={t.text.secondary} />
                            </button>
                            <button
                              type="button"
                              style={s.iconBtn}
                              title={run.status === 'archived' ? 'Unarchive' : 'Archive'}
                              onClick={() => handleArchiveRun(run.id, run.status !== 'archived')}
                            >
                              {run.status === 'archived'
                                ? <ArchiveRestore size={14} color={t.text.secondary} />
                                : <Archive size={14} color={t.text.secondary} />}
                            </button>
                            <button type="button" style={s.iconBtn} title="Delete" onClick={() => setConfirmDeleteId(run.id)}>
                              <Trash2 size={14} color={tokens.ruby} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {archivedCount > 0 && (
          <button type="button" style={s.showArchivedLink} onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? 'Hide archived' : `Show archived (${archivedCount})`}
          </button>
        )}
      </div>
    </div>
  )
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim()
  return trimmed.length > max ? trimmed.slice(0, max).trimEnd() + '...' : trimmed
}

// ── Review panel content (Fix 2: SidePanel instead of inline Section C) ────
function ReviewPanelContent({
  run,
  candidates,
  onUpdated,
}: {
  run: ShortlistRun
  candidates: ShortlistCandidate[]
  onUpdated: (updated: ShortlistCandidate) => void
}) {
  const [reviewOpen, setReviewOpen] = useState(false)
  const activeChannel = run.channel === 'linkedin' ? 'linkedin' : 'email'

  const pendingCandidates = candidates.filter((c) => c.decision === 'pending' && c.channel === activeChannel)
  const all = pendingCandidates.slice().sort((a, b) => (b.icp_score ?? 0) - (a.icp_score ?? 0))
  const high = all.filter((c) => c.confidence === 'high')
  const low = all.filter((c) => c.confidence === 'low')
  const volume = runVolume(run)
  const main = high.slice(0, volume)

  return (
    <div>
      {main.length === 0 && <p style={s.hintText}>No candidates in this list yet.</p>}

      {main.map((c) => (
        <CandidateCard key={c.id} candidate={c} vertical={run.vertical} onUpdated={onUpdated} />
      ))}

      {high.length < volume && (
        <div style={s.slotBanner}>
          Only {high.length} of {volume} slots filled — remaining profiles didn't meet the ICP threshold.
        </div>
      )}

      {low.length > 0 && (
        <div style={s.manualReview}>
          <button type="button" style={s.manualReviewToggle} onClick={() => setReviewOpen((v) => !v)}>
            <span>Needs manual review ({low.length})</span>
            {reviewOpen ? <ChevronUp size={14} color={t.text.muted} /> : <ChevronDown size={14} color={t.text.muted} />}
          </button>
          {reviewOpen && low.map((c) => (
            <CandidateCard key={c.id} candidate={c} vertical={run.vertical} onUpdated={onUpdated} />
          ))}
        </div>
      )}
    </div>
  )
}

function VerticalPill({ vertical }: { vertical: Vertical }) {
  return (
    <span style={{
      ...s.pill,
      background: vertical === 'design_systems' ? tokens.tealLight : tokens.goldLight,
      color: vertical === 'design_systems' ? tokens.primary : tokens.goldDark,
    }}>
      {VERTICAL_LABELS[vertical]}
    </span>
  )
}

const RUN_STATUS_LABELS: Record<string, string> = {
  processing: 'Processing',
  complete: 'Complete',
  archived: 'Archived',
  failed: 'Failed',
}

function RunStatusPill({ status }: { status: string }) {
  const tone =
    status === 'complete' ? { bg: tokens.greenLight, fg: tokens.green } :
    status === 'processing' ? { bg: tokens.goldLight, fg: tokens.goldDark } :
    status === 'failed' ? { bg: tokens.rubyLight, fg: tokens.ruby } :
    { bg: t.background.muted, fg: t.text.tertiary }
  return (
    <span style={{ ...s.pill, background: tone.bg, color: tone.fg }}>
      {RUN_STATUS_LABELS[status] ?? status}
    </span>
  )
}

function HistoryCard({
  run,
  counts,
  confirmDeleteId,
  onView,
  onArchive,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
}: {
  run: ShortlistRun
  counts?: { screenshots: number; candidates: number; added: number }
  confirmDeleteId: string | null
  onView: () => void
  onArchive: () => void
  onDeleteRequest: () => void
  onDeleteCancel: () => void
  onDeleteConfirm: () => void
}) {
  const c = counts ?? { screenshots: 0, candidates: 0, added: 0 }
  return (
    <div style={s.histCard}>
      <div style={s.histCardTop}>
        <VerticalPill vertical={run.vertical} />
        <RunStatusPill status={run.status} />
      </div>
      <span style={s.monoCell}>{formatPortalDate(run.created_at)}</span>
      <span style={s.hintText}>
        {run.channel === 'both' ? 'Email + LinkedIn' : CHANNEL_LABELS[run.channel]} · {c.screenshots} screenshots · {c.candidates} candidates · {c.added} added
      </span>
      {confirmDeleteId === run.id ? (
        <div style={s.confirmRow}>
          <button type="button" style={s.confirmYes} onClick={onDeleteConfirm}>Delete</button>
          <button type="button" style={s.confirmNo} onClick={onDeleteCancel}>Cancel</button>
        </div>
      ) : (
        <div style={s.histCardActions}>
          <button type="button" style={s.outlineBtn} onClick={onView}>View</button>
          <button type="button" style={s.outlineBtn} onClick={onArchive}>
            {run.status === 'archived' ? 'Unarchive' : 'Archive'}
          </button>
          <button type="button" style={s.deleteLink} onClick={onDeleteRequest}>Delete</button>
        </div>
      )}
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', gap: 20 },
  pageHeaderRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  pageTitle: { fontFamily: fonts.heading, fontSize: 22, fontWeight: 600, color: t.text.primary, margin: 0 },
  newRunBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.primary,
    color: t.text.onPrimary,
    border: 'none',
    borderRadius: 8,
    padding: '9px 16px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  card: {
    background: t.background.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    padding: 20,
  },
  cardTitle: { fontFamily: fonts.heading, fontSize: 18, fontWeight: 600, color: t.text.primary, margin: '0 0 16px' },
  summaryHead: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  summaryTitle: { fontFamily: fonts.heading, fontSize: 14, fontWeight: 600, color: t.text.primary },
  summaryText: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary, margin: '0 0 10px', lineHeight: 1.5 },
  vertTabs: { display: 'flex', gap: 6 },
  vertTab: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 500,
    color: t.text.secondary,
    background: t.background.subtle,
    border: `1px solid ${t.border.default}`,
    borderRadius: 999,
    padding: '4px 12px',
    cursor: 'pointer',
  },
  vertTabActive: {
    background: tokens.tealLight,
    color: tokens.primary,
    borderColor: tokens.accent,
    fontWeight: 600,
  },
  warningBanner: {
    background: tokens.goldLight,
    color: tokens.goldDark,
    border: `1px solid ${tokens.gold}`,
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 1.5,
    margin: '0 0 10px',
  },
  editLink: {
    background: 'none',
    border: 'none',
    padding: 0,
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.urlLink,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  hintText: { fontFamily: fonts.body, fontSize: 13, color: t.text.muted, marginTop: 12 },
  slotBanner: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.secondary,
    background: t.background.subtle,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    padding: '8px 12px',
    marginTop: 4,
  },
  manualReview: { marginTop: 16 },
  manualReviewToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    background: 'none',
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: t.text.secondary,
    cursor: 'pointer',
    padding: '8px 0',
    borderTop: `1px solid ${t.border.subtle}`,
  },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 700 },
  th: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    color: t.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    padding: '8px 12px',
    textAlign: 'left',
    borderBottom: `1px solid ${t.border.subtle}`,
    whiteSpace: 'nowrap',
  },
  td: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    padding: '10px 12px',
    borderBottom: `1px solid ${t.border.subtle}`,
    verticalAlign: 'middle',
  },
  monoCell: { fontFamily: mono, fontSize: 12, color: t.text.secondary },
  pill: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 999,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
  },
  rowActions: { display: 'flex', gap: 6 },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' },
  confirmRow: { display: 'flex', gap: 6 },
  confirmYes: {
    fontFamily: fonts.body, fontSize: 11, fontWeight: 600, color: tokens.ruby,
    background: tokens.rubyLight, border: `1px solid ${tokens.ruby}`,
    borderRadius: 4, padding: '3px 9px', cursor: 'pointer',
  },
  confirmNo: {
    fontFamily: fonts.body, fontSize: 11, color: t.text.secondary,
    background: 'none', border: `1px solid ${t.border.default}`,
    borderRadius: 4, padding: '3px 9px', cursor: 'pointer',
  },
  showArchivedLink: {
    background: 'none',
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.urlLink,
    cursor: 'pointer',
    padding: 0,
    marginTop: 12,
    textDecoration: 'underline',
  },
  histCardStack: { display: 'flex', flexDirection: 'column', gap: 10 },
  histCard: {
    background: t.background.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 10,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  histCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  histCardActions: { display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  outlineBtn: {
    background: tokens.surface,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 12,
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    padding: '5px 10px',
    cursor: 'pointer',
  },
  deleteLink: {
    background: 'none',
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.ruby,
    cursor: 'pointer',
    padding: '5px 4px',
  },
}
