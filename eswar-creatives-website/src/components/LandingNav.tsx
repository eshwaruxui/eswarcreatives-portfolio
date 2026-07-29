import { useState, useEffect } from 'react'
import { useBreakpoint } from '../portal/hooks/useBreakpoint'
import { t, tokens } from '../portal/theme'
import { CTAButton } from './marketing/CTAButton'

export function LandingNav() {
  const { isMobile } = useBreakpoint()
  const [pathname, setPathname] = useState('')

  useEffect(() => {
    setPathname(window.location.pathname)
  }, [])

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: t.background.page,
        backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${t.border.subtle}`,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: isMobile ? '0 20px' : '0 40px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <a href="/branding" style={{ textDecoration: 'none' }}>
          <span
            style={{
              fontFamily: 'Fraunces, serif',
              fontSize: 18,
              fontWeight: 600,
              color: t.text.primary,
              letterSpacing: '-0.01em',
              display: 'block',
            }}
          >
            EswarCreatives
          </span>
          {!isMobile && (
            <span
              style={{
                fontFamily: 'SF Mono, monospace',
                fontSize: 10,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
                color: tokens.gold,
                display: 'block',
                marginTop: -2,
              }}
            >
              Brand design studio
            </span>
          )}
        </a>

        {!isMobile && (
          <nav style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            <a
              href="/branding/work"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                fontWeight: pathname.startsWith('/branding/work') ? 600 : 500,
                color: pathname.startsWith('/branding/work') ? tokens.primary : t.text.secondary,
                textDecoration: 'none',
                transition: `color 120ms cubic-bezier(0.4,0,0.2,1)`,
              }}
            >
              Work
            </a>
            <a
              href="/branding"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                fontWeight: pathname === '/branding' ? 600 : 500,
                color: pathname === '/branding' ? tokens.primary : t.text.secondary,
                textDecoration: 'none',
                transition: `color 120ms cubic-bezier(0.4,0,0.2,1)`,
              }}
            >
              Services
            </a>
            <a
              href="/about"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 14,
                fontWeight: pathname === '/about' ? 600 : 500,
                color: pathname === '/about' ? tokens.primary : t.text.secondary,
                textDecoration: 'none',
                transition: `color 120ms cubic-bezier(0.4,0,0.2,1)`,
              }}
            >
              About
            </a>
          </nav>
        )}

        <CTAButton variant="primary" label="Let's talk" href="https://wa.me/919841085484" target="_blank" />
      </div>
    </div>
  )
}
