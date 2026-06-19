import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { supabase } from '../../lib/supabase'
import { tokens, fonts } from '../theme'
import { PageHeader, Card, ui } from './ui'
import type { CSSProperties } from 'react'

type Client = {
  id: string
  company_name: string | null
  contact_name: string | null
  country: string | null
  preferred_currency: string
}

export function ClientsList() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error: err } = await supabase
          .from('clients')
          .select('id, company_name, contact_name, country, preferred_currency')
          .order('company_name', { ascending: true })
        if (err) throw err
        if (!cancelled) setClients((data ?? []) as Client[])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <PageHeader title="Clients" />
      {error && <div style={styles.error}>{error}</div>}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ ...ui.muted, padding: 20 }}>Loading...</p>
        ) : clients.length === 0 ? (
          <p style={{ ...ui.muted, padding: 20 }}>No clients yet.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Company</th>
                <th style={styles.th}>Contact</th>
                <th style={styles.th}>Country</th>
                <th style={styles.th}>Currency</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/portal/admin/clients/${c.id}`)}
                  style={styles.row}
                >
                  <td style={{ ...styles.td, fontWeight: 600, color: tokens.text }}>
                    {c.company_name || '(unnamed)'}
                  </td>
                  <td style={styles.td}>{c.contact_name || '—'}</td>
                  <td style={styles.td}>{c.country || '—'}</td>
                  <td style={styles.td}>{c.preferred_currency}</td>
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
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: fonts.body,
  },
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
  row: {
    cursor: 'pointer',
  },
  td: {
    padding: '14px 20px',
    fontSize: 14,
    color: tokens.textMuted,
    borderBottom: `1px solid ${tokens.border}`,
  },
}
