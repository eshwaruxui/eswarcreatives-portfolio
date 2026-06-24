// Right-side slide-in panel showing a single proposal in full, opened when a
// client clicks a proposal card. Reuses the shared admin SidePanel (z-201,
// motionTokens slide) so every portal drawer animates and stacks identically
// (H4: consistency). Theme tokens only; no raw hex; no em dashes; plain-language
// errors only (H9). Clients have SELECT-only RLS on proposals and the child
// tables, so state changes go through SECURITY DEFINER RPCs / the edge function.
import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { SidePanel } from '../admin/SidePanel'
import { formatMoney, formatDate } from '../admin/ui'
import { tokens, fonts } from '../theme'

type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired'

type FullProposal = {
  id: string
  title: string
  status: ProposalStatus
  valid_until: string | null
  company_name: string | null
  vertical: string | null
  currency: string
  total_amount: number
  discount_pct: number | null
  discount_label: string | null
  payment_terms: string | null
  revision_rounds: number | null
}

type LineItem = { id: string; title: string; scope: string | null; amount: number }
type Solution = { title: string; overview: string; keyNote: string; items: LineItem[] }
type ScheduleRow = {
  id: string
  label: string
  pct_of_total: number | null
  triggered_by: string | null
}
type Phase = {
  id: string
  name: string
  timeline: string | null
  solutions: Solution[]
  schedule: ScheduleRow[]
}
type DocRow = { id: string; file_name: string; storage_path: string | null }

const BUCKET = 'proposal-documents'

// H2 (match the real world): friendly status wording, not enum values. Colours
// from theme tokens only, mirroring the proposals list badges (H4).
const BADGE: Record<ProposalStatus, { bg: string; fg: string; label: string }> = {
  draft: { bg: tokens.bg, fg: tokens.textMuted, label: 'Draft' },
  sent: { bg: tokens.tealLight, fg: tokens.primary, label: 'Sent' },
  viewed: { bg: tokens.goldLight, fg: tokens.goldDark, label: 'Viewed' },
  accepted: { bg: tokens.greenLight, fg: tokens.green, label: 'Accepted' },
  declined: { bg: tokens.rubyLight, fg: tokens.ruby, label: 'Declined' },
  expired: { bg: tokens.bg, fg: tokens.textMuted, label: 'Expired' },
}

const VERTICAL_LABEL: Record<string, string> = {
  brand: 'Brand identity',
  saas: 'SaaS design',
}

const ACCEPT_ERROR =
  'We could not accept this proposal. Please try again or contact eswar@eswarcreatives.in'
const DECLINE_ERROR =
  'We could not record your decision. Please try again or contact eswar@eswarcreatives.in'
const LOAD_ERROR =
  'We could not load this proposal. Please refresh or contact eswar@eswarcreatives.in'

// Group a phase's ordered line items into solution groups by their shared
// solution_title/overview, matching the admin proposal view. Consecutive items
// with the same pair form one solution.
function buildSolutions(
  items: {
    id: string
    title: string
    scope: string | null
    amount: number | null
    solution_title: string | null
    solution_overview: string | null
    solution_key_note: string | null
  }[]
): Solution[] {
  const solutions: Solution[] = []
  let current: Solution | null = null
  let currentKey: string | null = null
  for (const it of items) {
    const key = `${it.solution_title ?? ''}|${it.solution_overview ?? ''}`
    if (!current || key !== currentKey) {
      current = {
        title: it.solution_title ?? '',
        overview: it.solution_overview ?? '',
        keyNote: it.solution_key_note ?? '',
        items: [],
      }
      solutions.push(current)
      currentKey = key
    }
    current.items.push({
      id: it.id,
      title: it.title,
      scope: it.scope,
      amount: Number(it.amount ?? 0),
    })
  }
  return solutions
}

const solutionSubtotal = (s: Solution) => s.items.reduce((t, it) => t + it.amount, 0)
const phaseSubtotal = (p: Phase) => p.solutions.reduce((t, s) => t + solutionSubtotal(s), 0)

export function ClientProposalPanel({
  proposalId,
  onClose,
  onChanged,
}: {
  proposalId: string
  onClose: () => void
  // Called after a status change (viewed / accepted / declined) so the list
  // behind the panel can refresh its badges.
  onChanged?: () => void
}) {
  const [proposal, setProposal] = useState<FullProposal | null>(null)
  const [phases, setPhases] = useState<Phase[]>([])
  const [documents, setDocuments] = useState<DocRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Action state for the Accept / Decline flow.
  const [busy, setBusy] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: prop, error: pErr } = await supabase
          .from('proposals')
          .select(
            'id, title, status, valid_until, company_name, vertical, currency, total_amount, discount_pct, discount_label, payment_terms, revision_rounds'
          )
          .eq('id', proposalId)
          .single()
        if (pErr) throw pErr

        const { data: phaseRows, error: phErr } = await supabase
          .from('proposal_phases')
          .select('id, name, timeline, sort_order')
          .eq('proposal_id', proposalId)
          .order('sort_order', { ascending: true })
        if (phErr) throw phErr

        const phaseIds = (phaseRows ?? []).map((p) => p.id)

        // Line items grouped into solutions, and payment schedule rows grouped
        // by phase. Both are fetched in one query each, then bucketed in memory.
        const [itemsRes, schedRes, docsRes] = await Promise.all([
          phaseIds.length
            ? supabase
                .from('proposal_line_items')
                .select(
                  'id, phase_id, title, scope, amount, item_number, solution_title, solution_overview, solution_key_note'
                )
                .in('phase_id', phaseIds)
                .order('item_number', { ascending: true })
            : Promise.resolve({ data: [], error: null }),
          supabase
            .from('proposal_payment_schedule')
            .select('id, phase_id, label, pct_of_total, triggered_by, instalment_number')
            .eq('proposal_id', proposalId)
            .order('instalment_number', { ascending: true }),
          supabase
            .from('proposal_documents')
            .select('id, file_name, storage_path')
            .eq('proposal_id', proposalId)
            .order('uploaded_at', { ascending: true }),
        ])
        if (itemsRes.error) throw itemsRes.error
        if (schedRes.error) throw schedRes.error
        if (docsRes.error) throw docsRes.error

        const itemsByPhase: Record<string, typeof itemsRes.data> = {}
        for (const it of itemsRes.data ?? []) {
          ;(itemsByPhase[it.phase_id] ??= []).push(it)
        }
        const scheduleByPhase: Record<string, ScheduleRow[]> = {}
        for (const r of schedRes.data ?? []) {
          const pid = (r as { phase_id: string | null }).phase_id
          if (!pid) continue
          ;(scheduleByPhase[pid] ??= []).push({
            id: r.id as string,
            label: r.label as string,
            pct_of_total: (r as { pct_of_total: number | null }).pct_of_total,
            triggered_by: (r as { triggered_by: string | null }).triggered_by,
          })
        }

        const built: Phase[] = (phaseRows ?? []).map((ph) => ({
          id: ph.id,
          name: ph.name,
          timeline: ph.timeline,
          solutions: buildSolutions(itemsByPhase[ph.id] ?? []),
          schedule: scheduleByPhase[ph.id] ?? [],
        }))

        if (cancelled) return
        const typed = prop as FullProposal
        setProposal(typed)
        setPhases(built)
        setDocuments((docsRes.data ?? []) as DocRow[])

        // On open, mark a freshly-sent proposal as viewed (H1: keeps both sides
        // aware of where the proposal stands). The RPC is gated server-side and
        // only acts when status is 'sent', so calling it is always safe.
        if (typed.status === 'sent') {
          const { error: vErr } = await supabase.rpc('mark_proposal_viewed', {
            p_proposal_id: proposalId,
          })
          if (!vErr && !cancelled) {
            setProposal((prev) => (prev ? { ...prev, status: 'viewed' } : prev))
            onChanged?.()
          }
        }
      } catch {
        if (!cancelled) setError(LOAD_ERROR) // H9: plain-language only.
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId])

  async function handleAccept() {
    setBusy(true)
    setActionError(null)
    try {
      const { error: fnErr } = await supabase.functions.invoke('confirm-proposal', {
        body: { proposal_id: proposalId },
      })
      if (fnErr) throw fnErr
      setProposal((prev) => (prev ? { ...prev, status: 'accepted' } : prev))
      onChanged?.()
    } catch {
      setActionError(ACCEPT_ERROR) // H9: never surface raw function errors.
    } finally {
      setBusy(false)
    }
  }

  async function handleDecline() {
    setBusy(true)
    setActionError(null)
    try {
      const { error: rpcErr } = await supabase.rpc('decline_proposal', {
        p_proposal_id: proposalId,
        p_reason: reason,
      })
      if (rpcErr) throw rpcErr
      setDeclining(false)
      setReason('')
      setProposal((prev) => (prev ? { ...prev, status: 'declined' } : prev))
      onChanged?.()
    } catch {
      setActionError(DECLINE_ERROR) // H9.
    } finally {
      setBusy(false)
    }
  }

  async function openDocument(doc: DocRow) {
    if (!doc.storage_path) return
    // Private bucket: mint a short-lived signed URL (client RLS scopes it to
    // their own proposals). We never expose a raw storage error (H9).
    const { data, error: err } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 60)
    if (err || !data) {
      setActionError('We could not open that document. Please try again.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  const currency = proposal?.currency ?? 'INR'
  const subtotal = phases.reduce((t, p) => t + phaseSubtotal(p), 0)
  const discountPct = proposal?.discount_pct ?? 0
  const discountAmount = (subtotal * discountPct) / 100
  const revisionRounds =
    proposal?.revision_rounds == null ? 'Unlimited' : String(proposal.revision_rounds)

  const status = proposal?.status
  const live = status === 'sent' || status === 'viewed'

  return (
    <SidePanel
      title={proposal?.title ?? 'Proposal'}
      subtitle="Proposal details"
      onClose={onClose}
      width={560}
    >
      {loading ? (
        <p style={styles.muted}>Loading...</p>
      ) : error || !proposal ? (
        <p style={styles.errorText}>{error ?? 'Proposal not found.'}</p>
      ) : (
        <>
          {/* 1. Header: status badge + valid until (title is the panel header). */}
          <div style={styles.topMeta}>
            <span style={{ ...styles.badge, background: BADGE[proposal.status].bg, color: BADGE[proposal.status].fg }}>
              {BADGE[proposal.status].label}
            </span>
            {proposal.valid_until && (
              <span style={styles.validUntil}>Valid until {formatDate(proposal.valid_until)}</span>
            )}
          </div>

          {/* 2. Client info */}
          <section style={styles.section}>
            <InfoRow label="Company" value={proposal.company_name || '-'} />
            <InfoRow
              label="Vertical"
              value={
                proposal.vertical
                  ? VERTICAL_LABEL[proposal.vertical] ?? proposal.vertical
                  : '-'
              }
            />
          </section>

          {/* 3. Phases, solutions, line items and per-phase payment schedule. */}
          {phases.map((ph) => (
            <section key={ph.id} style={styles.phaseCard}>
              <div style={styles.phaseHead}>
                <h3 style={styles.phaseName}>{ph.name}</h3>
                {ph.timeline && <span style={styles.phaseTimeline}>{ph.timeline}</span>}
              </div>

              {ph.solutions.map((sol, si) => (
                <div key={si} style={si > 0 ? styles.solutionBlock : undefined}>
                  {sol.title && <div style={styles.solutionTitle}>{sol.title}</div>}
                  {sol.overview && <p style={styles.solutionOverview}>{sol.overview}</p>}
                  {sol.keyNote && <p style={styles.keyNote}>Note: {sol.keyNote}</p>}

                  <div style={styles.itemsTable}>
                    {sol.items.map((it) => (
                      <div key={it.id} style={styles.itemRow}>
                        <div style={{ minWidth: 0 }}>
                          <div style={styles.itemTitle}>{it.title}</div>
                          {it.scope && <div style={styles.itemScope}>{it.scope}</div>}
                        </div>
                        <span style={styles.itemAmount}>{formatMoney(it.amount, currency)}</span>
                      </div>
                    ))}
                  </div>

                  <div style={styles.subtotalRow}>
                    <span>Solution subtotal</span>
                    <span style={styles.subtotalValue}>
                      {formatMoney(solutionSubtotal(sol), currency)}
                    </span>
                  </div>
                </div>
              ))}

              <div style={styles.phaseSubtotalRow}>
                <span>Phase subtotal</span>
                <span style={styles.phaseSubtotalValue}>
                  {formatMoney(phaseSubtotal(ph), currency)}
                </span>
              </div>

              {ph.schedule.length > 0 && (
                <div style={styles.scheduleBlock}>
                  <div style={styles.scheduleHeading}>Payment schedule</div>
                  {ph.schedule.map((s) => (
                    <div key={s.id} style={styles.scheduleRow}>
                      <span style={styles.scheduleLabel}>{s.label}</span>
                      <span style={styles.schedulePct}>
                        {s.pct_of_total != null ? `${s.pct_of_total}%` : ''}
                      </span>
                      {s.triggered_by && (
                        <span style={styles.scheduleTrigger}>{s.triggered_by}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}

          {/* 4. Pricing summary */}
          <section style={styles.pricingCard}>
            {discountPct ? (
              <div style={styles.pricingRow}>
                <span style={styles.muted}>
                  {proposal.discount_label || `Discount ${discountPct}%`}
                </span>
                <span style={styles.discountValue}>
                  -{formatMoney(discountAmount, currency)}
                </span>
              </div>
            ) : null}

            <div style={styles.totalBlock}>
              <span style={styles.totalLabel}>Total</span>
              {/* H8 (aesthetic emphasis): the price the client commits to is the
                  single largest figure on the panel, in the heading typeface. */}
              <span style={styles.totalValue}>
                {formatMoney(Number(proposal.total_amount), currency)}
              </span>
            </div>

            {proposal.payment_terms && <p style={styles.terms}>{proposal.payment_terms}</p>}
            <InfoRow label="Revision rounds" value={revisionRounds} />
          </section>

          {/* 5. Documents */}
          <section style={styles.section}>
            <h3 style={styles.sectionHeading}>Documents</h3>
            {documents.length === 0 ? (
              <p style={{ ...styles.muted, margin: 0 }}>No documents attached.</p>
            ) : (
              documents.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  style={styles.docRow}
                  onClick={() => void openDocument(d)}
                >
                  <FileText size={16} style={{ color: tokens.accent }} />
                  <span style={styles.docName}>{d.file_name}</span>
                </button>
              ))
            )}
          </section>

          {/* 6. Sticky action bar. Draft shows nothing at all. */}
          {status !== 'draft' && (
            <div style={styles.stickyActions}>
              {actionError && <div style={styles.actionError}>{actionError}</div>}

              {live && !declining && (
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
              )}

              {/* H5 (error prevention): declining is confirmed in a second step,
                  with an optional reason, not on a single tap. */}
              {live && declining && (
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
                    {/* H3 (user control): a clear way back out of declining. */}
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
              )}

              {/* Locked states: read-only, with status made explicit (H1). */}
              {status === 'accepted' && (
                <p style={styles.acceptedNote}>
                  You accepted this proposal. Your project is underway.
                </p>
              )}
              {status === 'declined' && (
                <p style={styles.lockedNote}>You declined this proposal.</p>
              )}
              {status === 'expired' && (
                <p style={styles.lockedNote}>This proposal has expired.</p>
              )}
            </div>
          )}
        </>
      )}
    </SidePanel>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  muted: { fontFamily: fonts.body, fontSize: 14, color: tokens.textMuted },
  errorText: { fontFamily: fonts.body, fontSize: 14, color: tokens.ruby, margin: 0 },
  topMeta: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 20 },
  badge: {
    padding: '4px 12px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: fonts.body,
    whiteSpace: 'nowrap',
  },
  validUntil: { fontFamily: fonts.body, fontSize: 13, color: tokens.textMuted },
  section: {
    paddingBottom: 20,
    marginBottom: 20,
    borderBottom: `1px solid ${tokens.border}`,
  },
  sectionHeading: {
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
    color: tokens.text,
    margin: '0 0 12px',
  },
  infoRow: { display: 'flex', justifyContent: 'space-between', gap: 16, padding: '4px 0' },
  infoLabel: { fontFamily: fonts.body, fontSize: 13, color: tokens.textMuted },
  infoValue: { fontFamily: fonts.body, fontSize: 14, fontWeight: 500, color: tokens.text, textAlign: 'right' },
  phaseCard: {
    background: tokens.bg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: 18,
    marginBottom: 16,
  },
  phaseHead: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  phaseName: { fontFamily: fonts.heading, fontSize: 17, fontWeight: 600, color: tokens.text, margin: 0 },
  phaseTimeline: { fontFamily: fonts.body, fontSize: 12, color: tokens.accent, whiteSpace: 'nowrap' },
  solutionBlock: { marginTop: 16, paddingTop: 16, borderTop: `1px solid ${tokens.border}` },
  solutionTitle: { fontFamily: fonts.heading, fontSize: 15, fontWeight: 600, color: tokens.text, marginBottom: 4 },
  solutionOverview: { fontFamily: fonts.body, fontSize: 13, color: tokens.textMuted, margin: '0 0 8px', lineHeight: 1.5 },
  keyNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.goldDark,
    background: tokens.goldLight,
    borderRadius: 8,
    padding: '8px 12px',
    margin: '0 0 10px',
  },
  itemsTable: { display: 'flex', flexDirection: 'column' },
  itemRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    padding: '10px 0',
    borderTop: `1px solid ${tokens.border}`,
  },
  itemTitle: { fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: tokens.text },
  itemScope: { fontFamily: fonts.body, fontSize: 13, color: tokens.textMuted, marginTop: 2, lineHeight: 1.5 },
  itemAmount: { fontFamily: fonts.body, fontSize: 14, color: tokens.text, whiteSpace: 'nowrap' },
  subtotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    padding: '10px 0 0',
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.textMuted,
  },
  subtotalValue: { fontWeight: 600, color: tokens.text },
  phaseSubtotalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 14,
    paddingTop: 12,
    borderTop: `1px solid ${tokens.border}`,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    color: tokens.text,
  },
  phaseSubtotalValue: { color: tokens.accent },
  scheduleBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTop: `1px solid ${tokens.border}`,
  },
  scheduleHeading: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: tokens.textMuted,
    marginBottom: 8,
  },
  scheduleRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 10,
    padding: '5px 0',
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.text,
  },
  scheduleLabel: { flex: 1, minWidth: 0 },
  schedulePct: { fontWeight: 600, color: tokens.accent, whiteSpace: 'nowrap' },
  scheduleTrigger: { fontSize: 12, color: tokens.textMuted, whiteSpace: 'nowrap' },
  pricingCard: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
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
  discountValue: { fontFamily: fonts.body, fontSize: 14, color: tokens.ruby },
  totalBlock: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 8,
    paddingTop: 12,
    borderTop: `1px solid ${tokens.border}`,
  },
  totalLabel: { fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: tokens.text },
  totalValue: { fontFamily: fonts.heading, fontSize: 28, fontWeight: 700, color: tokens.primary },
  terms: { fontFamily: fonts.body, fontSize: 13, color: tokens.textMuted, lineHeight: 1.5, margin: '14px 0 12px' },
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
  docName: { fontFamily: fonts.body, fontSize: 14, color: tokens.accent, textDecoration: 'underline' },
  stickyActions: {
    position: 'sticky',
    bottom: 0,
    marginTop: 24,
    marginLeft: -24,
    marginRight: -24,
    marginBottom: -24,
    padding: '16px 24px',
    background: tokens.surface,
    borderTop: `1px solid ${tokens.border}`,
  },
  actionRow: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  acceptBtn: {
    background: tokens.primary,
    color: tokens.surface,
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
    color: tokens.textMuted,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '11px 22px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  declineBox: { display: 'flex', flexDirection: 'column', gap: 12 },
  declineLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 500,
    color: tokens.text,
  },
  textarea: {
    minHeight: 70,
    resize: 'vertical',
    background: tokens.inputBg,
    color: tokens.text,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '10px 12px',
    fontFamily: fonts.body,
    fontSize: 14,
    outline: 'none',
  },
  acceptedNote: { fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: tokens.green, margin: 0 },
  lockedNote: { fontFamily: fonts.body, fontSize: 14, color: tokens.textMuted, margin: 0 },
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
