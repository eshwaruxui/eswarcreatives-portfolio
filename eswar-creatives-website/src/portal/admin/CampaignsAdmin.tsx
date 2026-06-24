// Admin campaigns module (Phase 5, Task 6). Manages review_campaigns: create
// with a public/private visibility and a draft -> active -> closed lifecycle,
// and change status inline. The client-linked, reviewer-facing campaigns live
// here; the public no-account logo-sketch voting stays in AdminSketchUpload.
import { useCallback, useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, fonts } from '../theme'
import { PageHeader, Card, ui, formatDate } from './ui'
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

const STATUSES = ['draft', 'active', 'closed'] as const

// Status badge palette: draft = muted, active = teal, closed = ruby-muted.
function statusTone(status: string | null): { bg: string; fg: string } {
  if (status === 'active') return { bg: tokens.tealLight, fg: tokens.primary }
  if (status === 'closed') return { bg: tokens.rubyLight, fg: tokens.ruby }
  return { bg: tokens.bg, fg: tokens.textMuted }
}

export function CampaignsAdmin() {
  const { clients, selectedClientId } = usePortal()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('review_campaigns')
        .select('id, title, client_id, visibility, status, created_at')
        .order('created_at', { ascending: false })
      if (selectedClientId) query = query.eq('client_id', selectedClientId)
      const { data, error: err } = await query
      if (err) throw err
      setCampaigns((data ?? []) as Campaign[])
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
  // reverts if the write fails.
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
      ) : campaigns.length === 0 ? (
        <p style={ui.muted}>No campaigns yet. Create one to get started.</p>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Campaign</th>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Visibility</th>
                <th style={styles.th}>Created</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const tone = statusTone(c.status)
                return (
                  <tr key={c.id} style={styles.row}>
                    <td style={{ ...styles.td, fontWeight: 600, color: tokens.text }}>{c.title}</td>
                    <td style={styles.td}>{clientName(c.client_id)}</td>
                    <td style={styles.td}>
                      <span style={styles.visBadge}>{c.visibility === 'public' ? 'Public' : 'Private'}</span>
                    </td>
                    <td style={styles.td}>{formatDate(c.created_at)}</td>
                    <td style={styles.td}>
                      <div style={styles.statusCell}>
                        {/* H1: status badge always visible, updates immediately. */}
                        <span style={{ ...styles.statusBadge, background: tone.bg, color: tone.fg }}>
                          {c.status ?? 'draft'}
                        </span>
                        <select
                          value={c.status ?? 'draft'}
                          onChange={(e) => void changeStatus(c, e.target.value)}
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
              })}
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
    color: tokens.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    borderBottom: `1px solid ${tokens.border}`,
    background: tokens.bg,
  },
  row: {},
  td: {
    padding: '14px 20px',
    fontSize: 14,
    color: tokens.textMuted,
    borderBottom: `1px solid ${tokens.border}`,
  },
  visBadge: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 999,
    background: tokens.bg,
    color: tokens.textMuted,
    fontSize: 11,
    fontWeight: 600,
    border: `1px solid ${tokens.border}`,
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
    color: tokens.text,
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
  modalTitle: { fontFamily: fonts.heading, fontSize: 18, fontWeight: 600, color: tokens.text, margin: 0 },
  modalClose: { background: 'transparent', border: 'none', color: tokens.textMuted, cursor: 'pointer', padding: 4, display: 'flex' },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldLabel: { fontFamily: fonts.body, fontSize: 12, fontWeight: 600, color: tokens.textMuted },
  input: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: tokens.text,
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
    color: tokens.textMuted,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '9px 12px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  helpText: { fontFamily: fonts.body, fontSize: 12, color: tokens.textMuted },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 },
  secondaryBtn: {
    background: tokens.surface,
    color: tokens.text,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '10px 16px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
}
