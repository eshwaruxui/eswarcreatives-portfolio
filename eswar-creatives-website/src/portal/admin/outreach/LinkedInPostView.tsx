// Right-side read-only panel for a single LinkedIn post — shows the full
// (untruncated) content and banner image. Opened by clicking any post card
// anywhere in the tab (This/Next Week slots, Pending, Drafts, History).
// Drafts and pending posts get Edit/Publish actions; resolved posts
// (published/failed) are view + copy + delete only.
import { useState } from 'react'
import { Copy, Pencil, Trash2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import { tokens, t, fonts } from '../../theme'
import { mono } from '../ui'
import { Spinner } from '../../Spinner'
import { SidePanel } from '../SidePanel'
import { ProgressiveImage } from '../../components/shared/ProgressiveImage'
import { formatPortalDate } from '../../utils/formatDate'
import {
  STATUS_TONES,
  daysOverdue,
  deleteLinkedInPost,
  formatIST,
  isEditable,
  publishLinkedInPost,
  type Post,
} from './linkedinPosts'

type ViewProps = {
  post: Post
  imageUrl: string | null
  onClose: () => void
  onEdit: (post: Post) => void
  onDeleted: (id: string) => void
  onPublished: (post: Post) => void
  onToast: (msg: string) => void
}

export function LinkedInPostView({ post, imageUrl, onClose, onEdit, onDeleted, onPublished, onToast }: ViewProps) {
  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Drafts and pending posts can both be edited; only a pending post (one
  // that already has a scheduled_for) can be published — publishing a draft
  // directly would leave status='published' with scheduled_for still null,
  // which the DB's linkedin_posts_draft_scheduled_for_check rejects. A draft
  // has to be assigned to a slot first (via Edit).
  const canEdit = isEditable(post)
  const canPublish = post.status === 'pending'
  const overdue = post.status === 'pending' && post.scheduled_for ? daysOverdue(post.scheduled_for) : -1

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(post.content)
      onToast('Copied to clipboard.')
    } catch {
      onToast('Could not copy to clipboard.')
    }
  }

  async function handlePublish() {
    setPublishing(true)
    const result = await publishLinkedInPost(post)
    setPublishing(false)
    if (!result.ok) {
      onToast('Could not mark as published. Please try again.')
      return
    }
    if (post.image_path && result.imageUrl) {
      window.open(result.imageUrl, '_blank', 'noopener')
      onToast('Post copied to clipboard. Image opened in a new tab — download it and attach it on LinkedIn.')
    } else {
      onToast('Post copied to clipboard. Paste and publish on LinkedIn now.')
    }
    onPublished(result.post)
  }

  async function handleDelete() {
    setDeleting(true)
    const ok = await deleteLinkedInPost(post)
    setDeleting(false)
    if (!ok) {
      onToast('Could not delete post. Please try again.')
      return
    }
    onDeleted(post.id)
  }

  const headerExtra = (
    <div style={styles.headerActions}>
      {canEdit && (
        <button type="button" style={styles.iconBtn} onClick={() => onEdit(post)} title="Edit post" aria-label="Edit post">
          <Pencil size={15} color={t.text.tertiary} />
        </button>
      )}
      <button type="button" style={styles.iconBtn} onClick={handleCopy} title="Copy post" aria-label="Copy post">
        <Copy size={15} color={t.text.tertiary} />
      </button>
      <button
        type="button"
        style={styles.iconBtn}
        onClick={handleDelete}
        disabled={deleting}
        title="Delete post"
        aria-label="Delete post"
      >
        {deleting ? <Spinner size={14} color={tokens.ruby} /> : <Trash2 size={15} color={tokens.ruby} />}
      </button>
    </div>
  )

  return (
    <SidePanel
      title={post.status === 'draft' ? 'LinkedIn draft' : 'LinkedIn post'}
      subtitle={post.scheduled_for ? formatPortalDate(post.scheduled_for) : 'No date assigned yet'}
      onClose={onClose}
      width={520}
      headerExtra={headerExtra}
      preventClose={publishing || deleting}
    >
      <div style={styles.body}>
        <div style={styles.metaRow}>
          <span style={{ ...styles.statusBadge, background: STATUS_TONES[post.status]?.bg, color: STATUS_TONES[post.status]?.fg }}>
            {post.status}
          </span>
          {overdue > 0 && (
            <span style={styles.overdueBadge}>Overdue by {overdue} day{overdue !== 1 ? 's' : ''}</span>
          )}
          {post.published_at && <span style={styles.metaText}>Published {formatIST(post.published_at)}</span>}
        </div>

        {post.image_path && imageUrl && (
          <ProgressiveImage src={imageUrl} alt={post.image_alt ?? 'Post image'} radius={8} fit="cover" shimmerHeight={220} />
        )}

        <p style={styles.content}>{post.content}</p>

        {post.status === 'draft' && <p style={styles.metaText}>Assign this to a slot (via Edit) before it can be published.</p>}

        {canPublish && (
          <button type="button" style={{ ...styles.publishBtn, opacity: publishing ? 0.6 : 1 }} onClick={handlePublish} disabled={publishing}>
            {publishing ? (
              <>
                <Spinner size={13} color="#fff" />
                <span>Publishing...</span>
              </>
            ) : (
              'Publish Now'
            )}
          </button>
        )}
      </div>
    </SidePanel>
  )
}

const styles: Record<string, CSSProperties> = {
  headerActions: { display: 'flex', alignItems: 'center', gap: 4 },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 6,
    display: 'flex',
    alignItems: 'center',
  },
  body: { display: 'flex', flexDirection: 'column', gap: 14 },
  metaRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  overdueBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    background: tokens.rubyLight,
    color: tokens.ruby,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
  },
  metaText: { fontFamily: mono, fontSize: 11, color: t.text.muted },
  content: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 1.6,
    color: t.text.primary,
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  publishBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '10px 16px',
    cursor: 'pointer',
  },
}
