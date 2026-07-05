import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "motion/react";
import { ArrowRight, Plus, Minus } from "lucide-react";
import { SectionHeader } from "./SectionHeader";

const principles = [
  {
    num: "01",
    title: "Start from business outcomes",
    description:
      "Define success in metrics first, then design flows and UI to move those numbers. Every design decision traces back to a KPI, whether that's reducing time-to-resolution, increasing activation rates, or cutting support tickets.",
    link: "See example in billing platform case",
  },
  {
    num: "02",
    title: "Systems over single screens",
    description:
      "Map the end-to-end workflow and governance before polishing individual interfaces. A beautiful screen that breaks the system is worse than a plain one that fits. Design the connections, not just the nodes.",
    link: "See example in billing platform case",
  },
  {
    num: "03",
    title: "Make AI safe and explainable",
    description:
      "Treat AI suggestions as decisions that must be visible, reversible, and auditable. Users need to understand why an AI recommendation was made, override it confidently, and trace the outcome back to the input.",
    link: "See example in AI-assisted alerting case",
  },
  {
    num: "04",
    title: "Design for cross-functional reality",
    description:
      "Surface constraints early and co-design with PMs and engineering to ship feasible solutions. The best design work happens when you understand technical debt, API limitations, and sprint capacity before proposing solutions.",
    link: "See example in internal tooling case",
  },
];

export function Principles() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [expanded, setExpanded] = useState<number | null>(0);

  const toggle = (i: number) => {
    setExpanded(expanded === i ? null : i);
  };

  return (
    <section className="py-10 md:py-12">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          {/* Section Header */}
          <SectionHeader label="Design Philosophy" title="Principles" />

          {/* Accordion */}
          <div className="flex flex-col">
            {principles.map((p, i) => {
              const isOpen = expanded === i;
              return (
                <motion.div
                  key={p.num}
                  initial={{ opacity: 0, y: 16 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className="border-b border-border-default first:border-t"
                >
                  <button
                    onClick={() => toggle(i)}
                    className="w-full flex items-center gap-5 md:gap-8 py-6 md:py-8 text-left cursor-pointer group"
                  >
                    {/* Accent bar — gold on the open item */}
                    <div className="flex self-stretch">
                      <div
                        className={`w-[3px] self-stretch rounded-full transition-colors duration-300 ${
                          isOpen ? "bg-gold-400" : "bg-transparent"
                        }`}
                      />
                    </div>

                    {/* Number */}
                    <span
                      className={`shrink-0 transition-colors duration-300 ${
                        isOpen ? "text-text-primary" : "text-text-disabled group-hover:text-text-placeholder"
                      }`}
                      style={{
                        fontSize: "var(--typo-h2-size)",
                        lineHeight: "var(--typo-h2-line-height)",
                        fontWeight: "var(--typo-h1-weight)",
                        letterSpacing: "var(--typo-h2-letter-spacing)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {p.num}
                    </span>

                    {/* Title */}
                    <h3
                      className={`flex-1 font-heading font-semibold transition-colors duration-300 ${
                        isOpen ? "text-text-primary" : "text-text-secondary group-hover:text-text-primary"
                      }`}
                      style={{
                        fontSize: "var(--ds-text-xl)",
                        lineHeight: "28px",
                        letterSpacing: "-0.25px",
                        fontVariationSettings: '"SOFT" 0, "WONK" 1',
                      }}
                    >
                      {p.title}
                    </h3>

                    {/* Toggle icon */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isOpen
                          ? "bg-gold-700 text-text-inverse"
                          : "bg-gold-400 text-text-on-accent group-hover:bg-gold-500"
                      }`}
                    >
                      {isOpen ? (
                        <Minus className="w-4 h-4" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {/* Expandable content */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          height: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
                          opacity: { duration: 0.25, delay: 0.05 },
                        }}
                        className="overflow-hidden"
                      >
                        <div className="pl-[52px] md:pl-[76px] pb-8">
                          <p
                            className="text-text-primary max-w-xl mb-5"
                            style={{
                              fontSize: "var(--typo-p-lg-size)",
                              lineHeight: "var(--typo-p-lg-line-height)",
                              fontWeight: "var(--typo-p-lg-weight)",
                            }}
                          >
                            {p.description}
                          </p>
                          <a
                            href="#!"
                            className="inline-flex items-center gap-1.5 text-text-primary hover:text-black transition-colors group/link"
                            style={{
                              fontSize: "var(--typo-caption-m-size)",
                              lineHeight: "var(--typo-caption-m-line-height)",
                              fontWeight: "var(--typo-caption-m-weight)",
                            }}
                          >
                            {p.link}
                            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/link:translate-x-0.5" />
                          </a>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}