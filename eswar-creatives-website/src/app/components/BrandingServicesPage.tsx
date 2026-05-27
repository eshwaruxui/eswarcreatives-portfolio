import { useEffect } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Navbar } from "./Navbar";
import { PortfolioButton } from "./ui/portfolio-button";
import { useService, formatStartingPrice, type ServiceTier } from "../../lib/catalog";

// ── Brand Identity palette (warm, premium, cream + gold) ──
const C = {
  bg:           "#faf6ed",
  bgAlt:        "#f3ecd9",
  surface:      "#ffffff",
  surfaceAlt:   "#fbf6e8",
  border:       "#e6dcc1",
  borderStrong: "#d6c79e",
  text:         "#2a1f14",
  textMuted:    "#6b5938",
  textSoft:     "#8b7548",
  gold:         "#a67932",
  goldLight:    "#d4a857",
  goldDeep:     "#7a5520",
  cream:        "#f9efd6",
} as const;

const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";

export function BrandingServicesPage() {
  const state = useService("brand_identity");

  useEffect(() => {
    document.title = "Atelier · Brand Identity — Eswar Creatives";
    document.documentElement.style.background = C.bg;
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: C.bg, fontFamily: "var(--font-family-primary)", color: C.text }}
    >
      <Navbar />

      {/* ── HERO ── */}
      <header className="pt-20 md:pt-24">
        <div
          className="max-w-5xl mx-auto px-6 pt-14 md:pt-20 pb-14 md:pb-16"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="flex items-center gap-2 mb-6">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.10em]"
                style={{
                  background: C.cream,
                  color: C.goldDeep,
                  border: `1px solid ${C.borderStrong}`,
                  letterSpacing: "0.10em",
                }}
              >
                <Sparkles className="w-3 h-3" />
                Atelier · Brand Identity
              </span>
            </div>

            <h1
              className="mb-6"
              style={{
                fontFamily: SERIF,
                fontWeight: 500,
                fontSize: "clamp(36px, 5.5vw, 64px)",
                lineHeight: 1.06,
                letterSpacing: "-0.02em",
                color: C.text,
                maxWidth: "780px",
              }}
            >
              Identities built to last{" "}
              <em style={{ fontStyle: "italic", color: C.gold, fontWeight: 400 }}>a generation.</em>
            </h1>

            <p
              className="mb-9"
              style={{
                fontSize: "clamp(16px, 1.4vw, 19px)",
                lineHeight: 1.6,
                color: C.textMuted,
                maxWidth: "640px",
              }}
            >
              {state.status === "ready" && state.service.description
                ? state.service.description
                : "End-to-end visual identity systems for businesses that mean to last — from the core mark to manufactured application."}
            </p>

            <div className="flex flex-wrap gap-3">
              <PortfolioButton
                href="/branding/brand-identity-discovery"
                variant="primary"
                size="lg"
                style={{ background: C.text, color: C.cream }}
              >
                Start your project
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
              className="mb-3 text-[11px] font-semibold uppercase"
              style={{ color: C.gold, letterSpacing: "0.14em" }}
            >
              Three ways to begin
            </p>
            <h2
              style={{
                fontFamily: SERIF,
                fontWeight: 500,
                fontSize: "clamp(28px, 3.6vw, 40px)",
                lineHeight: 1.15,
                letterSpacing: "-0.015em",
                color: C.text,
              }}
            >
              Pick the scope that fits where the business is today.
            </h2>
          </div>

          {state.status === "loading" && (
            <p style={{ color: C.textSoft }}>Loading pricing…</p>
          )}
          {state.status === "error" && (
            <p style={{ color: "#a31818" }}>
              Couldn't load pricing right now. Please try again, or{" "}
              <a href="mailto:eswar@eswarcreatives.in" style={{ color: C.gold }}>
                email us directly
              </a>
              .
            </p>
          )}
          {state.status === "empty" && (
            <p style={{ color: C.textSoft }}>Pricing tiers haven't been published yet.</p>
          )}

          {state.status === "ready" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-7">
              {state.service.tiers.map((tier, i) => (
                <BrandingTierCard key={tier.id} tier={tier} delay={i * 0.08} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <div
        className="py-16 md:py-24"
        style={{ borderTop: `1px solid ${C.border}`, background: C.bgAlt }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <h3
              className="mb-4"
              style={{
                fontFamily: SERIF,
                fontWeight: 500,
                fontSize: "clamp(24px, 3vw, 36px)",
                lineHeight: 1.2,
                letterSpacing: "-0.015em",
                color: C.text,
              }}
            >
              Not sure which tier fits?
            </h3>
            <p
              className="mb-8 mx-auto"
              style={{
                fontSize: "16px",
                lineHeight: 1.65,
                color: C.textMuted,
                maxWidth: "520px",
              }}
            >
              Start with the Brand Identity Discovery — a guided questionnaire that
              tells us (and you) exactly what scope your brand needs.
            </p>
            <PortfolioButton
              href="/branding/brand-identity-discovery"
              variant="primary"
              size="lg"
              style={{ background: C.text, color: C.cream }}
            >
              Begin discovery
              <ArrowRight className="w-4 h-4" />
            </PortfolioButton>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ── Tier card ─────────────────────────────────────────────────────
function BrandingTierCard({ tier, delay }: { tier: ServiceTier; delay: number }) {
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
      className="relative rounded-2xl flex flex-col"
      style={{
        background: recommended ? C.surface : C.surface,
        border: recommended ? `2px solid ${C.gold}` : `1px solid ${C.border}`,
        boxShadow: recommended
          ? "0 18px 40px -16px rgba(166,121,50,0.30), 0 4px 12px rgba(0,0,0,0.05)"
          : "0 2px 6px rgba(0,0,0,0.04)",
        transform: recommended ? "translateY(-6px)" : "none",
      }}
    >
      {recommended && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{ background: C.gold, color: "#fff" }}
        >
          Most chosen
        </div>
      )}

      <div className="p-7 md:p-8 pb-6 flex-1 flex flex-col">
        <p
          className="mb-2 text-[11px] font-semibold uppercase"
          style={{ color: recommended ? C.goldDeep : C.textSoft, letterSpacing: "0.12em" }}
        >
          {tier.tier_name}
        </p>
        <div className="mb-4">
          {price && (
            <div className="flex items-baseline gap-1.5">
              <span
                className="text-[12px]"
                style={{ color: C.textSoft, fontFamily: SERIF, fontStyle: "italic" }}
              >
                From
              </span>
              <span
                style={{
                  fontFamily: SERIF,
                  fontWeight: 500,
                  fontSize: "36px",
                  lineHeight: 1.1,
                  letterSpacing: "-0.015em",
                  color: C.text,
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
            style={{ fontSize: "14.5px", lineHeight: 1.6, color: C.textMuted }}
          >
            {tier.tier_description}
          </p>
        )}

        <ul className="space-y-2.5 mb-7 flex-1">
          {tier.features.map((feature, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span
                className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: recommended ? C.cream : "#f3eddc" }}
              >
                <Check className="w-2.5 h-2.5" style={{ color: C.goldDeep }} strokeWidth={3} />
              </span>
              <span style={{ fontSize: "13.5px", lineHeight: 1.55, color: C.text }}>
                {feature}
              </span>
            </li>
          ))}
        </ul>

        <PortfolioButton
          href="/branding/brand-identity-discovery"
          variant={recommended ? "primary" : "secondary"}
          size="md"
          fullWidth
          style={
            recommended
              ? { background: C.gold, color: "#fff", borderColor: C.gold }
              : { background: C.surfaceAlt, color: C.text, borderColor: C.borderStrong }
          }
        >
          Start your project
          <ArrowRight className="w-3.5 h-3.5" />
        </PortfolioButton>
      </div>
    </motion.article>
  );
}
