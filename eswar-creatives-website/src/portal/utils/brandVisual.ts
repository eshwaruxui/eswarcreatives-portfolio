// Brand Visual Guide — shared types, taxonomy and file-URL resolution.
// Category/group definitions live in exactly one place so the admin
// sidebar, the client sidebar and the public tabs can never drift from
// each other. Two resolvers, not one: an authenticated caller (admin or
// client — RLS on the storage bucket already tells the two apart) signs
// URLs directly; a public caller has no storage access at all and goes
// through the token-gated get-brand-visual-file-url edge function instead.
// The shared renderers only ever see the resolved { previewUrl,
// downloadUrl } shape, never how it was obtained.
import { supabase } from '../../lib/supabase'

export type BrandVisualCategory = 'guidelines' | 'assets' | 'templates' | 'tone_of_voice'
export type BrandVisualContentType = 'document' | 'image' | 'video' | 'audio' | 'link'
export type BrandVisualStatus = 'draft' | 'published'
export type BrandVisualVisibility = 'admin_only' | 'client' | 'public'

export interface BrandVisualSwatch {
  name: string
  hex: string
  role?: string
}

export interface BrandVisualSpecimen {
  sample: string
  fontFamily: string
  weight?: number
  tracking?: string
  size?: number // px, explicit type-specimen size; renderer falls back to a default when absent
  italic?: boolean
  role?: string
  note?: string
}

// One word rendered at several sizes side by side, to show where a display
// face stops holding its shape at small sizes — the "size stress test"
// pattern, distinct from a single specimen because it repeats one word
// rather than showing several different lines.
export interface BrandVisualScaleStrip {
  word: string
  fontFamily: string
  weight?: number
  sizes: number[]
  note?: string
}

export interface BrandVisualSection {
  label: string
  value: string
}

// 'photo' (default when absent): padded frame, image contained within it —
// correct for a logo mark or a real photograph. 'pattern': no padding, the
// image fills its frame edge to edge — correct for a seamless/tileable
// swatch, where a mat border around it would misrepresent how it repeats.
export type BrandVisualImageTreatment = 'photo' | 'pattern'

// One document item, two content styles side by side: what to reach for
// and what to avoid. Tone of Voice only.
export interface BrandVisualWordList {
  leftLabel: string
  left: string[]
  rightLabel: string
  right: string[]
}

// One document item, off-brand line next to its on-brand rewrite. Tone of
// Voice only.
export interface BrandVisualBeforeAfterRow {
  off: string
  on: string
}

// Shape varies by content_type — every field optional, resolved by the
// renderer's own precedence order (see BrandVisualRenderer.tsx).
export interface BrandVisualDetail {
  content?: string // plain guideline text, the document fallback; also extended usage notes for image-type items
  note?: string // short caption shown under a rendered file
  imageTreatment?: BrandVisualImageTreatment // image-type items only, see BrandVisualImageTreatment
  swatches?: BrandVisualSwatch[]
  specimens?: BrandVisualSpecimen[]
  scaleStrip?: BrandVisualScaleStrip
  sections?: BrandVisualSection[]
  sectionsNote?: string
  url?: string // link type
  label?: string // link type button label
  // Tone of Voice only, content_type='document'. 'prose' (default) renders
  // detail.content through the inline bold/paragraph renderer; 'wordlist'
  // and 'beforeAfter' render their own dedicated shapes below instead.
  layout?: 'prose' | 'wordlist' | 'beforeAfter'
  wordList?: BrandVisualWordList
  beforeAfterRows?: BrandVisualBeforeAfterRow[]
  // Tone of Voice only. Display-only warning (lock icon + note) — never
  // blocks editing or deletion. See PORTAL_ARCHITECTURE.md's Tone of Voice
  // entry for why this stayed display-only rather than a hard block.
  locked?: boolean
}

export interface BrandVisualItem {
  id: string
  client_id: string
  category: BrandVisualCategory
  group_label: string
  title: string
  summary: string | null
  content_type: BrandVisualContentType
  file_type: string | null
  status: BrandVisualStatus
  visibility: BrandVisualVisibility
  detail: BrandVisualDetail
  sort_order: number
  storage_path: string | null
  public_token: string
  created_at: string
  updated_at: string
  // Populated two different ways depending on caller, never fetched by this
  // type itself: the public listing RPC (get_brand_visual_items_by_client_token,
  // migration 0098) already nests each item's attachments inline, so a
  // public caller has this for free with no second round-trip. An
  // authenticated caller (admin/client) gets it lazily, only once a detail
  // panel actually opens for one item -- see resolveAuthenticatedAttachments
  // below. Absent (undefined) on a freshly-loaded list either way; always
  // an array (never undefined) once resolved.
  attachments?: BrandVisualItemAttachment[]
}

// Migration 0097. One row per file -- multiple attachments per item, the
// child-table shape this codebase already uses for "one thing, many files"
// (project_output_files, project_attachments), not an array/jsonb column.
export interface BrandVisualItemAttachment {
  id: string
  item_id: string
  file_name: string
  storage_path: string
  file_size: number | null
  file_type: string | null
  sort_order: number
  public_token: string
  created_at: string
}

export const BRAND_VISUAL_CATEGORIES: { id: BrandVisualCategory; label: string; groups: string[] }[] = [
  { id: 'guidelines', label: 'Guidelines', groups: ['Logo', 'Colour', 'Typography', 'Imagery'] },
  { id: 'assets', label: 'Assets', groups: ['Media', 'Logos', 'Icons', 'Documents'] },
  { id: 'templates', label: 'Templates', groups: ['Social', 'Digital', 'Print'] },
  // Flat in the UI, but reuses the (category, group_label) structure like
  // every other category rather than a nullable-group mechanism — every
  // row is inserted with group_label 'General', and isSingleGroupCategory
  // tells the nav/header to hide the group entirely, since a category with
  // exactly one group has nothing meaningful to drill into.
  { id: 'tone_of_voice', label: 'Tone of Voice', groups: ['General'] },
]

export function groupsForCategory(category: BrandVisualCategory): string[] {
  return BRAND_VISUAL_CATEGORIES.find((c) => c.id === category)?.groups ?? []
}

export function categoryLabel(category: BrandVisualCategory): string {
  return BRAND_VISUAL_CATEGORIES.find((c) => c.id === category)?.label ?? category
}

// True for a category whose groups are purely structural (one entry) with
// nothing for the user to actually choose between — the nav and header
// hide the group level entirely for these rather than showing a
// single-option accordion/breadcrumb.
export function isSingleGroupCategory(category: BrandVisualCategory): boolean {
  return groupsForCategory(category).length === 1
}

export interface BrandVisualFileUrls {
  previewUrl: string
  downloadUrl: string
}

// storage_path is deliberately flat: `{client_id}/{random_id}_{filename}`
// (see migration 0094). Recovering the original filename for the download
// header is a matter of dropping the random-id prefix up to the first
// underscore, mirroring the upload side's own naming.
export function fileNameFromStoragePath(storagePath: string): string {
  const last = storagePath.split('/').pop() ?? storagePath
  const idx = last.indexOf('_')
  return idx >= 0 ? last.slice(idx + 1) : last
}

// Admin or client, direct signed URLs. Works for both without branching —
// the storage.objects RLS policies (admin_all / client_read_own) already
// decide who can read the object; this just asks for a URL.
export async function resolveAuthenticatedFileUrls(item: BrandVisualItem): Promise<BrandVisualFileUrls | null> {
  if (!item.storage_path) return null
  const fileName = fileNameFromStoragePath(item.storage_path)
  const [previewRes, downloadRes] = await Promise.all([
    supabase.storage.from('brand-visual-files').createSignedUrl(item.storage_path, 3600),
    supabase.storage.from('brand-visual-files').createSignedUrl(item.storage_path, 3600, { download: fileName }),
  ])
  if (previewRes.error || !previewRes.data?.signedUrl || downloadRes.error || !downloadRes.data?.signedUrl) return null
  return { previewUrl: previewRes.data.signedUrl, downloadUrl: downloadRes.data.signedUrl }
}

// Public visitor, no session at all. The token itself is the credential —
// same model as get-output-file-url.
export async function resolvePublicFileUrls(item: BrandVisualItem): Promise<BrandVisualFileUrls | null> {
  const { data, error } = await supabase.functions.invoke('get-brand-visual-file-url', {
    body: { token: item.public_token },
  })
  const body = data as { signed_url?: string; download_url?: string } | null
  if (error || !body?.signed_url || !body?.download_url) return null
  return { previewUrl: body.signed_url, downloadUrl: body.download_url }
}

// Extension-based, not MIME-based: file_type is always an uppercase
// extension on both brand_visual_items and brand_visual_item_attachments
// (see fileType/pickFile in ItemFormModal, and the attachment upload
// handler), never a MIME type. Shared here (not local to
// BrandVisualRenderer, its original home) now that attachment lists need
// the same audio-vs-generic-file decision the single-file case already did.
const AUDIO_EXTENSIONS = new Set(['MP3', 'WAV', 'M4A', 'OGG', 'AAC', 'FLAC', 'WEBM'])
export function isAudioFileType(fileType: string | null): boolean {
  return !!fileType && AUDIO_EXTENSIONS.has(fileType.toUpperCase())
}

// Admin or client, direct signed URL for one attachment -- same reasoning
// as resolveAuthenticatedFileUrls, just against the attachment's own
// storage_path. file_name is a real column here (migration 0097), unlike
// the single-file case, so there's no {random_id}_ prefix to strip.
export async function resolveAuthenticatedAttachmentUrls(
  attachment: BrandVisualItemAttachment
): Promise<BrandVisualFileUrls | null> {
  const [previewRes, downloadRes] = await Promise.all([
    supabase.storage.from('brand-visual-files').createSignedUrl(attachment.storage_path, 3600),
    supabase.storage
      .from('brand-visual-files')
      .createSignedUrl(attachment.storage_path, 3600, { download: attachment.file_name }),
  ])
  if (previewRes.error || !previewRes.data?.signedUrl || downloadRes.error || !downloadRes.data?.signedUrl) return null
  return { previewUrl: previewRes.data.signedUrl, downloadUrl: downloadRes.data.signedUrl }
}

// Public visitor. The attachment's own public_token is the credential (not
// the item's) -- an item can have many attachments, each independently
// resolvable, mirroring get-output-file-url's per-file token shape one
// level down from the item-level token brand_visual_items already uses.
export async function resolvePublicAttachmentUrls(
  attachment: BrandVisualItemAttachment
): Promise<BrandVisualFileUrls | null> {
  const { data, error } = await supabase.functions.invoke('get-brand-visual-attachment-url', {
    body: { token: attachment.public_token },
  })
  const body = data as { signed_url?: string; download_url?: string } | null
  if (error || !body?.signed_url || !body?.download_url) return null
  return { previewUrl: body.signed_url, downloadUrl: body.download_url }
}

// The list of attachments itself, not yet each one's signed URL -- resolved
// two different ways depending on caller, same split as the file-URL
// resolvers above. Authenticated: a direct RLS-scoped query (admin sees
// every attachment via admin_all_*, client sees only attachments of items
// already readable to them via the nested-subquery policy in migration
// 0097). Always returns an array, even on error (never null) -- an empty
// list and a failed fetch render identically (no attachments shown),
// which is the correct fallback for a merely-decorative section.
export async function resolveAuthenticatedAttachments(item: BrandVisualItem): Promise<BrandVisualItemAttachment[]> {
  const { data, error } = await supabase
    .from('brand_visual_item_attachments')
    .select('*')
    .eq('item_id', item.id)
    .order('sort_order', { ascending: true })
  if (error) return []
  return (data ?? []) as BrandVisualItemAttachment[]
}

// Public visitor. No query capability at all (no anon policy on
// brand_visual_item_attachments, deliberately -- see migration 0097) --
// the public listing RPC already nested every item's attachments inline
// (migration 0098), so this is a same-shape resolver purely for interface
// symmetry with the authenticated one above, not a real fetch.
export async function resolvePublicAttachments(item: BrandVisualItem): Promise<BrandVisualItemAttachment[]> {
  return item.attachments ?? []
}
