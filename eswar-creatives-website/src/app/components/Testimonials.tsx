import { useState, useRef, useEffect, useCallback } from "react";
import { motion, useInView } from "motion/react";
import { Quote } from "lucide-react";
import { SectionHeader } from "./SectionHeader";
import { Tag } from "./ui/tag";
import { AccentBar } from "./ui/accent-bar";

import kevinAvatar from "figma:asset/5ee03f7486adfebe6b0fe3e143bfd9dc5d3b92ec.png";
import michaelAvatar from "figma:asset/e0ab91900f0120ab7e2513447afe28d28fc12669.png";
import yuliAvatar from "figma:asset/34300ee8328fba57b01edb6d8c565580e891db48.png";

const testimonials = [
  {
    quote:
      "Eswar was the sole mobile designer supporting both our iOS and Android apps for over two and a half years. He took full ownership of our mobile design system, building and refining it with real care. Thoughtful and considerate, he balanced user needs, platform constraints, and engineering realities with clarity, reliability, and attention to detail.",
    name: "Kevin Gaffney",
    role: "Chief Technology Officer – CYGNVS",
    tags: ["Mobile Design", "Design Systems"],
    avatar: kevinAvatar,
  },
  {
    quote:
      "Eswar collaborates smoothly across Product and Engineering, turning vague ideas into clear plans the whole team can execute on. He brings strong systems thinking and obsessive attention to detail, building design systems that stay robust in real use. I've always found him reliable and proactive, often going the extra mile to keep projects moving without sacrificing quality.",
    name: "Michael Rickard",
    role: "Design Manager – CYGNVS",
    tags: ["Enterprise SaaS", "Cybersecurity"],
    avatar: michaelAvatar,
  },
  {
    quote:
      "Eswar's designs consistently demonstrated exceptional attention to detail and a commitment to thoughtful, high-quality experiences. His willingness to explore ideas deeply and offer well-reasoned perspectives stood out — his curiosity, creativity, and clarity of thought raised the bar for the product. Any team would benefit from his blend of craft, thoughtfulness, and initiative.",
    name: "Yuli Mitsner",
    role: "Principal Product Manager – CYGNVS",
    tags: ["Mobile Design", "Product Design"],
    avatar: yuliAvatar,
  },
];

export function Testimonials() {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  const next = useCallback(() => {
    setActive((prev) => (prev + 1) % testimonials.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [isPaused, next]);

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
          <SectionHeader label="Social Proof" title="What design leaders say" />

          {/* Two-column layout: Quote card (left) + Side nav (right) */}
          <div
            className="grid md:grid-cols-[1fr_280px] gap-6"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Left — Active Quote Card */}
            <div className="bg-bg-surface rounded-3xl border border-gold-200 shadow-lg p-8 md:p-12 flex flex-col justify-between min-h-[340px]">
              <div>
                <Quote className="w-7 h-7 text-text-disabled mb-6" />

                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  <p
                    className="text-text-primary mb-8"
                    style={{
                      fontSize: "var(--typo-p-lg-size)",
                      lineHeight: "var(--typo-p-lg-line-height)",
                      fontWeight: "var(--typo-p-lg-weight)",
                    }}
                  >
                    &ldquo;{testimonials[active].quote}&rdquo;
                  </p>
                </motion.div>
              </div>

              {/* Attribution */}
              <motion.div
                key={`attr-${active}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="flex items-center gap-3 pt-6 border-t border-border-default"
              >
                <img
                  src={testimonials[active].avatar}
                  alt={testimonials[active].name}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
                <div>
                  <p
                    className="text-text-primary"
                    style={{
                      fontSize: "var(--typo-btn-semi-size)",
                      lineHeight: "var(--typo-btn-semi-line-height)",
                      fontWeight: "var(--typo-btn-semi-weight)",
                    }}
                  >
                    {testimonials[active].name}
                  </p>
                  <p
                    className="text-text-quaternary"
                    style={{
                      fontSize: "var(--typo-caption-r-size)",
                      lineHeight: "var(--typo-caption-r-line-height)",
                      fontWeight: "var(--typo-caption-r-weight)",
                    }}
                  >
                    {testimonials[active].role}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 ml-auto">
                  {testimonials[active].tags.map((tag) => (
                    <Tag key={tag} variant="outlined" size="md">{tag}</Tag>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Right — Side Navigation List */}
            <div className="flex flex-col gap-2">
              {testimonials.map((t, i) => (
                <button
                  key={t.name}
                  onClick={() => setActive(i)}
                  className={`relative text-left rounded-2xl border p-5 transition-all duration-300 cursor-pointer group ${
                    i === active
                      ? "bg-bg-surface border-gold-400 shadow-md"
                      : "bg-transparent border-transparent hover:bg-bg-subtle hover:border-border-subtle"
                  }`}
                >
                  {/* Accent bar */}
                  <div className="absolute left-0 top-4 bottom-4">
                    <AccentBar active={i === active} />
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className={`w-9 h-9 rounded-full object-cover shrink-0 transition-opacity duration-300 ${
                        i === active ? "opacity-100" : "opacity-70 group-hover:opacity-100"
                      }`}
                    />
                    <div>
                      <p
                        className={`transition-colors duration-300 ${
                          i === active ? "text-text-primary" : "text-text-tertiary"
                        }`}
                        style={{
                          fontSize: "var(--typo-btn-semi-size)",
                          lineHeight: "var(--typo-btn-semi-line-height)",
                          fontWeight: "var(--typo-btn-semi-weight)",
                        }}
                      >
                        {t.name}
                      </p>
                      <p
                        className="text-text-quaternary"
                        style={{
                          fontSize: "var(--typo-h8-size)",
                          lineHeight: "var(--typo-h8-line-height)",
                          fontWeight: "var(--typo-h8-weight)",
                        }}
                      >
                        {t.role}
                      </p>
                    </div>
                  </div>

                  {/* Preview snippet — only for inactive items */}
                  {i !== active && (
                    <p
                      className="text-text-quaternary pl-12 line-clamp-2"
                      style={{
                        fontSize: "var(--typo-p-xs-size)",
                        lineHeight: "var(--typo-p-xs-line-height)",
                        fontWeight: "var(--typo-p-xs-weight)",
                      }}
                    >
                      &ldquo;{t.quote.slice(0, 80)}&hellip;&rdquo;
                    </p>
                  )}

                  {/* Tags — only for active item */}
                  {i === active && (
                    <div className="flex flex-wrap gap-1.5 pl-12 mt-1">
                      {t.tags.map((tag) => (
                        <Tag key={tag} variant="filled" size="sm">{tag}</Tag>
                      ))}
                    </div>
                  )}
                </button>
              ))}

              {/* LinkedIn link */}
              <a
                href="#!"
                className="mt-2 text-text-quaternary hover:text-text-secondary transition-colors text-center"
                style={{
                  fontSize: "var(--typo-h8m-size)",
                  lineHeight: "var(--typo-h8m-line-height)",
                  fontWeight: "var(--typo-h8m-weight)",
                }}
              >
                Read full testimonials on LinkedIn →
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}