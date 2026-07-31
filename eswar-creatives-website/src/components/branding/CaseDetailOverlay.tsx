import { useEffect, useRef, useState } from 'react'
import { X, ZoomIn } from 'lucide-react'
import { Lightbox } from '../lightbox/Lightbox'
import type { GalleryImage } from '../lightbox/types'
import { t, tokens, motionTokens } from '../../portal/theme'
import { useBreakpoint } from '../../portal/hooks/useBreakpoint'
import type { BrandingCase } from '../../types/brandingCase'

// Lightbox chrome is intentionally a dark photo-viewer theme, independent of
// the site's teal/cream palette. background/accentForeground/surface/border
// have no theme.ts equivalent (there's no "near-black" or "white-alpha on
// black" token), so those stay literal; text and accent do have exact token
// matches and use them.
const LIGHTBOX_THEME = {
  background: '#0F0F0F',
  text: t.text.onPrimary,
  textMuted: 'rgba(255,255,255,0.6)',
  accent: tokens.gold,
  accentForeground: '#000000',
  surface: 'rgba(255,255,255,0.1)',
  border: 'rgba(255,255,255,0.15)',
  radius: '8px',
}

interface CaseDetailOverlayProps {
  case: BrandingCase | null
  onClose: () => void
}

export function CaseDetailOverlay({ case: brandCase, onClose }: CaseDetailOverlayProps) {
  const { isMobile } = useBreakpoint()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [shown, setShown] = useState(false)
  const [activeSection, setActiveSection] = useState<string>(brandCase?.sections[0]?.id ?? '')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  // Trigger the slide-in on mount (matches SidePanel's shown+RAF pattern so
  // every right-side drawer in the app animates identically).
  useEffect(() => {
    if (!brandCase) {
      setShown(false)
      return
    }
    const frame = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(frame)
  }, [brandCase])

  useEffect(() => {
    if (brandCase) setActiveSection(brandCase.sections[0]?.id ?? '')
  }, [brandCase?.id])

  useEffect(() => {
    if (!brandCase) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    closeButtonRef.current?.focus()

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [brandCase, onClose])

  if (!brandCase) return null

  const activeS = brandCase.sections.find((s) => s.id === activeSection)
  const activeSectionImages: GalleryImage[] = (activeS?.images ?? []).map((img) => ({
    id: img.src,
    src: img.src,
    alt: img.alt,
    category: activeS?.category ?? '',
    client: brandCase.client,
    description: img.caption,
  }))

  const labelStyle: React.CSSProperties = {
    fontFamily: 'SF Mono, monospace',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '.1em',
    color: t.text.muted,
    marginBottom: 8,
  }

  const bodyStyle: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    color: t.text.secondary,
    lineHeight: 1.8,
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: t.background.scrim,
          zIndex: 500,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: isMobile ? '100vw' : 560,
          height: '100dvh',
          background: t.background.surface,
          zIndex: 501,
          overflowY: 'auto',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          transform: shown ? 'translateX(0)' : 'translateX(560px)',
          transition: `transform ${motionTokens.durationBase} ${motionTokens.easeEnter}`,
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: t.background.surface,
            padding: isMobile ? '16px 20px' : '20px 28px',
            borderBottom: `1px solid ${t.border.subtle}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              ref={closeButtonRef}
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 44,
                height: 44,
                background: t.background.surface,
                border: 'none',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                marginTop: -8,
                marginRight: -8,
                marginBottom: -8,
              }}
            >
              <X size={20} color={t.text.primary} />
            </button>
          </div>

          <p style={{ fontFamily: 'SF Mono, monospace', fontSize: 10, color: tokens.gold, textTransform: 'uppercase', letterSpacing: '.1em', margin: 0 }}>
            {brandCase.client}
          </p>
          <h2
            style={{
              fontFamily: 'Fraunces, serif',
              fontSize: 24,
              fontWeight: 600,
              color: t.text.primary,
              margin: '8px 0 4px',
            }}
          >
            {brandCase.brandName}
          </h2>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: t.text.muted, margin: 0 }}>
            {brandCase.industry} &middot; {brandCase.year}
          </p>

          <p
            style={{
              fontFamily: 'Fraunces, serif',
              fontStyle: 'italic',
              fontSize: 16,
              color: t.text.secondary,
              borderLeft: `3px solid ${tokens.gold}`,
              paddingLeft: 14,
              margin: '16px 0 0',
            }}
          >
            {brandCase.tagline}
          </p>
        </div>

        <div
          style={{
            position: 'sticky',
            top: isMobile ? 148 : 156,
            zIndex: 9,
            background: t.background.surface,
            borderBottom: `1px solid ${t.border.subtle}`,
            padding: isMobile ? '0 20px' : '0 28px',
            display: 'flex',
            overflowX: 'auto',
            flexWrap: 'nowrap',
          }}
        >
          {brandCase.sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                padding: '12px 16px',
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                fontWeight: 500,
                color: activeSection === section.id ? tokens.primary : t.text.muted,
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: 'none',
                borderBottom: activeSection === section.id ? `2px solid ${tokens.primary}` : '2px solid transparent',
                background: 'transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: `color ${motionTokens.durationFast} ${motionTokens.easeDefault}, border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
              }}
            >
              {section.category}
            </button>
          ))}
        </div>

        <div style={{ padding: isMobile ? '24px 20px' : '28px' }}>
          {activeS && activeS.images.length > 0 ? (
            <>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: t.text.secondary, marginBottom: 20 }}>
                {activeS.description}
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)',
                  gap: 12,
                  marginBottom: 32,
                }}
              >
                {activeS.images.map((image, idx) => (
                  <SectionThumbnail
                    key={image.src}
                    image={image}
                    onClick={() => {
                      setLightboxIndex(idx)
                      setLightboxOpen(true)
                    }}
                  />
                ))}
              </div>
            </>
          ) : activeS ? (
            <>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: t.text.secondary, marginBottom: 16 }}>
                {activeS.description}
              </p>
              <div
                style={{
                  background: t.background.subtle,
                  borderRadius: 8,
                  padding: '32px 24px',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    fontFamily: 'SF Mono, monospace',
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '.12em',
                    color: t.text.muted,
                    margin: 0,
                  }}
                >
                  Coming soon
                </p>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: t.text.muted, marginTop: 8, marginBottom: 0 }}>
                  Photos for this section will be added shortly.
                </p>
              </div>
            </>
          ) : null}
        </div>

        <div style={{ padding: isMobile ? '0 20px 64px' : '0 28px 64px', borderTop: `1px solid ${t.border.subtle}` }}>
          <div style={{ paddingTop: 28 }}>
            <p style={labelStyle}>The challenge</p>
            <p style={{ ...bodyStyle, marginBottom: 24 }}>{brandCase.problem}</p>

            <p style={labelStyle}>What was built</p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {brandCase.deliverables.map((item) => (
                <li
                  key={item}
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: 14,
                    color: t.text.secondary,
                    padding: '6px 0',
                    borderBottom: `1px solid ${t.border.subtle}`,
                  }}
                >
                  <span style={{ color: tokens.primary, marginRight: 8 }}>&middot;</span>
                  {item}
                </li>
              ))}
            </ul>

            <p style={{ ...labelStyle, marginTop: 24 }}>The outcome</p>
            <p style={{ ...bodyStyle, marginBottom: 0 }}>{brandCase.outcome}</p>
          </div>
        </div>
      </div>

      {lightboxOpen && (
        <Lightbox
          images={activeSectionImages}
          index={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={(index) => setLightboxIndex(index)}
          theme={LIGHTBOX_THEME}
        />
      )}
    </>
  )
}

function SectionThumbnail({
  image,
  onClick,
}: {
  image: { src: string; alt: string }
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        aspectRatio: '4 / 3',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        background: t.background.muted,
      }}
    >
      <img src={image.src} alt={image.alt} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: hovered ? 1 : 0,
          transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
        }}
      >
        <ZoomIn size={20} color={t.text.onPrimary} />
      </div>
    </div>
  )
}
