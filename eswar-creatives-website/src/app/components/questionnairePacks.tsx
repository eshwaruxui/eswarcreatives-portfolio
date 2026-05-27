import type { ReactNode } from "react";

// Brand Identity Discovery — wording packs
//
// The questionnaire form reads one pack at a time, selected via the `?pack=`
// URL query param. With no param (or an unknown one) the form loads the
// `default` pack — industry-neutral copy that suits any brand identity client.
//
// Pack keys currently shipped:
//   ?pack=default      (or no param) — generic / industry-neutral
//   ?pack=creative     — wedding & florist wording (the legacy default)
//   ?pack=industrial   — B2B industrial / hardware
//
// Tamil overrides live on each pack via the `*Tamil` fields. The logo-type
// modal mockup in BrandIdentityDiscoveryPage.tsx is also pack-aware:
// `default` shows neutral example brands; other packs show the creative-leaning
// Palam Silks / Jasmine Events / JE set.

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

  // Section 3 (step 03) — section heading. Pack-aware so the default pack
  // can drop the creative "Brand Soul" framing for plain wording.
  s2Title: string;
  s2TitleTamil: string;

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

  // Tamil overrides — same fields above that contain industry-specific
  // wording also need a Tamil version (the rest of the Tamil block in
  // BrandIdentityDiscoveryPage.tsx is pack-agnostic).
  pageSubtitleTamil: string;
  q12HintTamil: string;
  q27LabelTamil: string;
  culturalCueLabelTamil: string;
  culturalCueHintTamil: string;
  q36HintTamil: string;
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

// Default / industry-neutral motif icons — geometric shapes only, no
// cultural or sector-specific references.
const defaultMotifs: MotifOption[] = [
  {
    label: "Geometric star",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 2L16.5 11.5L26 14L16.5 16.5L14 26L11.5 16.5L2 14L11.5 11.5Z" stroke={motifStroke} strokeWidth="1.5" strokeLinejoin="round" />
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
    label: "Honeycomb / hex",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 3L23.5 8.5V19.5L14 25L4.5 19.5V8.5Z" stroke={motifStroke} strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  { label: "Infinity / flow", icon: <span style={{ fontSize: 28, lineHeight: "1" }}>∞</span> },
  {
    label: "Circle / orbit",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="10" stroke={motifStroke} strokeWidth="1.5" />
        <circle cx="14" cy="14" r="3" stroke={motifStroke} strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "Triangle / peak",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 4l10 18H4L14 4z" stroke={motifStroke} strokeWidth="1.5" strokeLinejoin="round" />
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

// Default culture cards — plain (text + simple SVG), no moodboard images.
// Covers the four common visual-tone directions without leaning into any
// particular industry.
const defaultCultureCards: CultureCardOption[] = [
  {
    title: "Modern & minimal",
    desc: "Clean type, generous space, restrained colour — confident without shouting.",
    visual: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <rect x="6" y="6" width="28" height="28" rx="2" stroke="#1a1a1a" strokeWidth="1.5" />
        <line x1="12" y1="16" x2="28" y2="16" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="12" y1="22" x2="22" y2="22" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Warm & approachable",
    desc: "Softer shapes, friendly colour, human tone — easy to talk to, easy to choose.",
    visual: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <circle cx="20" cy="20" r="14" stroke="#1a1a1a" strokeWidth="1.5" />
        <circle cx="15" cy="18" r="1.5" fill="#1a1a1a" />
        <circle cx="25" cy="18" r="1.5" fill="#1a1a1a" />
        <path d="M14 24c2 2 4 3 6 3s4-1 6-3" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Bold & confident",
    desc: "Strong type, high contrast, decisive shapes — for brands that want to lead the room.",
    visual: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path d="M8 6h10l-4 14h6l-12 14 4-14H6L8 6z" stroke="#1a1a1a" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: "Classic & established",
    desc: "Serif type, considered detail, institutional feel — built to look at home in any decade.",
    visual: (
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        <path d="M6 34h28M10 34V14M30 34V14M14 14V10h12v4M8 14h24" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export const questionnairePacks: Record<string, QuestionnairePack> = {
  // ── Default / industry-neutral (loaded when no ?pack= is set) ─────
  default: {
    pageSubtitle:
      "This brief helps us understand your business, your audience, and the direction your brand should take. Take your time — there are no wrong answers.",
    q12Hint:
      "Industry, role, company size, budget, what they value most when choosing a partner.",
    q27Label: "Any icons, shapes, or visual elements you'd like explored?",
    s2Title: "What your brand stands for",
    s2TitleTamil: "உங்க brand எதை represent பண்றது",
    clientChannels: [
      "Referrals & word of mouth",
      "Social media",
      "Search (Google)",
      "Industry events",
      "Existing network",
      "Other",
    ],
    clientFeelings: [
      "Confident and assured",
      "Clear and well-informed",
      "Excited about working together",
      "Professional and respected",
      "Seen and understood",
      "Something else",
    ],
    brandAsPlaceOptions: [
      "A modern, well-designed office",
      "A welcoming hotel lobby",
      "A quiet library or atelier",
      "A vibrant co-working space",
      "A trusted family establishment",
      "Other",
    ],
    motifsLightboxTitle: "Icons, shapes, and visual elements",
    logoTypeExampleIntro: "Here's how the three common logo types work",
    businessNamePlaceholder: "e.g. Sunrise Consulting",
    taglinePlaceholder: "e.g. Built for what's next",
    brandWordsPlaceholder: "e.g. Clear, Trusted, Modern",
    examples: {
      whatYouDo:
        "We help mid-sized businesses streamline their operations through process design and digital tools. Our clients are typically founders or operations leads at companies with 20–200 employees who want to scale without losing their culture.",
      successIn3Years:
        "We are the go-to operations partner for growing businesses in our region. We have a team of 6, a clear methodology that clients can learn from, and a waiting list rather than a sales pipeline.",
      idealClient:
        "A founder or operations lead at a 30–150-person business that has outgrown its early scrappy phase. They're in their late 30s to mid-40s, value clarity over jargon, and want a partner who will challenge their thinking — not just nod along.",
      clientFrustrations:
        "Most consultants drop in, run a workshop, leave a deck, and disappear. Clients feel like they paid for documentation, not change. They want someone who will stay until the work actually sticks.",
      brandAsPerson:
        "She's a senior operator in her 40s — direct without being blunt, deeply experienced but always curious. She listens before she speaks, gives credit publicly, and never makes anyone feel small for not knowing something.",
      brandPromise:
        "We don't just tell you what to do — we help you build the muscle to keep doing it long after we leave.",
      differentFrom:
        "We're one of the few firms our size with a structured handover phase built into every engagement — we don't get paid the final installment until the client team has run the new process for a full quarter without us.",
      logosAdmired:
        "1. Stripe — the wordmark feels engineered and confident without being cold.\n2. Notion — the icon is friendly and the brand feels approachable without losing precision.\n3. Linear — the typography says 'serious tool for serious teams' without shouting.",
      personalSymbolic:
        "Our first office was in a converted printing press, and we kept one of the old type drawers as a shelf. I'd love if the brand quietly carried that idea of craft and care — the way good typesetters never rushed a layout.",
      competitorReasons:
        "Clients sometimes choose larger firms because they assume the brand-name backing is safer for board sign-off. They also occasionally pick competitors who promise a faster, lighter engagement — we're known for depth, not speed.",
      neverThink:
        "That we're a generic consultancy with a polished deck. Or that what we deliver could be googled. We never want to feel interchangeable with the dozens of other firms offering 'transformation'.",
    },
    motifOptions: defaultMotifs,
    culturalCueLabel: "Overall visual tone",
    culturalCueHint: "Choose the tone that feels closest to how your brand should present.",
    culturalCueLightboxTitle: "Overall visual tone",
    culturalCueTriggerPlaceholder: "Choose your tone →",
    culturalCueRenderStyle: "plain",
    culturalCueCards: defaultCultureCards,
    pageSubtitleTamil:
      "உங்க business, audience, brand-க்கான direction-ஐ புரிஞ்சுக்க இந்த brief உதவும். நேரம் எடுத்துக்கோங்க — தப்பான answer இல்ல.",
    q12HintTamil:
      "Industry, role, company size, budget — partner choose பண்றப்போ அவங்களுக்கு மிக முக்கியமான விஷயம்.",
    q27LabelTamil:
      "என்ன icons, shapes, இல்லன்னா visual elements explore பண்ணணும்னு நினைக்கீங்க?",
    culturalCueLabelTamil: "Overall visual tone",
    culturalCueHintTamil:
      "உங்க brand எப்படி present ஆகணும்னு close-ஆ feel ஆகற tone-ஐ choose பண்ணுங்க.",
    q36HintTamil:
      "Family name, ஒரு city, ஒரு material, ஒரு memory, ஒரு number — உங்களுக்கு meaningful-ஆ இருக்கற எதுவும்.",
  },


  // ── Creative / consumer (current wedding-florist wording) ─────────
  creative: {
    pageSubtitle:
      "This brief helps us understand the soul of your business before we begin. Take your time — there are no wrong answers.",
    q12Hint:
      "Age range, budget range, city, lifestyle, profession, what they value most.",
    q27Label: "Any symbols, motifs, or floral elements you'd like explored?",
    s2Title: "The Brand Soul",
    s2TitleTamil: "Brand-ஓட Soul",
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
    pageSubtitleTamil:
      "நாங்க start பண்றதுக்கு முன்னாடி உங்க business-ஓட soul-ஐ புரிஞ்சுக்க இந்த brief உதவும். நேரம் எடுத்துக்கோங்க — தப்பான answer இல்ல.",
    q12HintTamil:
      "Age range, budget range, city, lifestyle, profession, event-ல அவங்களுக்கு மிக முக்கியமான விஷயம்.",
    q27LabelTamil:
      "என்ன symbols, motifs, இல்லன்னா floral elements explore பண்ணணும்னு நினைக்கீங்க?",
    culturalCueLabelTamil: "Cultural & regional cues",
    culturalCueHintTamil:
      "உங்களுக்கு right-ஆ feel ஆகற direction choose பண்ணி, கீழே specifics add பண்ணுங்க.",
    q36HintTamil:
      "Family name, meaningful flower, ஒரு Tamil word — சிலருக்கு மட்டும் தெரிஞ்ச ஒன்னு.",
  },

  // ── B2B Industrial ────────────────────────────────────────────────
  industrial: {
    pageSubtitle:
      "This brief helps us understand what your business stands for and who it serves before we begin. Take your time — there are no wrong answers.",
    q12Hint:
      "e.g. contractors, dealers, factories, hardware retailers — who buys from you and why.",
    q27Label:
      "Any symbols or motifs you'd like explored? (e.g. tools, gears, strength, precision)",
    s2Title: "The Brand Soul",
    s2TitleTamil: "Brand-ஓட Soul",
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
    pageSubtitleTamil:
      "நாங்க start பண்றதுக்கு முன்னாடி உங்க business எதுக்காக நிக்குதுன்னும், யாருக்கு serve பண்றதுன்னும் புரிஞ்சுக்க இந்த brief உதவும். நேரம் எடுத்துக்கோங்க — தப்பான answer இல்ல.",
    q12HintTamil:
      "e.g. contractors, dealers, factories, hardware retailers — யாரு உங்களிடம் buy பண்றாங்க, எதுக்கு.",
    q27LabelTamil:
      "என்ன symbols இல்லன்னா motifs explore பண்ணணும்னு நினைக்கீங்க? (e.g. tools, gears, strength, precision)",
    culturalCueLabelTamil: "Visual tone & finish",
    culturalCueHintTamil:
      "உங்க brand எப்படி present ஆகணும்னு close-ஆ feel ஆகற tone-ஐ choose பண்ணுங்க.",
    q36HintTamil:
      "Family name, ஒரு city, ஒரு material, ஒரு memory, ஒரு number — உங்களுக்கு meaningful-ஆ இருக்கற எதுவும்.",
  },
};

// Reads the `?pack=` URL query param. Falls back to `default` (the
// industry-neutral pack) if missing or unknown.
export function getPackKeyFromSearch(search: string): string {
  try {
    const key = new URLSearchParams(search).get("pack");
    if (key && key in questionnairePacks) return key;
  } catch {
    // ignore — bad URL, fall through to default
  }
  return "default";
}

export function getPackFromSearch(search: string): QuestionnairePack {
  return questionnairePacks[getPackKeyFromSearch(search)];
}
