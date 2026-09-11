// Structured content source: the service ecosystem.
// Three axes: occasion (these categories), zone (zones.ts) and scope (the
// ladder below). Pages, filters, the search index and JSON-LD all generate
// from this data. Adding a service is adding a row, not a code change.
// Source of truth for naming: "Service ecosystem and taxonomy" Notion page.

export interface ScopeTier {
  id: 'decor' | 'decor-production' | 'full-event-management';
  name: string;
  summary: string;
  includes: string[];
}

/** The scope ladder. Full Event Management is the top rung, not a peer
 * column, so every enquiry has somewhere to move up to. */
export const scopeLadder: ScopeTier[] = [
  {
    id: 'decor',
    name: 'Decor',
    summary:
      'The setting itself: stage, entrance, aisle, muhurtham setup, florals and themed styling, sketched and approved before anything is built.',
    includes: [
      'Hand-drawn concept sketch, approved before production',
      'Stage and backdrop decoration',
      'Entrance, elevation and pathway decor',
      'Muhurtham setup',
      'Floral work, real, mixed and fancy finishes',
      'Themed styling and signage',
    ],
  },
  {
    id: 'decor-production',
    name: 'Decor and production',
    summary:
      'Everything the setting needs to perform: sound, lighting, LED walls, generators and the crew that runs them, alongside the decor.',
    includes: [
      'Everything in Decor',
      'Sound and AV systems',
      'Lighting design and operation',
      'LED walls and screens',
      'Power and generator management',
      'Aha moments: spyro, fog, flower shower, palanquin entry',
    ],
  },
  {
    id: 'full-event-management',
    name: 'Full Event Management',
    summary:
      'One accountable team for the whole celebration: muhurtham coordination, pandit support, catering, photography, videography, live streaming, guest management and return gifts.',
    includes: [
      'Everything in Decor and production',
      'Muhurtham coordination and pandit support',
      'Catering coordination',
      'Photography and videography',
      'Live streaming',
      'Guest management and return gifts',
    ],
  },
];

export interface ServiceCategory {
  slug: string;
  path: string;
  name: string;
  navLabel: string;
  seoTarget: string;
  /** Occasions covered, in display order. */
  occasions: string[];
  intro: string;
}

export const serviceCategories: ServiceCategory[] = [
  {
    slug: 'wedding-decoration',
    path: '/services/wedding-decoration',
    name: 'Wedding Decoration',
    navLabel: 'Weddings',
    seoTarget: 'wedding decorator Chennai',
    occasions: [
      'Wedding',
      'Reception',
      'Muhurtham setup',
      'Engagement / Nichayathartham',
      'Sangeet',
      'Mehendi',
      'Haldi',
    ],
    intro:
      'From an intimate 80-guest ceremony to a large reception at Priyam, every wedding starts the same way: a sketch, reviewed together, before a single flower is ordered.',
  },
  {
    slug: 'corporate-and-commercial',
    path: '/services/corporate-and-commercial',
    name: 'Corporate and Commercial',
    navLabel: 'Corporate',
    seoTarget: 'corporate event planner Chennai',
    occasions: [
      'Shop and showroom openings',
      'Office inaugurations',
      'Brand activations',
      'Product launches',
      'Corporate celebrations',
      'Conference and convocation decor',
      'IT company social events',
      'Seasonal retail programme',
      'Property and project launches',
      'Institutional and campus events',
    ],
    intro:
      'Aachi Masala and IC Mobile trusted Newgen with brand-critical events where the setup had to be right, on time, every time. The same standard now covers openings, launches and the seasonal retail calendar.',
  },
  {
    slug: 'social-celebrations',
    path: '/services/social-celebrations',
    name: 'Social Celebrations',
    navLabel: 'Celebrations',
    seoTarget: 'birthday event decorator Chennai',
    occasions: [
      'Birthday',
      'Baby shower / Valaikaappu',
      'Ear piercing / Kaadhu Kuthu',
      'Housewarming / Gruhapravesam',
      'Puberty function / Manjal Neerattu Vizha',
      'Engagement / Nichayathartham',
      'Anniversary',
      'Holy communion',
      'Sacred thread / Upanayanam',
      'Retirement and family milestones',
    ],
    intro:
      'The celebrations between the weddings: birthdays, baby showers, housewarmings and every family milestone, decorated the way the person who imagined it saw it.',
  },
  {
    slug: 'destination-weddings',
    path: '/services/destination-weddings',
    name: 'Destination Weddings',
    navLabel: 'Destination',
    seoTarget: 'destination wedding decorator Kodaikanal',
    occasions: ['Kodaikanal weddings', 'Resort weddings', 'Outstation events'],
    intro:
      'Kodaikanal weddings bring their own logistics. Newgen plans for terrain, weather, and guest count before the first truck leaves Chennai.',
  },
  {
    slug: 'eco-friendly-weddings',
    path: '/services/eco-friendly-weddings',
    name: 'Eco-friendly Weddings',
    navLabel: 'Eco-friendly',
    seoTarget: 'eco friendly wedding decorator Chennai',
    occasions: ['Eco-friendly wedding', 'Eco-friendly reception'],
    intro:
      'An eco-friendly wedding does not mean fewer flowers. It means sourcing locally, reducing waste on site, and leaving the venue exactly as it was found.',
  },
];
