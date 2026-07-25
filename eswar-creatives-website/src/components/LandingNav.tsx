import { useState, useEffect } from 'react'
import { useBreakpoint } from '../portal/hooks/useBreakpoint'
import { t, tokens } from '../portal/theme'

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
              Branding for event businesses
            </span>
          )}
        </a>

        {!isMobile && (
          <nav style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
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
          </nav>
        )}

        <a
          href="https://wa.me/919841085484"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: isMobile ? '8px 16px' : '10px 20px',
            background: tokens.primary,
            color: t.text.onPrimary,
            fontFamily: 'Inter, sans-serif',
            fontSize: 13,
            fontWeight: 600,
            borderRadius: 6,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            transition: `opacity 120ms cubic-bezier(0.4,0,0.2,1)`,
          }}
        >
          Let's talk <span style={{ fontSize: 14 }}>&rarr;</span>
        </a>
      </div>
    </div>
  )
}
