import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { t, fonts } from '../../portal/theme'
import { SkeletonRow } from '../../portal/components/shared/SkeletonRow'
import { formatPortalDateTime } from '../../portal/utils/formatDate'

// Status values match the outreach_touches check constraint (migration
// 0072): scheduled, sent, skipped, cancelled, failed. There is no separate
// "bounced" status - bounces are tracked via the bounced_at timestamp on an
// otherwise 'sent' touch, surfaced here as its own label.
const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Scheduled',
  sent: 'Sent',
  skipped: 'Skipped',
  cancelled: 'Cancelled',
  failed: 'Failed',
}

const STATUS_COLOR: Record<string, string> = {
  scheduled: t.text.muted,
  sent: t.border.success,
  skipped: t.text.muted,
  cancelled: t.text.muted,
  failed: t.border.danger,
}

type TouchRow = {
  id: string
  status: string
  scheduled_for: string
  sent_at: string | null
  bounced_at: string | null
  lead: { first_name: string; last_name: string | null; email: string | null } | null
  enrollment: { sequence: { name: string } | null } | null
}

export function OutreachActivityPage() {
  const [touches, setTouches] = useState<TouchRow[] | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || cancelled) return

      const { data } = await supabase
        .from('outreach_touches')
        .select(
          'id, status, scheduled_for, sent_at, bounced_at, lead:lead_id(first_name, last_name, email), enrollment:enrollment_id(sequence:sequence_id(name))',
        )
        .eq('owner_id', session.user.id)
        .order('scheduled_for', { ascending: false })
        .limit(100)

      if (!cancelled) setTouches((data as unknown as TouchRow[]) ?? [])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div style={styles.wrap}>
      <h1 style={styles.title}>Your activity</h1>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Recipient</th>
              <th style={styles.th}>Sequence</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>When</th>
            </tr>
          </thead>
          <tbody>
            {touches === null &&
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={4} />)}

            {touches !== null && touches.length === 0 && (
              <tr>
                <td colSpan={4} style={styles.emptyCell}>
                  No activity yet. Enroll leads into a sequence to start sending.
                </td>
              </tr>
            )}

            {touches?.map((touch) => (
              <tr key={touch.id}>
                <td style={styles.td}>
                  {touch.lead
                    ? [touch.lead.first_name, touch.lead.last_name].filter(Boolean).join(' ')
                    : '—'}
                </td>
                <td style={styles.td}>{touch.enrollment?.sequence?.name || '—'}</td>
                <td style={styles.td}>
                  <span style={{ color: STATUS_COLOR[touch.status] || t.text.muted, fontWeight: 600 }}>
                    {STATUS_LABEL[touch.status] || touch.status}
                  </span>
                  {touch.bounced_at && <span style={styles.bounced}> · Bounced</span>}
                </td>
                <td style={styles.td}>
                  {formatPortalDateTime(touch.sent_at || touch.scheduled_for)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const styles: Record<string, any> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960 },
  title: { fontFamily: fonts.heading, fontSize: 22, color: t.text.primary, margin: 0 },
  tableWrap: { overflowX: 'auto', border: `1px solid ${t.border.subtle}`, borderRadius: 10 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    padding: '10px 16px',
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.muted,
    borderBottom: `1px solid ${t.border.subtle}`,
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '12px 16px',
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    borderBottom: `1px solid ${t.border.subtle}`,
    whiteSpace: 'nowrap',
  },
  bounced: { fontSize: 12, color: t.border.danger },
  emptyCell: {
    padding: '32px 16px',
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.secondary,
  },
}
