import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Eye, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, fonts } from '../theme'
import {
  PageHeader,
  Modal,
  StatusBadge,
  ui,
  mono,
  formatMoney,
  formatDate,
} from './ui'
import { ProposalForm } from './ProposalForm'
import type { CSSProperties } from 'react'

type Proposal = {
  id: string
  proposal_number: string | null
  title: string
  client_name: string | null
  company_name: string | null
  total_amount: number
  currency: string
  status: string
  valid_until: string | null
}

export function ProposalsAdmin() {
  const navigate = useNavigate()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)

  // Proposal modal: client-view toggle + unsaved-work guard state.
  const [preview, setPreview] = useState(false)
  const [formDirty, setFormDirty] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)

  // Newly saved proposal id, briefly highlighted in the list then cleared.
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current)
    }
  }, [])

  // Close the proposal modal, confirming first only when there is unsaved work
  // that has not yet been captured into an auto-saved draft.
  function requestClose() {
    if (formDirty && !draftSaved) {
      if (!window.confirm('Discard unsaved changes?')) return
    }
    setShowNew(false)
    setPreview(false)
    setFormDirty(false)
    setDraftSaved(false)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('proposals')
        .select(
          'id, proposal_number, title, client_name, company_name, total_amount, currency, status, valid_until'
        )
        .order('created_at', { ascending: false })
      if (err) throw err
      setProposals((data ?? []) as Proposal[])
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <PageHeader
        title="Proposals"
        action={
          <button type="button" style={ui.primaryBtn} onClick={() => setShowNew(true)}>
            <Plus size={16} />
            New proposal
          </button>
        }
      />
      {error && <div style={styles.error}>{error}</div>}
      {notice && <div style={styles.notice}>{notice}</div>}
      {loading ? (
        <p style={ui.muted}>Loading...</p>
      ) : proposals.length === 0 ? (
        <p style={ui.muted}>No proposals yet. Create one to get started.</p>
      ) : (
        <div style={styles.grid}>
          {proposals.map((p) => (
            <div
              key={p.id}
              onClick={() => navigate(`/portal/admin/proposals/${p.id}`)}
              style={{ ...styles.card, ...(p.id === highlightId ? styles.cardHighlight : null) }}
            >
              <div style={styles.cardTop}>
                <span style={styles.number}>{p.proposal_number || 'No number'}</span>
                <StatusBadge status={p.status} />
              </div>
              <h3 style={styles.title}>{p.title}</h3>
              <p style={styles.client}>
                {p.client_name || '—'}
                {p.company_name ? ` · ${p.company_name}` : ''}
              </p>
              <div style={styles.cardBottom}>
                <span style={styles.amount}>
                  <span style={styles.currencyBadge}>{p.currency}</span>
                  {formatMoney(Number(p.total_amount), p.currency)}
                </span>
                <span style={styles.validUntil}>Valid until {formatDate(p.valid_until)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <Modal
          title="New proposal"
          size="lg"
          closeOnBackdrop={false}
          onClose={requestClose}
          headerExtra={
            <button
              type="button"
              style={styles.previewToggle}
              onClick={() => setPreview((p) => !p)}
            >
              {preview ? <Pencil size={15} /> : <Eye size={15} />}
              {preview ? 'Edit' : 'Client view'}
            </button>
          }
        >
          <ProposalForm
            preview={preview}
            onDirtyChange={(dirty, saved) => {
              setFormDirty(dirty)
              setDraftSaved(saved)
            }}
            onCancel={requestClose}
            onSaved={(id, warning) => {
              setShowNew(false)
              setPreview(false)
              setFormDirty(false)
              setDraftSaved(false)
              setNotice(warning ?? null)
              setHighlightId(id)
              if (highlightTimer.current) clearTimeout(highlightTimer.current)
              highlightTimer.current = setTimeout(() => setHighlightId(null), 2500)
              void load()
            }}
          />
        </Modal>
      )}
    </>
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
  notice: {
    background: tokens.goldLight,
    color: tokens.goldDark,
    border: `1px solid ${tokens.gold}`,
    borderRadius: 8,
    padding: '10px 14px',
    marginBottom: 16,
    fontFamily: fonts.body,
    fontSize: 13,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: 16,
  },
  card: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderLeft: '3px solid transparent',
    borderRadius: 12,
    padding: 20,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    // Lets the gold highlight fade back out smoothly once it is cleared.
    transition: 'background-color 0.6s ease, border-left-color 0.6s ease',
  },
  cardHighlight: {
    borderLeft: '3px solid #D5B067',
    background: '#FDF8EC',
  },
  previewToggle: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: tokens.tealLight,
    color: tokens.primary,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '6px 12px',
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  number: {
    fontFamily: mono,
    fontSize: 12,
    color: tokens.textMuted,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: tokens.text,
    margin: 0,
  },
  client: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.textMuted,
    margin: 0,
  },
  cardBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTop: `1px solid ${tokens.border}`,
  },
  amount: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: mono,
    fontSize: 15,
    fontWeight: 600,
    color: tokens.text,
  },
  currencyBadge: {
    fontFamily: fonts.body,
    fontSize: 10,
    fontWeight: 700,
    color: tokens.accent,
    background: tokens.tealLight,
    borderRadius: 4,
    padding: '1px 5px',
    letterSpacing: 0.4,
  },
  validUntil: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.textMuted,
  },
}
