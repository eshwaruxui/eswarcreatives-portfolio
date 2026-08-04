// Shared types, constants, date helpers, and mutation actions for the
// LinkedIn content calendar (LinkedInTab, LinkedInPostComposer,
// LinkedInPostView) so all three agree on the same shape and behavior.
import { supabase } from '../../../lib/supabase'
import { tokens, t } from '../../theme'

export type LinkedInPostStatus = 'draft' | 'pending' | 'published' | 'failed'

export type Post = {
  id: string
  content: string
  // Null only for drafts — every pending/published/failed row is guaranteed
  // a date by the linkedin_posts_draft_scheduled_for_check DB constraint.
  scheduled_for: string | null
  status: LinkedInPostStatus
  published_at: string | null
  created_at: string
  image_path: string | null
  image_alt: string | null
}

export const POST_COLUMNS = 'id, content, scheduled_for, status, published_at, created_at, image_path, image_alt'

export const STATUS_TONES: Record<string, { bg: string; fg: string }> = {
  draft: { bg: t.background.subtle, fg: t.text.muted },
  pending: { bg: t.background.muted, fg: t.text.tertiary },
  published: { bg: tokens.greenLight, fg: tokens.green },
  failed: { bg: tokens.rubyLight, fg: tokens.ruby },
}

// Drafts and pending posts are the two "not yet published" states that can
// still be edited or published directly; published/failed posts are final.
export function isEditable(post: Post): boolean {
  return post.status === 'draft' || post.status === 'pending'
}

export const IST_OFFSET = '+05:30'
export const LI_CHAR_LIMIT = 3000
export const IMAGE_BUCKET = 'linkedin-post-images'
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const SIGNED_URL_TTL = 3600

export function isoSlotDate(dateStr: string): string {
  return `${dateStr}T09:00:00${IST_OFFSET}`
}

// Postgres returns timestamptz normalized to UTC (e.g. "+00:00"), which never
// string-equals a locally-built "+05:30" ISO string for the same instant —
// compare as timestamps instead.
export function isSameInstant(a: string, b: string): boolean {
  return new Date(a).getTime() === new Date(b).getTime()
}

export function formatWeekRange(mon: string, fri: string): string {
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${fmt(mon)} - ${fmt(fri)}`
}

export type WeekDates = { monday: string; wednesday: string; friday: string }

// Derives next week's Mon/Wed/Fri from this week's, entirely client-side —
// no separate RPC needed since it's always exactly +7 days on each date.
export function nextWeekOf(week: WeekDates): WeekDates {
  const addDays = (d: string, n: number) => {
    const date = new Date(`${d}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + n)
    return date.toISOString().slice(0, 10)
  }
  return { monday: addDays(week.monday, 7), wednesday: addDays(week.wednesday, 7), friday: addDays(week.friday, 7) }
}

export function formatSlotDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
}

// IST-formatted timestamp for the mobile post-history card list.
export function formatIST(iso: string): string {
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
    return new Date(iso).toLocaleDateString('en-GB')
  }
}

// Calendar-day parts of an instant, read in IST — used so week grouping and
// "days overdue" match the timezone the Mon/Wed/Fri slots are authored in,
// rather than whatever timezone the viewing browser happens to be in.
function istDateParts(iso: string): { year: number; month: number; day: number; weekday: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(new Date(iso))
  const map: Record<string, string> = {}
  for (const p of parts) map[p.type] = p.value
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day), weekday: weekdayMap[map.weekday] ?? 0 }
}

export type WeekGroup = { key: string; label: string; posts: Post[] }

// Groups posts into "<Month> Week N" buckets, anchored to the Monday of the
// IST calendar week each post falls in (so a post never gets misfiled into
// the wrong bucket just because the admin's browser is in a different
// timezone). A week that straddles a month boundary is labeled by its
// Monday's month — the editorial-calendar convention — so all three
// Mon/Wed/Fri posts in a week always share one label even if Friday lands in
// the next month.
function weekGroupInfo(iso: string): { key: string; label: string; mondayUtc: number } {
  const { year, month, day, weekday } = istDateParts(iso)
  // Anchor at UTC noon on the IST calendar date so date-only arithmetic below
  // never drifts across a day boundary due to DST or local-offset rounding.
  const anchor = new Date(Date.UTC(year, month - 1, day, 12))
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday
  anchor.setUTCDate(anchor.getUTCDate() + diffToMonday)
  const weekOfMonth = Math.ceil(anchor.getUTCDate() / 7)
  const monthLabel = anchor.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })
  const key = `${anchor.getUTCFullYear()}-${anchor.getUTCMonth()}-${weekOfMonth}`
  return { key, label: `${monthLabel} Week ${weekOfMonth}`, mondayUtc: anchor.getTime() }
}

// Buckets posts by week (newest week first), each bucket's posts chronological
// (Mon -> Fri) so a group reads like a mini calendar rather than an arbitrary
// order.
export function groupPostsByWeek(posts: Post[]): WeekGroup[] {
  const buckets = new Map<string, { label: string; mondayUtc: number; posts: Post[] }>()
  for (const post of posts) {
    // Drafts (null scheduled_for) never reach this — History only ever holds
    // resolved (published/failed) posts — but guard defensively anyway.
    if (!post.scheduled_for) continue
    const { key, label, mondayUtc } = weekGroupInfo(post.scheduled_for)
    const existing = buckets.get(key)
    if (existing) existing.posts.push(post)
    else buckets.set(key, { label, mondayUtc, posts: [post] })
  }
  return [...buckets.values()]
    .sort((a, b) => b.mondayUtc - a.mondayUtc)
    .map(({ label, posts: groupPosts }, i) => ({
      key: `${label}-${i}`,
      label,
      posts: [...groupPosts].sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime()),
    }))
}

// Whole IST calendar days between a past scheduled_for and now. 0 means "due
// today, not yet published"; negative values (not shown to the caller) would
// mean it's not actually overdue yet.
export function daysOverdue(scheduledFor: string): number {
  const { year, month, day } = istDateParts(scheduledFor)
  const scheduledUtcMidnight = Date.UTC(year, month - 1, day)
  const { year: ny, month: nm, day: nd } = istDateParts(new Date().toISOString())
  const nowUtcMidnight = Date.UTC(ny, nm - 1, nd)
  return Math.round((nowUtcMidnight - scheduledUtcMidnight) / 86_400_000)
}

// Shared mutation actions — used by both the slot-grid cards (LinkedInTab)
// and the detail panel (LinkedInPostView) so "publish" and "delete" behave
// identically no matter where they're triggered from. Neither call site gets
// real LinkedIn API access (there isn't one): "publish" copies the content to
// the clipboard and marks the row done; the human pastes it on linkedin.com.
export async function publishLinkedInPost(
  post: Post
): Promise<{ ok: true; post: Post; imageUrl: string | null } | { ok: false }> {
  try {
    await navigator.clipboard.writeText(post.content)
  } catch {
    return { ok: false }
  }
  const published_at = new Date().toISOString()
  const { error } = await supabase.from('linkedin_posts').update({ status: 'published', published_at }).eq('id', post.id)
  if (error) return { ok: false }
  let imageUrl: string | null = null
  if (post.image_path) {
    const { data: signed } = await supabase.storage.from(IMAGE_BUCKET).createSignedUrl(post.image_path, SIGNED_URL_TTL)
    imageUrl = signed?.signedUrl ?? null
  }
  return { ok: true, post: { ...post, status: 'published', published_at }, imageUrl }
}

export async function deleteLinkedInPost(post: Post): Promise<boolean> {
  const { error } = await supabase.from('linkedin_posts').delete().eq('id', post.id)
  if (error) return false
  if (post.image_path) void supabase.storage.from(IMAGE_BUCKET).remove([post.image_path])
  return true
}
