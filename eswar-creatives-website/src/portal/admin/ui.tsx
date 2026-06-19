// Shared building blocks for the admin portal pages (Phase 3).
// Everything here is built from the portal theme tokens so the admin modules
// match the cream/teal Atelier palette used across the rest of the portal.
import type { CSSProperties, ReactNode } from 'react'
import { tokens, fonts } from '../theme'

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
  draft: { bg: '#F0EEEA', fg: tokens.textMuted },
  sent: { bg: tokens.goldLight, fg: tokens.goldDark },
  viewed: { bg: tokens.tealLight, fg: tokens.primary },
  accepted: { bg: tokens.greenLight, fg: tokens.green },
  declined: { bg: tokens.rubyLight, fg: tokens.ruby },
  expired: { bg: '#F0EEEA', fg: tokens.textMuted },
  // invoices
  pending: { bg: tokens.goldLight, fg: tokens.goldDark },
  paid: { bg: tokens.greenLight, fg: tokens.green },
  overdue: { bg: tokens.rubyLight, fg: tokens.ruby },
  cancelled: { bg: '#F0EEEA', fg: tokens.textMuted },
  void: { bg: '#F0EEEA', fg: tokens.textMuted },
}

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONES[status] ?? { bg: '#F0EEEA', fg: tokens.textMuted }
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
      {status}
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
    color: tokens.text,
    margin: 0,
  },
  pageSubtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: tokens.textMuted,
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
    color: tokens.textMuted,
  },
  mono: {
    fontFamily: mono,
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.primary,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 16px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '64px 24px',
    color: tokens.textMuted,
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
    color: tokens.text,
    margin: '0 0 8px',
  },
  emptyBody: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: tokens.textMuted,
    margin: 0,
    maxWidth: 420,
    lineHeight: 1.5,
  },
}
