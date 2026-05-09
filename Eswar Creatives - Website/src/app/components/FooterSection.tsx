import { useRef } from "react";
import { motion, useInView } from "motion/react";
import {
  Phone,
  Mail,
  Linkedin,
  MessageCircle,
  Download,
  MapPin,
  Shield,
  Globe,
  Loader2,
  BadgeCheck,
} from "lucide-react";
import hfiLogo from "figma:asset/6fbb4e650de7aa03cf61da817d2d4d915097f262.png";
import { useResumeDownload, RESUME_URL, RESUME_FILENAME } from "./useResumeDownload";
import { SectionLabel } from "./ui/section-label";
import { PortfolioButton } from "./ui/portfolio-button";
import { ContactRow } from "./ui/contact-row";
import { InfoRow } from "./ui/info-row";

export function FooterSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { isDownloading, handleDownload, fileSize } = useResumeDownload();

  return (
    <footer id="contact" className="bg-surface-inverse text-text-inverse py-12 md:py-16 rounded-t-[2rem]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-2 gap-12 md:gap-16"
        >
          {/* Left - About */}
          <div id="about">
            <SectionLabel surface="inverse" className="mb-2">About</SectionLabel>
            <h2
              className="text-text-inverse mb-4"
              style={{
                fontSize: "var(--typo-h3-size)",
                fontWeight: "var(--typo-h3-weight)",
                lineHeight: "var(--typo-h3-line-height)",
                letterSpacing: "var(--typo-h3-letter-spacing)",
              }}
            >
              About Eswar{" "}
              <span className="text-text-inverse-quaternary">(Maheswaran Y)</span>
            </h2>
            <p
              className="text-text-inverse-tertiary mb-8 max-w-md"
              style={{
                fontSize: "var(--typo-p-base-size)",
                lineHeight: "var(--typo-p-base-line-height)",
                fontWeight: "var(--typo-p-base-weight)",
              }}
            >
              Senior Product Designer with 20+ years of experience — 11+ in
              enterprise SaaS and a foundation in visual design — crafting web
              and mobile workflows for data-heavy, security-sensitive products.
              I focus on turning complex systems into clear, measurable
              experiences for global teams.
            </p>

            <div className="space-y-3 mb-6">
              <InfoRow icon={<MapPin />}>
                Based in Chennai, okay to relocate, working with US/EU/APAC teams
              </InfoRow>
              <InfoRow icon={<Shield />}>
                Experienced across cybersecurity, collaborations, and operations platforms.
              </InfoRow>
              <InfoRow icon={<Globe />}>
                Designed for 4 global SOC teams across 10 weeks.
              </InfoRow>
            </div>

            {/* CUA Certification — inline credential */}
            <div className="flex items-center gap-2.5 mb-8 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] w-fit">
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
            <SectionLabel surface="inverse" className="mb-2">Contact</SectionLabel>
            <h2
              className="text-text-inverse mb-3"
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
              className="text-text-inverse-tertiary mb-8"
              style={{
                fontSize: "var(--typo-p-base-size)",
                lineHeight: "var(--typo-p-base-line-height)",
                fontWeight: "var(--typo-p-base-weight)",
              }}
            >
              Open to senior product design roles and consulting for enterprise
              SaaS teams.
            </p>

            <div className="space-y-0 mb-8">
              <ContactRow
                icon={<Phone />}
                label="Mobile no"
                href="tel:+919841085484"
                value="+91 98410 85484"
              />
              <ContactRow
                icon={<Mail />}
                label="Email"
                href="mailto:eswarcreatives@gmail.com?subject=Design%20Inquiry%20%E2%80%94%20via%20Portfolio&body=Hi%20Eswar%2C%0A%0AI%20came%20across%20your%20portfolio%20and%20would%20love%20to%20discuss%20a%20potential%20collaboration.%0A%0A%E2%80%94%20Company%2FTeam%3A%20%0A%E2%80%94%20Role%2FProject%3A%20%0A%E2%80%94%20Timeline%3A%20%0A%0ALooking%20forward%20to%20hearing%20from%20you!"
                value="eswarcreatives@gmail.com"
              />
              <ContactRow
                icon={<MessageCircle />}
                label="WhatsApp"
                href="https://wa.me/919841085484"
                value="Message / Call"
                external
                isLink
              />
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

            <PortfolioButton
              href={RESUME_URL}
              download={RESUME_FILENAME}
              onClick={handleDownload}
              variant="primary"
              size="md"
              loading={isDownloading}
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isDownloading ? "Downloading…" : "Download Resume"}
            </PortfolioButton>
          </div>
        </motion.div>

        {/* Bottom */}
        <div className="mt-16 pt-6 border-t border-white/[0.06]">
          <p
            className="text-text-inverse-quaternary text-center"
            style={{
              fontSize: "var(--typo-h8-size)",
              lineHeight: "var(--typo-h8-line-height)",
              fontWeight: "var(--typo-h8-weight)",
            }}
          >
            © 2026 Eswar (Maheswaran Y). Designed with care.
          </p>
        </div>
      </div>
    </footer>
  );
}