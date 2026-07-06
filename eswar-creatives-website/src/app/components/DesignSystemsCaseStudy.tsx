import { useState, useEffect } from "react";
import { ArrowRight, ChevronDown, Lock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Navbar } from "./Navbar";
import { PortfolioButton } from "./ui/portfolio-button";

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
  textInvTert: "var(--text-inverse-tertiary)",
} as const;

const SERIF      = "'Fraunces', Georgia, 'Times New Roman', serif";
const MONO       = "'SF Mono', 'Fira Code', ui-monospace, monospace";
const CARD_SHADOW = "0px 4px 6px -1px rgba(2,4,4,0.07)";

const overline = {
  fontSize:      "var(--typo-ol-overline-bold-size)",
  fontWeight:    "var(--typo-ol-overline-bold-weight)",
  lineHeight:    "var(--typo-ol-overline-bold-line-height)",
  letterSpacing: "var(--typo-ol-overline-bold-letter-spacing)",
  textTransform: "uppercase" as const,
  color:         C.textMuted,
};

const STATS = [
  { value: "60+",  label: "Components" },
  { value: "180+", label: "Semantic tokens" },
  { value: "3",    label: "Platforms (Web, iOS, Android)" },
  { value: "-32%", label: "Triage time" },
  { value: "+18%", label: "Analyst satisfaction" },
];

const META = [
  { label: "Role",      value: "Design Systems Lead" },
  { label: "Duration",  value: "14 weeks" },
  { label: "Platforms", value: "Web, iOS, Android" },
  { label: "Scope",     value: "Token architecture, component library, governance" },
];

export function DesignSystemsCaseStudy() {
  const [outcomeOpen, setOutcomeOpen] = useState(false);

  useEffect(() => {
    document.title = "CYGNVS Design System Case Study — Eswar Creatives";
    document.documentElement.style.background = C.inverse;
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", fontFamily: "var(--font-family-primary)", color: C.text }}>
      <Navbar />

      {/* ── 1. HEADER STRIP ─────────────────────────────────────── */}
      <section style={{ background: C.inverse, paddingTop: "80px" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "64px 24px 72px" }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Breadcrumb */}
            <p
              style={{
                fontSize:      "var(--typo-p-sm-size)",
                color:         "rgba(255,255,255,0.35)",
                marginBottom:  "20px",
                fontFamily:    MONO,
                letterSpacing: "0.02em",
              }}
            >
              Design Systems{" "}
              <span style={{ opacity: 0.5 }}>{">"}</span>{" "}
              Case Study
            </p>

            {/* Eyebrow */}
            <p
              style={{
                ...overline,
                color:        C.gold,
                marginBottom: "16px",
              }}
            >
              Design Systems · Enterprise SaaS · Cybersecurity
            </p>

            {/* Headline */}
            <h1
              style={{
                fontFamily:    SERIF,
                fontWeight:    600,
                fontStyle:     "italic",
                fontSize:      "clamp(32px, 5vw, 52px)",
                lineHeight:    1.08,
                letterSpacing: "-0.02em",
                color:         C.textInv,
                maxWidth:      "800px",
                marginBottom:  "20px",
              }}
            >
              One design system. Three platforms. 32% faster triage.
            </h1>

            {/* Sub-line */}
            <p
              style={{
                fontSize:     "var(--typo-ol-body-size)",
                fontWeight:   "var(--typo-ol-body-weight)",
                lineHeight:   1.65,
                color:        C.textInvTert,
                maxWidth:     "640px",
                marginBottom: "48px",
              }}
            >
              Built and shipped the token architecture and component library for CYGNVS, a
              high-stakes cybersecurity SaaS platform, replacing fragmented UI across web, iOS,
              and Android with a single source of truth. No full design systems team required.
            </p>

            {/* Meta row */}
            <div
              style={{
                display:       "flex",
                flexWrap:      "wrap",
                gap:           "0",
                borderTop:     "1px solid rgba(255,255,255,0.1)",
                borderBottom:  "1px solid rgba(255,255,255,0.1)",
                paddingTop:    "20px",
                paddingBottom: "20px",
              }}
            >
              {META.map(({ label, value }) => (
                <div
                  key={label}
                  style={{
                    flex:        "1 1 180px",
                    paddingRight: "24px",
                    marginBottom: "12px",
                  }}
                >
                  <p
                    style={{
                      fontSize:      "10px",
                      fontWeight:    600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color:         "rgba(255,255,255,0.35)",
                      marginBottom:  "4px",
                    }}
                  >
                    {label}
                  </p>
                  <p
                    style={{
                      fontSize:   "var(--typo-p-sm-size)",
                      fontWeight: "var(--typo-p-sm-weight)",
                      lineHeight: "var(--typo-p-sm-line-height)",
                      color:      "rgba(255,255,255,0.7)",
                    }}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 2. STAT BAR ─────────────────────────────────────────── */}
      <section style={{ background: C.pageBg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "48px 24px" }}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {STATS.map(({ value, label }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
              >
                <p
                  style={{
                    fontFamily:   MONO,
                    fontWeight:   700,
                    fontSize:     "28px",
                    lineHeight:   1.1,
                    color:        C.text,
                    marginBottom: "5px",
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

      {/* ── 3. PROBLEM ──────────────────────────────────────────── */}
      <section style={{ background: C.pageBg, padding: "80px 0" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            style={{ maxWidth: "720px" }}
          >
            <p style={{ ...overline, marginBottom: "12px" }}>The problem</p>

            <p
              style={{
                fontSize:     "var(--typo-ol-body-size)",
                fontWeight:   "var(--typo-ol-body-weight)",
                lineHeight:   1.7,
                color:        C.textSec,
                marginBottom: "20px",
              }}
            >
              Security analysts were switching between web, iOS, and Android views of the same
              platform, and every switch meant relearning the interface. Buttons, alerts, and
              status indicators looked and behaved differently depending on which surface they hit.
            </p>

            <p
              style={{
                fontSize:     "var(--typo-ol-body-size)",
                fontWeight:   "var(--typo-ol-body-weight)",
                lineHeight:   1.7,
                color:        C.textSec,
                marginBottom: "32px",
              }}
            >
              Engineering was building the same components three times, once per platform, with no
              shared token layer. Every rebrand, dark mode request, or accessibility fix became a
              manual, error-prone sweep across three codebases.
            </p>

            {/* Callout */}
            <div
              style={{
                background:   C.surface,
                border:       `1px solid ${C.border}`,
                borderLeft:   `4px solid ${C.tealHex}`,
                borderRadius: "12px",
                padding:      "24px 28px",
                boxShadow:    CARD_SHADOW,
              }}
            >
              <p
                style={{
                  fontSize:   "var(--typo-ol-body-size)",
                  fontWeight: 600,
                  lineHeight: 1.6,
                  color:      C.text,
                }}
              >
                If your team is shipping the same button three different ways across your product,
                this is the exact problem we solved.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 4. ARCHITECTURE ─────────────────────────────────────── */}
      <section
        style={{
          background:   C.surface,
          borderTop:    `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
          padding:      "80px 0",
        }}
      >
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            style={{ marginBottom: "56px" }}
          >
            <p style={{ ...overline, marginBottom: "12px" }}>Architecture</p>
            <h2
              style={{
                fontFamily:    SERIF,
                fontWeight:    600,
                fontSize:      "clamp(22px, 3vw, 32px)",
                lineHeight:    1.2,
                letterSpacing: "-0.02em",
                color:         C.text,
                maxWidth:      "560px",
              }}
            >
              Token-first. Single source of truth.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Visual 1: three-tier token hierarchy */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
            >
              <div
                style={{
                  background:   C.pageBg,
                  border:       `1px solid ${C.border}`,
                  borderRadius: "16px",
                  padding:      "32px",
                  marginBottom: "16px",
                  display:      "flex",
                  flexDirection: "column",
                  gap:          "8px",
                }}
                aria-label="Three-tier token architecture diagram"
              >
                {[
                  { label: "Foundation", sub: "Raw hex, spacing, type scale", accent: C.border },
                  { label: "Semantic",   sub: "--text-primary, --surface-hover", accent: C.tealHex },
                  { label: "Component",  sub: "Scoped overrides per platform", accent: C.gold },
                ].map(({ label, sub, accent }, i) => (
                  <div
                    key={label}
                    style={{
                      background:   C.surface,
                      border:       `1px solid ${C.border}`,
                      borderLeft:   `3px solid ${accent}`,
                      borderRadius: "8px",
                      padding:      "14px 18px",
                    }}
                  >
                    <p
                      style={{
                        fontSize:   "var(--typo-p-sm-size)",
                        fontWeight: 600,
                        color:      C.text,
                        marginBottom: "2px",
                      }}
                    >
                      {label}
                    </p>
                    <p
                      style={{
                        fontFamily: MONO,
                        fontSize:   "11px",
                        color:      C.textMuted,
                      }}
                    >
                      {sub}
                    </p>
                    {i < 2 && (
                      <div
                        style={{
                          width:   "1px",
                          height:  "12px",
                          background: C.border,
                          margin:  "8px 0 -22px 12px",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <p
                style={{
                  fontSize:   "var(--typo-p-sm-size)",
                  fontWeight: "var(--typo-p-sm-weight)",
                  lineHeight: "var(--typo-p-sm-line-height)",
                  color:      C.textMuted,
                }}
              >
                Every color, spacing value, and interaction state traces back through three layers:
                raw hex primitives, semantic aliases, and component-bound tokens. Change one
                primitive and it propagates correctly across all three platforms, without touching
                a single component file.
              </p>
            </motion.div>

            {/* Visual 2: token family grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div
                style={{
                  background:   C.pageBg,
                  border:       `1px solid ${C.border}`,
                  borderRadius: "16px",
                  padding:      "32px",
                  marginBottom: "16px",
                }}
                aria-label="Token family overview"
              >
                <div
                  style={{
                    display:             "grid",
                    gridTemplateColumns: "repeat(11, 1fr)",
                    gap:                 "6px",
                    marginBottom:        "20px",
                  }}
                >
                  {Array.from({ length: 11 }, (_, col) =>
                    Array.from({ length: 9 }, (_, row) => {
                      const opacity = 0.15 + (row / 8) * 0.85;
                      return (
                        <div
                          key={`${col}-${row}`}
                          style={{
                            height:       "16px",
                            borderRadius: "3px",
                            background:   col === 0
                              ? `rgba(0,120,114,${opacity})`
                              : col === 1
                              ? `rgba(213,176,103,${opacity})`
                              : col === 2
                              ? `rgba(220,38,38,${opacity})`
                              : `rgba(107,114,128,${opacity})`,
                          }}
                        />
                      );
                    })
                  )}
                </div>
                <p
                  style={{
                    fontFamily: MONO,
                    fontSize:   "11px",
                    color:      C.textMuted,
                  }}
                >
                  220 tokens across 11 families
                </p>
              </div>
              <p
                style={{
                  fontSize:   "var(--typo-p-sm-size)",
                  fontWeight: "var(--typo-p-sm-weight)",
                  lineHeight: "var(--typo-p-sm-line-height)",
                  color:      C.textMuted,
                }}
              >
                220 design tokens across 11 color families. WCAG AA compliant by construction,
                not retrofitted after launch.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 5. DELIVERY ─────────────────────────────────────────── */}
      <section style={{ background: C.pageBg, padding: "80px 0" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            style={{ marginBottom: "56px" }}
          >
            <p style={{ ...overline, marginBottom: "12px" }}>Delivery</p>
            <h2
              style={{
                fontFamily:    SERIF,
                fontWeight:    600,
                fontSize:      "clamp(22px, 3vw, 32px)",
                lineHeight:    1.2,
                letterSpacing: "-0.02em",
                color:         C.text,
                maxWidth:      "440px",
              }}
            >
              Three phases. Fourteen weeks.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              {
                step:  "01",
                title: "Audit",
                weeks: "Weeks 1-3",
                body:  "Mapped every hardcoded value and inconsistent pattern across the existing web, iOS, and Android codebase. Surfaced exactly where design and engineering had drifted, and what it would cost to leave it unresolved.",
              },
              {
                step:  "02",
                title: "Build",
                weeks: "Weeks 4-10",
                body:  "Designed the three-tier token architecture first, components second. Web, iOS, and Android were built in parallel so no platform fell behind. 60+ components shipped with full variant coverage, interaction states, and documentation.",
              },
              {
                step:  "03",
                title: "Embed",
                weeks: "Weeks 11-14",
                body:  "Handed off a governance model, versioning strategy, and component documentation structured for the engineer searching at 11pm before a deadline, not the team reading it cover to cover. The system outlived the engagement.",
              },
            ].map(({ step, title, weeks, body }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <p
                  style={{
                    fontFamily:   SERIF,
                    fontWeight:   700,
                    fontSize:     "40px",
                    lineHeight:   1,
                    color:        C.border,
                    marginBottom: "12px",
                  }}
                >
                  {step}
                </p>
                <p
                  style={{
                    fontFamily:   SERIF,
                    fontWeight:   600,
                    fontSize:     "18px",
                    lineHeight:   1.2,
                    color:        C.text,
                    marginBottom: "4px",
                  }}
                >
                  {title}
                </p>
                <p
                  style={{
                    fontFamily:    MONO,
                    fontSize:      "11px",
                    fontWeight:    600,
                    letterSpacing: "0.04em",
                    color:         C.teal,
                    marginBottom:  "14px",
                  }}
                >
                  {weeks}
                </p>
                <p
                  style={{
                    fontSize:   "var(--typo-p-sm-size)",
                    fontWeight: "var(--typo-p-sm-weight)",
                    lineHeight: "var(--typo-p-sm-line-height)",
                    color:      C.textSec,
                  }}
                >
                  {body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. OUTCOME ──────────────────────────────────────────── */}
      <section
        style={{
          background:   C.surface,
          borderTop:    `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
          padding:      "80px 0",
        }}
      >
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            style={{ maxWidth: "720px" }}
          >
            <p style={{ ...overline, marginBottom: "12px" }}>Outcome</p>

            {/* Primary outcome */}
            <p
              style={{
                fontSize:     "var(--typo-ol-body-size)",
                fontWeight:   "var(--typo-ol-body-weight)",
                lineHeight:   1.7,
                color:        C.textSec,
                marginBottom: "28px",
              }}
            >
              Triage time dropped 32%. The design system made it possible to ship an AI grouping
              banner — "12 alerts grouped into 1 incident" — that let analysts work at the incident
              level instead of chasing individual alerts. That single interaction pattern changed
              how the entire SOC floor operated.
            </p>

            {/* Expandable accordion */}
            <div
              style={{
                background:   C.pageBg,
                border:       `1px solid ${C.border}`,
                borderRadius: "12px",
                marginBottom: "28px",
                overflow:     "hidden",
              }}
            >
              <button
                onClick={() => setOutcomeOpen((v) => !v)}
                style={{
                  width:          "100%",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "space-between",
                  padding:        "18px 24px",
                  background:     "transparent",
                  border:         "none",
                  cursor:         "pointer",
                  textAlign:      "left",
                  gap:            "12px",
                }}
                aria-expanded={outcomeOpen}
              >
                <span
                  style={{
                    fontSize:   "var(--typo-p-sm-size)",
                    fontWeight: 600,
                    color:      C.teal,
                  }}
                >
                  How the design system made this possible
                </span>
                <ChevronDown
                  style={{
                    width:      "16px",
                    height:     "16px",
                    color:      C.teal,
                    flexShrink: 0,
                    transform:  outcomeOpen ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                />
              </button>

              <AnimatePresence initial={false}>
                {outcomeOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <div
                      style={{
                        padding:   "0 24px 24px",
                        borderTop: `1px solid ${C.border}`,
                        paddingTop: "20px",
                      }}
                    >
                      <p
                        style={{
                          fontSize:     "var(--typo-p-sm-size)",
                          fontWeight:   "var(--typo-p-sm-weight)",
                          lineHeight:   "var(--typo-p-sm-line-height)",
                          color:        C.textSec,
                          marginBottom: "16px",
                        }}
                      >
                        Three things compounded to make it work. Consistent UI across web and
                        mobile eliminated the relearning cost every time analysts switched surfaces
                        mid-incident. Consistent button placement and action patterns reduced
                        clicks-to-action on high-pressure triage flows. And consistent alert and
                        status components gave the AI grouping pattern a reliable visual foundation
                        across all three platforms.
                      </p>
                      <p
                        style={{
                          fontSize:   "var(--typo-p-sm-size)",
                          fontWeight: "var(--typo-p-sm-weight)",
                          lineHeight: "var(--typo-p-sm-line-height)",
                          color:      C.textSec,
                        }}
                      >
                        Remove any one of those and the grouping banner lands differently on each
                        surface, which defeats the purpose of grouping in the first place.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Always-visible below disclosure */}
            <p
              style={{
                fontSize:     "var(--typo-ol-body-size)",
                fontWeight:   "var(--typo-ol-body-weight)",
                lineHeight:   1.7,
                color:        C.textSec,
                marginBottom: "24px",
              }}
            >
              The 18% increase in analyst satisfaction reflected daily friction removed: fewer
              support queries about inconsistent UI, faster onboarding for new analysts, and a
              product that finally felt like one system instead of three bolted together.
            </p>

            {/* Final line */}
            <p
              style={{
                fontFamily:   SERIF,
                fontWeight:   600,
                fontStyle:    "italic",
                fontSize:     "clamp(18px, 2vw, 22px)",
                lineHeight:   1.4,
                color:        C.text,
                borderTop:    `1px solid ${C.border}`,
                paddingTop:   "24px",
              }}
            >
              A $3.25M ARR platform, shipped consistently across three platforms, governed to
              scale without the original designer in the room.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── 7. PROOF FOOTER ─────────────────────────────────────── */}
      <section style={{ background: C.pageBg, padding: "64px 0" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            style={{
              background:   C.surface,
              border:       `1px solid ${C.border}`,
              borderRadius: "16px",
              padding:      "36px 40px",
              maxWidth:     "680px",
              display:      "flex",
              gap:          "20px",
              alignItems:   "flex-start",
              boxShadow:    CARD_SHADOW,
            }}
          >
            <Lock
              style={{ width: "18px", height: "18px", color: C.textMuted, flexShrink: 0, marginTop: "3px" }}
            />
            <div>
              <p
                style={{
                  fontSize:      "11px",
                  fontWeight:    600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color:         C.textMuted,
                  marginBottom:  "10px",
                }}
              >
                About this work
              </p>
              <p
                style={{
                  fontSize:     "var(--typo-p-sm-size)",
                  fontWeight:   "var(--typo-p-sm-weight)",
                  lineHeight:   "var(--typo-p-sm-line-height)",
                  color:        C.textSec,
                  marginBottom: "12px",
                }}
              >
                Original interface details are NDA-protected. Token architecture, methodology,
                and outcomes reflect the actual engagement.
              </p>
              <p
                style={{
                  fontSize:   "var(--typo-p-sm-size)",
                  fontWeight: "var(--typo-p-sm-weight)",
                  lineHeight: "var(--typo-p-sm-line-height)",
                  color:      C.textMuted,
                }}
              >
                HFI-CUA certified. 15+ years in enterprise SaaS and cybersecurity product design.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 8. CTA BAND ─────────────────────────────────────────── */}
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
                fontSize:      "clamp(28px, 3.5vw, 38px)",
                lineHeight:    1.15,
                letterSpacing: "-0.02em",
                color:         "var(--text-inverse)",
                marginBottom:  "12px",
              }}
            >
              Have a similar problem?
            </h2>
            <p
              style={{
                fontSize:     "var(--typo-ol-body-size)",
                lineHeight:   1.65,
                color:        "rgba(255,255,255,0.65)",
                maxWidth:     "480px",
                margin:       "0 auto 36px",
              }}
            >
              Three engagement tiers. Fixed scope. Delivered in weeks, not quarters.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <PortfolioButton
                href="https://calendly.com/eswarcreatives/25-min-intro-call"
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
                size="lg"
                style={{
                  background:   C.gold,
                  color:        C.text,
                  borderColor:  C.gold,
                  borderRadius: "12px",
                  fontFamily:   SERIF,
                  fontSize:     "var(--typo-ol-body-semi-size)",
                  fontWeight:   "var(--typo-ol-body-semi-weight)",
                }}
              >
                Book a 30-min intro
                <ArrowRight className="w-4 h-4" />
              </PortfolioButton>
              <PortfolioButton
                href="/services/design-systems"
                variant="outline"
                size="lg"
                style={{
                  background:   "transparent",
                  color:        "rgba(255,255,255,0.85)",
                  borderColor:  "rgba(255,255,255,0.3)",
                  borderRadius: "12px",
                  fontSize:     "var(--typo-ol-body-semi-size)",
                  fontWeight:   "var(--typo-ol-body-semi-weight)",
                }}
              >
                See pricing and start a project
              </PortfolioButton>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
