// Ceremony vocabulary: English and Tamil on every ceremony, because
// "engagement decoration Chennai" and "nichayathartham decoration" are the
// same customer. English in the heading, Tamil in the first sentence and as
// a tag. Tamil script needs the fallback font stack (Day 4 task): neither
// Cormorant Garamond nor Jost carries Tamil glyphs.

export interface Ceremony {
  en: string;
  ta: string;
  /** Tamil in Latin script, used in copy and the search synonym map. */
  taLatin: string;
  /** Common misspellings and variants for the search synonym map. */
  synonyms?: string[];
}

export const ceremonies: Ceremony[] = [
  { en: 'Engagement', ta: 'நிச்சயதார்த்தம்', taLatin: 'Nichayathartham', synonyms: ['nichayathartham', 'nischayathartham', 'betrothal'] },
  { en: 'Muhurtham', ta: 'முகூர்த்தம்', taLatin: 'Muhurtham', synonyms: ['muhurtham', 'mugurtham', 'muhurta', 'wedding canopy'] },
  { en: 'Baby shower', ta: 'வளைகாப்பு', taLatin: 'Valaikaappu', synonyms: ['valaikappu', 'valaikaapu', 'seemantham'] },
  { en: 'Ear piercing', ta: 'காது குத்து', taLatin: 'Kaadhu Kuthu', synonyms: ['kaadhu kuthu', 'kathu kuthu', 'ear boring'] },
  { en: 'Housewarming', ta: 'கிரகப்பிரவேசம்', taLatin: 'Gruhapravesam', synonyms: ['gruhapravesam', 'grihapravesam', 'house warming'] },
  { en: 'Puberty function', ta: 'மஞ்சள் நீராட்டு விழா', taLatin: 'Manjal Neerattu Vizha', synonyms: ['manjal neerattu', 'manjal neeratu vizha'] },
  { en: 'Swing ceremony', ta: 'ஊஞ்சல்', taLatin: 'Oonjal', synonyms: ['oonjal', 'unjal'] },
  { en: 'Sacred thread', ta: 'உபநயனம்', taLatin: 'Upanayanam', synonyms: ['upanayanam', 'poonal', 'thread ceremony'] },
  { en: 'Sangeet', ta: 'சங்கீத்', taLatin: 'Sangeet', synonyms: ['sangeeth', 'sangeet night'] },
  { en: 'Mehendi', ta: 'மெஹந்தி', taLatin: 'Mehendi', synonyms: ['mehndi', 'mehandi', 'henna'] },
];

/** Wedding ritual moments carried as h3 content on the Wedding page. */
export const weddingRituals = [
  'Nichayathartham',
  'Kasi yatra',
  'Oonjal',
  'Kannigadhanam',
  'Muhurtham',
  'Kattu sadham',
  'Radha kalyanam',
];

/** Community traditions listed as sections, not pages (SEO decision:
 * break out top performers during the retainer once Search Console shows
 * which terms pull). */
export const communityTraditions = [
  'Tamil Brahmin',
  'Chettiar',
  'Mudaliyar',
  'Naidu',
  'Kongu',
  'Telugu',
  'Kerala',
  'Nikkah',
  'Walima',
  'Church wedding',
  'Jain',
];

/** Non-ceremony synonym pairs for the search index. Aisle is the page term;
 * ramp lives here (decision log: "Aisle, not ramp"). */
export const searchSynonyms: Record<string, string[]> = {
  aisle: ['ramp', 'walkway', 'red carpet'],
  'muhurtham setup': ['mandap', 'wedding canopy', 'kalyana pandal'],
  'stage decoration': ['backdrop', 'stage decor', 'manavarai'],
  'shop opening': ['showroom opening', 'shop inauguration', 'store launch'],
};
