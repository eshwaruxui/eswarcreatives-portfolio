// Day 1 copy draft for all 11 routes, adapted from the approved business
// profile content (docs/Newgen_Business_Profile_Content.md) per the tone of
// voice guidelines. Rules honoured: no em dashes, no exclamation marks, no
// rhetorical questions, numbers over adjectives, only verified stats.
// Testimonial quote TEXT is deliberately absent: quotes are pulled verbatim
// from Google reviews, never drafted. See testimonials below.

export const tagline = 'Your vision. Their memory.';

export const home = {
  heroHeadline: 'Your vision. Their memory.',
  heroSupport:
    'Sketch-first wedding and event decoration across Chennai, Tiruchi and Bengaluru. What you approve on paper is exactly what gets built.',
  primaryCta: 'Tell us about your event.',
  differentiators: [
    {
      title: 'Sketch-led, not guess-led',
      body: 'Every event starts with a hand-drawn concept, not a mood board pulled from someone else’s wedding. What you approve is what gets built. No surprises on the day.',
    },
    {
      title: 'Guest-first execution',
      body: 'The measure of a good event isn’t how it looks in photos before the guests arrive, it’s how it feels once they do. Every setup is built around the experience of the people standing in the room, not just the camera angle.',
    },
    {
      title: 'End-to-end, one team',
      body: 'Decor, AV, sound, photography, videography, logistics, and catering coordination, all under NEWGEN, all accountable to one point of contact. No coordination gaps between vendors, no dropped handoffs.',
    },
  ],
};

export const about = {
  title: 'The sketch behind every event',
  paragraphs: [
    'NEWGEN Event Studio began in 2018 with a simple belief: a celebration should look, on the day, exactly the way it looked in the mind of the person who imagined it.',
    'Mohan A started by sketching. Before a single flower was ordered or a stage built, he would sit with a family, listen to what they wanted their day to feel like, and draw it by hand, on paper, right in front of them. That sketch became the promise, and the promise got kept.',
    'Eight years later, that same habit has carried NEWGEN through 1,500+ events, into three cities, and into a partnership with Illam Hospitality & Banquets, one of Chennai’s most recognised luxury venues.',
    // Kept in its own paragraph, separated from "Eight years later" above:
    // both are correct but read as an error when adjacent (Day 5 note).
    'The longest relationship in the portfolio tells the same story. Nine years as the decoration partner of Sri Venkatesh Mahal, since 2017. The scale has changed. The sketch has not.',
    'Today NEWGEN handles everything a celebration needs under one roof: decor, sound, lighting, photography, videography, logistics, and catering coordination, so families and venues alike work with one accountable team, not a dozen vendors.',
    'The name means what it says: next generation. It’s built to carry NEWGEN through the next celebration, the next city, and the next decade.',
  ],
  team: {
    title: 'Meet the team',
    body: 'Behind every sketch is a team that shows up before the guests do and leaves after the last chair is stacked. Coordinated across Chennai, Tiruchi, and Bengaluru, trained on the same walkthrough checklist Mohan built by hand, so the standard holds whether or not he’s the one on site.',
    // Team photo pending: a NEWGEN team photography session is an open item.
  },
};

export const servicesHub = {
  headline: 'From the first ceremony to the last guest',
  intro:
    'Every engagement starts with decor and can grow to a fully managed celebration. Three tiers, one sketch-first process, one accountable team.',
  closing: 'The same sketch-first process. Every time.',
};

export const ecoFeature = {
  claim:
    'NEWGEN is the only Chennai decorator with proven eco-friendly wedding capability, covered in local press.',
  body: 'An eco-friendly wedding doesn’t mean fewer flowers. It means sourcing locally, reducing waste on site, and leaving the venue exactly as it was found.',
  // Press clipping asset pending from Mohan anna. The page ships with a
  // clearly framed press mention; the clipping slots in when sourced.
  pressLine: 'Covered in The Chennai edition, June 2023.',
};

export const portfolio = {
  intro: 'Three categories. One process behind all of them.',
  weddings:
    'From an intimate 80-guest ceremony to a large reception at Priyam, every wedding starts the same way: a sketch, reviewed together, before a single flower is ordered.',
  corporate:
    'Aachi Masala and IC Mobile trusted NEWGEN with brand-critical events where the setup had to be right, on time, every time.',
  destination:
    'Kodaikanal weddings bring their own logistics. NEWGEN plans for terrain, weather, and guest count before the first truck leaves Chennai.',
  caseStudy: {
    title: 'Case study: the Brindhavan theme',
    body: 'From a hand-drawn sketch to a built stage. One theme followed from the first client conversation to the last photograph of the finished set.',
    // Imagery: sketch-to-stage sequence from the curated library.
  },
};

export const testimonials = {
  ratingLine: 'Google rating: 4.9 out of 5, from 26 verified reviews.',
  ctaLine: 'Scan to read more, or leave your own.',
  // Quote text is pulled VERBATIM from Google reviews before Day 4 build.
  // Never draft or paraphrase a quote. Confirmed picks:
  quotes: [
    { author: 'Anusha Srikanthan', context: 'Sangeet', text: null },
    { author: 'Anbalagan S', context: 'Wedding Decoration', text: null },
  ],
};

export const contact = {
  headline: 'Tell us about your event.',
  whatsappLabel: 'WhatsApp: 91760 45045',
  emailLabel: 'studio@newgeneventstudio.com',
  // Page stays close to empty: contact details, the CTA line, the mark.
};

/** Unfakeable trade-knowledge notes, used on the Wedding page. From the
 * recorded walkthrough with Mohan anna, 04 Sep 2026. */
export const tradeCraft = [
  {
    title: 'Why real flowers at muhurtham',
    body: 'Families who choose mixed finishes for the reception still ask for real flowers at the muhurtham. The fragrance is part of the ritual: it is what invites the elders and the ancestors, who reside where real flowers are. The same belief has our team stringing fresh flowers at 4.30am before a housewarming.',
  },
  {
    title: 'Why flowers dress three sides of the canopy, not four',
    body: 'The devas stand on the three open sides of the muhurtham canopy. The fourth is closed behind the deity. That is the tradition the setup follows, and it is why a NEWGEN canopy is dressed the way it is.',
  },
  {
    title: 'The floor is chosen against the outfit',
    body: 'A red carpet under a light-coloured dress tints that dress in every photograph. We choose the aisle and stage floor to contrast with what the couple is wearing, so the photographs keep the colours the family actually chose.',
  },
];
