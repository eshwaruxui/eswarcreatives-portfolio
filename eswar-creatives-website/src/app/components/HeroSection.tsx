import portraitImg from "figma:asset/69caae487773daa26c0bca174fbb3def356268d3.png";
import portraitMobileImg from "figma:asset/e3f7bb7eb9b6ea388c4115e7349761cb135eaf57.png";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { motion } from "motion/react";
import { CuaBadge } from "./ui/cua-badge";

/** Wonky Fraunces display setting used across the redesigned headings. */
const fraunces = { fontVariationSettings: '"SOFT" 0, "WONK" 1' } as const;

const stats = [
  { value: "60+", label: "components" },
  { value: "180+", label: "semantic_tokens" },
  { value: "$3.25m", label: "arr_contributed" },
  { value: "45%", label: "handoff_efficiency" },
] as const;

export function HeroSection() {
  return (
    <section className="relative overflow-x-hidden bg-bg-subtle pt-20 md:pt-24 pb-12 md:pb-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-0 md:gap-8 items-end">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col gap-4 pb-0 md:pb-[84px]"
          >
            {/* Tag */}
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href="/services#design-systems"
                className="inline-flex items-center rounded-full border border-teal-200 bg-teal-50 px-3 py-1 font-medium text-text-primary no-underline transition-colors hover:bg-teal-100"
                style={{ fontSize: "var(--ds-text-base)" }}
              >
                Design Systems
              </a>
            </div>

            {/* Headline */}
            <h1
              className="font-heading font-semibold italic text-text-primary"
              style={{
                fontSize: "var(--typo-display-size)",
                lineHeight: "var(--typo-display-line-height)",
                letterSpacing: "var(--typo-display-letter-spacing)",
                ...fraunces,
              }}
            >
              Enterprise <span className="text-teal-500">design systems</span> for
              SaaS that ship across web, iOS, and Android.
            </h1>

            {/* Subtext — blockquote rule */}
            <p
              className="border-l-[3px] border-neutral-600 pl-3 italic text-text-secondary"
              style={{
                fontSize: "var(--ds-text-md)",
                lineHeight: "20px",
                letterSpacing: "-0.23px",
              }}
            >
              I help Series B–D product teams build the token architecture and
              component library they need to scale: without hiring a full design
              systems team. 60+ components. 180+ semantic tokens. Shipped at
              CYGNVS.
            </p>

            {/* Certification credential badge — mobile only */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="md:hidden"
            >
              <CuaBadge />
            </motion.div>

            {/* Buttons — desktop */}
            <div className="hidden md:flex flex-wrap items-center gap-3 pt-2">
              <a
                href="https://calendly.com/eswarcreatives/25-min-intro-call"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-bg-inverse px-5 py-2 text-text-inverse no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                style={{ fontSize: "var(--ds-text-md)" }}
              >
                Book a 30-min intro
              </a>
              <a
                href="/design-system/"
                className="demo-cta inline-flex items-center justify-center gap-1.5 rounded-md border border-border-medium px-[17px] py-[9px] text-text-primary no-underline transition-all duration-200 hover:-translate-y-0.5 hover:bg-bg-subtle"
                style={{ fontSize: "var(--ds-text-md)" }}
              >
                See design system demo
                <span className="demo-arrow">→</span>
              </a>
            </div>
          </motion.div>

          {/* Right — portrait */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative flex justify-center md:justify-end"
          >
            <div className="relative w-full max-w-[392px] aspect-[392/417] md:max-w-none md:w-[541px] md:h-[538px] md:aspect-auto mx-auto md:mx-0">
              {/* Baseline rule under the portrait */}
              <div className="absolute top-[91%] md:top-[93%] left-1/2 -translate-x-[86%] md:-translate-x-[71.5%] w-screen h-px bg-border-default z-0" />
              <ImageWithFallback
                src={portraitMobileImg}
                alt="Eswar, Senior UX Designer"
                className="w-full h-full object-contain relative z-10 translate-y-[12px] md:hidden"
              />
              <ImageWithFallback
                src={portraitImg}
                alt="Eswar, Senior UX Designer"
                className="w-full h-full object-contain relative z-10 translate-y-[12px] hidden md:block"
              />

              {/* CUA badge — md+ only, bottom-right of portrait */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="hidden md:block absolute bottom-[10%] right-[-8%] z-20"
              >
                <CuaBadge variant="elevated" />
              </motion.div>
            </div>
          </motion.div>

          {/* Buttons — mobile only, below hero image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex flex-col gap-3 md:hidden pl-0 pr-6 pt-2"
          >
            <a
              href="https://calendly.com/eswarcreatives/25-min-intro-call"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-md bg-bg-inverse px-5 py-2.5 text-text-inverse no-underline transition-all duration-200 hover:shadow-md"
              style={{ fontSize: "var(--ds-text-md)" }}
            >
              Book a 30-min intro
            </a>
            <a
              href="/design-system/"
              className="demo-cta inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border-medium px-5 py-2.5 text-text-primary no-underline transition-all duration-200 hover:bg-bg-subtle"
              style={{ fontSize: "var(--ds-text-md)" }}
            >
              See design system demo
              <span className="demo-arrow">→</span>
            </a>
          </motion.div>
        </div>

        {/* Stat strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mt-8 md:mt-10 flex flex-wrap gap-x-10 gap-y-6"
        >
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col">
              <span
                className="font-heading font-bold text-text-primary text-2xl"
                style={fraunces}
              >
                {s.value}
              </span>
              <span className="font-medium text-text-secondary text-base">
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
