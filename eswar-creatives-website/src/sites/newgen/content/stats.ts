// The verified stats table. THE ONLY NUMBERS APPROVED FOR THE WEBSITE.
// Anything not here does not go on the site. The BNI deck is superseded and
// none of its numbers are real. Source: business profile, verified with
// Mohan anna 04 Sep 2026. See Newgen_Decision_Log.md before adding anything.

export interface Stat {
  value: string;
  label: string;
  qualifier: string;
  /** 'lead' renders at the largest weight, 'secondary' in the smaller row. */
  tier: 'lead' | 'primary' | 'secondary';
}

// Hierarchy per the business profile: nine years is the lead stat, Illam
// exclusivity and the award sit beside it, volume numbers go below.
export const stats: Stat[] = [
  {
    value: 'Nine years',
    label: 'with Sri Venkatesh Mahal',
    qualifier: 'The longest-standing partnership in our portfolio, since 2017',
    tier: 'lead',
  },
  {
    value: 'Exclusive partner',
    label: 'of Illam Hospitality & Banquets',
    qualifier: 'Times Hospitality Icons 2025 winner, covered in The Hindu',
    tier: 'primary',
  },
  { value: '1,500+', label: 'events', qualifier: 'since 2018', tier: 'secondary' },
  { value: '4.9', label: 'Google rating', qualifier: 'from 26 verified reviews', tier: 'secondary' },
  { value: '3', label: 'cities', qualifier: 'Chennai, Tiruchi, Bengaluru', tier: 'secondary' },
  { value: '6', label: 'mandapam partnerships', qualifier: 'since 2017', tier: 'secondary' },
];

/** Approved line beneath the stats band. */
export const statsFootnote = 'Proof, not promises. Every number here is checkable.';
