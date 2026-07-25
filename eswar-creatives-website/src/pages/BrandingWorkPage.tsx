import { useState } from 'react'
import { CaseCard } from '../components/branding/CaseCard'
import { CaseDetailOverlay } from '../components/branding/CaseDetailOverlay'
import { LandingNav } from '../components/LandingNav'
import { BRANDING_CASES } from '../data/brandingCases'
import { useBreakpoint } from '../portal/hooks/useBreakpoint'
import { t, tokens } from '../portal/theme'
import type { BrandingCase } from '../types/brandingCase'

export function BrandingWorkPage() {
  const [selectedCase, setSelectedCase] = useState<BrandingCase | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>('All')
  const { isMobile } = useBreakpoint()

  const clients = ['All', 'Vim Events Decor', 'Newgen Event Makers']
  const filtered =
    activeFilter === 'All'
      ? BRANDING_CASES
      : BRANDING_CASES.filter((c) => c.client === activeFilter)

  return (
    <div style={{ background: t.background.page, minHeight: '100vh' }}>
      <LandingNav />
      <section
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: isMobile ? '48px 20px 80px' : '80px 40px',
        }}
      >
        <p
          style={{
            fontFamily: 'SF Mono, monospace',
            fontSize: 11,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: tokens.gold,
            marginBottom: 14,
          }}
        >
          Our Work
        </p>

        <h1
          style={{
            fontFamily: 'Fraunces, serif',
            fontSize: isMobile ? 30 : 42,
            fontWeight: 600,
            color: t.text.primary,
            lineHeight: 1.2,
            marginBottom: 14,
            maxWidth: 520,
          }}
        >
          Branding built to feel like the business
        </h1>

        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 15,
            color: t.text.secondary,
            marginBottom: 48,
            maxWidth: 440,
            lineHeight: 1.7,
          }}
        >
          Every month without a professional brand is a missed first impression.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 40 }}>
          {clients.map((client) => (
            <button
              key={client}
              onClick={() => setActiveFilter(client)}
              style={{
                padding: '8px 16px',
                borderRadius: 20,
                border: `1px solid ${activeFilter === client ? tokens.primary : t.border.default}`,
                background: activeFilter === client ? tokens.primary : 'transparent',
                color: activeFilter === client ? t.text.onPrimary : t.text.secondary,
                fontFamily: 'Inter, sans-serif',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: `all 120ms cubic-bezier(0.4,0,0.2,1)`,
              }}
            >
              {client}
            </button>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: 24,
            }}
          >
            {filtered.map((c) => (
              <CaseCard key={c.id} case={c} onClick={() => setSelectedCase(c)} />
            ))}
          </div>
        ) : (
          <p
            style={{
              color: t.text.muted,
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              textAlign: 'center',
              padding: '48px 0',
            }}
          >
            No work in this category yet. Check back soon.
          </p>
        )}
      </section>

      <section
        style={{
          maxWidth: 680,
          margin: '80px auto 0',
          padding: isMobile ? '0 20px 80px' : '0 0 80px',
          textAlign: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'SF Mono, monospace',
            fontSize: 10,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: tokens.gold,
            marginBottom: 14,
          }}
        >
          Next step
        </p>

        <h2
          style={{
            fontFamily: 'Fraunces, serif',
            fontSize: isMobile ? 26 : 32,
            fontWeight: 600,
            color: t.text.primary,
            lineHeight: 1.25,
            marginBottom: 14,
          }}
        >
          Ready to build a brand like this?
        </h2>

        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 15,
            color: t.text.secondary,
            lineHeight: 1.7,
            maxWidth: 480,
            margin: '0 auto 32px',
          }}
        >
          Tell us about your business. It takes about 10 minutes. We review it and follow up within three working days.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <a
            href="/branding/brand-identity-discovery"
            style={{
              padding: '14px 32px',
              background: tokens.primary,
              color: t.text.onPrimary,
              fontFamily: 'Inter, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              textDecoration: 'none',
            }}
          >
            Start your brand brief &rarr;
          </a>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: t.text.muted, margin: 0 }}>
            or{' '}
            <a
              href="https://wa.me/919841085484"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: tokens.primary, textDecoration: 'underline' }}
            >
              message on WhatsApp
            </a>{' '}
            if you prefer a conversation first
          </p>
        </div>
      </section>

      <CaseDetailOverlay case={selectedCase} onClose={() => setSelectedCase(null)} />
    </div>
  )
}
