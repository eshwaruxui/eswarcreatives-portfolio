// Public proposal view — accessible without authentication.
// Reached via /proposal/:token; token is a uuid stored on the proposals row.
// Fetched via get_proposal_by_token RPC (SECURITY DEFINER, anon-callable)
// which enforces token + expiry server-side.
// Theme tokens only; no raw hex; no em dashes.
import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { supabase } from '../lib/supabase'
import { tokens, t, fonts } from './theme'
import { useBreakpoint } from './hooks/useBreakpoint'
import eswarLogo from '../imports/eswar-logo.svg'
import type { CSSProperties } from 'react'

type Phase = {
  id: string
  phase_number: number
  title: string
  solution_title: string | null
  key_note: string | null
  timeline: string | null
}

type LineItem = {
  id: string
  title: string
  amount: number | null
  solution_title: string | null
}

type PaymentScheduleRow = {
  id: string
  instalment_number: number
  label: string | null
  pct_of_total: number | null
}

type ProposalData = {
  id: string
  title: string
  client_name: string | null
  company_name: string | null
  total_amount: number
  currency: string
  status: string
  accepted_at: string | null
  declined_at: string | null
}

type TokenPayload = {
  proposal: ProposalData
  phases: Phase[]
  line_items: LineItem[]
  payment_schedule: PaymentScheduleRow[]
}

function fmtMoney(amount: number, currency: string): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function StatusBanner({ proposal }: { proposal: ProposalData }) {
  if (proposal.status === 'accepted') {
    return (
      <div style={styles.acceptedBanner}>
        You accepted this proposal{proposal.accepted_at ? ` on ${fmtDate(proposal.accepted_at)}` : ''}.
      </div>
    )
  }
  if (proposal.status === 'declined') {
    return (
      <div style={styles.declinedBanner}>
        This proposal was not accepted.
      </div>
    )
  }
  return null
}

export function PublicProposalPage() {
  const { token } = useParams<{ token: string }>()
  const { isMobile } = useBreakpoint()
  const [loading, setLoading]   = useState(true)
  const [payload, setPayload]   = useState<TokenPayload | null>(null)
  const [expired, setExpired]   = useState(false)

  useEffect(() => {
    if (!token) {
      setExpired(true)
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase.rpc('get_proposal_by_token', { token })
      if (cancelled) return
      if (error || !data) {
        setExpired(true)
      } else {
        setPayload(data as TokenPayload)
      }
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [token])

  useEffect(() => {
    if (!payload) return
    document.title = `${payload.proposal.title} — Eswar Creatives`
    return () => { document.title = 'Eswar Creatives' }
  }, [payload])

  const proposal = payload?.proposal ?? null
  const phases   = payload?.phases ?? []
  const schedule = payload?.payment_schedule ?? []

  const totalAmount   = proposal ? Number(proposal.total_amount) : 0
  const isReadOnly    = proposal?.status === 'accepted' || proposal?.status === 'declined'
  const clientLabel   = proposal?.client_name || proposal?.company_name || 'Client'

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.topBar}>
        <div style={styles.topInner}>
          <img src={eswarLogo} alt="EswarCreatives" width={28} height={28} style={{ display: 'block' }} />
          <span style={styles.topName}>EswarCreatives</span>
          <span style={styles.topSub}>Branding Solution</span>
        </div>
      </header>

      <main style={{ ...styles.main, padding: isMobile ? '24px 16px' : '40px 24px' }}>
        {loading && (
          <p style={styles.muted}>Loading...</p>
        )}

        {!loading && (expired || !payload) && (
          <div style={styles.expiredCard}>
            <div style={styles.expiredTitle}>This proposal link has expired</div>
            <p style={styles.expiredBody}>
              Please contact us at{' '}
              <a href="mailto:hello@eswarcreatives.in" style={styles.link}>
                hello@eswarcreatives.in
              </a>{' '}
              for an updated link.
            </p>
          </div>
        )}

        {!loading && payload && proposal && (
          <>
            {/* Status banner for already-actioned proposals */}
            <StatusBanner proposal={proposal} />

            {/* Proposal title + client */}
            <div style={styles.titleCard}>
              <h1 style={{ ...styles.proposalTitle, fontSize: isMobile ? 22 : 28 }}>
                {proposal.title}
              </h1>
              <p style={styles.clientLabel}>{clientLabel}</p>
            </div>

            {/* Summary strip */}
            <div style={{
              ...styles.summaryStrip,
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? 16 : 0,
            }}>
              <SummaryItem
                label="Total value"
                value={totalAmount > 0 ? fmtMoney(totalAmount, proposal.currency) : 'Value TBD'}
              />
              <SummaryDivider isMobile={isMobile} />
              <SummaryItem
                label="Phases"
                value={phases.length > 0 ? String(phases.length) : 'TBD'}
              />
              <SummaryDivider isMobile={isMobile} />
              <SummaryItem
                label="Timeline"
                value={phases.some((ph) => ph.timeline) ? 'See breakdown below' : 'To be confirmed'}
              />
            </div>

            {/* Phase breakdown */}
            <section style={styles.section}>
              <h2 style={styles.sectionTitle}>Phase breakdown</h2>
              {phases.length === 0 ? (
                <p style={styles.emptyState}>Proposal details coming soon.</p>
              ) : isMobile ? (
                // Horizontal snap-scroll carousel on mobile
                <div style={styles.phaseCarousel}>
                  {phases.map((ph) => (
                    <PhaseCard key={ph.id} phase={ph} isMobile />
                  ))}
                </div>
              ) : (
                <div style={styles.phaseGrid}>
                  {phases.map((ph) => (
                    <PhaseCard key={ph.id} phase={ph} isMobile={false} />
                  ))}
                </div>
              )}
            </section>

            {/* Payment schedule */}
            {schedule.length > 0 && (
              <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Payment schedule</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {schedule.map((row) => (
                    <PaymentRow
                      key={row.id}
                      row={row}
                      totalAmount={totalAmount}
                      currency={proposal.currency}
                      isMobile={isMobile}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* CTA section — only for pending proposals */}
            {!isReadOnly && (
              <div style={styles.ctaCard}>
                <a
                  href={`/portal/login?redirect=/portal/proposals`}
                  style={{ ...styles.acceptBtn, minHeight: isMobile ? 52 : 44, width: '100%' }}
                >
                  Accept proposal
                </a>
                <p style={styles.ctaContact}>
                  Have questions?{' '}
                  <a href="mailto:hello@eswarcreatives.in" style={styles.link}>
                    Reply to this email
                  </a>{' '}
                  or{' '}
                  <a
                    href="https://wa.me/message/eswarcreatives"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.link}
                  >
                    WhatsApp us
                  </a>
                </p>
              </div>
            )}
          </>
        )}
      </main>

      <footer style={styles.footer}>
        eswarcreatives.in &middot; hello@eswarcreatives.in
      </footer>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.summaryItem}>
      <span style={styles.summaryLabel}>{label}</span>
      <span style={styles.summaryValue}>{value}</span>
    </div>
  )
}

function SummaryDivider({ isMobile }: { isMobile: boolean }) {
  if (isMobile) return null
  return <div style={styles.summaryDivider} />
}

function PhaseCard({ phase, isMobile }: { phase: Phase; isMobile: boolean }) {
  return (
    <div style={{ ...styles.phaseCard, minWidth: isMobile ? 260 : undefined }}>
      <div style={styles.phaseNumber}>Phase {phase.phase_number}</div>
      <h3 style={styles.phaseTitle}>{phase.solution_title || phase.title}</h3>
      {phase.key_note && (
        <p style={styles.phaseNote}>{phase.key_note}</p>
      )}
      {phase.timeline && (
        <div style={styles.phaseTimeline}>{phase.timeline}</div>
      )}
    </div>
  )
}

function PaymentRow({
  row,
  totalAmount,
  currency,
  isMobile,
}: {
  row: PaymentScheduleRow
  totalAmount: number
  currency: string
  isMobile: boolean
}) {
  const pct    = Number(row.pct_of_total) || 0
  const amount = totalAmount > 0 ? (totalAmount * pct) / 100 : null

  return (
    <div style={{
      ...styles.paymentRow,
      flexDirection: isMobile ? 'column' : 'row',
      gap: isMobile ? 4 : 16,
    }}>
      <span style={styles.paymentLabel}>{row.label || `Instalment ${row.instalment_number}`}</span>
      <div style={styles.paymentRight}>
        <span style={styles.paymentPct}>{pct}%</span>
        {amount !== null && totalAmount > 0 && (
          <span style={styles.paymentAmount}>{fmtMoney(amount, currency)}</span>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: tokens.bg,
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    background: tokens.surface,
    borderBottom: `1px solid ${t.border.overlayStrong}`,
    height: 56,
    flexShrink: 0,
  },
  topInner: {
    maxWidth: 720,
    margin: '0 auto',
    height: '100%',
    padding: '0 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  topName: {
    fontFamily: fonts.heading,
    fontStyle: 'italic',
    fontSize: 16,
    fontWeight: 700,
    color: t.text.primary,
  },
  topSub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.tertiary,
    marginLeft: 4,
  },
  main: {
    flex: 1,
    maxWidth: 720,
    width: '100%',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    boxSizing: 'border-box',
  },
  muted: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.muted,
    margin: 0,
  },
  expiredCard: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    padding: 40,
    textAlign: 'center',
  },
  expiredTitle: {
    fontFamily: fonts.heading,
    fontSize: 22,
    fontWeight: 700,
    color: t.text.primary,
    marginBottom: 12,
  },
  expiredBody: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: t.text.secondary,
    margin: 0,
    lineHeight: 1.65,
  },
  link: {
    color: t.text.primaryBrand,
    textDecoration: 'none',
    fontWeight: 500,
  },
  acceptedBanner: {
    background: tokens.tealLight,
    color: tokens.primary,
    border: `1px solid ${tokens.accent}`,
    borderRadius: 10,
    padding: '12px 18px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.5,
  },
  declinedBanner: {
    background: tokens.bg,
    color: t.text.secondary,
    border: `1px solid ${t.border.default}`,
    borderRadius: 10,
    padding: '12px 18px',
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 1.5,
  },
  titleCard: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    padding: '28px 28px 24px',
  },
  proposalTitle: {
    fontFamily: fonts.heading,
    fontWeight: 700,
    color: t.text.primary,
    margin: '0 0 8px',
    lineHeight: 1.2,
  },
  clientLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.tertiary,
    margin: 0,
  },
  summaryStrip: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    padding: '20px 28px',
    display: 'flex',
    alignItems: 'flex-start',
  },
  summaryItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  summaryLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    color: t.text.tertiary,
  },
  summaryValue: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: t.text.primary,
  },
  summaryDivider: {
    width: 1,
    alignSelf: 'stretch',
    background: t.border.subtle,
    margin: '0 24px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionTitle: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 700,
    color: t.text.primary,
    margin: 0,
  },
  emptyState: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.muted,
    margin: 0,
    padding: '20px 0',
  },
  phaseCarousel: {
    display: 'flex',
    gap: 12,
    overflowX: 'auto' as const,
    paddingBottom: 8,
    scrollSnapType: 'x mandatory' as const,
    WebkitOverflowScrolling: 'touch' as const,
  },
  phaseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: 12,
  },
  phaseCard: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderLeft: `3px solid ${t.border.brand}`,
    borderRadius: 10,
    padding: '18px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    scrollSnapAlign: 'start' as const,
    flexShrink: 0,
  },
  phaseNumber: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    color: t.text.tertiary,
  },
  phaseTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
    color: t.text.primary,
    margin: 0,
    lineHeight: 1.3,
  },
  phaseNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
    margin: 0,
    lineHeight: 1.55,
  },
  phaseTimeline: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
    marginTop: 4,
  },
  paymentRow: {
    background: tokens.surface,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentLabel: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    fontWeight: 500,
  },
  paymentRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  paymentPct: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.tertiary,
  },
  paymentAmount: {
    fontFamily: "'SF Mono', 'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 15,
    fontWeight: 600,
    color: t.text.primary,
  },
  ctaCard: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    padding: '28px 28px 24px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 16,
  },
  acceptBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: 700,
    borderRadius: 10,
    textDecoration: 'none',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  ctaContact: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.secondary,
    margin: 0,
    textAlign: 'center',
    lineHeight: 1.6,
  },
  footer: {
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
    padding: '20px 24px',
    borderTop: `1px solid ${t.border.subtle}`,
  },
}
