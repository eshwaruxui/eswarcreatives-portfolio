// QR Manager helpers, shared by the admin panel and the client tab.
//
// getQrImageUrl builds an api.qrserver.com URL rather than storing an image
// in Supabase -- the whole point of this feature is a QR that never expires
// or needs reprinting, so there's nothing to generate more than once and
// nothing to own. Colors come from the portal's live theme tokens, not a
// hardcoded hex: t.border.brand (#024C4F, the actual current brand/
// interactive teal -- #005F5A only exists in this codebase as ClientLightbox's
// own exempted dark-surface palette and the separate marketing-site theme,
// never a portal t.*/tokens.* export) and tokens.bg (#FAFAF9, the current
// component-surface fill -- the cream #FAF8F4 this used to reference was
// retired portal-wide 9 Aug 2026, see COMPONENT_PATTERNS.md's Page Canvas
// Token pattern).
import { t, tokens } from '../theme'

const QR_DOMAIN = 'eswarcreatives.in'

export function getQrImageUrl(slug: string, size = 1000): string {
  const data = encodeURIComponent(`${QR_DOMAIN}/qr/${slug}`)
  const bgcolor = tokens.bg.replace('#', '')
  const color = t.border.brand.replace('#', '')
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${data}&bgcolor=${bgcolor}&color=${color}&margin=20`
}

// Fetches an external image as a blob and triggers a real download with a
// proper filename. Needed because api.qrserver.com is not Supabase Storage,
// so the existing createSignedUrl({ download: true }) pattern doesn't apply
// -- a plain <a href> to a cross-origin URL opens inline instead of
// downloading. Used by both the admin and client Download buttons.
export async function downloadExternalImage(url: string, filename: string): Promise<void> {
  const res = await fetch(url)
  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

// Editable starting suggestion for a new QR's slug, e.g. "ng-whatsapp" for
// (clientInitials: "ng", useCase: "whatsapp"). Not enforced -- qr_codes.slug's
// DB unique constraint is the real guard, this just saves typing.
export function generateQrSlugSuggestion(clientInitials: string, useCase: string): string {
  return `${clientInitials}-${useCase}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
