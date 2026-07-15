// Activity tab: flat feed of last 200 touches, filterable by channel and status.
// Includes scheduled touches with inline Confirm and Send action.
import { useEffect, useState } from 'react'
import { Eye, Mail, Linkedin, Clock, Loader2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts } from '../../theme'
import { mono, formatDate } from '../ui'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { LeadDrawer } from './LeadDrawer'

type ActivityRow = {
  id: string
  channel: string
  status: string
  scheduled_for: string
  recipient_timezone: string | null
  sent_at: string | null
  opened_at: string | null
  bounced_at: string | null
  skipped_reason: string | null
  lead: {
    id: string
    first_name: string
    last_name: string | null
    company: string
  } | null
  enrollment: {
    sequence: { name: string } | null
  } | null
  step: { step_number: number } | null
}

const STATUS_TONES: Record<string, { bg: string; fg: string }> = {
  sent:      { bg: tokens.greenLight, fg: tokens.green },
  skipped:   { bg: tokens.goldLight, fg: tokens.goldDark },
  cancelled: { bg: t.background.muted, fg: t.text.tertiary },
  failed:    { bg: tokens.rubyLight, fg: tokens.ruby },
  scheduled: { bg: tokens.goldLight, fg: tokens.goldDark },
}

function formatScheduledFor(isoString: string, tz: string | null): string {
  const tzToUse = tz ?? 'UTC'
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: tzToUse,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(isoString))
  } catch {
    return formatDate(isoString)
  }
}

function useConfirmScheduledTouch(onSuccess: (id: string) => void) {
  const [confirming, setConfirming] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function confirm(touchId: string) {
    setConfirming(touchId)
    setErrors((e) => { const n = { ...e }; delete n[touchId]; return n })
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token ?? ''
      const { data, error: fnErr } = await supabase.functions.invoke('confirm-scheduled-touch', {
        body: { touch_id: touchId },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (fnErr || !data || data.error) {
        setErrors((e) => ({ ...e, [touchId]: 'Could not send. Please try again.' }))
      } else {
        onSuccess(touchId)
      }
    } catch {
      setErrors((e) => ({ ...e, [touchId]: 'Network error. Please try again.' }))
    } finally {
      setConfirming(null)
    }
  }

  return { confirming, errors, confirm }
}

export function ActivityTab({ onOpenLeadDrawer }: { onOpenLeadDrawer: (id: string) => void }) {
  const { isMobile } = useBreakpoint()
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterChannel, setFilterChannel] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [openLeadId, setOpenLeadId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function load() {
    setLoading(true)
    let q = supabase
      .from('outreach_touches')
      .select(`
        id, channel, status, scheduled_for, recipient_timezone, sent_at, opened_at, bounced_at, skipped_reason,
        lead:leads!lead_id (id, first_name, last_name, company),
        enrollment:lead_enrollments!enrollment_id (sequence:sequences!sequence_id (name)),
        step:sequence_steps!step_id (step_number)
      `)
      .order('sent_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200)

    if (filterChannel) q = q.eq('channel', filterChannel)
    if (filterStatus) {
      q = q.eq('status', filterStatus)
    }

    const { data } = await q
    setRows((data ?? []) as ActivityRow[])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterChannel, filterStatus])

  const { confirming, errors, confirm } = useConfirmScheduledTouch((id) => {
    setRows((prev) => prev.map((r) => r.id === id ? { ...r, status: 'sent' } : r))
    showToast('Email sent successfully.')
  })

  return (
    <>
      {openLeadId && (
        <LeadDrawer
          leadId={openLeadId}
          onClose={() => { setOpenLeadId(null); load() }}
        />
      )}
      {toast && <div style={styles.toast}>{toast}</div>}

      <div style={{ ...styles.filterBar, ...(isMobile ? styles.filterBarMobile : null) }}>
        <select style={styles.filterSelect} value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)}>
          <option value="">All channels</option>
          <option value="email">Email</option>
          <option value="linkedin_connect">LinkedIn Connect</option>
          <option value="linkedin_dm">LinkedIn DM</option>
        </select>
        <select style={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="scheduled">Scheduled</option>
          <option value="skipped">Skipped</option>
          <option value="cancelled">Cancelled</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {loading ? (
        <p style={styles.loading}>Loading activity...</p>
      ) : rows.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyHeading}>No activity yet</p>
          <p style={styles.emptyBody}>Enroll your first lead to get started.</p>
        </div>
      ) : isMobile ? (
        <div style={styles.cardStack}>
          {rows.map((row) => {
            const tone = STATUS_TONES[row.status] ?? { bg: t.background.muted, fg: t.text.muted }
            const isScheduled = row.status === 'scheduled'
            const isConfirming = confirming === row.id
            const rowError = errors[row.id]
            return (
              <div key={row.id} style={styles.mobileCard}>
                <div style={styles.mobileCardTop} onClick={() => row.lead && onOpenLeadDrawer(row.lead.id)}>
                  <div style={styles.leadCell}>
                    <strong style={styles.leadName}>
                      {row.lead ? `${row.lead.first_name} ${row.lead.last_name ?? ''}` : 'Unknown'}
                    </strong>
                    {row.lead && <span style={styles.leadCompany}>{row.lead.company}</span>}
                  </div>
                  <ChannelIcon channel={row.channel} />
                </div>
                <p style={styles.mobileCardSubject}>
                  {row.enrollment?.sequence?.name ?? 'Sequence'}
                  {row.step ? ` · Step ${row.step.step_number}` : ''}
                </p>
                <div style={styles.mobileCardBottom}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {isScheduled && <Clock size={11} color={tokens.goldDark} />}
                    <span style={{ ...styles.statusBadge, background: tone.bg, color: tone.fg }}>
                      {row.status}
                    </span>
                    {row.opened_at && <Eye size={13} color={tokens.green} />}
                    {row.bounced_at && <span style={styles.bounced}>Bounced</span>}
                  </span>
                  <span style={styles.mono}>{formatDate(row.sent_at ?? row.scheduled_for)}</span>
                </div>
                {isScheduled && row.channel === 'email' && (
                  <div onClick={(e) => e.stopPropagation()}>
                    {isConfirming ? (
                      <Loader2 size={15} color={t.text.muted} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <button
                        type="button"
                        style={styles.confirmBtnMobile}
                        disabled={!!confirming}
                        onClick={() => confirm(row.id)}
                      >
                        Confirm and Send
                      </button>
                    )}
                  </div>
                )}
                {rowError && <div style={styles.mobileCardError}>{rowError}</div>}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Time</th>
                <th style={styles.th}>Lead</th>
                <th style={styles.th}>Sequence / Step</th>
                <th style={styles.th}>Channel</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Opened</th>
                <th style={styles.th}>Bounced</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const tone = STATUS_TONES[row.status] ?? { bg: t.background.muted, fg: t.text.muted }
                const isScheduled = row.status === 'scheduled'
                const isConfirming = confirming === row.id
                const rowError = errors[row.id]
                return (
                  <>
                    <tr
                      key={row.id}
                      style={styles.tr}
                      onClick={() => row.lead && setOpenLeadId(row.lead.id)}
                    >
                      <td style={styles.td}>
                        <span style={styles.mono}>
                          {formatDate(row.sent_at ?? row.scheduled_for)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        {row.lead ? (
                          <span style={styles.leadCell}>
                            <strong style={styles.leadName}>{row.lead.first_name} {row.lead.last_name ?? ''}</strong>
                            <span style={styles.leadCompany}>{row.lead.company}</span>
                          </span>
                        ) : (
                          <span style={styles.muted}>Unknown</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.seqCell}>
                          {row.enrollment?.sequence?.name ?? '-'}
                          {row.step ? ` · Step ${row.step.step_number}` : ''}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <ChannelIcon channel={row.channel} />
                      </td>
                      <td style={styles.td}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          {isScheduled && <Clock size={12} color={tokens.goldDark} />}
                          <span style={{
                            ...styles.statusBadge,
                            background: tone.bg,
                            color: tone.fg,
                          }}>
                            {row.status}
                          </span>
                        </span>
                        {isScheduled && row.scheduled_for && (
                          <div style={styles.scheduledMeta}>
                            Sends {formatScheduledFor(row.scheduled_for, row.recipient_timezone)}
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>
                        {row.opened_at && <Eye size={14} color={tokens.green} />}
                      </td>
                      <td style={styles.td}>
                        {row.bounced_at && <span style={styles.bounced}>Bounced</span>}
                      </td>
                      <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                        {isScheduled && row.channel === 'email' && (
                          isConfirming ? (
                            <Loader2 size={15} color={t.text.muted} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <button
                              type="button"
                              style={styles.confirmBtn}
                              disabled={!!confirming}
                              onClick={() => confirm(row.id)}
                            >
                              Confirm and Send
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                    {rowError && (
                      <tr key={`${row.id}-err`}>
                        <td colSpan={8} style={styles.rowError}>{rowError}</td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === 'email') return <Mail size={14} color={t.text.muted} />
  return <Linkedin size={14} color={t.text.muted} />
}

const styles: Record<string, CSSProperties> = {
  filterBar: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterBarMobile: { flexWrap: 'nowrap', overflowX: 'auto', WebkitOverflowScrolling: 'touch' },
  filterSelect: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '7px 10px',
    outline: 'none',
    flexShrink: 0,
  },
  loading: { fontFamily: fonts.body, fontSize: 14, color: t.text.muted, padding: '24px 0' },
  emptyState: { textAlign: 'center', padding: '60px 24px' },
  emptyHeading: {
    fontFamily: fonts.heading,
    fontSize: 20,
    fontWeight: 600,
    color: t.text.primary,
    margin: '0 0 8px',
  },
  emptyBody: { fontFamily: fonts.body, fontSize: 14, color: t.text.secondary, margin: 0 },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 760 },
  th: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    color: t.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    padding: '8px 12px',
    textAlign: 'left',
    borderBottom: `1px solid ${t.border.subtle}`,
    whiteSpace: 'nowrap',
  },
  tr: { cursor: 'pointer' },
  td: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    padding: '10px 12px',
    borderBottom: `1px solid ${t.border.subtle}`,
    verticalAlign: 'middle',
  },
  mono: { fontFamily: mono, fontSize: 12, color: t.text.muted },
  muted: { color: t.text.muted, fontStyle: 'italic' },
  leadCell: { display: 'flex', flexDirection: 'column', gap: 1 },
  leadName: { fontFamily: fonts.body, fontSize: 13, color: t.text.primary, fontWeight: 600 },
  leadCompany: { fontFamily: fonts.body, fontSize: 11, color: t.text.muted },
  seqCell: { fontFamily: fonts.body, fontSize: 12, color: t.text.secondary },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'capitalize',
  },
  scheduledMeta: {
    fontFamily: mono,
    fontSize: 11,
    color: t.text.muted,
    marginTop: 2,
  },
  bounced: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: tokens.ruby,
    fontWeight: 600,
  },
  confirmBtn: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    border: 'none',
    borderRadius: 6,
    padding: '5px 10px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  rowError: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.ruby,
    padding: '4px 12px 8px',
    borderBottom: `1px solid ${t.border.subtle}`,
  },

  // Mobile card list
  cardStack: { display: 'flex', flexDirection: 'column', gap: 8 },
  mobileCard: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 10,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  mobileCardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: 'pointer' },
  mobileCardSubject: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.secondary,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  mobileCardBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  mobileCardError: { fontFamily: fonts.body, fontSize: 12, color: tokens.ruby },
  // 44px min tap target per the portal-wide rule (spec suggested 32px to match
  // the desktop table's inline button, but the 44px minimum takes precedence).
  confirmBtnMobile: {
    background: tokens.primary,
    color: t.text.onPrimary,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    border: 'none',
    borderRadius: 8,
    padding: '8px 14px',
    minHeight: 44,
    cursor: 'pointer',
    width: '100%',
  },
  toast: {
    position: 'fixed',
    bottom: 24,
    left: '50%',
    transform: 'translateX(-50%)',
    background: tokens.primary,
    color: '#fff',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    borderRadius: 8,
    padding: '10px 20px',
    zIndex: 9999,
    pointerEvents: 'none' as const,
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
  },
}
