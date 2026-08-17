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

export type BrandVisualCategory = 'guidelines' | 'assets' | 'templates'
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
}

export const BRAND_VISUAL_CATEGORIES: { id: BrandVisualCategory; label: string; groups: string[] }[] = [
  { id: 'guidelines', label: 'Guidelines', groups: ['Logo', 'Colour', 'Typography', 'Imagery'] },
  { id: 'assets', label: 'Assets', groups: ['Media', 'Logos', 'Icons', 'Documents'] },
  { id: 'templates', label: 'Templates', groups: ['Social', 'Digital', 'Print'] },
]

export function groupsForCategory(category: BrandVisualCategory): string[] {
  return BRAND_VISUAL_CATEGORIES.find((c) => c.id === category)?.groups ?? []
}

export function categoryLabel(category: BrandVisualCategory): string {
  return BRAND_VISUAL_CATEGORIES.find((c) => c.id === category)?.label ?? category
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
