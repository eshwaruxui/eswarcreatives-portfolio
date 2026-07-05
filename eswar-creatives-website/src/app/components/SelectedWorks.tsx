import { useRef } from "react";
import { Link } from "react-router";
import { motion, useInView } from "motion/react";
import { ArrowRight, Lock } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SectionHeader } from "./SectionHeader";
import { Tag } from "./ui/tag";

const MotionLink = motion(Link);

type Project = {
  title: string;
  tags: string[];
  roleLabel: string;
  context: string;
  result: string;
  image: string;
  href: string;
  flagship?: boolean;
};

const projects: Project[] = [
  {
    title: "Redesigning the TTX platform end-to-end, room, injects, navigation, and state",
    tags: ["Enterprise SaaS", "Cybersecurity", "Cross-platform"],
    roleLabel: "Lead Product Designer",
    context:
      '"Participants joined from multiple entry points, mobile, web, late to the room, with no common understanding of whether the exercise was running, paused, or already over."',
    result:
      "−32% median triage time · +18% analyst satisfaction · Shipped across Web, iOS, and Android",
    image: "/assets/ttx/preview/cover.webp",
    href: "/work/cygnvs-ttx",
    flagship: true,
  },
  {
    title: "Design System Audit & Roadmap",
    tags: ["Process case", "Design Systems", "Documentation"],
    roleLabel: "DS Manager",
    context:
      '"Systems don’t fail because of bad components, they fail because of invisible ones. Hard-coded values, no token adoption, and documentation nobody reads."',
    result:
      "First 30 days, token architecture, and documentation strategy for a broken Figma library.",
    image: "/assets/ds-audit/cover.webp",
    href: "/work/ds-audit-roadmap",
  },
];

/** Number of generic "coming soon" placeholders that round the grid out to 3×2. */
const PLACEHOLDERS = 4;

function MetaGroup({ label, body }: { label: string; body: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="uppercase font-bold text-text-primary text-sm" style={{ letterSpacing: "1.14px" }}>
        {label}
      </span>
      <p className="text-text-secondary text-base">{body}</p>
    </div>
  );
}

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
          <SectionHeader
            label="Portfolio"
            title="Selected Works"
            description="Additional projects that show how design for complex SaaS workflows."
          />

          <div className="grid md:grid-cols-3 gap-6">
            {/* Real case studies */}
            {projects.map((project, i) => (
              <MotionLink
                key={project.title}
                to={project.href}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="group flex flex-col rounded-xl border border-border-default bg-bg-surface overflow-hidden no-underline text-inherit transition-shadow duration-300 hover:shadow-md"
              >
                {/* Image */}
                <div className="p-2">
                  <div className="relative h-48 overflow-hidden rounded-md bg-bg-muted">
                    <ImageWithFallback
                      src={project.image}
                      alt={project.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {project.flagship && (
                      <span className="absolute top-3 right-3 rounded-full bg-bg-inverse-subtle px-2 py-1 text-text-inverse text-xs font-medium">
                        Flagship
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-4">
                  <h3 className="truncate font-semibold text-text-primary text-md" style={{ letterSpacing: "-0.31px" }}>
                    {project.title}
                  </h3>

                  <div className="flex flex-wrap gap-1.5">
                    {project.tags.map((tag) => (
                      <Tag key={tag} variant="outlined" size="sm">{tag}</Tag>
                    ))}
                  </div>

                  <div className="flex flex-col gap-4">
                    <MetaGroup label={project.roleLabel} body={project.context} />
                    <MetaGroup label="Result" body={project.result} />
                  </div>

                  {/* CTA — dark */}
                  <div className="mt-auto inline-flex w-fit items-center justify-center gap-1 rounded-md bg-bg-inverse px-2 py-2 text-text-inverse text-xs font-medium transition-transform duration-200 group-hover:-translate-y-0.5">
                    View full case study
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </MotionLink>
            ))}

            {/* Coming-soon placeholders */}
            {Array.from({ length: PLACEHOLDERS }).map((_, i) => (
              <motion.div
                key={`soon-${i}`}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: (projects.length + i) * 0.1 }}
                className="flex flex-col rounded-xl border border-border-default bg-bg-surface overflow-hidden"
              >
                {/* Placeholder image */}
                <div className="p-2">
                  <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-md bg-skeleton-base">
                    <Lock className="w-5 h-5 text-text-muted" />
                    <span className="text-text-muted text-base">Case study coming soon</span>
                  </div>
                </div>

                {/* Placeholder content */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div className="flex flex-col gap-3">
                    <div className="h-4 w-[70%] rounded bg-skeleton-base" />
                    <div className="flex flex-col gap-2">
                      <div className="h-2.5 w-[90%] rounded bg-skeleton-base" />
                      <div className="h-2.5 w-[80%] rounded bg-skeleton-base" />
                      <div className="h-2.5 w-[60%] rounded bg-skeleton-base" />
                    </div>
                  </div>
                  <div className="mt-6 inline-flex w-fit items-center justify-center gap-1 rounded-md border border-border-default bg-bg-surface px-2 py-2 text-text-primary text-xs font-medium opacity-80">
                    View full case study
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
