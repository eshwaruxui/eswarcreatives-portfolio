// Shared right-side slide-in drawer for the admin portal. Desktop/tablet: a
// drawer pinned right at a fixed pixel width. Mobile (<768px): a full-screen
// overlay (100vw x 100dvh, deliberately covering the TopBar) sliding in from
// the right, since a fixed-width or bottom-sheet drawer doesn't fit a phone
// screen for the amount of content these panels hold (tabs, forms, lists).
// Backdrop at baseZIndex-1, panel at baseZIndex (201 by default). Used by every
// admin drawer (ClientPanel, ProjectPanel, LeadDrawer, etc.) so they animate and
// stack identically — resolved internally via useBreakpoint, no prop changes.
import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { tokens, t, fonts, motionTokens } from '../theme'
import { useBreakpoint } from '../hooks/useBreakpoint'

// Slide duration in ms — durationBase for every breakpoint (mobile now slides
// horizontally like the desktop drawer, just full-screen, so the shorter
// duration reads correctly for both).
const SLIDE_MS = parseInt(motionTokens.durationBase, 10)

export function SidePanel({
  title,
  subtitle,
  onClose,
  width = 480,
  // Nested drawers (e.g. an invoice preview opened from the client panel) pass a
  // higher base so they stack above the panel that launched them.
  baseZIndex = 201,
  headerExtra,
  // Blocks Escape / backdrop-click / the header close button from closing the
  // panel — e.g. while a save is in flight, so a stray Escape can't unmount a
  // form mid-request. The panel stays put rather than silently swallowing input.
  preventClose = false,
  children,
}: {
  title: string
  subtitle?: string
  onClose: () => void
  width?: number
  baseZIndex?: number
  headerExtra?: ReactNode
  preventClose?: boolean
  children: ReactNode
}) {
  const { isMobile: narrow } = useBreakpoint()
  const [shown, setShown] = useState(false)
  const closingRef = useRef(false)

  // Trigger the slide-in once mounted (transform from offscreen to 0).
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(t)
  }, [])

  // Animate out before unmounting: slide the panel back offscreen (and fade the
  // backdrop), then hand control to the caller once the transition has run, so
  // closing reads as the mirror image of opening (H4: consistent motion). The
  // ref guards against a double trigger (e.g. Escape during an outside click).
  const requestClose = useCallback(() => {
    if (closingRef.current || preventClose) return
    closingRef.current = true
    setShown(false)
    window.setTimeout(onClose, SLIDE_MS)
  }, [onClose, preventClose])

  // H7 (flexibility/efficiency): Escape closes the drawer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestClose])

  // Mobile: lock body scroll while the panel covers the whole screen (it
  // deliberately sits on top of the sticky TopBar too).
  useEffect(() => {
    if (!narrow) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [narrow])

  const panelStyle: CSSProperties = narrow
    ? {
        ...styles.panelBase,
        ...styles.fullScreen,
        zIndex: baseZIndex,
        transition: `transform ${motionTokens.durationBase} ${shown ? motionTokens.easeEnter : motionTokens.easeExit}`,
        transform: shown ? 'translateX(0)' : 'translateX(100vw)',
      }
    : {
        ...styles.panelBase,
        ...styles.drawer,
        width,
        zIndex: baseZIndex,
        transition: `transform ${motionTokens.durationBase} ${shown ? motionTokens.easeEnter : motionTokens.easeExit}`,
        transform: shown ? 'translateX(0)' : 'translateX(100%)',
      }

  return (
    <>
      <div
        style={{
          ...styles.backdrop,
          zIndex: baseZIndex - 1,
          opacity: shown ? 1 : 0,
          transition: `opacity ${motionTokens.durationBase} ${motionTokens.easeDefault}`,
        }}
        onClick={requestClose}
      />
      <aside style={panelStyle} role="dialog" aria-label={title}>
        <header style={{ ...styles.head, ...(narrow ? styles.headMobile : null) }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={styles.title}>{title}</h2>
            {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
          </div>
          <div style={styles.headActions}>
            {headerExtra}
            <button
              type="button"
              style={{
                ...styles.close,
                ...(narrow ? styles.closeMobile : null),
                ...(preventClose ? { opacity: 0.5, cursor: 'not-allowed' } : null),
              }}
              onClick={requestClose}
              disabled={preventClose}
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
          </div>
        </header>
        <div style={{ ...styles.body, ...(narrow ? styles.bodyMobile : null) }}>{children}</div>
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
  // Mobile: full-screen overlay, deliberately covering the TopBar too (top:0).
  // No position:fixed pitfalls beyond the panel root itself — everything inside
  // uses normal flow / sticky, never nested position:fixed (breaks on iOS).
  fullScreen: {
    top: 0,
    left: 0,
    right: 0,
    width: '100vw',
    height: '100dvh',
    maxWidth: '100vw',
    borderRadius: 0,
    border: 'none',
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
  headMobile: {
    padding: '16px 16px 16px 16px',
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
  // Always-visible, 44x44 tap target on mobile, above the panel content.
  closeMobile: {
    width: 44,
    height: 44,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  // This is the panel's scroll container: the panel itself is overflow:hidden
  // (see `panel` above) and the header is flexShrink:0, so everything that
  // scrolls in a drawer scrolls here.
  //
  // scrollbarGutter reserves the track permanently, so a drawer whose content
  // crosses the panel height does not narrow its own content by the scrollbar
  // width the moment the scrollbar appears. Inside a fixed-width drawer that
  // reflows the form fields, which is more visible than the equivalent shift
  // on the page behind it.
  //
  // One rule here covers every drawer: LeadDrawer, EnquiryDrawer,
  // LinkedInPostComposer and ProjectPanel all render through SidePanel and
  // must not repeat it locally.
  body: { padding: 24, overflowY: 'auto', scrollbarGutter: 'stable', flex: 1 },
  // Extra bottom clearance on mobile (safe-area / thumb reach for the last
  // action in a long form) plus the same overflow behavior as desktop. Merged
  // on top of `body`, so it inherits the gutter and must not restate it.
  bodyMobile: {
    padding: '20px 16px',
    paddingBottom: 80,
    overflowY: 'auto',
  },
}
