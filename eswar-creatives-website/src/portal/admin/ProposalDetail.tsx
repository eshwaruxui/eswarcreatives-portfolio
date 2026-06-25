import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useOutletContext, useParams } from 'react-router'
import { ArrowLeft, FileText, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, fonts } from '../theme'
import {
  PageHeader,
  Card,
  StatusBadge,
  ui,
  mono,
  formatMoney,
  formatDate,
} from './ui'
import { ProposalForm, emptySolution, defaultSchedule } from './ProposalForm'
import { DeleteProposalModal } from './DeleteProposalModal'
import type { PortalProfile } from '../PortalGuard'
import type {
  ProposalFull,
  PhaseForm,
  SolutionForm,
  DocumentRow,
  PaymentInstalment,
} from './ProposalForm'
import type { CSSProperties } from 'react'

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

  const [existing, setExisting] = useState<ProposalFull | null>(null)
  const [documents, setDocuments] = useState<DocumentRow[]>([])
  const [phases, setPhases] = useState<PhaseForm[]>([])
  const [revisionRounds, setRevisionRounds] = useState('2')
  const [keyNote, setKeyNote] = useState('')

  const locked = existing?.status === 'accepted'

  // 5g: post-approval reorder (admin only — this whole route is admin-gated).
  // Native HTML5 drag, matching the existing AdminSketchUpload pattern.
  const [reorderMode, setReorderMode] = useState(false)
  const [dragPhase, setDragPhase] = useState<number | null>(null)
  const [dragSolution, setDragSolution] = useState<{ pi: number; si: number } | null>(null)

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
            'id, proposal_number, client_id, client_name, company_name, title, vertical, currency, total_amount, discount_pct, discount_label, payment_terms, revision_rounds, key_note, status, valid_until, accepted_at'
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

  // View-mode totals derive from the saved phases + the saved discount.
  const subtotal = useMemo(
    () =>
      phases.reduce(
        (sum, ph) =>
          sum +
          ph.solutions.reduce(
            (s, sol) => s + sol.items.reduce((t, it) => t + (parseFloat(it.amount) || 0), 0),
            0
          ),
        0
      ),
    [phases]
  )
  const discountPct = existing?.discount_pct ?? 0
  const discountAmount = (subtotal * discountPct) / 100
  const total = Math.max(0, subtotal - discountAmount)

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
  return (
    <>
      <BackLink />
      <PageHeader
        title={existing.title}
        subtitle={`${existing.proposal_number ?? 'No number'} · ${existing.company_name ?? ''}`}
        action={
          <div style={styles.headerActions}>
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
        }
      />
      {error && <div style={styles.error}>{error}</div>}

      <Card style={{ marginBottom: 16 }}>
        <div style={styles.metaGrid}>
          <Meta label="Status" value={<StatusBadge status={existing.status} />} />
          <Meta label="Client" value={existing.client_name ?? '—'} />
          <Meta label="Company" value={existing.company_name ?? '—'} />
          <Meta label="Vertical" value={existing.vertical} />
          <Meta label="Valid until" value={formatDate(existing.valid_until)} />
          <Meta
            label="Total"
            value={
              <span style={{ fontFamily: mono, fontWeight: 600 }}>
                {formatMoney(Number(existing.total_amount), existing.currency)}
              </span>
            }
          />
        </div>
      </Card>

      {phases.map((ph, pi) => (
        <Card
          key={ph.id ?? pi}
          style={{
            marginBottom: 12,
            ...(reorderMode ? styles.reorderable : null),
            ...(dragPhase === pi ? styles.dragging : null),
          }}
          draggable={reorderMode}
          onDragStart={reorderMode ? () => setDragPhase(pi) : undefined}
          onDragOver={reorderMode ? (e) => e.preventDefault() : undefined}
          onDrop={reorderMode ? () => void dropPhase(pi) : undefined}
          onDragEnd={reorderMode ? () => setDragPhase(null) : undefined}
        >
          <div style={styles.phaseHead}>
            <h3 style={styles.phaseName}>
              {reorderMode && (
                <span style={styles.grip} aria-hidden title="Drag to reorder phase">
                  ⠿{' '}
                </span>
              )}
              {ph.name}
            </h3>
            {ph.timeline && <span style={styles.phaseTimeline}>{ph.timeline}</span>}
          </div>
          {ph.solutions.map((sol, si) => (
            <div
              key={si}
              style={{
                ...(si > 0 ? styles.solutionBlock : {}),
                ...(reorderMode ? styles.reorderable : null),
                ...(dragSolution?.pi === pi && dragSolution?.si === si ? styles.dragging : null),
              }}
              draggable={reorderMode}
              onDragStart={reorderMode ? (e) => { e.stopPropagation(); setDragSolution({ pi, si }) } : undefined}
              onDragOver={reorderMode ? (e) => e.preventDefault() : undefined}
              onDrop={reorderMode ? (e) => { e.stopPropagation(); void dropSolution(pi, si) } : undefined}
              onDragEnd={reorderMode ? () => setDragSolution(null) : undefined}
            >
              {(sol.title || reorderMode) && (
                <div style={styles.solutionTitle}>
                  {reorderMode && (
                    <span style={styles.grip} aria-hidden title="Drag to reorder solution">
                      ⠿{' '}
                    </span>
                  )}
                  {sol.title || `Solution ${si + 1}`}
                </div>
              )}
              {sol.timeline && <div style={styles.phaseTimeline}>{sol.timeline}</div>}
              {sol.overview && <p style={styles.phaseScope}>{sol.overview}</p>}
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
              {sol.keyNote && <p style={styles.solutionKeyNote}>Note: {sol.keyNote}</p>}
            </div>
          ))}
        </Card>
      ))}

      {(existing.key_note || revisionRounds) && (
        <Card style={{ marginBottom: 12 }}>
          <div style={styles.metaGrid}>
            <Meta label="Revision rounds" value={revisionRounds} />
            {existing.key_note && <Meta label="Key note" value={existing.key_note} />}
          </div>
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <h3 style={styles.phaseName}>Pricing & terms</h3>
        <div style={styles.totalsRow}>
          <span style={ui.muted}>Subtotal</span>
          <span style={{ fontFamily: mono }}>{formatMoney(subtotal, existing.currency)}</span>
        </div>
        {existing.discount_pct ? (
          <div style={styles.totalsRow}>
            <span style={ui.muted}>{existing.discount_label || `Discount ${existing.discount_pct}%`}</span>
            <span style={{ fontFamily: mono, color: tokens.ruby }}>
              -{formatMoney(discountAmount, existing.currency)}
            </span>
          </div>
        ) : null}
        <div style={{ ...styles.totalsRow, borderTop: `1px solid ${tokens.border}`, paddingTop: 10 }}>
          <span style={{ fontWeight: 600 }}>Total</span>
          <span style={{ fontFamily: mono, fontWeight: 600, fontSize: 16 }}>
            {formatMoney(total, existing.currency)}
          </span>
        </div>
        <p style={styles.terms}>{existing.payment_terms}</p>
      </Card>

      <Card>
        <h3 style={styles.phaseName}>Documents</h3>
        {documents.length === 0 ? (
          <p style={{ ...ui.muted, margin: 0 }}>No documents attached.</p>
        ) : (
          documents.map((d) => (
            <button key={d.id} type="button" style={styles.docRow} onClick={() => openDocument(d)}>
              <FileText size={16} style={{ color: tokens.accent }} />
              <span style={styles.docName}>{d.file_name}</span>
            </button>
          ))
        )}
      </Card>

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

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div style={styles.metaLabel}>{label}</div>
      <div style={styles.metaValue}>{value}</div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.textMuted,
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
  headerActions: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
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
    color: tokens.textMuted,
    cursor: 'grab',
    userSelect: 'none',
  },
  solutionKeyNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.goldDark,
    background: tokens.goldLight,
    borderRadius: 8,
    padding: '8px 12px',
    margin: '8px 0 0',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 16,
  },
  metaLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.textMuted,
    marginBottom: 4,
  },
  metaValue: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: tokens.text,
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
    color: tokens.text,
    margin: '0 0 12px',
  },
  phaseTimeline: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.accent,
  },
  phaseScope: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.textMuted,
    margin: '0 0 12px',
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
    color: tokens.text,
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
    color: tokens.text,
  },
  viewItemScope: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.textMuted,
    marginTop: 2,
  },
  viewItemAmount: {
    fontFamily: mono,
    fontSize: 14,
    color: tokens.text,
    whiteSpace: 'nowrap',
  },
  totalsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    fontFamily: fonts.body,
    fontSize: 14,
    color: tokens.text,
  },
  terms: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.textMuted,
    marginTop: 16,
    marginBottom: 0,
    lineHeight: 1.5,
  },
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
    color: tokens.text,
  },
}
