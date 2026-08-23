// Admin QR Manager, /portal/admin/qr — a top-level sidebar item (after Brand
// Visual Guide). Unlike Brand Visual Guide (which requires one client to be
// selected, since a guide only makes sense per-client), QR codes span every
// client in one table, exactly like Proposals/Invoices: the global "All
// clients" selector from usePortal() scopes the query when set, and shows
// everything when it isn't. Table on desktop, card list on mobile via
// useBreakpoint (LeadsTab/EnquiriesTab pattern). "Add QR" lives in the
// global TopBar, gated to this route -- see TopBar.tsx's isQrRoute.
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Download, Pencil, QrCode as QrCodeIcon } from 'lucide-react'
import type { CSSProperties } from 'react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import { PageHeader, EmptyState, mono } from './ui'
import { ClientFilterBanner } from './ClientFilterBanner'
import { clientLabel, usePortal } from '../PortalContext'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { SortableTableHeader, nextSortState, type SortableColumn, type SortDir } from '../components/shared/SortableTableHeader'
import { SkeletonRow } from '../components/shared/SkeletonRow'
import { Pagination } from '../components/shared/Pagination'
import { StickyBar } from '../components/shared/StickyBar'
import { usePagination } from '../hooks/usePagination'
import { getQrImageUrl, downloadExternalImage, qrStatusTone } from '../utils/qr'
import { QrDrawer, type QrCode } from './QrDrawer'

type QrRow = QrCode & {
  qr_scans: { count: number }[]
}

type SortKey = string | null

const USE_CASE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  website: 'Website',
  instagram: 'Instagram',
  google_review: 'Google Review',
  other: 'Other',
}

const MEDIUM_LABELS: Record<string, string> = {
  visiting_card: 'Visiting card',
  bookmark: 'Bookmark',
  banner: 'Banner',
  stationery: 'Stationery',
  digital: 'Digital',
}

const QR_COLUMNS: SortableColumn[] = [
  { key: 'label', label: 'LABEL', sortable: true },
  { key: 'client', label: 'CLIENT', sortable: true },
  { key: 'slug', label: 'SLUG', sortable: false },
  { key: 'use_case', label: 'USE CASE', sortable: true },
  { key: 'medium', label: 'MEDIUM', sortable: true },
  { key: 'scans', label: 'SCANS', sortable: true },
  { key: 'status', label: 'STATUS', sortable: true },
  { key: 'action', label: '', sortable: false },
]

export function QrAdmin() {
  const { clients, selectedClientId } = usePortal()
  const { isMobile } = useBreakpoint()
  const [rows, setRows] = useState<QrRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)
  const [drawer, setDrawer] = useState<{ mode: 'create' } | { mode: 'edit'; qr: QrCode } | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('qr_codes')
        .select('id, client_id, label, slug, destination_url, use_case, medium, is_active, qr_scans(count)')
        .order('created_at', { ascending: false })
      if (selectedClientId) query = query.eq('client_id', selectedClientId)
      const { data, error: err } = await query
      if (err) throw err
      setRows((data ?? []) as QrRow[])
      setError(null)
    } catch {
      setError('Could not load QR codes. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }, [selectedClientId])

  useEffect(() => { void load() }, [load])

  // ?add=1 opens the create drawer, same convention as LeadsTab's ?addLead=1.
  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setDrawer({ mode: 'create' })
      setSearchParams((prev) => {
        prev.delete('add')
        return prev
      }, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function scanCount(row: QrRow): number {
    return row.qr_scans?.[0]?.count ?? 0
  }

  function nameFor(clientId: string | null): string {
    return clientId ? clientLabel(clients.find((c) => c.id === clientId)) : 'No client'
  }

  // Optimistic toggle, same revert-on-failure idiom as CampaignsAdmin's
  // changeStatus: flip immediately, roll back only if the write fails.
  async function toggleActive(row: QrRow) {
    const prev = row.is_active
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, is_active: !prev } : r)))
    const { error: err } = await supabase.from('qr_codes').update({ is_active: !prev }).eq('id', row.id)
    if (err) {
      setRows((list) => list.map((r) => (r.id === row.id ? { ...r, is_active: prev } : r)))
      setError('Could not update QR status. Try again.')
    }
  }

  function handleDownload(row: QrRow) {
    void downloadExternalImage(getQrImageUrl(row.slug), `${row.slug}.png`)
  }

  function handleSaved() {
    setDrawer(null)
    void load()
  }

  function applySorting(list: QrRow[]): QrRow[] {
    if (!sortKey || !sortDir) return list
    return [...list].sort((a, b) => {
      let va: string | number
      let vb: string | number
      if (sortKey === 'label') { va = a.label.toLowerCase(); vb = b.label.toLowerCase() }
      else if (sortKey === 'client') { va = nameFor(a.client_id).toLowerCase(); vb = nameFor(b.client_id).toLowerCase() }
      else if (sortKey === 'use_case') { va = (a.use_case ?? '').toLowerCase(); vb = (b.use_case ?? '').toLowerCase() }
      else if (sortKey === 'medium') { va = (a.medium ?? '').toLowerCase(); vb = (b.medium ?? '').toLowerCase() }
      else if (sortKey === 'scans') { va = scanCount(a); vb = scanCount(b) }
      else if (sortKey === 'status') { va = a.is_active ? 1 : 0; vb = b.is_active ? 1 : 0 }
      else return 0
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va))
    })
  }

  const sorted = applySorting(rows)
  const {
    currentPage, pageSize, paginatedSlice, goToPage, changePageSize,
    reset: resetPage, pageStart, pageEnd,
  } = usePagination(sorted.length, 25)
  const pageRows = paginatedSlice(sorted)

  function handleSort(key: string) {
    const next = nextSortState(sortKey, sortDir, key)
    setSortKey(next.key)
    setSortDir(next.dir)
    resetPage()
  }

  return (
    <>
      <PageHeader title="QR Codes" subtitle="Static QR images that always resolve wherever their destination points today." />
      <ClientFilterBanner />
      {error && <div style={styles.error}>{error}</div>}

      {loading ? (
        isMobile ? (
          <div style={styles.list}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ ...styles.card, opacity: 0.5 }} />
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <SortableTableHeader columns={QR_COLUMNS} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonRow key={i} columns={QR_COLUMNS.length} />
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<QrCodeIcon size={28} />}
          heading="No QR codes yet."
          body="Add one to generate a static image that always resolves wherever its destination points today."
        />
      ) : (
        <>
          {isMobile ? (
            <div style={styles.list}>
              {pageRows.map((row) => {
                const tone = qrStatusTone(row.is_active)
                return (
                  <div key={row.id} style={styles.card}>
                    <div style={styles.cardTop}>
                      <span style={styles.label}>{row.label}</span>
                      <button
                        type="button"
                        style={{ ...styles.statusPill, background: tone.bg, color: tone.fg, cursor: 'pointer', border: 'none' }}
                        onClick={() => toggleActive(row)}
                      >
                        {row.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                    <span style={styles.clientName}>{nameFor(row.client_id)}</span>
                    <span style={styles.slug}>eswarcreatives.in/qr/{row.slug}</span>
                    <div style={styles.badgeRow}>
                      <span style={styles.badge}>{USE_CASE_LABELS[row.use_case ?? ''] ?? row.use_case}</span>
                      <span style={styles.badge}>{MEDIUM_LABELS[row.medium ?? ''] ?? row.medium}</span>
                      <span style={styles.scans}>{scanCount(row)} scans</span>
                    </div>
                    <div style={styles.cardActions}>
                      <button type="button" style={styles.actionBtn} onClick={() => setDrawer({ mode: 'edit', qr: row })}>
                        <Pencil size={13} /> Edit
                      </button>
                      <button type="button" style={styles.actionBtn} onClick={() => handleDownload(row)}>
                        <Download size={13} /> Download
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <SortableTableHeader columns={QR_COLUMNS} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                </thead>
                <tbody>
                  {pageRows.map((row) => {
                    const tone = qrStatusTone(row.is_active)
                    return (
                      <tr key={row.id} style={styles.tr}>
                        <td style={styles.td}>{row.label}</td>
                        <td style={styles.td}>{nameFor(row.client_id)}</td>
                        <td style={styles.td}><span style={styles.monoCell}>{row.slug}</span></td>
                        <td style={styles.td}>{USE_CASE_LABELS[row.use_case ?? ''] ?? row.use_case}</td>
                        <td style={styles.td}>{MEDIUM_LABELS[row.medium ?? ''] ?? row.medium}</td>
                        <td style={styles.td}>{scanCount(row)}</td>
                        <td style={styles.td}>
                          <button
                            type="button"
                            style={{ ...styles.statusPill, background: tone.bg, color: tone.fg, cursor: 'pointer', border: 'none' }}
                            onClick={() => toggleActive(row)}
                          >
                            {row.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td style={styles.td}>
                          <div style={styles.rowActions}>
                            <button type="button" style={styles.iconBtn} onClick={() => setDrawer({ mode: 'edit', qr: row })} aria-label="Edit destination" title="Edit destination">
                              <Pencil size={14} />
                            </button>
                            <button type="button" style={styles.iconBtn} onClick={() => handleDownload(row)} aria-label="Download QR image" title="Download QR image">
                              <Download size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <StickyBar>
            <Pagination
              totalItems={sorted.length}
              pageSize={pageSize}
              currentPage={currentPage}
              onPageChange={goToPage}
              onPageSizeChange={changePageSize}
              pageStart={pageStart}
              pageEnd={pageEnd}
              itemLabel={sorted.length === 1 ? 'QR code' : 'QR codes'}
            />
          </StickyBar>
        </>
      )}

      {drawer?.mode === 'create' && (
        <QrDrawer
          mode="create"
          clients={clients}
          defaultClientId={selectedClientId}
          onClose={() => setDrawer(null)}
          onSaved={handleSaved}
        />
      )}
      {drawer?.mode === 'edit' && (
        <QrDrawer mode="edit" qr={drawer.qr} onClose={() => setDrawer(null)} onSaved={handleSaved} />
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
  list: { display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 24 },
  card: {
    border: `1px solid ${t.border.default}`,
    borderRadius: 12,
    padding: 16,
    background: tokens.surface,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  label: { fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: t.text.primary },
  clientName: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary },
  slug: { fontFamily: mono, fontSize: 12, color: t.text.muted },
  badgeRow: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 6,
    background: t.background.muted,
    color: t.text.tertiary,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 500,
  },
  scans: { fontFamily: fonts.body, fontSize: 12, color: t.text.muted, marginLeft: 'auto' },
  cardActions: { display: 'flex', gap: 8, marginTop: 4 },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    background: t.background.subtle,
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    color: t.text.secondary,
    fontFamily: fonts.body,
    fontSize: 12.5,
    fontWeight: 600,
    padding: '6px 12px',
    cursor: 'pointer',
  },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: 860 },
  tr: {},
  td: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: t.text.primary,
    padding: '12px',
    borderBottom: `1px solid ${t.border.subtle}`,
    verticalAlign: 'middle',
  },
  monoCell: { fontFamily: mono, fontSize: 12, color: t.text.secondary },
  statusPill: {
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 999,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  rowActions: { display: 'flex', gap: 6 },
  iconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: `1px solid ${t.border.default}`,
    borderRadius: 6,
    color: t.text.secondary,
    cursor: 'pointer',
    padding: 6,
  },
}
