import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { supabase } from '../lib/supabase'
import { PortalGuard, type PortalProfile } from './PortalGuard'
import { tokens, fonts, statusPalette, phasePalette } from './theme'

// ── Per-proposal attachments ────────────────────────────────────────
// Hardcoded per slug for Phase 3 (one-client portal). When more
// proposals start needing attachments, this becomes an `attachments`
// array on the proposals.content jsonb.

type AttachmentChip = { label: string; phase: 1 | 2 | 3 }

type AttachmentDoc = {
  kind: 'pdf' | 'html'
  title: string              // friendly section heading
  filename: string           // shown on the card body
  url: string                // served from /public/proposals/...
  meta: string               // dot-separated metadata line
  chips?: AttachmentChip[]   // phase tags (PDF only on Newgen)
  openLabel: string          // primary button label
}

const ATTACHMENTS_BY_SLUG: Record<string, { docs: AttachmentDoc[] }> = {
  'newgen-branding-2026': {
    docs: [
      {
        kind: 'pdf',
        title: 'Strategic Execution Plan',
        filename: 'Newgen_Strategic_Execution_Plan.pdf',
        url: '/proposals/newgen/Newgen_Strategic_Execution_Plan.pdf',
        meta: '18 pages · 3 phases · 8 solutions · 6 months · Prepared by Eswar Creatives',
        chips: [
          { label: 'Foundation', phase: 1 },
          { label: 'Visibility', phase: 2 },
          { label: 'Scale',      phase: 3 },
        ],
        openLabel: 'Open PDF',
      },
      {
        kind: 'html',
        title: 'Discovery Brief',
        filename: 'newgen_brand_discovery_prefilled.html',
        url: '/proposals/newgen/newgen_brand_discovery_prefilled.html',
        meta: '7 sections · Pre-filled from transcript — business, audience, brand soul, competitors, visual direction, practical details, final thoughts',
        openLabel: 'Open brief',
      },
    ],
  },
}

// ── Content shape (mirrors the jsonb stored in proposals.content) ───
type Solution = {
  num: string
  title: string
  price_min_cents: number
  price_max_cents: number
  summary: string
}

type Phase = {
  key: string
  phase_num: number
  name: string
  duration: string
  solutions: Solution[]
}

type ProposalContent = {
  situation_today: string[]
  phases: Phase[]
  how_we_work: {
    discovery_session: string
    advance: string
    first_concepts: string
    revisions: string
    concept_presentation_note: string
  }
  discovery_status: string
  total_note: string
}

type Proposal = {
  id: string
  slug: string
  title: string
  content: ProposalContent
  total_min_cents: number | null
  total_max_cents: number | null
  currency: string
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined'
  valid_until: string | null
  sent_at: string | null
  responded_at: string | null
}

export function ProposalViewPage() {
  return (
    <PortalGuard>
      {(profile) => <ProposalView profile={profile} />}
    </PortalGuard>
  )
}

function ProposalView({ profile: _profile }: { profile: PortalProfile }) {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [responding, setResponding] = useState<null | 'accepted' | 'declined'>(null)
  const [confirm, setConfirm]   = useState<null | 'accepted' | 'declined'>(null)
  const viewedFired = useRef(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error: e } = await supabase
          .from('proposals')
          .select('id, slug, title, content, total_min_cents, total_max_cents, currency, status, valid_until, sent_at, responded_at')
          .eq('slug', slug)
          .maybeSingle()
        if (e) throw e
        if (cancelled) return
        if (!data) { setError('Proposal not found.'); return }
        setProposal(data as Proposal)

        // Fire the sent → viewed transition once per mount, only when
        // appropriate. The RPC no-ops if status isn't 'sent'.
        if (!viewedFired.current && data.status === 'sent') {
          viewedFired.current = true
          await supabase.rpc('mark_proposal_viewed', { p_proposal_id: data.id })
          if (!cancelled) {
            setProposal((p) => p ? { ...p, status: 'viewed' } : p)
          }
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [slug])

  async function respond(response: 'accepted' | 'declined') {
    if (!proposal) return
    setResponding(response)
    setError(null)
    try {
      const { data, error: e } = await supabase.rpc('respond_to_proposal', {
        p_proposal_id: proposal.id,
        p_response: response,
      })
      if (e) throw e
      if (data) setProposal(data as Proposal)
      setConfirm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setResponding(null)
    }
  }

  if (loading) return <FullPageMsg text="Loading…" />
  if (error && !proposal) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.error}>{error}</div>
          <Link to="/portal" style={styles.backLink}>← Back to portal</Link>
        </div>
      </div>
    )
  }
  if (!proposal) return null

  const canRespond = proposal.status === 'sent' || proposal.status === 'viewed'
  const attachments = ATTACHMENTS_BY_SLUG[proposal.slug]

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <button
          onClick={() => navigate('/portal')}
          style={styles.backLink}
          type="button"
        >
          ← Back to portal
        </button>

        <header style={styles.header}>
          <h1 style={styles.title}>{proposal.title}</h1>
          <div style={styles.headerMeta}>
            <StatusPill status={proposal.status} />
            {proposal.valid_until && (
              <span style={styles.metaText}>Valid until {formatDate(proposal.valid_until)}</span>
            )}
          </div>
          <p style={styles.totalLine}>
            <span style={styles.totalAmount}>{formatPriceRange(proposal)}</span>
            <span style={styles.totalNote}> · {proposal.content.total_note}</span>
          </p>
        </header>

        {/* Documents — PDF deck + discovery brief */}
        {attachments && (
          <div style={styles.docsBlock}>
            {attachments.docs.map((doc, i) => {
              const next = attachments.docs[i + 1]
              return (
                <div key={doc.url}>
                  <DocBlock doc={doc} index={i} total={attachments.docs.length} />
                  {next && <NextDocCta next={next} />}
                </div>
              )
            })}
          </div>
        )}

        {/* 1. Situation Today */}
        <Section number="1" heading="Situation Today">
          <ul style={styles.bullets}>
            {proposal.content.situation_today.map((b, i) => (
              <li key={i} style={styles.bullet}>{b}</li>
            ))}
          </ul>
        </Section>

        {/* 2. Execution Roadmap */}
        <Section number="2" heading="Execution Roadmap — 3 phases, 8 solutions, 6 months">
          <div style={styles.phaseList}>
            {proposal.content.phases.map((phase) => (
              <PhaseBlock key={phase.key} phase={phase} currency={proposal.currency} />
            ))}
          </div>
        </Section>

        {/* 3. How We Work */}
        <Section number="3" heading="How We Work">
          <div style={styles.howCard}>
            <dl style={styles.dl}>
              <DRow k="Discovery session" v={proposal.content.how_we_work.discovery_session} />
              <DRow k="Advance"           v={proposal.content.how_we_work.advance} />
              <DRow k="First concepts"    v={proposal.content.how_we_work.first_concepts} />
              <DRow k="Revisions"         v={proposal.content.how_we_work.revisions} last />
            </dl>
            <p style={styles.note}>{proposal.content.how_we_work.concept_presentation_note}</p>
          </div>
        </Section>

        {/* 4. Discovery brief status */}
        <Section number="4" heading="Discovery Brief">
          <p style={styles.body}>{proposal.content.discovery_status}</p>
        </Section>

        {/* Response */}
        <div style={styles.responseBlock}>
          {proposal.status === 'accepted' && (
            <div style={styles.respondedAccepted}>
              You accepted this proposal{proposal.responded_at ? ` on ${formatDate(proposal.responded_at)}` : ''}.
              We’ll be in touch to confirm the advance and kickoff.
            </div>
          )}
          {proposal.status === 'declined' && (
            <div style={styles.respondedDeclined}>
              You declined this proposal{proposal.responded_at ? ` on ${formatDate(proposal.responded_at)}` : ''}.
              If anything changes — or you’d like to discuss a different scope — just reply to our email.
            </div>
          )}
          {canRespond && (
            <>
              <p style={styles.respondPrompt}>Ready to decide?</p>
              {error && <div style={styles.error}>{error}</div>}
              <div style={styles.respondRow}>
                <button
                  type="button"
                  style={{ ...styles.btnAccept, opacity: responding ? 0.6 : 1 }}
                  disabled={!!responding}
                  onClick={() => setConfirm('accepted')}
                >
                  {responding === 'accepted' ? 'Recording…' : 'Accept proposal'}
                </button>
                <button
                  type="button"
                  style={{ ...styles.btnDecline, opacity: responding ? 0.6 : 1 }}
                  disabled={!!responding}
                  onClick={() => setConfirm('declined')}
                >
                  {responding === 'declined' ? 'Recording…' : 'Decline'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirmation modal */}
      {confirm && (
        <ConfirmModal
          response={confirm}
          busy={!!responding}
          onCancel={() => setConfirm(null)}
          onConfirm={() => respond(confirm)}
        />
      )}
    </div>
  )
}

// ── Bits ───────────────────────────────────────────────────────────

function DocBlock({
  doc, index, total,
}: { doc: AttachmentDoc; index: number; total: number }) {
  return (
    <section style={styles.docSection}>
      <div style={styles.docHead}>
        <h2 style={styles.docTitle}>{doc.title}</h2>
        <span style={styles.docPill}>Document {index + 1} of {total}</span>
      </div>

      <div style={styles.docCard}>
        <div style={styles.docIconWrap}>
          {doc.kind === 'pdf' ? <PdfIcon /> : <HtmlIcon />}
        </div>

        <div style={styles.docBody}>
          <p style={styles.docFilename}>{doc.filename}</p>
          <p style={styles.docMeta}>{doc.meta}</p>
          {doc.chips && doc.chips.length > 0 && (
            <div style={styles.chipRow}>
              {doc.chips.map((c) => {
                const palette = phasePalette[c.phase] ?? phasePalette[1]
                return (
                  <span key={c.label} style={{
                    ...styles.chip,
                    background: palette.bg,
                    color: palette.fg,
                  }}>{c.label}</span>
                )
              })}
            </div>
          )}
        </div>

        <a
          href={doc.url}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.docOpenBtn}
        >
          <DownloadIcon />
          <span>{doc.openLabel}</span>
        </a>
      </div>
    </section>
  )
}

function NextDocCta({ next }: { next: AttachmentDoc }) {
  return (
    <a
      href={next.url}
      target="_blank"
      rel="noopener noreferrer"
      style={styles.nextCta}
    >
      <span style={styles.nextCtaLabel}>Next — Review {next.title}</span>
      <span style={styles.nextCtaArrow}>→</span>
    </a>
  )
}

function PdfIcon() {
  return (
    <svg width="56" height="64" viewBox="0 0 56 64" fill="none" aria-hidden="true">
      <path d="M8 0H36L52 16V58C52 61.3 49.3 64 46 64H8C4.7 64 2 61.3 2 58V6C2 2.7 4.7 0 8 0Z"
            fill={tokens.tealLight} stroke={tokens.border} strokeWidth="1.2" />
      <path d="M36 0V12C36 14.2 37.8 16 40 16H52" stroke={tokens.accent} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <rect x="11" y="38" width="34" height="10" rx="2" fill={tokens.primary} />
      <text x="28" y="46" textAnchor="middle" fontFamily={fonts.body} fontSize="8.5"
            fontWeight="700" fill="#FFFFFF" letterSpacing="1">PDF</text>
      <line x1="12" y1="54" x2="32" y2="54" stroke={tokens.accent} strokeWidth="1.2" opacity="0.4" />
      <line x1="12" y1="58" x2="26" y2="58" stroke={tokens.accent} strokeWidth="1.2" opacity="0.4" />
    </svg>
  )
}

function HtmlIcon() {
  return (
    <svg width="56" height="64" viewBox="0 0 56 64" fill="none" aria-hidden="true">
      <path d="M8 0H36L52 16V58C52 61.3 49.3 64 46 64H8C4.7 64 2 61.3 2 58V6C2 2.7 4.7 0 8 0Z"
            fill={tokens.goldLight} stroke={tokens.border} strokeWidth="1.2" />
      <path d="M36 0V12C36 14.2 37.8 16 40 16H52" stroke={tokens.gold} strokeWidth="1.4" fill="none" strokeLinejoin="round" />
      <rect x="9" y="38" width="38" height="10" rx="2" fill={tokens.goldDark} />
      <text x="28" y="46" textAnchor="middle" fontFamily={fonts.body} fontSize="8.5"
            fontWeight="700" fill="#FFFFFF" letterSpacing="0.6">BRIEF</text>
      <line x1="12" y1="54" x2="32" y2="54" stroke={tokens.gold} strokeWidth="1.2" opacity="0.5" />
      <line x1="12" y1="58" x2="26" y2="58" stroke={tokens.gold} strokeWidth="1.2" opacity="0.5" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2v8M4 7l4 4 4-4M3 13h10" stroke="currentColor" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Section({
  number, heading, children,
}: { number: string; heading: string; children: React.ReactNode }) {
  return (
    <section style={styles.section}>
      <div style={styles.sectionHead}>
        <span style={styles.sectionNum}>{number}</span>
        <h2 style={styles.sectionTitle}>{heading}</h2>
      </div>
      {children}
    </section>
  )
}

function PhaseBlock({ phase, currency }: { phase: Phase; currency: string }) {
  const p = phasePalette[phase.phase_num] ?? phasePalette[1]
  return (
    <div style={styles.phaseCard}>
      <div style={styles.phaseHead}>
        <span style={{
          ...styles.phaseTag,
          background: p.bg,
          color: p.fg,
        }}>
          Phase {phase.phase_num}
        </span>
        <h3 style={styles.phaseName}>{phase.name}</h3>
        <span style={styles.phaseDuration}>{phase.duration}</span>
      </div>
      <div style={styles.solutionList}>
        {phase.solutions.map((s) => (
          <div key={s.num} style={{
            ...styles.solution,
            borderLeft: `3px solid ${p.border}`,
          }}>
            <div style={styles.solutionHead}>
              <span style={styles.solutionNum}>{s.num}</span>
              <h4 style={styles.solutionTitle}>{s.title}</h4>
              <span style={styles.solutionPrice}>
                {formatRange(s.price_min_cents, s.price_max_cents, currency)}
              </span>
            </div>
            <p style={styles.solutionSummary}>{s.summary}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DRow({ k, v, last }: { k: string; v: string; last?: boolean }) {
  return (
    <div style={{ ...styles.dRow, borderBottom: last ? 'none' : `1px solid ${tokens.border}` }}>
      <dt style={styles.dKey}>{k}</dt>
      <dd style={styles.dVal}>{v}</dd>
    </div>
  )
}

function StatusPill({ status }: { status: Proposal['status'] }) {
  const p = statusPalette[status]
  return (
    <span style={{
      background: p.bg, color: p.fg,
      padding: '4px 12px', borderRadius: 999,
      fontSize: 11, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase',
      fontFamily: fonts.body, whiteSpace: 'nowrap',
    }}>{p.label}</span>
  )
}

function ConfirmModal({
  response, busy, onCancel, onConfirm,
}: {
  response: 'accepted' | 'declined'
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const isAccept = response === 'accepted'
  return (
    <div onClick={onCancel} style={styles.modalScrim}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={styles.modal}>
        <h3 style={styles.modalTitle}>
          {isAccept ? 'Accept this proposal?' : 'Decline this proposal?'}
        </h3>
        <p style={styles.modalBody}>
          {isAccept
            ? 'We’ll receive your acceptance and send the advance invoice within one working day.'
            : 'We’ll be notified and follow up to understand what didn’t fit.'}
        </p>
        <div style={styles.modalRow}>
          <button type="button" onClick={onCancel} disabled={busy} style={styles.btnGhost}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            style={{ ...(isAccept ? styles.btnAccept : styles.btnDecline), opacity: busy ? 0.6 : 1 }}
          >
            {busy ? 'Recording…' : (isAccept ? 'Yes, accept' : 'Yes, decline')}
          </button>
        </div>
      </div>
    </div>
  )
}

function FullPageMsg({ text }: { text: string }) {
  return (
    <div style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={styles.muted}>{text}</div>
    </div>
  )
}

// ── Formatters ─────────────────────────────────────────────────────

function formatPriceRange(p: Proposal): string {
  if (p.total_min_cents == null || p.total_max_cents == null) return ''
  return formatRange(p.total_min_cents, p.total_max_cents, p.currency)
}

function formatRange(minCents: number, maxCents: number, currency: string): string {
  const sym = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : `${currency} `
  const fmt = (cents: number) => {
    const major = cents / 100
    if (currency === 'INR') {
      if (major >= 100000) {
        const lakhs = major / 100000
        return `${lakhs % 1 === 0 ? lakhs.toFixed(0) : lakhs.toFixed(2)}L`
      }
      return major.toLocaleString('en-IN')
    }
    return major.toLocaleString('en-US')
  }
  return `${sym}${fmt(minCents)} – ${sym}${fmt(maxCents)}`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch { return iso }
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: tokens.bg,
    color: tokens.text,
    fontFamily: fonts.body,
    padding: '32px 16px 80px',
  },
  container: { maxWidth: 820, margin: '0 auto' },

  backLink: {
    display: 'inline-block',
    background: 'transparent',
    border: 'none',
    color: tokens.accent,
    fontSize: 13,
    fontFamily: fonts.body,
    fontWeight: 500,
    padding: 0,
    marginBottom: 24,
    cursor: 'pointer',
    textDecoration: 'none',
  },

  // ── Documents block (PDF + discovery brief)
  docsBlock: {
    marginBottom: 40,
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  docSection: { marginBottom: 0 },
  docHead: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 14,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  docTitle: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 26,
    fontWeight: 600,
    color: tokens.text,
    letterSpacing: '-0.01em',
    lineHeight: 1.2,
  },
  docPill: {
    background: tokens.goldLight,
    color: tokens.goldDark,
    padding: '5px 14px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: fonts.body,
    border: `1px solid ${tokens.gold}55`,
    whiteSpace: 'nowrap',
  },
  docCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 14,
    padding: '20px 22px',
    boxShadow: '0 1px 3px rgba(2, 76, 79, 0.04)',
    flexWrap: 'wrap',
  },
  docIconWrap: { flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  docBody: { flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 8 },
  docFilename: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 19,
    fontWeight: 600,
    color: tokens.text,
    letterSpacing: '-0.005em',
    wordBreak: 'break-word',
  },
  docMeta: {
    margin: 0,
    fontSize: 13.5,
    color: tokens.textMuted,
    lineHeight: '20px',
  },
  chipRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  chip: {
    padding: '4px 12px',
    borderRadius: 999,
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: fonts.body,
  },
  docOpenBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: tokens.primary,
    color: tokens.surface,
    border: 'none',
    borderRadius: 10,
    padding: '13px 22px',
    fontSize: 14,
    fontFamily: fonts.body,
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    letterSpacing: '0.01em',
    flexShrink: 0,
    transition: 'background 0.15s ease',
  },
  nextCta: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    background: tokens.tealLight,
    color: tokens.primary,
    border: `1px solid ${tokens.accent}55`,
    borderRadius: 12,
    padding: '14px 20px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    transition: 'background 0.15s ease, border-color 0.15s ease',
  },
  nextCtaLabel: { letterSpacing: '0.005em' },
  nextCtaArrow: { fontSize: 18, fontWeight: 400 },

  header:     { marginBottom: 32 },
  title: {
    margin: '0 0 14px',
    fontFamily: fonts.heading,
    fontSize: 32,
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: '-0.015em',
    color: tokens.text,
  },
  headerMeta: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  metaText:   { fontSize: 13, color: tokens.textMuted },
  totalLine:  { margin: 0, fontSize: 16, color: tokens.textMuted, lineHeight: '24px' },
  totalAmount:{ color: tokens.accent, fontWeight: 700, fontSize: 18, marginRight: 4 },
  totalNote:  { color: tokens.textMuted, fontSize: 13 },

  // ── Section
  section:      { marginBottom: 40 },
  sectionHead:  { display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 18 },
  sectionNum: {
    fontSize: 13,
    color: tokens.gold,
    fontFamily: fonts.heading,
    fontWeight: 700,
    minWidth: 18,
  },
  sectionTitle: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 20,
    fontWeight: 600,
    color: tokens.text,
    letterSpacing: '-0.005em',
  },

  bullets:     { margin: 0, paddingLeft: 32, color: tokens.text },
  bullet:      { fontSize: 14.5, lineHeight: '26px', marginBottom: 4 },

  // ── Phases
  phaseList:    { display: 'flex', flexDirection: 'column', gap: 18 },
  phaseCard: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 22,
    boxShadow: '0 1px 3px rgba(2, 76, 79, 0.04)',
  },
  phaseHead:    { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  phaseTag: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.2,
    padding: '4px 10px',
    borderRadius: 4,
    textTransform: 'uppercase',
    fontFamily: fonts.body,
  },
  phaseName: {
    margin: 0,
    fontFamily: fonts.heading,
    fontSize: 17,
    fontWeight: 600,
    color: tokens.text,
  },
  phaseDuration: { marginLeft: 'auto', fontSize: 12, color: tokens.textMuted },

  solutionList: { display: 'flex', flexDirection: 'column', gap: 10 },
  solution: {
    padding: '12px 14px',
    background: tokens.surface,
    borderRadius: 0,
    // borderLeft is applied inline per-phase
  },
  solutionHead: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4, flexWrap: 'wrap' },
  solutionNum: {
    fontSize: 11,
    color: tokens.textMuted,
    fontFamily: fonts.body,
    fontWeight: 700,
  },
  solutionTitle: {
    margin: 0,
    fontSize: 14.5,
    fontFamily: fonts.body,
    fontWeight: 600,
    color: tokens.text,
  },
  solutionPrice: {
    marginLeft: 'auto',
    fontSize: 13,
    color: tokens.accent,
    fontWeight: 600,
    fontFamily: fonts.body,
  },
  solutionSummary: { margin: 0, fontSize: 13.5, lineHeight: '21px', color: tokens.textMuted },

  // ── How We Work
  howCard: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: '8px 22px 22px',
    boxShadow: '0 1px 3px rgba(2, 76, 79, 0.04)',
  },
  dl:           { margin: 0 },
  dRow:         { display: 'flex', gap: 14, padding: '12px 0', fontSize: 14 },
  dKey: {
    margin: 0,
    color: tokens.textMuted,
    minWidth: 160,
    fontWeight: 500,
  },
  dVal:         { margin: 0, color: tokens.text, flex: 1 },
  note: {
    marginTop: 16,
    marginBottom: 0,
    padding: '12px 14px',
    background: tokens.goldLight,
    border: `1px solid ${tokens.gold}55`,
    borderRadius: 8,
    fontSize: 13,
    lineHeight: '20px',
    color: tokens.goldDark,
  },
  body: { margin: 0, fontSize: 14, lineHeight: '22px', color: tokens.text },

  // ── Response block
  responseBlock: {
    marginTop: 32,
    padding: 28,
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(2, 76, 79, 0.04)',
  },
  respondPrompt: {
    margin: '0 0 14px',
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: tokens.text,
  },
  respondRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  btnAccept: {
    background: tokens.primary,
    color: tokens.surface,
    border: 'none',
    borderRadius: 8,
    padding: '13px 24px',
    fontSize: 14,
    fontFamily: fonts.body,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.01em',
  },
  btnDecline: {
    background: 'transparent',
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '13px 24px',
    fontSize: 14,
    fontFamily: fonts.body,
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnGhost: {
    background: 'transparent',
    color: tokens.textMuted,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '13px 22px',
    fontSize: 14,
    fontFamily: fonts.body,
    fontWeight: 500,
    cursor: 'pointer',
  },

  respondedAccepted: {
    background: tokens.greenLight,
    border: `1px solid ${tokens.green}33`,
    color: tokens.green,
    padding: '14px 16px',
    borderRadius: 8,
    fontSize: 14,
    lineHeight: '22px',
  },
  respondedDeclined: {
    background: tokens.rubyLight,
    border: `1px solid ${tokens.ruby}33`,
    color: tokens.ruby,
    padding: '14px 16px',
    borderRadius: 8,
    fontSize: 14,
    lineHeight: '22px',
  },

  // ── Modal
  modalScrim: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(2, 76, 79, 0.20)',
    backdropFilter: 'blur(2px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: 24,
  },
  modal: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 16,
    padding: 32,
    maxWidth: 440,
    width: '100%',
    boxShadow: '0 24px 60px rgba(2, 76, 79, 0.18)',
  },
  modalTitle: {
    margin: '0 0 10px',
    fontFamily: fonts.heading,
    fontSize: 22,
    fontWeight: 600,
    color: tokens.text,
    letterSpacing: '-0.005em',
  },
  modalBody: { margin: '0 0 24px', fontSize: 14, lineHeight: '22px', color: tokens.textMuted },
  modalRow:  { display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' },

  muted: { color: tokens.textMuted, fontSize: 14 },
  error: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 12,
    border: `1px solid ${tokens.ruby}33`,
  },
}
