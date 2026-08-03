// Admin campaigns module (Phase 5, Task 6). Manages review_campaigns: create
// with a public/private visibility and a draft -> active -> closed lifecycle,
// and change status inline. The client-linked, reviewer-facing campaigns live
// here; the public no-account logo-sketch voting stays in AdminSketchUpload.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Plus, X, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import { PageHeader, Card, ui } from './ui'
import { formatPortalDate } from '../utils/formatDate'
import { usePortal, clientLabel } from '../PortalContext'
import { ClientFilterBanner } from './ClientFilterBanner'
import type { CSSProperties } from 'react'

type Campaign = {
  id: string
  title: string
  client_id: string | null
  visibility: string | null
  status: string | null
  created_at: string | null
}

// Logo-voting campaign from the separate public_campaigns table (the no-account,
// link-shareable sketch voting system). These are read-only on this page: they
// are created and managed under Sketches, not here. They have no client_id, so
// they are filtered by a project_name name match; visibility is read from the
// table's own column ('public' | 'private').
type PublicCampaign = {
  id: string
  campaign_title: string
  project_name: string
  status: string | null
  visibility: string | null
  voting_token: string
  created_at: string | null
}

// One unified row for the merged list, discriminated by source so review
// campaigns keep their inline status control while logo-voting rows stay
// read-only.
type Row =
  | { source: 'review'; createdAt: string | null; campaign: Campaign }
  | { source: 'public'; createdAt: string | null; campaign: PublicCampaign; votes: number }

const STATUSES = ['draft', 'active', 'closed'] as const

// Status badge palette: draft = muted, active = teal, closed = ruby-muted.
function statusTone(status: string | null): { bg: string; fg: string } {
  if (status === 'active') return { bg: tokens.tealLight, fg: tokens.primary }
  if (status === 'closed') return { bg: tokens.rubyLight, fg: tokens.ruby }
  return { bg: tokens.bg, fg: t.text.tertiary }
}

export function CampaignsAdmin() {
  const { clients, selectedClientId, selectedClient } = usePortal()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [publicCampaigns, setPublicCampaigns] = useState<PublicCampaign[]>([])
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // review_campaigns: client-scoped via the global selector (has client_id).
      let reviewQuery = supabase
        .from('review_campaigns')
        .select('id, title, client_id, visibility, status, created_at')
        .order('created_at', { ascending: false })
      if (selectedClientId) reviewQuery = reviewQuery.eq('client_id', selectedClientId)

      // public_campaigns + public_votes are the separate logo-voting system.
      // Read-only here; vote counts are tallied client-side from public_votes.
      const [reviewRes, publicRes, votesRes] = await Promise.all([
        reviewQuery,
        supabase
          .from('public_campaigns')
          .select('id, campaign_title, project_name, status, visibility, voting_token, created_at')
          .order('created_at', { ascending: false }),
        supabase.from('public_votes').select('campaign_id'),
      ])
      if (reviewRes.error) throw reviewRes.error
      if (publicRes.error) throw publicRes.error
      if (votesRes.error) throw votesRes.error

      const counts: Record<string, number> = {}
      for (const v of (votesRes.data ?? []) as { campaign_id: string }[]) {
        counts[v.campaign_id] = (counts[v.campaign_id] ?? 0) + 1
      }

      setCampaigns((reviewRes.data ?? []) as Campaign[])
      setPublicCampaigns((publicRes.data ?? []) as PublicCampaign[])
      setVoteCounts(counts)
      setError(null)
    } catch {
      setError('Could not load campaigns. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [selectedClientId])

  useEffect(() => {
    void load()
  }, [load])

  const clientName = (id: string | null) =>
    id ? clientLabel(clients.find((c) => c.id === id)) : 'No client'

  // 6g: change status inline; the badge updates immediately (optimistic), then
  // reverts if the write fails. Only review_campaigns are editable here.
  async function changeStatus(c: Campaign, status: string) {
    const prev = c.status
    setCampaigns((list) => list.map((x) => (x.id === c.id ? { ...x, status } : x)))
    const { error: err } = await supabase
      .from('review_campaigns')
      .update({ status })
      .eq('id', c.id)
    if (err) {
      setCampaigns((list) => list.map((x) => (x.id === c.id ? { ...x, status: prev } : x)))
      setError('Could not update campaign status. Try again.')
    }
  }

  // public_campaigns has no client_id. Best-effort scope: when a client is
  // selected, keep only campaigns whose project_name mentions the client name.
  // With no client selected, show them all.
  const filteredPublic = (() => {
    if (!selectedClientId) return publicCampaigns
    const name = clientLabel(selectedClient).trim().toLowerCase()
    if (!name || name === '(unnamed)') return publicCampaigns
    return publicCampaigns.filter((c) => c.project_name.toLowerCase().includes(name))
  })()

  // Merge both systems into one list, newest first, so the page reads as a
  // single Campaigns surface (H2: same language across the two sources).
  const rows: Row[] = [
    ...campaigns.map((c): Row => ({ source: 'review', createdAt: c.created_at, campaign: c })),
    ...filteredPublic.map(
      (c): Row => ({
        source: 'public',
        createdAt: c.created_at,
        campaign: c,
        votes: voteCounts[c.id] ?? 0,
      }),
    ),
  ].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))

  return (
    <>
      <PageHeader
        title="Campaigns"
        action={
          <button type="button" style={ui.primaryBtn} onClick={() => setShowNew(true)}>
            <Plus size={16} />
            New campaign
          </button>
        }
      />
      <ClientFilterBanner />
      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        <p style={ui.muted}>Loading...</p>
      ) : rows.length === 0 ? (
        <p style={ui.muted}>No campaigns yet. Create one to get started.</p>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Campaign</th>
                <th style={styles.th}>Source</th>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Visibility</th>
                <th style={styles.th}>Votes</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) =>
                r.source === 'review' ? (
                  <ReviewRow key={`review-${r.campaign.id}`} c={r.campaign} clientName={clientName} onStatus={changeStatus} />
                ) : (
                  <PublicRow key={`public-${r.campaign.id}`} c={r.campaign} votes={r.votes} />
                ),
              )}
            </tbody>
          </table>
        </Card>
      )}

      {showNew && (
        <NewCampaignModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false)
            void load()
          }}
        />
      )}
    </>
  )
}

// Review campaign row: client-linked, with the inline status control (6g).
function ReviewRow({
  c,
  clientName,
  onStatus,
}: {
  c: Campaign
  clientName: (id: string | null) => string
  onStatus: (c: Campaign, status: string) => void
}) {
  const tone = statusTone(c.status)
  return (
    <tr style={styles.row}>
      <td style={styles.td}>
        <div style={styles.titleCell}>{c.title}</div>
      </td>
      <td style={styles.td}>
        <span style={styles.sourceReview}>Review campaign</span>
      </td>
      <td style={styles.td}>{clientName(c.client_id)}</td>
      <td style={styles.td}>
        <span style={styles.visBadge}>{c.visibility === 'public' ? 'Public' : 'Private'}</span>
      </td>
      <td style={styles.td}>—</td>
      <td style={styles.td}>{formatPortalDate(c.created_at)}</td>
      <td style={styles.td}>
        <div style={styles.statusCell}>
          {/* H1: status badge always visible, updates immediately. */}
          <span style={{ ...styles.statusBadge, background: tone.bg, color: tone.fg }}>
            {c.status ?? 'draft'}
          </span>
          <select
            value={c.status ?? 'draft'}
            onChange={(e) => onStatus(c, e.target.value)}
            style={styles.statusSelect}
            aria-label={`Change status for ${c.title}`}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </td>
    </tr>
  )
}

// Logo-voting row: read-only mirror of a public_campaigns record. That table has
// no client_id (so the client cell stays blank), but it does carry its own
// visibility column, read here the same way review rows read theirs. The status
// badge is read-only (managed under Sketches), and the title links to the
// existing public votes view for this campaign (H3: user stays in control).
function PublicRow({ c, votes }: { c: PublicCampaign; votes: number }) {
  const tone = statusTone(c.status)
  return (
    <tr style={styles.row}>
      <td style={styles.td}>
        <Link to={`/portal/admin/sketches?campaign=${c.id}`} style={styles.titleLink}>
          <span style={styles.titleCell}>{c.campaign_title}</span>
          <ExternalLink size={13} style={{ flexShrink: 0 }} />
        </Link>
        <div style={styles.subtitle}>{c.project_name}</div>
      </td>
      <td style={styles.td}>
        <span style={styles.sourcePublic}>Logo voting</span>
      </td>
      <td style={styles.td}>—</td>
      <td style={styles.td}>
        <span style={styles.visBadge}>{c.visibility === 'public' ? 'Public' : 'Private'}</span>
      </td>
      <td style={styles.td}>{votes}</td>
      <td style={styles.td}>{formatPortalDate(c.created_at)}</td>
      <td style={styles.td}>
        {/* H1: status visible but read-only; logo voting is managed elsewhere. */}
        <span style={{ ...styles.statusBadge, background: tone.bg, color: tone.fg }}>
          {c.status ?? 'draft'}
        </span>
      </td>
    </tr>
  )
}

// 6b: create flow — title, client, visibility toggle (default Private),
// status starts at 'draft'.
function NewCampaignModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { clients } = usePortal()
  const [title, setTitle] = useState('')
  const [clientId, setClientId] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'public'>('private')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    if (!title.trim()) {
      setError('Campaign title is required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const { data: sess } = await supabase.auth.getUser()
      const { error: insErr } = await supabase.from('review_campaigns').insert({
        title: title.trim(),
        client_id: clientId || null,
        visibility,
        status: 'draft',
        created_by: sess.user?.id ?? null,
      })
      if (insErr) throw insErr
      onCreated()
    } catch {
      // H9: never surface a raw Supabase string.
      setError('Could not create the campaign. Try again.')
      setSaving(false)
    }
  }

  return (
    <div style={styles.modalOverlay} onClick={() => !saving && onClose()}>
      <div style={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHead}>
          <h2 style={styles.modalTitle}>New campaign</h2>
          <button type="button" style={styles.modalClose} onClick={onClose} disabled={saving} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        {error && <div style={styles.error}>{error}</div>}
        <div style={styles.form}>
          <label style={styles.field}>
            <span style={styles.fieldLabel}>Campaign title *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={styles.input} autoFocus />
          </label>
          <label style={styles.field}>
            <span style={styles.fieldLabel}>Client</span>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={styles.input}>
              <option value="">No client (unlinked)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {clientLabel(c)}
                </option>
              ))}
            </select>
          </label>
          <div style={styles.field}>
            <span style={styles.fieldLabel}>Visibility</span>
            <div style={styles.toggleRow}>
              {(['private', 'public'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  style={visibility === v ? styles.toggleOn : styles.toggleOff}
                  onClick={() => setVisibility(v)}
                >
                  {v === 'private' ? 'Private' : 'Public'}
                </button>
              ))}
            </div>
            <span style={styles.helpText}>
              {visibility === 'private'
                ? 'Only the linked client can see this campaign.'
                : 'Anyone with the link can view and vote, no account needed.'}
            </span>
          </div>
        </div>
        <div style={styles.actions}>
          <button type="button" style={styles.secondaryBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" style={ui.primaryBtn} onClick={() => void handleCreate()} disabled={saving}>
            {saving ? 'Creating...' : 'Create campaign'}
          </button>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
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
  table: { width: '100%', borderCollapse: 'collapse', fontFamily: fonts.body },
  th: {
    textAlign: 'left',
    padding: '12px 20px',
    fontSize: 12,
    fontWeight: 600,
    color: t.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    borderBottom: `1px solid ${tokens.border}`,
    background: tokens.bg,
  },
  row: {},
  td: {
    padding: '14px 20px',
    fontSize: 14,
    color: t.text.secondary,
    borderBottom: `1px solid ${tokens.border}`,
  },
  titleCell: { fontWeight: 600, color: t.text.primary },
  titleLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    color: tokens.primary,
    textDecoration: 'none',
  },
  subtitle: { fontSize: 12, color: t.text.tertiary, marginTop: 2 },
  visBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 999,
    background: tokens.bg,
    color: t.text.tertiary,
    fontSize: 11,
    fontWeight: 600,
    border: `1px solid ${tokens.border}`,
  },
  sourceReview: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 999,
    background: tokens.tealLight,
    color: tokens.primary,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  sourcePublic: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 999,
    background: tokens.goldLight,
    color: tokens.goldDark,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  statusCell: { display: 'flex', alignItems: 'center', gap: 10 },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'capitalize',
    whiteSpace: 'nowrap',
  },
  statusSelect: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 6,
    padding: '4px 8px',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 26, 27, 0.4)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '60px 20px',
    zIndex: 100,
    overflowY: 'auto',
  },
  modalPanel: {
    background: tokens.surface,
    borderRadius: 12,
    border: `1px solid ${tokens.border}`,
    padding: 24,
    width: '100%',
    maxWidth: 480,
  },
  modalHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: { fontFamily: fonts.heading, fontSize: 18, fontWeight: 600, color: t.text.primary, margin: 0 },
  modalClose: { background: 'transparent', border: 'none', color: t.text.muted, cursor: 'pointer', padding: 4, display: 'flex' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: t.text.tertiary },
  input: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    background: tokens.inputBg,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '9px 11px',
    width: '100%',
    boxSizing: 'border-box',
  },
  toggleRow: { display: 'flex', gap: 8 },
  toggleOn: {
    flex: 1,
    background: tokens.primary,
    color: tokens.surface,
    border: `1px solid ${tokens.primary}`,
    borderRadius: 8,
    padding: '9px 12px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  toggleOff: {
    flex: 1,
    background: tokens.surface,
    color: t.text.tertiary,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '9px 12px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  helpText: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  secondaryBtn: {
    background: tokens.surface,
    color: t.text.primary,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '10px 16px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
