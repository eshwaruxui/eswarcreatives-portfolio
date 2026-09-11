// Mandapam and venue partnerships, with dates. Six partnerships since 2017.
// The nine years belongs to Sri Venkatesh Mahal, NOT Illam. Illam is claimed
// on exclusivity and prestige, never on duration (partner since 2024).
// See Newgen_Decision_Log.md, "Facts corrected".

export interface VenuePartner {
  name: string;
  since: number;
  note?: string;
  /** Named sub-properties approved for venue projection and page copy. */
  properties?: string[];
}

export const venuePartners: VenuePartner[] = [
  {
    name: 'Sri Venkatesh Mahal',
    since: 2017,
    note: 'Nine years, the longest-standing partnership in the portfolio',
  },
  { name: 'MKS Grand Palace', since: 2020 },
  { name: 'NRP Mahal', since: 2022 },
  { name: 'Selvi Mahal', since: 2023 },
  {
    name: 'Illam Hospitality & Banquets',
    since: 2024,
    note: 'Exclusive decoration partner. Times Hospitality Icons 2025 winner, covered in The Hindu',
    properties: ['Priyam', 'Varham', 'Shivam', 'Amazonite'],
  },
  { name: 'CPM Royal Palace', since: 2024 },
];

/** B2B line for the venue and GM audience. */
export const partnershipHeadline = 'Where trust is measured in years, not contracts';

export const b2bLine =
  'For hotels and resorts, a partnership means one trusted decorator already embedded in your venue, with no coordination overhead on your team.';
