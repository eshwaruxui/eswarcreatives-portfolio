import { useState } from 'react'
import { t, motionTokens } from '../../portal/theme'
import type { BrandingCase } from '../../types/brandingCase'

const GOLD = '#D5B067'

interface CaseCardProps {
  case: BrandingCase
  onClick: () => void
}

export function CaseCard({ case: brandCase, onClick }: CaseCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: t.background.surface,
        border: `1px solid ${t.border.subtle}`,
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: 'pointer',
        borderBottom: hovered ? `3px solid ${GOLD}` : '3px solid transparent',
        boxShadow: hovered ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
        transition: `border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}, box-shadow ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
      }}
    >
      <div
        style={{
          width: '100%',
          aspectRatio: '4 / 3',
          background: t.background.subtle,
          overflow: 'hidden',
          borderRadius: '12px 12px 0 0',
        }}
      >
        {brandCase.coverImage ? (
          <img
            src={brandCase.coverImage}
            alt={brandCase.coverAlt}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: t.background.muted,
            }}
          >
            <span
              style={{
                fontFamily: 'SF Mono, monospace',
                fontSize: 11,
                color: t.text.muted,
              }}
            >
              Photo coming soon
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: 20 }}>
        <p
          style={{
            fontFamily: 'SF Mono, monospace',
            fontSize: 10,
            letterSpacing: '.12em',
            textTransform: 'uppercase',
            color: GOLD,
            marginBottom: 8,
          }}
        >
          {brandCase.client}
        </p>
        <h3
          style={{
            fontFamily: 'Fraunces, serif',
            fontSize: 20,
            fontWeight: 600,
            color: t.text.primary,
            marginBottom: 4,
          }}
        >
          {brandCase.brandName}
        </h3>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            color: t.text.muted,
          }}
        >
          {brandCase.industry} &middot; {brandCase.year}
        </p>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 14,
            color: t.text.secondary,
            marginTop: 12,
            lineHeight: 1.6,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {brandCase.tagline}
        </p>
      </div>
    </div>
  )
}
