// Single source of truth for mime-type -> broad file kind, shared by
// AttachmentSection's FileIcon, OutputsBrowser's row icons, and the Lightbox
// preview (which needs to know whether to render an image, a PDF iframe, a
// video tag, or a plain download fallback).
export type FileKind = 'image' | 'pdf' | 'video' | 'other'

export function fileKind(mimeType: string | null | undefined): FileKind {
  if (!mimeType) return 'other'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  return 'other'
}
