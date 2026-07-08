// Leads tab: sortable table (desktop), card stack (mobile).
// Filters: status, segment, missing observation toggle.
// Add lead button, CSV import button.
import { useEffect, useRef, useState } from 'react'
import { Upload, UserPlus, Linkedin, Mail } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../../theme'
import { mono, formatDate } from '../ui'
import { useBreakpoint } from '../../hooks/useBreakpoint'
import { AddLeadModal } from './AddLeadModal'
import { CsvImportModal } from './CsvImportModal'
import { LeadDrawer } from './LeadDrawer'

type LeadRow = {
  id: string
  first_name: string
  last_name: string | null
  company: string
  email: string | null
  linkedin_url: string | null
  segment: string
  status: string
  linkedin_status: string
  specific_observation: string | null
  created_at: string
  // Derived from touches
  last_touch_at?: string | null
  next_touch_at?: string | null
}

const STATUS_OPTIONS = [
  'new', 'active', 'replied', 'meeting_booked', 'converted',
  'not_interested', 'unsubscribed', 'bounced', 'archived',
]

function initials(first: string, last: string | null) {
  return ((first[0] ?? '') + (last?.[0] ?? '')).toUpperCase()
}

const SEGMENT_LABELS: Record<string, string> = {
  security_ai: 'Security / AI',
  saas_product: 'SaaS Product',
}

function SegmentChip({ segment }: { segment: string }) {
  const isSecAI = segment === 'security_ai'
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      background: isSecAI ? tokens.tealLight : tokens.goldLight,
      color: isSecAI ? tokens.primary : tokens.goldDark,
      fontFamily: fonts.body,
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {SEGMENT_LABELS[segment] ?? segment}
    </span>
  )
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  new:           { bg: t.background.muted, fg: t.text.tertiary },
  active:        { bg: tokens.tealLight, fg: tokens.primary },
  replied:       { bg: tokens.greenLight, fg: tokens.green },
  meeting_booked:{ bg: tokens.goldLight, fg: tokens.goldDark },
  converted:     { bg: tokens.greenLight, fg: tokens.green },
  not_interested:{ bg: t.background.muted, fg: t.text.tertiary },
  unsubscribed:  { bg: tokens.rubyLight, fg: tokens.ruby },
  bounced:       { bg: tokens.rubyLight, fg: tokens.ruby },
  archived:      { bg: t.background.muted, fg: t.text.muted },
}

function StatusChip({ status }: { status: string }) {
  const tone = STATUS_COLORS[status] ?? { bg: t.background.muted, fg: t.text.tertiary }
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 999,
      background: tone.bg,
      color: tone.fg,
      fontFamily: fonts.body,
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      {status.replace('_', ' ')}
    </span>
  )
}

export function LeadsTab({
  initialOpenLeadId,
  onDrawerClosed,
}: {
  initialOpenLeadId: string | null
  onDrawerClosed: () => void
}) {
  const { isMobile } = useBreakpoint()
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string[]>([])
  const [filterSegment, setFilterSegment] = useState('')
  const [filterMissingObs, setFilterMissingObs] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showCsv, setShowCsv] = useState(false)
  const [openLeadId, setOpenLeadId] = useState<string | null>(initialOpenLeadId)
  const initialHandled = useRef(false)

  useEffect(() => {
    if (initialOpenLeadId && !initialHandled.current) {
      setOpenLeadId(initialOpenLeadId)
      initialHandled.current = true
    }
  }, [initialOpenLeadId])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      let q = supabase
        .from('leads')
        .select('id, first_name, last_name, company, email, linkedin_url, segment, status, linkedin_status, specific_observation, created_at')
        .order('created_at', { ascending: false })

      if (filterStatus.length > 0) q = q.in('status', filterStatus)
      if (filterSegment) q = q.eq('segment', filterSegment)
      if (filterMissingObs) {
        q = q
          .or('specific_observation.is.null,specific_observation.eq.')
          .not('status', 'in', '(converted,archived,unsubscribed)')
      }

      const { data, error: err } = await q
      if (err) throw err

      // Fetch last/next touch per lead
      const ids = (data ?? []).map((l) => l.id)
      let lastMap: Record<string, string> = {}
      let nextMap: Record<string, string> = {}
      if (ids.length > 0) {
        const today = new Date().toISOString().slice(0, 10)
        const [lastRes, nextRes] = await Promise.all([
          supabase
            .from('outreach_touches')
            .select('lead_id, sent_at')
            .in('lead_id', ids)
            .eq('status', 'sent')
            .order('sent_at', { ascending: false }),
          supabase
            .from('outreach_touches')
            .select('lead_id, scheduled_for')
            .in('lead_id', ids)
            .eq('status', 'scheduled')
            .gte('scheduled_for', today)
            .order('scheduled_for', { ascending: true }),
        ])
        for (const t of (lastRes.data ?? [])) {
          if (!lastMap[t.lead_id]) lastMap[t.lead_id] = t.sent_at
        }
        for (const t of (nextRes.data ?? [])) {
          if (!nextMap[t.lead_id]) nextMap[t.lead_id] = t.scheduled_for
        }
      }

      setLeads((data ?? []).map((l) => ({
        ...l,
        last_touch_at: lastMap[l.id] ?? null,
        next_touch_at: nextMap[l.id] ?? null,
      })))
    } catch {
      setError('Could not load leads. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filterStatus, filterSegment, filterMissingObs])

  function handleDrawerClose() {
    setOpenLeadId(null)
    onDrawerClosed()
    load()
  }

  return (
    <>
      {showAdd && (
        <AddLeadModal
          onClose={() => setShowAdd(false)}
          onSaved={(id) => { setShowAdd(false); setOpenLeadId(id); load() }}
        />
      )}
      {showCsv && (
        <CsvImportModal
          onClose={() => setShowCsv(false)}
          onImported={() => { setShowCsv(false); load() }}
        />
      )}
      {openLeadId && (
        <LeadDrawer
          leadId={openLeadId}
          onClose={handleDrawerClose}
        />
      )}

      {/* Toolbar */}
      <div style={styles.toolbar}>
        {/* Filters */}
        <div style={styles.filters}>
          <select
            style={styles.filterSelect}
            value={filterStatus.length === 1 ? filterStatus[0] : ''}
            onChange={(e) => setFilterStatus(e.target.value ? [e.target.value] : [])}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            style={styles.filterSelect}
            value={filterSegment}
            onChange={(e) => setFilterSegment(e.target.value)}
          >
            <option value="">All segments</option>
            <option value="security_ai">Security / AI</option>
            <option value="saas_product">SaaS Product</option>
          </select>
          <label style={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={filterMissingObs}
              onChange={(e) => setFilterMissingObs(e.target.checked)}
            />
            Missing observation
          </label>
        </div>
        {/* Actions */}
        <div style={styles.actions}>
          <button type="button" style={styles.outlineBtn} onClick={() => setShowCsv(true)}>
            <Upload size={14} />
            Import CSV
          </button>
          <button type="button" style={styles.primaryBtn} onClick={() => setShowAdd(true)}>
            <UserPlus size={14} />
            Add lead
          </button>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {loading ? (
        <p style={styles.loading}>Loading leads...</p>
      ) : leads.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyHeading}>No leads yet</p>
          <p style={styles.emptyBody}>Add your first lead or import from CSV to get started.</p>
        </div>
      ) : isMobile ? (
        <div style={styles.cardStack}>
          {leads.map((lead) => (
            <MobileCard key={lead.id} lead={lead} onOpen={() => setOpenLeadId(lead.id)} />
          ))}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Lead</th>
                <th style={styles.th}>Segment</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>LinkedIn</th>
                <th style={styles.th}>Last touch</th>
                <th style={styles.th}>Next touch</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} style={styles.tr} onClick={() => setOpenLeadId(lead.id)}>
                  <td style={styles.td}>
                    <div style={styles.leadCell}>
                      <div style={styles.avatar}>{initials(lead.first_name, lead.last_name)}</div>
                      <div>
                        <div style={styles.leadName}>
                          {lead.first_name} {lead.last_name ?? ''}
                        </div>
                        <div style={styles.leadCompany}>{lead.company}</div>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}><SegmentChip segment={lead.segment} /></td>
                  <td style={styles.td}><StatusChip status={lead.status} /></td>
                  <td style={styles.td}>
                    <LinkedInStatusIcon status={lead.linkedin_status} />
                  </td>
                  <td style={styles.td}>
                    <span style={styles.monoCell}>
                      {lead.last_touch_at ? formatDate(lead.last_touch_at) : '-'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={styles.monoCell}>
                      {lead.next_touch_at ? formatDate(lead.next_touch_at) : '-'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      type="button"
                      style={styles.openBtn}
                      onClick={(e) => { e.stopPropagation(); setOpenLeadId(lead.id) }}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function LinkedInStatusIcon({ status }: { status: string }) {
  const colors: Record<string, string> = {
    none: t.text.disabled,
    request_sent: tokens.goldDark,
    connected: tokens.green,
    ignored: tokens.ruby,
  }
  return <Linkedin size={15} color={colors[status] ?? t.text.muted} />
}

function MobileCard({ lead, onOpen }: { lead: LeadRow; onOpen: () => void }) {
  return (
    <div style={styles.mobileCard} onClick={onOpen}>
      <div style={styles.mobileCardHead}>
        <div style={styles.avatar}>{initials(lead.first_name, lead.last_name)}</div>
        <div style={{ flex: 1 }}>
          <div style={styles.leadName}>{lead.first_name} {lead.last_name ?? ''}</div>
          <div style={styles.leadCompany}>{lead.company}</div>
        </div>
        <StatusChip status={lead.status} />
      </div>
      <div style={styles.mobileCardFoot}>
        <SegmentChip segment={lead.segment} />
        {lead.next_touch_at && (
          <span style={styles.mobileNextTouch}>Next: {formatDate(lead.next_touch_at)}</span>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  toolbar: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filters: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
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
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.secondary,
    cursor: 'pointer',
  },
  actions: { display: 'flex', gap: 8 },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
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
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.surface,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 13,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '7px 12px',
    cursor: 'pointer',
  },
  errorBanner: {
    background: tokens.rubyLight,
    color: tokens.ruby,
    border: `1px solid ${tokens.ruby}`,
    borderRadius: 8,
    padding: '10px 14px',
    fontFamily: fonts.body,
    fontSize: 13,
    marginBottom: 12,
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
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 720 },
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
  tr: {
    cursor: 'pointer',
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  td: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    padding: '12px',
    borderBottom: `1px solid ${t.border.subtle}`,
    verticalAlign: 'middle',
  },
  leadCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: t.background.tint2,
    color: tokens.primary,
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  leadName: {
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: t.text.primary,
    whiteSpace: 'nowrap',
  },
  leadCompany: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.muted,
    whiteSpace: 'nowrap',
  },
  monoCell: {
    fontFamily: mono,
    fontSize: 12,
    color: t.text.secondary,
  },
  openBtn: {
    background: 'none',
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    fontFamily: fonts.body,
    fontSize: 12,
    color: t.text.primaryBrand,
    padding: '4px 10px',
    cursor: 'pointer',
  },
  cardStack: { display: 'flex', flexDirection: 'column', gap: 10 },
  mobileCard: {
    background: tokens.surface,
    border: `1px solid ${t.border.default}`,
    borderRadius: 10,
    padding: '14px 16px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  mobileCardHead: { display: 'flex', alignItems: 'center', gap: 10 },
  mobileCardFoot: { display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between' },
  mobileNextTouch: {
    fontFamily: mono,
    fontSize: 11,
    color: t.text.muted,
  },
}
