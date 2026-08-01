import { useEffect, useRef, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Navbar } from "./Navbar";
import { ECChip } from "../../components/marketing/ECChip";
import { ECButton } from "../../components/marketing/ECButton";
import { PortfolioButton } from "./ui/portfolio-button";
import { useIsMobile } from "./ui/use-mobile";

import tokenDiagram from "../../imports/design-systems/token-architecture.svg";
import alertInboxIllustration from "../../imports/design-systems/cross-platform-alert-inbox-ui-illustration.svg";
import crossPlatformIllustration from "../../imports/design-systems/multi-device-illustration.svg";
import aiSimilarityIllustration from "../../imports/design-systems/ai-product-illustration.svg";
import buildFromScratchIllustration from "../../imports/design-systems/no-component-library-illustration.svg";
import checkCircleGoldIcon from "../../imports/design-systems/check-circle-gold-icon.svg";
import componentCubeTealIcon from "../../imports/design-systems/component-cube-teal-icon.svg";
import quoteMarkGoldIcon from "../../imports/design-systems/quote-mark-gold-icon.svg";
import searchTealIcon from "../../imports/design-systems/search-teal-icon.svg";
import shieldCheckIcon from "../../imports/design-systems/shield-check-outline-icon.svg";
import usersTealIcon from "../../imports/design-systems/users-teal-icon.svg";
import icpSeriesIcon from "../../imports/design-systems/icp-series-a-to-c-icon.svg";
import icpEngineersIcon from "../../imports/design-systems/icp-engineers-designers-icon.svg";
import icpMultiplatformIcon from "../../imports/design-systems/icp-multiplatform-icon.svg";
import howItWorksDividerVector from "../../imports/design-systems/how-it-works-divider-vector.svg";
import kevinGaffneyPhoto from "../../imports/design-systems/kevin-gaffney-photo.jpg";
import linkedinIcon from "../../imports/design-systems/linkedin-icon.svg";

// ── Design tokens (src/app convention: local const mapping to theme.css vars) ──
const C = {
  cream:      "#FAF8F4",
  gold:       "#D5B067",
  border:     "var(--border-default)",
  inverse:    "var(--bg-inverse)",
  tint1:      "var(--bg-tint-1)",
  teal:       "var(--text-brand)",
  text:       "var(--text-primary)",
  textSec:    "var(--text-secondary)",
  textMuted:  "var(--text-tertiary)",
} as const;

const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";
const MONO  = "var(--font-mono, 'SF Mono', monospace)";

// Fade-up-on-view helper. Collapses to an instant, static reveal when the
// visitor has requested reduced motion, so callers never branch themselves.
function reveal(reduced: boolean, opts: { delay?: number; y?: number; duration?: number } = {}) {
  const { delay = 0, y = 16, duration = 0.45 } = opts;
  if (reduced) {
    return { initial: { opacity: 1, y: 0 } };
  }
  return {
    initial: { opacity: 0, y },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration, delay },
  };
}

function GoldUnderline({ children, reduced }: { children: ReactNode; reduced: boolean }) {
  return (
    <span style={{ position: "relative", display: "inline-block", color: C.teal }}>
      <motion.span
        aria-hidden="true"
        initial={{ width: reduced ? "100%" : "0%" }}
        animate={{ width: "100%" }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 0.8, delay: 0.6, ease: [0.4, 0, 0.2, 1] }
        }
        style={{
          position:     "absolute",
          bottom:       "-2px",
          left:         0,
          height:       "4px",
          borderRadius: "2px",
          background:   "#e2c88e",
          zIndex:       0,
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>{children}</span>
    </span>
  );
}

const HERO_STATS = [
  { value: "32%",  label: "Triage time reduction", sub: "at CYGNVS" },
  { value: "60+",  label: "Components", sub: "shipped" },
  { value: "180+", label: "Semantic tokens", sub: "across platforms" },
];

// Figma "ICP - Badge Card" instances (node 4537:25762) below the hero CTA.
const ICP_BADGES = [
  { icon: icpSeriesIcon, title: "Series A to C", caption: "Built for Series A to C product teams" },
  { icon: icpEngineersIcon, title: "15 to 150 engineers", caption: "3 to 15 designers" },
  { icon: icpMultiplatformIcon, title: "Multi-platform", caption: "Shipping across web, iOS, and Android" },
];

const TRIAGE_CARDS: { label: string; desc: string; illustration?: string }[] = [
  {
    label: "Cross-platform consistency",
    desc:  "Eliminated relearning cost when analysts switched between web, iOS, and Android",
  },
  {
    label: "Predictable button placement",
    desc:  "Reduced clicks-to-action by anchoring primary actions to consistent positions",
  },
  {
    label: "Grouped alert banner",
    desc:  "Collapsed 12 individual alerts into 1 incident view, enabling triage at a glance",
    illustration: alertInboxIllustration,
  },
];

// bg/border per Figma node — the three pain sections don't share one
// background: Q1 and Q3 are gold/10, Q2 is white with a hairline border.
const PAIN_QUESTIONS: { question: string; illustration: string; illustrationWidth: number; captionHeadline?: string; caption: string; cta?: boolean; bg: string; bordered?: boolean }[] = [
  {
    question:          "Does every new feature start from scratch because there is no shared component library?",
    illustration:      buildFromScratchIllustration,
    illustrationWidth: 840, // matches the illustration's own exported SVG intrinsic width
    caption:           "Wasted time. Duplicated effort. Inconsistent experience.",
    bg:                "#FDFAF3",
  },
  {
    question:          "Is your AI product starting to look like every other AI product?",
    illustration:       aiSimilarityIllustration,
    illustrationWidth:  767, // matches the illustration's own exported SVG intrinsic width
    captionHeadline:   "The sea of sameness.",
    caption:           "Every AI product built without a system looks like the last one.",
    bg:                "#FFFFFF",
    bordered:          true,
  },
  {
    question:          "Does your product look different on web, iOS, and Android?",
    illustration:      crossPlatformIllustration,
    illustrationWidth: 1007, // Figma node 4290:1310, "Frame 224" — native export size
    caption:           "Inconsistent experience. Confused users. Weaker brand.",
    cta:               true,
    bg:                "#FDFAF3",
  },
];

const HOW_IT_WORKS = [
  {
    icon:  searchTealIcon,
    step:  "01",
    title: "Audit",
    desc:  "Most teams have 400 hardcoded values when they need 40. We find the 20% causing 80% of the drift before touching a single component.",
  },
  {
    icon:  componentCubeTealIcon,
    step:  "02",
    title: "Build",
    desc:  "Token architecture ships before components. Every component after that is just assembly, consistent by construction, not by convention.",
  },
  {
    icon:  usersTealIcon,
    step:  "03",
    title: "Embed",
    desc:  "We write documentation for the engineer searching at 11pm before a deadline, not the one reading it cover to cover. The system outlives the engagement.",
  },
];

const PRICING_CHECKLIST = [
  "5 business days. One flow. Every friction point mapped.",
  "Before/after direction for the top 3 issues.",
  "30-min walkthrough call on delivery.",
];

function ScrollDots({
  count,
  active,
  onSelect,
}: {
  count: number;
  active: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "24px" }}>
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => onSelect(i)}
          aria-label={`Go to question ${i + 1} of ${count}`}
          aria-current={active === i}
          style={{
            width:         "8px",
            height:        "8px",
            borderRadius:  "4px",
            background:    active === i ? "#009990" : "#dddddd",
            border:        "none",
            padding:       0,
            cursor:        "pointer",
            transition:    "background-color 200ms ease",
          }}
        />
      ))}
    </div>
  );
}

export function DesignSystemsLandingPage() {
  const isMobile = useIsMobile();
  const reducedMotion = !!useReducedMotion();

  const painRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeQuestion, setActiveQuestion] = useState(0);

  useEffect(() => {
    document.title = "Design Systems for B2B SaaS · Eswar Creatives";
  }, []);

  // Overscroll ("rubber band") past either end of the page reveals the
  // browser's default body background (white) instead of whatever section
  // is actually at that edge. Since html/body bg is shared (theme.css sets
  // it transparent for every page), swap it in and out here rather than
  // hardcoding one color globally — cream at the top (matches the hero),
  // the footer's dark color once scrolled near the bottom — and revert on
  // unmount so other pages aren't affected.
  useEffect(() => {
    const prevHtmlBg = document.documentElement.style.backgroundColor;
    const prevBodyBg = document.body.style.backgroundColor;
    const TOP_BG = "#FDFAF3";
    const BOTTOM_BG = "#222222";
    const BOTTOM_THRESHOLD = 200;

    const applyBg = (color: string) => {
      document.documentElement.style.backgroundColor = color;
      document.body.style.backgroundColor = color;
    };

    let current = TOP_BG;
    applyBg(current);

    const onScroll = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - BOTTOM_THRESHOLD;
      const next = nearBottom ? BOTTOM_BG : TOP_BG;
      if (next !== current) {
        current = next;
        applyBg(current);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.documentElement.style.backgroundColor = prevHtmlBg;
      document.body.style.backgroundColor = prevBodyBg;
    };
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const idx = painRefs.current.indexOf(entry.target as HTMLElement);
          if (idx !== -1) setActiveQuestion(idx);
        });
      },
      { threshold: 0.5 }
    );
    painRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  function scrollToPainSection(i: number) {
    painRefs.current[i]?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  }

  return (
    <>
      <Helmet>
        <title>B2B SaaS Design Systems · Eswar Creatives</title>
        <meta property="og:title" content="B2B SaaS Design Systems · Eswar Creatives" />
        <meta property="og:description" content="Token architecture, 60+ components, and 180+ semantic tokens for B2B SaaS teams shipping across Web, iOS, and Android. Shipped at CYGNVS. Start with a $750 UX Audit." />
        <meta property="og:image" content="https://www.eswarcreatives.in/og-design-systems.png" />
        <meta property="og:url" content="https://www.eswarcreatives.in/design-systems/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Eswar Creatives" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="B2B SaaS Design Systems · Eswar Creatives" />
        <meta name="twitter:description" content="Token architecture, 60+ components, and 180+ semantic tokens for B2B SaaS teams shipping across Web, iOS, and Android. Shipped at CYGNVS. Start with a $750 UX Audit." />
        <meta name="twitter:image" content="https://www.eswarcreatives.in/og-design-systems.png" />
      </Helmet>

      <div style={{ minHeight: "100vh", fontFamily: "var(--font-family-primary)", color: C.text, background: C.cream }}>
        <Navbar />

        {/* ── SECTION 1 — HERO (Figma node 4251:321, bg gold/10 #fdfaf3, not cream) ── */}
        <section style={{ background: "#FDFAF3", paddingTop: "99px", paddingBottom: "16px", borderBottom: "1px solid rgba(28,24,45,0.05)" }}>
          <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
            <motion.div {...reveal(reducedMotion)}>
              {/* Figma EC-Chip (frame 4030:350), State=Default */}
              <div style={{ marginBottom: "16px" }}>
                <ECChip>Design Systems • Enterprise SAAS</ECChip>
              </div>

              {/* Figma text style Heading/Display Number */}
              <h1
                style={{
                  fontFamily:    "'Inter', system-ui, -apple-system, sans-serif",
                  fontWeight:    700,
                  fontSize:      "40px",
                  lineHeight:    "48px",
                  letterSpacing: "-0.5px",
                  color:         C.text,
                  maxWidth:      "880px",
                  margin:        "0 auto 8px",
                }}
              >
                Enterprise <GoldUnderline reduced={reducedMotion}>design systems</GoldUnderline> for AI SaaS that ship across web, iOS, and Android.
              </h1>

              {/* Figma text style Paragraph/Body Large */}
              <p
                style={{
                  fontFamily:    "'Inter', system-ui, -apple-system, sans-serif",
                  fontWeight:    400,
                  fontSize:      "19px",
                  lineHeight:    "26px",
                  letterSpacing: "0px",
                  color:      C.textSec,
                  maxWidth:   "792px",
                  margin:     "0 auto 32px",
                }}
              >
                B2B SaaS teams waste months rebuilding components that should exist once. We build the token architecture, component library, and documentation so your engineers ship faster and your product stays consistent at scale.
              </p>
            </motion.div>

            {/* Stat row */}
            <div
              className="grid grid-cols-1 sm:grid-cols-3"
              style={{ gap: "32px", maxWidth: "680px", margin: "0 auto 24px" }}
            >
              {HERO_STATS.map(({ value, label, sub }, i) => (
                <motion.div key={label} {...reveal(reducedMotion, { delay: i * 0.1 })}>
                  {/* Figma text style Heading/Large Title Bold */}
                  <p
                    style={{
                      fontFamily:    "'Inter', system-ui, -apple-system, sans-serif",
                      fontWeight:    700,
                      fontSize:      "34px",
                      lineHeight:    "44px",
                      letterSpacing: "0px",
                      color:         C.text,
                      marginBottom:  "4px",
                    }}
                  >
                    {value}
                  </p>
                  {/* Figma text style Heading/Callout — label+sub render as one line in Figma, not two different sizes */}
                  <p
                    style={{
                      fontFamily:    "'Inter', system-ui, -apple-system, sans-serif",
                      fontWeight:    400,
                      fontSize:      "16px",
                      lineHeight:    "20px",
                      letterSpacing: "0px",
                      color:         C.textSec,
                    }}
                  >
                    {label} {sub}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Figma Buttons/EC-Button, Hierarchy=Neutral-Dark, Size=xl */}
            <motion.div {...reveal(reducedMotion, { delay: 0.1 })}>
              <a
                href="/services/design-systems"
                style={{
                  display:        "inline-flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  padding:        "16px 42px",
                  background:     "#222222",
                  border:         "1px solid #222222",
                  borderRadius:   "8px",
                  fontFamily:     "'Inter', system-ui, -apple-system, sans-serif",
                  fontWeight:     700,
                  fontSize:       "17px",
                  lineHeight:     "22px",
                  letterSpacing:  "-0.43px",
                  color:          "#FFFFFF",
                  textDecoration: "none",
                  whiteSpace:     "nowrap",
                }}
              >
                See Engagement Options →
              </a>
            </motion.div>

            {/* Figma "ICP - Badge Card" row (node 4537:25793) */}
            <div
              className="flex flex-wrap items-center justify-center"
              style={{ gap: "20px", marginTop: "16px", flexDirection: isMobile ? "column" : "row" }}
            >
              {ICP_BADGES.map(({ icon, title, caption }, i) => (
                <div key={title} className="flex items-center" style={{ gap: "20px", flexDirection: isMobile ? "column" : "row" }}>
                  {i > 0 && (
                    <div
                      style={
                        isMobile
                          ? { width: "80px", height: "1px", background: "#e5e5e4" }
                          : { width: "1px", height: "109px", background: "#e5e5e4" }
                      }
                    />
                  )}
                  <motion.div
                    {...reveal(reducedMotion, { delay: 0.15 + i * 0.05 })}
                    style={{ width: "320px", padding: "24px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}
                  >
                    <img src={icon} alt="" style={{ height: "68px", marginBottom: "4px" }} />
                    <p
                      style={{
                        fontFamily:    "'Inter', system-ui, -apple-system, sans-serif",
                        fontWeight:    600,
                        fontSize:      "17px",
                        lineHeight:    "22px",
                        letterSpacing: "-0.43px",
                        color:         C.text,
                        textAlign:     "center",
                      }}
                    >
                      {title}
                    </p>
                    <p
                      style={{
                        fontFamily:    "'Inter', system-ui, -apple-system, sans-serif",
                        fontWeight:    400,
                        fontSize:      "13px",
                        lineHeight:    "18px",
                        letterSpacing: "-0.08px",
                        color:         C.textSec,
                        textAlign:     "center",
                      }}
                    >
                      {caption}
                    </p>
                  </motion.div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* ── SECTION 2 — CYGNVS CASE STUDY (Figma node 4251:407) ──── */}
        <section style={{ background: "#FFFFFF", padding: "48px 0 49px", borderBottom: `1px solid rgba(28,24,45,0.05)` }}>
          <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
            <motion.div {...reveal(reducedMotion)} style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{ width: "57px", height: "3px", background: C.gold, borderRadius: "9999px", margin: "0 auto 12px" }} />
              <h2
                style={{
                  fontFamily:    "'Inter', system-ui, -apple-system, sans-serif",
                  fontWeight:    700,
                  fontSize:      "34px",
                  lineHeight:    "44px",
                  letterSpacing: "-0.1px",
                  color:         C.text,
                }}
              >
                CYGNVS case study
              </h2>
            </motion.div>

            <motion.div {...reveal(reducedMotion, { delay: 0.1 })} style={{ marginBottom: "48px", overflowX: isMobile ? "auto" : "visible" }}>
              <img
                src={tokenDiagram}
                alt="Token architecture flowing from hexes to primitives to semantic tokens to UI"
                style={{ display: "block", width: isMobile ? "560px" : "100%", maxWidth: isMobile ? "none" : "960px", margin: "0 auto" }}
              />
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "16px", marginBottom: "40px" }}>
              {TRIAGE_CARDS.map(({ label, desc }, i) => (
                <motion.div
                  key={label}
                  {...reveal(reducedMotion, { delay: i * 0.08 })}
                  style={{ background: "#F5F5F4", borderRadius: "12px", padding: "16px 24px 24px" }}
                >
                  <p
                    style={{
                      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                      fontWeight: 600,
                      fontSize:   "17px",
                      lineHeight: "22px",
                      color:      C.text,
                      marginBottom: "6px",
                    }}
                  >
                    {label}
                  </p>
                  <p
                    style={{
                      fontFamily:    "'Inter', system-ui, -apple-system, sans-serif",
                      fontWeight:    400,
                      fontSize:      "13px",
                      lineHeight:    "18px",
                      letterSpacing: "-0.08px",
                      color:         C.textSec,
                    }}
                  >
                    {desc}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Figma node 4537:25870 — two-column: case study stats+CTA | testimonial */}
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "24px", alignItems: "start" }}>
              <motion.div {...reveal(reducedMotion)} style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontFamily:    "'Inter', system-ui, -apple-system, sans-serif",
                    fontWeight:    600,
                    fontSize:      "22px",
                    lineHeight:    "28px",
                    letterSpacing: "-0.25px",
                    color:         C.text,
                    marginBottom:  "12px",
                  }}
                >
                  60+ components, 180+ semantic tokens, shipped across Web, iOS, and Android at CYGNVS.
                </p>

                <div style={{ display: "flex", marginBottom: "16px" }}>
                  {[
                    { value: "32%", label: "reduction in triage time" },
                    { value: "+18%", label: "analyst satisfaction." },
                  ].map(({ value, label }) => (
                    <div key={label} style={{ flex: 1 }}>
                      <p
                        style={{
                          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                          fontWeight: 700,
                          fontSize:   "34px",
                          lineHeight: "44px",
                          color:      C.text,
                        }}
                      >
                        {value}
                      </p>
                      <p
                        style={{
                          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                          fontWeight: 400,
                          fontSize:   "16px",
                          lineHeight: "20px",
                          color:      C.textSec,
                        }}
                      >
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                <div style={{ height: "1px", background: C.border, marginBottom: "16px" }} />

                <p
                  style={{
                    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                    fontSize:   "19px",
                    lineHeight: "26px",
                    color:      C.textSec,
                    marginBottom: "24px",
                  }}
                >
                  Token architecture, component library, cross-platform theming, and full governance documentation delivered across a{" "}
                  <strong style={{ fontWeight: 700 }}>14-week engagement.</strong>
                </p>

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <ECButton
                    hierarchy="tertiary-color"
                    size="md"
                    label="Read the Case Study"
                    icon="trailing"
                    iconElement={<ArrowRight size={20} />}
                    href="/design-systems/case-study"
                  />
                </div>
              </motion.div>

              <motion.div {...reveal(reducedMotion, { delay: 0.1 })}>
                <div style={{ textAlign: "center", marginBottom: "24px" }}>
                  <div style={{ width: "57px", height: "3px", background: C.gold, borderRadius: "9999px", margin: "0 auto 8px" }} />
                  <p
                    style={{
                      fontFamily:    "'Inter', system-ui, -apple-system, sans-serif",
                      fontWeight:    600,
                      fontSize:      "28px",
                      lineHeight:    "36px",
                      letterSpacing: "-0.3px",
                      color:         C.text,
                    }}
                  >
                    What design leaders say
                  </p>
                </div>

                <a
                  href="https://www.linkedin.com/in/eswaruxui/#:~:text=Show%20all-,Recommendations,-Show%20all%20pending"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display:      "block",
                    border:       "1px solid #EDDDB5",
                    borderRadius: "28px",
                    padding:      isMobile ? "24px 20px" : "32px 24px",
                    background:   "#FFFFFF",
                    boxShadow:    "0 10px 7.5px rgba(112,98,56,0.1)",
                    textDecoration: "none",
                    cursor:       "pointer",
                  }}
                >
                  <img
                    src={quoteMarkGoldIcon}
                    alt=""
                    aria-hidden="true"
                    style={{ height: "28px", margin: "0 auto 16px", display: "block" }}
                  />
                  <p
                    style={{
                      fontFamily:   "'Inter', system-ui, -apple-system, sans-serif",
                      fontSize:     "17px",
                      lineHeight:   "22px",
                      color:        C.textSec,
                      textAlign:    "center",
                      marginBottom: "24px",
                    }}
                  >
                    "Eswar took full ownership of our mobile design system, investing significant time and care into building, refining, and maintaining it."
                  </p>
                  <div
                    style={{
                      borderTop:  `1px solid ${C.border}`,
                      paddingTop: "16px",
                      display:    "flex",
                      alignItems: "center",
                      gap:        "12px",
                    }}
                  >
                    <img
                      src={kevinGaffneyPhoto}
                      alt="Kevin Gaffney"
                      style={{
                        width:        "40px",
                        height:       "40px",
                        borderRadius: "50%",
                        objectFit:    "cover",
                        flexShrink:   0,
                      }}
                    />
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 600, fontSize: "15px", lineHeight: "20px", letterSpacing: "-0.1px", color: C.text }}>
                        Kevin Gaffney
                      </p>
                      <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 400, fontSize: "13px", lineHeight: "18px", color: C.textSec }}>
                        Chief Technology Officer, CYGNVS
                      </p>
                    </div>
                  </div>
                </a>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── SECTION 4 — PAIN QUESTIONS (Figma nodes 4251:482, 4271:12660, 4271:12632) ─── */}
        {PAIN_QUESTIONS.map(({ question, illustration, illustrationWidth, captionHeadline, caption, cta, bg, bordered }, i) => (
          <section
            key={question}
            ref={(el) => { painRefs.current[i] = el; }}
            style={{
              background: bg,
              padding: "48px 0",
              ...(bordered ? { borderTop: "1px solid #e5e5e4", borderBottom: "1px solid #e5e5e4" } : {}),
            }}
          >
            <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
              <motion.div {...reveal(reducedMotion)}>
                <div style={{ width: "57px", height: "3px", background: C.gold, borderRadius: "9999px", margin: "0 auto 12px" }} />
                <h2
                  style={{
                    fontFamily:    "'Inter', system-ui, -apple-system, sans-serif",
                    fontWeight:    600,
                    fontSize:      isMobile ? "22px" : "28px",
                    lineHeight:    "36px",
                    letterSpacing: "-0.3px",
                    color:         C.text,
                    maxWidth:      "640px",
                    margin:        "0 auto 40px",
                  }}
                >
                  {question}
                </h2>
                <img
                  src={illustration}
                  alt=""
                  aria-hidden="true"
                  style={{ display: "block", width: "100%", maxWidth: `${illustrationWidth}px`, margin: "0 auto 16px", mixBlendMode: "multiply" }}
                />
                {captionHeadline && (
                  <p
                    style={{
                      fontFamily:    "'Inter', system-ui, -apple-system, sans-serif",
                      fontWeight:    600,
                      fontSize:      "28px",
                      lineHeight:    "36px",
                      letterSpacing: "-0.3px",
                      color:         C.text,
                      marginBottom:  "8px",
                    }}
                  >
                    {captionHeadline}
                  </p>
                )}
                <p
                  style={{
                    fontFamily:   "'Inter', system-ui, -apple-system, sans-serif",
                    fontWeight:   600,
                    fontSize:     "17px",
                    lineHeight:   "22px",
                    color:        captionHeadline ? C.textSec : C.text,
                    marginBottom: cta ? "24px" : 0,
                  }}
                >
                  {caption}
                </p>
                {cta && (
                  <a
                    href="/services/design-systems/enquiry?type=ux-audit"
                    style={{
                      display:        "inline-flex",
                      alignItems:     "center",
                      justifyContent: "center",
                      padding:        "10px 42px",
                      background:     "#222222",
                      border:         "1px solid #222222",
                      borderRadius:   "8px",
                      fontFamily:     "'Inter', system-ui, -apple-system, sans-serif",
                      fontWeight:     600,
                      fontSize:       "15px",
                      lineHeight:     "20px",
                      letterSpacing:  "-0.1px",
                      color:          "#FFFFFF",
                      textDecoration: "none",
                      whiteSpace:     "nowrap",
                    }}
                  >
                    Start with the Audit →
                  </a>
                )}
              </motion.div>
              <ScrollDots count={PAIN_QUESTIONS.length} active={activeQuestion} onSelect={scrollToPainSection} />
            </div>
          </section>
        ))}

        {/* ── SECTION 5 — HOW IT WORKS (Figma node 4251:538) ── */}
        <section id="how-it-works" style={{ background: "#FFFFFF", padding: "49px 0", borderTop: "1px solid #e5e5e4", borderBottom: "1px solid #e5e5e4", scrollMarginTop: "67px" }}>
          <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
            <motion.div {...reveal(reducedMotion)} style={{ textAlign: "center", marginBottom: "16px" }}>
              <div style={{ width: "57px", height: "3px", background: C.gold, borderRadius: "9999px", margin: "0 auto 12px" }} />
              <h2 style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 600, fontSize: "28px", lineHeight: "36px", letterSpacing: "-0.3px", color: C.text, marginBottom: "6px" }}>
                How it works
              </h2>
              <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 600, fontSize: "17px", lineHeight: "22px", color: C.textSec }}>
                Three phases. Clear deliverables at each step.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "62px", marginTop: "36px" }}>
              {HOW_IT_WORKS.map(({ icon, step, title, desc }, i) => (
                <motion.div key={step} {...reveal(reducedMotion, { delay: i * 0.1 })}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <img src={icon} alt="" aria-hidden="true" style={{ width: "24px", height: "24px" }} />
                    <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 600, fontSize: "22px", lineHeight: "28px", letterSpacing: "-0.25px", color: C.text }}>
                      {title}
                    </p>
                  </div>
                  <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: "15px", lineHeight: "20px", color: C.textSec, marginBottom: "8px" }}>
                    {desc}
                  </p>
                  <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 700, fontSize: "40px", lineHeight: "48px", letterSpacing: "-0.5px", color: "var(--text-disabled, #aaa)" }}>
                    {step}
                  </p>
                </motion.div>
              ))}
            </div>

            <img src={howItWorksDividerVector} alt="" aria-hidden="true" style={{ width: "100%", height: "auto", marginTop: "8px" }} />

            <motion.div {...reveal(reducedMotion)} style={{ textAlign: "center", marginTop: "16px" }}>
              <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 600, fontSize: "22px", lineHeight: "28px", letterSpacing: "-0.25px", color: C.text, marginBottom: "24px" }}>
                Your next sprint deserves a system behind it.
              </p>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div style={{ display: "flex", width: "347px" }}>
                  <ECButton
                    hierarchy="primary"
                    size="lg"
                    label="Start with the Audit ->"
                    href="/services/design-systems/enquiry?type=ux-audit"
                    fullWidth
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── SECTION 6 — UX AUDIT PRICING WEDGE (Figma node 4251:647, bg gold/10) ── */}
        <section style={{ background: "#FDFAF3", padding: "48px 0" }}>
          <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <motion.div {...reveal(reducedMotion)} style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{ width: "57px", height: "3px", background: C.gold, borderRadius: "9999px", margin: "0 auto 12px" }} />
              <h2 style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 600, fontSize: "28px", lineHeight: "36px", letterSpacing: "-0.3px", color: C.text }}>
                Start smaller
              </h2>
            </motion.div>

            <motion.div
              {...reveal(reducedMotion, { delay: 0.1 })}
              style={{
                width:        isMobile ? "100%" : "723px",
                maxWidth:     "100%",
                borderTop:    `4px solid #d5b067`,
                borderRadius: "32px",
                padding:      isMobile ? "24px" : "36px 72px 32px",
                background:   "#FFFFFF",
                boxShadow:    "0px 4px 3px rgba(112,98,56,0.07)",
                textAlign:    "center",
              }}
            >
              <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 500, fontSize: "16px", lineHeight: "20px", letterSpacing: "-0.31px", color: "#717171", marginBottom: "16px" }}>
                Low-risk entry point
              </p>
              <h3 style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 600, fontSize: "36px", lineHeight: "44px", letterSpacing: "-0.5px", color: C.text, marginBottom: "8px" }}>
                Start with a UX Audit.
              </h3>
              <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: "15px", lineHeight: "20px", color: C.text, margin: "0 auto 24px" }}>
                A full design systems engagement starts at $2,500. The audit gives you the same diagnostic clarity for $750, and every dollar credits toward the full engagement if you proceed. Most teams find the report alone is worth the fee.
              </p>

              <div style={{ display: "inline-flex", alignItems: "center", marginBottom: "24px" }}>
                <div style={{ padding: "9px 25px", textAlign: "center", background: "#f5f5f4", border: "1px solid rgba(13,10,23,0.15)", borderRadius: "16px 0 0 16px", marginRight: "-1px", alignSelf: "stretch", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 600, fontSize: "22px", lineHeight: "28px", letterSpacing: "-0.25px", color: C.textSec, textDecoration: "line-through" }}>$2,500</p>
                  <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: "15px", lineHeight: "20px", color: C.text }}>(Value)</p>
                </div>
                <div style={{ padding: "9px 25px", textAlign: "center", background: "#FFFFFF", border: "1px solid rgba(13,10,23,0.15)", borderRadius: "0 16px 16px 0", alignSelf: "stretch", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 700, fontSize: "52px", lineHeight: "62px", letterSpacing: "-0.5px", color: C.text }}>$750</p>
                  <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: "15px", lineHeight: "20px", color: C.text }}>(Fixed fee)</p>
                </div>
              </div>

              <div style={{ marginBottom: "8px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                {PRICING_CHECKLIST.map((row) => (
                  <div key={row} style={{ display: "flex", alignItems: "flex-start", gap: "6px", width: "436px", maxWidth: "100%" }}>
                    <img src={checkCircleGoldIcon} alt="" aria-hidden="true" style={{ width: "16px", height: "16px", marginTop: "2px", flexShrink: 0 }} />
                    <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 600, fontSize: "15px", lineHeight: "20px", letterSpacing: "-0.1px", color: C.text, textAlign: "left" }}>{row}</p>
                  </div>
                ))}
              </div>

              <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 600, fontSize: "17px", lineHeight: "22px", color: C.textSec, margin: "16px 0" }}>
                Start with an audit. Commit to nothing else yet.
              </p>

              <div style={{ display: "flex", width: "100%" }}>
                <ECButton
                  hierarchy="primary"
                  size="xl"
                  label="Start with the audit →"
                  href="/services/design-systems/enquiry?type=ux-audit"
                  fullWidth
                />
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: "6px", marginTop: "16px" }}>
                <img src={shieldCheckIcon} alt="" aria-hidden="true" style={{ width: "15px", height: "17px", marginTop: "2px", flexShrink: 0 }} />
                <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: "15px", lineHeight: "20px", color: C.text }}>100% money-back guarantee. No questions asked.</p>
              </div>

              <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: "13px", lineHeight: "18px", color: C.textSec, marginTop: "16px" }}>
                If the audit does not surface at least 3 actionable findings, you pay nothing.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── SECTION 6.5 — CONTACT BAR (Figma node 4251:709, white, hairline top/bottom) ── */}
        <section style={{ background: "#FFFFFF", padding: "33px 0", borderTop: "1px solid #e5e5e4", borderBottom: "1px solid #e5e5e4" }}>
          <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: "20px" }}>
            <a
              href="https://www.linkedin.com/in/eswaruxui/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "flex-start", gap: "7px", fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: "15px", lineHeight: "20px", color: C.text, textDecoration: "none" }}
            >
              <img src={linkedinIcon} alt="" aria-hidden="true" style={{ width: "14px", height: "14px", marginTop: "3px", flexShrink: 0 }} />
              Find me on LinkedIn
            </a>
            <span style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: "16px", color: "#e5e5e4" }}>·</span>
            <a href="mailto:eswar@eswarcreatives.in?subject=Design%20System%20Enquiry&body=Hi%20Eswar%2C%0A%0AHere%27s%20a%20quick%20summary%20of%20what%20we%27re%20working%20with%3A%0A%0ADesign%20system%20status%3A%0ATeam%20size%3A%0APlatform%20mix%20(web%2C%20iOS%2C%20Android)%3A%0ABiggest%20current%20pain%3A%0A%0ALooking%20forward%20to%20hearing%20from%20you." style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: "15px", lineHeight: "20px", color: C.text, textDecoration: "none" }}>
              eswar@eswarcreatives.in
            </a>
          </div>
        </section>

        {/* ── SECTION 7 — FOOTER CTA (Figma node 4251:723, bg background/overlay #2e2e2e) ── */}
        <section style={{ background: "#2E2E2E", paddingTop: isMobile ? "64px" : "48px" }}>
          <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
            <motion.div {...reveal(reducedMotion)}>
              <div style={{ width: "57px", height: "3px", background: "#aaaaaa", borderRadius: "9999px", margin: "0 auto 12px" }} />
              <h2
                style={{
                  fontFamily:    "'Inter', system-ui, -apple-system, sans-serif",
                  fontWeight:    600,
                  fontSize:      "28px",
                  lineHeight:    "36px",
                  letterSpacing: "-0.3px",
                  color:         "#d5b067",
                  maxWidth:      "473px",
                  margin:        "0 auto",
                }}
              >
                Still figuring out where to start?
              </h2>

              <div style={{ maxWidth: "543px", margin: "16px auto 0", paddingBottom: "40px" }}>
                <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontWeight: 600, fontSize: "17px", lineHeight: "22px", color: "#FFFFFF", marginBottom: "8px" }}>
                  Tell us what you are working with.
                </p>
                <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: "17px", lineHeight: "22px", color: "#aaaaaa", marginBottom: "8px" }}>
                  Describe your platform mix, team size, and <span style={{ color: "#d5b067" }}>biggest current pain.</span>
                </p>
                <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: "17px", lineHeight: "22px", color: "#aaaaaa" }}>
                  We will come back with a scoped recommendation in 48 hours. No pitch deck. No retainer conversation.
                </p>
              </div>

              <a
                href="/services/design-systems/enquiry?ref=landing-cta"
                style={{
                  display:         "inline-flex",
                  alignItems:      "center",
                  justifyContent:  "center",
                  padding:         isMobile ? "16px 40px" : "16px 120px",
                  background:      "#FFFFFF",
                  borderRadius:    "8px",
                  fontFamily:      "'Inter', system-ui, -apple-system, sans-serif",
                  fontWeight:      700,
                  fontSize:        "17px",
                  lineHeight:      "22px",
                  letterSpacing:   "-0.43px",
                  color:           "#007872",
                  textDecoration:  "none",
                  whiteSpace:      "nowrap",
                }}
              >
                Send a Note  {"->"}
              </a>
            </motion.div>
          </div>

          <div style={{ background: "#222222", padding: "24px 0 64px", marginTop: "56px" }}>
            <p style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", fontSize: "13px", lineHeight: "18px", letterSpacing: "-0.08px", color: "#888888", textAlign: "center" }}>
              © 2026 Eswar Maheswaran. All rights reserved.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
