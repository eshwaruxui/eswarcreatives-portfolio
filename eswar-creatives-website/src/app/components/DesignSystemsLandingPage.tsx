import { useEffect, useRef, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Shield } from "lucide-react";
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
import usersTealIcon from "../../imports/design-systems/users-teal-icon.svg";

// ── Design tokens (src/app convention: local const mapping to theme.css vars) ──
const C = {
  cream:      "#FAF8F4",
  gold:       "#D5B067",
  border:     "var(--border-default)",
  surface:    "var(--card)",
  inverse:    "var(--bg-inverse)",
  tint1:      "var(--bg-tint-1)",
  teal:       "var(--text-brand)",
  text:       "var(--text-primary)",
  textSec:    "var(--text-secondary)",
  textMuted:  "var(--text-tertiary)",
  textInv:    "var(--text-inverse)",
} as const;

const SERIF       = "'Fraunces', Georgia, 'Times New Roman', serif";
const MONO        = "var(--font-mono, 'SF Mono', monospace)";
const CARD_SHADOW = "0px 4px 6px -1px rgba(2,4,4,0.07)";

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

export function DesignSystemsLandingPage() {
  const isMobile = useIsMobile();
  const reducedMotion = !!useReducedMotion();

  useEffect(() => {
    document.title = "Design Systems for B2B SaaS · Eswar Creatives";
  }, []);

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
      </div>
    </>
  );
}
