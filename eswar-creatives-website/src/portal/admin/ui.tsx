// Shared building blocks for the admin portal pages (Phase 3).
// Everything here is built from the portal theme tokens so the admin modules
// match the cream/teal Atelier palette used across the rest of the portal.
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { X } from 'lucide-react'
import { tokens, t, fonts } from '../theme'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { FadeOverflow } from '../components/shared/FadeOverflow'

// SF Mono for monetary amounts and proposal/invoice numbers. There is no mono
// token in theme.ts, so it lives here as the single admin-wide definition.
export const mono =
  "'SF Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"

// ── Money ────────────────────────────────────────────────────────────
// INR renders in the Indian grouping (₹4,46,250); USD in standard grouping.
export function formatMoney(amount: number, currency: string): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    const symbol = currency === 'INR' ? '₹' : '$'
    return `${symbol}${Math.round(amount).toLocaleString(locale)}`
  }
}

// ── Relative time (for the activity feed) ──────────────────────────────
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const secs = Math.round((Date.now() - then) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.round(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.round(months / 12)}y ago`
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(iso)
  }
}

// ── Status pills ───────────────────────────────────────────────────────
// Covers both proposal and invoice statuses; keys are the raw DB values.
type Tone = { bg: string; fg: string }

const STATUS_TONES: Record<string, Tone> = {
  // proposals
  draft: { bg: '#F0EEEA', fg: t.text.tertiary },
  sent: { bg: tokens.goldLight, fg: tokens.goldDark },
  viewed: { bg: tokens.tealLight, fg: tokens.primary },
  accepted: { bg: tokens.greenLight, fg: tokens.green },
  declined: { bg: tokens.rubyLight, fg: tokens.ruby },
  expired: { bg: '#F0EEEA', fg: t.text.tertiary },
  // invoices
  pending: { bg: tokens.goldLight, fg: tokens.goldDark },
  paid: { bg: tokens.greenLight, fg: tokens.green },
  partially_paid: { bg: tokens.tealLight, fg: tokens.primary },
  overdue: { bg: tokens.rubyLight, fg: tokens.ruby },
  cancelled: { bg: '#F0EEEA', fg: t.text.tertiary },
  void: { bg: '#F0EEEA', fg: t.text.tertiary },
}

const STATUS_LABELS: Record<string, string> = {
  partially_paid: 'Partially paid',
}

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONES[status] ?? { bg: '#F0EEEA', fg: t.text.tertiary }
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 999,
        background: tone.bg,
        color: tone.fg,
        fontFamily: fonts.body,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'capitalize',
        letterSpacing: 0.2,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ── Shared page layout pieces ───────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <header style={ui.headerRow}>
      <div>
        <h1 style={ui.pageTitle}>{title}</h1>
        {subtitle && <p style={ui.pageSubtitle}>{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function Card({
  children,
  style,
}: {
  children: ReactNode
  style?: CSSProperties
}) {
  return <section style={{ ...ui.card, ...style }}>{children}</section>
}

// ── Modal ───────────────────────────────────────────────────────────────
// Single popup-modal primitive shared by every creation/detail flow in the
// admin portal (proposals, invoices, …) so they stay visually consistent and
// keep the user in context instead of navigating to a full page. `size="lg"`
// widens the panel for richer forms like the proposal builder.
//
// Three parts: a fixed header (unchanged), a scrollable body wrapping
// `children`, and an optional fixed footer. Before this, the panel had no
// scroll container of its own at all -- `children` rendered bare and a tall
// modal scrolled `ui.modalOverlay`, the scrim, which took any trailing
// action row (Cancel/Save) along with it. See COMPONENT_PATTERNS.md's
// Scrollbar Gutter Pattern for the full history of that gap.
//
// `footer` is opt-in. Callers that don't pass it keep their action row as
// the last thing in `children`, inside the new scrollable body -- unchanged
// from before, not newly broken, just not newly fixed either. Only
// BrandVisualTab's item form has been migrated to `footer` so far; the six
// other Modal consumers (AddLeadModal, NudgeModal, ConfirmPaymentModal,
// ProposalNudgeModal, CsvImportModal, AddClientModal) still embed their
// action row in children and would need the same migration to get a
// genuinely fixed footer too -- logged in PORTAL_ARCHITECTURE.md Section 11.
export function Modal({
  title,
  onClose,
  size = 'sm',
  maxWidth,
  closeOnBackdrop = true,
  headerExtra,
  footer,
  children,
}: {
  title: string
  onClose: () => void
  size?: 'sm' | 'lg'
  // Overrides the size-based default (480 / 760) for callers that need a
  // specific width, e.g. the email preview modal's 600px per spec.
  maxWidth?: number
  // When false the modal ignores backdrop clicks and only closes via the
  // explicit close button (used by the proposal builder, which holds unsaved
  // work that an accidental outside click should never discard).
  closeOnBackdrop?: boolean
  // Optional control rendered in the header, left of the close button.
  headerExtra?: ReactNode
  // Optional fixed footer, rendered outside the scrollable body. Typically
  // the Cancel/Save action row.
  footer?: ReactNode
  children: ReactNode
}) {
  const { isMobile } = useBreakpoint()
  const bodyRef = useRef<HTMLDivElement>(null)
  const [showFade, setShowFade] = useState(false)

  // H7: Flexibility and efficiency — Escape closes any open modal. The owning
  // component's onClose handles its own unsaved-work confirmation when needed.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Mobile: lock body scroll while the modal covers the full screen.
  useEffect(() => {
    if (!isMobile) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isMobile])

  // The fade is a cue that content continues below, not a permanent
  // decoration -- only shown while the body actually overflows and isn't
  // already scrolled to the bottom. Re-measured on scroll and after layout
  // (children can change height after mount, e.g. async form content).
  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el) return
    function measure() {
      if (!el) return
      const scrollable = el.scrollHeight > el.clientHeight + 1
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 4
      setShowFade(scrollable && !atBottom)
    }
    measure()
    el.addEventListener('scroll', measure)
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', measure)
      ro.disconnect()
    }
  }, [children])

  // Matches whichever background the panel actually renders -- large modals
  // sit on tokens.bg, small ones on tokens.surface, never t.background.page.
  // FadeOverflow's own default fallback assumes the page canvas, which is
  // wrong here; see its fallbackColor prop.
  const panelBackground = size === 'lg' ? tokens.bg : tokens.surface

  const bodyContent = (
    <div ref={bodyRef} style={ui.modalBody}>
      {children}
    </div>
  )

  return (
    <div
      style={{ ...ui.modalOverlay, ...(isMobile ? ui.modalOverlayMobile : null) }}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        style={{
          ...ui.modalPanel,
          maxWidth: maxWidth ?? (size === 'lg' ? 760 : 480),
          // Large modals host card-based forms (e.g. the proposal builder); the
          // cream background lets those white cards stand out the way they do on
          // the full-page content area. Simple modals stay on a white panel.
          background: panelBackground,
          ...(isMobile ? ui.modalPanelMobile : null),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={ui.modalHead}>
          <h2 style={ui.modalTitle}>{title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {headerExtra}
            <button
              type="button"
              style={{ ...ui.modalClose, ...(isMobile ? ui.modalCloseMobile : null) }}
              onClick={onClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        {showFade ? (
          <FadeOverflow direction="vertical" fallbackColor={panelBackground} style={ui.modalBodyFadeWrap}>
            {bodyContent}
          </FadeOverflow>
        ) : (
          bodyContent
        )}
        {footer && <div style={ui.modalFooter}>{footer}</div>}
      </div>
    </div>
  )
}

export function EmptyState({
  icon,
  heading,
  body,
}: {
  icon?: ReactNode
  heading: string
  body?: string
}) {
  return (
    <div style={ui.emptyState}>
      {icon && <div style={ui.emptyIcon}>{icon}</div>}
      <h2 style={ui.emptyHeading}>{heading}</h2>
      {body && <p style={ui.emptyBody}>{body}</p>}
    </div>
  )
}

export const ui: Record<string, CSSProperties> = {
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 24,
  },
  pageTitle: {
    fontFamily: fonts.heading,
    fontSize: 28,
    fontWeight: 600,
    color: t.text.primary,
    margin: 0,
  },
  pageSubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.secondary,
    margin: '6px 0 0',
  },
  card: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 20,
  },
  muted: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.secondary,
  },
  mono: {
    fontFamily: mono,
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.primary,
    color: t.text.onPrimary,
    border: 'none',
    borderRadius: 8,
    padding: '10px 16px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: t.background.scrim,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '60px 20px',
    // Above SidePanel (z-201) so a modal opened from within a drawer (e.g.
    // AddLeadModal from LeadDrawer) always sits on top, backdrop included.
    zIndex: 400,
    overflowY: 'auto',
    // The panel now bounds itself (maxHeight 85vh desktop, 100dvh mobile) and
    // scrolls its own body internally (`modalBody`, below) -- this overflow
    // is a defensive fallback for whatever edge case still makes the panel
    // exceed the overlay's own available space, not the modal's primary
    // scroll mechanism the way it was before that fix.
    //
    // `both-edges`, not plain `stable`, because this is a centring flex
    // container: a gutter on the end edge only would hold the panel steady but
    // leave it permanently off-centre by half the scrollbar width. Reserving
    // both edges keeps the panel centred and stable at once.
    //
    // One rule here covers every modal: AddLeadModal, NudgeModal,
    // ConfirmPaymentModal, ProposalNudgeModal, CsvImportModal and
    // AddClientModal all render through this component and must not repeat it.
    //
    // No-op on touch, where scrollbars are overlays with no layout width, so
    // the full-screen mobile variant below is unaffected in practice.
    scrollbarGutter: 'stable both-edges',
  },
  // Mobile: no backdrop padding needed, the panel itself goes full-screen.
  modalOverlayMobile: {
    padding: 0,
    alignItems: 'stretch',
  },
  // Three-part layout: modalHead (fixed) + modalBody (scrolls) + optional
  // modalFooter (fixed). flexDirection column + maxHeight is what makes the
  // body the thing that scrolls instead of the overlay -- see Modal's own
  // comment and COMPONENT_PATTERNS.md's Scrollbar Gutter Pattern.
  modalPanel: {
    background: tokens.surface,
    borderRadius: 12,
    border: `1px solid ${tokens.border}`,
    width: '100%',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
  },
  // Mobile: fill the viewport (same full-screen pattern as SidePanel) so forms
  // get the whole screen instead of a cramped centered card. maxHeight
  // overridden to match -- 85vh would otherwise leave a dead gap below a
  // full-height panel that already fills the screen.
  modalPanelMobile: {
    minHeight: '100dvh',
    maxHeight: '100dvh',
    width: '100vw',
    maxWidth: '100vw',
    borderRadius: 0,
    border: 'none',
    boxSizing: 'border-box',
  },
  // Same 24px side padding the whole panel used to carry as one block; now
  // scoped to just this fixed part so body/footer can each carry their own.
  modalHead: {
    flexShrink: 0,
    padding: '24px 24px 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  // The actual scroll container -- see the Scrollbar Gutter Pattern in
  // COMPONENT_PATTERNS.md. flex:1 + minHeight:0 is what lets it shrink
  // inside modalPanel's own maxHeight rather than overflowing it (a flex
  // child's default min-height is auto, i.e. its content size, which alone
  // would defeat the parent's maxHeight entirely).
  modalBody: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    scrollbarGutter: 'stable',
    padding: '0 24px 24px',
  },
  // FadeOverflow's own wrapper is `position:relative; overflow:hidden`, not a
  // flex container -- without `display:flex` here too, modalBody's `flex:1`
  // would do nothing once nested inside it (flex properties only resolve
  // against a flex parent), the div would collapse to its content height,
  // and `overflowY:auto` would have no bounded height to ever actually
  // scroll within. flex:1/minHeight:0 here is what fills the space modalBody
  // would otherwise occupy directly, and display:flex is what lets
  // modalBody's own flex:1 keep working one level down.
  modalBodyFadeWrap: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
  },
  modalFooter: {
    flexShrink: 0,
    padding: '16px 24px 24px',
    borderTop: `1px solid ${t.border.subtle}`,
  },
  modalTitle: {
    // H4: Consistency — all modal headers use Fraunces (heading) at 18px.
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: t.text.primary,
    margin: 0,
  },
  modalClose: {
    background: 'transparent',
    border: 'none',
    color: t.text.muted,
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
  },
  // 44x44 tap target on mobile.
  modalCloseMobile: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '64px 24px',
    color: t.text.secondary,
  },
  emptyIcon: {
    color: tokens.accent,
    marginBottom: 16,
    opacity: 0.7,
  },
  emptyHeading: {
    fontFamily: fonts.heading,
    fontSize: 20,
    fontWeight: 600,
    color: t.text.primary,
    margin: '0 0 8px',
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.secondary,
    margin: 0,
    maxWidth: 420,
    lineHeight: 1.5,
  },
}
