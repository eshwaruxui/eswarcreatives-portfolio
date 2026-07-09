// Activity tab: flat feed of last 200 touches, filterable by channel and status.
// Click any row to open the lead drawer.
import { useEffect, useState } from 'react'
import { Eye, Mail, Linkedin } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts } from '../../theme'
import { mono, formatDate } from '../ui'
import { LeadDrawer } from './LeadDrawer'

type ActivityRow = {
  id: string
  channel: string
  status: string
  scheduled_for: string
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
  scheduled: { bg: tokens.tealLight, fg: tokens.primary },
}

export function ActivityTab({ onOpenLeadDrawer }: { onOpenLeadDrawer: (id: string) => void }) {
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filterChannel, setFilterChannel] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [openLeadId, setOpenLeadId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    let q = supabase
      .from('outreach_touches')
      .select(`
        id, channel, status, scheduled_for, sent_at, opened_at, bounced_at, skipped_reason,
        lead:leads!lead_id (id, first_name, last_name, company),
        enrollment:lead_enrollments!enrollment_id (sequence:sequences!sequence_id (name)),
        step:sequence_steps!step_id (step_number)
      `)
      .not('status', 'eq', 'scheduled')
      .order('sent_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(200)

    if (filterChannel) q = q.eq('channel', filterChannel)
    if (filterStatus) q = q.eq('status', filterStatus)

    const { data } = await q
    setRows((data ?? []) as ActivityRow[])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterChannel, filterStatus])

  return (
    <>
      {openLeadId && (
        <LeadDrawer
          leadId={openLeadId}
          onClose={() => { setOpenLeadId(null); load() }}
        />
      )}

      <div style={styles.filterBar}>
        <select style={styles.filterSelect} value={filterChannel} onChange={(e) => setFilterChannel(e.target.value)}>
          <option value="">All channels</option>
          <option value="email">Email</option>
          <option value="linkedin_connect">LinkedIn Connect</option>
          <option value="linkedin_dm">LinkedIn DM</option>
        </select>
        <select style={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
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
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const tone = STATUS_TONES[row.status] ?? { bg: t.background.muted, fg: t.text.muted }
                return (
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
                      <span style={{
                        ...styles.statusBadge,
                        background: tone.bg,
                        color: tone.fg,
                      }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {row.opened_at && <Eye size={14} color={tokens.green} />}
                    </td>
                    <td style={styles.td}>
                      {row.bounced_at && (
                        <span style={styles.bounced}>Bounced</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === 'email') return <Mail size={14} color={t.text.muted} />
  return <Linkedin size={14} color={t.text.muted} />
}

const styles: Record<string, CSSProperties> = {
  filterBar: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  filterSelect: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '7px 10px',
    outline: 'none',
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
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 700 },
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
  bounced: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: tokens.ruby,
    fontWeight: 600,
  },
}
