// LinkedIn post scheduling tab.
// This Week: Mon/Wed/Fri slot cards for the current calendar week, pinned
// through Friday (doesn't jump forward mid-week). Next Week: same grid for
// the week after, visible from Wednesday onward so posts can be prepped
// ahead of time. Drafts: ideas saved before they're assigned to any slot.
// Pending Posts: unpublished posts that fell out of both weeks' slot grids
// instead of silently vanishing. Post History: resolved (published/failed)
// posts grouped by week. Weekly reminder banner. Create/edit happens in a
// right-side drawer; clicking any post card anywhere opens a read-only
// detail panel with the full content, banner image, and actions.
import { useEffect, useRef, useState } from 'react'
import { Trash2, Copy, Pencil } from 'lucide-react'
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { mono } from '../ui'
import { formatPortalDate } from '../../utils/formatDate'
import { invokeErrorCode, humanizeErrorCode } from '../../utils/invokeError'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { ProgressiveImage } from '../../components/shared/ProgressiveImage'
import { LinkedInPostComposer, type SlotOption } from './LinkedInPostComposer'
import { LinkedInPostView } from './LinkedInPostView'
import {
  IMAGE_BUCKET,
  POST_COLUMNS,
  SIGNED_URL_TTL,
  STATUS_TONES,
  daysOverdue,
  deleteLinkedInPost,
  formatSlotDate,
  formatWeekRange,
  groupPostsByWeek,
  isSameInstant,
  isoSlotDate,
  nextWeekOf,
  publishLinkedInPost,
  type Post,
  type WeekDates,
} from './linkedinPosts'

type SlotDate = 'monday' | 'wednesday' | 'friday'

const SLOTS: { key: SlotDate; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'friday', label: 'Friday' },
]

// How far back "Post History" looks for resolved posts. Wide enough that a
// week is never truncated mid-group by a row-count cap; the query itself
// stays cheap since this admin only publishes ~3 posts/week.
const HISTORY_WINDOW_DAYS = 180

type ComposerState = { mode: 'create'; slotDateStr?: string } | { mode: 'edit'; post: Post } | null

// Empty slots in a given week, offered as "assign to a slot" options when
// editing a draft. weekLabel prefixes each option ("This week — Wed 6 Aug").
function emptySlotOptions(dates: WeekDates | null, posts: Post[], weekLabel: string): SlotOption[] {
  if (!dates) return []
  return SLOTS.filter(({ key }) => {
    const iso = isoSlotDate(dates[key])
    return !posts.some((p) => p.scheduled_for && isSameInstant(p.scheduled_for, iso))
  }).map(({ key }) => ({ dateStr: dates[key], label: `${weekLabel} — ${formatSlotDate(dates[key])}` }))
}

export function LinkedInTab() {
  const { isMobile } = useBreakpoint()
  const [weekDates, setWeekDates] = useState<WeekDates | null>(null)
  const [nextWeekDates, setNextWeekDates] = useState<WeekDates | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [nextWeekPosts, setNextWeekPosts] = useState<Post[]>([])
  const [drafts, setDrafts] = useState<Post[]>([])
  const [pendingOverdue, setPendingOverdue] = useState<Post[]>([])
  const [history, setHistory] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [composer, setComposer] = useState<ComposerState>(null)
  const [viewingPost, setViewingPost] = useState<Post | null>(null)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const plannerRef = useRef<HTMLDivElement>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function load() {
    setLoading(true)
    try {
      const { data: week } = await supabase.rpc('get_upcoming_linkedin_week')
      if (!week || week.length === 0) return
      const thisWeek = week[0] as WeekDates
      const nextWeek = nextWeekOf(thisWeek)
      setWeekDates(thisWeek)
      setNextWeekDates(nextWeek)

      const thisWeekIsos = SLOTS.map(({ key }) => isoSlotDate(thisWeek[key]))
      const nextWeekIsos = SLOTS.map(({ key }) => isoSlotDate(nextWeek[key]))
      const allSlotIsos = [...thisWeekIsos, ...nextWeekIsos]
      // A post still sitting in either week's slot grid is shown there only,
      // never duplicated into "Pending Posts" or "History" (e.g. next
      // Friday's post published early is still next Friday's slot card
      // until that week rolls around).
      const inVisibleSlotGrid = (p: Post) => !!p.scheduled_for && allSlotIsos.some((iso) => isSameInstant(p.scheduled_for as string, iso))
      const nowIso = new Date().toISOString()
      const historyWindowStart = new Date(Date.now() - HISTORY_WINDOW_DAYS * 86_400_000).toISOString()

      const [weekRes, nextWeekRes, draftRes, pendingRes, historyRes] = await Promise.all([
        supabase.from('linkedin_posts').select(POST_COLUMNS).in('scheduled_for', thisWeekIsos),
        supabase.from('linkedin_posts').select(POST_COLUMNS).in('scheduled_for', nextWeekIsos),
        supabase.from('linkedin_posts').select(POST_COLUMNS).eq('status', 'draft').order('created_at', { ascending: false }).limit(100),
        supabase
          .from('linkedin_posts')
          .select(POST_COLUMNS)
          .eq('status', 'pending')
          .lt('scheduled_for', nowIso)
          .order('scheduled_for', { ascending: true })
          .limit(50),
        supabase
          .from('linkedin_posts')
          .select(POST_COLUMNS)
          .in('status', ['published', 'failed'])
          .gte('scheduled_for', historyWindowStart)
          .order('scheduled_for', { ascending: false })
          .limit(300),
      ])

      const weekRows = (weekRes.data ?? []) as Post[]
      const nextWeekRows = (nextWeekRes.data ?? []) as Post[]
      const draftRows = (draftRes.data ?? []) as Post[]
      const pendingRows = ((pendingRes.data ?? []) as Post[]).filter((p) => !inVisibleSlotGrid(p))
      const histRows = ((historyRes.data ?? []) as Post[]).filter((p) => !inVisibleSlotGrid(p))

      setPosts(weekRows)
      setNextWeekPosts(nextWeekRows)
      setDrafts(draftRows)
      setPendingOverdue(pendingRows)
      setHistory(histRows)
      await loadImageUrls([...weekRows, ...nextWeekRows, ...draftRows, ...pendingRows, ...histRows])
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

  const today = new Date()
  const dayOfWeek = today.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  // Next Week becomes relevant once you're far enough into this week that
  // it's worth prepping ahead — Wednesday through Friday.
  const showNextWeek = dayOfWeek >= 3 && dayOfWeek <= 5
  const pendingThisWeek = posts.filter((p) => p.status === 'pending').length
  const showReminderBanner = isWeekend && pendingThisWeek < 3

  const availableSlotOptions = [
    ...emptySlotOptions(weekDates, posts, 'This week'),
    ...emptySlotOptions(nextWeekDates, nextWeekPosts, 'Next week'),
  ]

  function closeComposer() {
    setComposer(null)
  }

  async function handleComposerSaved(savedPost: Post) {
    const prevComposer = composer
    setComposer(null)
    await load()
    const dateLabel = savedPost.scheduled_for ? formatSlotDate(savedPost.scheduled_for) : null
    if (prevComposer?.mode === 'create') {
      showToast(dateLabel ? `Post saved for ${dateLabel}.` : 'Draft saved.')
    } else if (prevComposer?.mode === 'edit' && prevComposer.post.status === 'draft' && savedPost.status === 'pending') {
      showToast(`Draft scheduled for ${dateLabel}.`)
    } else {
      showToast(dateLabel ? `Post updated for ${dateLabel}.` : 'Draft updated.')
    }
  }

  // Switches a currently-open detail panel straight into the edit drawer
  // (view -> edit pivot), rather than requiring a close-then-reopen.
  function openEditFromView(post: Post) {
    setViewingPost(null)
    setComposer({ mode: 'edit', post })
  }

  // Keyboard equivalent of clicking a post card (H7: flexibility).
  function handleCardKeyDown(e: KeyboardEvent, post: Post) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setViewingPost(post)
    }
  }

  async function handlePublish(post: Post) {
    setPublishing(post.id)
    const result = await publishLinkedInPost(post)
    setPublishing(null)
    if (!result.ok) {
      showToast('Could not mark as published. Please try again.')
      return
    }
    if (post.image_path && result.imageUrl) {
      window.open(result.imageUrl, '_blank', 'noopener')
      showToast('Post copied to clipboard. Image opened in a new tab — download it and attach it on LinkedIn.')
    } else {
      showToast('Post copied to clipboard. Paste and publish on LinkedIn now.')
    }
    await load()
  }

  async function handleDelete(post: Post) {
    setDeleting(post.id)
    const ok = await deleteLinkedInPost(post)
    setDeleting(null)
    if (!ok) {
      showToast('Could not delete post. Please try again.')
      return
    }
    await load()
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
      const code = await invokeErrorCode(data, error)
      if (code || !data) {
        showToast(humanizeErrorCode(code, 'Could not send test reminder.'))
      } else {
        showToast(data.reminded ? 'Test reminder sent.' : 'No reminder needed (posts already filled).')
      }
    } catch {
      showToast('Could not send test reminder.')
    }
  }

  if (loading) {
    return <p style={styles.loading}>Loading LinkedIn planner...</p>
  }

  const weekGroups = groupPostsByWeek(history)
  const isPub = (post: Post) => publishing === post.id
  const isDel = (post: Post) => deleting === post.id

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

      {/* This Week */}
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

        {weekDates && (
          <WeekSlotGrid
            slotDates={weekDates}
            posts={posts}
            imageUrls={imageUrls}
            isMobile={isMobile}
            onView={setViewingPost}
            onEdit={(post) => setComposer({ mode: 'edit', post })}
            onPublish={handlePublish}
            onDelete={handleDelete}
            onAddNew={(dateStr) => setComposer({ mode: 'create', slotDateStr: dateStr })}
            isPublishing={isPub}
            isDeleting={isDel}
          />
        )}
      </div>

      {/* Next Week — visible Wed-Fri so posts can be prepped ahead of time */}
      {showNextWeek && nextWeekDates && (
        <div>
          <div style={styles.plannerHeader}>
            <div>
              <h2 style={styles.sectionHeading}>Next Week's Posts</h2>
              <p style={styles.weekRange}>{formatWeekRange(nextWeekDates.monday, nextWeekDates.friday)}</p>
            </div>
          </div>
          <WeekSlotGrid
            slotDates={nextWeekDates}
            posts={nextWeekPosts}
            imageUrls={imageUrls}
            isMobile={isMobile}
            onView={setViewingPost}
            onEdit={(post) => setComposer({ mode: 'edit', post })}
            onPublish={handlePublish}
            onDelete={handleDelete}
            onAddNew={(dateStr) => setComposer({ mode: 'create', slotDateStr: dateStr })}
            isPublishing={isPub}
            isDeleting={isDel}
          />
        </div>
      )}

      {/* Drafts — ideas saved before they're assigned to a specific week */}
      <div style={styles.pendingSection}>
        <div style={styles.plannerHeader}>
          <div>
            <h2 style={styles.sectionHeading}>Drafts</h2>
            <p style={styles.weekRange}>
              {drafts.length === 0 ? 'No unscheduled ideas' : `${drafts.length} idea${drafts.length !== 1 ? 's' : ''} not yet scheduled`}
            </p>
          </div>
          <button
            type="button"
            style={{ ...styles.testReminderBtn, ...(isMobile ? styles.fullWidthBtn : null) }}
            onClick={() => setComposer({ mode: 'create' })}
          >
            + New Draft
          </button>
        </div>
        {drafts.length > 0 && (
          <div style={{ ...styles.slotGrid, ...(isMobile ? styles.slotGridMobile : null) }}>
            {drafts.map((post) => (
              <button
                type="button"
                key={post.id}
                style={styles.draftCard}
                onClick={() => setViewingPost(post)}
              >
                {post.image_path && imageUrls[post.image_path] && (
                  <ProgressiveImage
                    src={imageUrls[post.image_path]}
                    alt={post.image_alt ?? 'Post image'}
                    shimmerHeight={80}
                    radius={6}
                    fit="cover"
                  />
                )}
                <p style={styles.postPreview}>{post.content}</p>
                <span style={{ ...styles.statusBadge, background: STATUS_TONES.draft.bg, color: STATUS_TONES.draft.fg, alignSelf: 'flex-start' }}>
                  draft
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pending Posts — unpublished posts that fell out of both weeks' slot
          grids so they stay visible and actionable instead of silently
          disappearing. */}
      {pendingOverdue.length > 0 && (
        <div style={styles.pendingSection}>
          <div>
            <h2 style={styles.sectionHeading}>Pending Posts</h2>
            <p style={styles.weekRange}>
              {pendingOverdue.length} unpublished post{pendingOverdue.length !== 1 ? 's' : ''} need attention
            </p>
          </div>
          <div style={{ ...styles.slotGrid, ...(isMobile ? styles.slotGridMobile : null) }}>
            {pendingOverdue.map((post) => {
              const overdue = post.scheduled_for ? daysOverdue(post.scheduled_for) : 0
              return (
                <button
                  type="button"
                  key={post.id}
                  style={styles.pendingCard}
                  onClick={() => setViewingPost(post)}
                >
                  <div style={styles.slotHeader}>
                    <span style={styles.slotDay}>{post.scheduled_for ? formatPortalDate(post.scheduled_for) : ''}</span>
                    {overdue > 0 && (
                      <span style={styles.overdueTag}>Overdue by {overdue} day{overdue !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                  {post.image_path && imageUrls[post.image_path] && (
                    <ProgressiveImage
                      src={imageUrls[post.image_path]}
                      alt={post.image_alt ?? 'Post image'}
                      shimmerHeight={80}
                      radius={6}
                      fit="cover"
                    />
                  )}
                  <p style={styles.postPreview}>{post.content}</p>
                  <span style={{ ...styles.statusBadge, background: STATUS_TONES.pending.bg, color: STATUS_TONES.pending.fg, alignSelf: 'flex-start' }}>
                    pending
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Post history — grouped by week ("July Week 4") */}
      <div style={styles.historySection}>
        <h2 style={styles.sectionHeading}>Post History</h2>
        {history.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyHeading}>No posts published yet</p>
            <p style={styles.emptyBody}>Posts you publish will appear here.</p>
          </div>
        ) : (
          weekGroups.map((group) => (
            <div key={group.key} style={styles.weekGroup}>
              <h3 style={styles.weekGroupHeading}>{group.label}</h3>
              {isMobile ? (
                <div style={styles.histCardStack}>
                  {group.posts.map((post) => (
                    <div
                      key={post.id}
                      style={styles.histCard}
                      onClick={() => setViewingPost(post)}
                      onKeyDown={(e) => handleCardKeyDown(e, post)}
                      role="button"
                      tabIndex={0}
                    >
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
                        <span style={styles.monoCell}>{post.scheduled_for ? formatPortalDate(post.scheduled_for) : ''}</span>
                        <div style={styles.histActions}>
                          <button
                            type="button"
                            style={styles.iconBtnMobile}
                            onClick={(e) => { e.stopPropagation(); handleCopy(post.content) }}
                            title="Copy post"
                            aria-label="Copy post"
                          >
                            <Copy size={14} color={t.text.muted} />
                          </button>
                          <button
                            type="button"
                            style={styles.iconBtnMobile}
                            onClick={(e) => { e.stopPropagation(); handleDelete(post) }}
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
                        <th style={styles.th}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.posts.map((post) => (
                        <tr
                          key={post.id}
                          style={styles.histTr}
                          onClick={() => setViewingPost(post)}
                          onKeyDown={(e) => handleCardKeyDown(e, post)}
                          role="button"
                          tabIndex={0}
                        >
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
                            <span style={styles.monoCell}>{post.scheduled_for ? formatPortalDate(post.scheduled_for) : ''}</span>
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
                            <div style={styles.histActions}>
                              <button
                                type="button"
                                style={styles.iconBtn}
                                onClick={(e) => { e.stopPropagation(); handleCopy(post.content) }}
                                title="Copy post"
                              >
                                <Copy size={13} color={t.text.muted} />
                              </button>
                              <button
                                type="button"
                                style={styles.iconBtn}
                                onClick={(e) => { e.stopPropagation(); handleDelete(post) }}
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
          ))
        )}
      </div>

      {composer && (
        <LinkedInPostComposer
          // Forces a remount if the target ever changes directly instead of
          // reusing state from the previous post.
          key={composer.mode === 'edit' ? composer.post.id : `create-${composer.slotDateStr ?? 'draft'}`}
          mode={composer.mode}
          post={composer.mode === 'edit' ? composer.post : undefined}
          slotDateStr={composer.mode === 'create' ? composer.slotDateStr : undefined}
          existingImageUrl={composer.mode === 'edit' && composer.post.image_path ? imageUrls[composer.post.image_path] : undefined}
          availableSlots={composer.mode === 'edit' && composer.post.status === 'draft' ? availableSlotOptions : undefined}
          onClose={closeComposer}
          onSaved={handleComposerSaved}
        />
      )}

      {viewingPost && (
        <LinkedInPostView
          key={viewingPost.id}
          post={viewingPost}
          imageUrl={viewingPost.image_path ? imageUrls[viewingPost.image_path] ?? null : null}
          onClose={() => setViewingPost(null)}
          onEdit={openEditFromView}
          onDeleted={async () => { setViewingPost(null); await load() }}
          onPublished={async () => { setViewingPost(null); await load() }}
          onToast={showToast}
        />
      )}
    </div>
  )
}

// Mon/Wed/Fri slot grid, reused for both "This Week" and "Next Week" — each
// card opens the detail panel on click (H4: consistent interaction across
// every post card in the tab); the quick-action buttons inside stop
// propagation so they act on the post directly instead of also opening it.
function WeekSlotGrid({
  slotDates,
  posts,
  imageUrls,
  isMobile,
  onView,
  onEdit,
  onPublish,
  onDelete,
  onAddNew,
  isPublishing,
  isDeleting,
}: {
  slotDates: WeekDates
  posts: Post[]
  imageUrls: Record<string, string>
  isMobile: boolean
  onView: (post: Post) => void
  onEdit: (post: Post) => void
  onPublish: (post: Post) => void
  onDelete: (post: Post) => void
  onAddNew: (dateStr: string) => void
  isPublishing: (post: Post) => boolean
  isDeleting: (post: Post) => boolean
}) {
  function stop(e: MouseEvent, fn: () => void) {
    e.stopPropagation()
    fn()
  }
  function onKeyDown(e: KeyboardEvent, post: Post) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onView(post)
    }
  }

  return (
    <div style={{ ...styles.slotGrid, ...(isMobile ? styles.slotGridMobile : null) }}>
      {SLOTS.map(({ key, label }) => {
        const dateStr = slotDates[key]
        const slotIso = isoSlotDate(dateStr)
        const post = posts.find((p) => p.scheduled_for && isSameInstant(p.scheduled_for, slotIso))
        const pub = post ? isPublishing(post) : false
        const del = post ? isDeleting(post) : false

        return (
          <div
            key={key}
            style={{
              ...styles.slotCard,
              ...(post ? {} : styles.slotCardEmpty),
            }}
            onClick={post ? () => onView(post) : undefined}
            onKeyDown={post ? (e) => onKeyDown(e, post) : undefined}
            role={post ? 'button' : undefined}
            tabIndex={post ? 0 : undefined}
          >
            <div style={styles.slotHeader}>
              <span style={styles.slotDay}>{label}</span>
              <span style={styles.slotDate}>{formatSlotDate(dateStr)}</span>
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
                          onClick={(e) => stop(e, () => onEdit(post))}
                          title="Edit post"
                        >
                          <Pencil size={14} color={t.text.tertiary} />
                        </button>
                        <button
                          type="button"
                          style={styles.publishBtn}
                          disabled={pub}
                          onClick={(e) => stop(e, () => onPublish(post))}
                        >
                          {pub ? 'Publishing...' : 'Publish Now'}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      style={styles.iconBtn}
                      disabled={del}
                      onClick={(e) => stop(e, () => onDelete(post))}
                      title="Delete post"
                    >
                      <Trash2 size={14} color={del ? t.text.muted : tokens.ruby} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <button
                type="button"
                style={styles.addPostBtn}
                onClick={() => onAddNew(dateStr)}
              >
                + Add Post
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
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

  // Pending Posts / Drafts sections
  pendingSection: { display: 'flex', flexDirection: 'column', gap: 16 },
  pendingCard: {
    background: tokens.surface,
    border: `1px solid ${tokens.gold}`,
    borderRadius: 10,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 140,
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  draftCard: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 10,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 140,
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  overdueTag: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    color: tokens.ruby,
  },

  historySection: { display: 'flex', flexDirection: 'column', gap: 12 },
  weekGroup: { display: 'flex', flexDirection: 'column', gap: 10 },
  weekGroupHeading: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    margin: 0,
    paddingBottom: 6,
    borderBottom: `1px solid ${t.border.subtle}`,
  },
  emptyState: { textAlign: 'center', padding: '40px 24px' },
  emptyHeading: {
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
    color: t.text.primary,
    margin: '0 0 6px',
  },
  emptyBody: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary, margin: 0 },
  histTable: { width: '100%', borderCollapse: 'collapse', minWidth: 560 },
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
  histTr: { cursor: 'pointer' },
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
    cursor: 'pointer',
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
