import { useEffect } from "react";
import { ArrowLeft, Clock, Mail } from "lucide-react";
import { motion } from "motion/react";
import { Navbar } from "./Navbar";
import { PortfolioButton } from "./ui/portfolio-button";

const C = {
  bg:        "#0a0e14",
  surface:   "#10161f",
  border:    "rgba(148,163,184,0.12)",
  text:      "#f1f5f9",
  textMuted: "#94a3b8",
  textSoft:  "#64748b",
  teal:      "#14b8a6",
  tealGlow:  "rgba(20,184,166,0.18)",
  borderHi:  "rgba(20,184,166,0.40)",
} as const;

const MONO = "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace";

export function DesignSystemsEnquiryPage() {
  useEffect(() => {
    document.title = "Atelier · Design Systems — Enquiry — Eswar Creatives";
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
      className="min-h-screen w-full flex flex-col"
      style={{ background: C.bg, fontFamily: "var(--font-family-primary)", color: C.text }}
    >
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-6 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-xl w-full rounded-2xl p-8 md:p-12 text-center"
          style={{ background: C.surface, border: `1px solid ${C.border}` }}
        >
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase mb-6"
            style={{
              background: C.tealGlow,
              color: C.teal,
              border: `1px solid ${C.borderHi}`,
              letterSpacing: "0.12em",
              fontFamily: MONO,
            }}
          >
            <Clock className="w-3 h-3" />
            Enquiry form — coming soon
          </span>

          <h1
            className="mb-5"
            style={{
              fontWeight: 600,
              fontSize: "clamp(28px, 3.6vw, 36px)",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: C.text,
            }}
          >
            The proper enquiry form is on its way.
          </h1>

          <p
            className="mb-8 mx-auto"
            style={{ fontSize: "16px", lineHeight: 1.65, color: C.textMuted, maxWidth: "480px" }}
          >
            In the meantime, send a short note describing your current design
            system, team size, and platform mix. You'll hear back inside 48 hours
            with a scoped recommendation.
          </p>

          <div className="flex flex-wrap gap-3 justify-center mb-7">
            <PortfolioButton
              href="mailto:eswar@eswarcreatives.in?subject=Atelier%20Design%20Systems%20enquiry"
              variant="primary"
              size="lg"
              style={{ background: C.teal, color: "#04221f" }}
            >
              <Mail className="w-4 h-4" />
              eswar@eswarcreatives.in
            </PortfolioButton>
          </div>

          <PortfolioButton
            href="/services/design-systems"
            variant="ghost"
            size="sm"
            style={{ color: C.textMuted }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to pricing
          </PortfolioButton>
        </motion.div>
      </main>
    </div>
  );
}
