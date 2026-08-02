// Enquiries tab: list of design systems enquiry submissions with a
// response-deadline countdown, opening into a detail drawer with a
// conversation thread and a convert-to-lead action.
import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { CSSProperties } from 'react'
import { useSearchParams } from 'react-router'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts } from '../../theme'
import { EmptyState } from '../ui'
import { EnquiryDrawer, type EnquiryStatus } from '../../components/EnquiryDrawer'

type EnquiryRow = {
  id: string
  first_name: string
  company_name: string
  company_url: string
  buyer_email: string
  platforms: string[]
  team_size: string
  funding_stage: string
  problem: string
  start_timeline: string
  status: EnquiryStatus
  responded_at: string | null
  converted_lead_id: string | null
  created_at: string
}

type Tone = 'green' | 'amber' | 'red' | 'teal'

const TONE_COLORS: Record<Tone, { bg: string; fg: string }> = {
  green: { bg: tokens.greenLight, fg: tokens.green },
  amber: { bg: tokens.goldLight, fg: tokens.goldDark },
  red: { bg: tokens.rubyLight, fg: tokens.ruby },
  teal: { bg: tokens.tealLight, fg: tokens.primary },
}

function countdown(status: EnquiryStatus, createdAt: string): { label: string; tone: Tone } {
  if (status === 'responded' || status === 'converted') return { label: 'Responded', tone: 'green' }
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3_600_000
  if (hours > 48) return { label: 'Overdue', tone: 'red' }
  if (hours > 24) return { label: `${Math.max(0, Math.ceil(48 - hours))}h left`, tone: 'amber' }
  return { label: 'New', tone: 'teal' }
}

function CountdownBadge({ status, createdAt }: { status: EnquiryStatus; createdAt: string }) {
  const { label, tone } = countdown(status, createdAt)
  const colors = TONE_COLORS[tone]
  return (
    <span style={{ ...styles.pill, background: colors.bg, color: colors.fg }}>
      {label}
    </span>
  )
}

function FundingPill({ stage }: { stage: string }) {
  return <span style={{ ...styles.pill, background: tokens.tealLight, color: tokens.primary }}>{stage}</span>
}

function PlatformTag({ platform }: { platform: string }) {
  return <span style={styles.platformTag}>{platform}</span>
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

export function EnquiriesTab({ onRefreshCount }: { onRefreshCount: () => void }) {
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [, setSearchParams] = useSearchParams()

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('enquiry_submissions')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setEnquiries((data ?? []) as EnquiryRow[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function handleChanged() {
    load()
    onRefreshCount()
  }

  function handleDrawerClose() {
    setOpenId(null)
    setSearchParams((prev) => {
      prev.delete('enquiryId')
      return prev
    }, { replace: true })
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <Loader2 size={20} color={t.text.muted} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (enquiries.length === 0) {
    return (
      <EmptyState
        heading="No enquiries yet."
        body="Enquiries submitted via eswarcreatives.in/services/design-systems/enquiry will appear here."
      />
    )
  }

  return (
    <>
      <div style={styles.list}>
        {enquiries.map((enquiry) => (
          <div key={enquiry.id} style={styles.row}>
            <div style={styles.rowTop}>
              <p style={styles.company}>{enquiry.company_name}</p>
              <FundingPill stage={enquiry.funding_stage} />
              <div style={styles.spacer} />
              <CountdownBadge status={enquiry.status} createdAt={enquiry.created_at} />
            </div>

            <div style={styles.rowMeta}>
              <div style={styles.platformTags}>
                {enquiry.platforms.map((p) => (
                  <PlatformTag key={p} platform={p} />
                ))}
              </div>
              <span style={styles.timeline}>{enquiry.start_timeline}</span>
            </div>

            <p style={styles.problem}>{truncate(enquiry.problem, 80)}</p>

            <div style={styles.rowActions}>
              <button type="button" style={styles.openBtn} onClick={() => setOpenId(enquiry.id)}>
                Open
              </button>
            </div>
          </div>
        ))}
      </div>

      {openId && <EnquiryDrawer enquiryId={openId} onClose={handleDrawerClose} onChanged={handleChanged} />}
    </>
  )
}

const styles: Record<string, CSSProperties> = {
  loading: { display: 'flex', justifyContent: 'center', padding: '48px 0' },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  row: {
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    padding: 16,
    background: tokens.surface,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  rowTop: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  company: {
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: 600,
    color: t.text.primary,
    margin: 0,
  },
  spacer: { flex: 1 },
  pill: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 999,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  rowMeta: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  platformTags: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  platformTag: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 6,
    background: t.background.muted,
    color: t.text.tertiary,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 500,
  },
  timeline: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
  },
  problem: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
    margin: 0,
    lineHeight: 1.5,
  },
  rowActions: { display: 'flex', justifyContent: 'flex-end' },
  openBtn: {
    background: t.background.subtle,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 12.5,
    fontWeight: 600,
    padding: '6px 14px',
    cursor: 'pointer',
  },
}
