// Shared right-side slide-in drawer for the admin portal. Mirrors the invoice
// preview drawer: a desktop drawer pinned right (and a bottom sheet below 768px),
// backdrop at z-200 and panel at z-201, sliding in via transform only using the
// shared motionTokens. Used by the manage-client and project panels so all admin
// drawers animate and stack identically.
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { tokens, t, fonts, motionTokens } from '../theme'

function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

export function SidePanel({
  title,
  subtitle,
  onClose,
  width = 480,
  // Nested drawers (e.g. an invoice preview opened from the client panel) pass a
  // higher base so they stack above the panel that launched them.
  baseZIndex = 201,
  headerExtra,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  width?: number
  baseZIndex?: number
  headerExtra?: ReactNode
  children: ReactNode
}) {
  const narrow = useIsNarrow()
  const [shown, setShown] = useState(false)

  // Trigger the slide-in once mounted (transform from offscreen to 0).
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // H7 (flexibility/efficiency): Escape closes the drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const panelStyle: CSSProperties = narrow
    ? {
        ...styles.panelBase,
        ...styles.sheet,
        zIndex: baseZIndex,
        transform: shown ? 'translateY(0)' : 'translateY(100%)',
      }
    : {
        ...styles.panelBase,
        ...styles.drawer,
        width,
        zIndex: baseZIndex,
        transform: shown ? 'translateX(0)' : 'translateX(100%)',
      }

  return (
    <>
      <div style={{ ...styles.backdrop, zIndex: baseZIndex - 1 }} onClick={onClose} />
      <aside style={panelStyle} role="dialog" aria-label={title}>
        <header style={styles.head}>
          <div style={{ minWidth: 0 }}>
            <h2 style={styles.title}>{title}</h2>
            {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
          </div>
          <div style={styles.headActions}>
            {headerExtra}
            <button type="button" style={styles.close} onClick={onClose} aria-label="Close panel">
              <X size={18} />
            </button>
          </div>
        </header>
        <div style={styles.body}>{children}</div>
      </aside>
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: t.background.overlayDark, // H4: neutral panel tone - scrim, not teal-tinted
  },
  panelBase: {
    position: 'fixed',
    background: tokens.surface,
    boxShadow: '0 12px 48px rgba(2, 76, 79, 0.18)',
    // Panels slide with durationBase + easeEnter per the motion token rules.
    transition: `transform ${motionTokens.durationBase} ${motionTokens.easeEnter}`,
    display: 'flex',
    flexDirection: 'column',
  },
  drawer: {
    top: 0,
    right: 0,
    height: '100vh',
    maxWidth: '92vw',
    borderLeft: `1px solid ${t.border.overlayMedium}`, // H4: neutral panel tone - panel left edge
  },
  sheet: {
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '88vh',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  head: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    padding: '20px 24px',
    borderBottom: `1px solid ${t.border.subtle}`, // H4: neutral panel tone - header divider
    flexShrink: 0,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: t.text.primary, // H4: neutral panel tone - header text, never teal
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.muted, // H4: neutral panel tone - metadata
    margin: '4px 0 0',
  },
  headActions: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  close: {
    background: t.background.subtle, // H4: neutral panel tone
    border: `1px solid ${t.border.default}`, // H4: semantic border token
    borderRadius: 8,
    color: t.text.tertiary, // H4: neutral panel tone - close icon
    cursor: 'pointer',
    padding: 6,
    display: 'flex',
  },
  body: { padding: 24, overflowY: 'auto', flex: 1 },
}
