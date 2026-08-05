import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useSwipe } from './hooks/useSwipe'
import { ImageRenderer } from './ImageRenderer'
import { LightboxThumbnailStrip } from './LightboxThumbnailStrip'
import type { GalleryImage, GalleryLabels, GalleryTheme, ImgRenderProps, TransformOpts } from './types'

interface LightboxProps {
  images: GalleryImage[]
  index: number
  theme: GalleryTheme
  labels?: GalleryLabels
  getTransformUrl?: (src: string, opts: TransformOpts) => string
  renderImage?: (props: ImgRenderProps) => ReactNode
  onClose: () => void
  onNavigate: (index: number) => void
}

export function Lightbox({ images, index, theme, labels, getTransformUrl, renderImage, onClose, onNavigate }: LightboxProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const item = images[index]

  // Lightbox navigation is scoped to images sharing the same groupKey as the
  // currently open image (e.g. multiple crops of one photoshoot). Images with
  // no groupKey fall back to browsing the full set passed in.
  const navImages = useMemo(() => {
    if (!item?.groupKey) return images
    return images.filter((img) => img.groupKey === item.groupKey)
  }, [images, item])

  const navIndex = item ? navImages.findIndex((img) => img.id === item.id) : -1
  const hasPrev = navIndex > 0
  const hasNext = navIndex >= 0 && navIndex < navImages.length - 1
  const showStrip = navImages.length > 1

  function navigateToNavIndex(targetNavIndex: number) {
    const target = navImages[targetNavIndex]
    if (!target) return
    const targetIndex = images.findIndex((img) => img.id === target.id)
    if (targetIndex !== -1) onNavigate(targetIndex)
  }

  const goPrev = () => hasPrev && navigateToNavIndex(navIndex - 1)
  const goNext = () => hasNext && navigateToNavIndex(navIndex + 1)

  const swipeHandlers = useSwipe({ onSwipeLeft: goNext, onSwipeRight: goPrev })

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    const previousPaddingRight = document.body.style.paddingRight
    const scrollbarWidth =
      typeof window !== 'undefined' ? window.innerWidth - document.documentElement.clientWidth : 0
    document.body.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
    closeButtonRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.paddingRight = previousPaddingRight
    }
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goPrev()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        goNext()
      } else if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, navImages.length])

  useEffect(() => {
    // Preloading only makes sense for images -- new window.Image() is
    // meaningless for PDFs/video/other kinds, which the browser streams
    // on demand via the iframe/video element instead.
    const neighbors = [navImages[navIndex - 1], navImages[navIndex + 1]].filter(
      (neighbor): neighbor is GalleryImage =>
        Boolean(neighbor) && (!neighbor?.kind || neighbor.kind === 'image')
    )
    const preloaded = neighbors.map((neighbor) => {
      const preloadSrc = getTransformUrl
        ? getTransformUrl(neighbor.src, { width: 1600, quality: 80, format: 'webp' })
        : neighbor.src
      const img = new window.Image()
      img.src = preloadSrc
      return img
    })
    return () => {
      preloaded.forEach((img) => {
        img.src = ''
      })
    }
  }, [navImages, navIndex, getTransformUrl])

  if (!item) return null

  const title = item.localizedTitle ?? item.alt
  const kind = item.kind ?? 'image'
  // getTransformUrl is an image-CDN transform hook -- only meaningful for the
  // image kind. PDFs/video/other render straight from item.src.
  const src = kind === 'image' && getTransformUrl
    ? getTransformUrl(item.src, { width: 1600, quality: 80, format: 'webp' })
    : item.src

  const navButtonStyle = (enabled: boolean): CSSProperties => ({
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 10,
    display: 'flex',
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    border: 'none',
    background: 'rgba(255,255,255,0.12)',
    // theme.text (readable-on-dark foreground), not theme.accentForeground
    // (meant for content sitting ON a filled accent chip, e.g. black on
    // gold) -- same near-invisible-icon bug as the thumbnail strip/fallback
    // view, applied here to the close/prev/next buttons.
    color: theme.text,
    cursor: enabled ? 'pointer' : 'default',
    opacity: enabled ? 1 : 0.3,
  })

  // Portaled straight into document.body so the fixed-position dialog always
  // covers the full viewport, even when a caller renders <Lightbox> nested
  // inside an ancestor with an inline `transform` (e.g. a slide-in drawer's
  // translateX animation) -- a CSS transform on any ancestor creates a new
  // containing block for position:fixed descendants, which would otherwise
  // trap the dialog inside that ancestor's box instead of the viewport.
  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed',
        inset: 0,
        // Matches the portal's other lightbox (src/portal/mockups/ClientLightbox.tsx,
        // zIndex 9999) -- the established convention here for "must render above
        // every drawer/modal," since the highest other overlay in the app
        // (delete-confirmation modals) tops out at 500.
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0,0,0,0.9)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
      onTouchStart={swipeHandlers.onTouchStart}
      onTouchEnd={swipeHandlers.onTouchEnd}
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={onClose}
        aria-label={labels?.closeLabel ?? 'Close'}
        style={{
          position: 'absolute',
          right: 16,
          top: 'calc(env(safe-area-inset-top) + 16px)',
          zIndex: 10,
          display: 'flex',
          height: 40,
          width: 40,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 999,
          border: 'none',
          background: 'rgba(255,255,255,0.12)',
          color: theme.text,
          cursor: 'pointer',
        }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" style={{ height: 20, width: 20 }}>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <button
        type="button"
        onClick={goPrev}
        aria-label={labels?.prevLabel ?? 'Previous'}
        aria-disabled={!hasPrev}
        disabled={!hasPrev}
        style={{ ...navButtonStyle(hasPrev), left: 16 }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ height: 20, width: 20 }}>
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <button
        type="button"
        onClick={goNext}
        aria-label={labels?.nextLabel ?? 'Next'}
        aria-disabled={!hasNext}
        disabled={!hasNext}
        style={{ ...navButtonStyle(hasNext), right: 16 }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ height: 20, width: 20 }}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>

      <div style={{ display: 'flex', minHeight: 200, flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', padding: '16px 16px 0' }}>
        <div style={{ position: 'relative', display: 'flex', width: '100%', height: '100%', minHeight: 300, maxWidth: '90vw', alignItems: 'center', justifyContent: 'center' }}>
          {kind === 'image' && (
            <ImageRenderer
              key={item.id}
              src={src}
              alt={item.alt}
              width={item.width}
              height={item.height}
              blurDataUrl={item.blurDataUrl}
              placeholderColor={theme.surface}
              renderImage={renderImage}
              style={{ maxHeight: '100%', maxWidth: '90vw', borderRadius: theme.radius, objectFit: 'contain' }}
            />
          )}
          {kind === 'pdf' && (
            <iframe
              key={item.id}
              src={src}
              title={item.alt}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: theme.radius, background: '#fff' }}
            />
          )}
          {kind === 'video' && (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              key={item.id}
              src={src}
              controls
              style={{ maxHeight: '100%', maxWidth: '90vw', borderRadius: theme.radius }}
            />
          )}
          {kind === 'other' && (
            <div
              key={item.id}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                // theme.text is the readable-on-dark foreground; theme.accentForeground
                // (used here previously) is the color meant to sit ON a filled accent
                // chip, e.g. black text on gold -- against the dark backdrop it made
                // the filename, size, and Download label all but unreadable.
                color: theme.text, textAlign: 'center', padding: 24,
              }}
            >
              <span
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 72, height: 72, borderRadius: 16, background: 'rgba(255,255,255,0.12)',
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" style={{ height: 34, width: 34 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              </span>
              <span style={{ fontSize: 15 }}>{item.alt}</span>
              {item.fileSizeLabel && (
                <span style={{ fontSize: 12, color: theme.textMuted }}>{item.fileSizeLabel}</span>
              )}
              <a
                href={src}
                download
                style={{
                  marginTop: 4, padding: '8px 18px', borderRadius: 999,
                  background: theme.accent, color: theme.accentForeground,
                  textDecoration: 'none', fontSize: 13, fontWeight: 600,
                }}
              >
                Download
              </a>
            </div>
          )}
        </div>
      </div>

      {title && (
        <div style={{ flexShrink: 0, padding: '16px 16px 12px', textAlign: 'center' }}>
          {/* theme.text, not theme.accentForeground -- same fix as the nav
              buttons and fallback view above; this caption has always sat
              directly on the dark backdrop, never on a filled accent chip. */}
          <p style={{ fontFamily: theme.fontHeading, fontSize: 18, color: theme.text }}>{title}</p>
          {item.description && (
            <p style={{ fontStyle: 'italic', fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
              {item.description}
            </p>
          )}
        </div>
      )}

      {showStrip && (
        <>
          <p style={{ flexShrink: 0, paddingBottom: 8, textAlign: 'center', fontSize: 14, fontWeight: 300, color: theme.accent }}>
            {navIndex + 1} / {navImages.length}
          </p>
          <LightboxThumbnailStrip
            images={navImages}
            index={navIndex}
            theme={theme}
            getTransformUrl={getTransformUrl}
            onSelect={navigateToNavIndex}
          />
        </>
      )}
    </div>,
    document.body
  )
}
