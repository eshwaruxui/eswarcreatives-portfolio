// New Shortlist modal: vertical + channel + volume selectors, screenshot
// upload, async run kickoff with polling (Fix 7), progress stages (Fix 5),
// error messages (Fix 6), large-upload warning (Fix 8).
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Upload, X, AlertCircle, AlertTriangle, Zap, Brain, BarChart3 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { Modal } from '../ui'
import {
  VERTICAL_LABELS,
  CHANNEL_LABELS,
  type Vertical,
  type ShortlistRun,
} from '../../components/shortlist/types'

const VERTICALS: Vertical[] = ['design_systems', 'branding']
const CHANNELS: ('email' | 'linkedin')[] = ['email', 'linkedin']
const VOLUME_OPTIONS = [5, 10, 15]
const SCREENSHOT_ACCEPT = 'image/jpeg,image/png,image/webp'
const LARGE_UPLOAD_WARNING_BYTES = 15 * 1024 * 1024
const COMPRESS_MAX_DIMENSION = 1200
const COMPRESS_JPEG_QUALITY = 0.85
const POLL_INTERVAL_MS = 4000
const POLL_TIMEOUT_MS = 3 * 60 * 1000

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

// Storage object keys must stay ASCII-safe. macOS screenshot filenames like
// "Screenshot 2026-07-24 at 3.18.09 AM.png" contain U+202F (narrow no-break
// space) between the time and AM/PM, which Supabase Storage rejects with a
// 400 on upload. Strip the extension, fold accents, and collapse anything
// that isn't a word character into hyphens.
function sanitizeFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '-')
    .replace(/[\s\u00A0\u202F\u2009\u200B]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

// Resizes to a 1200px longest side and re-encodes as JPEG at 0.85 quality so
// uploads stay small enough for process-shortlist-run to finish quickly.
async function compressScreenshot(file: File): Promise<File> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, COMPRESS_MAX_DIMENSION / Math.max(img.width, img.height))
    const width = Math.round(img.width * scale)
    const height = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', COMPRESS_JPEG_QUALITY))
    if (!blob) return file
    const newName = sanitizeFilename(file.name) + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg' })
  } catch {
    return file
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Fix 6: specific copy per error code, shown inside the modal.
function errorMessageFor(code: string | null | undefined): string {
  switch (code) {
    case 'anthropic_timeout':
      return 'Processing took too long. Try uploading fewer screenshots or crop them to show fewer profiles per image.'
    case 'parse_failed':
      return 'Could not read the AI response. This sometimes happens with very complex screenshots. Try a cleaner screenshot with fewer profiles visible.'
    case 'no_icp':
      return 'No ICP profile found for this vertical. Add one in Settings before running.'
    case 'upload_failed':
      return 'Screenshot upload failed. Check your connection and try again.'
    default:
      return 'Something went wrong. Check your connection and try again.'
  }
}

// Fix 5: four processing stages. Real signal only exists for the first two
// (upload + client-side compression finish synchronously); the AI analysis
// stage runs in the edge function's background task (Fix 7), so its progress
// is simulated by elapsed polling time — a proxy, not a real progress signal.
type Stage = 'upload' | 'optimise' | 'analyse' | 'score'
const STAGES: { id: Stage; label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { id: 'upload', label: 'Uploading screenshots', Icon: Upload },
  { id: 'optimise', label: 'Optimising images', Icon: Zap },
  { id: 'analyse', label: 'Analysing against ICP', Icon: Brain },
  { id: 'score', label: 'Scoring and ranking', Icon: BarChart3 },
]

export function NewShortlistModal({
  hasIcpForVertical,
  onClose,
  onRunComplete,
}: {
  hasIcpForVertical: (vertical: Vertical) => boolean
  onClose: () => void
  onRunComplete: (run: ShortlistRun) => void
}) {
  const [vertical, setVertical] = useState<Vertical>('design_systems')
  const [channel, setChannel] = useState<'email' | 'linkedin'>('email')
  const [volume, setVolume] = useState(5)
  const [screenshotStaged, setScreenshotStaged] = useState<{ file: File; previewUrl: string }[]>([])
  const [running, setRunning] = useState(false)
  const [stage, setStage] = useState<Stage | null>(null)
  const [percent, setPercent] = useState(0)
  const [runError, setRunError] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)

  const pollRef = useRef<number | null>(null)
  const simRef = useRef<number | null>(null)
  const deadlineRef = useRef<number>(0)

  useEffect(() => () => {
    if (pollRef.current) window.clearInterval(pollRef.current)
    if (simRef.current) window.clearInterval(simRef.current)
  }, [])

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

  const stagedBytes = screenshotStaged.reduce((sum, s) => sum + s.file.size, 0)
  const showLargeUploadWarning = stagedBytes > LARGE_UPLOAD_WARNING_BYTES
  const stagedMB = (stagedBytes / (1024 * 1024)).toFixed(1)

  const hasIcp = hasIcpForVertical(vertical)
  const runDisabledReason =
    screenshotStaged.length === 0
      ? 'Upload at least one screenshot to run a shortlist.'
      : !hasIcp
      ? `Save an ICP profile for ${VERTICAL_LABELS[vertical]} before running a shortlist.`
      : null

  function stopPolling() {
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null }
    if (simRef.current) { window.clearInterval(simRef.current); simRef.current = null }
  }

  function pollRun(runId: string) {
    deadlineRef.current = Date.now() + POLL_TIMEOUT_MS

    // Simulated 40->90% creep while the background task runs, since the edge
    // function returns queued:true immediately and there's no real progress
    // signal until status flips to complete/failed.
    simRef.current = window.setInterval(() => {
      setPercent((p) => (p < 90 ? p + 1 : p))
    }, 2000)

    pollRef.current = window.setInterval(async () => {
      if (Date.now() > deadlineRef.current) {
        stopPolling()
        setTimedOut(true)
        setRunning(false)
        return
      }
      const { data } = await supabase
        .from('shortlist_runs')
        .select('*')
        .eq('id', runId)
        .single()
      if (!data) return
      if (data.status === 'complete') {
        stopPolling()
        setStage('score')
        setPercent(100)
        onRunComplete(data as ShortlistRun)
      } else if (data.status === 'failed') {
        stopPolling()
        setRunning(false)
        setRunError(errorMessageFor((data as ShortlistRun).error_code))
      }
    }, POLL_INTERVAL_MS)
  }

  async function handleRunShortlist() {
    if (runDisabledReason) return
    setRunning(true)
    setRunError(null)
    setTimedOut(false)
    setStage('upload')
    setPercent(0)
    try {
      const { data: runRow, error: runErr } = await supabase
        .from('shortlist_runs')
        .insert({
          vertical,
          channel,
          volume_email: channel === 'email' ? volume : 0,
          volume_linkedin: channel === 'linkedin' ? volume : 0,
          status: 'processing',
        })
        .select('*')
        .single()
      if (runErr || !runRow) throw new Error('run_create_failed')

      // Compression has to happen before the network upload technically, but
      // the "Uploading screenshots" stage is what the task spec wants shown
      // first — it's near-instant for a handful of images either way.
      const compressed = await Promise.all(screenshotStaged.map((staged) => compressScreenshot(staged.file)))

      let uploadFailed = false
      for (const file of compressed) {
        const path = `shortlist-runs/${runRow.id}/${Date.now()}-${file.name}`
        const { error: upErr } = await supabase.storage.from('stage-attachments').upload(path, file)
        if (upErr) {
          console.error('[shortlist] screenshot upload failed:', upErr.message)
          uploadFailed = true
          continue
        }
        const { error: rowErr } = await supabase.from('shortlist_run_screenshots').insert({ run_id: runRow.id, storage_path: path })
        if (rowErr) {
          console.error('[shortlist] screenshot row insert failed:', rowErr.message)
          uploadFailed = true
        }
      }
      if (uploadFailed) {
        setRunError(errorMessageFor('upload_failed'))
        setRunning(false)
        return
      }
      setPercent(25)
      setStage('optimise')
      setPercent(40)
      setStage('analyse')

      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token ?? ''
      const { error: fnErr } = await supabase.functions.invoke('process-shortlist-run', {
        body: { run_id: runRow.id, vertical },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })

      if (fnErr) {
        setRunError(errorMessageFor(null))
        setRunning(false)
        return
      }

      // Edge function returns { queued: true } almost immediately (Fix 7) —
      // the real work continues in its background task. Poll for completion.
      pollRun(runRow.id)
    } catch {
      setRunError(errorMessageFor(null))
      setRunning(false)
    }
  }

  return (
    <Modal title="New shortlist" onClose={onClose} maxWidth={640} closeOnBackdrop={!running}>
      <div style={s.body}>
        {!running && !timedOut && (
          <>
            <label style={s.fieldLabel}>
              Vertical
              <div style={s.segmented}>
                {VERTICALS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    style={{ ...s.segment, ...(vertical === v ? s.segmentActive : null) }}
                    onClick={() => setVertical(v)}
                  >
                    {VERTICAL_LABELS[v]}
                  </button>
                ))}
              </div>
            </label>

            <label style={s.fieldLabel}>
              Channel
              <div style={s.segmented}>
                {CHANNELS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    style={{ ...s.segment, ...(channel === c ? s.segmentActive : null) }}
                    onClick={() => setChannel(c)}
                  >
                    {CHANNEL_LABELS[c]}
                  </button>
                ))}
              </div>
            </label>

            <label style={s.fieldLabel}>
              Volume
              <select style={s.select} value={volume} onChange={(e) => setVolume(Number(e.target.value))}>
                {VOLUME_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>

            <label style={s.fieldLabel}>
              Upload LinkedIn screenshots
              <span style={s.subLabel}>Waiting list, recently connected, recently viewed — upload as many as needed.</span>
            </label>
            <ScreenshotDropZone onSelect={handleScreenshotSelect} />

            {screenshotStaged.length > 0 && (
              <div style={s.thumbGrid}>
                {screenshotStaged.map((shot, i) => (
                  <div key={i} style={s.thumbWrap}>
                    <img src={shot.previewUrl} style={s.thumb} alt="" />
                    <button type="button" style={s.thumbRemove} onClick={() => removeScreenshot(i)} aria-label="Remove screenshot">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showLargeUploadWarning && (
              <div style={s.warningBanner}>
                <AlertTriangle size={16} color={tokens.goldDark} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  Total upload is {stagedMB}MB. Large files will be optimised automatically. For best results, crop
                  screenshots to show 10 to 15 profiles per image.
                </span>
              </div>
            )}

            {runError && (
              <div style={s.errorBanner}>
                <AlertCircle size={16} color={t.border.danger} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{runError}</span>
              </div>
            )}

            {!runError && runDisabledReason && <p style={s.hintText}>{runDisabledReason}</p>}

            <button
              type="button"
              style={{ ...s.primaryBtn, opacity: Boolean(runDisabledReason) ? 0.5 : 1 }}
              onClick={handleRunShortlist}
              disabled={Boolean(runDisabledReason)}
            >
              Run shortlist
            </button>
          </>
        )}

        {running && <ProgressStages stage={stage} percent={percent} />}

        {timedOut && (
          <div style={s.timeoutBlock}>
            <p style={s.hintText}>
              This is taking longer than expected. Check back in a moment, your results will appear in Previous runs
              when ready.
            </p>
            <button type="button" style={s.primaryBtn} onClick={onClose}>Close</button>
          </div>
        )}
      </div>
    </Modal>
  )
}

function ProgressStages({ stage, percent }: { stage: Stage | null; percent: number }) {
  const stageIndex = stage ? STAGES.findIndex((s) => s.id === stage) : -1
  return (
    <div style={s.progressBlock}>
      <div style={s.progressTrack}>
        <div style={{ ...s.progressFill, width: `${percent}%` }} />
      </div>
      <div style={s.stepList}>
        {STAGES.map((st, i) => {
          const done = stageIndex > i || percent === 100
          const active = i === stageIndex && !done
          const color = done ? t.border.success : active ? t.text.primaryBrand : t.text.muted
          return (
            <div key={st.id} style={s.stepRow}>
              <st.Icon
                size={20}
                color={color}
                {...(active ? { style: { animation: 'shortlistPulse 1s infinite' } } : {})}
              />
              <span style={s.stepLabel}>{st.label}</span>
              <span style={s.stepStatus}>{done ? 'Done' : active ? 'In progress...' : 'Pending'}</span>
            </div>
          )
        })}
      </div>
      <p style={s.percentLabel}>{percent}%</p>
      <style>{`@keyframes shortlistPulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
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

const s: Record<string, CSSProperties> = {
  body: { display: 'flex', flexDirection: 'column', gap: 16 },
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontFamily: fonts.body,
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
  segmented: { display: 'flex', gap: 6, marginTop: 6 },
  segment: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    color: t.text.secondary,
    background: t.background.subtle,
    border: `1px solid ${t.border.default}`,
    borderRadius: 999,
    padding: '6px 16px',
    cursor: 'pointer',
  },
  segmentActive: {
    background: tokens.tealLight,
    color: tokens.primary,
    borderColor: tokens.accent,
    fontWeight: 600,
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
    boxSizing: 'border-box' as const,
  },
  uploadZoneDragging: { borderColor: t.border.brand, borderStyle: 'solid', background: t.background.tint1 },
  thumbGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
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
  // Gold at 15% opacity per spec, built locally since theme.ts has no exact
  // token for this warning-fill treatment.
  warningBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    background: 'rgba(213, 176, 103, 0.15)',
    border: `1px solid ${tokens.gold}`,
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 1.5,
    color: t.text.primary,
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    background: t.background.subtle,
    border: `1px solid ${t.border.danger}`,
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 1.5,
    color: t.text.primary,
  },
  hintText: { fontFamily: fonts.body, fontSize: 13, color: t.text.muted },
  primaryBtn: {
    width: '100%',
    textAlign: 'center' as const,
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '12px 18px',
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
  },
  progressBlock: { display: 'flex', flexDirection: 'column', gap: 16 },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 4,
    background: t.border.default,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    background: t.text.primaryBrand,
    transition: `width ${motionTokens.durationBase} ${motionTokens.easeDefault}`,
  },
  stepList: { display: 'flex', flexDirection: 'column', gap: 12 },
  stepRow: { display: 'flex', alignItems: 'center', gap: 10 },
  stepLabel: { flex: 1, fontFamily: fonts.body, fontSize: 14, color: t.text.primary },
  stepStatus: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted },
  percentLabel: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted, textAlign: 'center' as const, margin: 0 },
  timeoutBlock: { display: 'flex', flexDirection: 'column', gap: 16 },
}
