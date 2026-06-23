// Shown under the global TopBar on any admin page whose list is scoped to a
// single client via the TopBar's client selector. Makes the active filter
// visible (Nielsen #1, visibility of system status) and offers a one-click
// escape back to all clients (Nielsen #3, user control).
import type { CSSProperties } from 'react'
import { clientLabel, usePortal } from '../PortalContext'
import { tokens, fonts } from '../theme'

export function ClientFilterBanner() {
  const { selectedClient, setSelectedClientId } = usePortal()
  if (!selectedClient) return null

  return (
    <div style={styles.banner}>
      <span>
        Showing <strong style={styles.name}>{clientLabel(selectedClient)}</strong> only
      </span>
      <span style={styles.dot}>·</span>
      <button type="button" style={styles.clear} onClick={() => setSelectedClientId(null)}>
        Clear
      </button>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  banner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderLeft: `3px solid ${tokens.gold}`,
    background: tokens.goldLight,
    borderRadius: 8,
    padding: '8px 14px',
    marginBottom: 16,
    fontFamily: fonts.body,
    fontSize: 13,
    color: tokens.text,
  },
  name: { fontWeight: 700, color: tokens.goldDark },
  dot: { color: tokens.textMuted },
  clear: {
    background: 'transparent',
    border: 'none',
    padding: 0,
    fontFamily: fonts.body,
    fontSize: 13,
    fontWeight: 600,
    color: tokens.goldDark,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
}
