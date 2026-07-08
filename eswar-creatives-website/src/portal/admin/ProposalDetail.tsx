import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useOutletContext, useParams } from 'react-router'
import { ArrowLeft, Bell, Eye, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'
import {
  PageHeader,
  Card,
  ui,
  mono,
  formatMoney,
  formatDate,
} from './ui'
import { ProposalForm, emptySolution, defaultSchedule } from './ProposalForm'
import { DeleteProposalModal } from './DeleteProposalModal'
import { ProposalNudgeModal, type NudgeProposal } from './ProposalNudgeModal'
import { SidePanel } from './SidePanel'
import {
  ProposalAccordion,
  type AccordionProposal,
  type ProposalStatus,
} from '../components/shared/ProposalAccordion'
import { toast } from 'sonner'
import type { PortalProfile } from '../PortalGuard'
import type {
  ProposalFull,
  PhaseForm,
  SolutionForm,
  DocumentRow,
  PaymentInstalment,
} from './ProposalForm'
import type { CSSProperties } from 'react'

type NudgeLogRow = {
  id: string
  sent_at: string
  channel: 'whatsapp' | 'email'
  message_preview: string | null
}

// Group a phase's line items (ordered) into solution groups by their shared
// solution_title/overview. Consecutive items with the same pair form one group.
function buildSolutions(
  items: {
    id: string
    title: string
    scope: string | null
    amount: number | null
    solution_title: string | null
    solution_overview: string | null
    solution_timeline: string | null
    solution_key_note: string | null
  }[]
): SolutionForm[] {
  const solutions: SolutionForm[] = []
  let current: SolutionForm | null = null
  let currentKey: string | null = null
  for (const it of items) {
    const key = `${it.solution_title ?? ''}|${it.solution_overview ?? ''}`
    if (!current || key !== currentKey) {
      current = {
        title: it.solution_title ?? '',
        overview: it.solution_overview ?? '',
        timeline: it.solution_timeline ?? '',
        keyNote: it.solution_key_note ?? '',
        items: [],
      }
      solutions.push(current)
      currentKey = key
    }
    current.items.push({
      id: it.id,
      title: it.title,
      scope: it.scope ?? '',
      amount: String(it.amount ?? ''),
    })
  }
  return solutions.length > 0 ? solutions : [emptySolution()]
}

const BUCKET = 'proposal-documents'

export function ProposalDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  // AdminShell gates this whole route to owner/admin and passes the profile via
  // the router outlet; only those roles may hard-delete a proposal.
  const profile = useOutletContext<PortalProfile>()
  const canDelete = profile?.role === 'owner' || profile?.role === 'admin'

  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)
  // Opens the right-side panel that shows exactly what the client sees.
  const [showPreview, setShowPreview] = useState(false)

  const [existing, setExisting] = useState<ProposalFull | null>(null)
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [phases, setPhases] = useState<PhaseForm[]>([])
  const [revisionRounds, setRevisionRounds] = useState('2')
  const [keyNote, setKeyNote] = useState('')

  const locked = existing?.status === 'accepted'

  // Nudge modal (status='sent' proposals only).
  const [showNudge, setShowNudge] = useState(false)
  const [nudgeLogs, setNudgeLogs] = useState<NudgeLogRow[]>([])

  // 5g: post-approval reorder (admin only — this whole route is admin-gated).
  // Native HTML5 drag, matching the existing AdminSketchUpload pattern.
  const [reorderMode, setReorderMode] = useState(false)
  const [dragPhase, setDragPhase] = useState<number | null>(null)
  const [dragSolution, setDragSolution] = useState<{ pi: number; si: number } | null>(null)

  // FLIP animation for reordering: record each phase card's position, then after
  // the order changes, invert the delta and transition it back to zero so cards
  // glide to their new slot instead of jumping (H1: the move is visible).
  const cardRefs = useRef(new Map<string, HTMLElement>())
  const prevRects = useRef(new Map<string, DOMRect>())
  const setCardRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) cardRefs.current.set(id, el)
    else cardRefs.current.delete(id)
  }, [])

  useLayoutEffect(() => {
    const prev = prevRects.current
    const next = new Map<string, DOMRect>()
    cardRefs.current.forEach((el, id) => {
      const rect = el.getBoundingClientRect()
      next.set(id, rect)
      const old = prev.get(id)
      if (old) {
        const dy = old.top - rect.top
        if (Math.abs(dy) > 1) {
          el.style.transform = `translateY(${dy}px)`
          el.style.transition = 'transform 0s'
          requestAnimationFrame(() => {
            el.style.transform = ''
            el.style.transition = `transform ${motionTokens.durationBase} ${motionTokens.easeDefault}`
          })
        }
      }
    })
    prevRects.current = next
  }, [phases, reorderMode])

  async function dropPhase(targetIndex: number) {
    if (dragPhase === null || dragPhase === targetIndex) {
      setDragPhase(null)
      return
    }
    const reordered = [...phases]
    const [moved] = reordered.splice(dragPhase, 1)
    reordered.splice(targetIndex, 0, moved)
    setPhases(reordered)
    setDragPhase(null)
    // Persist the new phase order: sort_order follows array position.
    await Promise.all(
      reordered
        .map((ph, idx) =>
          ph.id ? supabase.from('proposal_phases').update({ sort_order: idx }).eq('id', ph.id) : null
        )
        .filter(Boolean) as Promise<unknown>[]
    )
  }

  async function dropSolution(pi: number, targetSi: number) {
    if (!dragSolution || dragSolution.pi !== pi || dragSolution.si === targetSi) {
      setDragSolution(null)
      return
    }
    const sols = [...phases[pi].solutions]
    const [moved] = sols.splice(dragSolution.si, 1)
    sols.splice(targetSi, 0, moved)
    const newPhases = phases.map((p, idx) => (idx === pi ? { ...p, solutions: sols } : p))
    setPhases(newPhases)
    setDragSolution(null)
    // Solutions are item groupings; persist by renumbering item_number across
    // the phase in the new solution order (item order within a group is kept).
    let n = 0
    const updates: Promise<unknown>[] = []
    for (const sol of sols) {
      for (const it of sol.items) {
        n += 1
        if (it.id) updates.push(supabase.from('proposal_line_items').update({ item_number: n }).eq('id', it.id))
      }
    }
    await Promise.all(updates)
  }

  // Creation now happens in a modal from the Proposals list, so this detail
  // route only ever views/edits an existing proposal. Guard the legacy path.
  const isNew = id === 'new'

  // Load the proposal (view/edit).
  useEffect(() => {
    if (isNew || !id) return
    let cancelled = false
    ;(async () => {
      try {
        const { data: prop, error: pErr } = await supabase
          .from('proposals')
          .select(
            'id, proposal_number, client_id, client_name, company_name, title, vertical, currency, total_amount, discount_pct, discount_label, payment_terms, revision_rounds, key_note, status, valid_until, proposal_date, accepted_at'
          )
          .eq('id', id)
          .single()
        if (pErr) throw pErr

        const { data: phaseRows, error: phErr } = await supabase
          .from('proposal_phases')
          .select('id, phase_number, name, timeline, scope, sort_order')
          .eq('proposal_id', id)
          .order('sort_order', { ascending: true })
        if (phErr) throw phErr

        const phaseIds = (phaseRows ?? []).map((p) => p.id)
        let solutionsByPhase: Record<string, SolutionForm[]> = {}
        if (phaseIds.length > 0) {
          const { data: itemRows, error: iErr } = await supabase
            .from('proposal_line_items')
            .select(
              'id, phase_id, item_number, title, scope, amount, solution_title, solution_overview, solution_timeline, solution_key_note'
            )
            .in('phase_id', phaseIds)
            .order('item_number', { ascending: true })
          if (iErr) throw iErr
          const grouped = (itemRows ?? []).reduce(
            (acc, it) => {
              ;(acc[it.phase_id] ??= []).push(it)
              return acc
            },
            {} as Record<string, typeof itemRows>
          )
          solutionsByPhase = Object.fromEntries(
            Object.entries(grouped).map(([pid, items]) => [pid, buildSolutions(items ?? [])])
          )
        }

        const { data: schedRows } = await supabase
          .from('proposal_payment_schedule')
          .select('label, pct_of_total, triggered_by, instalment_number, phase_id')
          .eq('proposal_id', id)
          .order('instalment_number', { ascending: true })

        // Group schedule rows by phase (5f). Legacy rows with a null phase_id
        // are ignored here; each phase falls back to the default schedule.
        const scheduleByPhase: Record<string, PaymentInstalment[]> = {}
        for (const r of schedRows ?? []) {
          const pid = (r as { phase_id: string | null }).phase_id
          if (!pid) continue
          ;(scheduleByPhase[pid] ??= []).push({
            label: r.label as string,
            pct: String((r as { pct_of_total: number | null }).pct_of_total ?? ''),
            triggeredBy: (r as { triggered_by: string }).triggered_by as PaymentInstalment['triggeredBy'],
          })
        }

        const { data: docRows } = await supabase
          .from('proposal_documents')
          .select('id, file_name, file_size, storage_path')
          .eq('proposal_id', id)
          .order('uploaded_at', { ascending: true })

        if (cancelled) return

        const typedProp = prop as ProposalFull
        setExisting(typedProp)
        setDocuments((docRows ?? []) as DocumentRow[])
        setPhases(
          (phaseRows ?? []).map((ph) => ({
            id: ph.id,
            name: ph.name,
            timeline: ph.timeline ?? '',
            solutions: solutionsByPhase[ph.id] ?? [emptySolution()],
            schedule:
              scheduleByPhase[ph.id] && scheduleByPhase[ph.id].length > 0
                ? scheduleByPhase[ph.id]
                : defaultSchedule(),
          }))
        )
        setRevisionRounds(typedProp.revision_rounds == null ? 'Unlimited' : String(typedProp.revision_rounds))
        setKeyNote(typedProp.key_note ?? '')
      } catch {
        // H9: plain-language error, never a raw Supabase string.
        if (!cancelled) setError('Could not load this proposal. Refresh to try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, isNew])

  // Load nudge history when proposal id is known. Falls back silently if the
  // table does not yet exist (before migration 0071 is applied).
  useEffect(() => {
    if (!id || id === 'new') return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('proposal_nudge_log')
        .select('id, sent_at, channel, message_preview')
        .eq('proposal_id', id)
        .order('sent_at', { ascending: false })
        .limit(20)
      if (!cancelled && data) setNudgeLogs(data as NudgeLogRow[])
    })()
    return () => { cancelled = true }
  }, [id])

  // Normalise the loaded proposal + form state into the shape the shared
  // ProposalAccordion renders, so the admin detail and client portal read the
  // proposal through one component.
  const accordionProposal = useMemo<AccordionProposal | null>(() => {
    if (!existing) return null
    return {
      id: existing.id,
      title: existing.title,
      proposalNumber: existing.proposal_number,
      clientName: existing.client_name,
      companyName: existing.company_name,
      vertical: existing.vertical,
      status: existing.status as ProposalStatus,
      validUntil: existing.valid_until,
      currency: existing.currency,
      totalAmount: Number(existing.total_amount),
      discountPct: existing.discount_pct,
      discountLabel: existing.discount_label,
      paymentTerms: existing.payment_terms,
      revisionRounds,
      keyNote: existing.key_note,
      phases: phases.map((ph, pi) => ({
        id: ph.id ?? `phase-${pi}`,
        phaseNumber: pi + 1,
        name: ph.name,
        timeline: ph.timeline || null,
        solutions: ph.solutions.map((sol, si) => ({
          id: `${ph.id ?? pi}-sol-${si}`,
          title: sol.title,
          overview: sol.overview,
          timeline: sol.timeline || undefined,
          keyNote: sol.keyNote || undefined,
          items: sol.items.map((it, ii) => ({
            id: it.id ?? `${ph.id ?? pi}-${si}-${ii}`,
            title: it.title,
            scope: it.scope || null,
            amount: parseFloat(it.amount) || 0,
          })),
        })),
        schedule: ph.schedule.map((s, sidx) => ({
          id: `${ph.id ?? pi}-sched-${sidx}`,
          label: s.label,
          pct: s.pct === '' ? null : Number(s.pct),
          triggeredBy: s.triggeredBy,
        })),
      })),
      documents: documents.map((d) => ({ id: d.id, fileName: d.file_name })),
    }
  }, [existing, phases, documents, revisionRounds])

  // The accordion hands back a lightweight {id, fileName}; map it to the loaded
  // row so we can mint a signed URL for the private bucket.
  function openAccordionDocument(docId: string) {
    const row = documents.find((d) => d.id === docId)
    if (row) void openDocument(row)
  }

  async function openDocument(doc: DocumentRow) {
    if (!doc.storage_path) return
    const { data, error: err } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 60)
    if (err || !data) {
      setError('Could not open document.')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  if (isNew) {
    return <Navigate to="/portal/admin/proposals" replace />
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Proposal" />
        <Card>
          <p style={ui.muted}>Loading...</p>
        </Card>
      </>
    )
  }

  if (!existing) {
    return (
      <>
        <BackLink />
        <PageHeader title="Proposal" />
        <div style={styles.error}>{error ?? 'Proposal not found.'}</div>
      </>
    )
  }

  // ── Edit mode: the shared form, with the detail chrome around it ─────
  if (editing) {
    return (
      <>
        <BackLink />
        <PageHeader title="Edit proposal" />
        <ProposalForm
          existing={existing}
          initialPhases={phases}
          initialDocuments={documents}
          initialRevisionRounds={revisionRounds}
          initialKeyNote={keyNote}
          onCancel={() => setEditing(false)}
          onSaved={() => window.location.reload()}
        />
      </>
    )
  }

  // ── View mode ───────────────────────────────────────────────────────
  // The shared ProposalAccordion owns the title + meta + body, so the page
  // chrome is just the back link and an action row. Reorder mode is the one
  // exception: it keeps the flat draggable phase/solution cards (5g).
  return (
    <>
      <BackLink />
      <div style={styles.detailActions}>
        {locked ? (
          <>
            <span style={styles.acceptedBadge}>
              Accepted on {formatDate(existing.accepted_at)}
            </span>
            {/* 5g: reorder phases/solutions after approval (admin only). */}
            <button
              type="button"
              style={reorderMode ? styles.reorderOn : styles.reorderToggle}
              onClick={() => setReorderMode((r) => !r)}
            >
              {reorderMode ? 'Done reordering' : 'Reorder phases'}
            </button>
          </>
        ) : (
          <button type="button" style={ui.primaryBtn} onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
        {/* Nudge: only for sent proposals awaiting client response. */}
        {existing.status === 'sent' && (
          <button
            type="button"
            style={styles.nudgeBtn}
            onClick={() => setShowNudge(true)}
          >
            <Bell size={15} /> Nudge
          </button>
        )}
        {/* See the proposal exactly as the client does, in a read-only drawer. */}
        <button
          type="button"
          style={styles.previewBtn}
          onClick={() => setShowPreview(true)}
        >
          <Eye size={15} /> Preview as client
        </button>
        {/* Owner/admin only. Confirmation modal surfaces any linked invoices
            before the irreversible delete. */}
        {canDelete && (
          <button
            type="button"
            style={styles.deleteBtn}
            onClick={() => setShowDelete(true)}
            aria-label="Delete proposal"
            title="Delete proposal"
          >
            <Trash2 size={15} /> Delete
          </button>
        )}
      </div>
      {error && <div style={styles.error}>{error}</div>}

      {reorderMode ? (
        phases.map((ph, pi) => (
          // Plain section (not <Card>) so the native drag handlers and the FLIP
          // ref attach to a real DOM node; Card does not forward either.
          <section
            key={ph.id ?? pi}
            ref={(el) => setCardRef(ph.id ?? `phase-${pi}`, el)}
            style={{
              ...ui.card,
              marginBottom: 12,
              ...styles.reorderable,
              ...(dragPhase === pi ? styles.dragging : null),
            }}
            draggable
            onDragStart={() => setDragPhase(pi)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => void dropPhase(pi)}
            onDragEnd={() => setDragPhase(null)}
          >
            <div style={styles.phaseHead}>
              <h3 style={styles.phaseName}>
                <span style={styles.grip} aria-hidden title="Drag to reorder phase">
                  ⠿{' '}
                </span>
                {ph.name}
              </h3>
              {ph.timeline && <span style={styles.phaseTimeline}>{ph.timeline}</span>}
            </div>
            {ph.solutions.map((sol, si) => (
              <div
                key={si}
                style={{
                  ...(si > 0 ? styles.solutionBlock : {}),
                  ...styles.reorderable,
                  ...(dragSolution?.pi === pi && dragSolution?.si === si ? styles.dragging : null),
                }}
                draggable
                onDragStart={(e) => { e.stopPropagation(); setDragSolution({ pi, si }) }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.stopPropagation(); void dropSolution(pi, si) }}
                onDragEnd={() => setDragSolution(null)}
              >
                <div style={styles.solutionTitle}>
                  <span style={styles.grip} aria-hidden title="Drag to reorder solution">
                    ⠿{' '}
                  </span>
                  {sol.title || `Solution ${si + 1}`}
                </div>
                {sol.items.map((it, ii) => (
                  <div key={it.id ?? ii} style={styles.viewItem}>
                    <div style={{ minWidth: 0 }}>
                      <div style={styles.viewItemTitle}>{it.title}</div>
                      {it.scope && <div style={styles.viewItemScope}>{it.scope}</div>}
                    </div>
                    <span style={styles.viewItemAmount}>
                      {formatMoney(parseFloat(it.amount) || 0, existing.currency)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </section>
        ))
      ) : (
        accordionProposal && (
          <ProposalAccordion
            mode="admin"
            proposal={accordionProposal}
            onOpenDocument={(d) => openAccordionDocument(d.id)}
          />
        )
      )}

      {/* Nudge history: reminders sent for this proposal (migration 0071). */}
      {nudgeLogs.length > 0 && (
        <div style={nudgeHistoryStyles.section}>
          <div style={nudgeHistoryStyles.heading}>Reminders sent</div>
          {nudgeLogs.map((log) => (
            <div key={log.id} style={nudgeHistoryStyles.row}>
              <div style={nudgeHistoryStyles.rowTop}>
                <span style={nudgeHistoryStyles.channel}>
                  {log.channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
                </span>
                <span style={nudgeHistoryStyles.date}>{formatDate(log.sent_at)}</span>
              </div>
              {log.message_preview && (
                <p style={nudgeHistoryStyles.preview}>{log.message_preview}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Nudge modal */}
      {showNudge && existing && (
        <ProposalNudgeModal
          proposal={{
            id: existing.id,
            title: existing.title,
            client_id: existing.client_id,
            client_name: existing.client_name,
            company_name: existing.company_name,
            total_amount: Number(existing.total_amount),
            currency: existing.currency,
            status: existing.status,
          } as NudgeProposal}
          onClose={() => setShowNudge(false)}
          onSuccess={(msg) => {
            setShowNudge(false)
            toast.success(msg)
            // Reload nudge log to show the new entry.
            void supabase
              .from('proposal_nudge_log')
              .select('id, sent_at, channel, message_preview')
              .eq('proposal_id', existing.id)
              .order('sent_at', { ascending: false })
              .limit(20)
              .then(({ data }) => { if (data) setNudgeLogs(data as NudgeLogRow[]) })
          }}
        />
      )}

      {/* Client preview: the same proposal, rendered through the client view in
          a read-only drawer. CTAs are present but disabled with a banner so the
          admin can confirm the experience without firing any real action. */}
      {showPreview && accordionProposal && (
        <SidePanel
          title="Client view"
          subtitle="Preview"
          onClose={() => setShowPreview(false)}
          width={640}
        >
          <div style={styles.previewBanner}>
            This is a preview. Actions are disabled.
          </div>
          <ProposalAccordion
            mode="client"
            proposal={accordionProposal}
            actionsDisabled
            onOpenDocument={(d) => openAccordionDocument(d.id)}
          />
        </SidePanel>
      )}

      {showDelete && (
        <DeleteProposalModal
          proposalId={existing.id}
          title={existing.title}
          totalAmount={Number(existing.total_amount)}
          currency={existing.currency}
          clientName={existing.client_name || existing.company_name || ''}
          onClose={() => setShowDelete(false)}
          onDeleted={() => navigate('/portal/admin/proposals')}
        />
      )}
    </>
  )
}

function BackLink() {
  return (
    <Link to="/portal/admin/proposals" style={styles.backLink}>
      <ArrowLeft size={15} /> Proposals
    </Link>
  )
}

const styles: Record<string, CSSProperties> = {
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.tertiary,
    textDecoration: 'none',
    marginBottom: 12,
  },
  error: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 16,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  acceptedBadge: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: tokens.green,
    background: tokens.greenLight,
    borderRadius: 8,
    padding: '8px 14px',
  },
  detailActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  nudgeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.tealLight,
    color: tokens.primary,
    border: `1px solid ${tokens.accent}`,
    borderRadius: 8,
    padding: '8px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  previewBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: 'transparent',
    color: t.text.primary,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '8px 14px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  previewBanner: {
    background: t.background.subtle,
    color: t.text.muted,
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 16,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '8px 14px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  reorderToggle: {
    background: tokens.surface,
    color: tokens.primary,
    border: `1px solid ${tokens.accent}`,
    borderRadius: 8,
    padding: '8px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  reorderOn: {
    background: tokens.primary,
    color: tokens.surface,
    border: `1px solid ${tokens.primary}`,
    borderRadius: 8,
    padding: '8px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  reorderable: {
    cursor: 'grab',
    borderStyle: 'dashed',
    borderColor: tokens.accent,
  },
  dragging: { opacity: 0.5 },
  grip: {
    color: t.text.muted,
    cursor: 'grab',
    userSelect: 'none',
  },
  phaseHead: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 4,
  },
  phaseName: {
    fontFamily: fonts.heading,
    fontSize: 17,
    fontWeight: 600,
    color: t.text.primary,
    margin: '0 0 12px',
  },
  phaseTimeline: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.accent,
  },
  solutionBlock: {
    marginTop: 16,
    paddingTop: 16,
    borderTop: `1px solid ${tokens.border}`,
  },
  solutionTitle: {
    fontFamily: fonts.heading,
    fontSize: 15,
    fontWeight: 600,
    color: t.text.primary,
    marginBottom: 6,
  },
  viewItem: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    padding: '10px 0',
    borderTop: `1px solid ${tokens.border}`,
  },
  viewItemTitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    color: t.text.primary,
  },
  viewItemScope: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
    marginTop: 2,
  },
  viewItemAmount: {
    fontFamily: mono,
    fontSize: 14,
    color: t.text.primary,
    whiteSpace: 'nowrap',
  },
}

const nudgeHistoryStyles: Record<string, CSSProperties> = {
  section: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    padding: '20px 24px',
    marginTop: 8,
  },
  heading: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: t.text.tertiary,
    marginBottom: 12,
  },
  row: {
    padding: '10px 0',
    borderBottom: `1px solid ${t.border.subtle}`,
  },
  rowTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  channel: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: t.text.primary,
  },
  date: {
    fontFamily: mono,
    fontSize: 12,
    color: t.text.muted,
  },
  preview: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.tertiary,
    margin: 0,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },
}
