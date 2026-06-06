import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Mail, Linkedin, Layers, TrendingUp, Award, BadgeCheck } from "lucide-react";
import hfiLogo from "figma:asset/6fbb4e650de7aa03cf61da817d2d4d915097f262.png";
import { SectionLabel } from "./ui/section-label";
import { ContactRow } from "./ui/contact-row";
import { InfoRow } from "./ui/info-row";

const MAILTO =
  "mailto:eswar@eswarcreatives.in?subject=Design%20Inquiry%20via%20Portfolio&body=Hi%20Eswar%2C%0A%0AI%20came%20across%20your%20portfolio%20and%20would%20love%20to%20discuss%20a%20potential%20collaboration.%0A%0ACompany%2FTeam%3A%20%0ARole%2FProject%3A%20%0ATimeline%3A%20%0A%0ALooking%20forward%20to%20hearing%20from%20you!";

export function FooterSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <footer id="contact" className="bg-bg-inverse text-text-inverse rounded-t-[32px] pt-6 pb-16">
      {/* ── CTA banner ── */}
      <div className="border-b border-white/10 pt-7 pb-12">
        <div className="max-w-6xl mx-auto px-6">
          <p className="uppercase font-bold text-gold-400 text-sm mb-2" style={{ letterSpacing: "1.14px" }}>
            Available for engagements
          </p>
          <h2
            className="font-heading font-bold text-text-inverse text-4xl max-w-[560px]"
            style={{ lineHeight: "1.2", fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
          >
            Let's build something that ships &amp; scales.
          </h2>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-9">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-2 gap-12 md:gap-20"
        >
          {/* Left — About */}
          <div id="about">
            <SectionLabel surface="inverse" className="mb-1.5">About</SectionLabel>
            <h2
              className="font-heading font-bold italic text-text-inverse"
              style={{ fontSize: "var(--ds-text-xl)", lineHeight: "28px", letterSpacing: "-0.25px", fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              Eswar Maheswaran
            </h2>
            <p className="text-text-inverse-tertiary text-base mt-1 mb-4" style={{ letterSpacing: "0.3px" }}>
              Product Design Lead · Enterprise SaaS
            </p>
            <p className="text-text-inverse-tertiary text-base leading-6 max-w-md mb-4">
              Product Design Lead with 11+ years shipping enterprise SaaS across
              Web, iOS, and Android and 20 years across the design discipline. I
              build token-based design systems, lead cross-platform UX, and
              connect design decisions to revenue outcomes.
            </p>

            <div className="space-y-[10px] mb-5">
              <InfoRow icon={<Layers />}>
                Built a 180-token design system and 60+ component library at
                CYGNVS shipped across Web, iOS, and Android.
              </InfoRow>
              <InfoRow icon={<TrendingUp />}>
                Contributed to $3.25M+ ARR through the AI-powered TTX Player on mobile.
              </InfoRow>
              <InfoRow icon={<Award />}>
                HFI-CUA certified. Working async-first with US and EU teams from Chennai.
              </InfoRow>
            </div>

            {/* CUA credential */}
            <div className="flex items-center gap-2.5 mb-4 px-3 py-2 rounded-md bg-white/[0.04] border border-white/[0.12] w-fit">
              <div className="w-[22px] h-[22px] rounded-full overflow-hidden shrink-0 ring-1 ring-white/[0.08]">
                <img src={hfiLogo} alt="HFI" className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-text-inverse-secondary text-base font-medium">
                  Certified Usability Analyst (CUA™)
                </span>
                <BadgeCheck className="w-3.5 h-3.5 text-gold-400 shrink-0" />
              </div>
            </div>

            <a
              href="/design-system/"
              className="demo-cta inline-flex w-fit items-center justify-center gap-1.5 rounded-md border border-border-emphasis px-[17px] py-[9px] text-text-inverse no-underline transition-colors"
              style={{ fontSize: "var(--ds-text-md)" }}
            >
              See design system demo
              <span className="demo-arrow text-text-inverse-tertiary">→</span>
            </a>
          </div>

          {/* Right — Contact */}
          <div id="resume">
            <SectionLabel surface="inverse" className="mb-1.5">Contact</SectionLabel>
            <h2
              className="font-heading font-bold italic text-text-inverse"
              style={{ fontSize: "var(--ds-text-xl)", lineHeight: "28px", letterSpacing: "-0.25px", fontVariationSettings: '"SOFT" 0, "WONK" 1' }}
            >
              Let's talk
            </h2>
            <p className="text-text-inverse-tertiary text-base leading-6 mt-1.5 mb-6">
              Available for design systems engagements, SaaS UX retainers, and UX
              audits. US &amp; EU timezone overlap.
            </p>

            <div className="mb-6">
              <div className="pb-2 border-b border-white/[0.08]">
                <ContactRow icon={<Mail />} label="Email" href={MAILTO} value="eswar@eswarcreatives.in" />
              </div>
              <div className="pt-2">
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

            {/* Gold primary CTA */}
            <a
              href="https://calendly.com/eswarcreatives/25-min-intro-call"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-lg bg-gold-400 px-8 py-4 text-center font-semibold text-text-on-accent no-underline transition-colors hover:bg-gold-500"
              style={{ fontSize: "var(--ds-text-md)" }}
            >
              Book a 30-min intro →
            </a>
            <a
              href="/Eswar-AI-Native-UX-Lead-2026.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center mt-3 text-text-inverse-tertiary text-base no-underline hover:text-text-inverse-secondary transition-colors"
            >
              ↓ Download Profile (PDF)
            </a>
          </div>
        </motion.div>

        {/* Bottom bar */}
        <div className="mt-12 pt-12 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-text-inverse-tertiary text-sm">
            © 2026 Eswar Maheswaran. All rights reserved.
          </p>
          <nav className="flex items-center gap-6" aria-label="Footer navigation">
            {[
              { label: "Work", href: "/" },
              { label: "Services", href: "/services" },
              { label: "About", href: "/about" },
              { label: "Contact", href: "/contact" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-text-inverse-tertiary text-md no-underline hover:text-text-inverse-secondary transition-colors"
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
