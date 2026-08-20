import { useRef, useState } from 'react'
import { UploadCloud, AlertCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { t, tokens, fonts, motionTokens } from '../../../portal/theme'
import { invokeErrorCode } from '../../../portal/utils/invokeError'

export type ExtractedLead = {
  first_name: string | null
  last_name: string | null
  company: string | null
  role_title: string | null
  email: string | null
  linkedin_url: string | null
}

// Screenshot-to-lead flow shared by the onboarding Step 4 and the Leads page
// "Add lead" button, so there's exactly one implementation of the
// extract-lead-from-image call and its graceful-failure handling. That
// function is admin/owner + outreach_user gated (rate-limited for
// outreach_user, see migration 0102) - a 403/429 here is an expected
// outcome, not a bug, and this component surfaces it as a plain message
// with the confirm step simply never becoming available.
export function LeadImageUploader({
  onConfirm,
  confirmLabel = 'Confirm and add lead',
}: {
  onConfirm: (lead: ExtractedLead) => void | Promise<void>
  confirmLabel?: string
}) {
  const [leadImage, setLeadImage] = useState<{ preview: string; base64: string; mediaType: string } | null>(null)
  const [extractedLead, setExtractedLead] = useState<ExtractedLead | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function reset() {
    setLeadImage(null)
    setExtractedLead(null)
    setExtractError(null)
  }

  function handleFileSelect(file: File) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setExtractError('Unsupported format. Please use jpg, png, or webp.')
      return
    }
    setExtractError(null)
    setExtractedLead(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setLeadImage({ preview: dataUrl, base64, mediaType: file.type })
    }
    reader.readAsDataURL(file)
  }

  async function handleExtract() {
    if (!leadImage) return
    setExtracting(true)
    setExtractError(null)
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token ?? ''
    const { data, error: fnErr } = await supabase.functions.invoke('extract-lead-from-image', {
      body: { image_base64: leadImage.base64, media_type: leadImage.mediaType },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
    const code = await invokeErrorCode(data, fnErr)
    if (code === 'rate_limit_exceeded') {
      setExtractError('You have hit the daily limit for automatic extraction (20/day). Add this lead manually for now.')
      setExtracting(false)
      return
    }
    if (code || !data?.data) {
      setExtractError('Could not extract details automatically right now. Try again, or add this lead manually.')
      setExtracting(false)
      return
    }
    setExtractedLead(data.data as ExtractedLead)
    setExtracting(false)
  }

  async function handleConfirm() {
    if (!extractedLead?.first_name || !extractedLead?.company) return
    setConfirming(true)
    await onConfirm(extractedLead)
    setConfirming(false)
    reset()
  }

  return (
    <div style={styles.wrap}>
      <div
        style={styles.uploadArea}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const file = e.dataTransfer.files?.[0]
          if (file) handleFileSelect(file)
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(file)
          }}
        />
        <UploadCloud size={32} color={t.text.muted} />
        <span style={styles.uploadText}>Drop screenshot here or tap to upload</span>
        <span style={styles.uploadSub}>JPG, PNG up to 5MB</span>
      </div>

      {leadImage && !extractedLead && (
        <>
          <img src={leadImage.preview} alt="" style={styles.preview} />
          <button type="button" onClick={handleExtract} disabled={extracting} style={styles.primaryButton}>
            {extracting ? 'Extracting...' : 'Extract details'}
          </button>
        </>
      )}

      {extractError && (
        <div style={styles.error}>
          <AlertCircle size={14} />
          <span>{extractError}</span>
        </div>
      )}

      {extractedLead && (
        <>
          <div style={styles.extractedCard}>
            <Field label="Name" value={[extractedLead.first_name, extractedLead.last_name].filter(Boolean).join(' ')} />
            <Field label="Company" value={extractedLead.company} />
            <Field label="Title" value={extractedLead.role_title} />
            <Field label="Email" value={extractedLead.email} />
            <Field label="LinkedIn" value={extractedLead.linkedin_url} />
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirming || !extractedLead.first_name || !extractedLead.company}
            style={styles.primaryButton}
          >
            {confirming ? 'Adding...' : confirmLabel}
          </button>
        </>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div style={styles.extractedField}>
      <span style={styles.extractedLabel}>{label}</span>
      <span style={styles.extractedValue}>{value || '—'}</span>
    </div>
  )
}

const styles: Record<string, any> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 12 },
  uploadArea: {
    border: `2px dashed ${t.border.default}`,
    borderRadius: 12,
    padding: '40px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
  },
  uploadText: { fontFamily: fonts.body, fontSize: 14, color: t.text.secondary },
  uploadSub: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted },
  preview: { width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 8, border: `1px solid ${t.border.subtle}` },
  extractedCard: {
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 10,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  extractedField: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  extractedLabel: { fontFamily: fonts.body, fontSize: 13, color: t.text.muted },
  extractedValue: { fontFamily: fonts.body, fontSize: 13, color: t.text.primary, fontWeight: 500, textAlign: 'right' },
  error: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.ruby,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    background: tokens.primary,
    color: t.text.onPrimary,
    border: 'none',
    borderRadius: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
}
