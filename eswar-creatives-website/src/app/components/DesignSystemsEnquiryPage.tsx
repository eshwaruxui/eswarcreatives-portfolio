import { useEffect } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { motion } from "motion/react";
import { Navbar } from "./Navbar";
import { PortfolioButton } from "./ui/portfolio-button";

const PAGE_BG = "#FAF8F4";
const BORDER  = "#E5E5E4";
const SERIF   = "'Fraunces', Georgia, 'Times New Roman', serif";

export function DesignSystemsEnquiryPage() {
  useEffect(() => {
    document.title = "Design Systems Enquiry — Eswar Creatives";
    document.documentElement.style.background = PAGE_BG;
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{ background: PAGE_BG, fontFamily: "var(--font-family-primary)", color: "var(--text-primary)" }}
    >
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-6 pt-24 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-xl w-full text-center"
          style={{
            background: "var(--card)",
            border: `1px solid ${BORDER}`,
            borderRadius: "16px",
            boxShadow: "0px 10px 15px -3px rgba(2,4,4,0.1)",
            padding: "48px 40px",
          }}
        >
          {/* Section label */}
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
            Enquiry form — coming soon
          </p>

          <h1
            className="mb-5"
            style={{
              fontFamily: SERIF,
              fontWeight: 600,
              fontStyle: "italic",
              fontSize: "clamp(26px, 3.5vw, 34px)",
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            The proper enquiry form is on its way.
          </h1>

          <p
            className="mb-8 mx-auto"
            style={{
              fontSize: "var(--typo-ol-body-size)",
              fontWeight: "var(--typo-ol-body-weight)",
              lineHeight: 1.65,
              letterSpacing: "var(--typo-ol-body-letter-spacing)",
              color: "var(--text-secondary)",
              maxWidth: "420px",
            }}
          >
            In the meantime, send a short note describing your current design
            system, team size, and platform mix. You'll hear back inside 48 hours
            with a scoped recommendation.
          </p>

          <div className="flex flex-wrap gap-3 justify-center mb-6">
            <PortfolioButton
              href="mailto:eswar@eswarcreatives.in?subject=Atelier%20Design%20Systems%20enquiry"
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
              <Mail className="w-4 h-4" />
              eswar@eswarcreatives.in
            </PortfolioButton>
          </div>

          <PortfolioButton
            href="/services/design-systems"
            variant="ghost"
            size="sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to pricing
          </PortfolioButton>
        </motion.div>
      </main>
    </div>
  );
}
