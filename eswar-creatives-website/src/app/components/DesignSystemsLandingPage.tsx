import { useEffect, useRef, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Linkedin } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Navbar } from "./Navbar";
import { PortfolioButton } from "./ui/portfolio-button";
import { useIsMobile } from "./ui/use-mobile";

import tokenDiagram from "../../imports/design-systems/brand-token-mapping-ui-states-illustration.svg";
import alertInboxIllustration from "../../imports/design-systems/cross-platform-alert-inbox-ui-illustration.svg";
import crossPlatformIllustration from "../../imports/design-systems/cross-platform-web-ios-android-illustration.svg";
import aiSimilarityIllustration from "../../imports/design-systems/hero-ai-product-similarity-confusion-illustration.svg";
import buildFromScratchIllustration from "../../imports/design-systems/repeated-feature-build-from-scratch-illustration.svg";
import checkCircleGoldIcon from "../../imports/design-systems/check-circle-gold-icon.svg";
import componentCubeTealIcon from "../../imports/design-systems/component-cube-teal-icon.svg";
import quoteMarkGoldIcon from "../../imports/design-systems/quote-mark-gold-icon.svg";
import searchTealIcon from "../../imports/design-systems/search-teal-icon.svg";
import shieldCheckIcon from "../../imports/design-systems/shield-check-outline-icon.svg";
import usersTealIcon from "../../imports/design-systems/users-teal-icon.svg";

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

const overline = {
  fontSize:      "12px",
  fontWeight:    600,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  color:         C.textMuted,
};

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
    <span style={{ position: "relative", display: "inline-block" }}>
      {children}
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
          bottom:       "-4px",
          left:         0,
          height:       "3px",
          borderRadius: "2px",
          background:   C.gold,
        }}
      />
    </span>
  );
}

const HERO_STATS = [
  { value: "32%",  label: "Triage time reduction", sub: "at CYGNVS" },
  { value: "60+",  label: "Components", sub: "shipped" },
  { value: "180+", label: "Semantic tokens", sub: "across platforms" },
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

const PAIN_QUESTIONS: { question: string; illustration: string; caption: string; cta?: boolean }[] = [
  {
    question:     "Does every new feature start from scratch because there is no shared component library?",
    illustration: buildFromScratchIllustration,
    caption:      "Wasted time. Duplicated effort. Inconsistent experience.",
  },
  {
    question:     "Is your AI product starting to look like every other AI product?",
    illustration: aiSimilarityIllustration,
    caption:      "The sea of sameness. Every AI product built without a system looks like the last one.",
  },
  {
    question:     "Does your product look different on web, iOS, and Android?",
    illustration: crossPlatformIllustration,
    caption:      "Inconsistent experience. Confused users. Weaker brand.",
    cta:          true,
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
            width:         active === i ? "8px" : "6px",
            height:        active === i ? "8px" : "6px",
            borderRadius:  "50%",
            background:    active === i ? C.teal : C.textMuted,
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

        {/* ── SECTION 1 — HERO ─────────────────────────────────────── */}
        <section style={{ background: C.cream, paddingTop: "112px", paddingBottom: "64px" }}>
          <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
            <motion.div {...reveal(reducedMotion)}>
              <span
                style={{
                  ...overline,
                  display:       "inline-block",
                  border:        `1px solid ${C.border}`,
                  borderRadius:  "999px",
                  padding:       "6px 14px",
                  marginBottom:  "24px",
                }}
              >
                Design Systems • Enterprise SaaS
              </span>

              <h1
                style={{
                  fontFamily:    SERIF,
                  fontWeight:    700,
                  fontSize:      isMobile ? "36px" : "56px",
                  lineHeight:    1.1,
                  letterSpacing: "-0.02em",
                  color:         C.text,
                  maxWidth:      "880px",
                  margin:        "0 auto 20px",
                }}
              >
                Enterprise <GoldUnderline reduced={reducedMotion}>design systems</GoldUnderline> for AI SaaS that ship across web, iOS, and Android.
              </h1>

              <p
                style={{
                  fontSize:   "18px",
                  lineHeight: 1.6,
                  color:      C.textMuted,
                  maxWidth:   "600px",
                  margin:     "0 auto 32px",
                }}
              >
                B2B SaaS teams waste months rebuilding components that should exist once. We build the token architecture, component library, and documentation so your engineers ship faster and your product stays consistent at scale.
              </p>
            </motion.div>

            {/* Stat row */}
            <div
              className="grid grid-cols-1 sm:grid-cols-3"
              style={{ gap: "32px", maxWidth: "680px", margin: "0 auto 32px" }}
            >
              {HERO_STATS.map(({ value, label, sub }, i) => (
                <motion.div key={label} {...reveal(reducedMotion, { delay: i * 0.1 })}>
                  <p style={{ fontFamily: MONO, fontWeight: 700, fontSize: "48px", lineHeight: 1.1, color: C.teal, marginBottom: "4px" }}>
                    {value}
                  </p>
                  <p style={{ fontSize: "14px", color: C.text, marginBottom: "2px" }}>{label}</p>
                  <p style={{ fontSize: "13px", color: C.textMuted }}>{sub}</p>
                </motion.div>
              ))}
            </div>

            <motion.div {...reveal(reducedMotion, { delay: 0.1 })}>
              <PortfolioButton
                href="/services/design-systems"
                variant="brand"
                size="lg"
                style={{ borderRadius: "8px" }}
              >
                See Engagement Options
                <ArrowRight className="w-4 h-4" />
              </PortfolioButton>

              <p style={{ fontSize: "14px", color: C.textMuted, maxWidth: "480px", margin: "16px auto 0" }}>
                Built for Series A to C product teams, 30 to 200 employees, shipping across web, iOS, and Android.
              </p>
            </motion.div>

            {/* Device illustration zone — real CYGNVS screenshots pending, placeholder frames until supplied */}
            {!isMobile && (
              <motion.div
                {...reveal(reducedMotion, { delay: 0.2 })}
                style={{ position: "relative", overflow: "hidden", marginTop: "56px", height: "260px" }}
              >
                <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "20px", height: "100%" }}>
                  {[
                    { w: 130, h: 220, radius: 18 },
                    { w: 300, h: 200, radius: 10 },
                    { w: 200, h: 240, radius: 22 },
                  ].map(({ w, h, radius }, i) => (
                    <div
                      key={i}
                      style={{
                        width:          `${w}px`,
                        height:         `${h}px`,
                        borderRadius:   `${radius}px`,
                        border:         `1.5px dashed ${C.teal}`,
                        background:     C.cream,
                        display:        "flex",
                        alignItems:     "center",
                        justifyContent: "center",
                        flexShrink:     0,
                      }}
                    >
                      <span style={{ fontSize: "12px", color: C.textMuted, textAlign: "center", padding: "0 12px" }}>
                        Screenshot coming soon
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    position:  "absolute",
                    bottom:    0,
                    left:      0,
                    right:     0,
                    height:    "140px",
                    background: `linear-gradient(to bottom, transparent, ${C.cream})`,
                    pointerEvents: "none",
                  }}
                />
              </motion.div>
            )}
          </div>
        </section>

        {/* ── SECTION 2 — CYGNVS CASE STUDY ───────────────────────── */}
        <section style={{ background: C.cream, padding: "80px 0", borderTop: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
            <motion.div {...reveal(reducedMotion)} style={{ textAlign: "center", marginBottom: "48px" }}>
              <div style={{ width: "40px", height: "2px", background: C.gold, margin: "0 auto 16px" }} />
              <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "32px", color: C.text }}>
                CYGNVS case study
              </h2>
            </motion.div>

            <motion.div {...reveal(reducedMotion, { delay: 0.1 })} style={{ marginBottom: "48px" }}>
              {isMobile ? (
                <div
                  style={{
                    display:       "flex",
                    alignItems:    "center",
                    justifyContent: "center",
                    flexWrap:      "wrap",
                    gap:           "8px",
                    fontSize:      "14px",
                    color:         C.textMuted,
                  }}
                >
                  {["Hexes", "Primitives", "Semantic", "User Interface"].map((step, i, arr) => (
                    <span key={step} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {step}
                      {i < arr.length - 1 && <span style={{ color: C.gold }}>→</span>}
                    </span>
                  ))}
                </div>
              ) : (
                <img
                  src={tokenDiagram}
                  alt="Token architecture flowing from hexes to primitives to semantic tokens to UI"
                  style={{ display: "block", width: "100%", maxWidth: "960px", margin: "0 auto" }}
                />
              )}
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "20px", marginBottom: "40px" }}>
              {TRIAGE_CARDS.map(({ label, desc, illustration }, i) => (
                <motion.div
                  key={label}
                  {...reveal(reducedMotion, { delay: i * 0.08 })}
                  style={{ background: C.tint1, borderRadius: "8px", padding: "20px" }}
                >
                  <p style={{ fontSize: "15px", fontWeight: 600, color: C.text, marginBottom: "8px" }}>{label}</p>
                  <p style={{ fontSize: "14px", lineHeight: 1.5, color: C.textSec }}>{desc}</p>
                  {illustration && (
                    <img
                      src={illustration}
                      alt=""
                      aria-hidden="true"
                      style={{ display: "block", width: "100%", marginTop: "12px", borderRadius: "4px" }}
                    />
                  )}
                </motion.div>
              ))}
            </div>

            <motion.div {...reveal(reducedMotion)} style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto" }}>
              <p style={{ fontSize: "16px", lineHeight: 1.6, color: C.text, marginBottom: "12px" }}>
                60+ components, 180+ semantic tokens, shipped across Web, iOS, and Android at CYGNVS. 32% reduction in triage time. +18% analyst satisfaction.
              </p>
              <a
                href="/design-systems/case-study"
                className="hover:underline"
                style={{
                  fontSize:       "14px",
                  color:          C.teal,
                  textDecoration: "none",
                  display:        "inline-flex",
                  alignItems:     "center",
                  gap:            "6px",
                }}
              >
                Read the Case Study
                <ArrowRight style={{ width: "14px", height: "14px" }} />
              </a>
            </motion.div>
          </div>
        </section>

        {/* ── SECTION 3 — TESTIMONIAL ──────────────────────────────── */}
        <section style={{ background: C.cream, padding: "80px 0" }}>
          <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
            <motion.div {...reveal(reducedMotion)} style={{ textAlign: "center", marginBottom: "40px" }}>
              <div style={{ width: "40px", height: "2px", background: C.gold, margin: "0 auto 16px" }} />
              <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "32px", color: C.text }}>
                What design leaders say
              </h2>
            </motion.div>

            <motion.div
              {...reveal(reducedMotion, { delay: 0.1 })}
              style={{
                maxWidth:     "680px",
                margin:       "0 auto",
                border:       `1px solid ${C.gold}`,
                borderRadius: "12px",
                padding:      isMobile ? "24px 20px" : "40px 48px",
                background:   "#FFFFFF",
                textAlign:    "center",
              }}
            >
              <img
                src={quoteMarkGoldIcon}
                alt=""
                aria-hidden="true"
                style={{ height: "48px", margin: "0 auto 8px", display: "block" }}
              />
              <p
                style={{
                  fontFamily:   SERIF,
                  fontStyle:    "italic",
                  fontSize:     isMobile ? "17px" : "20px",
                  lineHeight:   1.6,
                  color:        C.text,
                  marginBottom: "24px",
                }}
              >
                Eswar took full ownership of our mobile design system, investing significant time and care into building, refining, and maintaining it.
              </p>
              <div
                style={{
                  borderTop:      `1px solid ${C.border}`,
                  paddingTop:     "24px",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  gap:            "12px",
                }}
              >
                <div
                  style={{
                    width:          "40px",
                    height:         "40px",
                    borderRadius:   "50%",
                    background:     "#E5E7EB",
                    display:        "flex",
                    alignItems:     "center",
                    justifyContent: "center",
                    flexShrink:     0,
                  }}
                  aria-hidden="true"
                >
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "#6B7280" }}>KG</span>
                </div>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: "15px", fontWeight: 700, color: C.text }}>Kevin Gaffney</p>
                  <p style={{ fontSize: "13px", color: C.textMuted }}>Chief Technology Officer, CYGNVS</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── SECTION 4 — PAIN QUESTIONS ───────────────────────────── */}
        {PAIN_QUESTIONS.map(({ question, illustration, caption, cta }, i) => (
          <section
            key={question}
            ref={(el) => { painRefs.current[i] = el; }}
            style={{ background: C.cream, padding: "80px 0" }}
          >
            <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
              <motion.div {...reveal(reducedMotion)}>
                <h2
                  style={{
                    fontFamily:   SERIF,
                    fontWeight:   700,
                    fontSize:     isMobile ? "22px" : "28px",
                    color:        C.text,
                    maxWidth:     "640px",
                    margin:       "0 auto 32px",
                  }}
                >
                  {question}
                </h2>
                <img
                  src={illustration}
                  alt=""
                  aria-hidden="true"
                  style={{ display: "block", width: "100%", maxWidth: "680px", margin: "0 auto 24px" }}
                />
                <p style={{ fontSize: "14px", color: C.textMuted, marginBottom: cta ? "24px" : 0 }}>
                  {caption}
                </p>
                {cta && (
                  <PortfolioButton
                    href="/services/design-systems/enquiry?type=ux-audit"
                    variant="brand"
                    size="lg"
                    style={{ borderRadius: "8px" }}
                  >
                    Start with the Audit
                    <ArrowRight className="w-4 h-4" />
                  </PortfolioButton>
                )}
              </motion.div>
              <ScrollDots count={PAIN_QUESTIONS.length} active={activeQuestion} onSelect={scrollToPainSection} />
            </div>
          </section>
        ))}

        {/* ── SECTION 5 — HOW IT WORKS (white, intentional contrast break) ── */}
        <section style={{ background: "#FFFFFF", padding: "80px 0", borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
            <motion.div {...reveal(reducedMotion)} style={{ textAlign: "center", marginBottom: "48px" }}>
              <div style={{ width: "40px", height: "2px", background: C.gold, margin: "0 auto 16px" }} />
              <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "32px", color: C.text, marginBottom: "12px" }}>
                How it works
              </h2>
              <p style={{ fontSize: "16px", color: C.textMuted }}>Three phases. Clear deliverables at each step.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "32px", marginBottom: "48px" }}>
              {HOW_IT_WORKS.map(({ icon, step, title, desc }, i) => (
                <motion.div key={step} {...reveal(reducedMotion, { delay: i * 0.1 })}>
                  <p style={{ fontFamily: MONO, fontWeight: 700, fontSize: "64px", lineHeight: 1, color: C.border, marginBottom: "8px" }}>
                    {step}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                    <img src={icon} alt="" aria-hidden="true" style={{ width: "20px", height: "20px" }} />
                    <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "16px", color: C.text }}>{title}</p>
                  </div>
                  <p style={{ fontSize: "15px", lineHeight: 1.6, color: C.textMuted }}>{desc}</p>
                </motion.div>
              ))}
            </div>

            <motion.div {...reveal(reducedMotion)} style={{ textAlign: "center" }}>
              <p style={{ fontSize: "18px", fontWeight: 500, color: C.text, marginBottom: "24px" }}>
                Your next sprint deserves a system behind it.
              </p>
              <PortfolioButton
                href="/services/design-systems/enquiry?type=ux-audit"
                variant="brand"
                size="lg"
                style={{ borderRadius: "8px" }}
              >
                Start with the Audit
                <ArrowRight className="w-4 h-4" />
              </PortfolioButton>
            </motion.div>
          </div>
        </section>

        {/* ── SECTION 6 — UX AUDIT PRICING WEDGE ──────────────────── */}
        <section style={{ background: C.cream, padding: "80px 0" }}>
          <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
            <motion.div {...reveal(reducedMotion)} style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{ width: "40px", height: "2px", background: C.gold, margin: "0 auto 16px" }} />
              <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "24px", color: C.text }}>Start smaller</h2>
            </motion.div>

            <motion.div
              {...reveal(reducedMotion, { delay: 0.1 })}
              style={{
                maxWidth:     "600px",
                margin:       "0 auto",
                border:       `2px solid ${C.gold}`,
                borderRadius: "16px",
                padding:      isMobile ? "24px" : "48px",
                background:   "#FFFFFF",
                textAlign:    "center",
              }}
            >
              <p style={{ fontFamily: MONO, fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: C.textMuted, marginBottom: "16px" }}>
                Low-risk entry point
              </p>
              <h3 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: isMobile ? "28px" : "36px", color: C.text, marginBottom: "16px" }}>
                Start with a UX Audit.
              </h3>
              <p style={{ fontSize: "16px", lineHeight: 1.6, color: C.textMuted, maxWidth: "480px", margin: "0 auto 32px" }}>
                A full design systems engagement starts at $2,500. The audit gives you the same diagnostic clarity for $750, and every dollar credits toward the full engagement if you proceed. Most teams find the report alone is worth the fee.
              </p>

              <div style={{ display: "inline-flex", border: `1px solid ${C.border}`, borderRadius: "8px", marginBottom: "32px" }}>
                <div style={{ padding: "16px 24px", textAlign: "left" }}>
                  <p style={{ fontSize: "20px", textDecoration: "line-through", color: C.textMuted, marginBottom: "2px" }}>$2,500</p>
                  <p style={{ fontSize: "13px", color: C.textMuted }}>(Value)</p>
                </div>
                <div style={{ width: "1px", background: C.border }} />
                <div style={{ padding: "16px 24px", textAlign: "left" }}>
                  <p style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "48px", color: C.text, lineHeight: 1.1 }}>$750</p>
                  <p style={{ fontSize: "13px", color: C.textMuted }}>(Fixed fee)</p>
                </div>
              </div>

              <div style={{ textAlign: "left", marginBottom: "24px", display: "flex", flexDirection: "column", gap: "14px" }}>
                {PRICING_CHECKLIST.map((row) => (
                  <div key={row} style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <img src={checkCircleGoldIcon} alt="" aria-hidden="true" style={{ width: "16px", height: "16px", marginTop: "2px", flexShrink: 0 }} />
                    <p style={{ fontSize: "15px", fontWeight: 500, color: C.text }}>{row}</p>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: "14px", color: C.textMuted, marginBottom: "20px" }}>
                Start with an audit. Commit to nothing else yet.
              </p>

              <PortfolioButton
                href="/services/design-systems/enquiry?type=ux-audit"
                variant="brand"
                size="lg"
                fullWidth
                style={{ borderRadius: "8px", marginBottom: "16px" }}
              >
                Start with the Audit
                <ArrowRight className="w-4 h-4" />
              </PortfolioButton>

              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                <img src={shieldCheckIcon} alt="" aria-hidden="true" style={{ width: "16px", height: "16px" }} />
                <p style={{ fontSize: "13px", color: C.textMuted }}>100% money-back guarantee. No questions asked.</p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── SECTION 7 — FOOTER CTA ───────────────────────────────── */}
        <section style={{ background: C.inverse, padding: isMobile ? "64px 0" : "100px 0" }}>
          <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
            <motion.div {...reveal(reducedMotion)}>
              <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "28px", color: "#FFFFFF", marginBottom: "16px" }}>
                Still figuring out where to start?
              </h2>
              <p style={{ fontSize: "15px", lineHeight: 1.6, color: "#9CA3AF", maxWidth: "520px", margin: "0 auto 32px" }}>
                Tell us what you are working with. Describe your challenges, team size, and biggest current pain. We will suggest the right entry point, whether that is a $750 audit, a project proposal, or just a 20-minute conversation.
              </p>
              <PortfolioButton
                href="/services/design-systems/enquiry?ref=landing-cta"
                variant="accent"
                size="lg"
                style={{ borderRadius: "8px", marginBottom: "32px" }}
              >
                Send a Note
                <ArrowRight className="w-4 h-4" />
              </PortfolioButton>

              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: "24px" }}>
                <a
                  href="https://www.linkedin.com/in/eswaruxui/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#6B7280", textDecoration: "none" }}
                >
                  <Linkedin style={{ width: "14px", height: "14px" }} />
                  linkedin.com/in/eswaruxui
                </a>
                <a href="mailto:eswar@eswarcreatives.in" style={{ fontSize: "13px", color: "#6B7280", textDecoration: "none" }}>
                  eswar@eswarcreatives.in
                </a>
              </div>

              <p style={{ fontSize: "12px", color: "#4B5563", marginTop: "32px" }}>
                © 2026 Eswar Creatives. All rights reserved.
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
}
