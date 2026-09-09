// Zone rail — the venue walk as one horizontally scrollable row of icon
// tiles. Built to docs/Newgen_Zone_Rail_Spec.md (approved 9 Sept 2026, frozen):
// fourteen drawn marks, uniform 88px tiles, gold count badges, teal selected
// fill. The zone order, the zone_key values and the full names on the printed
// document are untouched; the short label sits alongside the DB label, keyed
// by zone_key here because it is on-screen presentation only, same as the
// icon. A zone missing from this map still renders, with its full name.
//
// The empty state is the resting state for most zones on most jobs: muted
// ink, calm, never error styling. An unquoted zone is an upsell not yet made.
import { useMemo } from 'react'
import { tokens, t, fonts } from '../theme'
import { EdgeFadeRow } from './EdgeFadeRow'
import type { CSSProperties, ReactNode } from 'react'

type RailZone = { key: string; label: string; sort_order: number }

// Short labels and 24x24 marks, in zone order. The marks are drawn for these
// zones specifically (half of them have no equivalent in any icon library) —
// do not substitute.
const ZONE_MARKS: Record<string, { short: string; icon: ReactNode }> = {
  entrance_elevation: {
    short: 'Entrance',
    icon: <><path d="M5 21V9a7 7 0 0 1 14 0v12" /><path d="M3 21h18" /><circle cx="15.2" cy="14" r="1" /></>,
  },
  mandapam_building: {
    short: 'Elevation',
    icon: <><path d="M3 21h18" /><path d="M5.5 21V10.5m4.2 10.5V10.5m4.6 10.5V10.5m4.2 10.5V10.5" /><path d="M3.5 10.5h17L12 4.5z" /></>,
  },
  pathway: {
    short: 'Pathway',
    icon: <><path d="M9.5 21 6 3.5" /><path d="m14.5 21 3.5-17.5" /><path d="M12 7.5v2m0 4v2m0 4v1" /></>,
  },
  valet_parking: {
    short: 'Valet',
    icon: <><path d="M4 16.5v-3.2l1.8-4.6A2 2 0 0 1 7.7 7.4h8.6a2 2 0 0 1 1.9 1.3l1.8 4.6v3.2z" /><path d="M4.6 13.3h14.8" /><circle cx="7.6" cy="18" r="1.5" /><circle cx="16.4" cy="18" r="1.5" /></>,
  },
  lift_placard: {
    short: 'Lift placard',
    icon: <><rect x="6" y="3" width="12" height="13.5" rx="1.6" /><path d="M12 16.5V21" /><path d="M9 21h6" /><path d="m10.2 9.2 1.8-1.8 1.8 1.8" /><path d="m10.2 11.9 1.8 1.8 1.8-1.8" /></>,
  },
  hall_door: {
    short: 'Hall door',
    icon: <><rect x="4" y="3" width="16" height="18" rx="1.4" /><path d="M12 3v18" /><circle cx="9.7" cy="12" r=".95" /><circle cx="14.3" cy="12" r=".95" /></>,
  },
  selfie_point: {
    short: 'Selfie point',
    icon: <><path d="M4 8.2h2.9l1.5-2h7.2l1.5 2H20a1 1 0 0 1 1 1v8.6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.2a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.3" r="3.2" /></>,
  },
  welcome_table: {
    short: 'Welcome table',
    icon: <><path d="M3 14h18" /><path d="M6.2 14v6.5m11.6-6.5v6.5" /><path d="M7.8 14a4.2 4.2 0 0 1 8.4 0" /><path d="M12 7.2v2.6" /></>,
  },
  aisle: {
    short: 'Aisle',
    icon: <><path d="M9 21V5m6 16V5" /><path d="M3.5 8.5h3m-3 4h3m-3 4h3" /><path d="M17.5 8.5h3m-3 4h3m-3 4h3" /></>,
  },
  stage: {
    short: 'Stage',
    icon: <><path d="M3 19.5h18" /><path d="M5.2 19.5v-7.8a6.8 6.8 0 0 1 13.6 0v7.8" /><path d="M9.2 19.5v-4.8a2.8 2.8 0 0 1 5.6 0v4.8" /></>,
  },
  hall: {
    short: 'Hall',
    icon: <><path d="M3 20.5h18" /><rect x="4.6" y="5.5" width="4.2" height="4.2" rx="1.1" /><rect x="9.9" y="5.5" width="4.2" height="4.2" rx="1.1" /><rect x="15.2" y="5.5" width="4.2" height="4.2" rx="1.1" /><rect x="4.6" y="11.6" width="4.2" height="4.2" rx="1.1" /><rect x="9.9" y="11.6" width="4.2" height="4.2" rx="1.1" /><rect x="15.2" y="11.6" width="4.2" height="4.2" rx="1.1" /></>,
  },
  music_dance_stage: {
    short: 'Music stage',
    icon: <><path d="M9.2 17.8V5.2l10-2v12.4" /><circle cx="6.7" cy="17.8" r="2.5" /><circle cx="16.7" cy="15.6" r="2.5" /></>,
  },
  buffet_dining: {
    short: 'Buffet',
    icon: <><path d="M6 3v6.2a2.2 2.2 0 0 0 4.4 0V3" /><path d="M8.2 9.4V21" /><path d="M16.6 3v18" /><path d="M16.6 3c2.1 0 3.2 2.1 3.2 5.2s-1.1 4.2-3.2 4.2" /></>,
  },
  return_gift_point: {
    short: 'Return gifts',
    icon: <><rect x="3.2" y="9.4" width="17.6" height="11.4" rx="1.5" /><path d="M3.2 13.6h17.6" /><path d="M12 9.4v11.4" /><path d="M12 9.4C9.9 9.4 8.2 8.4 8.2 7.1S9.5 5 12 9.4z" /><path d="M12 9.4c2.1 0 3.8-1 3.8-2.3S14.5 5 12 9.4z" /></>,
  },
}

export function ZoneRail({
  zones,
  countByZone,
  activeZone,
  onSelect,
}: {
  zones: RailZone[]
  countByZone: Record<string, number>
  activeZone: string
  onSelect: (key: string) => void
}) {
  const reducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  const quotedCount = zones.filter((z) => (countByZone[z.key] ?? 0) > 0).length

  function handleSelect(key: string, target: HTMLButtonElement) {
    onSelect(key)
    target.scrollIntoView({
      behavior: reducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    })
  }

  return (
    <div>
      <style>{`
        .zr-tile:hover { background: ${tokens.primary}12; }
        .zr-tile[aria-pressed="true"]:hover { background: ${tokens.primary}; }
        .zr-tile:focus-visible { outline: 2px solid ${tokens.gold}; outline-offset: 1px; }
      `}</style>

      <div style={styles.headingRow}>
        <span style={styles.heading}>Zones</span>
        <span style={styles.quotedCount}>
          {quotedCount} of {zones.length || 14} quoted
        </span>
      </div>

      <EdgeFadeRow
        fadeColor={tokens.bg}
        role="tablist"
        ariaLabel="Zones, in quoting order"
        updateKey={zones.length}
      >
          {zones.map((z) => {
            const count = countByZone[z.key] ?? 0
            const isActive = activeZone === z.key
            const hasItems = count > 0
            const mark = ZONE_MARKS[z.key]
            // Screen readers hear the full zone name plus the count — the
            // short label is visual only.
            const accessibleName = hasItems
              ? `${z.label}, ${count} item${count === 1 ? '' : 's'}`
              : z.label
            const ink = isActive ? tokens.gold : hasItems ? t.text.primary : t.text.tertiary
            return (
              <button
                key={z.key}
                type="button"
                className="zr-tile"
                role="tab"
                aria-pressed={isActive}
                aria-label={accessibleName}
                title={z.label}
                onClick={(e) => handleSelect(z.key, e.currentTarget)}
                style={{
                  ...styles.tile,
                  background: isActive ? tokens.primary : 'transparent',
                  color: ink,
                }}
              >
                <span style={styles.orderNumber} aria-hidden="true">{z.sort_order}</span>
                {hasItems && (
                  <span style={styles.countBadge} aria-hidden="true">{count}</span>
                )}
                <svg
                  viewBox="0 0 24 24"
                  width={26}
                  height={26}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.65}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  {mark?.icon}
                </svg>
                <span
                  style={{ ...styles.tileLabel, fontWeight: hasItems && !isActive ? 600 : 500 }}
                  aria-hidden="true"
                >
                  {mark?.short ?? z.label}
                </span>
              </button>
            )
          })}
      </EdgeFadeRow>
    </div>
  )
}

const styles: Record<string, CSSProperties> = {
  headingRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    padding: '0 2px',
    marginBottom: 6,
  },
  heading: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: t.text.tertiary,
  },
  quotedCount: {
    fontFamily: fonts.body,
    fontSize: 12,
    fontWeight: 600,
    color: t.text.secondary,
  },
  tile: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 5,
    // Uniform width keeps scroll steps predictable and stops tiles shifting
    // when a count badge appears (spec: fixed 88px, never size to content).
    width: 88,
    minWidth: 88,
    padding: '20px 6px 8px',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontFamily: fonts.body,
    flexShrink: 0,
  },
  orderNumber: {
    position: 'absolute',
    top: 5,
    left: 8,
    fontSize: 9.5,
    fontWeight: 600,
    opacity: 0.55,
  },
  countBadge: {
    position: 'absolute',
    top: 4,
    right: 6,
    minWidth: 17,
    height: 17,
    padding: '0 5px',
    borderRadius: 9,
    background: tokens.gold,
    color: tokens.goldDark,
    fontSize: 10,
    fontWeight: 700,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: 11,
    lineHeight: 1.25,
    textAlign: 'center',
  },
}
