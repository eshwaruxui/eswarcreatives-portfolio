// LinkedIn post scheduling tab.
// Week planner: Mon/Wed/Fri slot cards. Post history table. Weekly reminder banner.
import { useEffect, useRef, useState } from 'react'
import { Trash2, Copy, Image as ImageIcon, X, ThumbsUp, MessageCircle, Repeat2, Send, Pencil } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { mono, formatDate } from '../ui'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { Spinner } from '../../Spinner'
import { ProgressiveImage } from '../../components/shared/ProgressiveImage'
import eswarLogo from '../../../imports/eswar-logo.svg'

type Post = {
  id: string
  content: string
  scheduled_for: string
  status: 'pending' | 'published' | 'failed'
  published_at: string | null
  created_at: string
  image_path: string | null
  image_alt: string | null
}

type SlotDate = 'monday' | 'wednesday' | 'friday'

const IST_OFFSET = '+05:30'
const LI_CHAR_LIMIT = 3000
const IMAGE_BUCKET = 'linkedin-post-images'
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const SIGNED_URL_TTL = 3600

const STATUS_TONES: Record<string, { bg: string; fg: string }> = {
  pending:   { bg: t.background.muted, fg: t.text.tertiary },
  published: { bg: tokens.greenLight, fg: tokens.green },
  failed:    { bg: tokens.rubyLight, fg: tokens.ruby },
}

function isoSlotDate(dateStr: string): string {
  return `${dateStr}T09:00:00${IST_OFFSET}`
}

// Postgres returns timestamptz normalized to UTC (e.g. "+00:00"), which never
// string-equals a locally-built "+05:30" ISO string for the same instant —
// compare as timestamps instead.
function isSameInstant(a: string, b: string): boolean {
  return new Date(a).getTime() === new Date(b).getTime()
}

function formatWeekRange(mon: string, fri: string): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${fmt(mon)} - ${fmt(fri)}`
}

function formatSlotDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
}

// IST-formatted published_at for the mobile post-history card list.
function formatIST(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso))
  } catch {
    return formatDate(iso)
  }
}

export function LinkedInTab() {
  const { isMobile } = useBreakpoint()
  const [weekDates, setWeekDates] = useState<{ monday: string; wednesday: string; friday: string } | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [history, setHistory] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [openSlot, setOpenSlot] = useState<SlotDate | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftContent, setDraftContent] = useState('')
  const [draftImageFile, setDraftImageFile] = useState<File | null>(null)
  const [draftImagePreview, setDraftImagePreview] = useState<string | null>(null)
  const [draftImageAlt, setDraftImageAlt] = useState('')
  const [draftOriginalImagePath, setDraftOriginalImagePath] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [imageDragging, setImageDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const plannerRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function load() {
    setLoading(true)
    try {
      const { data: week } = await supabase.rpc('get_upcoming_linkedin_week')
      if (!week || week.length === 0) return
      const { monday, wednesday, friday } = week[0] as { monday: string; wednesday: string; friday: string }
      setWeekDates({ monday, wednesday, friday })

      const slotIsos = [isoSlotDate(monday), isoSlotDate(wednesday), isoSlotDate(friday)]
      const today = new Date().toISOString().slice(0, 10)

      const [weekPosts, histPosts] = await Promise.all([
        supabase
          .from('linkedin_posts')
          .select('id, content, scheduled_for, status, published_at, created_at, image_path, image_alt')
          .in('scheduled_for', slotIsos),
        supabase
          .from('linkedin_posts')
          .select('id, content, scheduled_for, status, published_at, created_at, image_path, image_alt')
          .lt('scheduled_for', `${today}T00:00:00Z`)
          .order('scheduled_for', { ascending: false })
          .limit(20),
      ])

      const weekRows = (weekPosts.data ?? []) as Post[]
      const histRows = (histPosts.data ?? []) as Post[]
      setPosts(weekRows)
      setHistory(histRows)
      await loadImageUrls([...weekRows, ...histRows])
    } finally {
      setLoading(false)
    }
  }

  async function loadImageUrls(rows: Post[]) {
    const paths = [...new Set(rows.map((p) => p.image_path).filter((p): p is string => !!p))]
    if (paths.length === 0) return
    const { data } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL)
    if (!data) return
    setImageUrls((prev) => {
      const next = { ...prev }
      for (const row of data) {
        if (row.path && row.signedUrl) next[row.path] = row.signedUrl
      }
      return next
    })
  }

  useEffect(() => { load() }, [])

  // Close the composer modal on Escape, unless a save is in flight.
  useEffect(() => {
    if (!openSlot) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !saving) closeDraft()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSlot, saving])

  const today = new Date()
  const dayOfWeek = today.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const pendingThisWeek = posts.filter((p) => p.status === 'pending').length
  const showReminderBanner = isWeekend && pendingThisWeek < 3

  // Clears whatever image is currently shown (new upload or the post's
  // existing one). Keeps draftOriginalImagePath so handleSave still knows
  // there was an original to delete/replace.
  function removeDraftImage() {
    if (draftImagePreview?.startsWith('blob:')) URL.revokeObjectURL(draftImagePreview)
    setDraftImageFile(null)
    setDraftImagePreview(null)
    setImageError(null)
    if (imageInputRef.current) imageInputRef.current.value = ''
  }

  // Full reset for opening a fresh draft or closing the composer.
  function resetDraftImage() {
    removeDraftImage()
    setDraftImageAlt('')
    setDraftOriginalImagePath(null)
  }

  function openAddDraft(slot: SlotDate) {
    setOpenSlot(slot)
    setEditingId(null)
    setDraftContent('')
    setSaveError(null)
    resetDraftImage()
  }

  function openEditDraft(post: Post, slot: SlotDate) {
    setOpenSlot(slot)
    setEditingId(post.id)
    setDraftContent(post.content)
    setSaveError(null)
    removeDraftImage()
    setDraftImageAlt(post.image_alt ?? '')
    setDraftOriginalImagePath(post.image_path)
    setDraftImagePreview(post.image_path ? (imageUrls[post.image_path] ?? null) : null)
  }

  function closeDraft() {
    setOpenSlot(null)
    setEditingId(null)
    setDraftContent('')
    setSaveError(null)
    resetDraftImage()
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
    if (!weekDates || !openSlot || !draftContent.trim()) return
    const slot = openSlot
    setSaving(true)
    setSaveError(null)
    const dateStr = weekDates[slot]

    // Resolve the final image_path for this save: a newly uploaded file
    // replaces it, an explicit removal clears it, otherwise it's unchanged.
    let imagePath: string | null = draftOriginalImagePath
    if (draftImageFile) {
      imagePath = `${slot}/${Date.now()}_${draftImageFile.name}`
      const { error: upErr } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(imagePath, draftImageFile)
      if (upErr) {
        setSaveError('Could not upload the image. Please try again.')
        setSaving(false)
        return
      }
    } else if (!draftImagePreview) {
      imagePath = null
    }

    const payload = {
      content: draftContent.trim(),
      image_path: imagePath,
      image_alt: imagePath ? (draftImageAlt.trim() || null) : null,
    }

    const { data, error } = editingId
      ? await supabase
          .from('linkedin_posts')
          .update(payload)
          .eq('id', editingId)
          .select('id, content, scheduled_for, status, published_at, created_at, image_path, image_alt')
          .single()
      : await supabase
          .from('linkedin_posts')
          .insert({ ...payload, scheduled_for: isoSlotDate(dateStr), status: 'pending' })
          .select('id, content, scheduled_for, status, published_at, created_at, image_path, image_alt')
          .single()

    if (error || !data) {
      setSaveError(editingId ? 'Could not update this post. Please try again.' : 'Could not save this post. Please try again.')
    } else {
      const savedPost = data as Post
      if (draftOriginalImagePath && draftOriginalImagePath !== imagePath) {
        void supabase.storage.from(IMAGE_BUCKET).remove([draftOriginalImagePath])
      }
      if (savedPost.image_path) await loadImageUrls([savedPost])
      setPosts((prev) =>
        editingId ? prev.map((p) => (p.id === savedPost.id ? savedPost : p)) : [...prev, savedPost]
      )
      showToast(editingId ? `Post updated for ${formatSlotDate(dateStr)}.` : `Post saved for ${formatSlotDate(dateStr)}.`)
      closeDraft()
    }
    setSaving(false)
  }

  async function handlePublish(post: Post) {
    setPublishing(post.id)
    try {
      await navigator.clipboard.writeText(post.content)
      const { error } = await supabase
        .from('linkedin_posts')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', post.id)
      if (error) {
        showToast('Could not mark as published. Please try again.')
      } else {
        setPosts((prev) =>
          prev.map((p) => p.id === post.id ? { ...p, status: 'published', published_at: new Date().toISOString() } : p)
        )
        if (post.image_path) {
          const { data: signed } = await supabase.storage
            .from(IMAGE_BUCKET)
            .createSignedUrl(post.image_path, SIGNED_URL_TTL)
          if (signed?.signedUrl) {
            window.open(signed.signedUrl, '_blank', 'noopener')
            showToast('Post copied to clipboard. Image opened in a new tab — download it and attach it on LinkedIn.')
          } else {
            showToast('Post copied to clipboard. Paste and publish on LinkedIn now.')
          }
        } else {
          showToast('Post copied to clipboard. Paste and publish on LinkedIn now.')
        }
      }
    } catch {
      showToast('Could not copy to clipboard.')
    } finally {
      setPublishing(null)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const target = posts.find((p) => p.id === id) ?? history.find((p) => p.id === id)
    const { error } = await supabase.from('linkedin_posts').delete().eq('id', id)
    if (error) {
      showToast('Could not delete post. Please try again.')
    } else {
      if (target?.image_path) {
        void supabase.storage.from(IMAGE_BUCKET).remove([target.image_path])
      }
      setPosts((prev) => prev.filter((p) => p.id !== id))
      setHistory((prev) => prev.filter((p) => p.id !== id))
    }
    setDeleting(null)
  }

  async function handleHistoryDelete(id: string) {
    await handleDelete(id)
  }

  async function handleCopy(content: string) {
    try {
      await navigator.clipboard.writeText(content)
      showToast('Copied to clipboard.')
    } catch {
      showToast('Could not copy to clipboard.')
    }
  }

  async function sendTestReminder() {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token ?? ''
      const { data, error } = await supabase.functions.invoke('send-linkedin-reminder', {
        body: {},
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (error || !data) {
        showToast('Could not send test reminder.')
      } else {
        showToast(data.reminded ? 'Test reminder sent.' : 'No reminder needed (posts already filled).')
      }
    } catch {
      showToast('Could not send test reminder.')
    }
  }

  const SLOTS: { key: SlotDate; label: string }[] = [
    { key: 'monday', label: 'Monday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'friday', label: 'Friday' },
  ]

  if (loading) {
    return <p style={styles.loading}>Loading LinkedIn planner...</p>
  }

  const activeDateStr = openSlot ? weekDates?.[openSlot] ?? '' : ''

  return (
    <div style={styles.root}>
      {toast && <div style={styles.toast}>{toast}</div>}

      {/* Reminder banner — full-width stacked on mobile, CTA below the text */}
      {showReminderBanner && weekDates && (
        <div style={{ ...styles.reminderBanner, ...(isMobile ? styles.reminderBannerMobile : null) }}>
          <span style={styles.reminderText}>
            You have {3 - pendingThisWeek} post{3 - pendingThisWeek !== 1 ? 's' : ''} missing for next week.
            Add them now to stay on schedule.
          </span>
          <button
            type="button"
            style={{ ...styles.reminderCta, ...(isMobile ? styles.fullWidthBtn : null) }}
            onClick={() => plannerRef.current?.scrollIntoView({ behavior: 'smooth' })}
          >
            Add Posts
          </button>
        </div>
      )}

      {/* Week planner */}
      <div ref={plannerRef}>
        <div style={styles.plannerHeader}>
          <div>
            <h2 style={styles.sectionHeading}>This Week's Posts</h2>
            {weekDates && (
              <p style={styles.weekRange}>{formatWeekRange(weekDates.monday, weekDates.friday)}</p>
            )}
          </div>
          <button
            type="button"
            style={{ ...styles.testReminderBtn, ...(isMobile ? styles.fullWidthBtn : null) }}
            onClick={sendTestReminder}
          >
            Send Test Reminder
          </button>
        </div>

        <div style={{ ...styles.slotGrid, ...(isMobile ? styles.slotGridMobile : null) }}>
          {SLOTS.map(({ key, label }) => {
            const dateStr = weekDates?.[key] ?? ''
            const slotIso = dateStr ? isoSlotDate(dateStr) : ''
            const post = slotIso ? posts.find((p) => isSameInstant(p.scheduled_for, slotIso)) : undefined
            const isPub = publishing === post?.id
            const isDel = deleting === post?.id

            return (
              <div
                key={key}
                style={{
                  ...styles.slotCard,
                  ...(post ? {} : styles.slotCardEmpty),
                }}
              >
                <div style={styles.slotHeader}>
                  <span style={styles.slotDay}>{label}</span>
                  <span style={styles.slotDate}>{dateStr ? formatSlotDate(dateStr) : ''}</span>
                </div>

                {post ? (
                  <>
                    {post.image_path && imageUrls[post.image_path] && (
                      <ProgressiveImage
                        src={imageUrls[post.image_path]}
                        alt={post.image_alt ?? 'Post image'}
                        shimmerHeight={80}
                        radius={6}
                        fit="cover"
                      />
                    )}
                    <p style={styles.postPreview} title={post.content}>
                      {post.content}
                    </p>
                    <div style={styles.postFooter}>
                      <span style={{
                        ...styles.statusBadge,
                        background: STATUS_TONES[post.status]?.bg,
                        color: STATUS_TONES[post.status]?.fg,
                      }}>
                        {post.status}
                      </span>
                      <div style={styles.postActions}>
                        {post.status === 'pending' && (
                          <>
                            <button
                              type="button"
                              style={styles.iconBtn}
                              onClick={() => openEditDraft(post, key)}
                              title="Edit post"
                            >
                              <Pencil size={14} color={t.text.tertiary} />
                            </button>
                            <button
                              type="button"
                              style={styles.publishBtn}
                              disabled={isPub}
                              onClick={() => handlePublish(post)}
                            >
                              {isPub ? 'Publishing...' : 'Publish Now'}
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          style={styles.iconBtn}
                          disabled={isDel}
                          onClick={() => handleDelete(post.id)}
                          title="Delete post"
                        >
                          <Trash2 size={14} color={isDel ? t.text.muted : tokens.ruby} />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    style={styles.addPostBtn}
                    onClick={() => openAddDraft(key)}
                  >
                    + Add Post
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Post history */}
      <div style={styles.historySection}>
        <h2 style={styles.sectionHeading}>Post History</h2>
        {history.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyHeading}>No posts published yet</p>
            <p style={styles.emptyBody}>Posts you publish will appear here.</p>
          </div>
        ) : isMobile ? (
          <div style={styles.histCardStack}>
            {history.map((post) => (
              <div key={post.id} style={styles.histCard}>
                <div style={styles.histCardTop}>
                  {post.image_path && imageUrls[post.image_path] && (
                    <ProgressiveImage
                      src={imageUrls[post.image_path]}
                      alt={post.image_alt ?? 'Post image'}
                      style={styles.histThumbMobile}
                      shimmerHeight={44}
                      radius={6}
                      fit="cover"
                    />
                  )}
                  <p style={styles.histCardContent}>{post.content}</p>
                </div>
                <div style={styles.histCardBottom}>
                  <span style={{
                    ...styles.statusBadge,
                    background: STATUS_TONES[post.status]?.bg,
                    color: STATUS_TONES[post.status]?.fg,
                  }}>
                    {post.status}
                  </span>
                  <span style={styles.monoCell}>
                    {post.published_at ? formatIST(post.published_at) : formatDate(post.scheduled_for)}
                  </span>
                  <div style={styles.histActions}>
                    <button
                      type="button"
                      style={styles.iconBtnMobile}
                      onClick={() => handleCopy(post.content)}
                      title="Copy post"
                      aria-label="Copy post"
                    >
                      <Copy size={14} color={t.text.muted} />
                    </button>
                    <button
                      type="button"
                      style={styles.iconBtnMobile}
                      onClick={() => handleHistoryDelete(post.id)}
                      disabled={deleting === post.id}
                      title="Delete"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} color={tokens.ruby} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.histTable}>
              <thead>
                <tr>
                  <th style={styles.th}></th>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Preview</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Published At</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {history.map((post) => (
                  <tr key={post.id} style={styles.histTr}>
                    <td style={styles.td}>
                      {post.image_path && imageUrls[post.image_path] ? (
                        <ProgressiveImage
                          src={imageUrls[post.image_path]}
                          alt={post.image_alt ?? 'Post image'}
                          style={styles.histThumb}
                          shimmerHeight={36}
                          radius={6}
                          fit="cover"
                        />
                      ) : (
                        <span style={styles.histThumbEmpty} />
                      )}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.monoCell}>{formatDate(post.scheduled_for)}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.histPreview}>{post.content.slice(0, 80)}{post.content.length > 80 ? '...' : ''}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        background: STATUS_TONES[post.status]?.bg,
                        color: STATUS_TONES[post.status]?.fg,
                      }}>
                        {post.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.monoCell}>{post.published_at ? formatDate(post.published_at) : '-'}</span>
                    </td>
                    <td style={styles.td}>
                      <div style={styles.histActions}>
                        <button
                          type="button"
                          style={styles.iconBtn}
                          onClick={() => handleCopy(post.content)}
                          title="Copy post"
                        >
                          <Copy size={13} color={t.text.muted} />
                        </button>
                        <button
                          type="button"
                          style={styles.iconBtn}
                          onClick={() => handleHistoryDelete(post.id)}
                          disabled={deleting === post.id}
                          title="Delete"
                        >
                          <Trash2 size={13} color={tokens.ruby} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openSlot && (
        <>
        <style>{`@keyframes linkedinComposerIn{from{opacity:0;transform:translateY(8px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
        <div
          style={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="linkedin-composer-title"
          onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) closeDraft() }}
        >
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <h2 id="linkedin-composer-title" style={styles.modalTitle}>
                {editingId ? 'Edit post' : 'New post'}
                {activeDateStr ? ` — ${formatSlotDate(activeDateStr)}` : ''}
              </h2>
              <button
                type="button"
                style={styles.modalCloseBtn}
                onClick={closeDraft}
                disabled={saving}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div style={styles.modalBody}>
              <textarea
                style={styles.draftTextarea}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                rows={6}
                maxLength={LI_CHAR_LIMIT}
                placeholder="Write your LinkedIn post..."
                autoFocus
              />

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
                  <button
                    type="button"
                    style={styles.imageRemoveBtn}
                    onClick={removeDraftImage}
                    title="Remove image"
                    aria-label="Remove image"
                  >
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
              {imageError && <p style={styles.saveError}>{imageError}</p>}

              {draftContent.trim() && (
                <LinkedInPreviewCard content={draftContent} imageSrc={draftImagePreview} imageAlt={draftImageAlt} />
              )}
            </div>

            <div style={styles.modalFooter}>
              <span style={styles.charCount}>
                {LI_CHAR_LIMIT - draftContent.length} remaining
              </span>
              <div style={styles.draftBtns}>
                <button
                  type="button"
                  style={styles.cancelDraftBtn}
                  disabled={saving}
                  onClick={closeDraft}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  style={{ ...styles.saveDraftBtn, opacity: saving ? 0.6 : 1 }}
                  onClick={handleSave}
                  disabled={saving || !draftContent.trim()}
                >
                  {saving ? (
                    <>
                      <Spinner size={12} color="#fff" />
                      <span>Saving...</span>
                    </>
                  ) : editingId ? (
                    'Save changes'
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
            {saveError && <p style={{ ...styles.saveError, padding: '0 20px 16px' }}>{saveError}</p>}
          </div>
        </div>
        </>
      )}
    </div>
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
  root: { display: 'flex', flexDirection: 'column', gap: 32 },
  loading: { fontFamily: fonts.body, fontSize: 14, color: t.text.muted, padding: '24px 0' },
  reminderBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    background: tokens.goldLight,
    border: `1px solid ${tokens.gold}`,
    borderRadius: 8,
    padding: '12px 16px',
  },
  reminderBannerMobile: { flexDirection: 'column', alignItems: 'stretch' },
  fullWidthBtn: { width: '100%', textAlign: 'center', justifyContent: 'center' },
  reminderText: { fontFamily: fonts.body, fontSize: 13, color: tokens.goldDark, flex: 1 },
  reminderCta: {
    background: tokens.goldDark,
    color: '#fff',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    padding: '6px 14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  plannerHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  sectionHeading: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: t.text.primary,
    margin: '0 0 4px',
  },
  weekRange: {
    fontFamily: mono,
    fontSize: 12,
    color: t.text.muted,
    margin: 0,
  },
  testReminderBtn: {
    background: 'none',
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.tertiary,
    padding: '5px 10px',
    cursor: 'pointer',
  },
  slotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
  },
  slotGridMobile: { gridTemplateColumns: '1fr', gap: 12 },
  slotCard: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 10,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 140,
  },
  slotCardEmpty: {
    border: `1.5px dashed ${t.border.subtle}`,
    background: t.background.subtle,
  },
  slotHeader: { display: 'flex', flexDirection: 'column', gap: 2 },
  slotDay: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: t.text.primary,
  },
  slotDate: {
    fontFamily: mono,
    fontSize: 11,
    color: t.text.muted,
  },
  postPreview: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
    margin: 0,
    flex: 1,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  postFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 'auto',
  },
  postActions: { display: 'flex', alignItems: 'center', gap: 6 },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  publishBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    padding: '5px 10px',
    cursor: 'pointer',
  },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  // 44px min tap target for the mobile post-history card actions.
  iconBtnMobile: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPostBtn: {
    background: 'none',
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    color: t.text.secondary,
    padding: '8px 12px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
    marginTop: 'auto',
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 500,
    background: t.background.scrim,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    background: tokens.surface,
    borderRadius: 14,
    boxShadow: '0 24px 60px rgba(2, 76, 79, 0.24)',
    animation: `linkedinComposerIn ${motionTokens.durationFast} ${motionTokens.easeEnter}`,
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '18px 20px',
    borderBottom: `1px solid ${t.border.subtle}`,
    flexShrink: 0,
  },
  modalTitle: {
    fontFamily: fonts.heading,
    fontSize: 17,
    fontWeight: 600,
    color: t.text.primary,
    margin: 0,
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    color: t.text.tertiary,
    flexShrink: 0,
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '18px 20px',
    overflowY: 'auto' as const,
  },
  modalFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '14px 20px',
    borderTop: `1px solid ${t.border.subtle}`,
    flexShrink: 0,
  },
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
  imagePreviewRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
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
  draftFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  charCount: { fontFamily: mono, fontSize: 11, color: t.text.muted },
  draftBtns: { display: 'flex', gap: 6 },
  cancelDraftBtn: {
    background: 'none',
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.secondary,
    padding: '5px 10px',
    cursor: 'pointer',
  },
  saveDraftBtn: {
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
    padding: '5px 10px',
    cursor: 'pointer',
  },
  saveError: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.ruby,
    margin: 0,
  },
  historySection: { display: 'flex', flexDirection: 'column', gap: 12 },
  emptyState: { textAlign: 'center', padding: '40px 24px' },
  emptyHeading: {
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
    color: t.text.primary,
    margin: '0 0 6px',
  },
  emptyBody: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary, margin: 0 },
  histTable: { width: '100%', borderCollapse: 'collapse', minWidth: 600 },
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
  histTr: { cursor: 'default' },
  td: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    padding: '10px 12px',
    borderBottom: `1px solid ${t.border.subtle}`,
    verticalAlign: 'middle',
  },
  monoCell: { fontFamily: mono, fontSize: 12, color: t.text.secondary },
  histPreview: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.secondary,
  },
  histActions: { display: 'flex', gap: 6, alignItems: 'center' },

  // Mobile post-history card list (replaces the table)
  histCardStack: { display: 'flex', flexDirection: 'column', gap: 8 },
  histCard: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 10,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  histCardTop: { display: 'flex', gap: 8, alignItems: 'flex-start' },
  histThumbMobile: { width: 44, height: 44, flexShrink: 0 },
  histCardContent: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    margin: 0,
    flex: 1,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  histCardBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  histThumb: { width: 36, height: 36, flexShrink: 0 },
  histThumbEmpty: { display: 'block', width: 36, height: 36 },

  toast: {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    background: tokens.primary,
    color: '#fff',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    borderRadius: 8,
    padding: '10px 20px',
    zIndex: 9999,
    pointerEvents: 'none' as const,
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
  },
}
