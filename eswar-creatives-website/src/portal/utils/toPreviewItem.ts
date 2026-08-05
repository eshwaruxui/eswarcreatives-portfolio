// Maps an Outputs file row + its resolved signed URL into the shape the
// (image-gallery-derived) Lightbox component expects. groupKey scopes the
// Lightbox's built-in next/prev navigation to files in the same folder.
import type { GalleryImage } from '../../components/lightbox/types'
import { fileKind } from './fileKind'
import { formatBytes } from './formatBytes'

export function toPreviewItem(
  file: { id: string; file_name: string; file_type: string | null; file_size: number | null },
  signedUrl: string,
  groupKey: string
): GalleryImage {
  return {
    id: file.id,
    src: signedUrl,
    alt: file.file_name,
    category: '',
    client: '',
    kind: fileKind(file.file_type),
    fileSizeLabel: formatBytes(file.file_size),
    groupKey,
  }
}
