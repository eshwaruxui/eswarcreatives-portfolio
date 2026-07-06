import { useEffect, type ReactNode } from "react";
import { ArrowRight, Check, Search, Package, Users } from "lucide-react";
import { motion } from "motion/react";
import { Navbar } from "./Navbar";
import { PortfolioButton } from "./ui/portfolio-button";
import { BeforeAfterVisual } from "./ui/BeforeAfterVisual";

const C = {
  pageBg:      "#FAF8F4",
  gold:        "#D5B067",
  border:      "#E5E5E4",
  surface:     "var(--card)",
  inverse:     "var(--surface-inverse)",
  teal:        "var(--text-brand)",
  tealHex:     "#007872",
  text:        "var(--text-primary)",
  textSec:     "var(--text-secondary)",
  textMuted:   "var(--text-tertiary)",
  textInv:     "var(--text-inverse)",
  textInvSec:  "var(--text-inverse-secondary)",
  textInvTert: "var(--text-inverse-tertiary)",
} as const;

const SERIF       = "'Fraunces', Georgia, 'Times New Roman', serif";
const CARD_SHADOW = "0px 4px 6px -1px rgba(2,4,4,0.07)";

const overline = {
  fontSize:      "var(--typo-ol-overline-bold-size)",
  fontWeight:    "var(--typo-ol-overline-bold-weight)",
  lineHeight:    "var(--typo-ol-overline-bold-line-height)",
  letterSpacing: "var(--typo-ol-overline-bold-letter-spacing)",
  textTransform: "uppercase" as const,
  color:         C.textMuted,
};


const PROOF_STATS = [
  { value: "60+",   label: "Components" },
  { value: "180+",  label: "Semantic tokens" },
  { value: "3",     label: "Platforms" },
  { value: "+18%",  label: "Analyst satisfaction" },
];

const ICP_QUESTIONS: { question: string; icon: ReactNode }[] = [
  {
    question: "Are your designers and engineers using different values for the same color?",
    icon: (
      <svg width="56" height="28" viewBox="0 0 56 28" fill="none" aria-hidden="true">
        {/* Before: two mismatched swatches */}
        <circle cx="8"  cy="10" r="6" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
        <circle cx="8"  cy="22" r="4" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
        {/* Arrow */}
        <path d="M20 14h6M23 11l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
        {/* After: two matched swatches */}
        <circle cx="38" cy="10" r="5" stroke="var(--text-brand)" strokeWidth="1.5" />
        <circle cx="38" cy="22" r="5" stroke="var(--text-brand)" strokeWidth="1.5" />
        <line x1="34" y1="16" x2="42" y2="16" stroke="var(--text-brand)" strokeWidth="1" opacity="0.4" />
      </svg>
    ),
  },
  {
    question: "Does every new feature start from scratch because there is no shared component library?",
    icon: (
      <svg width="56" height="28" viewBox="0 0 56 28" fill="none" aria-hidden="true">
        {/* Before: three scattered rects */}
        <rect x="2"  y="2"  width="9" height="7"  rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
        <rect x="4"  y="12" width="7" height="6"  rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
        <rect x="1"  y="21" width="11" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
        {/* Arrow */}
        <path d="M20 14h6M23 11l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
        {/* After: aligned stack */}
        <rect x="32" y="4"  width="10" height="6" rx="1.5" stroke="var(--text-brand)" strokeWidth="1.5" />
        <rect x="32" y="12" width="10" height="6" rx="1.5" stroke="var(--text-brand)" strokeWidth="1.5" />
        <rect x="32" y="20" width="10" height="6" rx="1.5" stroke="var(--text-brand)" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    question: "Did dark mode or a rebrand just become a six-week fire drill?",
    icon: (
      <svg width="56" height="28" viewBox="0 0 56 28" fill="none" aria-hidden="true">
        {/* Before: broken toggle (X) */}
        <rect x="1" y="9" width="16" height="10" rx="5" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
        <circle cx="6.5" cy="14" r="3.5" fill="currentColor" opacity="0.25" />
        <line x1="4.5"  y1="12" x2="8.5" y2="16" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
        <line x1="8.5"  y1="12" x2="4.5" y2="16" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
        {/* Arrow */}
        <path d="M20 14h6M23 11l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
        {/* After: clean toggle (check) */}
        <rect x="32" y="9" width="16" height="10" rx="5" stroke="var(--text-brand)" strokeWidth="1.5" />
        <circle cx="42.5" cy="14" r="3.5" fill="var(--text-brand)" opacity="0.7" />
        <path d="M40.5 14l1.5 1.5 2.5-2.5" stroke="var(--text-brand)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    question: "Are you three platforms in and none of them look like the same product?",
    icon: (
      <svg width="56" height="28" viewBox="0 0 56 28" fill="none" aria-hidden="true">
        {/* Before: three mismatched screens */}
        <rect x="1"  y="5"  width="5" height="8"  rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
        <rect x="8"  y="2"  width="5" height="13" rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
        <rect x="15" y="8"  width="5" height="5"  rx="1" stroke="currentColor" strokeWidth="1.5" opacity="0.35" />
        {/* Arrow */}
        <path d="M24 14h5M26 11l3 3-3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
        {/* After: three aligned screens */}
        <rect x="33" y="5"  width="5" height="18" rx="1" stroke="var(--text-brand)" strokeWidth="1.5" />
        <rect x="40" y="5"  width="5" height="18" rx="1" stroke="var(--text-brand)" strokeWidth="1.5" />
        <rect x="47" y="5"  width="5" height="18" rx="1" stroke="var(--text-brand)" strokeWidth="1.5" />
      </svg>
    ),
  },
];

const HOW_I_WORK = [
  {
    step: "01",
    Icon: Search,
    title: "Audit",
    desc:  "Most teams have 400 hardcoded values when they need 40. We find the 20% causing 80% of the drift before touching a single component.",
  },
  {
    step: "02",
    Icon: Package,
    title: "Build",
    desc:  "Token architecture ships before components. Every component after that is just assembly, consistent by construction, not by convention.",
  },
  {
    step: "03",
    Icon: Users,
    title: "Embed",
    desc:  "We write documentation for the engineer searching at 11pm before a deadline, not the one reading it cover to cover. The system outlives the engagement.",
  },
];

export function DesignSystemsLandingPage() {
  useEffect(() => {
    document.title = "Design Systems for B2B SaaS — Eswar Creatives";
    document.documentElement.style.background = C.inverse;
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

  return (
    <div
      style={{
        minHeight:  "100vh",
        fontFamily: "var(--font-family-primary)",
        color:      C.text,
      }}
    >
      <Navbar />

      {/* ── 1. HERO (dark) ──────────────────────────────────────── */}
      <section style={{ background: C.inverse, paddingTop: "80px" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "72px 24px 80px" }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <p
              style={{
                ...overline,
                color:        C.gold,
                marginBottom: "16px",
              }}
            >
              Design Systems · Enterprise SaaS
            </p>

            <h1
              style={{
                fontFamily:    SERIF,
                fontWeight:    600,
                fontStyle:     "italic",
                fontSize:      "clamp(36px, 5.5vw, 52px)",
                lineHeight:    1.08,
                letterSpacing: "-0.02em",
                color:         C.textInv,
                maxWidth:      "720px",
                marginBottom:  "20px",
              }}
            >
              Stop rebuilding the same button.
            </h1>

            <p
              style={{
                fontSize:     "var(--typo-ol-body-size)",
                fontWeight:   "var(--typo-ol-body-weight)",
                lineHeight:   1.65,
                color:        C.textInvTert,
                maxWidth:     "580px",
                marginBottom: "12px",
              }}
            >
              Token-based design systems for B2B SaaS teams scaling past the point where fixing it later stops being an option. No full design systems team required.
            </p>

            <p
              style={{
                fontSize:     "var(--typo-p-sm-size)",
                fontWeight:   "var(--typo-p-sm-weight)",
                lineHeight:   1.6,
                color:        "rgba(255,255,255,0.38)",
                maxWidth:     "520px",
                marginBottom: "40px",
              }}
            >
              Built for Series A to C product teams, 30 to 200 employees, shipping across web, iOS, and Android.
            </p>

            {/* Before/After visual — replaces token swatch strip */}
            <div style={{ marginBottom: "40px" }}>
              <BeforeAfterVisual />
            </div>

            <PortfolioButton
              href="/services/design-systems"
              variant="primary"
              size="lg"
              style={{
                background:   C.gold,
                color:        C.text,
                borderColor:  C.gold,
                borderRadius: "12px",
                fontSize:     "var(--typo-ol-body-semi-size)",
                fontWeight:   "var(--typo-ol-body-semi-weight)",
              }}
            >
              See engagement options
              <ArrowRight className="w-4 h-4" />
            </PortfolioButton>
          </motion.div>
        </div>
      </section>

      {/* ── 2. PROOF BAR ────────────────────────────────────────── */}
      <section style={{ background: C.pageBg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "56px 24px" }}>
          {/* Hero stat: -32% promoted above row */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            style={{
              marginBottom: "40px",
              paddingBottom: "36px",
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <p
              style={{
                fontFamily:   SERIF,
                fontWeight:   700,
                fontSize:     "clamp(48px, 7vw, 72px)",
                lineHeight:   1,
                letterSpacing: "-0.03em",
                color:        C.text,
                marginBottom: "8px",
              }}
            >
              -32%
            </p>
            <p
              style={{
                fontSize:     "var(--typo-ol-body-size)",
                fontWeight:   600,
                color:        C.text,
                marginBottom: "6px",
              }}
            >
              Triage time at CYGNVS
            </p>
            <p
              style={{
                fontSize:   "var(--typo-p-sm-size)",
                fontWeight: "var(--typo-p-sm-weight)",
                lineHeight: "var(--typo-p-sm-line-height)",
                color:      C.textMuted,
                maxWidth:   "480px",
              }}
            >
              Analysts stopped relearning the interface every time they switched surfaces.
            </p>
          </motion.div>

          {/* Supporting 4-stat row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {PROOF_STATS.map(({ value, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.07 }}
              >
                <p
                  style={{
                    fontFamily:   SERIF,
                    fontWeight:   700,
                    fontSize:     "24px",
                    lineHeight:   1.1,
                    color:        C.text,
                    marginBottom: "4px",
                  }}
                >
                  {value}
                </p>
                <p
                  style={{
                    fontSize:   "var(--typo-p-sm-size)",
                    fontWeight: "var(--typo-p-sm-weight)",
                    lineHeight: "var(--typo-p-sm-line-height)",
                    color:      C.textMuted,
                  }}
                >
                  {label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. ICP HOOK QUESTIONS ───────────────────────────────── */}
      <section style={{ background: C.pageBg, padding: "80px 0" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {ICP_QUESTIONS.map(({ question, icon }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.07 }}
                style={{
                  background:   C.surface,
                  border:       `1px solid ${C.border}`,
                  borderRadius: "16px",
                  boxShadow:    CARD_SHADOW,
                  padding:      "28px",
                  display:      "flex",
                  flexDirection: "column",
                  gap:          "16px",
                }}
              >
                <div style={{ color: C.textMuted }}>{icon}</div>
                <p
                  style={{
                    fontSize:   "var(--typo-ol-body-size)",
                    fontWeight: 600,
                    lineHeight: 1.5,
                    color:      C.text,
                  }}
                >
                  {question}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. HOW I WORK ───────────────────────────────────────── */}
      <section
        style={{
          background: C.surface,
          borderTop:  `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
          padding:    "80px 0",
        }}
      >
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <p style={{ ...overline, marginBottom: "12px" }}>How I work</p>
            <h2
              style={{
                fontFamily:    SERIF,
                fontWeight:    600,
                fontSize:      "clamp(24px, 3vw, 34px)",
                lineHeight:    1.2,
                letterSpacing: "-0.02em",
                color:         C.text,
                marginBottom:  "48px",
                maxWidth:      "480px",
              }}
            >
              Three phases. Clear deliverables at each step.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_I_WORK.map(({ step, Icon, title, desc }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <p
                  style={{
                    fontFamily:    SERIF,
                    fontWeight:    700,
                    fontSize:      "40px",
                    lineHeight:    1,
                    color:         C.border,
                    marginBottom:  "16px",
                  }}
                >
                  {step}
                </p>
                <div
                  style={{
                    display:        "flex",
                    alignItems:     "center",
                    gap:            "10px",
                    marginBottom:   "12px",
                  }}
                >
                  <Icon style={{ width: "18px", height: "18px", color: C.teal }} />
                  <p
                    style={{
                      fontFamily:  SERIF,
                      fontWeight:  600,
                      fontSize:    "18px",
                      lineHeight:  1.2,
                      color:       C.text,
                    }}
                  >
                    {title}
                  </p>
                </div>
                <p
                  style={{
                    fontSize:   "var(--typo-p-sm-size)",
                    fontWeight: "var(--typo-p-sm-weight)",
                    lineHeight: "var(--typo-p-sm-line-height)",
                    color:      C.textSec,
                  }}
                >
                  {desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. FLAGSHIP PROOF ───────────────────────────────────── */}
      <section style={{ background: C.pageBg, padding: "80px 0" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <p style={{ ...overline, marginBottom: "32px" }}>Flagship work</p>
            <div
              style={{
                background:   C.surface,
                border:       `1px solid ${C.border}`,
                borderLeft:   `4px solid ${C.tealHex}`,
                borderRadius: "16px",
                boxShadow:    CARD_SHADOW,
                padding:      "40px 48px",
                maxWidth:     "800px",
              }}
            >
              {/* TODO: replace placeholder with actual HEX Portal palette screenshot (200x120px) */}
              <div
                style={{
                  width:        "200px",
                  height:       "120px",
                  borderRadius: "8px",
                  border:       `1px solid ${C.border}`,
                  marginBottom: "20px",
                  overflow:     "hidden",
                  display:      "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gridTemplateRows:    "repeat(3, 1fr)",
                  gap:          "2px",
                  padding:      "8px",
                  background:   C.pageBg,
                }}
                aria-hidden="true"
              >
                {[C.tealHex, C.gold, "#FFFFFF", C.border, C.textMuted,
                  C.tealHex, C.gold, C.pageBg, C.textMuted, "#FFFFFF",
                  C.border, C.tealHex, C.gold, C.border, C.textMuted].map((col, i) => (
                  <span
                    key={i}
                    style={{ borderRadius: "50%", background: col, display: "block" }}
                  />
                ))}
              </div>

              <p
                style={{
                  fontSize:      "14px",
                  fontWeight:    700,
                  letterSpacing: "var(--typo-ol-overline-bold-letter-spacing)",
                  textTransform: "uppercase" as const,
                  color:         C.gold,
                  marginBottom:  "16px",
                }}
              >
                CYGNVS
              </p>
              <p
                style={{
                  fontFamily:    SERIF,
                  fontWeight:    600,
                  fontStyle:     "italic",
                  fontSize:      "clamp(18px, 2vw, 22px)",
                  lineHeight:    1.4,
                  color:         C.text,
                  marginBottom:  "16px",
                }}
              >
                60+ components, 180+ semantic tokens, shipped across Web, iOS, and Android at CYGNVS. 32% reduction in triage time. +18% analyst satisfaction.
              </p>
              <p
                style={{
                  fontSize:     "var(--typo-p-sm-size)",
                  fontWeight:   "var(--typo-p-sm-weight)",
                  lineHeight:   "var(--typo-p-sm-line-height)",
                  color:        C.textMuted,
                  marginBottom: "24px",
                }}
              >
                Token architecture, component library, cross-platform theming, and full governance documentation delivered across a 14-week engagement.
              </p>
              <a
                href="/work/securevault"
                style={{
                  fontSize:       "var(--typo-ol-body-size)",
                  fontWeight:     "var(--typo-ol-body-semi-weight)",
                  color:          C.teal,
                  textDecoration: "none",
                  display:        "inline-flex",
                  alignItems:     "center",
                  gap:            "6px",
                }}
              >
                Read the case study
                <ArrowRight style={{ width: "14px", height: "14px" }} />
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 6. UX AUDIT WEDGE ──────────────────────────────────── */}
      <section style={{ background: C.pageBg, padding: "80px 0" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center" }}
          >
            <p style={{ ...overline, marginBottom: "12px" }}>Start smaller</p>

            <h2
              style={{
                fontFamily:    SERIF,
                fontWeight:    600,
                fontSize:      "28px",
                lineHeight:    1.25,
                letterSpacing: "-0.02em",
                color:         C.text,
                marginBottom:  "16px",
              }}
            >
              Start with a UX Audit.
            </h2>

            <p
              style={{
                fontSize:      "var(--typo-ol-body-size)",
                fontWeight:    "var(--typo-ol-body-weight)",
                lineHeight:    1.65,
                letterSpacing: "var(--typo-ol-body-letter-spacing)",
                color:         C.textSec,
                marginBottom:  "32px",
              }}
            >
              A 5-day teardown of one core flow. Prioritised findings, before/after direction,
              and a conversion-focused action plan. Fixed fee: $750. Credited in full toward
              any follow-on design systems engagement.
            </p>

            <div
              style={{
                background:    C.surface,
                border:        `1px solid ${C.border}`,
                borderRadius:  "16px",
                boxShadow:     CARD_SHADOW,
                padding:       "32px",
                marginBottom:  "28px",
                textAlign:     "left",
              }}
            >
              {[
                "5 business days. One flow. Every friction point mapped.",
                "Before/after direction for the top 3 issues.",
                "30-min walkthrough call on delivery.",
              ].map((row, i, arr) => (
                <div
                  key={i}
                  style={{
                    display:       "flex",
                    alignItems:    "flex-start",
                    gap:           "12px",
                    marginBottom:  i < arr.length - 1 ? "16px" : "0",
                  }}
                >
                  <span
                    style={{
                      width:           "20px",
                      height:          "20px",
                      borderRadius:    "50%",
                      background:      C.pageBg,
                      border:          `1px solid ${C.border}`,
                      display:         "flex",
                      alignItems:      "center",
                      justifyContent:  "center",
                      flexShrink:      0,
                      marginTop:       "1px",
                    }}
                  >
                    <Check style={{ width: "11px", height: "11px", color: C.teal }} strokeWidth={3} />
                  </span>
                  <p
                    style={{
                      fontSize:   "var(--typo-p-sm-size)",
                      fontWeight: "var(--typo-p-sm-weight)",
                      lineHeight: "var(--typo-p-sm-line-height)",
                      color:      C.text,
                    }}
                  >
                    {row}
                  </p>
                </div>
              ))}
            </div>

            <a
              href="mailto:eswar@eswarcreatives.in?subject=UX Audit Enquiry"
              style={{
                display:        "inline-flex",
                alignItems:     "center",
                gap:            "6px",
                background:     C.inverse,
                color:          C.textInv,
                borderRadius:   "8px",
                padding:        "10px 20px",
                fontSize:       "var(--typo-p-sm-size)",
                fontWeight:     "var(--typo-p-sm-weight)",
                fontFamily:     "var(--font-family-primary)",
                textDecoration: "none",
              }}
            >
              Book a UX Audit →
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── 7. CTA STRIP (teal) ─────────────────────────────────── */}
      <section style={{ background: C.tealHex, padding: "80px 0" }}>
        <div
          style={{
            maxWidth:  "1152px",
            margin:    "0 auto",
            padding:   "0 24px",
            textAlign: "center",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <h2
              style={{
                fontFamily:    SERIF,
                fontWeight:    600,
                fontStyle:     "italic",
                fontSize:      "clamp(28px, 3.5vw, 34px)",
                lineHeight:    1.2,
                letterSpacing: "-0.02em",
                color:         C.textInv,
                marginBottom:  "12px",
              }}
            >
              Let's scope your system.
            </h2>
            <p
              style={{
                fontSize:     "var(--typo-ol-body-size)",
                lineHeight:   1.65,
                color:        "rgba(255,255,255,0.7)",
                marginBottom: "36px",
                maxWidth:     "480px",
                margin:       "0 auto 36px",
              }}
            >
              Three engagement tiers. Fixed scope. Delivered in weeks, not quarters.
            </p>
            <PortfolioButton
              href="/services/design-systems"
              variant="primary"
              size="lg"
              style={{
                background:   C.textInv,
                color:        C.tealHex,
                borderColor:  C.textInv,
                borderRadius: "8px",
                fontSize:     "var(--typo-p-sm-size)",
                fontWeight:   "var(--typo-ol-body-semi-weight)",
              }}
            >
              See pricing and start a project
              <ArrowRight className="w-4 h-4" />
            </PortfolioButton>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
