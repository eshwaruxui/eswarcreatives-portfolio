// Generic NON-modal right drawer — the counterpart to SidePanel for panels
// the user works ALONGSIDE rather than inside. Pattern lifted from
// InvoicePreview (the invoice detail drawer): slide-in from the right at
// 0.28s ease with NO backdrop on desktop, so the page behind stays fully
// interactive; below 768px it becomes a bottom sheet with a tap-to-close
// backdrop (a different interaction context, per the house pattern). The one
// deliberate addition over InvoicePreview: Escape closes (H7) — SidePanel
// already proves that is the house standard for drawers.
//
// Unlike InvoicePreview's inline mechanics this stays MOUNTED and animates on
// the `open` prop, so consumers with a collapsed state (the quotation
// builder's summary) get the exit animation for free. While closed the panel
// is visibility:hidden (after the slide finishes), which removes its
// controls from the tab order without React 19's inert.
//
// InvoicePreview itself is intentionally NOT migrated onto this component —
// that is a separate cleanup.
import { useEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { tokens } from '../theme'
import { useBreakpoint } from '../hooks/useBreakpoint'

const SLIDE = '0.28s ease'

export function PersistentDrawer({
  open,
  onClose,
  width = 380,
  topOffset = 0,
  zIndex = 120,
  ariaLabel,
  children,
}: {
  open: boolean
  onClose: () => void
  /** Desktop drawer width. The bottom sheet is always full width. */
  width?: number
  /** Desktop only: distance from the viewport top (e.g. below a sticky bar). */
  topOffset?: number
  zIndex?: number
  ariaLabel: string
  children: ReactNode
}) {
  const { isMobile: narrow } = useBreakpoint()

  // H7: Escape closes, same as SidePanel. Listener only while open, so a
  // collapsed drawer never swallows Escape from the rest of the page.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const panelStyle: CSSProperties = narrow
    ? {
        ...styles.panelBase,
        left: 0,
        right: 0,
        bottom: 0,
        maxHeight: '85dvh',
        borderTop: `1px solid ${tokens.border}`,
        borderRadius: '12px 12px 0 0',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        zIndex,
      }
    : {
        ...styles.panelBase,
        top: topOffset,
        right: 0,
        bottom: 0,
        width,
        borderLeft: `1px solid ${tokens.border}`,
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        zIndex,
      }

  return (
    <>
      {/* Backdrop only on the mobile bottom sheet; the desktop drawer leaves
          the page interactive — that is the whole point of this primitive. */}
      {narrow && open && (
        <div style={{ ...styles.backdrop, zIndex: zIndex - 1 }} onClick={onClose} aria-hidden="true" />
      )}
      <aside
        aria-label={ariaLabel}
        aria-hidden={!open}
        style={{
          ...panelStyle,
          visibility: open ? 'visible' : 'hidden',
          transition: open
            ? `transform ${SLIDE}, visibility 0s`
            : `transform ${SLIDE}, visibility 0s linear 0.28s`,
        }}
      >
        {children}
      </aside>
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  panelBase: {
    position: 'fixed',
    background: tokens.surface,
    boxShadow: '-8px 0 24px rgba(2, 76, 79, 0.10)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(1, 43, 45, 0.35)',
  },
}
