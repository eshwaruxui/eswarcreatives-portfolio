// Shared attachment section atom. Admin (canUpload=true): upload zone + delete.
// Client (canUpload=false): read-only file list with download links.
// Hidden entirely for clients when the category has no files.
// Downloads use Supabase signed URLs (1-hour expiry) to keep the bucket private.
import { useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Download, File, FileText, Image, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'

export type AttachmentCategory = 'design_brief' | 'development' | 'output_delivery'

export type ProjectStageAttachment = {
  id: string
  project_id: string
  stage_number: number
  category: AttachmentCategory
  file_name: string
  storage_path: string
  file_size: number | null
  file_type: string | null
  uploaded_at: string
}

const CATEGORY_LABELS: Record<AttachmentCategory, string> = {
  design_brief:    'Design Brief',
  development:     'Development',
  output_delivery: 'Output & Delivery',
}

// Accepted MIME types for uploads
const ACCEPT =
  '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4,.zip'

function formatBytes(n: number | null): string {
  if (n == null) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mimeType }: { mimeType: string | null }) {
  const isPdf   = mimeType === 'application/pdf'
  const isImage = mimeType?.startsWith('image/') ?? false
  const color   = isPdf ? tokens.ruby : isImage ? tokens.accent : t.text.muted
  const Icon    = isPdf ? FileText : isImage ? Image : File
  return (
    <span
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        background: isPdf
          ? tokens.rubyLight
          : isImage
          ? tokens.tealLight
          : t.background.muted,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color,
      }}
    >
      <Icon size={14} />
    </span>
  )
}

export function AttachmentSection({
  projectId,
  stageNumber,
  category,
  attachments: initial,
  canUpload,
  onAttachmentsChange,
}: {
  projectId: string
  stageNumber: number
  category: AttachmentCategory
  attachments: ProjectStageAttachment[]
  canUpload: boolean
  onAttachmentsChange: (attachments: ProjectStageAttachment[]) => void
}) {
  const [attachments, setAttachments] = useState<ProjectStageAttachment[]>(initial)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function sync(next: ProjectStageAttachment[]) {
    setAttachments(next)
    onAttachmentsChange(next)
  }

  async function download(file: ProjectStageAttachment) {
    const { data, error } = await supabase.storage
      .from('stage-attachments')
      .createSignedUrl(file.storage_path, 3600)
    if (error || !data?.signedUrl) return // H9: silent failure, button stays
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)
    setUploading(true)
    setUploadPct(0)

    const { data: sess } = await supabase.auth.getUser()
    const uid = sess.user?.id ?? null
    const storagePath = `${projectId}/${stageNumber}/${category}/${Date.now()}_${file.name}`

    const { error: upErr } = await supabase.storage
      .from('stage-attachments')
      .upload(storagePath, file)

    if (upErr) {
      setUploading(false)
      setUploadPct(0)
      // H9: plain-language message, never raw Supabase error
      setUploadError('Upload failed. Check file size and try again.')
      return
    }

    setUploadPct(100)
    const { data: row, error: insErr } = await supabase
      .from('project_stage_attachments')
      .insert({
        project_id: projectId,
        stage_number: stageNumber,
        category,
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        file_type: file.type || null,
        uploaded_by: uid,
      })
      .select('*')
      .single()

    setUploading(false)
    setUploadPct(0)
    if (fileInputRef.current) fileInputRef.current.value = ''

    if (insErr || !row) {
      setUploadError('File uploaded but could not be saved. Refresh to verify.')
      return
    }
    sync([...attachments, row as ProjectStageAttachment])
  }

  async function deleteAttachment(att: ProjectStageAttachment) {
    await supabase.storage.from('stage-attachments').remove([att.storage_path])
    await supabase.from('project_stage_attachments').delete().eq('id', att.id)
    sync(attachments.filter((a) => a.id !== att.id))
    setConfirmDeleteId(null)
  }

  const label = CATEGORY_LABELS[category]

  // H6: clients see nothing for empty sections — no clutter for pending work
  if (!canUpload && attachments.length === 0) return null

  return (
    <div style={s.root}>
      {/* Section header */}
      <div style={s.sectionHead}>
        <span style={s.categoryLabel}>{label}</span>
        {attachments.length > 0 && (
          <span style={s.fileCount}>({attachments.length} {attachments.length === 1 ? 'file' : 'files'})</span>
        )}
      </div>

      {/* File list */}
      {attachments.length > 0 && (
        <ul style={s.fileList}>
          {attachments.map((att) => (
            <li
              key={att.id}
              style={s.fileRow}
              onMouseEnter={() => setHoveredId(att.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <FileIcon mimeType={att.file_type} />
              <div style={s.fileMeta}>
                <span style={s.fileName}>{att.file_name}</span>
                {att.file_size != null && (
                  <span style={s.fileSize}>{formatBytes(att.file_size)}</span>
                )}
              </div>
              <button
                type="button"
                style={s.downloadBtn}
                onClick={() => void download(att)}
                aria-label={`Download ${att.file_name}`}
              >
                <Download size={14} />
              </button>
              {canUpload && confirmDeleteId === att.id ? (
                <span style={s.confirmRow}>
                  <button type="button" style={s.confirmYes} onClick={() => void deleteAttachment(att)}>
                    Delete
                  </button>
                  <button type="button" style={s.confirmNo} onClick={() => setConfirmDeleteId(null)}>
                    Cancel
                  </button>
                </span>
              ) : canUpload ? (
                <button
                  type="button"
                  style={{
                    ...s.deleteBtn,
                    opacity: hoveredId === att.id ? 1 : 0,
                  }}
                  onClick={() => setConfirmDeleteId(att.id)}
                  aria-label={`Delete ${att.file_name}`}
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {/* Admin upload zone */}
      {canUpload && (
        <>
          {uploadError && <p style={s.uploadError}>{uploadError}</p>}
          {uploading && (
            <div style={s.uploadProgress}>
              <div style={{ ...s.uploadFill, width: `${uploadPct}%` }} />
            </div>
          )}
          <button
            type="button"
            style={s.uploadZone}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading
              ? 'Uploading...'
              : attachments.length === 0
              ? 'Drop files here or click to upload'
              : '+ Add another file'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            style={{ display: 'none' }}
            onChange={(e) => void handleUpload(e)}
          />
        </>
      )}
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', gap: 6 },
  sectionHead: { display: 'flex', alignItems: 'center', gap: 6 },
  categoryLabel: {
    fontFamily: fonts.body,
    fontWeight: 500,
    fontSize: 12,
    color: t.text.secondary,
  },
  fileCount: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted },
  fileList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 8px',
    borderRadius: 8,
    background: t.background.subtle,
    border: `1px solid ${t.border.subtle}`,
  },
  fileMeta: { display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 },
  fileName: {
    fontFamily: fonts.body,
    fontWeight: 500,
    fontSize: 13,
    color: t.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileSize: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted },
  downloadBtn: {
    background: 'none',
    border: 'none',
    padding: 4,
    cursor: 'pointer',
    color: t.text.secondary,
    display: 'flex',
    flexShrink: 0,
    transition: `color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    padding: 4,
    cursor: 'pointer',
    color: tokens.ruby,
    display: 'flex',
    flexShrink: 0,
    transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  confirmRow: { display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 },
  confirmYes: {
    fontFamily: fonts.body, fontSize: 11, fontWeight: 600, color: tokens.ruby,
    background: tokens.rubyLight, border: `1px solid ${tokens.ruby}`,
    borderRadius: 4, padding: '2px 8px', cursor: 'pointer',
  },
  confirmNo: {
    fontFamily: fonts.body, fontSize: 11, color: t.text.secondary,
    background: 'none', border: `1px solid ${t.border.default}`,
    borderRadius: 4, padding: '2px 8px', cursor: 'pointer',
  },
  uploadZone: {
    background: 'none',
    border: `1px dashed ${t.border.medium}`,
    borderRadius: 8,
    padding: '10px 16px',
    width: '100%',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.tertiary,
    cursor: 'pointer',
    textAlign: 'center' as const,
    transition: `border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
    boxSizing: 'border-box' as const,
  },
  uploadProgress: {
    height: 3,
    background: t.background.muted,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 4,
  },
  uploadFill: {
    height: '100%',
    background: tokens.accent,
    borderRadius: 999,
    transition: `width ${motionTokens.durationBase} ${motionTokens.easeDefault}`,
  },
  uploadError: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.ruby,
    margin: '0 0 4px',
    background: tokens.rubyLight,
    padding: '6px 10px',
    borderRadius: 6,
  },
}
