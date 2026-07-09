// Sequences tab: list sequences, expand to step rail, step editor.
// Reply rate = (leads with sent touch + status replied) / (leads with any sent touch).
import { useEffect, useState } from 'react'
import { ChevronRight, Mail, Linkedin } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { mono } from '../ui'

type Step = {
  id: string
  step_number: number
  channel: string
  day_offset: number
  subject_template: string | null
  body_template: string
  requires_connected: boolean
  stop_on_reply: boolean
}

type Sequence = {
  id: string
  name: string
  segment: string | null
  is_active: boolean
  steps: Step[]
  stats: {
    enrolled: number
    active: number
    replied: number
    reply_rate: number
    sent_count: number
  }
}

const VARIABLES = ['{{first_name}}', '{{company}}', '{{specific_observation}}', '{{unsubscribe_url}}', '{{flow}}', '{{topic}}']

export function SequencesTab() {
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editingStep, setEditingStep] = useState<string | null>(null)
  const [stepDraft, setStepDraft] = useState<{ subject: string; body: string } | null>(null)
  const [savingStep, setSavingStep] = useState(false)
  const [saveWarningShown, setSaveWarningShown] = useState(false)
  // Feature 4: dismissed diagnostic banners per sequence (component state only, resets on reload)
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set())

  async function load() {
    setLoading(true)
    const { data: seqs } = await supabase
      .from('sequences')
      .select('id, name, segment, is_active')
      .order('name')

    if (!seqs) { setLoading(false); return }

    const seqIds = seqs.map((s) => s.id)

    // First get enrollments to know which enrollment IDs to query touches for
    const enrollRes = await supabase
      .from('lead_enrollments')
      .select('id, sequence_id, status, lead_id')
      .in('sequence_id', seqIds)

    const allEnroll = (enrollRes.data ?? []) as { id: string; sequence_id: string; status: string; lead_id: string }[]
    const allEnrollIds = allEnroll.map((e) => e.id)

    const stepsRes = await supabase
      .from('sequence_steps')
      .select('*')
      .in('sequence_id', seqIds)
      .order('step_number')

    let sentTouches: { id: string; lead_id: string; enrollment_id: string }[] = []
    if (allEnrollIds.length > 0) {
      const tRes = await supabase
        .from('outreach_touches')
        .select('id, lead_id, enrollment_id, status')
        .in('enrollment_id', allEnrollIds)
        .eq('status', 'sent')
      sentTouches = (tRes.data ?? []) as { id: string; lead_id: string; enrollment_id: string }[]
    }

    const uniqueLeadIds = [...new Set(allEnroll.map((e) => e.lead_id))]
    let leadStatusMap = new Map<string, string>()
    if (uniqueLeadIds.length > 0) {
      const lRes = await supabase
        .from('leads')
        .select('id, status')
        .in('id', uniqueLeadIds)
      const lData = (lRes.data ?? []) as { id: string; status: string }[]
      leadStatusMap = new Map(lData.map((l) => [l.id, l.status]))
    }

    const allSteps = (stepsRes.data ?? []) as (Step & { sequence_id: string })[]

    const enriched: Sequence[] = seqs.map((seq) => {
      const steps = allSteps.filter((s) => s.sequence_id === seq.id)
      const seqEnroll = allEnroll.filter((e) => e.sequence_id === seq.id)
      const enrolled = seqEnroll.length
      const active = seqEnroll.filter((e) => e.status === 'active').length

      const enrollIds = new Set(seqEnroll.map((e) => e.id))
      const sentLeadIds = new Set(sentTouches.filter((touch) => enrollIds.has(touch.enrollment_id)).map((touch) => touch.lead_id))
      const sentCount = sentLeadIds.size

      // Feature 4: reply rate = leads enrolled in this sequence with status='replied' / leads with sent touch
      const repliedCount = [...sentLeadIds].filter((id) => leadStatusMap.get(id) === 'replied').length
      const reply_rate = sentCount > 0 ? repliedCount / sentCount : 0

      return {
        ...seq,
        steps,
        stats: {
          enrolled,
          active,
          replied: repliedCount,
          reply_rate,
          sent_count: sentCount,
        },
      }
    })

    setSequences(enriched)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleActive(seqId: string, current: boolean) {
    await supabase.from('sequences').update({ is_active: !current }).eq('id', seqId)
    setSequences((prev) => prev.map((s) => s.id === seqId ? { ...s, is_active: !current } : s))
  }

  function handleEditStep(step: Step) {
    setEditingStep(step.id)
    setStepDraft({ subject: step.subject_template ?? '', body: step.body_template })
    setSaveWarningShown(false)
  }

  async function handleSaveStep(step: Step) {
    if (!stepDraft) return
    setSavingStep(true)
    await supabase.from('sequence_steps').update({
      subject_template: stepDraft.subject || null,
      body_template: stepDraft.body,
    }).eq('id', step.id)
    setEditingStep(null)
    setStepDraft(null)
    setSavingStep(false)
    load()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {loading ? (
        <p style={styles.loading}>Loading sequences...</p>
      ) : sequences.length === 0 ? (
        <p style={styles.loading}>No sequences found.</p>
      ) : (
        sequences.map((seq) => (
          <SequenceCard
            key={seq.id}
            seq={seq}
            isExpanded={expanded === seq.id}
            editingStep={editingStep}
            stepDraft={stepDraft}
            savingStep={savingStep}
            saveWarningShown={saveWarningShown}
            warningDismissed={dismissedWarnings.has(seq.id)}
            onToggleExpand={() => setExpanded((p) => p === seq.id ? null : seq.id)}
            onToggleActive={() => toggleActive(seq.id, seq.is_active)}
            onEditStep={handleEditStep}
            onSaveStep={handleSaveStep}
            onCancelEdit={() => { setEditingStep(null); setStepDraft(null) }}
            onStepDraftChange={(field, val) => setStepDraft((d) => d ? { ...d, [field]: val } : d)}
            onShowWarning={() => setSaveWarningShown(true)}
            onDismissWarning={() => setDismissedWarnings((s) => new Set([...s, seq.id]))}
          />
        ))
      )}
    </div>
  )
}

function SequenceCard({
  seq,
  isExpanded,
  editingStep,
  stepDraft,
  savingStep,
  saveWarningShown,
  warningDismissed,
  onToggleExpand,
  onToggleActive,
  onEditStep,
  onSaveStep,
  onCancelEdit,
  onStepDraftChange,
  onShowWarning,
  onDismissWarning,
}: {
  seq: Sequence
  isExpanded: boolean
  editingStep: string | null
  stepDraft: { subject: string; body: string } | null
  savingStep: boolean
  saveWarningShown: boolean
  warningDismissed: boolean
  onToggleExpand: () => void
  onToggleActive: () => void
  onEditStep: (s: Step) => void
  onSaveStep: (s: Step) => void
  onCancelEdit: () => void
  onStepDraftChange: (field: 'subject' | 'body', val: string) => void
  onShowWarning: () => void
  onDismissWarning: () => void
}) {
  const { sent_count, reply_rate } = seq.stats
  const ratePercent = Math.round(reply_rate * 100)
  const showLowReplyWarning = sent_count >= 10 && reply_rate < 0.04 && !warningDismissed
  const showStrongReply = sent_count >= 10 && reply_rate > 0.10

  return (
    <div style={styles.seqCard}>
      {/* Header */}
      <div style={styles.seqHead} onClick={onToggleExpand}>
        <ChevronRight
          size={16}
          style={{
            transform: isExpanded ? 'rotate(90deg)' : 'none',
            transition: `transform ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
            color: isExpanded ? t.text.primaryBrand : t.text.muted,
            flexShrink: 0,
          }}
        />
        <div style={styles.seqHeadInfo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={styles.seqName}>{seq.name}</span>
            {/* Feature 4: strong reply rate chip */}
            {showStrongReply && (
              <span style={styles.strongReplyChip}>
                Strong reply rate. Consider scaling volume.{' '}
                <span style={styles.strongReplyPct}>{ratePercent}%</span>
              </span>
            )}
          </div>
          {seq.segment && (
            <span style={styles.seqSeg}>
              {seq.segment === 'security_ai' ? 'Security / AI' : 'SaaS Product'}
            </span>
          )}
        </div>
        {/* Stats strip */}
        <div style={styles.statsStrip} onClick={(e) => e.stopPropagation()}>
          <Stat label="Enrolled" value={seq.stats.enrolled} />
          <Stat label="Active" value={seq.stats.active} />
          <Stat label="Replied" value={seq.stats.replied} />
          <Stat label="Rate" value={`${ratePercent}%`} />
        </div>
        {/* Active toggle */}
        <button
          type="button"
          style={{
            ...styles.toggleBtn,
            background: seq.is_active ? tokens.tealLight : t.background.muted,
            color: seq.is_active ? tokens.primary : t.text.muted,
          }}
          onClick={(e) => { e.stopPropagation(); onToggleActive() }}
        >
          {seq.is_active ? 'Active' : 'Inactive'}
        </button>
      </div>

      {/* Feature 4: low reply rate warning banner */}
      {showLowReplyWarning && (
        <div style={styles.lowReplyBanner}>
          <span style={{ flex: 1 }}>
            Reply rate below 4% after 10 or more sends. Consider rewriting the opening line before sending more.
          </span>
          <button
            type="button"
            style={styles.bannerDismiss}
            onClick={(e) => { e.stopPropagation(); onDismissWarning() }}
          >
            X
          </button>
        </div>
      )}

      {/* Step rail */}
      {isExpanded && (
        <div style={styles.stepRail}>
          {seq.steps.map((step) => {
            const isEditing = editingStep === step.id
            return (
              <div key={step.id} style={styles.stepTile}>
                <div style={styles.stepTileHead}>
                  <div style={styles.stepOffsetBadge}>D+{step.day_offset}</div>
                  <ChannelIcon channel={step.channel} />
                  <div style={styles.stepPreview}>
                    {step.channel === 'email' && step.subject_template
                      ? step.subject_template.slice(0, 50)
                      : step.body_template.slice(0, 60)}
                    {(step.channel === 'email' ? (step.subject_template?.length ?? 0) > 50 : step.body_template.length > 60) ? '...' : ''}
                  </div>
                  <button type="button" style={styles.editStepBtn} onClick={() => onEditStep(step)}>
                    Edit
                  </button>
                </div>

                {isEditing && (
                  <div style={styles.stepEditor}>
                    {!saveWarningShown && (
                      <div style={styles.editWarn}>
                        Editing templates affects future renders only. Sent snapshots are preserved.
                        <button type="button" style={styles.warnDismiss} onClick={onShowWarning}>OK</button>
                      </div>
                    )}
                    <div style={styles.varLegend}>
                      {VARIABLES.map((v) => (
                        <code key={v} style={styles.varChip}>{v}</code>
                      ))}
                    </div>
                    {step.channel === 'email' && (
                      <div style={styles.editorField}>
                        <label style={styles.editorLabel}>Subject</label>
                        <input
                          style={styles.editorInput}
                          value={stepDraft?.subject ?? ''}
                          onChange={(e) => onStepDraftChange('subject', e.target.value)}
                        />
                      </div>
                    )}
                    <div style={styles.editorField}>
                      <label style={styles.editorLabel}>Body</label>
                      <textarea
                        style={styles.editorTextarea}
                        value={stepDraft?.body ?? ''}
                        onChange={(e) => onStepDraftChange('body', e.target.value)}
                        rows={6}
                      />
                    </div>
                    <div style={styles.editorActions}>
                      <button
                        type="button"
                        style={{ ...styles.primaryBtn, opacity: savingStep ? 0.6 : 1 }}
                        onClick={() => onSaveStep(step)}
                        disabled={savingStep}
                      >
                        {savingStep ? 'Saving...' : 'Save changes'}
                      </button>
                      <button type="button" style={styles.outlineBtn} onClick={onCancelEdit}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={styles.stat}>
      <span style={styles.statLabel}>{label}</span>
      <span style={styles.statValue}>{value}</span>
    </div>
  )
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === 'email') return <Mail size={13} color={t.text.muted} />
  return <Linkedin size={13} color={t.text.muted} />
}

const styles: Record<string, CSSProperties> = {
  loading: { fontFamily: fonts.body, fontSize: 14, color: t.text.muted, padding: '24px 0' },
  seqCard: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 10,
    overflow: 'hidden',
  },
  seqHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '14px 16px',
    cursor: 'pointer',
    borderBottom: `1px solid ${t.border.subtle}`,
  },
  seqHeadInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  seqName: {
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    color: t.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  seqSeg: { fontFamily: fonts.body, fontSize: 11, color: t.text.muted },
  statsStrip: { display: 'flex', gap: 20, flexShrink: 0 },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  statLabel: { fontFamily: fonts.body, fontSize: 10, color: t.text.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  statValue: { fontFamily: mono, fontSize: 13, fontWeight: 700, color: t.text.primary },
  toggleBtn: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    padding: '4px 10px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  stepRail: {
    display: 'flex',
    gap: 0,
    flexDirection: 'column',
    padding: 16,
  },
  stepTile: {
    borderBottom: `1px solid ${t.border.subtle}`,
    paddingBottom: 12,
    marginBottom: 12,
  },
  stepTileHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  stepOffsetBadge: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: 700,
    color: tokens.primary,
    background: tokens.tealLight,
    borderRadius: 4,
    padding: '2px 6px',
    flexShrink: 0,
  },
  stepPreview: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  editStepBtn: {
    background: 'none',
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.primaryBrand,
    padding: '3px 10px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  stepEditor: {
    marginTop: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    background: tokens.bg,
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 8,
    padding: 14,
  },
  editWarn: {
    background: tokens.goldLight,
    border: `1px solid ${tokens.gold}`,
    borderRadius: 6,
    padding: '8px 12px',
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.goldDark,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  warnDismiss: {
    background: 'none',
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.goldDark,
    fontWeight: 700,
    cursor: 'pointer',
    flexShrink: 0,
  },
  varLegend: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  varChip: {
    fontFamily: mono,
    fontSize: 11,
    background: t.background.tint1,
    color: tokens.primary,
    border: `1px solid ${t.border.brand}`,
    borderRadius: 4,
    padding: '2px 6px',
  },
  editorField: { display: 'flex', flexDirection: 'column', gap: 6 },
  editorLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    color: t.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  editorInput: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    padding: '8px 10px',
    outline: 'none',
  },
  editorTextarea: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    padding: '8px 10px',
    outline: 'none',
    resize: 'vertical',
    lineHeight: 1.5,
  },
  editorActions: { display: 'flex', gap: 8 },
  primaryBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    cursor: 'pointer',
  },
  outlineBtn: {
    background: tokens.surface,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 13,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '7px 12px',
    cursor: 'pointer',
  },
  // Feature 4: reply rate diagnostic styles
  lowReplyBanner: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    background: tokens.goldLight,
    border: `1px solid ${tokens.gold}`,
    borderLeft: `3px solid ${tokens.gold}`,
    borderRadius: 8,
    padding: '12px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    margin: '0 16px 12px',
  },
  bannerDismiss: {
    background: 'none',
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
    cursor: 'pointer',
    flexShrink: 0,
    padding: '0 4px',
  },
  strongReplyChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.greenLight,
    color: tokens.green,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 6,
    padding: '3px 8px',
  },
  strongReplyPct: {
    fontFamily: mono,
    fontSize: 11,
    fontWeight: 700,
  },
}
