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

// Distinct shape per non-image kind so a PDF/video/other-file thumbnail
// reads at a glance instead of every non-image looking like the same blank
// outline. Stroked in theme.accent -- theme.accentForeground (used by the
// old single shared icon) is the color meant to sit ON a filled accent
// background, e.g. black text on a gold chip; on a transparent tile over a
// near-black strip it was nearly invisible.
function NonImageThumbIcon({ kind, color }: { kind: 'pdf' | 'video' | 'other'; color: string }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, style: { height: '48%', width: '48%' } }
  if (kind === 'pdf') {
    return (
      <svg {...common}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M9 13h6M9 17h6" />
      </svg>
    )
  }
  if (kind === 'video') {
    return (
      <svg {...common}>
        <rect x="2" y="5" width="15" height="14" rx="2" />
        <path d="M22 8l-5 4 5 4V8z" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  )
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
          const kind = image.kind ?? 'image'
          const { w, h } = getThumbSize(image.width, image.height)
          const src = kind === 'image' && getTransformUrl
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
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  borderRadius: 6,
                  width: w,
                  height: h,
                  opacity: isActive ? 1 : 0.65,
                  border: isActive ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`,
                  background: kind === 'image' ? undefined : 'rgba(255,255,255,0.16)',
                  transition: 'opacity 150ms ease-in-out, border-color 150ms ease-in-out',
                }}
              >
                {kind === 'image' ? (
                  <ImageRenderer
                    src={src}
                    alt=""
                    width={w}
                    height={h}
                    placeholderColor={theme.surface}
                    style={{ height: '100%', width: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <NonImageThumbIcon kind={kind === 'image' ? 'other' : kind} color={theme.accent} />
                )}
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
