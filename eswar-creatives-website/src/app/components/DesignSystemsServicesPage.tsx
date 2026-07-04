import { useEffect } from "react";
import { ArrowRight, Check } from "lucide-react";
import { motion } from "motion/react";
import { Navbar } from "./Navbar";
import { PortfolioButton } from "./ui/portfolio-button";
import { useService, formatStartingPrice, type ServiceTier } from "../../lib/catalog";

const PAGE_BG = "#FAF8F4";
const GOLD    = "#D5B067";
const BORDER  = "#E5E5E4";
const SERIF   = "'Fraunces', Georgia, 'Times New Roman', serif";

const TOKEN_SWATCHES = [
  { name: "--color-brand",   hex: "#007872" },
  { name: "--color-gold",    hex: "#D5B067" },
  { name: "--color-surface", hex: "#FFFFFF" },
  { name: "--text-primary",  hex: "#181A19" },
  { name: "--text-muted",    hex: "#6F7371" },
];

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

            {/* Token swatch strip */}
            <div className="flex flex-wrap items-center gap-2 mb-9">
              {TOKEN_SWATCHES.map(t => (
                <div
                  key={t.name}
                  className="inline-flex items-center gap-2 px-2 py-1 rounded-full"
                  style={{
                    background: "var(--card)",
                    border: `1px solid ${BORDER}`,
                  }}
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ background: t.hex, border: `1px solid ${BORDER}`, flexShrink: 0 }}
                  />
                  <code
                    style={{
                      fontSize: "var(--typo-ol-overline-bold-size)",
                      fontWeight: "var(--typo-ol-overline-bold-weight)",
                      letterSpacing: "0.03em",
                      color: "var(--text-tertiary)",
                      fontFamily: "var(--font-family-primary)",
                    }}
                  >
                    {t.name}
                  </code>
                </div>
              ))}
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

      {/* ── FOOTER CTA ── */}
      <div
        className="py-16 md:py-24"
        style={{ background: "var(--surface-inverse)" }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <p
              className="mb-3"
              style={{
                fontSize: "var(--typo-ol-overline-bold-size)",
                fontWeight: "var(--typo-ol-overline-bold-weight)",
                letterSpacing: "var(--typo-ol-overline-bold-letter-spacing)",
                textTransform: "uppercase",
                color: "var(--text-inverse-tertiary)",
              }}
            >
              Get started
            </p>
            <h3
              className="mb-4"
              style={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "clamp(24px, 3vw, 36px)",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
                color: "var(--text-inverse)",
              }}
            >
              Not sure which engagement fits?
            </h3>
            <p
              className="mb-8 mx-auto"
              style={{
                fontSize: "var(--typo-ol-body-size)",
                lineHeight: 1.65,
                color: "var(--text-inverse-secondary)",
                maxWidth: "560px",
              }}
            >
              Send a note describing your current system, team size, and platform mix.
              We'll come back with a scoped recommendation in 48 hours.
            </p>
            <PortfolioButton
              href="/services/design-systems/enquiry"
              variant="primary"
              size="lg"
              style={{
                background: GOLD,
                color: "var(--text-primary)",
                borderColor: GOLD,
                borderRadius: "12px",
                fontSize: "var(--typo-ol-body-semi-size)",
                fontWeight: "var(--typo-ol-body-semi-weight)",
              }}
            >
              Send an enquiry
              <ArrowRight className="w-4 h-4" />
            </PortfolioButton>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ── Tier card ─────────────────────────────────────────────────────
function DesignSystemsTierCard({ tier, delay }: { tier: ServiceTier; delay: number }) {
  const recommended = tier.is_recommended;
  const price =
    tier.starting_price_cents != null && tier.currency
      ? formatStartingPrice(tier.starting_price_cents, tier.currency)
      : null;

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
