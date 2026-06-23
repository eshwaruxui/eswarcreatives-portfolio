// Global persistent top bar for the admin portal. Sits above the sidebar and
// content, sticky across every admin route. Holds three things:
//   1. the Eswar Creatives brand mark,
//   2. a client selector that scopes downstream pages via PortalContext,
//   3. a settings gear that opens a slide-in panel (manage/add clients, sign out).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Check, ChevronDown, Settings, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { clientLabel, usePortal } from '../PortalContext'
import { tokens, fonts, motionTokens } from '../theme'
import { useSignOut } from '../useSignOut'
import { Spinner } from '../Spinner'
import { AddClientModal } from './AddClientModal'

// Neutral grey divider used by the bar and its popovers, per the Phase 3 spec.
const HAIRLINE = '#E5E7EB'

export function TopBar() {
  const navigate = useNavigate()
  const { clients, selectedClientId, setSelectedClientId, selectedClient, reloadClients } =
    usePortal()

  const { signingOut, error: signOutError, signOut } = useSignOut()
  const [menuOpen, setMenuOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showAddClient, setShowAddClient] = useState(false)

  // H7: Flexibility and efficiency — Escape closes the client menu or settings panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setMenuOpen(false)
      setSettingsOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const selectorLabel = selectedClient ? clientLabel(selectedClient) : 'All clients'

  function handleClientCreated() {
    setShowAddClient(false)
    void reloadClients()
  }

  return (
    <>
      <header style={styles.bar}>
        {/* Brand */}
        <div style={styles.brand}>
          <span style={styles.logoCircle}>
            <span style={styles.logoLetter}>e</span>
          </span>
          <span style={styles.brandName}>Eswar Creatives</span>
        </div>

        {/* Client selector */}
        <div style={styles.selectorWrap}>
          <button
            type="button"
            style={styles.selectorBtn}
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
          >
            {selectorLabel}
            <ChevronDown size={15} />
          </button>
          {menuOpen && (
            <>
              <div style={styles.backdrop} onClick={() => setMenuOpen(false)} />
              <ul style={styles.menu} role="listbox">
                <SelectorItem
                  label="All clients"
                  selected={selectedClientId === null}
                  onClick={() => {
                    setSelectedClientId(null)
                    setMenuOpen(false)
                  }}
                />
                {clients.map((c) => (
                  <SelectorItem
                    key={c.id}
                    label={clientLabel(c)}
                    selected={selectedClientId === c.id}
                    onClick={() => {
                      setSelectedClientId(c.id)
                      setMenuOpen(false)
                    }}
                  />
                ))}
              </ul>
            </>
          )}
        </div>

        <div style={styles.spacer} />

        {/* Settings */}
        <button
          type="button"
          style={styles.gearBtn}
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>
      </header>

      {settingsOpen && (
        <SettingsPanel
          onClose={() => setSettingsOpen(false)}
          onManageClients={() => {
            setSettingsOpen(false)
            navigate('/portal/admin/clients')
          }}
          onAddClient={() => {
            setSettingsOpen(false)
            setShowAddClient(true)
          }}
          onSignOut={signOut}
          signingOut={signingOut}
          signOutError={signOutError}
        />
      )}

      {showAddClient && (
        <AddClientModal onClose={() => setShowAddClient(false)} onCreated={handleClientCreated} />
      )}
    </>
  )
}

function SelectorItem({
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
      <button
        type="button"
        style={styles.menuItem}
        onClick={onClick}
        role="option"
        aria-selected={selected}
      >
        <span style={{ width: 16, display: 'inline-flex' }}>
          {selected && <Check size={15} style={{ color: tokens.accent }} />}
        </span>
        <span style={{ color: selected ? tokens.primary : tokens.text, fontWeight: selected ? 600 : 400 }}>
          {label}
        </span>
      </button>
    </li>
  )
}

function SettingsPanel({
  onClose,
  onManageClients,
  onAddClient,
  onSignOut,
  signingOut,
  signOutError,
}: {
  onClose: () => void
  onManageClients: () => void
  onAddClient: () => void
  onSignOut: () => void
  signingOut: boolean
  signOutError: string | null
}) {
  return (
    <div style={styles.panelOverlay} onClick={onClose}>
      {/* Panel slide-in: transform only, durationBase + easeEnter per motion rules. */}
      <style>{`@keyframes settingsPanelIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <aside style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.panelHead}>
          <h2 style={styles.panelTitle}>Settings</h2>
          <button type="button" style={styles.panelClose} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <section style={styles.section}>
          <h3 style={styles.sectionLabel}>Clients</h3>
          <button type="button" style={styles.panelLink} onClick={onManageClients}>
            Manage Clients
          </button>
          <button type="button" style={styles.panelLink} onClick={onAddClient}>
            Add Client
          </button>
        </section>

        <div style={styles.divider} />

        <section style={styles.section}>
          <h3 style={styles.sectionLabel}>Account</h3>
          {/* H1: visibility of system status — inline feedback, disabled while busy. */}
          <button
            type="button"
            style={{ ...styles.signOut, ...(signingOut ? styles.signOutBusy : null) }}
            onClick={onSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <>
                <Spinner size={13} color={tokens.ruby} />
                <span>Signing out...</span>
              </>
            ) : (
              'Sign out'
            )}
          </button>
          {signOutError && (
            <span role="alert" style={styles.signOutError}>
              {signOutError}
            </span>
          )}
        </section>
      </aside>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  bar: {
    position: 'sticky',
    top: 0,
    // CHANGE 3 / H?: the sticky bar must sit BELOW every overlay (modals z100+,
    // side panels z201, settings z300, lightbox z9999) so it never paints over
    // an open dialog or the client lightbox. It still floats above page content.
    zIndex: 90,
    height: 56,
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    padding: '0 20px',
    background: tokens.surface,
    borderBottom: `1px solid ${HAIRLINE}`,
    boxSizing: 'border-box',
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  logoCircle: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: tokens.primary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  logoLetter: {
    color: '#fff',
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1,
    marginTop: 1,
  },
  brandName: {
    fontFamily: fonts.heading,
    fontSize: 15,
    fontWeight: 600,
    color: tokens.text,
    whiteSpace: 'nowrap',
  },
  selectorWrap: { position: 'relative' },
  selectorBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: tokens.surface,
    border: `1px solid ${HAIRLINE}`,
    borderRadius: 8,
    padding: '7px 14px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    color: tokens.text,
    cursor: 'pointer',
  },
  backdrop: { position: 'fixed', inset: 0, zIndex: 30 },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 6,
    minWidth: 220,
    maxHeight: 280,
    overflowY: 'auto',
    background: tokens.surface,
    border: `1px solid ${HAIRLINE}`,
    borderRadius: 8,
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
  spacer: { flex: 1 },
  gearBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'transparent',
    border: `1px solid ${HAIRLINE}`,
    color: tokens.textMuted,
    cursor: 'pointer',
  },

  // ── Settings slide-in panel ────────────────────────────────────────────
  panelOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 26, 27, 0.4)',
    zIndex: 300,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  panel: {
    width: 280,
    height: '100%',
    background: tokens.surface,
    borderLeft: `1px solid ${HAIRLINE}`,
    boxShadow: '-12px 0 32px rgba(2, 76, 79, 0.12)',
    padding: 20,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    animation: `settingsPanelIn ${motionTokens.durationBase} ${motionTokens.easeEnter}`,
  },
  panelHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  panelTitle: {
    fontFamily: fonts.heading,
    fontSize: 16,
    fontWeight: 600,
    color: tokens.text,
    margin: 0,
  },
  panelClose: {
    background: 'transparent',
    border: 'none',
    color: tokens.textMuted,
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
  },
  section: { display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 0' },
  sectionLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: tokens.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    margin: '0 0 4px',
  },
  panelLink: {
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    padding: '8px 8px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 500,
    color: tokens.text,
    cursor: 'pointer',
    textAlign: 'left',
  },
  divider: { height: 1, background: HAIRLINE, margin: '4px 0' },
  signOut: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    background: 'transparent',
    border: 'none',
    borderRadius: 6,
    padding: '8px 8px',
    fontFamily: fonts.body,
    fontSize: 14,
    fontWeight: 600,
    color: tokens.ruby,
    cursor: 'pointer',
    textAlign: 'left',
    transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
  },
  signOutBusy: { opacity: 0.7, cursor: 'default' },
  signOutError: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: tokens.ruby,
    padding: '4px 8px',
  },
}
