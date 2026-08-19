// Admin Brand Visual Guide tab, nested inside ClientPanel — the same
// relationship Outputs has to ProjectPanel. Full CRUD, drag reorder within
// a group, inline status/visibility toggles, an add/edit form (shared
// Modal), and the two preview buttons.
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import {
  Eye,
  FileText,
  GripVertical,
  Image as ImageIcon,
  Link2,
  Lock,
  Music,
  Pencil,
  Plus,
  Share2,
  Trash2,
  Video,
  X,
} from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import { t, fonts } from '../theme'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { highlightBackgroundStyle, useHighlightRow } from '../hooks/useHighlightRow'
import { Modal } from './ui'
import { showToast } from './toast'
import { ExtensionBadge } from '../components/shared/BrandVisualBadge'
import { BrandVisualAttachmentList } from '../components/shared/BrandVisualAttachmentList'
// Lazy-loaded: Tiptap + ProseMirror + markdown-it add real weight (~190KB
// gzipped), and this app has no other code-splitting at all -- one
// monolithic bundle serves the public marketing site and the whole portal
// alike. RichTextEditor's only consumer is this admin-only form, so
// there's no reason a marketing visitor's or a client's bundle should ever
// pay for it. Loaded only once an admin actually opens a Tone of Voice
// item in document/prose layout.
const RichTextEditor = lazy(() =>
  import('../components/shared/RichTextEditor').then((m) => ({ default: m.RichTextEditor }))
)
import { BrandVisualPreviewBanner } from '../components/shared/BrandVisualPreviewBanner'
import { BrandVisualClientView, BrandVisualSidebar, filterForPreviewAudience } from '../components/shared/BrandVisualClientView'
import { BrandVisualPublicView } from '../components/shared/BrandVisualPublicView'
import {
  BRAND_VISUAL_CATEGORIES,
  categoryLabel,
  fileNameFromStoragePath,
  groupsForCategory,
  isSingleGroupCategory,
  resolveAuthenticatedAttachments,
} from '../utils/brandVisual'
import type {
  BrandVisualBeforeAfterRow,
  BrandVisualCategory,
  BrandVisualContentType,
  BrandVisualImageTreatment,
  BrandVisualItem,
  BrandVisualItemAttachment,
  BrandVisualStatus,
  BrandVisualSwatch,
  BrandVisualVisibility,
  BrandVisualWordList,
} from '../utils/brandVisual'

// 3 or 6 hex digits, with or without the leading #.
const HEX_RE = /^#?([0-9A-F]{3}|[0-9A-F]{6})$/i
function normalizeHex(v: string): string {
  const trimmed = v.trim()
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  return withHash.toUpperCase()
}
function isValidHex(v: string): boolean {
  return HEX_RE.test(v.trim())
}

const mono = "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
const MAX_BYTES = 50 * 1024 * 1024

const TYPE_META: Record<BrandVisualContentType, { label: string; Icon: typeof FileText }> = {
  document: { label: 'Document', Icon: FileText },
  image: { label: 'Image', Icon: ImageIcon },
  video: { label: 'Video', Icon: Video },
  audio: { label: 'Audio', Icon: Music },
  link: { label: 'Link', Icon: Link2 },
}

const STATUS_LABEL: Record<BrandVisualStatus, string> = { draft: 'Draft', published: 'Published' }
const VISIBILITY_LABEL: Record<BrandVisualVisibility, string> = {
  admin_only: 'Admin only',
  client: 'Client',
  public: 'Public',
}

export function BrandVisualTab({ clientId, clientLabel }: { clientId: string; clientLabel: string }) {
  const { isMobile } = useBreakpoint()
  const [items, setItems] = useState<BrandVisualItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [publicToken, setPublicToken] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<BrandVisualCategory>('guidelines')
  const [activeGroup, setActiveGroup] = useState<string>(groupsForCategory('guidelines')[0])
  const [search, setSearch] = useState('')
  const [modalItem, setModalItem] = useState<BrandVisualItem | null | undefined>(undefined)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [previewAs, setPreviewAs] = useState<null | 'client' | 'public'>(null)
  const [previewPublicCategory, setPreviewPublicCategory] = useState<BrandVisualCategory>('guidelines')
  const { highlightId, triggerHighlight } = useHighlightRow()

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('brand_visual_items')
      .select('*')
      .eq('client_id', clientId)
      .order('sort_order', { ascending: true })
    if (err) {
      setError('Could not load the Brand Visual Guide. Refresh to try again.')
      setLoading(false)
      return
    }
    setItems((data ?? []) as BrandVisualItem[])
    setLoading(false)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId])

  // clients.public_token -- the /brand/:token this client's items share.
  // Admin has full RLS access, so this is a plain select, same column the
  // client route reads for itself (see BrandVisualPage.tsx).
  useEffect(() => {
    let cancelled = false
    supabase
      .from('clients')
      .select('public_token')
      .eq('id', clientId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setPublicToken((data as { public_token: string } | null)?.public_token ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [clientId])

  function selectNav(category: BrandVisualCategory, group: string | null) {
    setActiveCategory(category)
    setActiveGroup(group || groupsForCategory(category)[0])
  }

  const q = search.trim().toLowerCase()
  const filtered = items
    .filter((i) => i.category === activeCategory && i.group_label === activeGroup)
    .filter((i) => !q || i.title.toLowerCase().includes(q) || (i.summary ?? '').toLowerCase().includes(q))
    .sort((a, b) => a.sort_order - b.sort_order)

  async function toggleStatus(item: BrandVisualItem) {
    const next: BrandVisualStatus = item.status === 'published' ? 'draft' : 'published'
    const { error: err } = await supabase
      .from('brand_visual_items')
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (err) {
      showToast('Could not update status. Try again.', 'error')
      return
    }
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, status: next } : i)))
  }

  async function cycleVisibility(item: BrandVisualItem) {
    const order: BrandVisualVisibility[] = ['admin_only', 'client', 'public']
    const next = order[(order.indexOf(item.visibility) + 1) % order.length]
    const { error: err } = await supabase
      .from('brand_visual_items')
      .update({ visibility: next, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (err) {
      showToast('Could not update visibility. Try again.', 'error')
      return
    }
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, visibility: next } : i)))
  }

  // One click: publish the item (if it isn't already status='published' AND
  // visibility='public' -- both, since the public listing RPC requires
  // both) then copy its deep link. Same "publish + copy link" semantics as
  // the client-facing Share button, but admin writes the row directly
  // rather than going through the client-only publish-toggle RPC.
  async function shareItem(item: BrandVisualItem) {
    if (!publicToken) {
      showToast('Could not find this client’s public link. Try again.', 'error')
      return
    }
    if (item.status !== 'published' || item.visibility !== 'public') {
      const { error: err } = await supabase
        .from('brand_visual_items')
        .update({ status: 'published', visibility: 'public', updated_at: new Date().toISOString() })
        .eq('id', item.id)
      if (err) {
        showToast('Could not publish this item. Try again.', 'error')
        return
      }
      setItems((list) =>
        list.map((i) => (i.id === item.id ? { ...i, status: 'published', visibility: 'public' } : i))
      )
    }
    const link = `${window.location.origin}/brand/${publicToken}?item=${item.id}`
    try {
      await navigator.clipboard.writeText(link)
      showToast('Public link copied to clipboard', 'success')
    } catch {
      showToast('Link ready, but could not copy automatically.', 'error')
    }
  }

  async function deleteItem(item: BrandVisualItem) {
    const { error: err } = await supabase.from('brand_visual_items').delete().eq('id', item.id)
    if (err) {
      showToast('Could not delete this item. Try again.', 'error')
      return
    }
    setItems((list) => list.filter((i) => i.id !== item.id))
    if (item.storage_path) {
      void supabase.storage.from('brand-visual-files').remove([item.storage_path])
    }
    showToast('Item deleted', 'success')
  }

  // Reorders within the currently active (category, group) pair only.
  async function reorder(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return
    const group = [...filtered]
    const [moved] = group.splice(fromIdx, 1)
    group.splice(toIdx, 0, moved)
    const renumbered = group.map((it, i) => ({ ...it, sort_order: i + 1 }))
    setItems((list) => {
      const rest = list.filter((i) => !(i.category === activeCategory && i.group_label === activeGroup))
      return [...rest, ...renumbered]
    })
    await Promise.all(
      renumbered.map((it) => supabase.from('brand_visual_items').update({ sort_order: it.sort_order }).eq('id', it.id))
    )
  }

  function handleSaved(saved: BrandVisualItem) {
    setItems((list) => {
      const exists = list.some((i) => i.id === saved.id)
      if (!exists) triggerHighlight(saved.id)
      return exists ? list.map((i) => (i.id === saved.id ? saved : i)) : [...list, saved]
    })
    setModalItem(undefined)
  }

  if (previewAs) {
    const previewItems = filterForPreviewAudience(items, previewAs)
    return (
      <div>
        <BrandVisualPreviewBanner label={previewAs} onExit={() => setPreviewAs(null)} />
        {previewAs === 'client' && (
          <BrandVisualClientView
            items={previewItems}
            brandLabel={clientLabel}
            initialCategory={activeCategory}
            initialGroup={activeGroup}
            onPreviewPublic={(cat) => {
              setPreviewPublicCategory(cat)
              setPreviewAs('public')
            }}
          />
        )}
        {previewAs === 'public' && (
          <BrandVisualPublicView items={previewItems} brandLabel={clientLabel} initialCategory={previewPublicCategory} />
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexDirection: isMobile ? 'column' : 'row' }}>
      <div style={{ ...(isMobile ? { width: '100%' } : null) }}>
        <BrandVisualSidebar
          activeCategory={activeCategory}
          activeGroup={activeGroup}
          onSelect={selectNav}
          search={search}
          setSearch={setSearch}
        />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={s.headerRow}>
          <div>
            {!isSingleGroupCategory(activeCategory) && <div style={s.crumb}>{categoryLabel(activeCategory)}</div>}
            <h2 style={s.heading}>{isSingleGroupCategory(activeCategory) ? categoryLabel(activeCategory) : activeGroup}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" style={s.ghostBtn} onClick={() => setPreviewAs('client')}>
              <Eye size={15} /> Preview as client
            </button>
            <button type="button" style={s.ghostBtn} onClick={() => setPreviewAs('public')}>
              <Eye size={15} /> Preview as public
            </button>
            <button type="button" style={s.addBtn} onClick={() => setModalItem(null)}>
              <Plus size={15} /> Add item
            </button>
          </div>
        </div>

        {loading ? (
          <p style={s.muted}>Loading...</p>
        ) : error ? (
          <p style={s.errorText}>{error}</p>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>No items in this group yet.</div>
        ) : (
          <div>
            {filtered.map((item, i) => (
              <AdminRow
                key={item.id}
                item={item}
                index={i}
                dragging={dragIndex}
                highlighted={item.id === highlightId}
                onDragStart={setDragIndex}
                onDragOver={(idx) => {
                  if (dragIndex === null || dragIndex === idx) return
                  void reorder(dragIndex, idx)
                  setDragIndex(idx)
                }}
                onDrop={() => setDragIndex(null)}
                onEdit={setModalItem}
                onDelete={deleteItem}
                onToggleStatus={toggleStatus}
                onToggleVisibility={cycleVisibility}
                onShare={shareItem}
              />
            ))}
          </div>
        )}
      </div>

      {modalItem !== undefined && (
        <ItemFormModal
          item={modalItem}
          clientId={clientId}
          defaultCategory={activeCategory}
          defaultGroup={activeGroup}
          existingItems={items}
          onClose={() => setModalItem(undefined)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

// ── Admin row ────────────────────────────────────────────────────────────
function AdminRow({
  item,
  index,
  dragging,
  highlighted,
  onDragStart,
  onDragOver,
  onDrop,
  onEdit,
  onDelete,
  onToggleStatus,
  onToggleVisibility,
  onShare,
}: {
  item: BrandVisualItem
  index: number
  dragging: number | null
  // Briefly true right after this item was added -- see useHighlightRow.
  highlighted: boolean
  onDragStart: (index: number) => void
  onDragOver: (index: number) => void
  onDrop: () => void
  onEdit: (item: BrandVisualItem) => void
  onDelete: (item: BrandVisualItem) => void
  onToggleStatus: (item: BrandVisualItem) => void
  onToggleVisibility: (item: BrandVisualItem) => void
  onShare: (item: BrandVisualItem) => void
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const meta = TYPE_META[item.content_type]

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver(index)
      }}
      onDrop={onDrop}
      style={{ ...s.row, ...highlightBackgroundStyle(highlighted), opacity: dragging === index ? 0.5 : 1 }}
    >
      <span style={s.dragHandle}>
        <GripVertical size={16} />
      </span>
      {item.file_type ? (
        <ExtensionBadge ext={item.file_type} />
      ) : (
        <div style={s.typeIconBox}>
          <meta.Icon size={16} color={t.text.secondary} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onEdit(item)}>
        <div style={s.rowTitle}>
          {item.title}
          {item.detail.locked && <Lock size={12} color={t.text.tertiary} style={{ marginLeft: 5, verticalAlign: 'middle' }} />}
        </div>
        <div style={s.rowSummary}>{item.summary || '—'}</div>
      </div>
      <button type="button" style={s.badgeBtn} onClick={() => onToggleStatus(item)}>
        <span style={{ ...s.pill, ...(item.status === 'published' ? s.pillTeal : s.pillDraft) }}>
          {STATUS_LABEL[item.status]}
        </span>
      </button>
      <button type="button" style={s.badgeBtn} onClick={() => onToggleVisibility(item)}>
        <span style={s.pill}>{VISIBILITY_LABEL[item.visibility]}</span>
      </button>
      <button type="button" style={s.iconBtn} onClick={() => onShare(item)} aria-label="Copy public share link">
        <Share2 size={15} />
      </button>
      <button type="button" style={s.iconBtn} onClick={() => onEdit(item)} aria-label="Edit">
        <Pencil size={15} />
      </button>
      {!confirmDelete ? (
        <button type="button" style={s.iconBtn} onClick={() => setConfirmDelete(true)} aria-label="Delete">
          <Trash2 size={15} />
        </button>
      ) : (
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
          <button
            type="button"
            style={s.confirmDeleteBtn}
            onClick={() => {
              onDelete(item)
              setConfirmDelete(false)
            }}
          >
            Delete
          </button>
          <button type="button" style={s.confirmCancelBtn} onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
        </span>
      )}
    </div>
  )
}

// ── Add / edit form modal ────────────────────────────────────────────────
function ItemFormModal({
  item,
  clientId,
  defaultCategory,
  defaultGroup,
  existingItems,
  onClose,
  onSaved,
}: {
  item: BrandVisualItem | null
  clientId: string
  defaultCategory: BrandVisualCategory
  defaultGroup: string
  // Every item currently loaded (all categories/groups), used only to seed
  // a new item's sort_order -- see handleSave below. Not used for anything
  // else; this form never renders a list of its own.
  existingItems: BrandVisualItem[]
  onClose: () => void
  onSaved: (item: BrandVisualItem) => void
}) {
  const isNew = item === null
  const [category, setCategory] = useState<BrandVisualCategory>(item?.category ?? defaultCategory)
  const [group, setGroup] = useState(item?.group_label ?? defaultGroup)
  const [title, setTitle] = useState(item?.title ?? '')
  const [summary, setSummary] = useState(item?.summary ?? '')
  const [contentType, setContentType] = useState<BrandVisualContentType>(item?.content_type ?? 'document')
  const [status, setStatus] = useState<BrandVisualStatus>(item?.status ?? 'draft')
  const [visibility, setVisibility] = useState<BrandVisualVisibility>(item?.visibility ?? 'admin_only')
  const [content, setContent] = useState(item?.detail?.content ?? '')
  const [note, setNote] = useState(item?.detail?.note ?? '')
  const [imageTreatment, setImageTreatment] = useState<BrandVisualImageTreatment>(item?.detail?.imageTreatment ?? 'photo')
  const [swatches, setSwatches] = useState<BrandVisualSwatch[]>(
    item?.detail?.swatches && item.detail.swatches.length > 0 ? item.detail.swatches : [{ name: '', hex: '', role: '' }]
  )
  const [url, setUrl] = useState(item?.detail?.url ?? '')
  const [linkLabel, setLinkLabel] = useState(item?.detail?.label ?? '')
  // Tone of Voice only, content_type='document'.
  const [layout, setLayout] = useState<NonNullable<BrandVisualItem['detail']['layout']>>(item?.detail?.layout ?? 'prose')
  const [wordListLeftLabel, setWordListLeftLabel] = useState(item?.detail?.wordList?.leftLabel ?? 'Reach for')
  const [wordListRightLabel, setWordListRightLabel] = useState(item?.detail?.wordList?.rightLabel ?? 'Avoid')
  // One shared row array, not two independent left/right lists -- a single
  // "Add Row" CTA and a single remove-per-row button, same editing pattern
  // as beforeAfterRows. Stored `detail.wordList.left`/`.right` stay two
  // independent arrays on save (the renderer never assumes matching
  // lengths), this only simplifies how the admin edits them. Zipped from
  // whichever existing side is longer, so an item saved before this change
  // (or ever edited with unequal left/right lengths) still loads correctly.
  const [wordListRows, setWordListRows] = useState<{ left: string; right: string }[]>(() => {
    const left = item?.detail?.wordList?.left ?? []
    const right = item?.detail?.wordList?.right ?? []
    const rowCount = Math.max(left.length, right.length, 1)
    return Array.from({ length: rowCount }, (_, i) => ({ left: left[i] ?? '', right: right[i] ?? '' }))
  })
  const [beforeAfterRows, setBeforeAfterRows] = useState<BrandVisualBeforeAfterRow[]>(
    item?.detail?.beforeAfterRows && item.detail.beforeAfterRows.length > 0 ? item.detail.beforeAfterRows : [{ off: '', on: '' }]
  )
  // Tone of Voice only. Display-only warning, never blocks edit/delete.
  const [locked, setLocked] = useState(item?.detail?.locked ?? false)
  const [fileType, setFileType] = useState(item?.file_type ?? '')
  const [existingStoragePath] = useState(item?.storage_path ?? null)
  const existingFileName = existingStoragePath ? fileNameFromStoragePath(existingStoragePath) : null
  const [pickedFile, setPickedFile] = useState<File | null>(null)
  const [removeExistingFile, setRemoveExistingFile] = useState(false)
  // Tone of Voice only (migration 0097). Replaces the single-file Upload
  // field above for this category -- see the Attachments Field below.
  // Empty for a new (unsaved) item; loaded once for an existing one.
  const [attachments, setAttachments] = useState<BrandVisualItemAttachment[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const groupOptions = groupsForCategory(category)
  const isColourGroup = category === 'guidelines' && group === 'Colour'
  const isToneOfVoice = category === 'tone_of_voice'
  const filledSwatches = swatches.filter((sw) => sw.name.trim() || sw.hex.trim())
  const hasInvalidHex = isColourGroup && filledSwatches.some((sw) => sw.hex.trim() && !isValidHex(sw.hex))
  const canSave = title.trim().length > 0 && !hasInvalidHex

  useEffect(() => {
    if (isNew) return
    void resolveAuthenticatedAttachments(item!).then(setAttachments)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateSwatch(index: number, patch: Partial<BrandVisualSwatch>) {
    setSwatches((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }
  function addSwatchRow() {
    setSwatches((rows) => [...rows, { name: '', hex: '', role: '' }])
  }
  function removeSwatchRow(index: number) {
    setSwatches((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows))
  }

  function updateBeforeAfterRow(index: number, patch: Partial<BrandVisualBeforeAfterRow>) {
    setBeforeAfterRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }
  function addBeforeAfterRow() {
    setBeforeAfterRows((rows) => [...rows, { off: '', on: '' }])
  }
  function removeBeforeAfterRow(index: number) {
    setBeforeAfterRows((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows))
  }

  function updateWordListRow(index: number, patch: Partial<{ left: string; right: string }>) {
    setWordListRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }
  function addWordListRow() {
    setWordListRows((rows) => [...rows, { left: '', right: '' }])
  }
  function removeWordListRow(index: number) {
    setWordListRows((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows))
  }

  function pickFile(f: File) {
    if (f.size > MAX_BYTES) {
      setError('File too large (max 50MB).')
      return
    }
    setError(null)
    setPickedFile(f)
    setRemoveExistingFile(false)
    const ext = f.name.includes('.') ? f.name.split('.').pop()!.toUpperCase() : ''
    if (ext) setFileType(ext)
  }

  async function handleSave() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      let storagePath = removeExistingFile ? null : existingStoragePath

      if (pickedFile) {
        const path = `${clientId}/${Date.now()}_${pickedFile.name}`
        const { error: upErr } = await supabase.storage.from('brand-visual-files').upload(path, pickedFile, {
          upsert: false,
        })
        if (upErr) throw upErr
        // Best-effort cleanup of the file being replaced.
        if (existingStoragePath && existingStoragePath !== path) {
          void supabase.storage.from('brand-visual-files').remove([existingStoragePath])
        }
        storagePath = path
      } else if (removeExistingFile && existingStoragePath) {
        void supabase.storage.from('brand-visual-files').remove([existingStoragePath])
      }

      const detail: BrandVisualItem['detail'] = {}
      if (isColourGroup) {
        detail.swatches = filledSwatches.map((sw) => ({
          name: sw.name.trim(),
          hex: normalizeHex(sw.hex),
          role: sw.role?.trim() || undefined,
        }))
      } else if ((contentType === 'document' || contentType === 'image') && content.trim() && !(isToneOfVoice && layout !== 'prose')) {
        detail.content = content.trim()
      }
      if (contentType === 'image') detail.imageTreatment = imageTreatment
      if (!isColourGroup && note.trim()) detail.note = note.trim()
      if (contentType === 'link') {
        detail.url = url.trim()
        detail.label = linkLabel.trim() || url.trim()
      }
      if (isToneOfVoice && contentType === 'document') {
        detail.layout = layout
        if (layout === 'wordlist') {
          detail.wordList = {
            leftLabel: wordListLeftLabel.trim() || 'Reach for',
            left: wordListRows.map((row) => row.left.trim()).filter(Boolean),
            rightLabel: wordListRightLabel.trim() || 'Avoid',
            right: wordListRows.map((row) => row.right.trim()).filter(Boolean),
          }
        }
        if (layout === 'beforeAfter') {
          detail.beforeAfterRows = beforeAfterRows
            .filter((row) => row.off.trim() || row.on.trim())
            .map((row) => ({ off: row.off.trim(), on: row.on.trim() }))
        }
      }
      if (isToneOfVoice) detail.locked = locked
      // Preserve structured detail (specimens/sections) that this form has
      // no editor for, so an edit save never clobbers seed content. Swatches,
      // imageTreatment, layout/wordList/beforeAfterRows and locked are
      // exceptions: this form is the source of truth for them whenever they
      // apply, and all are actively cleared otherwise -- the renderer checks
      // detail shape before content_type, so stale structured data left over
      // from a category/layout switch would wrongly keep rendering under the
      // old shape.
      const preserved = item?.detail ?? {}
      const mergedDetail = {
        ...preserved,
        ...detail,
        ...((contentType !== 'document' && contentType !== 'image') || isColourGroup ? { content: undefined } : {}),
        ...(contentType !== 'image' ? { imageTreatment: undefined } : {}),
        ...(contentType !== 'link' ? { url: undefined, label: undefined } : {}),
        ...(isColourGroup ? {} : { swatches: undefined }),
        ...(!isColourGroup && !note.trim() ? { note: undefined } : {}),
        ...(!isToneOfVoice || contentType !== 'document' ? { layout: undefined, wordList: undefined, beforeAfterRows: undefined } : {}),
        ...(isToneOfVoice && contentType === 'document' && layout !== 'wordlist' ? { wordList: undefined } : {}),
        ...(isToneOfVoice && contentType === 'document' && layout !== 'beforeAfter' ? { beforeAfterRows: undefined } : {}),
        ...(!isToneOfVoice ? { locked: undefined } : {}),
      }

      const resolvedGroup = isSingleGroupCategory(category) ? groupsForCategory(category)[0] : group

      const payload = {
        client_id: clientId,
        category,
        group_label: resolvedGroup,
        title: title.trim(),
        summary: summary.trim() || null,
        content_type: contentType,
        file_type: fileType.trim() || null,
        status,
        visibility,
        detail: mergedDetail,
        storage_path: storagePath,
        updated_at: new Date().toISOString(),
        // New items only -- appends to the end of whichever (category,
        // group) it lands in, so it shows up last (most recently added at
        // the bottom, first-added item stays on top), matching every
        // existing item's own sort_order (assigned 1-based by reorder()).
        // Never touched on an edit save: an existing item's position is
        // only ever changed by dragging, not by editing its other fields.
        ...(isNew
          ? {
              sort_order:
                Math.max(
                  0,
                  ...existingItems
                    .filter((i) => i.category === category && i.group_label === resolvedGroup)
                    .map((i) => i.sort_order)
                ) + 1,
            }
          : {}),
      }

      if (isNew) {
        const { data, error: insErr } = await supabase
          .from('brand_visual_items')
          .insert(payload)
          .select('*')
          .single()
        if (insErr) throw insErr
        onSaved(data as BrandVisualItem)
      } else {
        const { data, error: updErr } = await supabase
          .from('brand_visual_items')
          .update(payload)
          .eq('id', item!.id)
          .select('*')
          .single()
        if (updErr) throw updErr
        onSaved(data as BrandVisualItem)
      }
      showToast(isNew ? 'Item added' : 'Item saved', 'success')
    } catch {
      setError('Could not save this item. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isNew ? 'Add brand asset' : 'Edit brand asset'}
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" style={s.cancelFormBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            style={{ ...s.saveFormBtn, opacity: canSave && !saving ? 1 : 0.6 }}
            onClick={() => void handleSave()}
            disabled={!canSave || saving}
          >
            {saving ? 'Saving…' : isNew ? 'Add item' : 'Save changes'}
          </button>
        </div>
      }
    >
      {(() => {
        const categorySelect = (
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => {
                const cat = e.target.value as BrandVisualCategory
                setCategory(cat)
                setGroup(groupsForCategory(cat)[0])
              }}
              className="pf-focus"
              style={s.input}
            >
              {BRAND_VISUAL_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        )
        // A single-group category (Tone of Voice) has nothing for the
        // admin to choose between, so the Group field is hidden rather
        // than shown as a one-option dropdown -- group_label is still
        // written on save (see handleSave), just not surfaced here.
        if (isSingleGroupCategory(category)) return categorySelect
        return (
          <div style={s.formGrid2}>
            {categorySelect}
            <Field label="Group">
              <select value={group} onChange={(e) => setGroup(e.target.value)} className="pf-focus" style={s.input}>
                {groupOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )
      })()}

      <Field label="Title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="pf-focus" style={s.input} />
      </Field>
      <Field label="Summary">
        <input value={summary} onChange={(e) => setSummary(e.target.value)} className="pf-focus" style={s.input} />
      </Field>

      <div style={s.formGrid2}>
        <Field label="Content type">
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value as BrandVisualContentType)}
            className="pf-focus"
            style={s.input}
          >
            {Object.entries(TYPE_META).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select value={status} onChange={(e) => setStatus(e.target.value as BrandVisualStatus)} className="pf-focus" style={s.input}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </Field>
      </div>

      <Field label="Visibility">
        <select
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as BrandVisualVisibility)}
          className="pf-focus"
          style={s.input}
        >
          <option value="admin_only">Admin only</option>
          <option value="client">Client</option>
          <option value="public">Public</option>
        </select>
      </Field>

      {isToneOfVoice && (
        <Field label="">
          <label style={s.checkboxRow}>
            <input type="checkbox" checked={locked} onChange={(e) => setLocked(e.target.checked)} />
            <Lock size={13} /> Locked (use verbatim) — shown to readers as a warning, does not restrict editing
          </label>
        </Field>
      )}

      {isToneOfVoice && contentType === 'document' && (
        <Field label="Layout">
          <select
            value={layout}
            onChange={(e) => setLayout(e.target.value as typeof layout)}
            className="pf-focus"
            style={s.input}
          >
            <option value="prose">Prose</option>
            <option value="wordlist">Two-column word list</option>
            <option value="beforeAfter">Before / after table</option>
          </select>
        </Field>
      )}

      {isToneOfVoice && contentType === 'document' && layout === 'wordlist' && (
        <>
          <div style={s.formGrid2}>
            <Field label="Left column label">
              <input value={wordListLeftLabel} onChange={(e) => setWordListLeftLabel(e.target.value)} className="pf-focus" style={s.input} />
            </Field>
            <Field label="Right column label">
              <input value={wordListRightLabel} onChange={(e) => setWordListRightLabel(e.target.value)} className="pf-focus" style={s.input} />
            </Field>
          </div>
          <Field label="Words">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {wordListRows.map((row, i) => (
                <div key={i} style={s.beforeAfterRowEditor}>
                  <input
                    value={row.left}
                    onChange={(e) => updateWordListRow(i, { left: e.target.value })}
                    placeholder="Left word"
                    className="pf-focus"
                    style={s.input}
                  />
                  <input
                    value={row.right}
                    onChange={(e) => updateWordListRow(i, { right: e.target.value })}
                    placeholder="Right word"
                    className="pf-focus"
                    style={s.input}
                  />
                  <button
                    type="button"
                    style={s.fileClearBtn}
                    onClick={() => removeWordListRow(i)}
                    aria-label="Remove row"
                    disabled={wordListRows.length === 1}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button type="button" style={s.addSwatchBtn} onClick={addWordListRow}>
                <Plus size={14} /> Add row
              </button>
            </div>
          </Field>
        </>
      )}

      {isToneOfVoice && contentType === 'document' && layout === 'beforeAfter' && (
        <Field label="Rows">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {beforeAfterRows.map((row, i) => (
              <div key={i} style={s.beforeAfterRowEditor}>
                <input
                  value={row.off}
                  onChange={(e) => updateBeforeAfterRow(i, { off: e.target.value })}
                  placeholder="Off-brand line"
                  className="pf-focus"
                  style={s.input}
                />
                <input
                  value={row.on}
                  onChange={(e) => updateBeforeAfterRow(i, { on: e.target.value })}
                  placeholder="On-brand rewrite"
                  className="pf-focus"
                  style={s.input}
                />
                <button
                  type="button"
                  style={s.fileClearBtn}
                  onClick={() => removeBeforeAfterRow(i)}
                  aria-label="Remove row"
                  disabled={beforeAfterRows.length === 1}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            <button type="button" style={s.addSwatchBtn} onClick={addBeforeAfterRow}>
              <Plus size={14} /> Add row
            </button>
          </div>
        </Field>
      )}

      {isColourGroup ? (
        <Field label="Colours">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {swatches.map((sw, i) => {
              const hexError = sw.hex.trim() && !isValidHex(sw.hex)
              return (
                <div key={i} style={s.swatchRow}>
                  <div style={{ ...s.swatchPreview, background: isValidHex(sw.hex) ? normalizeHex(sw.hex) : t.background.muted }} />
                  <input
                    value={sw.name}
                    onChange={(e) => updateSwatch(i, { name: e.target.value })}
                    placeholder="Name (e.g. Gold)"
                    className="pf-focus"
                    style={{ ...s.input, ...s.swatchNameInput }}
                  />
                  <input
                    value={sw.hex}
                    onChange={(e) => updateSwatch(i, { hex: e.target.value })}
                    placeholder="#D5B067"
                    className="pf-focus"
                    style={{ ...s.input, ...s.swatchHexInput, ...(hexError ? s.inputError : null) }}
                  />
                  <input
                    value={sw.role ?? ''}
                    onChange={(e) => updateSwatch(i, { role: e.target.value })}
                    placeholder="Usage (e.g. Dominant)"
                    className="pf-focus"
                    style={{ ...s.input, ...s.swatchRoleInput }}
                  />
                  <button
                    type="button"
                    style={s.fileClearBtn}
                    onClick={() => removeSwatchRow(i)}
                    aria-label="Remove colour"
                    disabled={swatches.length === 1}
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
            {swatches.some((sw) => sw.hex.trim() && !isValidHex(sw.hex)) && (
              <span style={s.errInline}>Hex codes must be 3 or 6 digits, e.g. #D5B067.</span>
            )}
            <button type="button" style={s.addSwatchBtn} onClick={addSwatchRow}>
              <Plus size={14} /> Add another colour
            </button>
          </div>
        </Field>
      ) : (
        (contentType === 'document' || contentType === 'image') &&
        !(isToneOfVoice && contentType === 'document' && layout !== 'prose') &&
        (isToneOfVoice && contentType === 'document' ? (
          <Field label="Text">
            <Suspense fallback={<div style={s.rteLoading}>Loading editor…</div>}>
              <RichTextEditor value={content} onChange={setContent} placeholder="Start writing..." />
            </Suspense>
          </Field>
        ) : (
          <Field label="Content (optional)">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              style={s.textarea}
              placeholder={
                contentType === 'image'
                  ? 'Extended usage notes: minimum tile size, spacing rules, where this should and should not appear.'
                  : undefined
              }
            />
          </Field>
        ))
      )}

      {contentType === 'image' && (
        <Field label="Image treatment">
          <select
            value={imageTreatment}
            onChange={(e) => setImageTreatment(e.target.value as BrandVisualImageTreatment)}
            className="pf-focus"
            style={s.input}
          >
            <option value="photo">Photo or logo (padded frame)</option>
            <option value="pattern">Pattern or texture (fills edge to edge)</option>
          </select>
        </Field>
      )}

      {!isToneOfVoice && contentType !== 'link' && (
        <Field label={`Upload file (optional, max 50MB)`}>
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) pickFile(f)
            }}
          />
          {pickedFile ? (
            <div style={s.fileRow}>
              <span style={s.fileName}>{pickedFile.name}</span>
              <button type="button" style={s.fileClearBtn} onClick={() => setPickedFile(null)} aria-label="Remove picked file">
                <X size={14} />
              </button>
            </div>
          ) : existingStoragePath && !removeExistingFile ? (
            <div style={s.fileRow}>
              <span style={s.fileName}>{existingFileName ?? 'Existing file'}</span>
              <button type="button" style={s.fileClearBtn} onClick={() => setRemoveExistingFile(true)} aria-label="Remove file">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div role="button" tabIndex={0} className="pf-focus" style={s.dropZone} onClick={() => fileInputRef.current?.click()}>
              Click to choose a file — the extension is picked up automatically
            </div>
          )}
        </Field>
      )}

      {!isToneOfVoice && (
        <Field label="File type (extension, optional if a file is attached)">
          <input
            value={fileType}
            onChange={(e) => setFileType(e.target.value.toUpperCase())}
            className="pf-focus"
            style={s.input}
            placeholder="e.g. PDF, SVG, AI"
          />
        </Field>
      )}

      {isToneOfVoice && (
        <Field label="Attachments">
          {isNew ? (
            <p style={s.muted}>Save this item first, then add attachments.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {existingStoragePath && !removeExistingFile && (
                <div style={s.fileRow}>
                  <span style={s.fileName}>{existingFileName ?? 'Existing file'} (legacy single file)</span>
                  <button
                    type="button"
                    style={s.fileClearBtn}
                    onClick={() => setRemoveExistingFile(true)}
                    aria-label="Remove legacy file"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <BrandVisualAttachmentList
                itemId={item!.id}
                clientId={clientId}
                attachments={attachments}
                onAttachmentsChange={setAttachments}
              />
            </div>
          )}
        </Field>
      )}

      {contentType !== 'link' && !isColourGroup && (
        <Field label="Note (optional caption shown with the file)">
          <input value={note} onChange={(e) => setNote(e.target.value)} className="pf-focus" style={s.input} />
        </Field>
      )}

      {contentType === 'link' && (
        <>
          <Field label="URL">
            <input value={url} onChange={(e) => setUrl(e.target.value)} className="pf-focus" style={s.input} placeholder="https://" />
          </Field>
          <Field label="Label">
            <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} className="pf-focus" style={s.input} />
          </Field>
        </>
      )}

      {error && <p style={s.errorText}>{error}</p>}
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={s.fieldLabel}>{label}</label>}
      {children}
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  headerRow: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 },
  crumb: { fontFamily: mono, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.text.tertiary, marginBottom: 6 },
  heading: { fontFamily: fonts.heading, fontSize: 22, fontWeight: 600, margin: 0, color: t.text.primary },
  ghostBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: t.background.surface,
    color: t.text.primary,
    border: `1px solid ${t.border.default}`,
    borderRadius: 10,
    padding: '9px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: t.text.primaryBrand,
    color: t.text.onPrimary,
    border: 'none',
    borderRadius: 10,
    padding: '9px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  muted: { fontSize: 14, color: t.text.secondary },
  errorText: { fontSize: 13.5, color: t.text.danger, margin: '8px 0 0' },
  empty: { border: `1px dashed ${t.border.default}`, borderRadius: 14, padding: '40px 20px', textAlign: 'center', color: t.text.tertiary, fontSize: 13.5 },
  row: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: t.background.surface, border: `1px solid ${t.border.subtle}`, borderRadius: 12, marginBottom: 8 },
  dragHandle: { color: t.text.tertiary, cursor: 'grab', display: 'flex', flexShrink: 0 },
  typeIconBox: { width: 36, height: 36, borderRadius: 9, background: t.background.subtle, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowTitle: {
    fontFamily: fonts.heading,
    fontSize: 14.5,
    fontWeight: 600,
    color: t.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowSummary: { fontSize: 12.5, color: t.text.secondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  badgeBtn: { border: 'none', cursor: 'pointer', background: 'none', padding: 0, flexShrink: 0 },
  pill: { display: 'inline-block', padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', background: t.background.muted, color: t.text.secondary, whiteSpace: 'nowrap' },
  pillTeal: { background: t.background.tint2, color: t.text.primaryBrand },
  pillDraft: { background: t.background.muted, color: t.text.tertiary },
  iconBtn: { border: 'none', background: 'transparent', color: t.text.secondary, cursor: 'pointer', padding: 6, borderRadius: 8, display: 'flex', flexShrink: 0 },
  confirmDeleteBtn: { color: t.text.danger, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12.5 },
  confirmCancelBtn: { color: t.text.secondary, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5 },
  fieldLabel: { display: 'block', fontSize: 12, fontWeight: 600, color: t.text.secondary, marginBottom: 6 },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: t.text.primary, cursor: 'pointer' },
  beforeAfterRowEditor: { display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center' },
  formGrid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  input: {
    width: '100%',
    border: `1px solid ${t.border.default}`,
    borderRadius: 10,
    padding: '9px 11px',
    fontSize: 13.5,
    fontFamily: fonts.body,
    color: t.text.primary,
    background: t.background.surface,
    boxSizing: 'border-box',
  },
  rteLoading: {
    border: `1px solid ${t.border.default}`,
    borderRadius: 10,
    padding: '16px 12px',
    fontSize: 13,
    color: t.text.tertiary,
    textAlign: 'center',
  },
  textarea: {
    width: '100%',
    border: `1px solid ${t.border.default}`,
    borderRadius: 10,
    padding: 10,
    fontSize: 13.5,
    fontFamily: fonts.body,
    color: t.text.primary,
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  dropZone: {
    border: `1.5px dashed ${t.border.default}`,
    borderRadius: 10,
    padding: '16px 12px',
    textAlign: 'center',
    cursor: 'pointer',
    color: t.text.secondary,
    fontSize: 13,
  },
  fileRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${t.border.default}`, borderRadius: 10, padding: '9px 12px' },
  fileName: { fontSize: 13, color: t.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileClearBtn: { border: 'none', background: 'transparent', color: t.text.tertiary, cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 },
  swatchRow: { display: 'flex', alignItems: 'center', gap: 8 },
  swatchPreview: { width: 32, height: 32, borderRadius: 8, border: `1px solid ${t.border.default}`, flexShrink: 0 },
  swatchNameInput: { flex: '1 1 30%', minWidth: 0 },
  swatchHexInput: { flex: '0 1 110px', minWidth: 0, fontFamily: "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" },
  swatchRoleInput: { flex: '1 1 30%', minWidth: 0 },
  inputError: { borderColor: t.text.danger },
  errInline: { fontSize: 12, color: t.text.danger },
  addSwatchBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    background: 'transparent',
    border: `1px dashed ${t.border.default}`,
    borderRadius: 8,
    padding: '7px 12px',
    fontSize: 12.5,
    fontWeight: 600,
    color: t.text.primaryBrand,
    cursor: 'pointer',
  },
  cancelFormBtn: { padding: '9px 16px', borderRadius: 10, border: `1px solid ${t.border.default}`, background: t.background.surface, color: t.text.secondary, fontSize: 13, cursor: 'pointer' },
  saveFormBtn: { padding: '9px 16px', borderRadius: 10, border: 'none', background: t.text.primaryBrand, color: t.text.onPrimary, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
}
