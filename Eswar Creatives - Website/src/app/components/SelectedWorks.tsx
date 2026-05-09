import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { ArrowRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SectionHeader } from "./SectionHeader";
import { Tag } from "./ui/tag";
import { PortfolioButton } from "./ui/portfolio-button";

const projects = [
  {
    title: "Streamlining onboarding for a subscription billing platform",
    tags: ["Enterprise SaaS", "Productivity", "Web & Mobile"],
    role: "Product designer",
    context:
      '"Onboarding was fragmented across tools, causing delays and drop-offs."',
    result: "Result: +14% completion rate for new customer onboarding.",
    image:
      "https://images.unsplash.com/photo-1765226410758-9ae3d34cd791?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWFzJTIwYmlsbGluZyUyMHBsYXRmb3JtJTIwaW50ZXJmYWNlfGVufDF8fHx8MTc3MzU2MDY3OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    flagship: true,
  },
  {
    title: "Redesigning workflow automation for operations teams",
    tags: ["Enterprise SaaS", "Operations", "Web"],
    role: "Product designer",
    context:
      '"Teams were juggling multiple tools with no unified view of task status."',
    result: "Result: +22% task completion speed across global SOC teams.",
    image:
      "https://images.unsplash.com/photo-1562577309-d67db487e6cd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbnRlcnByaXNlJTIwd29ya2Zsb3clMjBhdXRvbWF0aW9uJTIwc29mdHdhcmV8ZW58MXx8fHwxNzczNTYwNjc5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    flagship: false,
  },
  {
    title: "Building an analytics dashboard for data-driven decisions",
    tags: ["Enterprise SaaS", "Analytics", "Web"],
    role: "Product designer",
    context:
      '"Stakeholders lacked real-time visibility into key performance metrics."',
    result: "Result: –28% time spent searching for actionable insights.",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXRhJTIwYW5hbHl0aWNzJTIwZGFzaGJvYXJkJTIwZGVzaWdufGVufDF8fHx8MTc3MzU2MDY3OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    flagship: false,
  },
];

export function SelectedWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

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
          <SectionHeader
            label="Portfolio"
            title="Selected Works"
            description="Additional projects that show how design for complex SaaS workflows."
          />

          <div className="grid md:grid-cols-3 gap-6">
            {projects.map((project, i) => (
              <motion.div
                key={project.title}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="group bg-white rounded-2xl border border-black/[0.06] hover:border-black/[0.12] shadow-none hover:shadow-xl hover:shadow-black/[0.06] transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col"
              >
                {/* Image */}
                <div className="relative h-48 bg-gray-100 overflow-hidden m-2 rounded-xl">
                  <ImageWithFallback
                    src={project.image}
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {project.flagship && (
                    <Tag variant="overlay-light" size="md" className="absolute top-3 right-3">
                      Flagship
                    </Tag>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 pt-4 flex flex-col flex-1">
                  {/* Title */}
                  <h3
                    className="text-text-primary mb-3"
                    style={{
                      fontSize: "var(--typo-ol-body-semi-size)",
                      lineHeight: "var(--typo-ol-body-semi-line-height)",
                      fontWeight: "var(--typo-ol-body-semi-weight)",
                      letterSpacing: "var(--typo-ol-body-semi-letter-spacing)",
                    }}
                  >
                    {project.title}
                  </h3>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {project.tags.map((tag) => (
                      <Tag key={tag} variant="outlined" size="sm">{tag}</Tag>
                    ))}
                  </div>

                  {/* Meta group — role + context + result tightly grouped */}
                  <div className="space-y-2 mb-5">
                    <p
                      className="text-text-quaternary uppercase"
                      style={{
                        fontSize: "var(--typo-h9-size)",
                        lineHeight: "var(--typo-h9-line-height)",
                        fontWeight: "var(--typo-h9-weight)",
                        letterSpacing: "var(--typo-h9-letter-spacing)",
                      }}
                    >
                      {project.role}
                    </p>
                    <p
                      className="text-text-tertiary italic"
                      style={{
                        fontSize: "var(--typo-p-xs-size)",
                        lineHeight: "var(--typo-p-xs-line-height)",
                        fontWeight: "var(--typo-p-xs-weight)",
                      }}
                    >
                      {project.context}
                    </p>
                    <p
                      className="text-text-secondary"
                      style={{
                        fontSize: "var(--typo-h8m-size)",
                        lineHeight: "var(--typo-h8m-line-height)",
                        fontWeight: "var(--typo-h8m-weight)",
                      }}
                    >
                      {project.result}
                    </p>
                  </div>

                  {/* CTA */}
                  <PortfolioButton
                    href="#!"
                    variant="secondary"
                    size="sm"
                    className="mt-auto rounded-lg"
                  >
                    View case study
                    <ArrowRight className="w-3 h-3" />
                  </PortfolioButton>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}