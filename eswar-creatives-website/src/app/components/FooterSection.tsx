import { useRef } from "react";
import { motion, useInView } from "motion/react";
import {
  Mail,
  Linkedin,
  Layers,
  TrendingUp,
  Award,
  BadgeCheck,
} from "lucide-react";
import hfiLogo from "figma:asset/6fbb4e650de7aa03cf61da817d2d4d915097f262.png";
import { SectionLabel } from "./ui/section-label";
import { PortfolioButton } from "./ui/portfolio-button";
import { ContactRow } from "./ui/contact-row";
import { InfoRow } from "./ui/info-row";

export function FooterSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <footer id="contact" className="bg-surface-inverse text-text-inverse py-12 md:py-16 rounded-t-[2rem]">
      {/* ── FULL-WIDTH CTA BANNER ── */}
      <div style={{ padding: "48px 0", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
        <div
          className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 md:gap-8"
          style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 32px" }}
        >
          <div>
            <p style={{ fontSize: "11px", letterSpacing: "3px", textTransform: "uppercase", color: "#0d9488", fontWeight: 600, marginBottom: "10px" }}>
              Available for engagements
            </p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 700, color: "#ffffff", lineHeight: 1.2, maxWidth: "560px", margin: 0 }}>
              Let's build something that ships — and scales.
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <a
              href="https://calendly.com/eswarcreatives/25-min-intro-call"
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: "#0d9488", color: "#ffffff", borderRadius: "100px", padding: "14px 28px", fontWeight: 600, fontSize: "15px", textDecoration: "none", whiteSpace: "nowrap", textAlign: "center" }}
            >
              Book a 30-min intro →
            </a>
            <a
              href="mailto:eswar@eswarcreatives.in"
              style={{ border: "1.5px solid rgba(255,255,255,0.25)", color: "#e2e8f0", borderRadius: "100px", padding: "14px 28px", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", textDecoration: "none", whiteSpace: "nowrap" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              eswar@eswarcreatives.in
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6" style={{ paddingTop: "48px" }}>
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-2 gap-12 md:gap-[80px]"
        >
          {/* Left - About */}
          <div id="about">
            <SectionLabel surface="inverse" className="mb-1.5">About</SectionLabel>
            <h2
              className="text-text-inverse mb-0"
              style={{
                fontSize: "var(--typo-h3-size)",
                fontWeight: "var(--typo-h3-weight)",
                lineHeight: "var(--typo-h3-line-height)",
                letterSpacing: "var(--typo-h3-letter-spacing)",
              }}
            >
              Eswar Maheswaran
            </h2>
            <p
              className="mb-4"
              style={{ fontSize: "13px", color: "#6b7280", fontWeight: 400, marginTop: "2px", letterSpacing: "0.3px" }}
            >
              Product Design Lead · Enterprise SaaS
            </p>
            <p
              className="text-text-inverse-tertiary mb-4 max-w-md"
              style={{
                fontSize: "var(--typo-p-base-size)",
                lineHeight: "var(--typo-p-base-line-height)",
                fontWeight: "var(--typo-p-base-weight)",
              }}
            >
              Product Design Lead with 11+ years shipping enterprise SaaS
              across Web, iOS, and Android — and 20 years across the design
              discipline. I build token-based design systems, lead
              cross-platform UX, and connect design decisions to revenue
              outcomes.
            </p>

            <div className="space-y-[10px] mb-5">
              <InfoRow icon={<Layers />}>
                Built a 180-token design system and 60+ component library at CYGNVS — shipped across Web, iOS, and Android.
              </InfoRow>
              <InfoRow icon={<TrendingUp />}>
                Contributed to $3.25M+ ARR through the AI-powered TTX Player on mobile.
              </InfoRow>
              <InfoRow icon={<Award />}>
                HFI-CUA certified. Working async-first with US and EU teams from Chennai.
              </InfoRow>
            </div>

            {/* CUA Certification — inline credential */}
            <div className="flex items-center gap-2.5 mb-4 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.12] w-fit">
              <div className="w-[22px] h-[22px] rounded-[5px] overflow-hidden shrink-0 ring-1 ring-white/[0.08]">
                <img
                  src={hfiLogo}
                  alt="HFI"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-text-inverse-secondary"
                  style={{
                    fontSize: "var(--typo-h8m-size)",
                    lineHeight: "var(--typo-h8m-line-height)",
                    fontWeight: "var(--typo-h8m-weight)",
                  }}
                >
                  Certified Usability Analyst (CUA™)
                </span>
                <BadgeCheck className="w-3.5 h-3.5 text-interactive-primary shrink-0" />
              </div>
            </div>

            <PortfolioButton href="/about" variant="inverse" size="md">
              Read full profile →
            </PortfolioButton>
          </div>

          {/* Right - Contact */}
          <div id="resume">
            <SectionLabel surface="inverse" className="mb-1.5">Contact</SectionLabel>
            <h2
              className="text-text-inverse mb-1.5"
              style={{
                fontSize: "var(--typo-h4-size)",
                fontWeight: "var(--typo-h4-weight)",
                lineHeight: "var(--typo-h4-line-height)",
                letterSpacing: "var(--typo-h4-letter-spacing)",
              }}
            >
              Let's talk
            </h2>
            <p
              className="text-text-inverse-tertiary mb-6"
              style={{
                fontSize: "var(--typo-p-base-size)",
                lineHeight: "var(--typo-p-base-line-height)",
                fontWeight: "var(--typo-p-base-weight)",
              }}
            >
              Available for design systems engagements, SaaS UX retainers, and
              UX audits. US &amp; EU timezone overlap.
            </p>

            <div className="mb-6">
              <div style={{ paddingBottom: "8px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <ContactRow
                  icon={<Mail />}
                  label="Email"
                  href="mailto:eswar@eswarcreatives.in?subject=Design%20Inquiry%20%E2%80%94%20via%20Portfolio&body=Hi%20Eswar%2C%0A%0AI%20came%20across%20your%20portfolio%20and%20would%20love%20to%20discuss%20a%20potential%20collaboration.%0A%0A%E2%80%94%20Company%2FTeam%3A%20%0A%E2%80%94%20Role%2FProject%3A%20%0A%E2%80%94%20Timeline%3A%20%0A%0ALooking%20forward%20to%20hearing%20from%20you!"
                  value="eswar@eswarcreatives.in"
                />
              </div>
              <div style={{ paddingTop: "8px" }}>
                <ContactRow
                  icon={<Linkedin />}
                  label="LinkedIn"
                  href="https://www.linkedin.com/in/eswaruxui/"
                  value="/in/eswaruxui"
                  external
                  isLink
                  isLast
                />
              </div>
            </div>

            <a
              href="https://calendly.com/eswarcreatives/25-min-intro-call"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                width: "100%",
                background: "#0d9488",
                color: "#ffffff",
                borderRadius: "100px",
                padding: "16px 32px",
                fontWeight: 600,
                fontSize: "15px",
                textAlign: "center",
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              Book a 30-min intro →
            </a>
            <a
              href="/Eswar-AI-Native-UX-Lead-2026.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                textAlign: "center",
                marginTop: "12px",
                color: "#9ca3af",
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              ↓ Download CV (PDF)
            </a>
          </div>
        </motion.div>

        {/* Bottom */}
        <div className="mt-16 pt-6 border-t border-white/[0.12] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p
            className="text-text-inverse-quaternary"
            style={{
              fontSize: "var(--typo-h8-size)",
              lineHeight: "var(--typo-h8-line-height)",
              fontWeight: "var(--typo-h8-weight)",
            }}
          >
            © 2026 Eswar Maheswaran. All rights reserved.
          </p>
          <nav className="hidden md:flex items-center gap-6" aria-label="Footer navigation">
            {[
              { label: "Work",     href: "/" },
              { label: "Services", href: "/services" },
              { label: "About",    href: "/about" },
              { label: "Contact",  href: "/contact" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-gray-300 transition-colors"
                style={{ fontSize: "13px", color: "#aeb1af", textDecoration: "none" }}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}