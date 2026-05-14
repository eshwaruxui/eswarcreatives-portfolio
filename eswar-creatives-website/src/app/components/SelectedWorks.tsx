import { useRef } from "react";
import { Link } from "react-router";
import { motion, useInView } from "motion/react";
import { ArrowRight } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SectionHeader } from "./SectionHeader";
import { Tag } from "./ui/tag";

const MotionLink = motion(Link);

const projects: {
  title: string;
  tags: string[];
  role: string;
  context: string;
  result: string;
  image: string;
  flagship: boolean;
  comingSoon?: boolean;
  href?: string;
}[] = [
  {
    title: "Redesigning the TTX platform end-to-end — room, injects, navigation, and state model",
    tags: ["Enterprise SaaS", "Cybersecurity", "Cross-platform"],
    role: "Lead Product Designer",
    context:
      '"Participants joined from multiple entry points — mobile, web, late to the room — with no common understanding of whether the exercise was running, paused, or already over."',
    result: "Result: −32% median triage time · +18% analyst satisfaction · Shipped across Web, iOS, and Android",
    image: "/assets/ttx/preview/cover.webp",
    flagship: true,
    href: "/work/cygnvs-ttx",
  },
  {
    title: "Streamlining onboarding for a subscription billing platform",
    tags: ["Enterprise SaaS", "Productivity", "Web & Mobile"],
    role: "Product designer",
    context:
      '"Onboarding was fragmented across tools, causing delays and drop-offs."',
    result: "Result: +14% completion rate for new customer onboarding.",
    image:
      "https://images.unsplash.com/photo-1765226410758-9ae3d34cd791?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzYWFzJTIwYmlsbGluZyUyMHBsYXRmb3JtJTIwaW50ZXJmYWNlfGVufDF8fHx8MTc3MzU2MDY3OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
    flagship: false,
    comingSoon: true,
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
    comingSoon: true,
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
            {projects.map((project, i) =>
              project.comingSoon ? (
                <motion.div
                  key={project.title}
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden flex flex-col"
                >
                  {/* Coming soon — image area */}
                  <div
                    className="relative m-2 rounded-xl overflow-hidden"
                    style={{
                      height: 192,
                      background: "#f0eeea",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#9ca3af"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 8, textAlign: "center" }}>
                      Case study coming soon
                    </p>
                  </div>

                  {/* Coming soon — content area */}
                  <div style={{ padding: 20 }}>
                    <div
                      style={{
                        background: "#e8e3dc",
                        borderRadius: 4,
                        height: 16,
                        width: "70%",
                        marginBottom: 12,
                      }}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {["90%", "80%", "60%"].map((w) => (
                        <div
                          key={w}
                          style={{
                            background: "#e8e3dc",
                            borderRadius: 4,
                            height: 10,
                            width: w,
                          }}
                        />
                      ))}
                    </div>
                    <button
                      disabled
                      style={{
                        marginTop: 16,
                        border: "1px solid #e8e3dc",
                        color: "#9ca3af",
                        borderRadius: 8,
                        padding: "8px 16px",
                        fontSize: 13,
                        cursor: "default",
                        background: "transparent",
                        display: "block",
                      }}
                    >
                      In progress →
                    </button>
                  </div>
                </motion.div>
              ) : (
                <MotionLink
                  key={project.title}
                  to={project.href ?? "#!"}
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: i * 0.15 }}
                  className="group bg-white rounded-2xl border border-black/[0.06] overflow-hidden flex flex-col"
                  style={{ textDecoration: "none", color: "inherit", transition: "box-shadow 0.3s, transform 0.3s" }}
                >
                  {/* Image */}
                  <div className="relative h-48 bg-gray-100 overflow-hidden m-2 rounded-xl">
                    <ImageWithFallback
                      src={project.image}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {project.flagship && (
                      <span
                        style={{
                          position: "absolute",
                          top: 12,
                          right: 12,
                          background: "#0d9488",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 20,
                          padding: "3px 10px",
                        }}
                      >
                        Flagship
                      </span>
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

                    {/* CTA — styled div, not a nested anchor */}
                    <div
                      className="mt-auto flex items-center gap-1.5 w-fit rounded-lg border border-black/[0.1] px-3 py-2 text-xs font-medium text-gray-600 group-hover:border-[#0d9488] group-hover:text-[#0d9488] transition-colors duration-200"
                    >
                      View case study
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </MotionLink>
              )
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
