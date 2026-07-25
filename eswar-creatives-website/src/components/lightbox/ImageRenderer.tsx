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
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
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
