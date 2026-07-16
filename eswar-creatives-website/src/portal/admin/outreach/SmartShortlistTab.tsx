// Smart Shortlist tab: ICP config (A), run a new shortlist (B), review stage (C), history (D).
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ChevronDown, ChevronUp, Upload, X, Archive, Trash2, Eye, ArchiveRestore } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { mono, formatDate } from '../ui'
import { showToast } from '../toast'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { CandidateCard } from '../../components/shortlist/CandidateCard'
import {
  VERTICAL_LABELS,
  type Vertical,
  type ICPConfig,
  type ShortlistRun,
  type ShortlistCandidate,
} from '../../components/shortlist/types'

const VERTICALS: Vertical[] = ['design_systems', 'branding']
const VOLUME_OPTIONS = [5, 10, 15]
const ATTACHMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp'
const SCREENSHOT_ACCEPT = 'image/jpeg,image/png,image/webp'
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

type HistoryCounts = Record<string, { screenshots: number; candidates: number; added: number }>

export function SmartShortlistTab() {
  const { isMobile } = useBreakpoint()
  const reviewRef = useRef<HTMLDivElement>(null)

  // ── Section A: ICP config ────────────────────────────────────────────────
  const [icpConfigs, setIcpConfigs] = useState<Record<Vertical, ICPConfig | null>>({
    design_systems: null,
    branding: null,
  })
  const [configLoaded, setConfigLoaded] = useState(false)
  const [configExpanded, setConfigExpanded] = useState(false)
  const [configVertical, setConfigVertical] = useState<Vertical>('design_systems')
  const [icpTextDraft, setIcpTextDraft] = useState('')
  const [goalTextDraft, setGoalTextDraft] = useState('')
  const [icpAttachmentPath, setIcpAttachmentPath] = useState<string | null>(null)
  const [goalAttachmentPath, setGoalAttachmentPath] = useState<string | null>(null)
  const [icpUploading, setIcpUploading] = useState(false)
  const [goalUploading, setGoalUploading] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  // ── Section B: new run ───────────────────────────────────────────────────
  const [runVertical, setRunVertical] = useState<Vertical>('design_systems')
  const [volumeEmail, setVolumeEmail] = useState(5)
  const [volumeLinkedin, setVolumeLinkedin] = useState(5)
  const [screenshotStaged, setScreenshotStaged] = useState<{ file: File; previewUrl: string }[]>([])
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  // ── Section C: review stage ──────────────────────────────────────────────
  const [currentRun, setCurrentRun] = useState<ShortlistRun | null>(null)
  const [candidates, setCandidates] = useState<ShortlistCandidate[]>([])
  const [showEmailReview, setShowEmailReview] = useState(false)
  const [showLinkedinReview, setShowLinkedinReview] = useState(false)

  // ── Section D: history ────────────────────────────────────────────────────
  const [historyRuns, setHistoryRuns] = useState<ShortlistRun[]>([])
  const [historyCounts, setHistoryCounts] = useState<HistoryCounts>({})
  const [showArchived, setShowArchived] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function loadIcpConfigs() {
    const { data } = await supabase.from('icp_configs').select('*')
    const map: Record<Vertical, ICPConfig | null> = { design_systems: null, branding: null }
    for (const row of (data ?? []) as ICPConfig[]) map[row.vertical] = row
    setIcpConfigs(map)
    setConfigLoaded(true)
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

  // Collapsed by default only when at least one vertical already has a saved
  // ICP; expanded on first load if both are empty. Only evaluated once, right
  // after configs finish loading, not on every vertical-tab switch.
  useEffect(() => {
    if (!configLoaded) return
    const hasAny = Boolean(icpConfigs.design_systems?.icp_text || icpConfigs.branding?.icp_text)
    setConfigExpanded(!hasAny)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configLoaded])

  useEffect(() => {
    const cfg = icpConfigs[configVertical]
    setIcpTextDraft(cfg?.icp_text ?? '')
    setGoalTextDraft(cfg?.goal_text ?? '')
    setIcpAttachmentPath(cfg?.icp_attachment_url ?? null)
    setGoalAttachmentPath(cfg?.goal_attachment_url ?? null)
  }, [configVertical, icpConfigs])

  async function uploadAttachment(kind: 'icp' | 'goal', file: File) {
    if (file.size > MAX_ATTACHMENT_BYTES) {
      showToast('File too large (max 10MB).', 'error')
      return
    }
    const setUploading = kind === 'icp' ? setIcpUploading : setGoalUploading
    setUploading(true)
    const ext = file.name.split('.').pop() ?? 'bin'
    const path = `icp/${configVertical}/${kind}-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('icp-attachments').upload(path, file)
    setUploading(false)
    if (error) {
      showToast('Upload failed. Please try again.', 'error')
      return
    }
    if (kind === 'icp') setIcpAttachmentPath(path)
    else setGoalAttachmentPath(path)
  }

  async function viewAttachment(path: string) {
    const { data } = await supabase.storage.from('icp-attachments').createSignedUrl(path, 3600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function handleSaveIcp() {
    setSavingConfig(true)
    const { error } = await supabase.from('icp_configs').upsert(
      {
        vertical: configVertical,
        icp_text: icpTextDraft.trim() || null,
        goal_text: goalTextDraft.trim() || null,
        icp_attachment_url: icpAttachmentPath,
        goal_attachment_url: goalAttachmentPath,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'vertical' }
    )
    setSavingConfig(false)
    if (error) {
      showToast('Could not save ICP configuration.', 'error')
      return
    }
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
    await loadIcpConfigs()
  }

  function handleScreenshotSelect(files: FileList | null) {
    if (!files) return
    const next = Array.from(files)
      .filter((f) => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type))
      .map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))
    setScreenshotStaged((prev) => [...prev, ...next])
  }

  function removeScreenshot(index: number) {
    setScreenshotStaged((prev) => prev.filter((_, i) => i !== index))
  }

  async function loadCandidatesForRun(runId: string) {
    const { data } = await supabase
      .from('shortlist_candidates')
      .select('*')
      .eq('run_id', runId)
      .order('icp_score', { ascending: false })
    setCandidates((data ?? []) as ShortlistCandidate[])
  }

  const hasIcpForRunVertical = Boolean(icpConfigs[runVertical]?.icp_text)
  const runDisabledReason =
    screenshotStaged.length === 0
      ? 'Upload at least one screenshot to run a shortlist.'
      : !hasIcpForRunVertical
      ? `Save an ICP profile for ${VERTICAL_LABELS[runVertical]} before running a shortlist.`
      : null

  async function handleRunShortlist() {
    if (runDisabledReason) return
    setRunning(true)
    setRunError(null)
    try {
      const { data: runRow, error: runErr } = await supabase
        .from('shortlist_runs')
        .insert({
          vertical: runVertical,
          volume_email: volumeEmail,
          volume_linkedin: volumeLinkedin,
          status: 'processing',
        })
        .select('*')
        .single()
      if (runErr || !runRow) throw new Error('run_create_failed')

      for (const staged of screenshotStaged) {
        const path = `shortlist-runs/${runRow.id}/${Date.now()}-${staged.file.name}`
        const { error: upErr } = await supabase.storage.from('stage-attachments').upload(path, staged.file)
        if (upErr) continue
        await supabase.from('shortlist_run_screenshots').insert({ run_id: runRow.id, storage_path: path })
      }

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token ?? ''
      const { data: fnData, error: fnErr } = await supabase.functions.invoke('process-shortlist-run', {
        body: { run_id: runRow.id, vertical: runVertical },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (fnErr || !fnData || fnData.error) {
        setRunError('Could not analyse these screenshots. Please try again.')
        setRunning(false)
        await loadHistory()
        return
      }

      setCurrentRun(runRow as ShortlistRun)
      await loadCandidatesForRun(runRow.id)
      setScreenshotStaged([])
      setShowEmailReview(false)
      setShowLinkedinReview(false)
      await loadHistory()
      setRunning(false)
      setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch {
      setRunError('Could not start this run. Please try again.')
      setRunning(false)
    }
  }

  async function handleViewRun(runId: string) {
    const run = historyRuns.find((r) => r.id === runId)
    if (!run) return
    setCurrentRun(run)
    setShowEmailReview(false)
    setShowLinkedinReview(false)
    await loadCandidatesForRun(runId)
    setTimeout(() => reviewRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
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
    if (currentRun?.id === runId) {
      setCurrentRun(null)
      setCandidates([])
    }
    await loadHistory()
  }

  function updateCandidate(updated: ShortlistCandidate) {
    setCandidates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
    setHistoryCounts((prev) => {
      const runId = updated.run_id
      const existing = prev[runId] ?? { screenshots: 0, candidates: 0, added: 0 }
      if (updated.decision === 'added') {
        return { ...prev, [runId]: { ...existing, added: existing.added + 1 } }
      }
      return prev
    })
  }

  const pendingCandidates = candidates.filter((c) => c.decision === 'pending')
  const emailAll = pendingCandidates.filter((c) => c.channel === 'email').sort((a, b) => (b.icp_score ?? 0) - (a.icp_score ?? 0))
  const linkedinAll = pendingCandidates.filter((c) => c.channel === 'linkedin').sort((a, b) => (b.icp_score ?? 0) - (a.icp_score ?? 0))

  const emailHigh = emailAll.filter((c) => c.confidence === 'high')
  const emailLow = emailAll.filter((c) => c.confidence === 'low')
  const linkedinHigh = linkedinAll.filter((c) => c.confidence === 'high')
  const linkedinLow = linkedinAll.filter((c) => c.confidence === 'low')

  const emailMain = emailHigh.slice(0, currentRun?.volume_email ?? volumeEmail)
  const linkedinMain = linkedinHigh.slice(0, currentRun?.volume_linkedin ?? volumeLinkedin)

  const visibleHistory = showArchived ? historyRuns : historyRuns.filter((r) => r.status !== 'archived')
  const archivedCount = historyRuns.filter((r) => r.status === 'archived').length

  return (
    <div style={s.root}>
      {/* ── Section A: ICP + Goal config ────────────────────────────────── */}
      <div style={s.card}>
        <button
          type="button"
          style={s.configHeader}
          onClick={() => setConfigExpanded((v) => !v)}
        >
          <span style={s.cardTitle}>ICP configuration</span>
          <span style={s.headerRight}>
            <span style={s.editLink}>Edit</span>
            {configExpanded ? <ChevronUp size={16} color={t.text.muted} /> : <ChevronDown size={16} color={t.text.muted} />}
          </span>
        </button>

        {configExpanded && (
          <div style={s.configBody}>
            <div style={s.vertTabs}>
              {VERTICALS.map((v) => (
                <button
                  key={v}
                  type="button"
                  style={{ ...s.vertTab, ...(configVertical === v ? s.vertTabActive : null) }}
                  onClick={() => setConfigVertical(v)}
                >
                  {VERTICAL_LABELS[v]}
                </button>
              ))}
            </div>

            <label style={s.fieldLabel}>
              ICP profile
              <textarea
                style={s.textareaBig}
                value={icpTextDraft}
                onChange={(e) => setIcpTextDraft(e.target.value)}
                rows={5}
                placeholder="Describe your ideal client profile for this vertical. Include company stage, team size, product type, verticals, and buyer titles."
              />
            </label>

            <AttachmentField
              label="Attachment"
              path={icpAttachmentPath}
              uploading={icpUploading}
              onUpload={(f) => uploadAttachment('icp', f)}
              onRemove={() => setIcpAttachmentPath(null)}
              onView={viewAttachment}
            />

            <label style={s.fieldLabel}>
              Acquisition goal
              <input
                style={s.input}
                value={goalTextDraft}
                onChange={(e) => setGoalTextDraft(e.target.value)}
                placeholder="Example: 2 qualified discovery calls in 2 weeks."
              />
            </label>

            <AttachmentField
              label="Attachment"
              path={goalAttachmentPath}
              uploading={goalUploading}
              onUpload={(f) => uploadAttachment('goal', f)}
              onRemove={() => setGoalAttachmentPath(null)}
              onView={viewAttachment}
            />

            <div style={s.saveRow}>
              <button
                type="button"
                style={{ ...s.primaryBtn, opacity: savingConfig ? 0.6 : 1 }}
                onClick={handleSaveIcp}
                disabled={savingConfig}
              >
                {savingConfig ? 'Saving...' : 'Save ICP'}
              </button>
              {savedFlash && <span style={s.savedFlash}>Saved</span>}
            </div>
          </div>
        )}
      </div>

      {/* ── Section B: new shortlist run ────────────────────────────────── */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>Run new shortlist</h2>

        <div style={{ ...s.runControls, ...(isMobile ? s.runControlsMobile : null) }}>
          <label style={s.fieldLabel}>
            Vertical
            <div style={s.vertTabs}>
              {VERTICALS.map((v) => (
                <button
                  key={v}
                  type="button"
                  style={{ ...s.vertTab, ...(runVertical === v ? s.vertTabActive : null) }}
                  onClick={() => setRunVertical(v)}
                >
                  {VERTICAL_LABELS[v]}
                </button>
              ))}
            </div>
          </label>
          <label style={s.fieldLabel}>
            Email outreach
            <select style={s.select} value={volumeEmail} onChange={(e) => setVolumeEmail(Number(e.target.value))}>
              {VOLUME_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label style={s.fieldLabel}>
            LinkedIn DM
            <select style={s.select} value={volumeLinkedin} onChange={(e) => setVolumeLinkedin(Number(e.target.value))}>
              {VOLUME_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>

        <label style={{ ...s.fieldLabel, marginTop: 16 }}>
          Upload LinkedIn screenshots
          <span style={s.subLabel}>Waiting list, recently connected, recently viewed — upload as many as needed.</span>
        </label>
        <ScreenshotDropZone onSelect={handleScreenshotSelect} />

        {screenshotStaged.length > 0 && (
          <div style={s.thumbGrid}>
            {screenshotStaged.map((shot, i) => (
              <div key={i} style={s.thumbWrap}>
                <img src={shot.previewUrl} style={s.thumb} alt="" />
                <button
                  type="button"
                  style={s.thumbRemove}
                  onClick={() => removeScreenshot(i)}
                  aria-label="Remove screenshot"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {runError && <p style={s.errorText}>{runError}</p>}
        {!runError && runDisabledReason && !running && <p style={s.hintText}>{runDisabledReason}</p>}

        <button
          type="button"
          style={{
            ...s.primaryBtn,
            ...(isMobile ? s.fullWidth : null),
            marginTop: 16,
            opacity: running || Boolean(runDisabledReason) ? 0.5 : 1,
          }}
          onClick={handleRunShortlist}
          disabled={running || Boolean(runDisabledReason)}
        >
          {running ? 'Analysing screenshots against your ICP...' : 'Run shortlist'}
        </button>
      </div>

      {/* ── Section C: review stage ─────────────────────────────────────── */}
      {currentRun && (
        <div ref={reviewRef} style={s.card}>
          <h2 style={s.cardTitle}>Review shortlist</h2>
          <p style={s.runMeta}>
            {VERTICAL_LABELS[currentRun.vertical]} · {formatDate(currentRun.created_at)} · {candidates.length} candidates
          </p>

          <div style={{ ...s.reviewCols, ...(isMobile ? s.reviewColsMobile : null) }}>
            <ReviewColumn
              title="Email outreach"
              vertical={currentRun.vertical}
              main={emailMain}
              lowConfidence={emailLow}
              volume={currentRun.volume_email}
              highTotal={emailHigh.length}
              reviewOpen={showEmailReview}
              onToggleReview={() => setShowEmailReview((v) => !v)}
              onUpdated={updateCandidate}
            />
            <ReviewColumn
              title="LinkedIn DM"
              vertical={currentRun.vertical}
              main={linkedinMain}
              lowConfidence={linkedinLow}
              volume={currentRun.volume_linkedin}
              highTotal={linkedinHigh.length}
              reviewOpen={showLinkedinReview}
              onToggleReview={() => setShowLinkedinReview((v) => !v)}
              onUpdated={updateCandidate}
            />
          </div>
        </div>
      )}

      {/* ── Section D: history ──────────────────────────────────────────── */}
      <div style={s.card}>
        <h2 style={s.cardTitle}>Previous runs</h2>

        {visibleHistory.length === 0 ? (
          <p style={s.hintText}>No shortlist runs yet.</p>
        ) : isMobile ? (
          <div style={s.histCardStack}>
            {visibleHistory.map((run) => (
              <HistoryCard
                key={run.id}
                run={run}
                counts={historyCounts[run.id]}
                confirmDeleteId={confirmDeleteId}
                onView={() => handleViewRun(run.id)}
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
                      <td style={s.td}><span style={s.monoCell}>{formatDate(run.created_at)}</span></td>
                      <td style={s.td}><VerticalPill vertical={run.vertical} /></td>
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
                            <button type="button" style={s.iconBtn} title="View" onClick={() => handleViewRun(run.id)}>
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

// ── Sub-components local to this tab ─────────────────────────────────────

function AttachmentField({
  label,
  path,
  uploading,
  onUpload,
  onRemove,
  onView,
}: {
  label: string
  path: string | null
  uploading: boolean
  onUpload: (file: File) => void
  onRemove: () => void
  onView: (path: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const filename = path?.split('/').pop() ?? ''

  return (
    <div style={s.fieldLabel}>
      <span>{label}</span>
      {path ? (
        <div style={s.attachmentRow}>
          <button type="button" style={s.attachmentName} onClick={() => onView(path)}>{filename}</button>
          <button type="button" style={s.removeLink} onClick={onRemove}>Remove</button>
        </div>
      ) : (
        <button
          type="button"
          style={s.uploadZone}
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload size={13} color={t.text.tertiary} />
          {uploading ? 'Uploading...' : 'Drop PDF or image, or click to browse'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
          if (inputRef.current) inputRef.current.value = ''
        }}
      />
    </div>
  )
}

function ScreenshotDropZone({ onSelect }: { onSelect: (files: FileList | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  return (
    <>
      <button
        type="button"
        style={{ ...s.uploadZone, ...(dragging ? s.uploadZoneDragging : null), marginTop: 8 }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          onSelect(e.dataTransfer.files)
        }}
      >
        <Upload size={13} color={t.text.tertiary} />
        {dragging ? 'Drop to upload' : 'Drop screenshots here, or click to browse'}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={SCREENSHOT_ACCEPT}
        multiple
        style={{ display: 'none' }}
        onChange={(e) => {
          onSelect(e.target.files)
          if (inputRef.current) inputRef.current.value = ''
        }}
      />
    </>
  )
}

function ReviewColumn({
  title,
  vertical,
  main,
  lowConfidence,
  volume,
  highTotal,
  reviewOpen,
  onToggleReview,
  onUpdated,
}: {
  title: string
  vertical: Vertical
  main: ShortlistCandidate[]
  lowConfidence: ShortlistCandidate[]
  volume: number
  highTotal: number
  reviewOpen: boolean
  onToggleReview: () => void
  onUpdated: (updated: ShortlistCandidate) => void
}) {
  return (
    <div style={s.reviewCol}>
      <h3 style={s.colHeading}>{title}</h3>

      {main.length === 0 && (
        <p style={s.hintText}>No candidates in this list yet.</p>
      )}

      {main.map((c) => (
        <CandidateCard key={c.id} candidate={c} vertical={vertical} onUpdated={onUpdated} />
      ))}

      {highTotal < volume && (
        <div style={s.slotBanner}>
          Only {highTotal} of {volume} slots filled — remaining profiles didn't meet the ICP threshold.
        </div>
      )}

      {lowConfidence.length > 0 && (
        <div style={s.manualReview}>
          <button type="button" style={s.manualReviewToggle} onClick={onToggleReview}>
            <span>Needs manual review ({lowConfidence.length})</span>
            {reviewOpen ? <ChevronUp size={14} color={t.text.muted} /> : <ChevronDown size={14} color={t.text.muted} />}
          </button>
          {reviewOpen && lowConfidence.map((c) => (
            <CandidateCard key={c.id} candidate={c} vertical={vertical} onUpdated={onUpdated} />
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
      <span style={s.monoCell}>{formatDate(run.created_at)}</span>
      <span style={s.hintText}>{c.screenshots} screenshots · {c.candidates} candidates · {c.added} added</span>
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
  card: {
    background: t.background.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    padding: 20,
  },
  cardTitle: { fontFamily: fonts.heading, fontSize: 18, fontWeight: 600, color: t.text.primary, margin: 0 },
  configHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  editLink: { fontFamily: fonts.body, fontSize: 12, color: t.text.urlLink },
  configBody: { display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 },
  vertTabs: { display: 'flex', gap: 6, marginTop: 6 },
  vertTab: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    color: t.text.secondary,
    background: t.background.subtle,
    border: `1px solid ${t.border.default}`,
    borderRadius: 999,
    padding: '5px 14px',
    cursor: 'pointer',
  },
  vertTabActive: {
    background: tokens.tealLight,
    color: tokens.primary,
    borderColor: tokens.accent,
    fontWeight: 600,
  },
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontFamily: mono,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  subLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 400,
    color: t.text.muted,
    textTransform: 'none',
    letterSpacing: 0,
  },
  textareaBig: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 400,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '10px 12px',
    minHeight: 120,
    outline: 'none',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
    textTransform: 'none',
    letterSpacing: 0,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 400,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '9px 12px',
    outline: 'none',
    boxSizing: 'border-box' as const,
    textTransform: 'none',
    letterSpacing: 0,
  },
  select: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 400,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '8px 10px',
    outline: 'none',
    textTransform: 'none',
    letterSpacing: 0,
  },
  uploadZone: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: t.background.subtle,
    border: `1px dashed ${t.border.default}`,
    borderRadius: 8,
    padding: '14px 16px',
    width: '100%',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 400,
    color: t.text.tertiary,
    cursor: 'pointer',
    textTransform: 'none',
    letterSpacing: 0,
    boxSizing: 'border-box' as const,
  },
  uploadZoneDragging: { borderColor: t.border.brand, background: t.background.tint1 },
  attachmentRow: { display: 'flex', alignItems: 'center', gap: 10 },
  attachmentName: {
    background: 'none',
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    color: t.text.urlLink,
    cursor: 'pointer',
    padding: 0,
    textTransform: 'none',
    textDecoration: 'underline',
  },
  removeLink: {
    background: 'none',
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.ruby,
    cursor: 'pointer',
    padding: 0,
    textTransform: 'none',
  },
  saveRow: { display: 'flex', alignItems: 'center', gap: 12 },
  savedFlash: { fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: t.border.success },
  primaryBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '10px 18px',
    cursor: 'pointer',
  },
  fullWidth: { width: '100%', textAlign: 'center' as const },
  runControls: { display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 16 },
  runControlsMobile: { flexDirection: 'column', gap: 14 },
  thumbGrid: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  thumbWrap: { position: 'relative', width: 64, height: 64 },
  thumb: { width: 64, height: 64, borderRadius: 4, objectFit: 'cover' as const },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: tokens.ruby,
    color: '#fff',
    border: `2px solid ${tokens.surface}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  errorText: { fontFamily: fonts.body, fontSize: 13, color: tokens.ruby, marginTop: 12 },
  hintText: { fontFamily: fonts.body, fontSize: 13, color: t.text.muted, marginTop: 12 },
  runMeta: { fontFamily: mono, fontSize: 12, color: t.text.muted, margin: '4px 0 20px' },
  reviewCols: { display: 'flex', gap: 24 },
  reviewColsMobile: { flexDirection: 'column', gap: 20 },
  reviewCol: { flex: 1, minWidth: 0 },
  colHeading: { fontFamily: fonts.heading, fontSize: 16, fontWeight: 600, color: t.text.primary, margin: '0 0 12px' },
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
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 640 },
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
