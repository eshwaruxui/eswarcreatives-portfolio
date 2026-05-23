import type { ReactNode } from "react";

// Brand Identity Discovery — wording packs
//
// The questionnaire form reads one pack at a time, selected via the `?pack=`
// URL query param. Default is `creative` (the original wedding-florist wording),
// so existing links keep working unchanged.
//
// To serve a different client vertical: pick a pack key (`?pack=industrial`)
// or add a new pack below.
//
// Currently English-only. Tamil translations in BrandIdentityDiscoveryPage.tsx
// are not pack-aware — toggling to தமிழ் shows the original florist wording.
// The logo-type modal mockups (Palam Silks, Sabyasachi etc.) also remain
// gated to the creative pack only.

export interface MotifOption {
  label: string;
  icon: ReactNode;
}

export interface CultureCardOption {
  title: string;
  desc: string;
  // Mood-board fields — used when renderStyle === "moodboard"
  imageSrc?: string;
  gradient?: string;
  tintColor?: string;
  chips?: Array<{ icon: ReactNode; label: string }>;
  // Plain-card visual — used when renderStyle === "plain"
  visual?: ReactNode;
}

export interface QuestionnairePack {
  // Intro paragraph under the page title
  pageSubtitle: string;

  // Section 2 — "Describe your ideal client" hint line
  q12Hint: string;

  // Section 5 — "Any symbols, motifs, or … elements" question label
  q27Label: string;

  // Section 2 — "Where do clients find you?" checkbox options
  clientChannels: string[];

  // Section 3 — "What feeling should clients have?" checkbox options
  clientFeelings: string[];

  // Section 3 — "If your brand were a place" radio options
  brandAsPlaceOptions: string[];

  // Modal/lightbox titles
  motifsLightboxTitle: string;
  logoTypeExampleIntro: string;

  // Placeholders that reference the client's industry
  businessNamePlaceholder: string;
  taglinePlaceholder: string;
  brandWordsPlaceholder: string;

  // Example modal content — keyed by question (whatYouDo, idealClient, …).
  // Shown when the user clicks "💡 See an example".
  examples: Record<string, string>;

  // Section 5 — Symbols & motifs picker contents
  motifOptions: MotifOption[];

  // Section 5 — "Cultural & regional cues" picker
  // (relabelled "Visual tone & finish" for the industrial pack)
  culturalCueLabel: string;
  culturalCueHint: string;
  culturalCueLightboxTitle: string;
  culturalCueTriggerPlaceholder: string;
  culturalCueRenderStyle: "moodboard" | "plain";
  culturalCueCards: CultureCardOption[];
}

// ── Shared SVG helpers ────────────────────────────────────────────────
const motifStroke = "#1a1a1a";

// Creative motif icons (ported from the page's previous inline list)
const creativeMotifs: MotifOption[] = [
  { label: "Jasmine / florals", icon: <span style={{ fontSize: 28 }}>🌸</span> },
  { label: "Lotus", icon: <span style={{ fontSize: 28 }}>🪷</span> },
  {
    label: "Geometric star",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 2L16.5 11.5L26 14L16.5 16.5L14 26L11.5 16.5L2 14L11.5 11.5Z" stroke={motifStroke} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Kolam / mandala",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="11" stroke={motifStroke} strokeWidth="1.5" />
        <circle cx="14" cy="14" r="4" stroke={motifStroke} strokeWidth="1.5" />
        <line x1="14" y1="3" x2="14" y2="25" stroke={motifStroke} strokeWidth="1" />
        <line x1="3" y1="14" x2="25" y2="14" stroke={motifStroke} strokeWidth="1" />
        <line x1="6.5" y1="6.5" x2="21.5" y2="21.5" stroke={motifStroke} strokeWidth="1" />
        <line x1="21.5" y1="6.5" x2="6.5" y2="21.5" stroke={motifStroke} strokeWidth="1" />
      </svg>
    ),
  },
  { label: "Botanical / leaves", icon: <span style={{ fontSize: 28 }}>🌿</span> },
  { label: "Elephant motif", icon: <span style={{ fontSize: 28 }}>🐘</span> },
  {
    label: "Diamond / frame",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 3L25 14L14 25L3 14Z" stroke={motifStroke} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  { label: "Infinity / flow", icon: <span style={{ fontSize: 28, lineHeight: "1" }}>∞</span> },
  {
    label: "Temple arch",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M5 27V14C5 8.477 9.029 4 14 4C18.971 4 23 8.477 23 14V27" stroke={motifStroke} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="3" y1="27" x2="25" y2="27" stroke={motifStroke} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  { label: "Floral ornament", icon: <span style={{ fontSize: 28 }}>❦</span> },
  {
    label: "Honeycomb / hex",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 3L23.5 8.5V19.5L14 25L4.5 19.5V8.5Z" stroke={motifStroke} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Abstract / minimal",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill={motifStroke}>
        <circle cx="10" cy="10" r="2.5" /><circle cx="18" cy="10" r="2.5" />
        <circle cx="10" cy="18" r="2.5" /><circle cx="18" cy="18" r="2.5" />
        <circle cx="14" cy="14" r="1.5" />
      </svg>
    ),
  },
];

// Industrial motif icons — simple line icons, no cultural/decorative refs
const industrialMotifs: MotifOption[] = [
  {
    label: "Gear / cogwheel",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="4" stroke={motifStroke} strokeWidth="1.5" />
        <path d="M14 2v3M14 23v3M2 14h3M23 14h3M5.5 5.5l2.1 2.1M20.4 20.4l2.1 2.1M5.5 22.5l2.1-2.1M20.4 7.6l2.1-2.1" stroke={motifStroke} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Wrench / spanner",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M19 3a5 5 0 0 0-4.6 7L4 20.4a2 2 0 1 0 2.8 2.8L17.2 12.8A5 5 0 1 0 19 3z" stroke={motifStroke} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Hexagon / bolt head",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 3L23.5 8.5V19.5L14 25L4.5 19.5V8.5Z" stroke={motifStroke} strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="14" cy="14" r="3" stroke={motifStroke} strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "Shield / durability",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 3L4 7v7c0 5.5 4 9.5 10 11 6-1.5 10-5.5 10-11V7l-10-4z" stroke={motifStroke} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Lightning / power",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M15 3L5 16h7l-1 9 10-13h-7l1-9z" stroke={motifStroke} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Arrow / precision",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="10" stroke={motifStroke} strokeWidth="1.5" />
        <circle cx="14" cy="14" r="5" stroke={motifStroke} strokeWidth="1.5" />
        <circle cx="14" cy="14" r="1.5" fill={motifStroke} />
      </svg>
    ),
  },
  {
    label: "Diamond / frame",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 3L25 14L14 25L3 14Z" stroke={motifStroke} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Abstract / minimal",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill={motifStroke}>
        <circle cx="10" cy="10" r="2.5" /><circle cx="18" cy="10" r="2.5" />
        <circle cx="10" cy="18" r="2.5" /><circle cx="18" cy="18" r="2.5" />
        <circle cx="14" cy="14" r="1.5" />
      </svg>
    ),
  },
  {
    label: "Geometric mark",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 4l8 14H6L14 4z" stroke={motifStroke} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M14 24l-8-14h16L14 24z" stroke={motifStroke} strokeWidth="1.5" strokeLinejoin="round" opacity="0.5" />
      </svg>
    ),
  },
];

// Creative culture cards (ported from the page's previous CULTURE_CARD_DATA)
const creativeCultureCards: CultureCardOption[] = [
  {
    title: "Rooted in Tamil Nadu",
    desc: "South Indian aesthetics — kolam, temple motifs, regional craft",
    tintColor: "#f5ede0",
    gradient: "linear-gradient(135deg, #e8d5b7 0%, #c9956b 100%)",
    imageSrc: "/assets/cultural/moodboard/layer-18.png",
    chips: [
      { icon: <img src="/assets/cultural/moodboard/layer-22.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />, label: "KOLAM" },
      { icon: <img src="/assets/cultural/moodboard/layer-2.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />, label: "TEMPLE" },
      { icon: <img src="/assets/cultural/moodboard/layer-3.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />, label: "FLORALS" },
      { icon: <img src="/assets/cultural/moodboard/layer-4.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />, label: "CRAFT" },
    ],
  },
  {
    title: "Pan-Indian",
    desc: "Draws from across Indian traditions — inclusive, diverse, broadly resonant",
    tintColor: "#edf5ed",
    gradient: "linear-gradient(135deg, #c8dfc8 0%, #7aab7a 100%)",
    imageSrc: "/assets/cultural/moodboard/layer-19.png",
    chips: [
      { icon: <img src="/assets/cultural/moodboard/layer-5.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />, label: "LOTUS" },
      { icon: <img src="/assets/cultural/moodboard/layer-6.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />, label: "PAISLEY" },
      { icon: <img src="/assets/cultural/moodboard/layer-7.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />, label: "BOTANICS" },
      { icon: <img src="/assets/cultural/moodboard/layer-8.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />, label: "HERITAGE" },
    ],
  },
  {
    title: "International finish",
    desc: "South Indian soul, global presentation — minimal, modern, export-ready",
    tintColor: "#e8eef5",
    gradient: "linear-gradient(135deg, #c5d5e8 0%, #7a9dbf 100%)",
    imageSrc: "/assets/cultural/moodboard/layer-21.png",
    chips: [
      { icon: <img src="/assets/cultural/moodboard/layer-14.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />, label: "GLOBAL" },
      { icon: <img src="/assets/cultural/moodboard/layer-15.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />, label: "MINIMAL" },
      { icon: <img src="/assets/cultural/moodboard/layer-16.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />, label: "PREMIUM" },
      { icon: <img src="/assets/cultural/moodboard/layer-17.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />, label: "EXPORT" },
    ],
  },
  {
    title: "South Indian roots, global finish",
    desc: "The most requested direction — culturally specific but presented with international polish",
    tintColor: "#f5f0e8",
    gradient: "linear-gradient(135deg, #e8d9c0 0%, #b8956a 100%)",
    imageSrc: "/assets/cultural/moodboard/layer-20.png",
    chips: [
      { icon: <img src="/assets/cultural/moodboard/layer-10.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />, label: "TEMPLE" },
      { icon: <img src="/assets/cultural/moodboard/layer-11.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />, label: "HERITAGE" },
      { icon: <img src="/assets/cultural/moodboard/layer-12.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />, label: "GLOBAL" },
      { icon: <img src="/assets/cultural/moodboard/layer-13.png" alt="" style={{ width: 32, height: 32, objectFit: "contain" }} />, label: "PREMIUM" },
    ],
  },
];

// Industrial culture cards — mood-board style, image-on-top
const industrialCultureCards: CultureCardOption[] = [
  {
    title: "Industrial & utilitarian",
    desc: "Rugged, functional, no-nonsense",
    tintColor: "#ece9e3",
    gradient: "linear-gradient(135deg, #9c9389 0%, #4a4540 100%)",
    imageSrc: "/assets/cultural/moodboard/industrial/industrial-utilitarian.png",
  },
  {
    title: "Modern & technical",
    desc: "Clean, precise, engineering-led",
    tintColor: "#e6ecf0",
    gradient: "linear-gradient(135deg, #b0bcc6 0%, #4a5a68 100%)",
    imageSrc: "/assets/cultural/moodboard/industrial/modern-technical.png",
  },
  {
    title: "Trusted & established",
    desc: "Solid, dependable, institutional",
    tintColor: "#ede8df",
    gradient: "linear-gradient(135deg, #b8a986 0%, #6b5d3f 100%)",
    imageSrc: "/assets/cultural/moodboard/industrial/trusted-established.png",
  },
  {
    title: "Bold & energetic",
    desc: "Strong, high-visibility, dynamic",
    tintColor: "#f5e9d6",
    gradient: "linear-gradient(135deg, #e8a35a 0%, #b8511a 100%)",
    imageSrc: "/assets/cultural/moodboard/industrial/bold-energetic.png",
  },
];

export const questionnairePacks: Record<string, QuestionnairePack> = {
  // ── Creative / consumer (current wedding-florist wording) ─────────
  creative: {
    pageSubtitle:
      "This brief helps us understand the soul of your business before we begin. Take your time — there are no wrong answers.",
    q12Hint:
      "Age range, budget range, city, lifestyle, profession, what they value most.",
    q27Label: "Any symbols, motifs, or floral elements you'd like explored?",
    clientChannels: [
      "Instagram",
      "Word of mouth",
      "Google search",
      "Referrals from vendors",
      "Wedding expos",
      "Other",
    ],
    clientFeelings: [
      "Calm and cared for",
      "Excited and inspired",
      "Confident and assured",
      "Moved and emotional",
      "Seen and understood",
      "Something else",
    ],
    brandAsPlaceOptions: [
      "A curated boutique hotel",
      "A lush private garden",
      "A sun-filled studio",
      "A grand heritage hall",
      "A quiet Tamil home",
      "Other",
    ],
    motifsLightboxTitle: "Symbols, motifs, or floral elements",
    logoTypeExampleIntro:
      "Here's how logo types work in the wedding & events industry",
    businessNamePlaceholder: "e.g. Blooms by Meera",
    taglinePlaceholder: "e.g. Floral art for life's most beautiful moments",
    brandWordsPlaceholder: "e.g. Warm, Refined, Celebratory",
    examples: {
      whatYouDo:
        "We design and style floral installations for South Indian weddings — from the wedding mandap and car decoration to the reception stage and centrepieces. Most of our clients are Tamil and Telugu families in Chennai planning weddings of 200–800 guests.",
      successIn3Years:
        "We are the first name Chennai wedding families think of when they want florals that feel both traditional and elevated. We have a team of 8, a studio in Nungambakkam, and we're featured regularly in WedMeGood and The Wedding Brigade.",
      idealClient:
        "A bride in her late 20s or early 30s, Chennai-based, planning a wedding in the next 6–12 months. She's researching vendors on Instagram and WedMeGood. Her mother is involved in decisions. Budget is mid-to-premium. She wants something that feels personal, not generic.",
      clientFrustrations:
        "Most florists show generic catalogue packages. Clients feel like they can't customise anything, and nobody explains why a design costs what it costs. They feel like they're buying blind.",
      brandAsPerson:
        "She's a well-travelled South Indian woman in her 40s — confident, quietly elegant, never loud. She wears a good silk saree as easily as she wears linen. She has strong opinions but shares them gently. She knows quality when she sees it.",
      brandPromise:
        "We make the spaces where your family's most important moments happen feel as beautiful as those moments deserve.",
      differentFrom:
        "We're the only florist in Chennai who does a full site visit before quoting — we design for your specific venue lighting, not a generic room. And we've never repeated a stage design.",
      logosAdmired:
        "1. Sabyasachi — the way the logo feels rooted and handcrafted without being fussy.\n2. The Leela Hotels — restrained, confident, instantly South Indian without being literal.\n3. Tanishq — the script feels warm and trustworthy.",
      personalSymbolic:
        "My grandmother always wore a single jasmine strand, never a full gajra. I'd love if there was something in the brand that quietly referenced that — maybe a single stem rather than a full bloom.",
      competitorReasons:
        "Clients sometimes go to larger florists because they assume a smaller studio can't handle a 500-guest wedding. They also occasionally choose competitors when they need a very fast turnaround — we're known for being considered, not rushed.",
      neverThink:
        "That we're too expensive without understanding what they're getting. Or that our work looks the same as every other florist on WedMeGood. We never want to feel generic, forgettable, or interchangeable.",
    },
    motifOptions: creativeMotifs,
    culturalCueLabel: "Cultural & regional cues to consider",
    culturalCueHint: "Choose the direction that feels right, then add specifics below.",
    culturalCueLightboxTitle: "Cultural & regional cues to consider",
    culturalCueTriggerPlaceholder: "Choose your cultural direction →",
    culturalCueRenderStyle: "moodboard",
    culturalCueCards: creativeCultureCards,
  },

  // ── B2B Industrial ────────────────────────────────────────────────
  industrial: {
    pageSubtitle:
      "This brief helps us understand what your business stands for and who it serves before we begin. Take your time — there are no wrong answers.",
    q12Hint:
      "e.g. contractors, dealers, factories, hardware retailers — who buys from you and why.",
    q27Label:
      "Any symbols or motifs you'd like explored? (e.g. tools, gears, strength, precision)",
    clientChannels: [
      "Referrals & word of mouth",
      "Dealer / distributor network",
      "Google search",
      "Trade exhibitions",
      "Existing client repeat orders",
      "Field sales team",
      "Other",
    ],
    clientFeelings: [
      "Confident and assured",
      "\"This supplier is reliable\"",
      "Professional and serious",
      "Technically expert",
      "Easy to do business with",
      "Something else",
    ],
    brandAsPlaceOptions: [
      "A precision engineering workshop",
      "A well-run industrial warehouse",
      "A trusted hardware institution",
      "A modern B2B showroom",
      "A dependable family-run firm",
      "Other",
    ],
    motifsLightboxTitle: "Symbols and motifs",
    logoTypeExampleIntro:
      "Here's how logo types work in the industrial & B2B space",
    businessNamePlaceholder: "e.g. Murugan Tools & Hardware",
    taglinePlaceholder:
      "e.g. Powering India's worksites with tools that don't quit",
    brandWordsPlaceholder: "e.g. Dependable, Precise, Hard-wearing",
    examples: {
      whatYouDo:
        "We manufacture and supply industrial-grade hand tools and power tool accessories — wrenches, drill bits, sanding discs, and consumables — to dealers and contractors across Tamil Nadu and Karnataka. Most of our buyers are mid-sized hardware distributors and construction firms placing repeat orders every quarter.",
      successIn3Years:
        "We are the trusted supplier hardware dealers in South India turn to first when stocking quality tools. We have a network of 80+ active dealers, a warehouse in Coimbatore, and we're recognised at major hardware trade exhibitions as a reliable Indian alternative to imported brands.",
      idealClient:
        "A hardware dealer in their 40s, based in a Tier-2 South Indian city, running a counter store that serves contractors and small workshops. They've been in the business 10–15 years, know quality when they see it, and value suppliers who deliver on time without excuses. Decisions are usually made by the proprietor.",
      clientFrustrations:
        "Most suppliers ship inconsistent quality — one batch is fine, the next has defects. Lead times are unpredictable. When something goes wrong, nobody picks up the phone. Dealers feel like they're gambling on every order.",
      brandAsPerson:
        "He's an experienced workshop owner in his late 50s — built his trade with his own hands, knows every tool by feel. He doesn't waste words but when he speaks, people listen. He's been let down enough times that he only trusts what he can verify, and once he trusts you, he's a customer for life.",
      brandPromise:
        "Every tool we ship is the same quality you saw in the sample — no surprises, no excuses, no missed deadlines.",
      differentFrom:
        "We're one of the few Indian manufacturers who QC every batch against the original sample before dispatch — not a sampling check, every batch. And we publish our delivery commitments publicly; if we miss one, the next order is on us.",
      logosAdmired:
        "1. Bosch — the wordmark feels engineered, not decorative; you trust it instantly.\n2. Caterpillar — the colour and bold lettering carry the weight of the machinery.\n3. Stanley — the wedge shape feels structural and ownable, used the same way for decades.",
      personalSymbolic:
        "My father started this business in 1982 with one lathe in a small shed. The first wrench he made is still on our workshop wall. I'd love if the brand quietly carried something of that — the idea of craftsmanship handed down, not mass-produced.",
      competitorReasons:
        "Dealers sometimes go to larger imported brands because they assume Indian manufacturers can't match the precision. They also occasionally choose competitors when a tender requires a specific brand spec — we're known for quality, but not yet for paperwork-readiness on the big public contracts.",
      neverThink:
        "That we cut corners on material to hit a price point. Or that our tools are just generic items with our logo stamped on. We never want to feel like a trading company pretending to manufacture — we want every dealer to know our workshop is real and our standards are non-negotiable.",
    },
    motifOptions: industrialMotifs,
    culturalCueLabel: "Visual tone & finish",
    culturalCueHint: "Choose the tone that feels closest to how your brand should present.",
    culturalCueLightboxTitle: "Visual tone & finish",
    culturalCueTriggerPlaceholder: "Choose your visual tone →",
    culturalCueRenderStyle: "moodboard",
    culturalCueCards: industrialCultureCards,
  },
};

// Reads the `?pack=` URL query param. Falls back to `creative` if missing
// or unknown — so existing links keep working.
export function getPackKeyFromSearch(search: string): string {
  try {
    const key = new URLSearchParams(search).get("pack");
    if (key && key in questionnairePacks) return key;
  } catch {
    // ignore — bad URL, fall through to default
  }
  return "creative";
}

export function getPackFromSearch(search: string): QuestionnairePack {
  return questionnairePacks[getPackKeyFromSearch(search)];
}
