import portraitImg from "figma:asset/69caae487773daa26c0bca174fbb3def356268d3.png";
import portraitMobileImg from "figma:asset/e3f7bb7eb9b6ea388c4115e7349761cb135eaf57.png";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Tag } from "./ui/tag";
import { PortfolioButton } from "./ui/portfolio-button";
import { CuaBadge } from "./ui/cua-badge";

export function HeroSection() {

  return (
    <section className="relative pt-20 md:pt-24 pb-[4%] overflow-x-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-0 md:gap-8 items-end">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="pb-0 md:pb-[84px]"
          >
            {/* Tags */}
            <div className="flex items-center gap-2 mb-4 md:mb-6 flex-wrap">
              <Tag asChild variant="subtle" size="lg"><a href="/services#design-systems">Design Systems</a></Tag>
              <Tag asChild variant="subtle" size="lg"><a href="/services#ux-audit">UX Audit</a></Tag>
              <Tag asChild variant="subtle" size="lg"><a href="/services#saas-ux">SaaS UX</a></Tag>
            </div>

            {/* Headline */}
            <h1
              className="text-text-primary mb-4"
              style={{
                fontSize: "var(--typo-display-size)",
                fontWeight: "var(--typo-display-weight)",
                lineHeight: "var(--typo-display-line-height)",
                letterSpacing: "var(--typo-display-letter-spacing)",
              }}
            >
              Enterprise design systems for SaaS{" "}
              <span className="text-text-quaternary">that ship across web, iOS, and Android.</span>
            </h1>

            {/* Subtext */}
            <p
              className="text-text-tertiary mb-4"
              style={{
                fontSize: "var(--typo-ol-body-size)",
                lineHeight: "var(--typo-ol-body-line-height)",
                fontWeight: "var(--typo-ol-body-weight)",
                letterSpacing: "var(--typo-ol-body-letter-spacing)",
              }}
            >I help Series B–D SaaS teams architect token-based design systems that scale from one product to many — without slowing engineering down.</p>

            {/* Stats line */}
            <p
              className="text-text-tertiary mb-6 md:mb-8 font-medium"
              style={{
                fontSize: "var(--typo-ol-body-size)",
                lineHeight: "var(--typo-ol-body-line-height)",
              }}
            >60+ components. 180+ semantic tokens. Cross-platform. Shipped at CYGNVS.</p>

            {/* Certification credential badge */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="mb-6 md:mb-8 md:hidden"
            >
              <CuaBadge accent="warning" />
            </motion.div>

            {/* Buttons - desktop only */}
            <div className="hidden md:flex md:flex-row flex-wrap gap-3 md:mt-4">
              <PortfolioButton href="https://calendly.com/eswarcreatives/25-min-intro-call" target="_blank" rel="noopener noreferrer" variant="primary" size="lg">
                Book a 30-min intro
                <ArrowRight className="w-4 h-4" />
              </PortfolioButton>
              <a
                href="/design-system/"
                className="demo-cta inline-flex items-center justify-center w-fit rounded-xl cursor-pointer whitespace-nowrap border border-gray-400 text-text-secondary hover:bg-gray-50 hover:-translate-y-0.5 px-6 py-3"
                style={{
                  fontSize: 'var(--typo-btn-med-size)',
                  lineHeight: 'var(--typo-btn-med-line-height)',
                  fontWeight: 'var(--typo-btn-med-weight)',
                  gap: '6px',
                  textDecoration: 'none',
                }}
              >
                See design system demo
                <span className="demo-arrow">→</span>
              </a>
            </div>
          </motion.div>

          {/* Right - Portrait */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative flex justify-center md:justify-end"
          >
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] md:w-[480px] md:h-[480px] rounded-full bg-gradient-to-br from-orange-100/40 via-amber-50/30 to-rose-100/20 blur-3xl" />

            {/* Subtle accent shapes */}
            <div className="absolute top-8 right-8 w-20 h-20 rounded-full border border-orange-200/40" />
            <div className="absolute bottom-12 left-8 w-12 h-12 rounded-full bg-amber-100/50" />

            <div className="relative w-full max-w-[392px] aspect-[392/417] md:max-w-none md:w-[541px] md:h-[538px] md:aspect-auto mx-auto md:mx-0">
              {/* Horizontal line at bottom of image */}
              <div className="absolute top-[91%] md:top-[93%] left-1/2 -translate-x-[86%] md:-translate-x-[71.5%] w-screen h-[1px] bg-gray-200 z-0" />
              <ImageWithFallback
                src={portraitMobileImg}
                alt="Eswar - Senior UX Designer"
                className="w-full h-full object-contain relative z-10 translate-y-[12px] md:hidden"
              />
              <ImageWithFallback
                src={portraitImg}
                alt="Eswar - Senior UX Designer"
                className="w-full h-full object-contain relative z-10 translate-y-[12px] hidden md:block"
              />

              {/* CUA Badge — md+ only, bottom-right of portrait */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="hidden md:block absolute bottom-[10%] right-[-8%] z-20"
              >
                <CuaBadge accent="warning" variant="elevated" />
              </motion.div>
            </div>
          </motion.div>

          {/* Buttons - mobile only, below hero image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col gap-3 md:hidden pl-0 pr-6"
          >
            <PortfolioButton href="https://calendly.com/eswarcreatives/25-min-intro-call" target="_blank" rel="noopener noreferrer" variant="primary" size="lg" fullWidth>
              Book a 30-min intro
              <ArrowRight className="w-4 h-4" />
            </PortfolioButton>
            <a
              href="/design-system/"
              className="demo-cta inline-flex items-center justify-center w-full rounded-xl cursor-pointer whitespace-nowrap border border-gray-400 text-text-secondary hover:bg-gray-50 hover:-translate-y-0.5 px-6 py-3"
              style={{
                fontSize: 'var(--typo-btn-med-size)',
                lineHeight: 'var(--typo-btn-med-line-height)',
                fontWeight: 'var(--typo-btn-med-weight)',
                gap: '6px',
                textDecoration: 'none',
              }}
            >
              See design system demo
              <span className="demo-arrow">→</span>
            </a>
          </motion.div>
        </div>

        {/* Trust strip */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-text-tertiary text-center mt-8 md:mt-10 text-sm"
          style={{ letterSpacing: "0.01em" }}
        >
          HFI-CUA Certified · 11+ years SaaS, 20 years in design · $3.25M+ ARR contribution at CYGNVS · Working async with US &amp; EU teams
        </motion.p>
      </div>
    </section>
  );
}