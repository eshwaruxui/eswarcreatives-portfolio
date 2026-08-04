// Right-side drawer for creating or editing a single LinkedIn post. Replaces
// the old centered modal so composing reads consistently with every other
// admin drawer (LeadDrawer, EnquiryDrawer, ClientPanel, ...).
import { useEffect, useRef, useState } from 'react'
import { Image as ImageIcon, X, ThumbsUp, MessageCircle, Repeat2, Send } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { mono } from '../ui'
import { Spinner } from '../../Spinner'
import { SidePanel } from '../SidePanel'
import eswarLogo from '../../../imports/eswar-logo.svg'
import {
  IMAGE_BUCKET,
  LI_CHAR_LIMIT,
  MAX_IMAGE_BYTES,
  POST_COLUMNS,
  SIGNED_URL_TTL,
  formatSlotDate,
  isoSlotDate,
  type Post,
} from './linkedinPosts'

export type SlotOption = { dateStr: string; label: string }

type ComposerProps = {
  mode: 'create' | 'edit'
  post?: Post
  // Target slot date (YYYY-MM-DD). For mode === 'create': present -> creates
  // a scheduled post for that slot; absent -> creates a new draft instead.
  slotDateStr?: string
  // Pre-resolved signed URL for the post's existing image, if any (avoids a
  // redundant sign call when the parent already has it cached).
  existingImageUrl?: string | null
  // Currently-empty This/Next week slots, offered as an "assign to a slot"
  // picker when editing a draft. Ignored otherwise.
  availableSlots?: SlotOption[]
  onClose: () => void
  onSaved: (post: Post) => void
}

export function LinkedInPostComposer({ mode, post, slotDateStr, existingImageUrl, availableSlots, onClose, onSaved }: ComposerProps) {
  const isDraftPost = mode === 'edit' && post?.status === 'draft'
  const [draftContent, setDraftContent] = useState(post?.content ?? '')
  const [selectedSlot, setSelectedSlot] = useState('')
  const [draftImageFile, setDraftImageFile] = useState<File | null>(null)
  const [draftImagePreview, setDraftImagePreview] = useState<string | null>(post?.image_path ? (existingImageUrl ?? null) : null)
  const [draftImageAlt, setDraftImageAlt] = useState(post?.image_alt ?? '')
  const [draftOriginalImagePath] = useState<string | null>(post?.image_path ?? null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageDragging, setImageDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (draftImagePreview?.startsWith('blob:')) URL.revokeObjectURL(draftImagePreview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function removeDraftImage() {
    if (draftImagePreview?.startsWith('blob:')) URL.revokeObjectURL(draftImagePreview)
    setDraftImageFile(null)
    setDraftImagePreview(null)
    setImageError(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  function handleImageSelect(file: File) {
    if (!file.type.startsWith('image/')) {
      setImageError('Please choose an image file.')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Image too large (max 5MB).')
      return
    }
    if (draftImagePreview?.startsWith('blob:')) URL.revokeObjectURL(draftImagePreview)
    setImageError(null)
    setDraftImageFile(file)
    setDraftImagePreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!draftContent.trim()) return
    setSaving(true)
    setSaveError(null)

    // Resolve the final image_path for this save: a newly uploaded file
    // replaces it, an explicit removal clears it, otherwise it's unchanged.
    const slotKey = mode === 'create' ? (slotDateStr ?? 'draft').slice(0, 10) : 'edit'
    let imagePath: string | null = draftOriginalImagePath
    if (draftImageFile) {
      imagePath = `${slotKey}/${Date.now()}_${draftImageFile.name}`
      const { error: upErr } = await supabase.storage.from(IMAGE_BUCKET).upload(imagePath, draftImageFile)
      if (upErr) {
        setSaveError('Could not upload the image. Please try again.')
        setSaving(false)
        return
      }
    } else if (!draftImagePreview) {
      imagePath = null
    }

    const payload: Record<string, unknown> = {
      content: draftContent.trim(),
      image_path: imagePath,
      image_alt: imagePath ? (draftImageAlt.trim() || null) : null,
    }

    // A slot is only ever assigned here (create with a target slot, or
    // editing a draft that just got a slot picked) — editing an
    // already-scheduled post never touches scheduled_for/status.
    if (mode === 'create') {
      payload.scheduled_for = slotDateStr ? isoSlotDate(slotDateStr) : null
      payload.status = slotDateStr ? 'pending' : 'draft'
    } else if (isDraftPost && selectedSlot) {
      payload.scheduled_for = isoSlotDate(selectedSlot)
      payload.status = 'pending'
    }

    const { data, error } =
      mode === 'edit' && post
        ? await supabase.from('linkedin_posts').update(payload).eq('id', post.id).select(POST_COLUMNS).single()
        : await supabase.from('linkedin_posts').insert(payload).select(POST_COLUMNS).single()

    if (error || !data) {
      setSaveError(mode === 'edit' ? 'Could not update this post. Please try again.' : 'Could not save this post. Please try again.')
      setSaving(false)
      return
    }

    if (draftOriginalImagePath && draftOriginalImagePath !== imagePath) {
      void supabase.storage.from(IMAGE_BUCKET).remove([draftOriginalImagePath])
    }
    setSaving(false)
    onSaved(data as Post)
  }

  const activeDateStr = mode === 'create' ? slotDateStr : (post?.scheduled_for ?? undefined)
  const title = mode === 'edit' ? (isDraftPost ? 'Edit draft' : 'Edit post') : (slotDateStr ? 'New post' : 'New draft')
  const subtitle = activeDateStr ? formatSlotDate(activeDateStr) : (isDraftPost ? 'No date assigned yet' : undefined)

  function saveLabel(): string {
    if (mode === 'create') return slotDateStr ? 'Save' : 'Save draft'
    if (isDraftPost) return selectedSlot ? 'Assign & save' : 'Save draft'
    return 'Save changes'
  }

  const headerExtra = (
    <div style={styles.headerActions}>
      <button type="button" style={styles.cancelBtn} disabled={saving} onClick={onClose}>
        Cancel
      </button>
      <button
        type="button"
        style={{ ...styles.saveBtn, opacity: saving || !draftContent.trim() ? 0.6 : 1 }}
        onClick={handleSave}
        disabled={saving || !draftContent.trim()}
      >
        {saving ? (
          <>
            <Spinner size={12} color="#fff" />
            <span>Saving...</span>
          </>
        ) : (
          saveLabel()
        )}
      </button>
    </div>
  )

  return (
    <SidePanel title={title} subtitle={subtitle} onClose={onClose} width={560} headerExtra={headerExtra} preventClose={saving}>
      <div style={styles.body}>
        <textarea
          style={styles.draftTextarea}
          value={draftContent}
          onChange={(e) => setDraftContent(e.target.value)}
          rows={8}
          maxLength={LI_CHAR_LIMIT}
          placeholder="Write your LinkedIn post..."
          autoFocus
        />
        <p style={styles.charCount}>{LI_CHAR_LIMIT - draftContent.length} characters remaining</p>

        {isDraftPost && (
          <div style={styles.slotPicker}>
            <label style={styles.slotPickerLabel} htmlFor="linkedin-draft-slot">Assign to a slot (optional)</label>
            <select
              id="linkedin-draft-slot"
              style={styles.slotSelect}
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
            >
              <option value="">Keep as draft</option>
              {(availableSlots ?? []).map((s) => (
                <option key={s.dateStr} value={s.dateStr}>{s.label}</option>
              ))}
            </select>
            {(availableSlots ?? []).length === 0 && (
              <p style={styles.slotPickerHint}>No open slots this week or next — free one up, or keep this as a draft.</p>
            )}
          </div>
        )}

        {draftImagePreview ? (
          <div style={styles.imagePreviewRow}>
            <img src={draftImagePreview} alt="" style={styles.imagePreviewThumb} />
            <input
              type="text"
              style={styles.imageAltInput}
              placeholder="Alt text (optional)"
              value={draftImageAlt}
              onChange={(e) => setDraftImageAlt(e.target.value)}
              maxLength={200}
            />
            <button type="button" style={styles.imageRemoveBtn} onClick={removeDraftImage} title="Remove image" aria-label="Remove image">
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            style={{
              ...styles.imageDropZone,
              ...(imageDragging ? { borderColor: t.border.brand, background: t.background.tint1 } : {}),
            }}
            onClick={() => imageInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setImageDragging(true) }}
            onDragEnter={(e) => { e.preventDefault(); setImageDragging(true) }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setImageDragging(false)
            }}
            onDrop={(e) => {
              e.preventDefault()
              setImageDragging(false)
              const file = e.dataTransfer.files?.[0]
              if (file) handleImageSelect(file)
            }}
          >
            <ImageIcon size={13} />
            <span>{imageDragging ? 'Drop to attach' : 'Drop an image, or click to attach'}</span>
          </button>
        )}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImageSelect(file)
          }}
        />
        {imageError && <p style={styles.errorText}>{imageError}</p>}

        {draftContent.trim() && (
          <LinkedInPreviewCard content={draftContent} imageSrc={draftImagePreview} imageAlt={draftImageAlt} />
        )}

        {saveError && <p style={styles.errorText}>{saveError}</p>}
      </div>
    </SidePanel>
  )
}

// Realistic LinkedIn post card preview, shown live under the composer so the
// admin can see roughly what the post will look like before publishing.
function LinkedInPreviewCard({
  content,
  imageSrc,
  imageAlt,
}: {
  content: string
  imageSrc: string | null
  imageAlt: string
}) {
  const TRUNCATE_AT = 210
  const isTruncated = content.length > TRUNCATE_AT
  const displayText = isTruncated ? content.slice(0, TRUNCATE_AT).trimEnd() : content

  return (
    <div style={previewStyles.card}>
      <span style={previewStyles.label}>Live preview</span>
      <div style={previewStyles.header}>
        <img src={eswarLogo} alt="" style={previewStyles.avatar} />
        <div style={previewStyles.headerText}>
          <span style={previewStyles.name}>Eswar Creatives</span>
          <span style={previewStyles.headline}>Design systems &amp; brand engineering for enterprise SaaS</span>
          <span style={previewStyles.meta}>Now · 🌐</span>
        </div>
      </div>
      <p style={previewStyles.body}>
        {displayText}
        {isTruncated && <span style={previewStyles.seeMore}> ...see more</span>}
      </p>
      {imageSrc && <img src={imageSrc} alt={imageAlt || 'Post image'} style={previewStyles.image} />}
      <div style={previewStyles.engagementRow}>
        <span style={previewStyles.reactionIcons}>👍 ❤️ 💡</span>
        <span style={previewStyles.engagementCount}>128 · 14 comments</span>
      </div>
      <div style={previewStyles.actionsRow}>
        <span style={previewStyles.action}><ThumbsUp size={15} /> Like</span>
        <span style={previewStyles.action}><MessageCircle size={15} /> Comment</span>
        <span style={previewStyles.action}><Repeat2 size={15} /> Repost</span>
        <span style={previewStyles.action}><Send size={15} /> Send</span>
      </div>
    </div>
  )
}

const previewStyles: Record<string, CSSProperties> = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    background: tokens.surface,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    padding: '10px 12px',
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 10,
    fontWeight: 600,
    color: t.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  header: { display: 'flex', gap: 8 },
  avatar: { width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 },
  headerText: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  name: { fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: t.text.primary },
  headline: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: t.text.secondary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  meta: { fontFamily: fonts.body, fontSize: 11, color: t.text.muted },
  body: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  seeMore: { color: t.text.muted, fontWeight: 500 },
  image: {
    width: '100%',
    maxHeight: 220,
    objectFit: 'cover',
    borderRadius: 6,
    display: 'block',
  },
  engagementRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontFamily: fonts.body,
    fontSize: 11,
    color: t.text.muted,
    borderBottom: `1px solid ${t.border.subtle}`,
    paddingBottom: 8,
  },
  reactionIcons: { fontSize: 11 },
  engagementCount: {},
  actionsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 4,
  },
  action: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.tertiary,
  },
}

const styles: Record<string, CSSProperties> = {
  headerActions: { display: 'flex', alignItems: 'center', gap: 8 },
  cancelBtn: {
    background: 'none',
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.secondary,
    padding: '6px 12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  body: { display: 'flex', flexDirection: 'column', gap: 10 },
  draftTextarea: {
    width: '100%',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '8px 10px',
    outline: 'none',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  charCount: { fontFamily: mono, fontSize: 11, color: t.text.muted, margin: '-4px 0 0', textAlign: 'right' },
  slotPicker: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    background: t.background.subtle,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    padding: '10px 12px',
  },
  slotPickerLabel: { fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: t.text.secondary },
  slotSelect: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    padding: '6px 8px',
    outline: 'none',
  },
  slotPickerHint: { fontFamily: fonts.body, fontSize: 11, color: t.text.muted, margin: 0 },
  imageDropZone: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: 'none',
    border: `1px dashed ${t.border.medium}`,
    borderRadius: 8,
    padding: '8px 12px',
    width: '100%',
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.tertiary,
    cursor: 'pointer',
    boxSizing: 'border-box' as const,
    transition: `border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}, background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  imagePreviewRow: { display: 'flex', alignItems: 'center', gap: 8 },
  imagePreviewThumb: {
    width: 40,
    height: 40,
    objectFit: 'cover',
    borderRadius: 6,
    flexShrink: 0,
    border: `1px solid ${t.border.subtle}`,
  },
  imageAltInput: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    padding: '5px 8px',
    outline: 'none',
    minWidth: 0,
  },
  imageRemoveBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    color: tokens.ruby,
    flexShrink: 0,
  },
  errorText: { fontFamily: fonts.body, fontSize: 12, color: tokens.ruby, margin: 0 },
}
