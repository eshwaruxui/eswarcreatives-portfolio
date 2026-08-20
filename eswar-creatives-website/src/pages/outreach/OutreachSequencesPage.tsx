import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { t, tokens, fonts, motionTokens } from '../../portal/theme'
import { Modal } from '../../portal/admin/ui'
import { formatPortalDate } from '../../portal/utils/formatDate'

type Sequence = {
  id: string
  name: string
  is_active: boolean
  created_at: string
  leadCount: number
}

export function OutreachSequencesPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [sequences, setSequences] = useState<Sequence[] | null>(null)
  const [showNewSequence, setShowNewSequence] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [detailSequence, setDetailSequence] = useState<Sequence | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || cancelled) return
      setUserId(session.user.id)
      await loadSequences(session.user.id)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function loadSequences(uid: string) {
    const { data: seqRows } = await supabase
      .from('sequences')
      .select('id, name, is_active, created_at')
      .eq('owner_id', uid)
      .order('created_at', { ascending: false })

    const rows = seqRows ?? []
    if (rows.length === 0) {
      setSequences([])
      return
    }

    // lead_enrollments has no owner_id - scoped via the enrolled lead's
    // owner instead (RLS, migration 0104), so this only ever returns rows
    // for this user's own sequences regardless of the .in() filter below.
    const { data: enrollRows } = await supabase
      .from('lead_enrollments')
      .select('sequence_id')
      .in('sequence_id', rows.map((s) => s.id))

    const countBySequence = new Map<string, number>()
    for (const e of enrollRows ?? []) {
      countBySequence.set(e.sequence_id, (countBySequence.get(e.sequence_id) ?? 0) + 1)
    }

    setSequences(
      rows.map((s) => ({ ...s, leadCount: countBySequence.get(s.id) ?? 0 })),
    )
  }

  async function handleCreate() {
    if (!userId || !newName.trim()) return
    setCreating(true)
    await supabase.from('sequences').insert({ name: newName.trim(), owner_id: userId })
    setCreating(false)
    setNewName('')
    setShowNewSequence(false)
    await loadSequences(userId)
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>Your sequences</h1>
        <button type="button" onClick={() => setShowNewSequence(true)} style={styles.addButton}>
          <Plus size={16} />
          New sequence
        </button>
      </div>

      {sequences === null && <div style={styles.emptyState}>Loading...</div>}

      {sequences !== null && sequences.length === 0 && (
        <div style={styles.emptyState}>No sequences yet. Create your first one above.</div>
      )}

      {sequences !== null && sequences.length > 0 && (
        <div style={styles.cardList}>
          {sequences.map((seq) => (
            <button
              key={seq.id}
              type="button"
              onClick={() => setDetailSequence(seq)}
              style={styles.row}
            >
              <span style={styles.rowName}>{seq.name}</span>
              <span
                style={{
                  ...styles.badge,
                  background: seq.is_active ? t.background.tint1 : t.background.muted,
                  color: seq.is_active ? tokens.primary : t.text.muted,
                }}
              >
                {seq.is_active ? 'Active' : 'Inactive'}
              </span>
              <span style={styles.rowMeta}>{seq.leadCount} lead{seq.leadCount === 1 ? '' : 's'} enrolled</span>
              <span style={styles.rowMeta}>{formatPortalDate(seq.created_at)}</span>
            </button>
          ))}
        </div>
      )}

      {showNewSequence && (
        <Modal title="New sequence" onClose={() => setShowNewSequence(false)}>
          <input
            type="text"
            autoFocus
            placeholder="e.g. SaaS Founders Q3 2026"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={styles.input}
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            style={{
              ...styles.primaryButton,
              opacity: !newName.trim() || creating ? 0.5 : 1,
              cursor: !newName.trim() || creating ? 'not-allowed' : 'pointer',
              marginTop: 16,
            }}
          >
            {creating ? 'Creating...' : 'Create sequence'}
          </button>
        </Modal>
      )}

      {detailSequence && (
        <Modal title={detailSequence.name} onClose={() => setDetailSequence(null)}>
          <p style={{ fontFamily: fonts.body, fontSize: 14, color: t.text.secondary, margin: 0 }}>
            Sequence detail coming soon.
          </p>
        </Modal>
      )}
    </div>
  )
}

const styles: Record<string, any> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960 },
  headerRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontFamily: fonts.heading, fontSize: 22, color: t.text.primary, margin: 0 },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    height: 44,
    padding: '0 16px',
    borderRadius: 8,
    background: tokens.primary,
    color: t.text.onPrimary,
    border: 'none',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  emptyState: {
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 10,
    padding: '32px 16px',
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.secondary,
  },
  cardList: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    width: '100%',
    minHeight: 56,
    padding: '12px 16px',
    borderRadius: 10,
    border: `1px solid ${t.border.subtle}`,
    background: t.background.surface,
    textAlign: 'left',
    cursor: 'pointer',
    fontFamily: fonts.body,
    transition: `border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  rowName: { fontSize: 15, fontWeight: 600, color: t.text.primary, flex: 1 },
  badge: { fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' },
  rowMeta: { fontSize: 13, color: t.text.muted, whiteSpace: 'nowrap' },
  input: {
    height: 48,
    width: '100%',
    boxSizing: 'border-box',
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    padding: '0 16px',
    fontFamily: fonts.body,
    fontSize: 15,
    color: t.text.primary,
    outline: 'none',
  },
  primaryButton: {
    width: '100%',
    height: 48,
    background: tokens.primary,
    color: t.text.onPrimary,
    border: 'none',
    borderRadius: 8,
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
}
