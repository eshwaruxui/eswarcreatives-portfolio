// Quotation Module Phase 1 — admin list. Mirrors ProposalsAdmin/InvoicesAdmin's
// list-page shape (PageHeader + Card + StatusBadge), but "New" and row-click
// both navigate to the full-screen QuotationBuilder route rather than opening
// a Modal/SidePanel — the builder's two-column scope step needs real width.
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router'
import { Plus, ReceiptText, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import { PageHeader, Card, StatusBadge, ui, mono, formatMoney } from './ui'
import { formatDocumentDate } from '../utils/formatDate'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { DeleteQuotationModal, type DeletableQuotation } from './DeleteQuotationModal'
import type { PortalProfile } from '../PortalGuard'
import type { CSSProperties } from 'react'

type QuotationRow = {
  id: string
  quotation_number: string
  client_name: string
  event_type: string
  event_date: string | null
  total_amount: number
  status: string
  created_at: string
}

export function QuotationsAdmin() {
  const navigate = useNavigate()
  const { isMobile } = useBreakpoint()
  // AdminShell gates this whole area to owner/admin and passes the profile via
  // the router outlet; only those roles may delete a quotation (mirrors invoices).
  const profile = useOutletContext<PortalProfile>()
  const canDelete = profile?.role === 'owner' || profile?.role === 'admin'
  const [rows, setRows] = useState<QuotationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // The quotation queued for deletion (drives the confirmation modal).
  const [deleteTarget, setDeleteTarget] = useState<DeletableQuotation | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: loadErr } = await supabase
      .from('quotations')
      .select('id, quotation_number, client_name, event_type, event_date, total_amount, status, created_at')
      .order('created_at', { ascending: false })
    if (loadErr) {
      setError('Could not load quotations. Refresh to try again.')
    } else {
      setRows((data ?? []) as QuotationRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <PageHeader
        title="Quotations"
        action={
          <button type="button" style={ui.primaryBtn} onClick={() => navigate('/portal/admin/quotations/new')}>
            <Plus size={16} />
            New Quotation
          </button>
        }
      />

      {error && <div style={styles.error}>{error}</div>}

      <Card>
        {loading ? (
          <p style={ui.muted}>Loading...</p>
        ) : rows.length === 0 ? (
          <div style={styles.empty}>
            <ReceiptText size={28} color={tokens.textMuted} />
            <p style={ui.muted}>No quotations yet. Create the first one.</p>
          </div>
        ) : isMobile ? (
          <div style={styles.cardList}>
            {rows.map((r) => (
              <div key={r.id} style={styles.mobileCard} onClick={() => navigate(`/portal/admin/quotations/${r.id}`)}>
                <div style={styles.mobileCardTop}>
                  <span style={styles.quoteNumber}>{r.quotation_number}</span>
                  <span style={styles.mobileTopRight}>
                    <StatusBadge status={r.status} />
                    {canDelete && r.status === 'draft' && (
                      <button
                        type="button"
                        style={styles.deleteBtn}
                        aria-label={`Delete quotation ${r.quotation_number}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(r)
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </span>
                </div>
                <div style={styles.mobileClient}>{r.client_name}</div>
                <div style={styles.mobileMeta}>
                  {r.event_type}
                  {r.event_date ? ` · ${formatDocumentDate(r.event_date)}` : ''}
                </div>
                <div style={styles.mobileAmount}>{formatMoney(r.total_amount, 'INR')}</div>
              </div>
            ))}
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Quote #</th>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Event</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Total</th>
                <th style={styles.th}>Status</th>
                {canDelete && <th style={styles.th} aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={styles.row} onClick={() => navigate(`/portal/admin/quotations/${r.id}`)}>
                  <td style={{ ...styles.td, fontFamily: mono }}>{r.quotation_number}</td>
                  <td style={styles.td}>{r.client_name}</td>
                  <td style={styles.td}>{r.event_type}</td>
                  <td style={styles.td}>{formatDocumentDate(r.event_date)}</td>
                  <td style={{ ...styles.td, fontFamily: mono }}>{formatMoney(r.total_amount, 'INR')}</td>
                  <td style={styles.td}>
                    <StatusBadge status={r.status} />
                  </td>
                  {canDelete && (
                    <td style={{ ...styles.td, width: 44 }}>
                      {r.status === 'draft' ? (
                        <button
                          type="button"
                          style={styles.deleteBtn}
                          aria-label={`Delete quotation ${r.quotation_number}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget(r)
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : (
                        // H5: a sent quotation is a document the client has
                        // seen; the muted icon + title says why it stays.
                        <span
                          style={styles.deleteBtnDisabled}
                          title="Sent quotations are kept as a record and cannot be deleted"
                        >
                          <Trash2 size={15} />
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {deleteTarget && (
        <DeleteQuotationModal
          quotation={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null)
            void load()
          }}
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
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    padding: '48px 16px',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.tertiary,
    padding: '10px 12px',
    borderBottom: `1px solid ${tokens.border}`,
  },
  row: { cursor: 'pointer' },
  td: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    padding: '12px',
    borderBottom: `1px solid ${tokens.border}`,
  },
  cardList: { display: 'flex', flexDirection: 'column', gap: 10 },
  mobileCard: {
    border: `1px solid ${tokens.border}`,
    borderRadius: 10,
    padding: 14,
    cursor: 'pointer',
  },
  mobileCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  mobileTopRight: { display: 'flex', alignItems: 'center', gap: 8 },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    background: 'transparent',
    color: tokens.ruby,
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    padding: 0,
  },
  deleteBtnDisabled: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    color: t.text.disabled,
    cursor: 'not-allowed',
  },
  quoteNumber: { fontFamily: mono, fontSize: 12, color: t.text.tertiary },
  mobileClient: { fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: t.text.primary },
  mobileMeta: { fontFamily: fonts.body, fontSize: 12, color: t.text.tertiary, marginTop: 2 },
  mobileAmount: { fontFamily: mono, fontSize: 14, fontWeight: 600, color: t.text.primary, marginTop: 8 },
}
