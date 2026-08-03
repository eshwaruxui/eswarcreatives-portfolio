// Single shortlist candidate card: score bar, reasons, "Add to leads" inline
// expansion (not a modal — matches the Section C spec), and "Ignore".
import { useState } from 'react'
import type { CSSProperties } from 'react'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { mono } from '../../admin/ui'
import { showToast } from '../../admin/toast'
import { ScoreRing } from '../shared/ScoreRing'
import {
  candidateInitials,
  splitName,
  type ShortlistCandidate,
  type Vertical,
} from './types'

export function CandidateCard({
  candidate,
  vertical,
  onUpdated,
}: {
  candidate: ShortlistCandidate
  vertical: Vertical
  onUpdated: (updated: ShortlistCandidate) => void
}) {
  const [fading, setFading] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [observation, setObservation] = useState('')
  const [saving, setSaving] = useState(false)

  const lowConfidence = candidate.confidence === 'low'
  const obsLen = observation.trim().length
  const obsValid = obsLen >= 100 && obsLen <= 200

  async function handleIgnore() {
    setFading(true)
    await supabase
      .from('shortlist_candidates')
      .update({ decision: 'ignored' })
      .eq('id', candidate.id)
    setTimeout(() => onUpdated({ ...candidate, decision: 'ignored' }), 200)
  }

  async function handleConfirmAdd() {
    if (!obsValid) return
    setSaving(true)
    const { first, last } = splitName(candidate.extracted_name)
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .insert({
        first_name: first,
        last_name: last,
        company: candidate.extracted_company ?? 'Unknown',
        role_title: candidate.extracted_title,
        linkedin_url: candidate.extracted_linkedin_url,
        email: email.trim() || null,
        specific_observation: observation.trim(),
        vertical,
        segment: 'saas_product',
        source: 'smart_shortlist',
        status: 'new',
        icp_score: candidate.icp_score,
        icp_match_reason: candidate.icp_match_reason,
      })
      .select('id')
      .single()

    if (leadErr || !lead) {
      showToast('Could not add lead. Please try again.', 'error')
      setSaving(false)
      return
    }

    await supabase
      .from('shortlist_candidates')
      .update({ decision: 'added', lead_id: lead.id })
      .eq('id', candidate.id)

    setSaving(false)
    showToast('Lead added', 'success')
    onUpdated({ ...candidate, decision: 'added', lead_id: lead.id })
  }

  return (
    <div
      style={{
        ...s.card,
        ...(lowConfidence ? s.cardLowConfidence : null),
        opacity: fading ? 0 : 1,
        transition: `opacity ${motionTokens.durationBase} ${motionTokens.easeExit}`,
      }}
    >
      <div style={s.topRow}>
        <span style={s.avatar}>{candidateInitials(candidate.extracted_name)}</span>
        <div style={s.identity}>
          <span style={s.name}>{candidate.extracted_name ?? 'Unknown'}</span>
          {candidate.extracted_title && <span style={s.subline}>{candidate.extracted_title}</span>}
          {candidate.extracted_company && <span style={s.subline}>{candidate.extracted_company}</span>}
        </div>
        {candidate.extracted_linkedin_url && (
          <a
            href={candidate.extracted_linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            style={s.extLink}
            aria-label="Open LinkedIn profile"
          >
            <ExternalLink size={13} />
          </a>
        )}
      </div>

      <div style={s.scoreBlock}>
        <span style={s.scoreLabel}>ICP match</span>
        <ScoreRing score={candidate.icp_score} interactive={false} size={22} />
      </div>

      {candidate.icp_match_reason && <p style={s.reason}>{candidate.icp_match_reason}</p>}

      {lowConfidence && (
        <div style={s.confidenceRow}>
          <AlertTriangle size={14} color={tokens.gold} />
          <span style={s.confidenceText}>Low confidence — verify manually</span>
        </div>
      )}

      {candidate.channel_reason && <p style={s.channelReason}>{candidate.channel_reason}</p>}

      {!addOpen ? (
        <div style={s.ctaRow}>
          <button type="button" style={s.addBtn} onClick={() => setAddOpen(true)}>
            Add to leads
          </button>
          <button type="button" style={s.ignoreBtn} onClick={handleIgnore}>
            Ignore
          </button>
        </div>
      ) : (
        <div style={s.expansion}>
          <label style={s.fieldLabel}>
            Email
            <input
              type="email"
              style={s.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Paste email from Apollo"
            />
          </label>
          <label style={s.fieldLabel}>
            Specific observation
            <textarea
              style={s.textarea}
              rows={3}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Describe the UX gap observed on their product..."
            />
          </label>
          <span
            style={{
              ...s.charCount,
              color: obsLen > 0 && !obsValid ? tokens.goldDark : t.text.muted,
            }}
          >
            {obsLen} chars (target 100-200)
          </span>
          <div style={s.expansionActions}>
            <button
              type="button"
              style={{ ...s.confirmBtn, opacity: saving || !obsValid ? 0.5 : 1 }}
              onClick={handleConfirmAdd}
              disabled={saving || !obsValid}
            >
              {saving ? 'Adding...' : 'Confirm and add'}
            </button>
            <button
              type="button"
              style={s.cancelLink}
              onClick={() => { setAddOpen(false); setEmail(''); setObservation('') }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, CSSProperties> = {
  card: {
    background: t.background.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    display: 'flex',
    flexDirection: 'column',
  },
  cardLowConfidence: { borderColor: t.border.warning },
  topRow: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: t.background.tint2,
    color: tokens.primary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  identity: { display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 },
  name: { fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: t.text.primary },
  subline: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary },
  extLink: { color: t.text.urlLink, display: 'flex', flexShrink: 0, marginTop: 3 },
  scoreBlock: { marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 },
  scoreLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    color: t.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reason: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontStyle: 'italic',
    color: t.text.secondary,
    margin: '6px 0 0',
    lineHeight: 1.45,
  },
  confidenceRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 },
  confidenceText: { fontFamily: fonts.body, fontSize: 11, color: t.text.muted },
  channelReason: { fontFamily: fonts.body, fontSize: 11, color: t.text.muted, margin: '4px 0 0' },
  ctaRow: { display: 'flex', gap: 8, marginTop: 12 },
  addBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
  },
  ignoreBtn: {
    background: 'none',
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 500,
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
  },
  expansion: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: `1px solid ${t.border.subtle}`,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.tertiary,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 400,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    padding: '7px 10px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 400,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    padding: '7px 10px',
    outline: 'none',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  charCount: { fontFamily: mono, fontSize: 11, alignSelf: 'flex-end' },
  expansionActions: { display: 'flex', alignItems: 'center', gap: 12 },
  confirmBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    padding: '8px 14px',
    cursor: 'pointer',
  },
  cancelLink: {
    background: 'none',
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.muted,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
}
