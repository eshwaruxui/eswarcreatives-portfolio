// Admin (canEdit=true): two-step inline picker to link this stage to a proposal
// and optionally a specific proposal phase. UPSERTs to project_stage_proposal_links.
// Client (canEdit=false): read-only insight card showing the linked proposal scope.
// Hidden entirely for clients when no link exists (H6: relevance-only visibility).
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { ChevronDown, FileText, Link2, Unlink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'
import { mono } from '../admin/ui'

export type ProjectStageProposalLink = {
  id: string
  project_id: string
  stage_number: number
  proposal_id: string
  proposal_phase_id: string | null
}

type Proposal = {
  id: string
  proposal_number: string
  title: string
  status: string
}

type ProposalPhase = {
  id: string
  proposal_id: string
  phase_number: number
  phase_name: string
  timeline: string | null
  scope: string | null
}

type Step = 'idle' | 'pick-proposal' | 'pick-phase'

export function ProposalLinkPicker({
  projectId,
  stageNumber,
  link: initialLink,
  canEdit,
  proposals = [],
  onLinkChange,
}: {
  projectId: string
  stageNumber: number
  link: ProjectStageProposalLink | null
  canEdit: boolean
  proposals?: Proposal[]
  onLinkChange: (link: ProjectStageProposalLink | null) => void
}) {
  const [link, setLink] = useState<ProjectStageProposalLink | null>(initialLink)
  const [step, setStep] = useState<Step>('idle')
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null)
  const [phases, setPhases] = useState<ProposalPhase[]>([])
  const [phasesLoading, setPhasesLoading] = useState(false)
  // Names for display (fetched on mount if link exists)
  const [displayNames, setDisplayNames] = useState<{
    proposalNumber: string; title: string; phaseName: string | null
  } | null>(null)

  useEffect(() => {
    if (link) void fetchDisplayNames(link)
  }, [])

  async function fetchDisplayNames(l: ProjectStageProposalLink) {
    const { data: p } = await supabase
      .from('proposals')
      .select('proposal_number, title')
      .eq('id', l.proposal_id)
      .single()
    let phaseName: string | null = null
    if (l.proposal_phase_id) {
      const { data: ph } = await supabase
        .from('proposal_phases')
        .select('phase_name')
        .eq('id', l.proposal_phase_id)
        .single()
      phaseName = ph?.phase_name ?? null
    }
    if (p) {
      setDisplayNames({
        proposalNumber: p.proposal_number,
        title: p.title,
        phaseName,
      })
    }
  }

  async function pickProposal(proposal: Proposal) {
    setSelectedProposal(proposal)
    setPhasesLoading(true)
    setStep('pick-phase')
    const { data } = await supabase
      .from('proposal_phases')
      .select('*')
      .eq('proposal_id', proposal.id)
      .order('phase_number', { ascending: true })
    setPhases((data ?? []) as ProposalPhase[])
    setPhasesLoading(false)
  }

  async function confirmLink(phaseId: string | null) {
    if (!selectedProposal) return
    // UPSERT by project_id + stage_number (single link per stage)
    const payload = {
      project_id: projectId,
      stage_number: stageNumber,
      proposal_id: selectedProposal.id,
      proposal_phase_id: phaseId,
    }
    const { data, error } = await supabase
      .from('project_stage_proposal_links')
      .upsert(payload, { onConflict: 'project_id,stage_number' })
      .select('*')
      .single()
    if (error || !data) { setStep('idle'); return } // H9: silent; revert UI
    const next = data as ProjectStageProposalLink
    sync(next)
    await fetchDisplayNames(next)
    setStep('idle')
    setSelectedProposal(null)
    setPhases([])
  }

  async function removeLink() {
    if (!link) return
    await supabase
      .from('project_stage_proposal_links')
      .delete()
      .eq('id', link.id)
    sync(null)
    setDisplayNames(null)
  }

  function sync(next: ProjectStageProposalLink | null) {
    setLink(next)
    onLinkChange(next)
  }

  function cancel() {
    setStep('idle')
    setSelectedProposal(null)
    setPhases([])
  }

  // ── Client read-only view ─────────────────────────────────────────────
  if (!canEdit) {
    if (!link || !displayNames) return null
    return (
      <div style={s.insightCard}>
        <FileText size={14} color={tokens.accent} style={{ flexShrink: 0 }} />
        <div style={s.insightBody}>
          <span style={s.insightNum}>#{displayNames.proposalNumber}</span>
          <span style={s.insightTitle}>{displayNames.title}</span>
          {displayNames.phaseName && (
            <span style={s.insightPhase}>{displayNames.phaseName}</span>
          )}
        </div>
      </div>
    )
  }

  // ── Admin view: linked state ──────────────────────────────────────────
  if (link && displayNames && step === 'idle') {
    return (
      <div style={s.linkedRow}>
        <Link2 size={13} color={tokens.accent} style={{ flexShrink: 0 }} />
        <span style={s.linkedLabel}>
          <span style={s.linkedNum}>#{displayNames.proposalNumber}</span>{' '}
          {displayNames.title}
          {displayNames.phaseName && (
            <> &middot; <em style={s.linkedPhase}>{displayNames.phaseName}</em></>
          )}
        </span>
        <button type="button" style={s.changeBtn} onClick={() => setStep('pick-proposal')}>
          Change
        </button>
        <button type="button" style={s.removeBtn} onClick={() => void removeLink()} aria-label="Remove proposal link">
          <Unlink size={12} />
        </button>
      </div>
    )
  }

  // ── Admin view: no link, idle ─────────────────────────────────────────
  if (step === 'idle') {
    return (
      <button type="button" style={s.linkBtn} onClick={() => setStep('pick-proposal')}>
        <Link2 size={13} />
        Link proposal scope
      </button>
    )
  }

  // ── Admin view: step 1 — pick proposal ───────────────────────────────
  if (step === 'pick-proposal') {
    return (
      <div style={s.pickerWrap}>
        <span style={s.pickerLabel}>Select proposal</span>
        {proposals.length === 0 ? (
          <p style={s.pickerEmpty}>No proposals found for this client.</p>
        ) : (
          <div style={s.optionList}>
            {proposals.map((p) => (
              <button
                key={p.id}
                type="button"
                style={s.optionBtn}
                onClick={() => void pickProposal(p)}
              >
                <span style={s.optionNum}>#{p.proposal_number}</span>
                <span style={s.optionTitle}>{p.title}</span>
                <span style={{ ...s.statusPill, ...statusStyle(p.status) }}>{p.status}</span>
                <ChevronDown size={12} style={{ transform: 'rotate(-90deg)', color: t.text.muted, flexShrink: 0 }} />
              </button>
            ))}
          </div>
        )}
        <button type="button" style={s.cancelBtn} onClick={cancel}>Cancel</button>
      </div>
    )
  }

  // ── Admin view: step 2 — pick phase ──────────────────────────────────
  return (
    <div style={s.pickerWrap}>
      <span style={s.pickerLabel}>
        {selectedProposal?.title} &mdash; select a scope (optional)
      </span>
      {phasesLoading ? (
        <p style={s.pickerEmpty}>Loading...</p>
      ) : (
        <div style={s.optionList}>
          <button type="button" style={s.optionBtn} onClick={() => void confirmLink(null)}>
            <span style={s.optionTitle}>Whole proposal (no specific scope)</span>
          </button>
          {phases.map((ph) => (
            <button
              key={ph.id}
              type="button"
              style={s.optionBtn}
              onClick={() => void confirmLink(ph.id)}
            >
              <span style={s.optionNum}>Phase {ph.phase_number}</span>
              <span style={s.optionTitle}>{ph.phase_name}</span>
              {ph.timeline && <span style={s.optionMeta}>{ph.timeline}</span>}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="button" style={s.backBtn} onClick={() => setStep('pick-proposal')}>
          Back
        </button>
        <button type="button" style={s.cancelBtn} onClick={cancel}>Cancel</button>
      </div>
    </div>
  )
}

function statusStyle(status: string): CSSProperties {
  if (status === 'approved' || status === 'accepted')
    return { background: tokens.greenLight, color: tokens.green, borderColor: tokens.green }
  if (status === 'draft')
    return { background: t.background.muted, color: t.text.muted, borderColor: t.border.subtle }
  return { background: tokens.goldLight, color: tokens.goldDark, borderColor: tokens.gold }
}

const s: Record<string, CSSProperties> = {
  // Read-only insight card (client)
  insightCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 8,
    background: tokens.tealLight,
    border: `1px solid ${t.border.brand}`,
  },
  insightBody: { display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 },
  insightNum: { fontFamily: mono, fontSize: 11, color: tokens.accent },
  insightTitle: { fontFamily: fonts.body, fontWeight: 600, fontSize: 13, color: t.text.primary },
  insightPhase: { fontFamily: fonts.body, fontSize: 12, color: t.text.secondary },

  // Linked state (admin)
  linkedRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 10px',
    borderRadius: 8,
    background: tokens.tealLight,
    border: `1px solid ${t.border.brand}`,
  },
  linkedLabel: { fontFamily: fonts.body, fontSize: 12, color: t.text.primary, flex: 1, minWidth: 0 },
  linkedNum: { fontFamily: mono, fontSize: 11, color: tokens.accent },
  linkedPhase: { fontStyle: 'italic', color: t.text.secondary, fontSize: 11 },
  changeBtn: {
    fontFamily: fonts.body, fontSize: 11, color: tokens.accent,
    background: 'none', border: 'none', padding: '2px 6px', cursor: 'pointer', flexShrink: 0,
  },
  removeBtn: {
    background: 'none', border: 'none', padding: 4, cursor: 'pointer', color: t.text.muted,
    display: 'flex', flexShrink: 0,
  },

  // Unlinked state (admin)
  linkBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.tertiary,
    background: 'none',
    border: `1px dashed ${t.border.medium}`,
    borderRadius: 6,
    padding: '5px 10px',
    cursor: 'pointer',
    transition: `border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },

  // Picker container
  pickerWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '10px 12px',
    background: t.background.subtle,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
  },
  pickerLabel: { fontFamily: fonts.body, fontWeight: 500, fontSize: 12, color: t.text.secondary },
  pickerEmpty: { fontFamily: fonts.body, fontSize: 12, color: t.text.tertiary, margin: 0 },
  optionList: { display: 'flex', flexDirection: 'column', gap: 4 },
  optionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 6,
    border: `1px solid ${t.border.subtle}`,
    background: tokens.surface,
    cursor: 'pointer',
    fontFamily: fonts.body,
    textAlign: 'left' as const,
    transition: `border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  optionNum: { fontFamily: mono, fontSize: 11, color: t.text.muted, flexShrink: 0 },
  optionTitle: { fontFamily: fonts.body, fontSize: 13, color: t.text.primary, flex: 1 },
  optionMeta: { fontFamily: fonts.body, fontSize: 11, color: t.text.muted, flexShrink: 0 },
  statusPill: {
    fontSize: 10, fontFamily: fonts.body, fontWeight: 500,
    border: '1px solid', borderRadius: 999, padding: '1px 6px', flexShrink: 0,
  },
  cancelBtn: {
    fontFamily: fonts.body, fontSize: 12, color: t.text.secondary,
    background: 'none', border: `1px solid ${t.border.default}`,
    borderRadius: 6, padding: '4px 12px', cursor: 'pointer', alignSelf: 'flex-start' as const,
  },
  backBtn: {
    fontFamily: fonts.body, fontSize: 12, color: tokens.accent,
    background: 'none', border: `1px solid ${t.border.brand}`,
    borderRadius: 6, padding: '4px 12px', cursor: 'pointer', alignSelf: 'flex-start' as const,
  },
}
