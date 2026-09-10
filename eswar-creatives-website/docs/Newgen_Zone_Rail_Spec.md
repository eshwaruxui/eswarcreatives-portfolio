# Zone rail, build spec

Approved by Eswar 9 Sept 2026. Replaces the wrapping zone chip block in the quotation
builder with one horizontally scrollable row of icon tiles.

Interactive reference: the published design artifact "Zone Rail". This file is the
authority for anything the artifact and the code disagree about.

## What does not change

- The fourteen zones, their `zone_key` values and their order. That order is Mohan
  anna's outside-in guest journey and it is locked.
- The full zone names on the printed quotation document. Only the on-screen label
  shortens.
- The number prefix on the zone assignment dropdown. Entries stay "10. Stage" style
  so numbers remain meaningful.

**Superseded 9 Sept, field test:** the dropdowns originally kept the full DB name.
On screen that put one zone under two names, the rail reading "Mandapam" while the
dropdown read "2. Mandapam building decoration (exterior and elevation)". Both zone
selects now render the short label too. The printed document is the only surface
that keeps full names, because a client reading a quotation has no rail to cross
reference against.

## Labels

Add a short label. Do not overwrite the existing full name.

**Amended 9 Sept, after live review:** zone 2's short label was "Elevation" in the
approved table. On the rail beside zone 1 (full name "Entrance and elevation") that
read as one zone split across two tiles, so it is now "Mandapam", Mohan anna's own
word for it. The standing rule this establishes: a short label comes from the zone's
identity, never from a qualifier in its full name.

| # | zone_key | Short label (on screen) | Full name (document, unchanged) |
|---|---|---|---|
| 1 | entrance_elevation | Entrance | Entrance and elevation |
| 2 | mandapam_building | Mandapam | Mandapam building decoration (exterior and elevation) |
| 3 | pathway | Pathway | Pathway |
| 4 | valet_parking | Valet | Valet parking area |
| 5 | lift_placard | Lift placard | Lift placard |
| 6 | hall_door | Hall door | Hall door |
| 7 | selfie_point | Selfie point | Selfie point |
| 8 | welcome_table | Welcome table | Welcome table |
| 9 | aisle | Aisle | Aisle |
| 10 | stage | Stage | Stage |
| 11 | hall | Hall | Hall |
| 12 | music_dance_stage | Music stage | Music and dance stage |
| 13 | buffet_dining | Buffet | Buffet and dining |
| 14 | return_gift_point | Return gifts | Return gift point |

## Tile

- Fixed width 88px, uniform. Do not size to content; uniform width keeps scroll steps
  predictable and stops tiles shifting when a count badge appears.
- Vertical stack: order number, icon, label. Count badge overlays top right.
- Icon 26px, stroke 1.65, round caps and joins, `fill: none`, `stroke: currentColor`.
- Label 11px, weight 500, centred, line-height 1.25.
- Order number 9.5px, weight 600, top left, opacity 0.55.
- Count badge: gold `#D5B067` pill, minimum 17px, 10px bold, dark text. Rendered only
  when the zone holds at least one item.

## States

| State | Treatment |
|---|---|
| Empty | Label and icon in muted ink. Calm, not unfinished. This is the resting state for most zones on most jobs. |
| Has items | Label and icon in full ink, label weight 600, gold count badge visible |
| Selected | Teal `#024C4F` tile fill, gold icon and label |
| Hover | Teal wash background |
| Focus | 2px gold outline, offset 1px |

## Behaviour

- Horizontal scroll, no visible scrollbar, `scroll-behavior: smooth`.
- Gradient fade at each edge, 44px, hidden when the rail is scrolled to that end.
- Selecting a zone scrolls it into view with `block: nearest, inline: nearest`.
- Selecting the already selected zone clears the selection.
- Below the rail: "Adding to **Zone** · clear" when selected, otherwise the neutral
  line "Pick a zone to start adding elements." Never an error style.
- Right of the rail heading: "N of 14 quoted", which does not scroll away. N is the
  number of zones holding at least one item.
- Do not auto-advance to the next zone after an item is added.
- Respect `prefers-reduced-motion` by disabling smooth scroll.

## Accessibility

- Tiles are `<button>` with `role="tab"`, `aria-pressed`, inside a container with
  `role="tablist"` and an accessible name.
- The accessible name of each tile is the **full** zone name, not the short label, so a
  screen reader hears "Mandapam building decoration" rather than "Mandapam".
- The count is announced as part of the name, for example "Stage, 3 items".

## Icons

Fourteen marks drawn on a 24x24 grid. Paths below, in zone order. Render inside
`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65"
stroke-linecap="round" stroke-linejoin="round">`.

1 Entrance
`<path d="M5 21V9a7 7 0 0 1 14 0v12"/><path d="M3 21h18"/><circle cx="15.2" cy="14" r="1"/>`

2 Mandapam
`<path d="M3 21h18"/><path d="M5.5 21V10.5m4.2 10.5V10.5m4.6 10.5V10.5m4.2 10.5V10.5"/><path d="M3.5 10.5h17L12 4.5z"/>`

3 Pathway
`<path d="M9.5 21 6 3.5"/><path d="m14.5 21 3.5-17.5"/><path d="M12 7.5v2m0 4v2m0 4v1"/>`

4 Valet
`<path d="M4 16.5v-3.2l1.8-4.6A2 2 0 0 1 7.7 7.4h8.6a2 2 0 0 1 1.9 1.3l1.8 4.6v3.2z"/><path d="M4.6 13.3h14.8"/><circle cx="7.6" cy="18" r="1.5"/><circle cx="16.4" cy="18" r="1.5"/>`

5 Lift placard
`<rect x="6" y="3" width="12" height="13.5" rx="1.6"/><path d="M12 16.5V21"/><path d="M9 21h6"/><path d="m10.2 9.2 1.8-1.8 1.8 1.8"/><path d="m10.2 11.9 1.8 1.8 1.8-1.8"/>`

6 Hall door
`<rect x="4" y="3" width="16" height="18" rx="1.4"/><path d="M12 3v18"/><circle cx="9.7" cy="12" r=".95"/><circle cx="14.3" cy="12" r=".95"/>`

7 Selfie point
`<path d="M4 8.2h2.9l1.5-2h7.2l1.5 2H20a1 1 0 0 1 1 1v8.6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.2a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.3" r="3.2"/>`

8 Welcome table
`<path d="M3 14h18"/><path d="M6.2 14v6.5m11.6-6.5v6.5"/><path d="M7.8 14a4.2 4.2 0 0 1 8.4 0"/><path d="M12 7.2v2.6"/>`

9 Aisle
`<path d="M9 21V5m6 16V5"/><path d="M3.5 8.5h3m-3 4h3m-3 4h3"/><path d="M17.5 8.5h3m-3 4h3m-3 4h3"/>`

10 Stage
`<path d="M3 19.5h18"/><path d="M5.2 19.5v-7.8a6.8 6.8 0 0 1 13.6 0v7.8"/><path d="M9.2 19.5v-4.8a2.8 2.8 0 0 1 5.6 0v4.8"/>`

11 Hall
`<path d="M3 20.5h18"/><rect x="4.6" y="5.5" width="4.2" height="4.2" rx="1.1"/><rect x="9.9" y="5.5" width="4.2" height="4.2" rx="1.1"/><rect x="15.2" y="5.5" width="4.2" height="4.2" rx="1.1"/><rect x="4.6" y="11.6" width="4.2" height="4.2" rx="1.1"/><rect x="9.9" y="11.6" width="4.2" height="4.2" rx="1.1"/><rect x="15.2" y="11.6" width="4.2" height="4.2" rx="1.1"/>`

12 Music stage
`<path d="M9.2 17.8V5.2l10-2v12.4"/><circle cx="6.7" cy="17.8" r="2.5"/><circle cx="16.7" cy="15.6" r="2.5"/>`

13 Buffet
`<path d="M6 3v6.2a2.2 2.2 0 0 0 4.4 0V3"/><path d="M8.2 9.4V21"/><path d="M16.6 3v18"/><path d="M16.6 3c2.1 0 3.2 2.1 3.2 5.2s-1.1 4.2-3.2 4.2"/>`

14 Return gifts
`<rect x="3.2" y="9.4" width="17.6" height="11.4" rx="1.5"/><path d="M3.2 13.6h17.6"/><path d="M12 9.4v11.4"/><path d="M12 9.4C9.9 9.4 8.2 8.4 8.2 7.1S9.5 5 12 9.4z"/><path d="M12 9.4c2.1 0 3.8-1 3.8-2.3S14.5 5 12 9.4z"/>`

## Open, deliberately not decided

- Whether the count stays a number badge or becomes a dot. Judge it on a fully quoted
  job, where fourteen gold badges may read busy. Build the number first.
- Whether a journey strip belongs on the printed document. Parked with the document
  layout.
