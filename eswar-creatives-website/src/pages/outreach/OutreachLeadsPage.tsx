import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { t, tokens, fonts, motionTokens } from '../../portal/theme'
import { usePagination } from '../../portal/hooks/usePagination'
import { Pagination } from '../../portal/components/shared/Pagination'
import { SkeletonRow } from '../../portal/components/shared/SkeletonRow'
import { formatPortalDate } from '../../portal/utils/formatDate'
import { LeadImageUploader, type ExtractedLead } from './components/LeadImageUploader'

type Lead = {
  id: string
  first_name: string
  last_name: string | null
  company: string
  role_title: string | null
  email: string | null
  created_at: string
}

export function OutreachLeadsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [leads, setLeads] = useState<Lead[] | null>(null)
  const [showAddLead, setShowAddLead] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || cancelled) return
      setUserId(session.user.id)
      await loadLeads(session.user.id)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function loadLeads(uid: string) {
    const { data } = await supabase
      .from('leads')
      .select('id, first_name, last_name, company, role_title, email, created_at')
      .eq('owner_id', uid)
      .order('created_at', { ascending: false })
    setLeads((data as Lead[]) ?? [])
  }

  async function handleAddLead(lead: ExtractedLead) {
    if (!userId || !lead.first_name || !lead.company) return
    await supabase.from('leads').insert({
      first_name: lead.first_name,
      last_name: lead.last_name,
      company: lead.company,
      role_title: lead.role_title,
      email: lead.email,
      linkedin_url: lead.linkedin_url,
      segment: 'saas_product',
      source: 'manual',
      owner_id: userId,
    })
    setShowAddLead(false)
    await loadLeads(userId)
  }

  const {
    currentPage, pageSize, paginatedSlice, goToPage, changePageSize, pageStart, pageEnd,
  } = usePagination(leads?.length ?? 0, 25)
  const pageRows = leads ? paginatedSlice(leads) : []

  return (
    <div style={styles.wrap}>
      <div style={styles.headerRow}>
        <h1 style={styles.title}>Your leads</h1>
        <button type="button" onClick={() => setShowAddLead((s) => !s)} style={styles.addButton}>
          {showAddLead ? <X size={16} /> : <Plus size={16} />}
          {showAddLead ? 'Close' : 'Add lead'}
        </button>
      </div>

      {showAddLead && (
        <div style={styles.addPanel}>
          <LeadImageUploader onConfirm={handleAddLead} confirmLabel="Add lead" />
        </div>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>Company</th>
              <th style={styles.th}>Title</th>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Added</th>
            </tr>
          </thead>
          <tbody>
            {leads === null &&
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} columns={5} />)}

            {leads !== null && leads.length === 0 && (
              <tr>
                <td colSpan={5} style={styles.emptyCell}>
                  No leads yet. Add your first one above.
                </td>
              </tr>
            )}

            {pageRows.map((lead) => (
              <tr key={lead.id}>
                <td style={styles.td}>{[lead.first_name, lead.last_name].filter(Boolean).join(' ')}</td>
                <td style={styles.td}>{lead.company}</td>
                <td style={styles.td}>{lead.role_title || '—'}</td>
                <td style={styles.td}>{lead.email || '—'}</td>
                <td style={styles.td}>{formatPortalDate(lead.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {leads !== null && leads.length > 0 && (
        <Pagination
          totalItems={leads.length}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={goToPage}
          onPageSizeChange={changePageSize}
          pageStart={pageStart}
          pageEnd={pageEnd}
          itemLabel="leads"
        />
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
  addPanel: {
    border: `1px solid ${t.border.subtle}`,
    borderRadius: 12,
    padding: 20,
    maxWidth: 420,
  },
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
  emptyCell: {
    padding: '32px 16px',
    textAlign: 'center',
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.secondary,
  },
}
