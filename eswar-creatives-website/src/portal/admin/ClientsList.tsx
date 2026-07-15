import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router'
import { Plus, Check, ChevronDown, MoreVertical } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { tokens, t, fonts } from '../theme'
import { Card, ui } from './ui'
import { AddClientModal } from './AddClientModal'
import { ClientPanel } from './ClientPanel'
import { useBreakpoint } from '../hooks/useBreakpoint'
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
  const { isMobile } = useBreakpoint()

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

  // Mobile card overflow menu: which client row's menu is open + fixed position,
  // reusing the same position:fixed z-index:1000 dropdown pattern as InvoicesAdmin.
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const cardMenuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpenId) return
    function onDoc(e: MouseEvent) {
      if (cardMenuRef.current && !cardMenuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
        setMenuPos(null)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [menuOpenId])

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
      <div style={{ ...styles.topBar, ...(isMobile ? styles.topBarMobile : null) }}>
        <div style={{ ...styles.dropdownWrap, ...(isMobile ? { width: '100%' } : null) }}>
          <button
            type="button"
            style={{ ...styles.dropdownBtn, ...(isMobile ? { width: '100%', justifyContent: 'space-between' } : null) }}
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

        {/* Desktop/tablet: inline "Add client" button. Mobile: full-width sticky footer below. */}
        {!isMobile && (
          <button type="button" style={ui.primaryBtn} onClick={() => setShowAdd(true)}>
            <Plus size={16} />
            Add client
          </button>
        )}
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {isMobile ? (
        loading ? (
          <p style={{ ...ui.muted, padding: '20px 0' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p style={{ ...ui.muted, padding: '20px 0' }}>No clients yet.</p>
        ) : (
          <div style={{ ...styles.cardStack, paddingBottom: 88 }}>
            {filtered.map((c) => (
              <div
                key={c.id}
                style={{ ...styles.mobileCard, ...(c.id === highlightId ? styles.rowHighlight : null) }}
              >
                <div style={styles.mobileCardBody} onClick={() => setPanelClientId(c.id)}>
                  <div style={styles.mobileCardTop}>
                    <span style={styles.mobileCardName}>{c.company_name || '(unnamed)'}</span>
                  </div>
                  {c.contact_name && <span style={styles.mobileCardMeta}>{c.contact_name}</span>}
                  <span style={styles.mobileCardMeta}>
                    {c.country || '—'} · {c.preferred_currency}
                  </span>
                </div>
                <div style={styles.mobileCardActions}>
                  <button
                    type="button"
                    style={styles.viewBtn}
                    onClick={() => setPanelClientId(c.id)}
                  >
                    View
                  </button>
                  <div
                    style={{ position: 'relative' }}
                    ref={(el) => { if (menuOpenId === c.id) cardMenuRef.current = el }}
                  >
                    <button
                      type="button"
                      style={styles.dotMenuBtn}
                      onClick={(e) => {
                        if (menuOpenId === c.id) {
                          setMenuOpenId(null)
                          setMenuPos(null)
                        } else {
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                          setMenuOpenId(c.id)
                          setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
                        }
                      }}
                      aria-label="More actions"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {menuOpenId === c.id && menuPos && (
                      <div style={{ ...styles.dropMenu, top: menuPos.top, right: menuPos.right }}>
                        <button
                          type="button"
                          style={styles.dropItem}
                          onClick={() => { setPanelClientId(c.id); setMenuOpenId(null) }}
                        >
                          Manage client
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
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
      )}

      {/* Mobile: full-width sticky footer "+ Add Client" with safe-area clearance. */}
      {isMobile && (
        <div style={styles.stickyFooter}>
          <button type="button" style={styles.stickyFooterBtn} onClick={() => setShowAdd(true)}>
            <Plus size={16} />
            Add Client
          </button>
        </div>
      )}

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
  topBarMobile: { height: 'auto', padding: '12px 4px' },
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

  // Mobile card list
  cardStack: { display: 'flex', flexDirection: 'column', gap: 8 },
  mobileCard: {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 12,
    overflow: 'hidden',
    transition: 'background-color 0.6s ease',
  },
  mobileCardBody: { padding: 16, display: 'flex', flexDirection: 'column', gap: 4, cursor: 'pointer' },
  mobileCardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  mobileCardName: { fontFamily: fonts.body, fontSize: 15, fontWeight: 600, color: t.text.primary },
  mobileCardMeta: { fontFamily: fonts.body, fontSize: 13, color: t.text.secondary },
  mobileCardActions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    padding: '8px 12px',
    borderTop: `1px solid ${t.border.subtle}`,
    background: t.background.subtle,
  },
  viewBtn: {
    background: 'transparent',
    border: `1px solid ${t.border.default}`,
    borderRadius: 8,
    color: t.text.primaryBrand,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    padding: '8px 14px',
    minHeight: 36,
  },
  // 3-dot overflow menu: same position:fixed z-index:1000 pattern as InvoicesAdmin,
  // reused here rather than reinvented.
  dotMenuBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    background: 'transparent',
    border: 'none',
    color: t.text.muted,
    cursor: 'pointer',
    borderRadius: '50%',
    padding: 0,
  },
  dropMenu: {
    position: 'fixed',
    zIndex: 1000,
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 10,
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    minWidth: 164,
    padding: '4px 0',
    display: 'flex',
    flexDirection: 'column',
  },
  dropItem: {
    background: 'transparent',
    border: 'none',
    padding: '9px 14px',
    textAlign: 'left',
    fontFamily: fonts.body,
    fontSize: 14,
    color: t.text.primary,
    cursor: 'pointer',
    minHeight: 44,
    display: 'flex',
    alignItems: 'center',
  },

  // Sticky "+ Add Client" footer (mobile only)
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
}
