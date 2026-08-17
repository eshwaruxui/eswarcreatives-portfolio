// Resolves signed thumbnail URLs for the image-type items in a Brand Visual
// Guide grid. Shared by BrandVisualClientView and BrandVisualPublicView,
// which differ only in which resolver they pass (direct signed URL vs the
// public edge function) — see utils/brandVisual.ts. Each item is resolved
// at most once per mount; a failed or still-missing file simply never gets
// an entry, which is what drives the card's "no preview" fallback state.
import { useEffect, useRef, useState } from 'react'
import type { BrandVisualFileUrls, BrandVisualItem } from '../utils/brandVisual'

export function useBrandVisualThumbnails(
  items: BrandVisualItem[],
  resolve: (item: BrandVisualItem) => Promise<BrandVisualFileUrls | null>
): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const attempted = useRef(new Set<string>())

  useEffect(() => {
    const targets = items.filter(
      (item) => item.content_type === 'image' && item.storage_path && !attempted.current.has(item.id)
    )
    if (targets.length === 0) return
    let cancelled = false
    targets.forEach((item) => {
      attempted.current.add(item.id)
      resolve(item).then((res) => {
        if (cancelled || !res) return
        setUrls((prev) => ({ ...prev, [item.id]: res.previewUrl }))
      })
    })
    return () => {
      cancelled = true
    }
  }, [items, resolve])

  return urls
}
