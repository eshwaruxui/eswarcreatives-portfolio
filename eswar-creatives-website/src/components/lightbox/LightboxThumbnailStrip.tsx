import { useEffect, useRef, type CSSProperties } from 'react'
import { ImageRenderer } from './ImageRenderer'
import type { GalleryImage, GalleryTheme, GalleryProps } from './types'

interface LightboxThumbnailStripProps {
  images: GalleryImage[]
  index: number
  theme: GalleryTheme
  getTransformUrl?: GalleryProps['getTransformUrl']
  onSelect: (index: number) => void
}

function getThumbSize(width?: number, height?: number): { w: number; h: number } {
  if (!width || !height) return { w: 48, h: 48 }
  const ratio = width / height
  if (ratio > 1.15) return { w: 56, h: 42 }
  if (ratio < 0.87) return { w: 42, h: 56 }
  return { w: 48, h: 48 }
}

export function LightboxThumbnailStrip({ images, index, theme, getTransformUrl, onSelect }: LightboxThumbnailStripProps) {
  const stripRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [index])

  const trackStyle: CSSProperties = {
    display: 'flex',
    touchAction: 'pan-x',
    gap: 8,
    overflowX: 'auto',
    padding: '12px 16px',
    scrollSnapType: 'x mandatory',
    WebkitOverflowScrolling: 'touch',
  }

  return (
    <div style={{ flexShrink: 0, background: 'rgba(0,0,0,0.6)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <style>{`
        .eswar-gallery-thumb-strip::-webkit-scrollbar { display: none; }
        .eswar-gallery-thumb-strip { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      <div
        ref={stripRef}
        role="listbox"
        aria-label="Photo thumbnails"
        className="eswar-gallery-thumb-strip"
        onTouchStart={(event) => event.stopPropagation()}
        onTouchEnd={(event) => event.stopPropagation()}
        style={trackStyle}
      >
        {images.map((image, i) => {
          const isActive = i === index
          const { w, h } = getThumbSize(image.width, image.height)
          const src = getTransformUrl
            ? getTransformUrl(image.src, { width: w * 2, quality: 60, format: 'webp' })
            : image.src
          return (
            <button
              key={image.id}
              ref={isActive ? activeRef : undefined}
              type="button"
              role="option"
              aria-selected={isActive}
              aria-label={image.localizedTitle ?? image.alt}
              onClick={() => onSelect(i)}
              style={{
                display: 'flex',
                flexShrink: 0,
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                minWidth: 44,
                minHeight: 44,
                scrollSnapAlign: 'center',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <span
                style={{
                  display: 'block',
                  overflow: 'hidden',
                  borderRadius: 6,
                  width: w,
                  height: h,
                  opacity: isActive ? 1 : 0.45,
                  border: isActive ? `2px solid ${theme.accent}` : '2px solid transparent',
                  transition: 'opacity 150ms ease-in-out, border-color 150ms ease-in-out',
                }}
              >
                <ImageRenderer
                  src={src}
                  alt=""
                  width={w}
                  height={h}
                  placeholderColor={theme.surface}
                  style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                />
              </span>
              <span
                aria-hidden="true"
                style={{
                  display: 'block',
                  height: 4,
                  width: 4,
                  borderRadius: 999,
                  background: isActive ? theme.accent : 'transparent',
                }}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
