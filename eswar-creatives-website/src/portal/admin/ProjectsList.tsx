import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../../lib/supabase'
import { tokens, fonts } from '../theme'
import { PageHeader, Card, StatusBadge, ui } from './ui'
import { usePortal } from '../PortalContext'
import { ClientFilterBanner } from './ClientFilterBanner'
import type { CSSProperties } from 'react'

type Project = {
  id: string
  title: string
  status: string
  current_phase: string | null
  client_id: string | null
  clients: { company_name: string | null; contact_name: string | null } | null
}

function clientLabel(p: Project) {
  return p.clients?.company_name || p.clients?.contact_name || '—'
}

export function ProjectsList() {
  const navigate = useNavigate()
  const { selectedClientId } = usePortal()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        let query = supabase
          .from('projects')
          .select('id, title, status, current_phase, client_id, clients(company_name, contact_name)')
          .order('created_at', { ascending: false })
        if (selectedClientId) query = query.eq('client_id', selectedClientId)
        const { data, error: err } = await query
        if (err) throw err
        if (!cancelled) setProjects((data ?? []) as unknown as Project[])
      } catch {
        if (!cancelled) setError('Could not load projects. Refresh to try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedClientId])

  return (
    <>
      <PageHeader title="Projects" />
      <ClientFilterBanner />
      {error && <div style={styles.error}>{error}</div>}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ ...ui.muted, padding: 20 }}>Loading...</p>
        ) : projects.length === 0 ? (
          <p style={{ ...ui.muted, padding: 20 }}>No projects yet.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Project</th>
                <th style={styles.th}>Client</th>
                <th style={styles.th}>Phase</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => p.client_id && navigate(`/portal/admin/clients/${p.client_id}`)}
                  style={{ cursor: p.client_id ? 'pointer' : 'default' }}
                >
                  <td style={{ ...styles.td, fontWeight: 600, color: tokens.text }}>{p.title}</td>
                  <td style={styles.td}>{clientLabel(p)}</td>
                  <td style={styles.td}>{p.current_phase || '—'}</td>
                  <td style={styles.td}>
                    <StatusBadge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
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
  td: {
    padding: '14px 20px',
    fontSize: 14,
    color: tokens.textMuted,
    borderBottom: `1px solid ${tokens.border}`,
  },
}
