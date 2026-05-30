import { useRef } from "react";
import { Link } from "react-router";
import { motion, useInView } from "motion/react";
import { ArrowRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SectionHeader } from "./SectionHeader";
import { Tag } from "./ui/tag";
import { BulletItem } from "./ui/bullet-item";
import { PortfolioButton } from "./ui/portfolio-button";

const CASE_IMG = "/assets/securevault/cover-card.webp";

export function FlagshipCase() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="work" className="pt-1 md:pt-2 pb-10 md:pb-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <SectionHeader label="Flagship Case Study" title="SecureVault" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="bg-white rounded-3xl border border-black/[0.06] shadow-xl shadow-black/[0.03] overflow-hidden"
        >
          <div className="p-2">
            <div className="grid md:grid-cols-2 gap-0">
              {/* Image */}
              <div className="relative rounded-2xl overflow-hidden bg-gray-100 min-h-[260px] md:min-h-[400px]">
                <ImageWithFallback
                  src={CASE_IMG}
                  alt="Cybersecurity SaaS Dashboard"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <Tag variant="overlay-dark" size="md">Flagship</Tag>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 md:p-10 lg:p-12 flex flex-col justify-center">
                <h3
                  className="text-text-primary mb-3"
                  style={{
                    fontSize: "var(--typo-h3-size)",
                    fontWeight: "var(--typo-h3-weight)",
                    lineHeight: "var(--typo-h3-line-height)",
                    letterSpacing: "var(--typo-h3-letter-spacing)",
                  }}
                >
                  Reducing alert fatigue in a cybersecurity SaaS platform
                </h3>
                <p
                  className="text-text-tertiary mb-6"
                  style={{
                    fontSize: "var(--typo-p-base-size)",
                    lineHeight: "var(--typo-p-base-line-height)",
                    fontWeight: "var(--typo-p-base-weight)",
                  }}
                >
                  Security analysts were missing critical alerts in a noisy, fragmented triage workflow.
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-8">
                  {["Enterprise SaaS", "Cybersecurity", "High-risk / NDA"].map((tag) => (
                    <Tag key={tag} variant="outlined" size="md">{tag}</Tag>
                  ))}
                </div>

                {/* Key decisions */}
                <div className="mb-6">
                  <h4
                    className="text-text-quaternary mb-2 uppercase"
                    style={{
                      fontSize: "var(--typo-h9-size)",
                      lineHeight: "var(--typo-h9-line-height)",
                      fontWeight: "var(--typo-h9-weight)",
                      letterSpacing: "var(--typo-h9-letter-spacing)",
                    }}
                  >
                    Key decisions
                  </h4>
                  <ul className="space-y-1.5">
                    <BulletItem>
                      Merged 3 tools into a single incident view aligned to analyst mental model.
                    </BulletItem>
                    <BulletItem>
                      Re-prioritised alerts using risk-based scoring and clear confidence labels.
                    </BulletItem>
                  </ul>
                </div>

                {/* Outcomes */}
                <div className="mb-8">
                  <h4
                    className="text-text-quaternary mb-2 uppercase"
                    style={{
                      fontSize: "var(--typo-h9-size)",
                      lineHeight: "var(--typo-h9-line-height)",
                      fontWeight: "var(--typo-h9-weight)",
                      letterSpacing: "var(--typo-h9-letter-spacing)",
                    }}
                  >
                    Outcomes & metrics
                  </h4>
                  <ul className="space-y-1.5">
                    <BulletItem>–32% time-to-triage critical alerts.</BulletItem>
                    <BulletItem>+18% analyst satisfaction with workflows.</BulletItem>
                  </ul>
                </div>

                {/* CTA */}
                <PortfolioButton asChild variant="primary" size="md">
                  <Link to="/work/securevault">
                    View full case study
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </PortfolioButton>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}