// Shared proposal renderer for both the admin detail view and the client portal
// panel. One component, two modes, so the proposal reads identically wherever it
// appears (item 3: consistent UX across both portals).
//
// Three accordion levels, all collapsed by default:
//   L1 Phase    -> reveals its solution list
//   L2 Solution -> reveals scope description + line items
//   L3 Item     -> scope paragraph + deliverable bullets (no further nesting)
//
// Always visible (never collapses): the proposal header, scope documents, the
// "N phases / M solutions" summary, the pricing summary, payment terms, and (in
// client mode) the Accept / Decline actions.
//
// Token rules: theme tokens only, no raw hex, no em dashes. Fraunces italic for
// the proposal title, Inter for labels, SF Mono for every amount and number.
// Expand/collapse animates with motionTokens.base via a grid-rows transition so
// there is no layout jump; the chevron rotates with motionTokens.fast.
import { useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { ChevronRight, FileText } from 'lucide-react'
import { tokens, t, fonts, motionTokens, phasePalette } from '../../theme'
import { mono, formatMoney, formatDate } from '../../admin/ui'
import { useBreakpoint } from '../../hooks/useBreakpoint'

export type ProposalStatus =
  | 'draft'
  | 'sent'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'expired'

export type AccordionItem = {
  id: string
  title: string
  scope: string | null
  amount: number
}

export type AccordionSolution = {
  // Stable key for accordion open-state and the approvedIds set passed to onAccept.
  id: string
  title: string
  overview: string
  timeline?: string
  keyNote?: string
  items: AccordionItem[]
}

export type AccordionScheduleRow = {
  id: string
  label: string
  pct: number | null
  triggeredBy: string | null
}

export type AccordionPhase = {
  id: string
  phaseNumber: number | null
  name: string
  timeline: string | null
  solutions: AccordionSolution[]
  schedule?: AccordionScheduleRow[]
}

export type AccordionDocument = {
  id: string
  fileName: string
}

// The full proposal the accordion needs. Each portal builds this from its own
// query so the rendering layer stays storage-agnostic.
export type AccordionProposal = {
  id: string
  title: string
  proposalNumber: string | null
  clientName: string | null
  companyName: string | null
  vertical: string | null
  status: ProposalStatus
  validUntil: string | null
  currency: string
  totalAmount: number
  discountPct: number | null
  discountLabel: string | null
  paymentTerms: string | null
  revisionRounds: string
  // Admin-only internal note; never rendered in client mode.
  keyNote?: string | null
  phases: AccordionPhase[]
  documents: AccordionDocument[]
}

const VERTICAL_LABEL: Record<string, string> = {
  brand: 'Brand identity',
  saas: 'SaaS design',
}

const solutionSubtotal = (s: AccordionSolution) =>
  s.items.reduce((sum, it) => sum + it.amount, 0)
const phaseSubtotal = (p: AccordionPhase) =>
  p.solutions.reduce((sum, s) => sum + solutionSubtotal(s), 0)

// Phase 1 teal, Phase 2 gold, Phase 3 ruby; cycle the palette for any further
// phases so a four-phase proposal still gets a consistent pill colour.
function phaseTone(phaseNumber: number | null, index: number) {
  const n = phaseNumber ?? index + 1
  return phasePalette[n] ?? phasePalette[((n - 1) % 3) + 1] ?? phasePalette[1]
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function ProposalAccordion({
  proposal,
  mode,
  onAccept,
  onDecline,
  onOpenDocument,
  // Preview mode (admin previewing the client view): CTAs render greyed out and
  // never fire. The caller shows the accompanying "this is a preview" banner.
  actionsDisabled = false,
}: {
  proposal: AccordionProposal
  mode: 'admin' | 'client'
  onAccept?: (approvedIds: Set<string>) => void | Promise<void>
  onDecline?: (reason: string) => void | Promise<void>
  onOpenDocument?: (doc: AccordionDocument) => void
  actionsDisabled?: boolean
}) {
  const { isMobile } = useBreakpoint()
  const { currency } = proposal

  // Accordion open-state. Multiple phases may be open at once (more forgiving:
  // a client can compare phases side by side). Solutions track independently.
  const [openPhases, setOpenPhases] = useState<Set<string>>(new Set())
  const [openSolutions, setOpenSolutions] = useState<Set<string>>(new Set())
  const [hoveredSolution, setHoveredSolution] = useState<string | null>(null)

  // Client action state. The admin view never mounts these controls.
  const [busy, setBusy] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const solutionCount = useMemo(
    () => proposal.phases.reduce((n, p) => n + p.solutions.length, 0),
    [proposal.phases]
  )
  const allPhaseIds = useMemo(() => proposal.phases.map((p) => p.id), [proposal.phases])
  const allSolutionIds = useMemo(
    () => proposal.phases.flatMap((p) => p.solutions.map((s) => s.id)),
    [proposal.phases]
  )
  const allExpanded = openPhases.size === allPhaseIds.length && allPhaseIds.length > 0

  const subtotal = useMemo(
    () => proposal.phases.reduce((sum, p) => sum + phaseSubtotal(p), 0),
    [proposal.phases]
  )
  const discountPct = proposal.discountPct ?? 0
  const discountAmount = (subtotal * discountPct) / 100

  function togglePhase(id: string) {
    setOpenPhases((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSolution(id: string) {
    setOpenSolutions((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function expandAll() {
    setOpenPhases(new Set(allPhaseIds))
    setOpenSolutions(new Set(allSolutionIds))
  }
  function collapseAll() {
    setOpenPhases(new Set())
    setOpenSolutions(new Set())
  }

  async function handleAccept() {
    if (actionsDisabled || !onAccept) return
    setBusy(true)
    setActionError(null)
    try {
      // No per-item selection in this UX, so accepting approves every solution.
      await onAccept(new Set(allSolutionIds))
    } catch {
      setActionError(
        'We could not accept this proposal. Please try again or contact eswar@eswarcreatives.in'
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleDecline() {
    if (actionsDisabled || !onDecline) return
    setBusy(true)
    setActionError(null)
    try {
      await onDecline(reason)
      setDeclining(false)
      setReason('')
    } catch {
      setActionError(
        'We could not record your decision. Please try again or contact eswar@eswarcreatives.in'
      )
    } finally {
      setBusy(false)
    }
  }

  const status = proposal.status
  const live = status === 'sent' || status === 'viewed'
  const showActions = mode === 'client' && status !== 'draft'

  const rowMinHeight = isMobile ? 48 : undefined

  return (
    <div style={styles.root}>
      {/* Header: always visible. Fraunces italic title + neutral meta chips. */}
      <header style={styles.header}>
        <h2 style={styles.title}>{proposal.title}</h2>
        <div style={styles.metaWrap}>
          <StatusChip status={status} />
          {proposal.companyName && (
            <Meta label="Client" value={proposal.companyName} />
          )}
          {proposal.vertical && (
            <Meta
              label="Vertical"
              value={VERTICAL_LABEL[proposal.vertical] ?? proposal.vertical}
            />
          )}
          {proposal.validUntil && (
            <Meta label="Valid until" value={formatDate(proposal.validUntil)} />
          )}
          {proposal.proposalNumber && (
            <Meta label="Proposal" value={proposal.proposalNumber} numeric />
          )}
          <Meta label="Currency" value={currency} />
        </div>
      </header>

      {/* Scope documents: always visible. */}
      <section style={styles.section}>
        <h3 style={styles.sectionHeading}>Scope documents</h3>
        {proposal.documents.length === 0 ? (
          <p style={styles.muted}>No documents attached.</p>
        ) : (
          <div style={styles.docList}>
            {proposal.documents.map((d) => (
              <button
                key={d.id}
                type="button"
                style={styles.docRow}
                onClick={() => onOpenDocument?.(d)}
                disabled={!onOpenDocument}
              >
                <FileText size={16} style={{ color: tokens.accent, flexShrink: 0 }} />
                <span style={styles.docName}>{d.fileName}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Summary line + expand/collapse control: always visible. */}
      <div style={styles.summaryRow}>
        <span style={styles.summaryText}>
          {plural(proposal.phases.length, 'phase')} {DOT}{' '}
          {plural(solutionCount, 'solution')}
        </span>
        <button
          type="button"
          style={styles.expandToggle}
          onClick={allExpanded ? collapseAll : expandAll}
        >
          {allExpanded ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      {/* Phases (L1). */}
      <div style={styles.phaseList}>
        {proposal.phases.map((ph, pi) => {
          const open = openPhases.has(ph.id)
          const tone = phaseTone(ph.phaseNumber, pi)
          return (
            <section
              key={ph.id}
              style={{
                ...styles.phaseCard,
                ...(open ? styles.phaseCardOpen : null),
              }}
            >
              <button
                type="button"
                style={{ ...styles.phaseRow, minHeight: rowMinHeight }}
                onClick={() => togglePhase(ph.id)}
                aria-expanded={open}
              >
                <ChevronRight
                  size={18}
                  style={{ ...styles.chevron, ...(open ? styles.chevronOpen : null) }}
                />
                <span
                  style={{ ...styles.phasePill, background: tone.bg, color: tone.fg }}
                >
                  {ph.phaseNumber ?? pi + 1}
                </span>
                <span style={styles.phaseTextCol}>
                  <span style={styles.phaseName}>{ph.name}</span>
                  <span style={styles.phaseSub}>
                    {ph.timeline ? `${ph.timeline} ${DOT} ` : ''}
                    {plural(ph.solutions.length, 'solution')}
                  </span>
                </span>
                <span style={styles.phaseAmount}>
                  {formatMoney(phaseSubtotal(ph), currency)}
                </span>
              </button>

              <Collapsible open={open}>
                <div style={styles.phaseBody}>
                  {ph.solutions.map((sol, si) => {
                    const sOpen = openSolutions.has(sol.id)
                    const hovered = hoveredSolution === sol.id
                    return (
                      <div key={sol.id} style={styles.solutionCard}>
                        <button
                          type="button"
                          style={{
                            ...styles.solutionRow,
                            minHeight: rowMinHeight,
                            background: hovered ? t.background.subtle : 'transparent',
                          }}
                          onClick={() => toggleSolution(sol.id)}
                          onMouseEnter={() => setHoveredSolution(sol.id)}
                          onMouseLeave={() => setHoveredSolution(null)}
                          aria-expanded={sOpen}
                        >
                          <ChevronRight
                            size={16}
                            style={{
                              ...styles.chevron,
                              ...(sOpen ? styles.chevronOpen : null),
                            }}
                          />
                          <span style={styles.solutionNumber}>{si + 1}</span>
                          <span style={styles.solutionName}>
                            {sol.title || `Solution ${si + 1}`}
                          </span>
                          <span style={styles.solutionAmount}>
                            {formatMoney(solutionSubtotal(sol), currency)}
                          </span>
                        </button>

                        <Collapsible open={sOpen}>
                          <div style={styles.solutionBody}>
                            {sol.timeline && (
                              <p style={styles.solutionTimeline}>{sol.timeline}</p>
                            )}
                            {sol.overview && (
                              <p style={styles.solutionOverview}>{sol.overview}</p>
                            )}
                            {sol.items.map((it) => (
                              <div key={it.id} style={styles.itemRow}>
                                <div style={{ minWidth: 0 }}>
                                  <div style={styles.itemTitle}>{it.title}</div>
                                  {it.scope && (
                                    <div style={styles.itemScope}>{it.scope}</div>
                                  )}
                                </div>
                                <span style={styles.itemAmount}>
                                  {formatMoney(it.amount, currency)}
                                </span>
                              </div>
                            ))}
                            {sol.keyNote && (
                              <p style={styles.keyNote}>Note: {sol.keyNote}</p>
                            )}
                          </div>
                        </Collapsible>
                      </div>
                    )
                  })}

                  {ph.schedule && ph.schedule.length > 0 && (
                    <div style={styles.scheduleBlock}>
                      <div style={styles.scheduleHeading}>Payment schedule</div>
                      {ph.schedule.map((s) => (
                        <div key={s.id} style={styles.scheduleRow}>
                          <span style={styles.scheduleLabel}>{s.label}</span>
                          <span style={styles.schedulePct}>
                            {s.pct != null ? `${s.pct}%` : ''}
                          </span>
                          {s.triggeredBy && (
                            <span style={styles.scheduleTrigger}>{s.triggeredBy}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Collapsible>
            </section>
          )
        })}
      </div>

      {/* Admin-only internal note. */}
      {mode === 'admin' && proposal.keyNote && (
        <section style={styles.section}>
          <h3 style={styles.sectionHeading}>Internal note</h3>
          <p style={styles.internalNote}>{proposal.keyNote}</p>
        </section>
      )}

      {/* Pricing summary: always visible. */}
      <section style={styles.pricingCard}>
        <div style={styles.pricingRow}>
          <span style={styles.muted}>Subtotal</span>
          <span style={styles.pricingValue}>{formatMoney(subtotal, currency)}</span>
        </div>
        {discountPct ? (
          <div style={styles.pricingRow}>
            <span style={styles.muted}>
              {proposal.discountLabel || `Discount ${discountPct}%`}
            </span>
            <span style={styles.discountValue}>
              -{formatMoney(discountAmount, currency)}
            </span>
          </div>
        ) : null}
        <div style={styles.totalBlock}>
          <span style={styles.totalLabel}>Total</span>
          <span style={styles.totalValue}>
            {formatMoney(proposal.totalAmount, currency)}
          </span>
        </div>
        {proposal.paymentTerms && <p style={styles.terms}>{proposal.paymentTerms}</p>}
        <div style={styles.revRow}>
          <span style={styles.muted}>Revision rounds</span>
          <span style={styles.revValue}>{proposal.revisionRounds}</span>
        </div>
      </section>

      {/* Accept / Decline: client mode only. */}
      {showActions && (
        <div style={styles.actions}>
          {actionError && <div style={styles.actionError}>{actionError}</div>}

          {actionsDisabled && live ? (
            // Preview: greyed, inert CTAs (the banner above explains why). Only
            // while the proposal is still live; a locked proposal falls through
            // to its status note below so the preview stays truthful.
            <div style={styles.actionRow}>
              <button type="button" style={styles.disabledBtn} disabled>
                Accept
              </button>
              <button type="button" style={styles.disabledBtn} disabled>
                Decline
              </button>
            </div>
          ) : live && !declining ? (
            <div style={styles.actionRow}>
              <button
                type="button"
                style={{ ...styles.acceptBtn, opacity: busy ? 0.6 : 1 }}
                disabled={busy}
                onClick={() => void handleAccept()}
              >
                {busy ? 'Working...' : 'Accept'}
              </button>
              <button
                type="button"
                style={styles.declineBtn}
                disabled={busy}
                onClick={() => {
                  setDeclining(true)
                  setReason('')
                  setActionError(null)
                }}
              >
                Decline
              </button>
            </div>
          ) : live && declining ? (
            <div style={styles.declineBox}>
              <label style={styles.declineLabel}>
                Reason (optional)
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  style={styles.textarea}
                  placeholder="Let us know if there is anything you would like to change."
                />
              </label>
              <div style={styles.actionRow}>
                <button
                  type="button"
                  style={styles.declineBtn}
                  disabled={busy}
                  onClick={() => void handleDecline()}
                >
                  {busy ? 'Working...' : 'Confirm decline'}
                </button>
                <button
                  type="button"
                  style={styles.cancelBtn}
                  disabled={busy}
                  onClick={() => {
                    setDeclining(false)
                    setReason('')
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : status === 'accepted' ? (
            <p style={styles.acceptedNote}>
              You accepted this proposal. Your project is underway.
            </p>
          ) : status === 'declined' ? (
            <p style={styles.lockedNote}>You declined this proposal.</p>
          ) : status === 'expired' ? (
            <p style={styles.lockedNote}>This proposal has expired.</p>
          ) : null}
        </div>
      )}
    </div>
  )
}

// Non-breaking middle dot used as the separator in summary lines (no em dash).
const DOT = '·'

// Height-animated wrapper using the grid-rows 0fr/1fr trick: smooth open/close
// with motionTokens.base and no layout shift, without measuring the DOM.
function Collapsible({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: open ? '1fr' : '0fr',
        transition: `grid-template-rows ${motionTokens.durationBase} ${motionTokens.easeDefault}`,
      }}
    >
      <div style={{ overflow: 'hidden', minHeight: 0 }}>{children}</div>
    </div>
  )
}

function Meta({
  label,
  value,
  numeric,
}: {
  label: string
  value: string
  numeric?: boolean
}) {
  return (
    <span style={styles.metaChip}>
      <span style={styles.metaLabel}>{label}</span>
      <span style={numeric ? styles.metaValueMono : styles.metaValue}>{value}</span>
    </span>
  )
}

const STATUS_LABEL: Record<ProposalStatus, { bg: string; fg: string; label: string }> = {
  draft: { bg: tokens.bg, fg: tokens.textMuted, label: 'Draft' },
  sent: { bg: tokens.tealLight, fg: tokens.primary, label: 'Sent' },
  viewed: { bg: tokens.goldLight, fg: tokens.goldDark, label: 'Viewed' },
  accepted: { bg: tokens.greenLight, fg: tokens.green, label: 'Accepted' },
  declined: { bg: tokens.rubyLight, fg: tokens.ruby, label: 'Declined' },
  expired: { bg: tokens.bg, fg: tokens.textMuted, label: 'Expired' },
}

function StatusChip({ status }: { status: ProposalStatus }) {
  const s = STATUS_LABEL[status]
  return (
    <span style={{ ...styles.statusChip, background: s.bg, color: s.fg }}>{s.label}</span>
  )
}

const styles: Record<string, CSSProperties> = {
  root: { fontFamily: fonts.body },

  header: { marginBottom: 20 },
  title: {
    fontFamily: fonts.heading,
    fontStyle: 'italic',
    fontSize: 26,
    fontWeight: 600,
    letterSpacing: '-0.01em',
    color: t.text.primary,
    margin: '0 0 14px',
  },
  metaWrap: { display: 'flex', flexWrap: 'wrap', gap: '8px 18px', alignItems: 'center' },
  metaChip: { display: 'inline-flex', flexDirection: 'column', gap: 2 },
  metaLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: t.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metaValue: { fontFamily: fonts.body, fontSize: 14, fontWeight: 500, color: t.text.primary },
  metaValueMono: { fontFamily: mono, fontSize: 13, fontWeight: 500, color: t.text.primary },
  statusChip: {
    padding: '4px 12px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: fonts.body,
    whiteSpace: 'nowrap',
    alignSelf: 'center',
  },

  section: {
    paddingBottom: 20,
    marginBottom: 20,
    borderBottom: `1px solid ${t.border.subtle}`,
  },
  sectionHeading: {
    fontFamily: fonts.heading,
    fontSize: 15,
    fontWeight: 600,
    color: t.text.primary,
    margin: '0 0 10px',
  },
  muted: { fontFamily: fonts.body, fontSize: 14, color: t.text.muted, margin: 0 },
  docList: { display: 'flex', flexDirection: 'column' },
  docRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
  },
  docName: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: tokens.accent,
    textDecoration: 'underline',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  summaryText: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary, fontWeight: 500 },
  expandToggle: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: t.text.primaryBrand,
    padding: '4px 6px',
    transition: `color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },

  phaseList: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 },
  phaseCard: {
    // Full 1px border on all four sides in both states. The rounded corners are
    // handled by border-radius alone (no overflow:hidden, which was clipping the
    // left edge); the Collapsible wrapper already hides its own overflow.
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    background: t.background.surface,
    transition: `background ${motionTokens.durationBase} ${motionTokens.easeDefault}, box-shadow ${motionTokens.durationBase} ${motionTokens.easeDefault}`,
  },
  phaseCardOpen: {
    // Active/expanded phase: brand left accent + subtle row background. The
    // accent is an inset shadow, not a wider border, so the left edge never
    // disappears and the content never shifts on expand.
    boxShadow: `inset 3px 0 0 0 ${t.border.brand}`,
    background: t.background.subtle,
  },
  phaseRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '14px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  chevron: {
    color: t.text.muted,
    flexShrink: 0,
    transition: `transform ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  chevronOpen: { transform: 'rotate(90deg)' },
  phasePill: {
    flexShrink: 0,
    width: 24,
    height: 24,
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: mono,
    fontSize: 13,
    fontWeight: 600,
  },
  phaseTextCol: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 },
  phaseName: {
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
    color: t.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  phaseSub: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted },
  phaseAmount: {
    fontFamily: mono,
    fontSize: 14,
    fontWeight: 600,
    color: t.text.primary,
    whiteSpace: 'nowrap',
    textAlign: 'right',
  },
  phaseBody: { padding: '0 16px 14px' },

  solutionCard: { borderTop: `1px solid ${t.border.subtle}` },
  solutionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '12px 4px',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  solutionNumber: {
    fontFamily: mono,
    fontSize: 12,
    color: t.text.muted,
    flexShrink: 0,
    width: 16,
    textAlign: 'center',
  },
  solutionName: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    color: t.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  solutionAmount: {
    fontFamily: mono,
    fontSize: 13,
    color: t.text.primary,
    whiteSpace: 'nowrap',
    textAlign: 'right',
  },
  solutionBody: { padding: '0 4px 10px 32px' },
  solutionTimeline: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted, margin: '0 0 6px' },
  solutionOverview: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
    lineHeight: 1.5,
    margin: '0 0 8px',
  },
  itemRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    padding: '8px 0',
    borderTop: `1px solid ${t.border.subtle}`,
  },
  itemTitle: { fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: t.text.primary },
  itemScope: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
    marginTop: 2,
    lineHeight: 1.5,
  },
  itemAmount: { fontFamily: mono, fontSize: 13, color: t.text.primary, whiteSpace: 'nowrap' },
  keyNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.goldDark,
    background: tokens.goldLight,
    borderRadius: 8,
    padding: '8px 12px',
    margin: '10px 0 0',
  },

  scheduleBlock: { marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.border.subtle}` },
  scheduleHeading: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: t.text.muted,
    marginBottom: 8,
  },
  scheduleRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
    padding: '5px 0',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
  },
  scheduleLabel: { flex: 1, minWidth: 0 },
  schedulePct: { fontFamily: mono, fontWeight: 600, color: t.text.primary, whiteSpace: 'nowrap' },
  scheduleTrigger: { fontSize: 12, color: t.text.muted, whiteSpace: 'nowrap' },

  internalNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.goldDark,
    background: tokens.goldLight,
    borderRadius: 8,
    padding: '10px 12px',
    margin: 0,
    lineHeight: 1.5,
  },

  pricingCard: {
    background: t.background.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
  },
  pricingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 0',
    fontFamily: fonts.body,
    fontSize: 14,
  },
  pricingValue: { fontFamily: mono, fontSize: 14, color: t.text.primary },
  discountValue: { fontFamily: mono, fontSize: 14, color: tokens.ruby },
  totalBlock: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 8,
    paddingTop: 12,
    borderTop: `1px solid ${t.border.subtle}`,
  },
  totalLabel: { fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: t.text.primary },
  totalValue: { fontFamily: mono, fontSize: 24, fontWeight: 700, color: t.text.primary },
  terms: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
    lineHeight: 1.5,
    margin: '14px 0 0',
  },
  revRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTop: `1px solid ${t.border.subtle}`,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  revValue: { fontFamily: fonts.body, fontSize: 14, fontWeight: 500, color: t.text.primary },

  actions: { marginTop: 4 },
  actionRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  acceptBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    border: 'none',
    borderRadius: 8,
    padding: '11px 22px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  declineBtn: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '11px 22px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  cancelBtn: {
    background: 'transparent',
    color: t.text.muted,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '11px 22px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  disabledBtn: {
    background: 'transparent',
    color: t.text.disabled,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    padding: '11px 22px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'not-allowed',
  },
  declineBox: { display: 'flex', flexDirection: 'column', gap: 12 },
  declineLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    color: t.text.primary,
  },
  textarea: {
    minHeight: 70,
    resize: 'vertical',
    background: tokens.inputBg,
    color: t.text.primary,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '10px 12px',
    fontFamily: fonts.body,
    fontSize: 14,
    outline: 'none',
  },
  acceptedNote: { fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: tokens.green, margin: 0 },
  lockedNote: { fontFamily: fonts.body, fontSize: 14, color: t.text.muted, margin: 0 },
  actionError: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '10px 12px',
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 12,
  },
}
