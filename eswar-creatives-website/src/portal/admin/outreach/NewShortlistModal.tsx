// New Shortlist modal: single LinkedIn screenshot -> lead creation with
// immediate ICP scoring. Four steps, in order:
//   1. extract-lead-from-image (vision extraction, no storage upload)
//   2. insert the lead row
//   3. score-single-lead (text-only scoring against the selected vertical)
//   4. write the score back onto the lead row
// Steps 3/4 failing never loses the lead created in step 2 - every such
// error state carries the lead's id so "View lead" still works.
import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts } from '../../theme'
import { Modal } from '../ui'
import { Spinner } from '../../Spinner'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { ScoreRingDisplay } from '../../components/shared/ScoreRing'
import { VERTICAL_LABELS, splitName, type Vertical } from '../../components/shortlist/types'

const VERTICALS: Vertical[] = ['design_systems', 'branding']
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024
const SETTINGS_PATH = '/portal/admin/settings'
const LEADS_TAB_PATH = '/portal/admin/outreach?tab=leads'

type ExtractedLeadData = {
  first_name: string | null
  last_name: string | null
  full_name: string | null
  role_title: string | null
  company: string | null
  email: string | null
  phone_business: string | null
  phone_personal: string | null
  website: string | null
  linkedin_url: string | null
  location: string | null
  country: string | null
  notes: string | null
}

type CreatedLead = {
  id: string
  name: string
  company: string
  icp_score: number
  icp_match_reason: string | null
}

type ErrorCode =
  | 'extraction_failed'
  | 'invalid_image'
  | 'invalid_media_type'
  | 'image_too_large'
  | 'create_failed'
  | 'lead_not_found'
  | 'no_icp'
  | 'anthropic_timeout'
  | 'scoring_failed'
  | 'parse_failed'
  | 'network_error'

type Step =
  | { kind: 'upload' }
  | { kind: 'extracting' }
  | { kind: 'creating' }
  | { kind: 'scoring' }
  | { kind: 'saving' }
  | { kind: 'success'; lead: CreatedLead }
  | { kind: 'error'; code: string; leadId: string | null }

type ErrorAction = 'retry' | 'view_lead' | 'view_leads' | 'settings'

// code is whatever the edge functions actually return, which is only
// guaranteed to be a string - not narrowed to ErrorCode - so an
// unrecognized code (e.g. an auth failure never expected mid-flow) falls
// through to the generic message instead of crashing on a missing case.
function errorCopy(code: string): { message: string; action: ErrorAction } {
  switch (code as ErrorCode) {
    case 'extraction_failed':
    case 'invalid_image':
      return {
        message: 'Could not read the screenshot. Try a higher resolution image or a different crop.',
        action: 'retry',
      }
    case 'image_too_large':
      return { message: 'Image is over 5MB. Please compress or crop it before uploading.', action: 'retry' }
    case 'invalid_media_type':
      return { message: 'Only PNG, JPG, or WEBP files are supported.', action: 'retry' }
    case 'create_failed':
      return { message: 'Could not save lead. Try again.', action: 'retry' }
    case 'lead_not_found':
      return {
        message: 'Lead was created but could not be scored. Find it in the Leads tab and score it manually.',
        action: 'view_leads',
      }
    case 'no_icp':
      return { message: 'No ICP profile found for this vertical. Set one in Settings before scoring.', action: 'settings' }
    case 'anthropic_timeout':
      return {
        message: 'Scoring timed out. Lead was created without a score. You can score it from the lead drawer.',
        action: 'view_lead',
      }
    case 'scoring_failed':
    case 'parse_failed':
      return { message: 'Scoring failed. Lead was created without a score.', action: 'view_lead' }
    case 'network_error':
      return { message: 'Connection error. Check your internet and try again.', action: 'retry' }
    default:
      return { message: 'Something went wrong. Check your connection and try again.', action: 'retry' }
  }
}

function resolveName(extracted: ExtractedLeadData): { first: string; last: string | null } {
  if (extracted.first_name) return { first: extracted.first_name, last: extracted.last_name }
  if (extracted.full_name) return splitName(extracted.full_name)
  return { first: 'Unknown', last: null }
}

function formatFileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const LOADING_LABEL: Record<'extracting' | 'creating' | 'scoring' | 'saving', string> = {
  extracting: 'Reading screenshot...',
  creating: 'Creating lead...',
  scoring: 'Scoring against ICP...',
  saving: 'Saving score...',
}

export function NewShortlistModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  const [vertical, setVertical] = useState<Vertical>('design_systems')
  const [staged, setStaged] = useState<{ file: File; previewUrl: string } | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>({ kind: 'upload' })

  function reset() {
    setStaged((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl)
      return null
    })
    setUploadError(null)
    setStep({ kind: 'upload' })
  }

  function selectFile(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Only PNG, JPG, or WEBP files are supported.')
      return
    }
    if (file.size > MAX_BYTES) {
      setUploadError('Image is over 5MB. Please compress or crop it before uploading.')
      return
    }
    setUploadError(null)
    setStaged((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl)
      return { file, previewUrl: URL.createObjectURL(file) }
    })
  }

  async function handleSubmit() {
    if (!staged) return
    let createdLeadId: string | null = null
    setStep({ kind: 'extracting' })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token ?? ''
      const base64 = await fileToBase64(staged.file)

      // Step 1: extract lead fields from the screenshot.
      const extractRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-lead-from-image`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ image_base64: base64, media_type: staged.file.type }),
        }
      )
      const extractJson = await extractRes.json().catch(() => null)
      if (!extractRes.ok || !extractJson?.data) {
        const code: string = extractJson?.error ?? 'extraction_failed'
        setStep({ kind: 'error', code, leadId: null })
        return
      }
      const extracted = extractJson.data as ExtractedLeadData

      // Step 2: create the lead. segment is fixed to 'saas_product' (matching
      // CandidateCard's own precedent for shortlist-sourced leads) - vertical
      // is the field score-single-lead actually keys ICP selection on;
      // segment and vertical are separate taxonomies, not derived from each
      // other.
      setStep({ kind: 'creating' })
      const { first, last } = resolveName(extracted)
      const { data: newLead, error: createErr } = await supabase
        .from('leads')
        .insert({
          first_name: first,
          last_name: last,
          company: extracted.company || 'Unknown',
          role_title: extracted.role_title,
          email: extracted.email,
          phone_business: extracted.phone_business,
          phone_personal: extracted.phone_personal,
          linkedin_url: extracted.linkedin_url,
          website: extracted.website,
          country: extracted.country,
          notes: extracted.notes,
          vertical,
          segment: 'saas_product',
          source: 'smart_shortlist',
          status: 'new',
          icp_score: null,
        })
        .select('id, first_name, last_name, company')
        .single()
      if (createErr || !newLead) {
        setStep({ kind: 'error', code: 'create_failed', leadId: null })
        return
      }
      createdLeadId = newLead.id

      // Step 3: score the newly created lead.
      setStep({ kind: 'scoring' })
      const scoreRes = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/score-single-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lead_id: newLead.id, vertical }),
      })
      const scoreJson = await scoreRes.json().catch(() => null)
      if (!scoreRes.ok || typeof scoreJson?.icp_score !== 'number') {
        const code: string = scoreJson?.error ?? 'scoring_failed'
        setStep({ kind: 'error', code, leadId: createdLeadId })
        return
      }

      // Step 4: write the score back onto the lead row.
      setStep({ kind: 'saving' })
      const { error: updateErr } = await supabase
        .from('leads')
        .update({ icp_score: scoreJson.icp_score, icp_match_reason: scoreJson.icp_match_reason ?? null })
        .eq('id', newLead.id)
      if (updateErr) {
        setStep({ kind: 'error', code: 'scoring_failed', leadId: createdLeadId })
        return
      }

      setStep({
        kind: 'success',
        lead: {
          id: newLead.id,
          name: `${newLead.first_name} ${newLead.last_name ?? ''}`.trim(),
          company: newLead.company,
          icp_score: scoreJson.icp_score,
          icp_match_reason: scoreJson.icp_match_reason ?? null,
        },
      })
    } catch {
      setStep({ kind: 'error', code: 'network_error', leadId: createdLeadId })
    }
  }

  function viewLead(leadId: string | null) {
    onClose()
    navigate(leadId ? `${LEADS_TAB_PATH}&leadId=${leadId}` : LEADS_TAB_PATH)
  }

  const loadingKinds = ['extracting', 'creating', 'scoring', 'saving'] as const
  const isLoading = (loadingKinds as readonly string[]).includes(step.kind)

  return (
    <Modal title="New shortlist" onClose={onClose} maxWidth={520} closeOnBackdrop={!isLoading}>
      <div style={s.body}>
        {step.kind === 'upload' && (
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
              LinkedIn screenshot
              <span style={s.subLabel}>A single profile screenshot. PNG, JPG, or WEBP, up to 5MB.</span>
            </label>
            <ScreenshotUpload staged={staged} onSelect={selectFile} />
            {uploadError && <p style={s.uploadErrorText}>{uploadError}</p>}

            <button
              type="button"
              style={{ ...s.primaryBtn, opacity: staged ? 1 : 0.5 }}
              onClick={handleSubmit}
              disabled={!staged}
            >
              {staged ? 'Extract and add lead' : 'Upload a screenshot to continue'}
            </button>
          </>
        )}

        {isLoading && (
          <div style={s.loadingBlock}>
            <Spinner size={28} color={tokens.primary} />
            <p style={s.loadingText}>{LOADING_LABEL[step.kind as keyof typeof LOADING_LABEL]}</p>
          </div>
        )}

        {step.kind === 'success' && (
          <div style={s.successBlock}>
            <CheckCircle2 size={40} color={tokens.primary} />
            <div style={s.successHead}>
              <span style={s.successName}>{step.lead.name}</span>
              <span style={s.successCompany}>{step.lead.company}</span>
            </div>
            <ScoreRingDisplay score={step.lead.icp_score} />
            {step.lead.icp_match_reason && <p style={s.reasonText}>{step.lead.icp_match_reason}</p>}
            <div style={{ ...s.actionRow, flexDirection: isMobile ? 'column' : 'row' }}>
              <button type="button" style={s.primaryBtn} onClick={() => viewLead(step.lead.id)}>
                View lead
              </button>
              <button type="button" style={s.secondaryBtn} onClick={reset}>
                Add another
              </button>
            </div>
          </div>
        )}

        {step.kind === 'error' && (
          <ErrorBlock
            code={step.code}
            leadId={step.leadId}
            isMobile={isMobile}
            onRetry={reset}
            onViewLead={() => viewLead(step.leadId)}
            onViewLeads={() => viewLead(null)}
            onSettings={() => { onClose(); navigate(SETTINGS_PATH) }}
          />
        )}
      </div>
    </Modal>
  )
}

function ErrorBlock({
  code,
  isMobile,
  onRetry,
  onViewLead,
  onViewLeads,
  onSettings,
}: {
  code: string
  leadId: string | null
  isMobile: boolean
  onRetry: () => void
  onViewLead: () => void
  onViewLeads: () => void
  onSettings: () => void
}) {
  const { message, action } = errorCopy(code)
  return (
    <div style={s.errorBlock}>
      <div style={s.errorBanner}>
        <AlertCircle size={16} color={t.border.danger} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>{message}</span>
      </div>
      <div style={{ ...s.actionRow, flexDirection: isMobile ? 'column' : 'row' }}>
        {action === 'retry' && (
          <button type="button" style={s.primaryBtn} onClick={onRetry}>Try again</button>
        )}
        {action === 'view_lead' && (
          <button type="button" style={s.primaryBtn} onClick={onViewLead}>View lead</button>
        )}
        {action === 'view_leads' && (
          <button type="button" style={s.primaryBtn} onClick={onViewLeads}>View leads</button>
        )}
        {action === 'settings' && (
          <button type="button" style={s.primaryBtn} onClick={onSettings}>Go to settings</button>
        )}
      </div>
    </div>
  )
}

function ScreenshotUpload({
  staged,
  onSelect,
}: {
  staged: { file: File; previewUrl: string } | null
  onSelect: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function pickFirst(files: FileList | null) {
    const file = files?.[0]
    if (file) onSelect(file)
  }

  return (
    <>
      <button
        type="button"
        style={{ ...s.uploadZone, ...(dragging ? s.uploadZoneDragging : null) }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          pickFirst(e.dataTransfer.files)
        }}
      >
        {staged ? (
          <div style={s.stagedRow}>
            <img src={staged.previewUrl} style={s.thumb} alt="" />
            <div style={s.stagedInfo}>
              <span style={s.stagedName}>{staged.file.name}</span>
              <span style={s.stagedSize}>{formatFileSize(staged.file.size)}</span>
            </div>
            <span style={s.replaceHint}>Click to replace</span>
          </div>
        ) : (
          <>
            <Upload size={13} color={t.text.tertiary} />
            {dragging ? 'Drop to upload' : 'Drop a screenshot here, or click to browse'}
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        style={{ display: 'none' }}
        onChange={(e) => {
          pickFirst(e.target.files)
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
  stagedRow: { display: 'flex', alignItems: 'center', gap: 10, width: '100%' },
  thumb: { width: 50, height: 50, borderRadius: 4, objectFit: 'cover' as const, flexShrink: 0 },
  stagedInfo: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0, textAlign: 'left' as const },
  stagedName: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: t.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  stagedSize: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted },
  replaceHint: { fontFamily: fonts.body, fontSize: 12, color: t.text.tertiary, flexShrink: 0 },
  uploadErrorText: { fontFamily: fonts.body, fontSize: 12, color: t.text.danger, margin: 0 },
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
  secondaryBtn: {
    width: '100%',
    textAlign: 'center' as const,
    background: 'none',
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '12px 18px',
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
  },
  loadingBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '32px 0' },
  loadingText: { fontFamily: fonts.body, fontSize: 14, color: t.text.secondary, margin: 0 },
  successBlock: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '8px 0 0' },
  successHead: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, marginTop: 4 },
  successName: { fontFamily: fonts.heading, fontSize: 20, fontWeight: 600, color: t.text.primary },
  successCompany: { fontFamily: fonts.body, fontSize: 13, color: t.text.muted },
  reasonText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
    textAlign: 'center' as const,
    lineHeight: 1.5,
    margin: 0,
    maxWidth: 360,
  },
  actionRow: { display: 'flex', gap: 10, width: '100%', marginTop: 8 },
  errorBlock: { display: 'flex', flexDirection: 'column', gap: 8 },
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
}
