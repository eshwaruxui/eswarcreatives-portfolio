// Shared Outputs folder/file browser. Admin (canEdit=true): full CRUD on
// folders and files, drag-to-move between directories, "Copy link" share.
// Client (canEdit=false): read-only browse; row click opens the file
// preview via onOpenPreview, which the caller resolves into a Lightbox.
// Single-pane breadcrumb drill-down (not a two-pane tree+detail split) so it
// fits comfortably inside the admin SidePanel's fixed width.
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, DragEvent } from 'react'
import { ChevronRight, File, FileText, Folder, FolderPlus, Image, Link as LinkIcon, Pencil, Trash2, Upload, Video } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'
import { formatPortalDate } from '../utils/formatDate'
import { formatBytes } from '../utils/formatBytes'
import { fileKind } from '../utils/fileKind'

export type OutputFolder = {
  id: string
  project_id: string
  parent_folder_id: string | null
  name: string
  sort_order: number
}

export type OutputFile = {
  id: string
  project_id: string
  folder_id: string | null
  file_name: string
  storage_path: string
  file_size: number | null
  file_type: string | null
  sort_order: number
  uploaded_at: string
}

const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.mp4,.mov,.zip'
const MAX_BYTES = 50 * 1024 * 1024

type DragNode = { type: 'folder' | 'file'; id: string }

// True when candidateId is targetAncestorId itself, or a descendant of it --
// i.e. moving targetAncestorId's subtree onto candidateId would be a cycle.
function isSelfOrDescendant(folders: OutputFolder[], candidateId: string, targetAncestorId: string): boolean {
  let current: OutputFolder | undefined = folders.find((f) => f.id === candidateId)
  while (current) {
    if (current.id === targetAncestorId) return true
    if (!current.parent_folder_id) return false
    current = folders.find((f) => f.id === current!.parent_folder_id)
  }
  return false
}

function RowIcon({ isFolder, mimeType }: { isFolder: boolean; mimeType: string | null }) {
  if (isFolder) {
    return (
      <span style={{ ...s.rowIcon, background: tokens.goldLight, color: tokens.goldDark }}>
        <Folder size={14} />
      </span>
    )
  }
  const kind = fileKind(mimeType)
  const color = kind === 'pdf' ? tokens.ruby : kind === 'image' ? tokens.accent : t.text.muted
  const bg    = kind === 'pdf' ? tokens.rubyLight : kind === 'image' ? tokens.tealLight : t.background.muted
  const Icon  = kind === 'pdf' ? FileText : kind === 'image' ? Image : kind === 'video' ? Video : File
  return (
    <span style={{ ...s.rowIcon, background: bg, color }}>
      <Icon size={14} />
    </span>
  )
}

export function OutputsBrowser({
  projectId,
  canEdit,
  onOpenPreview,
}: {
  projectId: string
  canEdit: boolean
  onOpenPreview: (files: OutputFile[], clickedIndex: number, folderId: string | null) => void
}) {
  const [folders, setFolders] = useState<OutputFolder[]>([])
  const [files, setFiles]     = useState<OutputFile[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [addingFolder, setAddingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [renaming, setRenaming] = useState<DragNode | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<DragNode | null>(null)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)

  const dragSrcRef = useRef<DragNode | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [foldersRes, filesRes] = await Promise.all([
        supabase
          .from('project_output_folders')
          .select('id, project_id, parent_folder_id, name, sort_order')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true }),
        // public_token/public_token_expires_at are never selected here --
        // the client role never needs to see a file's share token.
        supabase
          .from('project_output_files')
          .select('id, project_id, folder_id, file_name, storage_path, file_size, file_type, sort_order, uploaded_at')
          .eq('project_id', projectId)
          .order('sort_order', { ascending: true }),
      ])
      if (foldersRes.error) throw foldersRes.error
      if (filesRes.error) throw filesRes.error
      setFolders((foldersRes.data ?? []) as OutputFolder[])
      setFiles((filesRes.data ?? []) as OutputFile[])
    } catch {
      setError('We could not load the outputs for this project. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  // Breadcrumb trail from project root down to the current folder.
  const breadcrumb: OutputFolder[] = []
  {
    let walk = folders.find((f) => f.id === currentFolderId)
    while (walk) {
      breadcrumb.unshift(walk)
      walk = folders.find((f) => f.id === walk!.parent_folder_id)
    }
  }

  const foldersHere = folders
    .filter((f) => f.parent_folder_id === currentFolderId)
    .sort((a, b) => a.sort_order - b.sort_order)
  const filesHere = files
    .filter((f) => f.folder_id === currentFolderId)
    .sort((a, b) => a.sort_order - b.sort_order)

  async function createFolder() {
    const name = newFolderName.trim()
    if (!name) { setAddingFolder(false); return }
    const siblings = folders.filter((f) => f.parent_folder_id === currentFolderId)
    const nextOrder = siblings.length > 0 ? Math.max(...siblings.map((f) => f.sort_order)) + 1 : 0
    const { data, error: insErr } = await supabase
      .from('project_output_folders')
      .insert({ project_id: projectId, parent_folder_id: currentFolderId, name, sort_order: nextOrder })
      .select('id, project_id, parent_folder_id, name, sort_order')
      .single()
    setAddingFolder(false)
    setNewFolderName('')
    if (!insErr && data) setFolders((prev) => [...prev, data as OutputFolder])
  }

  function startRename(node: DragNode, currentName: string) {
    if (!canEdit) return
    setRenaming(node)
    setRenameDraft(currentName)
  }

  async function commitRename() {
    if (!renaming) return
    const { type, id } = renaming
    const name = renameDraft.trim()
    setRenaming(null)
    if (!name) return
    if (type === 'folder') {
      const { error: updErr } = await supabase.from('project_output_folders').update({ name }).eq('id', id)
      if (!updErr) setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name } : f)))
    } else {
      const { error: updErr } = await supabase.from('project_output_files').update({ file_name: name }).eq('id', id)
      if (!updErr) setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, file_name: name } : f)))
    }
  }

  async function deleteFolder(folder: OutputFolder) {
    const { error: delErr } = await supabase.from('project_output_folders').delete().eq('id', folder.id)
    setConfirmDelete(null)
    if (!delErr) void load() // cascades / reparents on the server; simplest to resync
  }

  async function deleteFile(file: OutputFile) {
    await supabase.storage.from('project-outputs').remove([file.storage_path])
    await supabase.from('project_output_files').delete().eq('id', file.id)
    setConfirmDelete(null)
    setFiles((prev) => prev.filter((f) => f.id !== file.id))
  }

  async function handleFileSelect(file: File) {
    if (file.size > MAX_BYTES) {
      setUploadError('File too large (max 50MB).')
      return
    }
    setUploadError(null)
    setUploading(true)

    const { data: sess } = await supabase.auth.getUser()
    const uid = sess.user?.id ?? null
    const randomId = crypto.randomUUID().slice(0, 8)
    const storagePath = `${projectId}/${randomId}_${file.name}`

    const { error: upErr } = await supabase.storage.from('project-outputs').upload(storagePath, file)
    if (upErr) {
      setUploading(false)
      setUploadError('Upload failed. Please try again.')
      return
    }

    const siblings = files.filter((f) => f.folder_id === currentFolderId)
    const nextOrder = siblings.length > 0 ? Math.max(...siblings.map((f) => f.sort_order)) + 1 : 0

    const { data: row, error: insErr } = await supabase
      .from('project_output_files')
      .insert({
        project_id: projectId,
        folder_id: currentFolderId,
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        file_type: file.type || null,
        sort_order: nextOrder,
        uploaded_by: uid,
      })
      .select('id, project_id, folder_id, file_name, storage_path, file_size, file_type, sort_order, uploaded_at')
      .single()

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''

    if (insErr || !row) {
      setUploadError('File uploaded but could not be saved. Refresh to verify.')
      return
    }
    setFiles((prev) => [...prev, row as OutputFile])
  }

  async function copyShareLink(file: OutputFile) {
    const { data: token, error: rpcErr } = await supabase.rpc('regenerate_output_file_token', {
      p_output_file_id: file.id,
    })
    if (rpcErr || !token) return
    const url = `${window.location.origin}/output/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedFileId(file.id)
    setTimeout(() => setCopiedFileId((cur) => (cur === file.id ? null : cur)), 2000)
  }

  function onDragStart(e: DragEvent, node: DragNode) {
    dragSrcRef.current = node
    e.dataTransfer.effectAllowed = 'move'
  }

  function onDragOverTarget(e: DragEvent, targetId: string | null) {
    e.preventDefault()
    setDragOverId(targetId ?? 'root')
  }

  async function onDropTarget(e: DragEvent, targetFolderId: string | null) {
    e.preventDefault()
    setDragOverId(null)
    const src = dragSrcRef.current
    dragSrcRef.current = null
    if (!src) return
    setMoveError(null)

    if (src.type === 'file') {
      if (targetFolderId === (files.find((f) => f.id === src.id)?.folder_id ?? null)) return
      const { error: updErr } = await supabase
        .from('project_output_files')
        .update({ folder_id: targetFolderId })
        .eq('id', src.id)
      if (!updErr) setFiles((prev) => prev.map((f) => (f.id === src.id ? { ...f, folder_id: targetFolderId } : f)))
      return
    }

    // Folder move: block dropping onto itself or one of its own descendants.
    if (src.id === targetFolderId || (targetFolderId && isSelfOrDescendant(folders, targetFolderId, src.id))) {
      setMoveError("Can't move a folder into itself or one of its own subfolders.")
      return
    }
    const { error: updErr } = await supabase
      .from('project_output_folders')
      .update({ parent_folder_id: targetFolderId })
      .eq('id', src.id)
    if (!updErr) setFolders((prev) => prev.map((f) => (f.id === src.id ? { ...f, parent_folder_id: targetFolderId } : f)))
  }

  return (
    <div style={s.root}>
      {/* Breadcrumb */}
      <div
        style={s.breadcrumbRow}
        onDragOver={(e) => onDragOverTarget(e, null)}
        onDragLeave={() => setDragOverId((cur) => (cur === 'root' ? null : cur))}
        onDrop={(e) => void onDropTarget(e, null)}
      >
        <button
          type="button"
          style={{
            ...s.crumbBtn,
            ...(currentFolderId === null ? s.crumbBtnActive : {}),
            ...(dragOverId === 'root' ? s.dropTargetActive : {}),
          }}
          onClick={() => setCurrentFolderId(null)}
        >
          Outputs
        </button>
        {breadcrumb.map((folder) => (
          <span key={folder.id} style={s.crumbSegment}>
            <ChevronRight size={13} style={{ color: t.text.muted, flexShrink: 0 }} />
            <button
              type="button"
              style={{
                ...s.crumbBtn,
                ...(currentFolderId === folder.id ? s.crumbBtnActive : {}),
                ...(dragOverId === folder.id ? s.dropTargetActive : {}),
              }}
              onClick={() => setCurrentFolderId(folder.id)}
              onDragOver={(e) => onDragOverTarget(e, folder.id)}
              onDragLeave={() => setDragOverId((cur) => (cur === folder.id ? null : cur))}
              onDrop={(e) => void onDropTarget(e, folder.id)}
            >
              {folder.name}
            </button>
          </span>
        ))}
      </div>

      {canEdit && (
        <div style={s.toolbar}>
          <button type="button" style={s.toolbarBtn} onClick={() => setAddingFolder(true)}>
            <FolderPlus size={14} /> New folder
          </button>
          <button type="button" style={s.toolbarBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload file'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleFileSelect(file)
            }}
          />
        </div>
      )}

      {uploadError && <p style={s.errorText}>{uploadError}</p>}
      {moveError && <p style={s.errorText}>{moveError}</p>}
      {error && <p style={s.errorText}>{error}</p>}
      {loading && <p style={s.muted}>Loading...</p>}

      {!loading && !error && (
        <div style={s.list}>
          {addingFolder && (
            <div style={s.row}>
              <RowIcon isFolder mimeType={null} />
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={() => void createFolder()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); void createFolder() }
                  if (e.key === 'Escape') { setAddingFolder(false); setNewFolderName('') }
                }}
                placeholder="Folder name"
                style={s.renameInput}
              />
            </div>
          )}

          {foldersHere.map((folder) => (
            <div
              key={folder.id}
              style={{
                ...s.row,
                ...(dragOverId === folder.id ? s.dropTargetActive : {}),
              }}
              draggable={canEdit}
              onDragStart={(e) => onDragStart(e, { type: 'folder', id: folder.id })}
              onDragOver={(e) => onDragOverTarget(e, folder.id)}
              onDragLeave={() => setDragOverId((cur) => (cur === folder.id ? null : cur))}
              onDrop={(e) => void onDropTarget(e, folder.id)}
              onMouseEnter={() => setHoveredRow(folder.id)}
              onMouseLeave={() => setHoveredRow((cur) => (cur === folder.id ? null : cur))}
            >
              <RowIcon isFolder mimeType={null} />
              {renaming?.type === 'folder' && renaming.id === folder.id ? (
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={() => void commitRename()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); void commitRename() }
                    if (e.key === 'Escape') setRenaming(null)
                  }}
                  style={s.renameInput}
                />
              ) : (
                <button type="button" style={s.rowName} onClick={() => setCurrentFolderId(folder.id)}>
                  {folder.name}
                </button>
              )}
              {canEdit && confirmDelete?.type === 'folder' && confirmDelete.id === folder.id ? (
                <span style={s.confirmRow}>
                  <button type="button" style={s.confirmYes} onClick={() => void deleteFolder(folder)}>Delete</button>
                  <button type="button" style={s.confirmNo} onClick={() => setConfirmDelete(null)}>Cancel</button>
                </span>
              ) : canEdit ? (
                <span style={{ ...s.rowActions, opacity: hoveredRow === folder.id ? 1 : 0 }}>
                  <button type="button" style={s.iconBtn} onClick={() => startRename({ type: 'folder', id: folder.id }, folder.name)} aria-label="Rename folder">
                    <Pencil size={13} />
                  </button>
                  <button type="button" style={s.iconBtnDanger} onClick={() => setConfirmDelete({ type: 'folder', id: folder.id })} aria-label="Delete folder">
                    <Trash2 size={13} />
                  </button>
                </span>
              ) : null}
            </div>
          ))}

          {filesHere.map((file, i) => (
            <div
              key={file.id}
              style={s.row}
              draggable={canEdit}
              onDragStart={(e) => onDragStart(e, { type: 'file', id: file.id })}
              onMouseEnter={() => setHoveredRow(file.id)}
              onMouseLeave={() => setHoveredRow((cur) => (cur === file.id ? null : cur))}
            >
              <RowIcon isFolder={false} mimeType={file.file_type} />
              {renaming?.type === 'file' && renaming.id === file.id ? (
                <input
                  autoFocus
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={() => void commitRename()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); void commitRename() }
                    if (e.key === 'Escape') setRenaming(null)
                  }}
                  style={s.renameInput}
                />
              ) : (
                <button type="button" style={s.rowName} onClick={() => onOpenPreview(filesHere, i, currentFolderId)}>
                  {file.file_name}
                  {file.file_size != null && <span style={s.rowMeta}> · {formatBytes(file.file_size)}</span>}
                  <span style={s.rowMeta}> · {formatPortalDate(file.uploaded_at)}</span>
                </button>
              )}
              {canEdit && confirmDelete?.type === 'file' && confirmDelete.id === file.id ? (
                <span style={s.confirmRow}>
                  <button type="button" style={s.confirmYes} onClick={() => void deleteFile(file)}>Delete</button>
                  <button type="button" style={s.confirmNo} onClick={() => setConfirmDelete(null)}>Cancel</button>
                </span>
              ) : canEdit ? (
                <span style={{ ...s.rowActions, opacity: hoveredRow === file.id ? 1 : 0 }}>
                  <button type="button" style={s.iconBtn} onClick={() => void copyShareLink(file)} aria-label="Copy share link">
                    <LinkIcon size={13} />
                  </button>
                  <button type="button" style={s.iconBtn} onClick={() => startRename({ type: 'file', id: file.id }, file.file_name)} aria-label="Rename file">
                    <Pencil size={13} />
                  </button>
                  <button type="button" style={s.iconBtnDanger} onClick={() => setConfirmDelete({ type: 'file', id: file.id })} aria-label="Delete file">
                    <Trash2 size={13} />
                  </button>
                </span>
              ) : null}
              {copiedFileId === file.id && <span style={s.copiedPill}>Copied!</span>}
            </div>
          ))}

          {!addingFolder && foldersHere.length === 0 && filesHere.length === 0 && (
            <p style={s.muted}>This folder is empty.</p>
          )}
        </div>
      )}
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', gap: 12 },
  breadcrumbRow: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 2, padding: '4px 0' },
  crumbSegment: { display: 'flex', alignItems: 'center', gap: 2 },
  crumbBtn: {
    fontFamily: fonts.body, fontSize: 13, fontWeight: 500, color: t.text.secondary,
    background: 'none', border: 'none', padding: '4px 6px', borderRadius: 6, cursor: 'pointer',
  },
  crumbBtnActive: { color: t.text.primary, fontWeight: 600 },
  dropTargetActive: { background: tokens.tealLight, outline: `2px dashed ${tokens.primary}` },
  toolbar: { display: 'flex', gap: 8 },
  toolbarBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontFamily: fonts.body, fontSize: 13, fontWeight: 500, color: t.text.secondary,
    background: t.background.subtle, border: `1px solid ${t.border.subtle}`,
    borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
  },
  list: { display: 'flex', flexDirection: 'column', gap: 4 },
  row: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px',
    borderRadius: 8, background: t.background.subtle, border: `1px solid ${t.border.subtle}`,
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
    position: 'relative',
  },
  rowIcon: {
    width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0,
  },
  rowName: {
    flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none',
    cursor: 'pointer', fontFamily: fonts.body, fontSize: 13, fontWeight: 500,
    color: t.text.primary, padding: 0, overflow: 'hidden', textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowMeta: { fontWeight: 400, color: t.text.muted, fontSize: 12 },
  renameInput: {
    flex: 1, fontFamily: fonts.body, fontSize: 13, fontWeight: 500, color: t.text.primary,
    border: `1.5px solid ${t.border.focus}`, borderRadius: 4, padding: '3px 8px',
    background: tokens.surface, outline: 'none',
  },
  rowActions: { display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}` },
  iconBtn: { background: 'none', border: 'none', padding: 5, cursor: 'pointer', color: t.text.secondary, display: 'flex' },
  iconBtnDanger: { background: 'none', border: 'none', padding: 5, cursor: 'pointer', color: tokens.ruby, display: 'flex' },
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
  copiedPill: {
    position: 'absolute', right: 8, top: -10, fontFamily: fonts.body, fontSize: 11, fontWeight: 600,
    color: tokens.green, background: tokens.greenLight, borderRadius: 999, padding: '2px 8px',
  },
  muted: { fontFamily: fonts.body, fontSize: 13, color: t.text.muted, margin: '8px 0' },
  errorText: { fontFamily: fonts.body, fontSize: 13, color: tokens.ruby, margin: 0 },
}
