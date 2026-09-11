// NEWGEN Event Studio - locked sitemap, URL structure and per-route metadata.
// Single source of truth: imported by the React app (via site.ts) AND by
// prerender.mjs at build time, which is why this file is plain ESM, not TS.
// Locked Day 1 of the launch sprint (05 Sep 2026). Changing a URL after
// launch means a redirect, not an edit. No em dashes in any copy.

export const SITE_ORIGIN = 'https://newgeneventstudio.com';

// NAP block. Must match the business profile character for character, and the
// same values feed visible copy, JSON-LD and Google Business Profile.
export const NAP = {
  name: 'NEWGEN Event Studio',
  streetAddress: '15, Major Mukund Varadarajan Rd, Narayanapuram, Pallikaranai',
  addressLocality: 'Chennai',
  addressRegion: 'Tamil Nadu',
  postalCode: '600100',
  addressCountry: 'IN',
  telephone: '+91 91760 45045', // WhatsApp business number
  whatsappNumber: '919176045045', // wa.me format, no plus or spaces
  email: 'studio@newgeneventstudio.com',
};

// The 11 launch routes. Category pages live under /services/ so the hub is
// the parent and the URL carries the taxonomy.
export const routes = [
  '/',
  '/about',
  '/services',
  '/services/wedding-decoration',
  '/services/corporate-and-commercial',
  '/services/social-celebrations',
  '/services/destination-weddings',
  '/services/eco-friendly-weddings',
  '/portfolio',
  '/testimonials',
  '/contact',
  '/brand-guideline',
];

// Per-route metadata. Titles under 60 characters, descriptions under 160,
// numbers over adjectives per the tone guide.
export const routeMeta = {
  '/': {
    title: 'NEWGEN Event Studio | Wedding and Event Decorators, Chennai',
    description:
      'Sketch-first wedding and event decoration in Chennai, Tiruchi and Bengaluru. 1,500+ events since 2018, nine years with Sri Venkatesh Mahal, exclusive partner of Illam Hospitality.',
  },
  '/about': {
    title: 'About NEWGEN Event Studio | The Sketch Behind Every Event',
    description:
      'Mohan A started by sketching every event by hand before a single flower was ordered. Nine years and 1,500+ events later, the scale has changed and the sketch has not.',
  },
  '/services': {
    title: 'Event Decoration Services in Chennai | NEWGEN Event Studio',
    description:
      'From decor to full event management: weddings, corporate and commercial events, social celebrations, destination weddings and eco-friendly weddings. One team, one point of contact.',
  },
  '/services/wedding-decoration': {
    title: 'Wedding Decorator in Chennai | NEWGEN Event Studio',
    description:
      'Wedding decoration in Chennai, from entrance to stage: muhurtham setups, receptions, engagements and every ceremony in between. Sketch approved before anything is built.',
  },
  '/services/corporate-and-commercial': {
    title: 'Corporate Event Planner in Chennai | NEWGEN Event Studio',
    description:
      'Shop and showroom openings, office inaugurations, brand activations, product launches, property launches and corporate celebrations across Chennai. Trusted by named brands.',
  },
  '/services/social-celebrations': {
    title: 'Birthday and Celebration Decorator in Chennai | NEWGEN',
    description:
      'Birthdays, baby showers, engagements, anniversaries, ear piercing and every family celebration, decorated the way it was imagined. Chennai, Tiruchi and Bengaluru.',
  },
  '/services/destination-weddings': {
    title: 'Destination Wedding Decorator, Kodaikanal | NEWGEN',
    description:
      'Kodaikanal weddings bring their own logistics. NEWGEN plans for terrain, weather and guest count before the first truck leaves Chennai.',
  },
  '/services/eco-friendly-weddings': {
    title: 'Eco-friendly Wedding Decorator in Chennai | NEWGEN',
    description:
      'The only Chennai decorator with proven eco-friendly wedding capability, covered in local press. Local sourcing, less waste, the venue left exactly as found.',
  },
  '/portfolio': {
    title: 'Portfolio | NEWGEN Event Studio, Chennai',
    description:
      'Weddings, corporate events and destination celebrations from 1,500+ events since 2018. Three categories, one sketch-first process behind all of them.',
  },
  '/testimonials': {
    title: 'Reviews and Testimonials | NEWGEN Event Studio',
    description:
      'Rated 4.9 from 26 verified Google reviews. What families and venues say about working with NEWGEN Event Studio in Chennai.',
  },
  '/contact': {
    title: 'Contact NEWGEN Event Studio | Tell Us About Your Event',
    description:
      'WhatsApp 91760 45045 or studio@newgeneventstudio.com. NEWGEN Event Studio, 15 Major Mukund Varadarajan Rd, Pallikaranai, Chennai 600100.',
  },
  '/brand-guideline': {
    title: 'Brand guideline | NEWGEN Event Studio',
    description:
      'The permanent NEWGEN Event Studio brand guideline: logo, colour, typography, pattern, photography, voice and application rules, each with a quotable address.',
  },
};
