import { useState, type CSSProperties, type ReactNode } from 'react'
import type { ImgRenderProps } from './types'

type LoadState = 'loading' | 'loaded' | 'error'

interface ImageRendererProps {
  src: string
  alt: string
  fallbackSrc?: string
  width?: number
  height?: number
  blurDataUrl?: string
  priority?: boolean
  placeholderColor?: string
  style?: CSSProperties
  className?: string
  renderImage?: (props: ImgRenderProps) => ReactNode
}

export function ImageRenderer({
  src,
  alt,
  fallbackSrc,
  width,
  height,
  blurDataUrl,
  priority,
  placeholderColor = 'transparent',
  style,
  className,
  renderImage,
}: ImageRendererProps) {
  const [state, setState] = useState<LoadState>('loading')
  const [currentSrc, setCurrentSrc] = useState(src)
  const [triedFallback, setTriedFallback] = useState(false)

  function handleLoad() {
    setState('loaded')
  }

  function handleError() {
    if (fallbackSrc && !triedFallback) {
      setTriedFallback(true)
      setCurrentSrc(fallbackSrc)
      return
    }
    setState('error')
  }

  const imageElement = renderImage
    ? renderImage({ src: currentSrc, alt, width, height, blurDataUrl, priority, style, className })
    : (
      <img
        src={currentSrc}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? undefined : 'lazy'}
        style={style}
        className={className}
        onLoad={handleLoad}
        onError={handleError}
      />
    )

  return (
    // display:flex + centering: the <img> (or a custom renderImage element)
    // is an inline-level replaced element with no explicit size hint when
    // width/height aren't provided (e.g. Lightbox callers that don't know
    // the source image's natural dimensions ahead of time, like the Outputs
    // file browser). Without this, it renders at its natural pixel size and
    // sits flush-left in this wrapper's line box instead of centered --
    // centering the *wrapper* alone (as Lightbox.tsx's caller does) has no
    // effect once this div is stretched to 100% width by its own flex
    // parent, since there's no leftover space left to distribute.
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {state !== 'loaded' && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: placeholderColor,
            backgroundImage: blurDataUrl ? `url(${blurDataUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: blurDataUrl ? 'blur(12px)' : undefined,
            transform: blurDataUrl ? 'scale(1.1)' : undefined,
          }}
        />
      )}
      {state !== 'error' && imageElement}
    </div>
  )
}
