// Shared portal image component. Shows a skeleton shimmer while the image
// loads, then fades it in. Loading is cancellable and priority-aware via
// useImagePriority, so it never blocks the surface and can be aborted on
// navigation. Token-driven shimmer with a light/dark variant for light pages
// and dark surfaces (e.g. the mockup lightbox). No raw hex.
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { t, motionTokens } from '../../theme'
import { useImagePriority, type ImagePriorityApi } from '../../hooks/useImagePriority'

type Variant = 'light' | 'dark'

export interface ProgressiveImageProps {
  src: string                 // full-size URL
  thumbnailSrc?: string       // optional low-res placeholder shown blurred while loading
  alt: string
  priority?: boolean          // cancels other loads, fetches first
  shimmerHeight?: number      // fixed box height; reserves space so nothing shifts
  variant?: Variant           // shimmer palette; 'dark' for dark surfaces
  // Optional shared loader so several images on one surface share a cache and
  // abort scope. Omit to use a private loader.
  loader?: ImagePriorityApi
  fit?: 'contain' | 'cover'
  radius?: number
  className?: string
  style?: CSSProperties
  imgStyle?: CSSProperties
}

// Shimmer gradient stops per variant. Light surfaces use the light background
// tokens; dark surfaces use the white-alpha overlay tokens so the skeleton
// stays visible on a near-black stage instead of looking like a white box.
const SHIMMER: Record<Variant, { a: string; b: string }> = {
  light: { a: t.background.subtle, b: t.background.muted },
  dark: { a: t.background.overlayLight, b: t.background.overlayLightStrong },
}

// Inject the sweep keyframes once, lazily, so the component is drop-in.
let keyframesInjected = false
function ensureKeyframes() {
  if (keyframesInjected || typeof document === 'undefined') return
  const el = document.createElement('style')
  el.dataset.ecProgressiveImage = 'true'
  el.textContent = '@keyframes ecShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}'
  document.head.appendChild(el)
  keyframesInjected = true
}

export function ProgressiveImage({
  src,
  thumbnailSrc,
  alt,
  priority = false,
  shimmerHeight,
  variant = 'light',
  loader,
  fit = 'contain',
  radius = 12,
  className,
  style,
  imgStyle,
}: ProgressiveImageProps) {
  const privateLoader = useImagePriority()
  const load = loader ?? privateLoader
  const [objUrl, setObjUrl] = useState<string | null>(() => load.getCached(src) ?? null)
  const [decoded, setDecoded] = useState(false)
  const shimmer = SHIMMER[variant]

  useEffect(() => {
    ensureKeyframes()
  }, [])

  // (Re)load whenever the source changes. Reuses the cache synchronously when
  // possible so revisited images appear without a flash.
  useEffect(() => {
    let active = true
    setDecoded(false)
    const cached = load.getCached(src)
    if (cached) {
      setObjUrl(cached)
      return
    }
    setObjUrl(null)
    load.loadImage(src, priority ? 'high' : 'low').then((u) => {
      if (active && u) setObjUrl(u)
    })
    return () => {
      active = false
    }
  }, [src, priority, load])

  // "Boxed" means a fixed-size area (the image fills it via objectFit); reserve
  // it so nothing shifts when the image arrives. Driven by shimmerHeight or an
  // explicit height in `style` (the lightbox passes a vh-based height).
  const boxed = shimmerHeight != null || style?.height != null
  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    height: shimmerHeight,
    borderRadius: radius,
    overflow: 'hidden',
    ...style,
  }

  return (
    <div className={className} style={containerStyle}>
      {/* Skeleton shimmer, shown until the image has decoded. */}
      {!decoded && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: radius,
            background: `linear-gradient(90deg, ${shimmer.a} 25%, ${shimmer.b} 50%, ${shimmer.a} 75%)`,
            backgroundSize: '200% 100%',
            animation: 'ecShimmer 1.5s linear infinite',
          }}
        />
      )}

      {/* Optional low-res placeholder, blurred, under the full image. */}
      {!decoded && thumbnailSrc && (
        <img
          src={thumbnailSrc}
          alt=""
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: fit,
            filter: 'blur(8px)',
            transform: 'scale(1.04)',
          }}
        />
      )}

      {objUrl && (
        <img
          src={objUrl}
          alt={alt}
          onLoad={() => setDecoded(true)}
          style={{
            position: boxed ? 'absolute' : 'relative',
            inset: boxed ? 0 : undefined,
            width: '100%',
            height: boxed ? '100%' : 'auto',
            objectFit: fit,
            borderRadius: radius,
            display: 'block',
            // Fade in once decoded (motionTokens.base 200ms); shimmer fills the
            // gap until then.
            opacity: decoded ? 1 : 0,
            transition: `opacity ${motionTokens.durationBase} ${motionTokens.easeDefault}`,
            ...imgStyle,
          }}
        />
      )}
    </div>
  )
}
