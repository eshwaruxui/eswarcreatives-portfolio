// Shared right-side slide-in drawer for the admin portal. Desktop/tablet: a
// drawer pinned right at a fixed pixel width, resizable by dragging its left
// edge. Mobile (<768px): a full-screen overlay (100vw x 100dvh, deliberately
// covering the TopBar) sliding in from the right, since a fixed-width or
// bottom-sheet drawer doesn't fit a phone screen for the amount of content
// these panels hold (tabs, forms, lists) -- resize is desktop/tablet only,
// dragging a handle on a fullscreen overlay has nothing to mean.
// Backdrop at baseZIndex-1, panel at baseZIndex (201 by default). Used by every
// admin drawer (ClientPanel, ProjectPanel, LeadDrawer, EnquiryDrawer,
// LinkedInPostComposer, the Brand Visual Guide item drawer, etc.) so they
// animate, stack and resize identically — resolved internally via
// useBreakpoint, no prop changes required to opt in.
import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { tokens, t, fonts, motionTokens } from '../theme'
import { motionSystem, byDistancePanelMs } from '../motion'
import { useBreakpoint } from '../hooks/useBreakpoint'

// Slide duration in ms — durationBase for every breakpoint (mobile now slides
// horizontally like the desktop drawer, just full-screen, so the shorter
// duration reads correctly for both).
const SLIDE_MS = parseInt(motionTokens.durationBase, 10)

// Resize bounds (MOTION_SYSTEM.md 7.4 + this feature's own spec): roughly
// 400px so a form never gets uncomfortably cramped, up to 70% of the
// viewport so the panel can never crowd out the page behind it entirely.
const MIN_WIDTH = 400
const MAX_WIDTH_VW = 0.7

export function SidePanel({
  title,
  subtitle,
  onClose,
  width: widthHint = 480,
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
  // A per-consumer content-aware default, not a fixed value -- e.g. the Brand
  // Visual Guide's item drawer passes a wider hint so type specimen sheets
  // don't clip. Users can resize from there; this only sets the starting
  // point. SidePanel never hardcodes logic for any one consumer's content.
  width?: number
  baseZIndex?: number
  headerExtra?: ReactNode
  preventClose?: boolean
  children: ReactNode
}) {
  const { isMobile: narrow } = useBreakpoint()
  const [shown, setShown] = useState(false)
  const closingRef = useRef(false)

  // Resizable width state, seeded from the hint once on mount. Drag updates
  // this directly with no transition (direct manipulation must never fight
  // the pointer); anything else that changes it -- currently only the
  // viewport-resize reclamp below -- animates via duration.byDistance.panel
  // + easing.snap, computed for however far the width actually has to move.
  const [width, setWidth] = useState(widthHint)
  const [dragging, setDragging] = useState(false)
  const [grabberHover, setGrabberHover] = useState(false)
  const [transitionMs, setTransitionMs] = useState(0)
  const dragStart = useRef<{ x: number; width: number } | null>(null)

  const onGrabberPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      dragStart.current = { x: e.clientX, width }
      setDragging(true)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [width]
  )

  useEffect(() => {
    if (!dragging) return
    function onMove(e: globalThis.PointerEvent) {
      if (!dragStart.current) return
      // The panel is anchored to the right edge, so dragging the left edge
      // (the handle) further left -- clientX decreasing -- widens it.
      const delta = dragStart.current.x - e.clientX
      const max = window.innerWidth * MAX_WIDTH_VW
      setWidth(Math.min(max, Math.max(MIN_WIDTH, dragStart.current.width + delta)))
    }
    function onUp() {
      setDragging(false)
      dragStart.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [dragging])

  // Re-clamp if the viewport narrows enough that 70vw drops below the
  // current width. This is the one case in this component where width
  // changes programmatically rather than by drag, so it's the case
  // duration.byDistance.panel + easing.snap actually animates.
  useEffect(() => {
    if (narrow) return
    function onResize() {
      const max = window.innerWidth * MAX_WIDTH_VW
      if (width > max) {
        setTransitionMs(byDistancePanelMs(width - max))
        setWidth(max)
      }
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [narrow, width])

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

  const widthTransition = `width ${dragging ? 0 : transitionMs}ms ${motionSystem.easing.snap}`
  const slideTransition = `transform ${motionTokens.durationBase} ${shown ? motionTokens.easeEnter : motionTokens.easeExit}`

  const panelStyle: CSSProperties = narrow
    ? {
        ...styles.panelBase,
        ...styles.fullScreen,
        zIndex: baseZIndex,
        transition: slideTransition,
        transform: shown ? 'translateX(0)' : 'translateX(100vw)',
      }
    : {
        ...styles.panelBase,
        ...styles.drawer,
        width,
        zIndex: baseZIndex,
        transition: `${slideTransition}, ${widthTransition}`,
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
        {!narrow && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize panel"
            onPointerDown={onGrabberPointerDown}
            onPointerEnter={() => setGrabberHover(true)}
            onPointerLeave={() => setGrabberHover(false)}
            style={styles.grabber}
          >
            <div style={{ ...styles.grabberBar, ...(dragging || grabberHover ? styles.grabberBarActive : null) }} />
          </div>
        )}
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
  // Hit target is wider than the visible bar so it's easy to grab; sits
  // centred on the panel's own left border rather than fully outside it, so
  // it never overlaps the backdrop's click-to-close area.
  grabber: {
    position: 'absolute',
    left: -4,
    top: 0,
    bottom: 0,
    width: 8,
    cursor: 'col-resize',
    display: 'flex',
    justifyContent: 'center',
    zIndex: 1,
    touchAction: 'none',
  },
  // Not invisible at rest: a fully-hidden-until-hover handle is not a
  // discoverable one -- there was nothing on screen to tell a user this
  // edge was draggable at all. Rest state shows a faint neutral line
  // (t.border.default at low opacity, a subtle divider rather than a call
  // to action) so the draggable edge is genuinely visible; hover/drag
  // fades it up to full-opacity teal. Both properties animate together on
  // duration.micro (80ms) + easing.standard (MOTION_SYSTEM.md 4.2/4.5) --
  // a hover/press affordance on a small control is exactly what `micro`
  // is for.
  grabberBar: {
    width: 2,
    height: '100%',
    background: t.border.default,
    opacity: 0.6,
    transition: `opacity ${motionSystem.duration.micro} ${motionSystem.easing.standard}, background ${motionSystem.duration.micro} ${motionSystem.easing.standard}`,
  },
  grabberBarActive: {
    background: t.border.brand,
    opacity: 1,
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
