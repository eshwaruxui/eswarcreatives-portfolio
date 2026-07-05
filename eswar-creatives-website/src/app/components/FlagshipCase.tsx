import { useRef } from "react";
import { Link } from "react-router";
import { motion, useInView } from "motion/react";
import { ArrowRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SectionHeader } from "./SectionHeader";
import { Tag } from "./ui/tag";
import { BulletItem } from "./ui/bullet-item";

const CASE_IMG = "/assets/securevault/cover-card.webp";

export function FlagshipCase() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="work" className="pt-1 md:pt-2 pb-10 md:pb-12">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
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
          className="bg-bg-surface rounded-3xl border border-black/[0.08] shadow-lg overflow-hidden"
        >
          <div className="p-2">
            <div className="grid md:grid-cols-2 gap-0">
              {/* Image */}
              <div className="relative rounded-[22px] overflow-hidden bg-bg-muted aspect-[4/3] md:aspect-auto md:h-full md:min-h-[300px]">
                <ImageWithFallback
                  src={CASE_IMG}
                  alt="SecureVault, cut through the noise, catch what matters."
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4">
                  <Tag variant="overlay-dark" size="md">Flagship</Tag>
                </div>
              </div>

              {/* Content */}
              <div className="px-7 py-7 md:px-10 md:pt-7 md:pb-7 flex flex-col justify-between gap-6">
                <div className="flex flex-col gap-4">
                  <h3
                    className="font-heading font-semibold text-text-primary"
                    style={{ fontSize: "var(--ds-text-2xl)", lineHeight: "36px" }}
                  >
                    Reducing alert fatigue in a cybersecurity SaaS platform
                  </h3>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {["Enterprise SaaS", "Cybersecurity", "High-risk / NDA"].map((tag) => (
                      <Tag key={tag} variant="outlined" size="md">{tag}</Tag>
                    ))}
                  </div>

                  {/* Highlights */}
                  <div className="flex flex-col gap-2 pl-2">
                    <h4 className="uppercase font-bold text-text-secondary" style={{ fontSize: "12px", lineHeight: "16px", letterSpacing: "1.14px" }}>
                      Highlights
                    </h4>
                    <ul className="flex flex-col gap-1.5">
                      <BulletItem>
                        Merged 3 tools into a single incident view with risk-based scoring.
                      </BulletItem>
                      <BulletItem>−32% time-to-triage critical alerts.</BulletItem>
                      <BulletItem>+18% analyst satisfaction with workflows.</BulletItem>
                    </ul>
                  </div>
                </div>

                {/* CTA — dark */}
                <Link
                  to="/work/securevault"
                  className="inline-flex w-fit items-center justify-center gap-2 rounded-md bg-bg-inverse px-3 py-2 text-text-inverse no-underline transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  style={{ fontSize: "var(--ds-text-base)" }}
                >
                  View full case study
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
