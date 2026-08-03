import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router'
import { Bell, Plus, Eye, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts, motionTokens } from '../theme'
import {
  PageHeader,
  Modal,
  StatusBadge,
  ui,
  mono,
  formatMoney,
} from './ui'
import { formatPortalDate } from '../utils/formatDate'
import { ProposalForm } from './ProposalForm'
import { DeleteProposalModal } from './DeleteProposalModal'
import { ProposalNudgeModal, type NudgeProposal } from './ProposalNudgeModal'
import { usePortal } from '../PortalContext'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { ClientFilterBanner } from './ClientFilterBanner'
import { toast } from 'sonner'
import type { PortalProfile } from '../PortalGuard'
import type { CSSProperties } from 'react'

type Proposal = {
  id: string
  proposal_number: string | null
  title: string
  client_id: string | null
  client_name: string | null
  company_name: string | null
  total_amount: number
  currency: string
  status: string
  valid_until: string | null
  nudge_count?: number
  last_nudge_sent_at?: string | null
}

export function ProposalsAdmin() {
  const navigate = useNavigate()
  const { selectedClientId } = usePortal()
  const { isMobile } = useBreakpoint()
  // AdminShell gates this whole area to owner/admin and passes the profile via
  // the router outlet; only those roles may hard-delete a proposal.
  const profile = useOutletContext<PortalProfile>()
  const canDelete = profile?.role === 'owner' || profile?.role === 'admin'
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

  // Nudge modal target (status='sent' proposals only).
  const [nudgeTarget, setNudgeTarget] = useState<Proposal | null>(null)

  // A proposal being deleted: the confirmation modal target, and the id of the
  // card to fade out once the delete succeeds.
  const [deleteTarget, setDeleteTarget] = useState<Proposal | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

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
      let query = supabase
        .from('proposals')
        .select(
          'id, proposal_number, title, client_id, client_name, company_name, total_amount, currency, status, valid_until, nudge_count, last_nudge_sent_at'
        )
        .order('created_at', { ascending: false })
      if (selectedClientId) query = query.eq('client_id', selectedClientId)
      const { data, error: err } = await query
      if (err) throw err
      setProposals((data ?? []) as Proposal[])
    } catch {
      setError('Could not load proposals. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [selectedClientId])

  useEffect(() => {
    void load()
  }, [load])

  // Once the delete edge function succeeds (toast raised inside the modal),
  // fade the card out (durationBase) then drop it from the list.
  function finishDelete(p: Proposal) {
    setDeleteTarget(null)
    setRemovingId(p.id)
    setTimeout(() => {
      setProposals((prev) => prev.filter((x) => x.id !== p.id))
      setRemovingId(null)
    }, parseInt(motionTokens.durationBase, 10))
  }

  return (
    <>
      <PageHeader
        title="Proposals"
        action={
          !isMobile && (
            <button type="button" style={ui.primaryBtn} onClick={() => setShowNew(true)}>
              <Plus size={16} />
              New proposal
            </button>
          )
        }
      />
      <ClientFilterBanner />
      {error && <div style={styles.error}>{error}</div>}
      {notice && <div style={styles.notice}>{notice}</div>}
      {loading ? (
        <p style={ui.muted}>Loading...</p>
      ) : proposals.length === 0 ? (
        <p style={ui.muted}>No proposals yet. Create one to get started.</p>
      ) : (
        <div style={{ ...styles.grid, ...(isMobile ? styles.gridMobile : null), ...(isMobile ? { paddingBottom: 88 } : null) }}>
          {/* box-shadow (not background) for tap feedback: the card's existing
              background-color transition is tuned to 0.6s for the highlight/delete
              fade, so a fast tap ring uses a channel that doesn't fight it. */}
          <style>{`
            .ec-tap-card-ring { transition: box-shadow ${motionTokens.durationFast} ${motionTokens.easeDefault}; }
            .ec-tap-card-ring:active { box-shadow: inset 0 0 0 1px ${t.border.brand}; }
          `}</style>
          {proposals.map((p) => (
            <div
              key={p.id}
              className="ec-tap-card-ring"
              onClick={() => navigate(`/portal/admin/proposals/${p.id}`)}
              style={{
                ...styles.card,
                ...(p.id === highlightId ? styles.cardHighlight : null),
                ...(p.id === removingId ? styles.cardRemoving : null),
              }}
            >
              <div style={styles.cardTop}>
                <span style={styles.number}>{p.proposal_number || 'No number'}</span>
                <div style={styles.cardTopRight}>
                  <StatusBadge status={p.status} />
                  {/* Nudge bell: only for sent proposals awaiting client response. */}
                  {p.status === 'sent' && (
                    <button
                      type="button"
                      style={styles.nudgeBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        setNudgeTarget(p)
                      }}
                      aria-label="Send proposal reminder"
                      title="Send proposal reminder"
                    >
                      <Bell size={14} />
                    </button>
                  )}
                  {/* Owner/admin only. Opens the confirmation modal, which
                      surfaces any linked invoices before the irreversible delete. */}
                  {canDelete && (
                    <button
                      type="button"
                      style={styles.deleteBtn}
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget(p)
                      }}
                      aria-label="Delete proposal"
                      title="Delete proposal"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
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
                <span style={styles.validUntil}>Valid until {formatPortalDate(p.valid_until)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile sticky footer "+ New Proposal" */}
      {isMobile && (
        <div style={styles.stickyFooter}>
          <button type="button" style={styles.stickyFooterBtn} onClick={() => setShowNew(true)}>
            <Plus size={16} />
            New Proposal
          </button>
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

      {nudgeTarget && (
        <ProposalNudgeModal
          proposal={nudgeTarget as NudgeProposal}
          onClose={() => setNudgeTarget(null)}
          onSuccess={(msg) => {
            setNudgeTarget(null)
            toast.success(msg)
            void load()
          }}
        />
      )}

      {deleteTarget && (
        <DeleteProposalModal
          proposalId={deleteTarget.id}
          title={deleteTarget.title}
          totalAmount={Number(deleteTarget.total_amount)}
          currency={deleteTarget.currency}
          clientName={deleteTarget.client_name || deleteTarget.company_name || ''}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => finishDelete(deleteTarget)}
        />
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
  // Force a single full-width column on mobile with a tighter gap.
  gridMobile: { gridTemplateColumns: '1fr', gap: 12 },
  stickyFooter: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 40,
    padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))',
    background: tokens.surface,
    borderTop: `1px solid ${tokens.border}`,
  },
  stickyFooterBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 48,
    background: tokens.primary,
    color: t.text.onPrimary,
    border: 'none',
    borderRadius: 10,
    fontFamily: fonts.body,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  card: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    // Brand left accent, matching the expanded phase row in ProposalAccordion.
    borderLeft: `3px solid ${t.border.brand}`,
    borderRadius: 12,
    padding: 20,
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    // Lets the gold highlight fade back out smoothly once it is cleared, and the
    // card fade/scale out when a draft is deleted (5a).
    transition: `background-color 0.6s ease, border-left-color 0.6s ease, opacity ${motionTokens.durationBase} ${motionTokens.easeExit}, transform ${motionTokens.durationBase} ${motionTokens.easeExit}`,
  },
  cardHighlight: {
    borderLeft: `3px solid ${tokens.gold}`, // H4: semantic token - no raw hex
    background: tokens.goldLight,
  },
  cardRemoving: {
    opacity: 0,
    transform: 'scale(0.97)',
  },
  cardTopRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  nudgeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: tokens.tealLight,
    border: `1px solid ${tokens.accent}`,
    borderRadius: 6,
    color: tokens.primary,
    cursor: 'pointer',
    padding: '3px 6px',
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    color: tokens.ruby,
    cursor: 'pointer',
    padding: 2,
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
    color: t.text.tertiary,
  },
  title: {
    fontFamily: fonts.heading,
    fontSize: 18,
    fontWeight: 600,
    color: t.text.primary,
    margin: 0,
  },
  client: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.tertiary,
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
    color: t.text.primary,
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
    color: t.text.tertiary,
  },
}
