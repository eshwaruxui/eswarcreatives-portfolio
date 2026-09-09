// THE canonical short-label list for the fourteen zones — one module, every
// surface. Full names, zone_keys and the quoting order are seeded tenant
// data and stay in the database (quotation_zones); these are their on-screen
// display aliases only (zone rail spec, frozen 9 Sept). The rail tiles, the
// truncated line-row chips and the drawer's zone group headers all read from
// here; the assignment dropdown menu and the printed document always use the
// full DB name. No surface hand-writes its own zone strings.
//
// RULE for adding or editing one of these: the short label comes from the
// zone's own IDENTITY, never from a qualifier in its full name. Zone 2 broke
// this ("Mandapam building decoration (exterior and elevation)" was shortened
// to "Elevation", borrowed from the parenthetical), which made the rail read
// "Entrance / Elevation" as if zone 1's "Entrance and elevation" had been
// split across two tiles. It is the mandapam, so it reads "Mandapam".
// Two near-traps are deliberately left long for the same reason: "Hall door"
// is not shortened to "Hall" (zone 11 owns that) and "Music stage" keeps its
// noun so it cannot be read as zone 10's "Stage".
export const ZONE_SHORT_LABELS: Record<string, string> = {
  entrance_elevation: 'Entrance',
  mandapam_building: 'Mandapam',
  pathway: 'Pathway',
  valet_parking: 'Valet',
  lift_placard: 'Lift placard',
  hall_door: 'Hall door',
  selfie_point: 'Selfie point',
  welcome_table: 'Welcome table',
  aisle: 'Aisle',
  stage: 'Stage',
  hall: 'Hall',
  music_dance_stage: 'Music stage',
  buffet_dining: 'Buffet',
  return_gift_point: 'Return gifts',
}

/** Short display label for a zone key; falls back to the full name so an
 *  unmapped (future) zone still renders. */
export function zoneShortLabel(key: string | null, fullLabel: string): string {
  if (!key) return fullLabel
  return ZONE_SHORT_LABELS[key] ?? fullLabel
}
