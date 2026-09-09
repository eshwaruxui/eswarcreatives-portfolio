// THE canonical short-label list for the fourteen zones — one module, every
// surface. Full names, zone_keys and the quoting order are seeded tenant
// data and stay in the database (quotation_zones); these are their on-screen
// display aliases only (zone rail spec, frozen 9 Sept). The rail tiles, the
// line-row chips, the drawer's zone group headers AND both zone-assignment
// dropdowns (move a line, and the mockup candidate picker) all read from
// here, so one zone reads the same everywhere on screen. The printed
// document is the one deliberate exception and keeps the full DB name: a
// client reading a quotation has no rail to cross-reference, so the zone has
// to name itself in full. The move-line select also carries the numbered
// full name as its title, so the long form stays one hover away.
// No surface hand-writes its own zone strings.
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
