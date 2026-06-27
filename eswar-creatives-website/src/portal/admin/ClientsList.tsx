import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router'
import { Plus, Check, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import { Card, ui } from './ui'
import { AddClientModal } from './AddClientModal'
import { ClientPanel } from './ClientPanel'
import type { PortalProfile } from '../PortalGuard'
import type { CSSProperties } from 'react'

type Client = {
  id: string
  company_name: string | null
  contact_name: string | null
  country: string | null
  preferred_currency: string
}

export function ClientsList() {
  // AdminShell gates this whole area to owner/admin and passes the profile via
  // the router outlet; only those roles may hard-delete a client.
  const profile = useOutletContext<PortalProfile>()
  const canDelete = profile?.role === 'owner' || profile?.role === 'admin'

  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Session-only filter: 'all' or a specific client id.
  const [filterId, setFilterId] = useState<string>('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  // Clicking a row opens the manage-client slide-in panel.
  const [panelClientId, setPanelClientId] = useState<string | null>(null)

  // Briefly highlight a newly added client row, then fade it out.
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function load() {
    setLoading(true)
    try {
      const { data, error: err } = await supabase
        .from('clients')
        .select('id, company_name, contact_name, country, preferred_currency')
        .order('company_name', { ascending: true })
      if (err) throw err
      setClients((data ?? []) as Client[])
    } catch {
      // Listing failure is the one place we keep it generic; never raw.
      setError('Could not load clients. Refresh to try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    return () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current)
    }
  }, [])

  const filtered = useMemo(
    () => (filterId === 'all' ? clients : clients.filter((c) => c.id === filterId)),
    [clients, filterId]
  )

  const selectedLabel =
    filterId === 'all'
      ? 'All clients'
      : clients.find((c) => c.id === filterId)?.company_name || 'Selected client'

  function handleCreated(newId: string) {
    setShowAdd(false)
    setFilterId('all') // make sure the new row is visible
    setHighlightId(newId)
    if (highlightTimer.current) clearTimeout(highlightTimer.current)
    highlightTimer.current = setTimeout(() => setHighlightId(null), 2500)
    void load()
  }

  return (
    <>
      <div style={styles.topBar}>
        <div style={styles.dropdownWrap}>
          <button
            type="button"
            style={styles.dropdownBtn}
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
          >
            {selectedLabel}
            <ChevronDown size={15} />
          </button>
          {menuOpen && (
            <>
              <div style={styles.menuBackdrop} onClick={() => setMenuOpen(false)} />
              <ul style={styles.menu} role="listbox">
                <MenuItem
                  label="All clients"
                  selected={filterId === 'all'}
                  onClick={() => {
                    setFilterId('all')
                    setMenuOpen(false)
                  }}
                />
                {clients.map((c) => (
                  <MenuItem
                    key={c.id}
                    label={c.company_name || c.contact_name || '(unnamed)'}
                    selected={filterId === c.id}
                    onClick={() => {
                      setFilterId(c.id)
                      setMenuOpen(false)
                    }}
                  />
                ))}
              </ul>
            </>
          )}
        </div>

        <button type="button" style={ui.primaryBtn} onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          Add client
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <p style={{ ...ui.muted, padding: 20 }}>Loading...</p>
        ) : filtered.length === 0 ? (
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
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setPanelClientId(c.id)}
                  style={{ ...styles.row, ...(c.id === highlightId ? styles.rowHighlight : null) }}
                >
                  <td
                    style={{
                      ...styles.td,
                      ...styles.firstCell,
                      fontWeight: 600,
                      color: t.text.primary,
                      borderLeftColor: c.id === highlightId ? tokens.gold : 'transparent', // H4: semantic token - no raw hex
                    }}
                  >
                    {c.company_name || '(unnamed)'}
                  </td>
                  <td style={styles.td}>{c.contact_name || '-'}</td>
                  <td style={styles.td}>{c.country || '-'}</td>
                  <td style={styles.td}>{c.preferred_currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} onCreated={handleCreated} />}

      {panelClientId && (
        <ClientPanel
          clientId={panelClientId}
          canDelete={canDelete}
          onClose={() => setPanelClientId(null)}
          onChanged={() => void load()}
          onDeleted={() => {
            setPanelClientId(null)
            setFilterId('all') // the deleted client may have been the active filter
            void load()
          }}
        />
      )}
    </>
  )
}

function MenuItem({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <li>
      <button type="button" style={styles.menuItem} onClick={onClick} role="option" aria-selected={selected}>
        <span style={{ width: 16, display: 'inline-flex' }}>
          {selected && <Check size={15} style={{ color: tokens.accent }} />}
        </span>
        <span style={{ color: selected ? tokens.primary : t.text.primary, fontWeight: selected ? 600 : 400 }}>
          {label}
        </span>
      </button>
    </li>
  )
}

const styles: Record<string, CSSProperties> = {
  topBar: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    height: 56,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '0 4px',
    marginBottom: 16,
    background: tokens.surface,
    borderBottom: `1px solid ${tokens.border}`,
  },
  dropdownWrap: { position: 'relative' },
  dropdownBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 8,
    padding: '8px 14px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    color: t.text.primary,
    cursor: 'pointer',
  },
  menuBackdrop: { position: 'fixed', inset: 0, zIndex: 30 },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 6,
    minWidth: 220,
    maxHeight: 320,
    overflowY: 'auto',
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 10,
    boxShadow: '0 12px 32px rgba(2, 76, 79, 0.12)',
    padding: 6,
    margin: 0,
    listStyle: 'none',
    zIndex: 31,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    padding: '8px 10px',
    fontFamily: fonts.body,
    fontSize: 14,
    cursor: 'pointer',
    textAlign: 'left',
  },
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
    color: t.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    borderBottom: `1px solid ${tokens.border}`,
    background: tokens.bg,
  },
  row: {
    cursor: 'pointer',
    transition: 'background-color 0.6s ease',
  },
  rowHighlight: {
    background: tokens.goldLight, // H4: semantic token - no raw hex
  },
  td: {
    padding: '14px 20px',
    fontSize: 14,
    color: t.text.secondary,
    borderBottom: `1px solid ${tokens.border}`,
  },
  firstCell: {
    borderLeftWidth: 3,
    borderLeftStyle: 'solid',
    transition: 'border-left-color 0.6s ease, background-color 0.6s ease',
  },
}
