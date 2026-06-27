// Right-side slide-in panel showing a single proposal in full, opened when a
// client clicks a proposal card. The proposal body is rendered by the shared
// ProposalAccordion (mode="client") so it reads identically to the admin
// preview. This file owns data loading and the Accept / Decline side effects;
// the accordion owns presentation and the action UI. Theme tokens only; no raw
// hex; no em dashes; plain-language errors only (H9). Clients have SELECT-only
// RLS on proposals and child tables, so writes go through SECURITY DEFINER RPCs
// and the confirm-proposal edge function.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { SidePanel } from '../admin/SidePanel'
import {
  ProposalAccordion,
  type AccordionProposal,
  type AccordionDocument,
  type ProposalStatus,
} from '../components/shared/ProposalAccordion'

type FullProposal = {
  id: string
  proposal_number: string | null
  title: string
  status: ProposalStatus
  valid_until: string | null
  client_name: string | null
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
  phaseNumber: number | null
  name: string
  timeline: string | null
  solutions: Solution[]
  schedule: ScheduleRow[]
}
type DocRow = { id: string; file_name: string; storage_path: string | null }

const BUCKET = 'proposal-documents'

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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const { data: prop, error: pErr } = await supabase
          .from('proposals')
          .select(
            'id, proposal_number, title, status, valid_until, client_name, company_name, vertical, currency, total_amount, discount_pct, discount_label, payment_terms, revision_rounds'
          )
          .eq('id', proposalId)
          .single()
        if (pErr) throw pErr

        const { data: phaseRows, error: phErr } = await supabase
          .from('proposal_phases')
          .select('id, phase_number, name, timeline, sort_order')
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
          phaseNumber: (ph as { phase_number: number | null }).phase_number,
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

  // Accept the whole proposal. Throws on failure so the accordion can surface a
  // plain-language error; on success we update local status so the accordion
  // re-renders into its locked state.
  async function handleAccept() {
    const { error: fnErr } = await supabase.functions.invoke('confirm-proposal', {
      body: { proposal_id: proposalId },
    })
    if (fnErr) throw fnErr
    setProposal((prev) => (prev ? { ...prev, status: 'accepted' } : prev))
    onChanged?.()
  }

  async function handleDecline(reason: string) {
    const { error: rpcErr } = await supabase.rpc('decline_proposal', {
      p_proposal_id: proposalId,
      p_reason: reason,
    })
    if (rpcErr) throw rpcErr
    setProposal((prev) => (prev ? { ...prev, status: 'declined' } : prev))
    onChanged?.()
  }

  async function openDocument(doc: AccordionDocument) {
    const row = documents.find((d) => d.id === doc.id)
    if (!row?.storage_path) return
    // Private bucket: mint a short-lived signed URL (client RLS scopes it to
    // their own proposals). We never expose a raw storage error (H9).
    const { data, error: err } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, 60)
    if (err || !data) {
      setError('We could not open that document. Please try again.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  // Normalise the loaded proposal into the shape ProposalAccordion renders. The
  // internal key note is intentionally omitted: clients never see it.
  const accordionProposal = useMemo<AccordionProposal | null>(() => {
    if (!proposal) return null
    return {
      id: proposal.id,
      title: proposal.title,
      proposalNumber: proposal.proposal_number,
      clientName: proposal.client_name,
      companyName: proposal.company_name,
      vertical: proposal.vertical,
      status: proposal.status,
      validUntil: proposal.valid_until,
      currency: proposal.currency,
      totalAmount: Number(proposal.total_amount),
      discountPct: proposal.discount_pct,
      discountLabel: proposal.discount_label,
      paymentTerms: proposal.payment_terms,
      revisionRounds:
        proposal.revision_rounds == null ? 'Unlimited' : String(proposal.revision_rounds),
      keyNote: null,
      phases: phases.map((ph, pi) => ({
        id: ph.id,
        phaseNumber: ph.phaseNumber ?? pi + 1,
        name: ph.name,
        timeline: ph.timeline,
        solutions: ph.solutions.map((sol, si) => ({
          id: `${ph.id}-sol-${si}`,
          title: sol.title,
          overview: sol.overview,
          keyNote: sol.keyNote || undefined,
          items: sol.items.map((it) => ({
            id: it.id,
            title: it.title,
            scope: it.scope,
            amount: it.amount,
          })),
        })),
        schedule: ph.schedule.map((s) => ({
          id: s.id,
          label: s.label,
          pct: s.pct_of_total,
          triggeredBy: s.triggered_by,
        })),
      })),
      documents: documents.map((d) => ({ id: d.id, fileName: d.file_name })),
    }
  }, [proposal, phases, documents])

  return (
    <SidePanel title="Proposal" subtitle="Proposal details" onClose={onClose} width={560}>
      {loading ? (
        <p style={{ fontFamily: 'inherit', fontSize: 14 }}>Loading...</p>
      ) : error || !accordionProposal ? (
        <p style={{ fontSize: 14 }}>{error ?? 'Proposal not found.'}</p>
      ) : (
        <ProposalAccordion
          mode="client"
          proposal={accordionProposal}
          onAccept={handleAccept}
          onDecline={handleDecline}
          onOpenDocument={openDocument}
        />
      )}
    </SidePanel>
  )
}
