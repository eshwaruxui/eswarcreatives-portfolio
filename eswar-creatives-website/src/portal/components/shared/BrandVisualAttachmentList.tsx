// Multi-file attachment list for a Brand Visual Guide item (migration
// 0097). Mirrors AttachmentSection.tsx's interaction pattern (drag+drop+
// paste+click upload, inline delete confirm, signed-URL download) rather
// than reusing that component directly -- AttachmentSection is tightly
// coupled to project_attachments/project_stage_attachments and the
// stage-attachments bucket (hardcoded table names, 10MB limit, MIME-typed
// file_type), none of which fit here. Admin-only for now: this list is
// rendered inside ItemFormModal; client/public read-only display goes
// through BrandVisualRenderer instead, which never uploads or deletes.
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Download, File as FileIcon, Music, Trash2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { t, fonts, motionTokens } from '../../theme'
import { isAudioFileType } from '../../utils/brandVisual'
import type { BrandVisualItemAttachment } from '../../utils/brandVisual'

const MAX_BYTES = 50 * 1024 * 1024

function formatBytes(bytes: number | null): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function BrandVisualAttachmentList({
  itemId,
  clientId,
  attachments: initial,
  onAttachmentsChange,
}: {
  itemId: string
  clientId: string
  attachments: BrandVisualItemAttachment[]
  onAttachmentsChange: (attachments: BrandVisualItemAttachment[]) => void
}) {
  const [attachments, setAttachments] = useState<BrandVisualItemAttachment[]>(initial)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [zoneHovered, setZoneHovered] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const handleFileSelectRef = useRef(handleFileSelect)
  handleFileSelectRef.current = handleFileSelect

  // Keep in sync if the caller's own copy changes (e.g. reopening the
  // modal on a different item) -- id-keyed by the caller via `key` in
  // practice, but this guards the same case AttachmentSection guards.
  useEffect(() => {
    setAttachments(initial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId])

  useEffect(() => {
    if (!zoneHovered) return
    function onPaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of Array.from(items)) {
        if (item.kind === 'file') {
          const file = item.getAsFile()
          if (file) { void handleFileSelectRef.current(file); break }
        }
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [zoneHovered])

  function sync(next: BrandVisualItemAttachment[]) {
    setAttachments(next)
    onAttachmentsChange(next)
  }

  async function download(att: BrandVisualItemAttachment) {
    const { data, error } = await supabase.storage
      .from('brand-visual-files')
      .createSignedUrl(att.storage_path, 3600, { download: att.file_name })
    if (error || !data?.signedUrl) return
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function handleFileSelect(file: File) {
    if (file.size > MAX_BYTES) {
      setUploadError('File too large (max 50MB).')
      return
    }
    setUploadError(null)
    setUploading(true)

    const storagePath = `${clientId}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('brand-visual-files').upload(storagePath, file)
    if (upErr) {
      setUploading(false)
      setUploadError('Upload failed. Please try again.')
      return
    }

    // Extension, not MIME type -- matches the file_type convention every
    // other Brand Visual Guide file already uses (ExtensionBadge,
    // isAudioFileType), not AttachmentSection's file.type.
    const ext = file.name.includes('.') ? file.name.split('.').pop()!.toUpperCase() : null
    const nextSortOrder = Math.max(0, ...attachments.map((a) => a.sort_order)) + 1

    const { data: row, error: insErr } = await supabase
      .from('brand_visual_item_attachments')
      .insert({
        item_id: itemId,
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        file_type: ext,
        sort_order: nextSortOrder,
      })
      .select('*')
      .single()

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''

    if (insErr || !row) {
      setUploadError('File uploaded but could not be saved. Refresh to verify.')
      return
    }
    sync([...attachments, row as BrandVisualItemAttachment])
  }

  async function deleteAttachment(att: BrandVisualItemAttachment) {
    await supabase.storage.from('brand-visual-files').remove([att.storage_path])
    await supabase.from('brand_visual_item_attachments').delete().eq('id', att.id)
    sync(attachments.filter((a) => a.id !== att.id))
    setConfirmDeleteId(null)
  }

  return (
    <div style={s.root}>
      {attachments.length > 0 && (
        <ul style={s.fileList}>
          {attachments.map((att) => {
            const isAudio = isAudioFileType(att.file_type)
            return (
              <li key={att.id} style={s.fileRow}>
                <span style={s.fileIconBox}>
                  {isAudio ? <Music size={14} /> : <FileIcon size={14} />}
                </span>
                <div style={s.fileMeta}>
                  <span style={s.fileName}>{att.file_name}</span>
                  <span style={s.fileSize}>
                    {att.file_type ?? ''}
                    {att.file_type && att.file_size != null ? ' · ' : ''}
                    {formatBytes(att.file_size)}
                  </span>
                </div>
                <button
                  type="button"
                  style={s.iconBtn}
                  onClick={() => void download(att)}
                  aria-label={`Download ${att.file_name}`}
                >
                  <Download size={14} />
                </button>
                {confirmDeleteId === att.id ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button type="button" style={s.confirmDeleteBtn} onClick={() => void deleteAttachment(att)}>
                      Delete
                    </button>
                    <button type="button" style={s.confirmCancelBtn} onClick={() => setConfirmDeleteId(null)}>
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    style={s.iconBtn}
                    onClick={() => setConfirmDeleteId(att.id)}
                    aria-label={`Delete ${att.file_name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {uploadError && <p style={s.uploadError}>{uploadError}</p>}

      <button
        type="button"
        style={{ ...s.uploadZone, ...(dragging ? s.uploadZoneDragging : null) }}
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        onMouseEnter={() => setZoneHovered(true)}
        onMouseLeave={() => setZoneHovered(false)}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files?.[0]
          if (file) void handleFileSelect(file)
        }}
      >
        {uploading
          ? 'Uploading…'
          : dragging
            ? 'Drop to upload'
            : attachments.length === 0
              ? 'Drop a file here, paste with Cmd+V, or click to upload (max 50MB)'
              : '+ Add another attachment'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFileSelect(file)
        }}
      />
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', gap: 8 },
  fileList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 8,
    background: t.background.subtle,
    border: `1px solid ${t.border.subtle}`,
  },
  fileIconBox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    background: t.background.muted,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: t.text.secondary,
    flexShrink: 0,
  },
  fileMeta: { display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 },
  fileName: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    color: t.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileSize: { fontFamily: fonts.body, fontSize: 11.5, color: t.text.tertiary },
  iconBtn: {
    border: 'none',
    background: 'transparent',
    color: t.text.secondary,
    cursor: 'pointer',
    padding: 4,
    borderRadius: 6,
    display: 'flex',
    flexShrink: 0,
  },
  confirmDeleteBtn: { color: t.text.danger, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12.5 },
  confirmCancelBtn: { color: t.text.secondary, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5 },
  uploadZone: {
    background: 'none',
    border: `1.5px dashed ${t.border.default}`,
    borderRadius: 10,
    padding: '14px 12px',
    width: '100%',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
    cursor: 'pointer',
    textAlign: 'center',
    transition: `border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}, background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
    boxSizing: 'border-box',
  },
  uploadZoneDragging: { borderColor: t.border.brand, background: t.background.tint1 },
  uploadError: { fontSize: 12.5, color: t.text.danger, margin: 0 },
}
