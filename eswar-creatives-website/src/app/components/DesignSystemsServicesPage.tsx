import { useEffect } from "react";
import { ArrowRight, Check } from "lucide-react";
import { motion } from "motion/react";
import { Navbar } from "./Navbar";
import { PortfolioButton } from "./ui/portfolio-button";
import { useService, formatStartingPrice, type ServiceTier } from "../../lib/catalog";
import { BeforeAfterVisual } from "./ui/BeforeAfterVisual";

const PAGE_BG = "#FAF8F4";
const GOLD    = "#D5B067";
const BORDER  = "#E5E5E4";
const SERIF   = "'Fraunces', Georgia, 'Times New Roman', serif";
const MONO    = "'SF Mono', 'Fira Code', ui-monospace, monospace";

export function DesignSystemsServicesPage() {
  const state = useService("saas_design");

  useEffect(() => {
    document.title = "Design Systems — Eswar Creatives";
    document.documentElement.style.background = PAGE_BG;
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: PAGE_BG, fontFamily: "var(--font-family-primary)", color: "var(--text-primary)" }}
    >
      <Navbar />

      {/* ── HERO ── */}
      <header className="pt-20 md:pt-24">
        <div
          className="max-w-6xl mx-auto px-6 pt-14 md:pt-20 pb-14 md:pb-16"
          style={{ borderBottom: `1px solid ${BORDER}` }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <p
              className="mb-3"
              style={{
                fontSize: "var(--typo-ol-overline-bold-size)",
                fontWeight: "var(--typo-ol-overline-bold-weight)",
                lineHeight: "var(--typo-ol-overline-bold-line-height)",
                letterSpacing: "var(--typo-ol-overline-bold-letter-spacing)",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              }}
            >
              Design Systems
            </p>

            <h1
              className="mb-6"
              style={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontStyle: "italic",
                fontSize: "clamp(34px, 5vw, 56px)",
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
                maxWidth: "820px",
              }}
            >
              Tokens, components, governance —{" "}
              <span style={{ color: "var(--text-brand)", fontStyle: "normal" }}>
                built to outlast a rewrite.
              </span>
            </h1>

            <p
              className="mb-9"
              style={{
                fontSize: "var(--typo-ol-body-size)",
                fontWeight: "var(--typo-ol-body-weight)",
                lineHeight: 1.6,
                letterSpacing: "var(--typo-ol-body-letter-spacing)",
                color: "var(--text-secondary)",
                maxWidth: "640px",
              }}
            >
              {state.status === "ready" && state.service.description
                ? state.service.description
                : "Design systems for SaaS teams that need to scale — tokens, components, governance, and the documentation to keep it all from drifting."}
            </p>

            {/* Before/after visual — replaces token swatch strip */}
            <div className="mb-9">
              <BeforeAfterVisual />
            </div>

            <div className="flex flex-wrap gap-3">
              <PortfolioButton
                href="/services/design-systems/enquiry"
                variant="primary"
                size="lg"
                style={{
                  background: "var(--surface-inverse)",
                  color: "var(--text-inverse)",
                  borderColor: "var(--surface-inverse)",
                  borderRadius: "8px",
                  fontSize: "var(--typo-p-sm-size)",
                }}
              >
                Start a project
                <ArrowRight className="w-4 h-4" />
              </PortfolioButton>
            </div>
          </motion.div>
        </div>
      </header>

      {/* ── PRICING TIERS ── */}
      <section className="py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-12 md:mb-16 max-w-2xl">
            <p
              className="mb-3"
              style={{
                fontSize: "var(--typo-ol-overline-bold-size)",
                fontWeight: "var(--typo-ol-overline-bold-weight)",
                lineHeight: "var(--typo-ol-overline-bold-line-height)",
                letterSpacing: "var(--typo-ol-overline-bold-letter-spacing)",
                textTransform: "uppercase",
                color: "var(--text-tertiary)",
              }}
            >
              Pricing tiers
            </p>
            <h2
              style={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "clamp(28px, 3.5vw, 40px)",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
              }}
            >
              Three engagements. Pick where your team needs the most leverage.
            </h2>
          </div>

          {state.status === "loading" && (
            <p style={{ fontSize: "var(--typo-ol-body-size)", color: "var(--text-tertiary)" }}>
              Loading pricing…
            </p>
          )}
          {state.status === "error" && (
            <p style={{ fontSize: "var(--typo-ol-body-size)", color: "var(--text-secondary)" }}>
              Couldn't load pricing right now. Please try again, or{" "}
              <a href="mailto:eswar@eswarcreatives.in" style={{ color: "var(--text-brand)" }}>
                email us directly
              </a>
              .
            </p>
          )}
          {state.status === "empty" && (
            <p style={{ fontSize: "var(--typo-ol-body-size)", color: "var(--text-tertiary)" }}>
              Pricing tiers haven't been published yet.
            </p>
          )}

          {state.status === "ready" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-7">
              {state.service.tiers.map((tier, i) => (
                <DesignSystemsTierCard key={tier.id} tier={tier} delay={i * 0.08} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── SOCIAL STRIP ── */}
      <div
        style={{
          borderTop:  `1px solid ${BORDER}`,
          borderBottom: `1px solid ${BORDER}`,
          padding:    "20px 0",
          background: "var(--card)",
        }}
      >
        <div
          className="max-w-6xl mx-auto px-6"
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "20px" }}
        >
          <a
            href="https://www.linkedin.com/in/eswar-maheswaran"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display:        "inline-flex",
              alignItems:     "center",
              gap:            "7px",
              fontSize:       "var(--typo-p-sm-size)",
              color:          "var(--text-tertiary)",
              textDecoration: "none",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            Find me on LinkedIn
          </a>
          <span style={{ color: BORDER, userSelect: "none" }}>·</span>
          <a
            href="mailto:eswar@eswarcreatives.in"
            style={{
              fontSize:       "var(--typo-p-sm-size)",
              color:          "var(--text-tertiary)",
              textDecoration: "none",
            }}
          >
            eswar@eswarcreatives.in
          </a>
        </div>
      </div>

      {/* ── FOOTER CTA — B3 ── */}
      <div
        className="py-24 md:py-32"
        style={{ background: "#007872" }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <p
              className="mb-4"
              style={{
                fontSize:      "var(--typo-ol-overline-bold-size)",
                fontWeight:    "var(--typo-ol-overline-bold-weight)",
                letterSpacing: "var(--typo-ol-overline-bold-letter-spacing)",
                textTransform: "uppercase",
                color:         "rgba(255,255,255,0.5)",
              }}
            >
              Start a project
            </p>
            <h3
              className="mb-5"
              style={{
                fontFamily:    SERIF,
                fontWeight:    600,
                fontStyle:     "italic",
                fontSize:      "clamp(28px, 3.5vw, 40px)",
                lineHeight:    1.15,
                letterSpacing: "-0.02em",
                color:         "var(--text-inverse)",
              }}
            >
              Not sure where to start?
            </h3>
            <p
              className="mb-10 mx-auto"
              style={{
                fontSize:  "var(--typo-ol-body-size)",
                lineHeight: 1.65,
                color:     "rgba(255,255,255,0.65)",
                maxWidth:  "520px",
              }}
            >
              Tell us your platform mix, team size, and the problem you are trying to solve. We will scope a recommendation in 48 hours.
            </p>
            <PortfolioButton
              href="/services/design-systems/enquiry"
              variant="primary"
              size="lg"
              style={{
                background:   GOLD,
                color:        "var(--text-primary)",
                borderColor:  GOLD,
                borderRadius: "12px",
                fontFamily:   SERIF,
                fontSize:     "var(--typo-ol-body-semi-size)",
                fontWeight:   "var(--typo-ol-body-semi-weight)",
              }}
            >
              Send a note
              <ArrowRight className="w-4 h-4" />
            </PortfolioButton>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

const AGENCY_ANCHORS: Record<string, string> = {
  sprint:     "Typically $4,500 via agency",
  scale:      "Typically $9,000 via agency",
  enterprise: "Typically $18,000+ via agency",
};

// ── Tier card ─────────────────────────────────────────────────────
function DesignSystemsTierCard({ tier, delay }: { tier: ServiceTier; delay: number }) {
  const recommended = tier.is_recommended;
  const price =
    tier.starting_price_cents != null && tier.currency
      ? formatStartingPrice(tier.starting_price_cents, tier.currency)
      : null;
  const anchor = AGENCY_ANCHORS[tier.tier_name?.toLowerCase() ?? ""];

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative flex flex-col"
      style={{
        background: "var(--card)",
        border: recommended ? `2px solid var(--text-brand)` : `1px solid ${BORDER}`,
        borderRadius: "16px",
        boxShadow: "0px 10px 15px -3px rgba(2,4,4,0.1)",
        transform: recommended ? "translateY(-6px)" : "none",
      }}
    >
      {recommended && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full whitespace-nowrap"
          style={{
            background: "var(--text-brand)",
            color: "var(--text-inverse)",
            fontSize: "var(--typo-ol-overline-bold-size)",
            fontWeight: "var(--typo-ol-overline-bold-weight)",
            letterSpacing: "var(--typo-ol-overline-bold-letter-spacing)",
            textTransform: "uppercase",
          }}
        >
          Recommended
        </div>
      )}

      <div className="p-7 md:p-8 pb-6 flex-1 flex flex-col">
        <p
          className="mb-2"
          style={{
            fontSize: "var(--typo-ol-overline-bold-size)",
            fontWeight: "var(--typo-ol-overline-bold-weight)",
            letterSpacing: "var(--typo-ol-overline-bold-letter-spacing)",
            textTransform: "uppercase",
            color: recommended ? "var(--text-brand)" : "var(--text-tertiary)",
          }}
        >
          {tier.tier_name}
        </p>

        <div className="mb-4">
          {price && (
            <>
              {anchor && (
                <div style={{ marginBottom: "4px" }}>
                  <span
                    style={{
                      fontFamily:      MONO,
                      fontSize:        "13px",
                      color:           "var(--text-tertiary)",
                      textDecoration:  "line-through",
                    }}
                  >
                    {anchor}
                  </span>
                  <span
                    style={{
                      fontFamily:    MONO,
                      fontSize:      "11px",
                      color:         "var(--text-tertiary)",
                      marginLeft:    "6px",
                    }}
                  >
                    average agency rate
                  </span>
                </div>
              )}
              <div className="flex items-baseline gap-1.5">
                <span
                  style={{
                    fontSize: "var(--typo-p-sm-size)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  From
                </span>
                <span
                  style={{
                    fontFamily: SERIF,
                    fontWeight: 600,
                    fontSize: "36px",
                    lineHeight: 1.1,
                    letterSpacing: "-0.02em",
                    color: "var(--text-primary)",
                  }}
                >
                  {price}
                </span>
              </div>
            </>
          )}
        </div>

        {tier.tier_description && (
          <p
            className="mb-6"
            style={{
              fontSize: "var(--typo-p-sm-size)",
              fontWeight: "var(--typo-p-sm-weight)",
              lineHeight: "var(--typo-p-sm-line-height)",
              color: "var(--text-secondary)",
            }}
          >
            {tier.tier_description}
          </p>
        )}

        <ul className="space-y-2.5 mb-7 flex-1">
          {tier.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span
                className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: recommended ? "#EAF5F4" : "#F5F5F5",
                  border: `1px solid ${BORDER}`,
                }}
              >
                <Check
                  className="w-2.5 h-2.5"
                  style={{ color: recommended ? "var(--text-brand)" : "var(--text-tertiary)" }}
                  strokeWidth={3}
                />
              </span>
              <span
                style={{
                  fontSize: "var(--typo-p-sm-size)",
                  lineHeight: "var(--typo-p-sm-line-height)",
                  color: "var(--text-primary)",
                }}
              >
                {feature}
              </span>
            </li>
          ))}
        </ul>

        <PortfolioButton
          href="/services/design-systems/enquiry"
          variant={recommended ? "primary" : "secondary"}
          size="md"
          fullWidth
          style={
            recommended
              ? {
                  background: "var(--surface-inverse)",
                  color: "var(--text-inverse)",
                  borderColor: "var(--surface-inverse)",
                  borderRadius: "8px",
                  fontSize: "var(--typo-p-sm-size)",
                }
              : {
                  background: "var(--card)",
                  color: "var(--text-primary)",
                  borderColor: BORDER,
                  borderRadius: "8px",
                  fontSize: "var(--typo-p-sm-size)",
                }
          }
        >
          Start a project
          <ArrowRight className="w-3.5 h-3.5" />
        </PortfolioButton>
      </div>
    </motion.article>
  );
}
