// Email preview + edit + approve modal for a scheduled outreach touch.
//
// Lifted verbatim out of TodayTab, where it had lived inline since the
// follow-up system shipped, so ActivityTab's "Awaiting approval" rows can use
// the same modal instead of growing a second implementation of it. Every
// behaviour here is TodayTab's existing behaviour, unchanged: snapshot wins
// over template, step_id is left intact on save, the backdrop doesn't close,
// unsaved edits prompt on close, "Save and Approve" persists first and only
// then approves, and the previous-emails thread is collapsed by default.
//
// It deliberately does NOT own the approve call — each tab passes its already
// wired `onApprove` (from the shared useConfirmScheduledTouch hook) so the
// approve result flows back into that tab's own row state and toast, and the
// server-side already_approved guard stays the single authority on whether a
// second approve is allowed.
import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts } from '../../theme'
import { mono, Modal } from '../../admin/ui'
import { formatPortalDate } from '../../utils/formatDate'
import { intentLabel } from '../../utils/touchLabels'

export type PreviewTouch = {
  id: string
  recipient_timezone: string | null
  scheduled_for: string
  draft_confirmed_at: string | null
  subject_snapshot: string | null
  body_snapshot: string | null
  lead: {
    id: string
    first_name: string
    last_name: string | null
    company: string
    email: string | null
    specific_observation: string | null
    unsubscribe_token: string
  } | null
  step: {
    subject_template: string | null
    body_template: string | null
    day_offset: number | null
  } | null
}

// The exact column set a PreviewTouch needs. Exported so every caller fetches
// the same shape — ActivityTab's list query is much narrower than this and
// has to top up before it can open the modal.
export const PREVIEW_TOUCH_SELECT = `
  id, recipient_timezone, scheduled_for, draft_confirmed_at, subject_snapshot, body_snapshot,
  lead:leads!lead_id (id, first_name, last_name, company, email, specific_observation, unsubscribe_token),
  step:sequence_steps!step_id (subject_template, body_template, day_offset)
`

// Mirrors the substitution + grammar fix applied by the confirm-scheduled-touch
// edge function, so the preview shows exactly what will be sent (not the raw
// template with unresolved {{variables}}).
export function resolveTemplate(template: string, lead: NonNullable<PreviewTouch['lead']>): string {
  const vars: Record<string, string> = {
    first_name: lead.first_name,
    company: lead.company,
    specific_observation: lead.specific_observation ?? '',
    flow: 'product',
    unsubscribe_url: `https://www.eswarcreatives.in/unsubscribe/${lead.unsubscribe_token}`,
    topic: '{{topic}}',
  }
  let out = template
  for (const [key, val] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, val)
  }
  if (lead.company.slice(-1).toLowerCase() === 's') {
    out = out.replaceAll(`${lead.company}'s`, `${lead.company}'`)
  }
  return out
}

type ThreadTouch = {
  id: string
  sent_at: string
  subject: string
  body: string
}

// subject_snapshot/body_snapshot only get written by the save handler below
// (a still-scheduled touch has no snapshot until an admin edits and saves
// it) — so a non-null snapshot always means "this was manually edited," and
// must win over re-rendering the template, which would silently discard the
// edit. Snapshot is checked first, not last.
function initialSubject(touch: PreviewTouch): string {
  if (touch.subject_snapshot) return touch.subject_snapshot
  return touch.lead ? resolveTemplate(touch.step?.subject_template ?? '', touch.lead) : ''
}
function initialBody(touch: PreviewTouch): string {
  if (touch.body_snapshot) return touch.body_snapshot
  return touch.lead ? resolveTemplate(touch.step?.body_template ?? '', touch.lead) : ''
}

export function TouchPreviewModal({
  touch: initialTouch,
  canApprove,
  approveError,
  onApprove,
  onSaved,
  onApproved,
  onClose,
}: {
  touch: PreviewTouch
  // Whether this touch is still awaiting approval. False for an already
  // approved touch — the server's already_approved guard would reject a
  // second call anyway, so the action shouldn't be offered.
  canApprove: boolean
  approveError?: string
  onApprove: (touchId: string) => Promise<boolean>
  // Lets the owning tab keep its own row state in sync with a saved edit.
  onSaved?: (touch: PreviewTouch) => void
  onApproved?: (touchId: string) => void
  onClose: () => void
}) {
  const [touch, setTouch] = useState<PreviewTouch>(initialTouch)
  const [subjectEdit, setSubjectEdit] = useState(() => initialSubject(initialTouch))
  const [bodyEdit, setBodyEdit] = useState(() => initialBody(initialTouch))
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [threadTouches, setThreadTouches] = useState<ThreadTouch[]>([])
  const [threadOpen, setThreadOpen] = useState(false)

  const leadId = touch.lead?.id

  useEffect(() => {
    const lead = touch.lead
    if (!lead) return
    let cancelled = false
    async function loadThread() {
      const { data } = await supabase
        .from('outreach_touches')
        .select(`
          id, sent_at, subject_snapshot, body_snapshot,
          step:sequence_steps!step_id (subject_template, body_template)
        `)
        .eq('lead_id', lead!.id)
        .eq('status', 'sent')
        .order('sent_at', { ascending: false })
      type ThreadRow = {
        id: string
        sent_at: string | null
        subject_snapshot: string | null
        body_snapshot: string | null
        step: { subject_template: string | null; body_template: string | null } | null
      }
      if (cancelled) return
      const rows = (data ?? []) as ThreadRow[]
      setThreadTouches(rows.map((r) => ({
        id: r.id,
        sent_at: r.sent_at ?? '',
        // Sent touches already carry the exact content that went out (the
        // edge function writes the resolved snapshot at send time) — prefer
        // that historical record over re-resolving the template with current
        // lead data, which could differ from what was actually sent.
        subject: r.subject_snapshot ?? (r.step?.subject_template ? resolveTemplate(r.step.subject_template, lead!) : ''),
        body: r.body_snapshot ?? (r.step?.body_template ? resolveTemplate(r.step.body_template, lead!) : ''),
      })))
    }
    loadThread()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadId])

  const dirty = subjectEdit !== initialSubject(touch) || bodyEdit !== initialBody(touch)

  function handleCloseRequest() {
    if (dirty && !window.confirm('You have unsaved changes. Close anyway?')) return
    onClose()
  }

  // step_id is deliberately left untouched — nulling it here used to be how
  // this saved edit "won" over re-rendering the template on next open, but it
  // also broke every other consumer of touch.step (the Due Today step-number
  // label, the send modal's title, the earliest-touch dedupe, and now
  // ActivityTab's next-due-step filter) for the rest of that touch's life.
  // initialSubject/initialBody prefer a non-null snapshot over the template
  // directly, so step_id can stay intact and the edit is still preserved.
  // Shared by both "Save changes" and "Save and Approve" so the two never
  // drift apart.
  async function persistEdits(current: PreviewTouch): Promise<PreviewTouch> {
    await supabase
      .from('outreach_touches')
      .update({ subject_snapshot: subjectEdit, body_snapshot: bodyEdit })
      .eq('id', current.id)
    const updated: PreviewTouch = {
      ...current,
      subject_snapshot: subjectEdit,
      body_snapshot: bodyEdit,
    }
    setTouch(updated)
    onSaved?.(updated)
    return updated
  }

  async function handleSave() {
    setSaving(true)
    await persistEdits(touch)
    setSaving(false)
  }

  // Lets an admin edit and approve in one step, instead of Save changes ->
  // Close -> find the row again -> Approve.
  async function handleSaveAndApprove() {
    setApproving(true)
    const current = dirty ? await persistEdits(touch) : touch
    const approved = await onApprove(current.id)
    setApproving(false)
    if (approved) {
      onApproved?.(current.id)
      onClose()
    }
  }

  const busy = saving || approving

  return (
    <Modal
      title={`${intentLabel(touch.step?.day_offset ?? null)} preview`}
      onClose={handleCloseRequest}
      maxWidth={600}
      closeOnBackdrop={false}
    >
      <div style={styles.previewBody}>
        <div style={styles.previewField}>
          <span style={styles.previewLabel}>To</span>
          <span style={styles.previewValue}>
            {touch.lead
              ? `${touch.lead.first_name} ${touch.lead.last_name ?? ''} <${touch.lead.email ?? 'no email on file'}>`
              : 'Unknown lead'}
          </span>
        </div>
        <div style={styles.previewField}>
          <span style={styles.previewLabel}>Subject</span>
          <input
            type="text"
            style={styles.previewInput}
            value={subjectEdit}
            onChange={(e) => setSubjectEdit(e.target.value)}
          />
        </div>
        <div style={styles.previewField}>
          <span style={styles.previewLabel}>Body</span>
          <textarea
            style={styles.previewTextarea}
            value={bodyEdit}
            onChange={(e) => setBodyEdit(e.target.value)}
          />
        </div>
        {threadTouches.length > 0 && (
          <>
            <div style={styles.previewDivider} />
            <button
              type="button"
              style={styles.threadToggle}
              onClick={() => setThreadOpen((o) => !o)}
            >
              <span style={styles.threadToggleLabel}>Previous emails ({threadTouches.length})</span>
              {threadOpen ? (
                <ChevronUp size={16} color={t.text.muted} />
              ) : (
                <ChevronDown size={16} color={t.text.muted} />
              )}
            </button>
            {threadOpen && (
              <div style={styles.threadList}>
                {threadTouches.map((pt) => (
                  <PriorEmailCard key={pt.id} touch={pt} />
                ))}
              </div>
            )}
          </>
        )}
        {/* H1/H9: the approve failure has to be readable here. On ActivityTab
            the row that would otherwise carry it is behind this modal, so
            without this the click would look like it silently did nothing. */}
        {approveError && <div style={styles.previewError}>{approveError}</div>}
        <div style={styles.previewActions}>
          {dirty && (
            <button
              type="button"
              style={{
                ...(canApprove ? styles.previewSaveSecondaryBtn : styles.previewSaveBtn),
                opacity: busy ? 0.6 : 1,
              }}
              onClick={handleSave}
              disabled={busy}
            >
              {saving ? 'Saving...' : canApprove ? 'Save only' : 'Save changes'}
            </button>
          )}
          {canApprove && (
            <button
              type="button"
              style={{ ...styles.previewApproveBtn, opacity: busy ? 0.6 : 1 }}
              onClick={handleSaveAndApprove}
              disabled={busy}
            >
              {approving ? 'Approving...' : 'Save and Approve'}
            </button>
          )}
          <button
            type="button"
            style={styles.previewCloseBtn}
            onClick={handleCloseRequest}
            disabled={busy}
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}

function PriorEmailCard({ touch }: { touch: ThreadTouch }) {
  const [expanded, setExpanded] = useState(false)
  const [overflowing, setOverflowing] = useState(false)
  const bodyRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = bodyRef.current
    if (el) setOverflowing(el.scrollHeight > el.clientHeight + 1)
  }, [touch.body])

  return (
    <div style={styles.threadCard}>
      <span style={styles.threadDate}>{formatPortalDate(touch.sent_at)}</span>
      <span style={styles.threadSubject}>{touch.subject || '(no subject)'}</span>
      <p
        ref={bodyRef}
        style={{ ...styles.threadBody, ...(expanded ? null : styles.threadBodyClamped) }}
      >
        {touch.body || '(no content)'}
      </p>
      {!expanded && overflowing && (
        <button type="button" style={styles.threadShowMore} onClick={() => setExpanded(true)}>
          Show more
        </button>
      )}
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  previewBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    maxHeight: '70vh',
    overflowY: 'auto' as const,
  },
  previewField: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  previewLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    color: t.text.tertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.4,
  },
  previewValue: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
  },
  previewInput: {
    width: '100%',
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    background: t.background.subtle,
    border: `1px solid ${t.border.default}`,
    borderRadius: 4,
    padding: 8,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  previewTextarea: {
    width: '100%',
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 1.6,
    color: t.text.primary,
    background: t.background.subtle,
    border: `1px solid ${t.border.default}`,
    borderRadius: 4,
    padding: 8,
    outline: 'none',
    minHeight: 200,
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  previewError: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.ruby,
  },
  previewActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
  },
  previewSaveBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    cursor: 'pointer',
  },
  // Secondary treatment for "Save only" once "Save and Approve" is present,
  // so the filled/primary look is reserved for the one recommended action.
  previewSaveSecondaryBtn: {
    background: 'none',
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '8px 16px',
    cursor: 'pointer',
  },
  previewApproveBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '8px 16px',
    cursor: 'pointer',
  },
  previewCloseBtn: {
    background: tokens.surface,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '8px 16px',
    cursor: 'pointer',
  },
  previewDivider: {
    height: 1,
    background: t.border.subtle,
  },
  threadToggle: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
  },
  threadToggleLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
  },
  threadList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  threadCard: {
    background: t.background.subtle,
    borderRadius: 8,
    padding: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  threadDate: {
    alignSelf: 'flex-end' as const,
    fontFamily: mono,
    fontSize: 11,
    color: t.text.muted,
  },
  threadSubject: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: t.text.primary,
  },
  threadBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap' as const,
    margin: 0,
  },
  threadBodyClamped: {
    display: '-webkit-box' as const,
    WebkitLineClamp: 4,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  },
  threadShowMore: {
    alignSelf: 'flex-start' as const,
    background: 'none',
    border: 'none',
    padding: 0,
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.urlLink,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
}
