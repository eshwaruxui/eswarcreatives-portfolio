import { useEffect } from "react";
import { ArrowRight, Check, Cpu, Terminal } from "lucide-react";
import { motion } from "motion/react";
import { Navbar } from "./Navbar";
import { PortfolioButton } from "./ui/portfolio-button";
import { useService, formatStartingPrice, type ServiceTier } from "../../lib/catalog";

// ── SaaS Design Systems palette (dark, technical, teal + indigo) ──
const C = {
  bg:         "#0a0e14",
  bgAlt:      "#0d121a",
  surface:    "#10161f",
  surfaceAlt: "#141b26",
  border:     "rgba(148,163,184,0.12)",
  borderHi:   "rgba(20,184,166,0.40)",
  text:       "#f1f5f9",
  textMuted:  "#94a3b8",
  textSoft:   "#64748b",
  teal:       "#14b8a6",
  tealDeep:   "#0d9488",
  tealGlow:   "rgba(20,184,166,0.18)",
  indigo:     "#6366f1",
  indigoSoft: "rgba(99,102,241,0.14)",
} as const;

const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";

export function DesignSystemsServicesPage() {
  const state = useService("saas_design");

  useEffect(() => {
    document.title = "Atelier · Design Systems — Eswar Creatives";
    document.documentElement.style.background = C.bg;
    document.documentElement.style.colorScheme = "dark";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = "";
      document.documentElement.style.colorScheme = "";
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
      <header className="pt-20 md:pt-24 relative overflow-hidden">
        {/* Ambient glow */}
        <div
          aria-hidden
          className="absolute -top-40 -left-20 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${C.tealGlow} 0%, transparent 70%)`, filter: "blur(40px)" }}
        />
        <div
          aria-hidden
          className="absolute -top-20 right-0 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${C.indigoSoft} 0%, transparent 70%)`, filter: "blur(40px)" }}
        />

        <div
          className="max-w-5xl mx-auto px-6 pt-14 md:pt-20 pb-14 md:pb-16 relative"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div className="flex items-center gap-2 mb-6">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase"
                style={{
                  background: C.tealGlow,
                  color: C.teal,
                  border: `1px solid ${C.borderHi}`,
                  letterSpacing: "0.12em",
                  fontFamily: MONO,
                }}
              >
                <Terminal className="w-3 h-3" />
                Atelier · Design Systems
              </span>
            </div>

            <h1
              className="mb-6"
              style={{
                fontWeight: 600,
                fontSize: "clamp(36px, 5.5vw, 64px)",
                lineHeight: 1.06,
                letterSpacing: "-0.025em",
                color: C.text,
                maxWidth: "820px",
              }}
            >
              Tokens, components, governance —{" "}
              <span style={{ color: C.teal }}>built to outlast a rewrite.</span>
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
                : "Design systems for SaaS teams that need to scale — tokens, components, governance, and the documentation to keep it all from drifting."}
            </p>

            {/* Token swatch strip */}
            <div className="flex flex-wrap items-center gap-3 mb-9">
              {[
                { name: "--primary",  hex: C.teal },
                { name: "--accent",   hex: C.indigo },
                { name: "--surface",  hex: C.surfaceAlt },
                { name: "--text-hi",  hex: C.text },
                { name: "--text-mid", hex: C.textMuted },
              ].map(t => (
                <div key={t.name} className="flex items-center gap-2">
                  <span
                    className="inline-block w-4 h-4 rounded"
                    style={{ background: t.hex, border: `1px solid ${C.border}` }}
                  />
                  <code style={{ fontFamily: MONO, fontSize: "11px", color: C.textSoft }}>
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
                style={{ background: C.teal, color: "#04221f" }}
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
              className="mb-3 text-[11px] font-semibold uppercase"
              style={{ color: C.teal, letterSpacing: "0.14em", fontFamily: MONO }}
            >
              &gt; pricing tiers
            </p>
            <h2
              style={{
                fontWeight: 600,
                fontSize: "clamp(28px, 3.6vw, 40px)",
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: C.text,
              }}
            >
              Three engagements. Pick where your team needs the most leverage.
            </h2>
          </div>

          {state.status === "loading" && (
            <p style={{ color: C.textSoft, fontFamily: MONO }}>// loading pricing…</p>
          )}
          {state.status === "error" && (
            <p style={{ color: "#fb7185" }}>
              Couldn't load pricing right now. Please try again, or{" "}
              <a href="mailto:eswar@eswarcreatives.in" style={{ color: C.teal }}>
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
                <DesignSystemsTierCard key={tier.id} tier={tier} delay={i * 0.08} />
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
            <Cpu className="w-7 h-7 mx-auto mb-5" style={{ color: C.teal }} />
            <h3
              className="mb-4"
              style={{
                fontWeight: 600,
                fontSize: "clamp(24px, 3vw, 36px)",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
                color: C.text,
              }}
            >
              Not sure which engagement fits?
            </h3>
            <p
              className="mb-8 mx-auto"
              style={{ fontSize: "16px", lineHeight: 1.65, color: C.textMuted, maxWidth: "560px" }}
            >
              Send a note describing your current system, team size, and platform mix.
              We'll come back with a scoped recommendation in 48 hours.
            </p>
            <PortfolioButton
              href="/services/design-systems/enquiry"
              variant="primary"
              size="lg"
              style={{ background: C.teal, color: "#04221f" }}
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
      className="relative rounded-2xl flex flex-col overflow-hidden"
      style={{
        background: recommended ? C.surfaceAlt : C.surface,
        border: recommended ? `1.5px solid ${C.teal}` : `1px solid ${C.border}`,
        boxShadow: recommended
          ? `0 22px 50px -16px ${C.tealGlow}, 0 4px 16px rgba(0,0,0,0.4)`
          : "0 2px 8px rgba(0,0,0,0.25)",
        transform: recommended ? "translateY(-6px)" : "none",
      }}
    >
      {/* Top accent bar */}
      <div
        className="h-1"
        style={{
          background: recommended
            ? `linear-gradient(90deg, ${C.teal}, ${C.indigo})`
            : "transparent",
        }}
      />

      {recommended && (
        <div
          className="absolute top-4 right-4 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase"
          style={{
            background: C.tealGlow,
            color: C.teal,
            border: `1px solid ${C.borderHi}`,
            letterSpacing: "0.10em",
            fontFamily: MONO,
          }}
        >
          recommended
        </div>
      )}

      <div className="p-7 md:p-8 pb-6 flex-1 flex flex-col">
        <p
          className="mb-2 text-[11px] font-semibold uppercase"
          style={{
            color: recommended ? C.teal : C.textSoft,
            letterSpacing: "0.12em",
            fontFamily: MONO,
          }}
        >
          tier_{tier.sort_order}_{tier.tier_name.toLowerCase()}
        </p>

        <div className="mb-4">
          {price && (
            <div className="flex items-baseline gap-1.5">
              <span style={{ fontSize: "12px", color: C.textSoft, fontFamily: MONO }}>
                from
              </span>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "36px",
                  lineHeight: 1.1,
                  letterSpacing: "-0.02em",
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
                className="mt-0.5 w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                style={{
                  background: recommended ? C.tealGlow : "rgba(255,255,255,0.04)",
                  border: recommended ? `1px solid ${C.borderHi}` : `1px solid ${C.border}`,
                }}
              >
                <Check className="w-2.5 h-2.5" style={{ color: C.teal }} strokeWidth={3} />
              </span>
              <span style={{ fontSize: "13.5px", lineHeight: 1.55, color: C.text }}>
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
              ? { background: C.teal, color: "#04221f", borderColor: C.teal }
              : {
                  background: "transparent",
                  color: C.text,
                  borderColor: C.border,
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
