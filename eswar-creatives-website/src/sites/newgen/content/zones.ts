// The zone axis: Mohan anna's outside-in sales walk, thirteen zones in the
// order guests experience them. Category pages are ordered by this spine so
// a visitor scrolls the venue in sequence and passes every decision point in
// the order he pitches them in person.
// Source: 60-minute recorded walkthrough, 04 Sep 2026. Do not reorder.

export interface Zone {
  id: string;
  name: string;
  /** Long-tail heading used as the h2 on category pages. */
  heading: string;
}

export const zones: Zone[] = [
  { id: 'valet-parking', name: 'Valet parking', heading: 'Valet parking and arrival' },
  { id: 'lift-placard', name: 'Lift placard', heading: 'Lift placards and wayfinding' },
  { id: 'entrance', name: 'Entrance and elevation', heading: 'Entrance and elevation decoration' },
  { id: 'pathway', name: 'Pathway', heading: 'Pathway decoration' },
  { id: 'hall-door', name: 'Hall door', heading: 'Hall door decoration' },
  { id: 'selfie-point', name: 'Selfie point', heading: 'Selfie point setups' },
  { id: 'welcome-table', name: 'Welcome table', heading: 'Welcome table styling' },
  { id: 'aisle', name: 'Aisle', heading: 'Aisle decoration' },
  { id: 'stage', name: 'Stage', heading: 'Stage and backdrop decoration' },
  { id: 'hall', name: 'Hall', heading: 'Hall decoration' },
  { id: 'music-dance-stage', name: 'Music and dance stage', heading: 'Music and dance stage setups' },
  { id: 'buffet-dining', name: 'Buffet and dining', heading: 'Buffet and dining decor' },
  { id: 'return-gift-point', name: 'Return gift point', heading: 'Return gift point styling' },
];
