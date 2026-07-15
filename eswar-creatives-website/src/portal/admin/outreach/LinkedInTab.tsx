// LinkedIn post scheduling tab.
// Week planner: Mon/Wed/Fri slot cards. Post history table. Weekly reminder banner.
import { useEffect, useRef, useState } from 'react'
import { Trash2, Copy } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { mono, formatDate } from '../ui'
import { useBreakpoint } from '../../hooks/useBreakpoint'

type Post = {
  id: string
  content: string
  scheduled_for: string
  status: 'pending' | 'published' | 'failed'
  published_at: string | null
  created_at: string
}

type SlotDate = 'monday' | 'wednesday' | 'friday'

const IST_OFFSET = '+05:30'
const LI_CHAR_LIMIT = 3000

const STATUS_TONES: Record<string, { bg: string; fg: string }> = {
  pending:   { bg: t.background.muted, fg: t.text.tertiary },
  published: { bg: tokens.greenLight, fg: tokens.green },
  failed:    { bg: tokens.rubyLight, fg: tokens.ruby },
}

function isoSlotDate(dateStr: string): string {
  return `${dateStr}T09:00:00${IST_OFFSET}`
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
  const [draftContent, setDraftContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
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
      const { monday, wednesday, friday } = week[0] as { monday: string; wednesday: string; friday: string }
      setWeekDates({ monday, wednesday, friday })

      const slotIsos = [isoSlotDate(monday), isoSlotDate(wednesday), isoSlotDate(friday)]
      const today = new Date().toISOString().slice(0, 10)

      const [weekPosts, histPosts] = await Promise.all([
        supabase
          .from('linkedin_posts')
          .select('id, content, scheduled_for, status, published_at, created_at')
          .in('scheduled_for', slotIsos),
        supabase
          .from('linkedin_posts')
          .select('id, content, scheduled_for, status, published_at, created_at')
          .lt('scheduled_for', `${today}T00:00:00Z`)
          .order('scheduled_for', { ascending: false })
          .limit(20),
      ])

      setPosts((weekPosts.data ?? []) as Post[])
      setHistory((histPosts.data ?? []) as Post[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const today = new Date()
  const dayOfWeek = today.getDay()
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const pendingThisWeek = posts.filter((p) => p.status === 'pending').length
  const showReminderBanner = isWeekend && pendingThisWeek < 3

  async function handleSave(slot: SlotDate) {
    if (!weekDates || !draftContent.trim()) return
    setSaving(true)
    const dateStr = weekDates[slot]
    const { error } = await supabase
      .from('linkedin_posts')
      .insert({
        content: draftContent.trim(),
        scheduled_for: isoSlotDate(dateStr),
        status: 'pending',
      })
    if (error) {
      showToast('Could not save post. Please try again.')
    } else {
      setOpenSlot(null)
      setDraftContent('')
      await load()
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
        showToast('Post copied to clipboard. Paste and publish on LinkedIn now.')
      }
    } catch {
      showToast('Could not copy to clipboard.')
    } finally {
      setPublishing(null)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const { error } = await supabase.from('linkedin_posts').delete().eq('id', id)
    if (error) {
      showToast('Could not delete post. Please try again.')
    } else {
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
            const slotIso = isoSlotDate(dateStr)
            const post = posts.find((p) => p.scheduled_for === slotIso)
            const isOpen = openSlot === key
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
                          <button
                            type="button"
                            style={styles.publishBtn}
                            disabled={isPub}
                            onClick={() => handlePublish(post)}
                          >
                            {isPub ? 'Publishing...' : 'Publish Now'}
                          </button>
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
                  <>
                    {isOpen ? (
                      <div style={styles.draftArea}>
                        <textarea
                          style={styles.draftTextarea}
                          value={draftContent}
                          onChange={(e) => setDraftContent(e.target.value)}
                          rows={5}
                          maxLength={LI_CHAR_LIMIT}
                          placeholder="Write your LinkedIn post..."
                          autoFocus
                        />
                        <div style={styles.draftFooter}>
                          <span style={styles.charCount}>
                            {LI_CHAR_LIMIT - draftContent.length} remaining
                          </span>
                          <div style={styles.draftBtns}>
                            <button
                              type="button"
                              style={styles.cancelDraftBtn}
                              onClick={() => { setOpenSlot(null); setDraftContent('') }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              style={{ ...styles.saveDraftBtn, opacity: saving ? 0.6 : 1 }}
                              onClick={() => handleSave(key)}
                              disabled={saving || !draftContent.trim()}
                            >
                              {saving ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        style={styles.addPostBtn}
                        onClick={() => { setOpenSlot(key); setDraftContent('') }}
                      >
                        + Add Post
                      </button>
                    )}
                  </>
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
                <p style={styles.histCardContent}>{post.content}</p>
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
  draftArea: { display: 'flex', flexDirection: 'column', gap: 8 },
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
  histCardContent: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    margin: 0,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  histCardBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },

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
