import { useEffect } from "react";
import { ArrowRight, Layers, Search, Monitor, Clock } from "lucide-react";
import { motion } from "motion/react";
import { Navbar } from "./Navbar";
import { Tag } from "./ui/tag";
import { PortfolioButton } from "./ui/portfolio-button";

const services = [
  {
    id: "design-systems",
    icon: Layers,
    label: "Design Systems",
    title: "Token-based systems that scale",
    description:
      "I architect semantic token systems and component libraries for enterprise SaaS — built to scale across Web, iOS, and Android without slowing engineering down. 60+ components, 180+ tokens, shipped at CYGNVS.",
    deliverables: [
      "Token architecture (color, spacing, type, elevation)",
      "Component library with documented variants",
      "Cross-platform handoff (Web, iOS, Android)",
      "Design-to-dev workflow and governance",
    ],
    accent: "#0d9488",
    accentBg: "#f0faf9",
    accentBorder: "rgba(13,148,136,0.2)",
  },
  {
    id: "ux-audit",
    icon: Search,
    label: "UX Audit",
    title: "A clear diagnosis of what's breaking",
    description:
      "Systematic heuristic and task-flow evaluation of your product. Prioritised findings with severity ratings and actionable fix paths — not just a list of problems, but a clear improvement roadmap.",
    deliverables: [
      "Heuristic evaluation against Nielsen's 10",
      "User flow and task-path analysis",
      "Severity matrix with effort/impact mapping",
      "Written recommendations brief with examples",
    ],
    accent: "#7c3aed",
    accentBg: "#f5f3ff",
    accentBorder: "rgba(124,58,237,0.2)",
  },
  {
    id: "saas-ux",
    icon: Monitor,
    label: "SaaS UX",
    title: "End-to-end UX for complex products",
    description:
      "From information architecture and interaction design to handoff-ready components. Focused on data-heavy, workflow-intensive enterprise SaaS where cognitive load and role-based access are the real challenges.",
    deliverables: [
      "Information architecture and navigation design",
      "Interaction design and flow prototyping",
      "Role-based UX for multi-persona products",
      "Handoff documentation and design QA",
    ],
    accent: "#b45309",
    accentBg: "#fefce8",
    accentBorder: "rgba(180,83,9,0.2)",
  },
];

export function ServicesPage() {
  useEffect(() => {
    document.title = "How I work with scaling SaaS teams — Eswar Creatives";
    document.documentElement.style.background = "#f5f3f0";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "#f5f3f0", fontFamily: "var(--font-family-primary)" }}
    >
      <Navbar />

      {/* ── HERO ── */}
      <header className="pt-20 md:pt-24">
        <div className="max-w-5xl mx-auto px-6 pt-10 md:pt-14 pb-14 md:pb-16" style={{ borderBottom: "1px solid #d4cfc8" }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* Coming soon badge */}
            <div className="flex items-center gap-2 mb-6">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.08em]"
                style={{ background: "#fff8e6", color: "#b45309", border: "1px solid rgba(180,83,9,0.2)" }}
              >
                <Clock className="w-3 h-3" />
                Coming Soon
              </span>
            </div>

            <h1
              className="text-gray-900 mb-5"
              style={{
                fontSize: "clamp(28px, 4vw, 48px)",
                fontWeight: 700,
                lineHeight: 1.12,
                letterSpacing: "-0.02em",
                maxWidth: "680px",
              }}
            >
              Services{" "}
              <span className="text-gray-400">for SaaS teams that need design to ship.</span>
            </h1>

            <p
              className="text-gray-500 mb-8"
              style={{
                fontSize: "var(--typo-ol-body-size)",
                lineHeight: "var(--typo-ol-body-line-height)",
                maxWidth: "560px",
              }}
            >
              Detailed service pages with process, case studies, and pricing are being
              prepared. In the meantime — here's what I offer, and how to get in touch.
            </p>

            <PortfolioButton
              href="https://calendly.com/eswarcreatives/25-min-intro-call"
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              size="lg"
            >
              Book a 30-min intro
              <ArrowRight className="w-4 h-4" />
            </PortfolioButton>
          </motion.div>
        </div>
      </header>

      {/* ── SERVICE CARDS ── */}
      <section className="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="space-y-6">
            {services.map((svc, i) => {
              const Icon = svc.icon;
              return (
                <motion.div
                  key={svc.id}
                  id={svc.id}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="bg-white rounded-2xl overflow-hidden"
                  style={{ border: "1px solid #d4cfc8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                >
                  {/* Accent top bar */}
                  <div className="h-1 w-full" style={{ background: svc.accent }} />

                  <div className="p-7 md:p-8">
                    <div className="flex flex-col md:flex-row md:gap-12">
                      {/* Left — heading */}
                      <div className="md:w-72 flex-shrink-0 mb-6 md:mb-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                          style={{ background: svc.accentBg, border: `1px solid ${svc.accentBorder}` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: svc.accent }} />
                        </div>
                        <Tag variant="outlined" size="sm" className="mb-3">{svc.label}</Tag>
                        <h2
                          className="text-gray-900 font-semibold leading-snug"
                          style={{ fontSize: "var(--typo-h4-size)", lineHeight: "1.3" }}
                        >
                          {svc.title}
                        </h2>
                      </div>

                      {/* Right — description + deliverables */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-gray-600 mb-6 leading-relaxed"
                          style={{ fontSize: "var(--typo-p-base-size)", lineHeight: "1.7" }}
                        >
                          {svc.description}
                        </p>

                        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 mb-3">
                          What's included
                        </p>
                        <ul className="space-y-2">
                          {svc.deliverables.map((d) => (
                            <li key={d} className="flex items-start gap-2.5">
                              <span
                                className="mt-[7px] w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ background: svc.accent }}
                              />
                              <span
                                className="text-gray-600"
                                style={{ fontSize: "var(--typo-p-xs-size)", lineHeight: "1.6" }}
                              >
                                {d}
                              </span>
                            </li>
                          ))}
                        </ul>

                        <div className="mt-6 pt-5" style={{ borderTop: "1px solid #e8e3dc" }}>
                          <span
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em]"
                            style={{ color: "#9ca3af" }}
                          >
                            <Clock className="w-3 h-3" />
                            Full details coming soon
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <div className="py-16 md:py-20 bg-white" style={{ borderTop: "1px solid #d4cfc8" }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h3
              className="text-gray-900 font-semibold mb-3"
              style={{ fontSize: "var(--typo-h3-size)", lineHeight: "var(--typo-h3-line-height)" }}
            >
              Ready to talk now?
            </h3>
            <p
              className="text-gray-500 mb-8 max-w-md mx-auto"
              style={{ fontSize: "var(--typo-p-base-size)", lineHeight: "var(--typo-p-base-line-height)" }}
            >
              Don't wait for the full page. Book a 30-min intro and we'll figure out
              together what your team needs.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <PortfolioButton
                href="https://calendly.com/eswarcreatives/25-min-intro-call"
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
                size="lg"
              >
                Book a 30-min intro
                <ArrowRight className="w-4 h-4" />
              </PortfolioButton>
              <PortfolioButton href="/" variant="secondary" size="lg">
                View work instead
                <ArrowRight className="w-4 h-4" />
              </PortfolioButton>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
