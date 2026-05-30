import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronRight, ExternalLink, Download } from "lucide-react";
import { motion } from "motion/react";
import { Navbar } from "./Navbar";
import { Tag } from "./ui/tag";
import { PortfolioButton } from "./ui/portfolio-button";
import { useResumeDownload } from "./useResumeDownload";

// ── Inline callout block ─────────────────────────────────────
function Callout({
  label,
  children,
  variant = "teal",
  className = "",
}: {
  label?: string;
  children: React.ReactNode;
  variant?: "teal" | "amber" | "blue";
  className?: string;
}) {
  const styles: Record<string, { border: string; bg: string; borderWidth: string; italic: boolean }> = {
    teal:  { border: "#0d9488", bg: "#f0faf9",  borderWidth: "4px", italic: false },
    amber: { border: "#c47a5e", bg: "#fdf6f0",  borderWidth: "3px", italic: true  },
    blue:  { border: "#1773D1", bg: "#eff6ff",  borderWidth: "4px", italic: false },
  };
  const { border, bg, borderWidth, italic } = styles[variant];
  return (
    <div
      className={`rounded-r-xl px-5 py-4 ${className}`}
      style={{ borderLeft: `${borderWidth} solid ${border}`, background: bg }}
    >
      {label && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-400 mb-2">
          {label}
        </p>
      )}
      <div
        className={`leading-relaxed${italic ? " italic" : ""}`}
        style={{ color: "#1a1a1a", fontSize: "var(--typo-p-base-size)", lineHeight: "var(--typo-p-base-line-height)" }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Section progress nav data ─────────────────────────────────
const CS_SECTIONS = [
  { id: "cs-brief",      label: "Quick Brief",  num: "01" },
  { id: "cs-problem",    label: "The Problem",  num: "02" },
  { id: "cs-approach",   label: "The Approach", num: "03" },
  { id: "cs-result",     label: "The Result",   num: "04" },
  { id: "cs-learning",   label: "Learning",     num: "05" },
];

// ── Case section layout ──────────────────────────────────────
function CsSection({
  num,
  title,
  children,
  id,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="border-t border-[#d4cfc8] py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid md:grid-cols-[200px_1fr] gap-8 md:gap-14">
          <div className="flex-shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-2">{num}</p>
            <h2
              className="text-gray-900 font-semibold md:sticky md:top-24"
              style={{
                fontSize: "var(--typo-h3-size)",
                lineHeight: "var(--typo-h3-line-height)",
                letterSpacing: "var(--typo-h3-letter-spacing)",
              }}
            >
              {title}
            </h2>
          </div>
          <div className="min-w-0 space-y-0">{children}</div>
        </div>
      </div>
    </section>
  );
}

// ── Section body heading ──────────────────────────────────────
function BH({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-gray-900 font-semibold mt-8 mb-3 first:mt-0"
      style={{ fontSize: "var(--typo-ol-body-semi-size)", lineHeight: "1.4" }}
    >
      {children}
    </h3>
  );
}

// ── Body paragraph ───────────────────────────────────────────
function BP({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-gray-600 mb-4 last:mb-0"
      style={{
        fontSize: "var(--typo-p-base-size)",
        lineHeight: "var(--typo-p-base-line-height)",
      }}
    >
      {children}
    </p>
  );
}

// ── Numbered step card (vertical) ────────────────────────────
function StepCard({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-white rounded-2xl p-6 md:p-7"
      style={{ border: "1px solid #d4cfc8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-start gap-4">
        <div
          className="rounded-full text-white flex items-center justify-center flex-shrink-0"
          style={{ width: 32, height: 32, background: "#1773D1", fontSize: 13, fontWeight: 700 }}
        >
          {num}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="font-semibold leading-snug mb-3"
            style={{ fontSize: "var(--typo-ol-body-semi-size)", lineHeight: "1.4", color: "#1a1a1a" }}
          >
            {title}
          </p>
          <div className="text-gray-600 leading-relaxed" style={{ fontSize: "var(--typo-p-base-size)", lineHeight: "var(--typo-p-base-line-height)" }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export function DsAuditCaseStudy() {
  const [activeSection, setActiveSection] = useState<string>("");
  const { handleDownload, isDownloading } = useResumeDownload();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    document.title = "Design System Audit & Roadmap — Case Study · Eswar";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "A structured 30-day plan to take a broken Figma library from zero trust to full adoption — token architecture, Figma-to-code handoff, and documentation strategy."
      );
    }
    const prevBg = document.documentElement.style.background;
    document.documentElement.style.background = "#f5f3f0";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = prevBg;
      document.body.style.background = "";
    };
  }, []);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    CS_SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveSection(id); },
        { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "#f5f3f0", fontFamily: "var(--font-family-primary)" }}
    >
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────── */}
      <header className="pt-20 md:pt-24">
        <div className="max-w-5xl mx-auto px-6 pb-14 md:pb-16" style={{ borderBottom: "1px solid #d4cfc8" }}>

          {/* Breadcrumb */}
          <nav
            className="flex items-center gap-1.5 text-gray-400 mb-6 pt-6 md:pt-8"
            aria-label="Breadcrumb"
            style={{ fontSize: "var(--typo-p-xs-size)" }}
          >
            <Link to="/#work" className="hover:text-gray-700 transition-colors">
              Work
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-600 font-medium">Design System Audit &amp; Roadmap</span>
          </nav>

          {/* Context badge — teal pill */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="inline-flex items-center gap-2 mb-6"
            style={{
              background: "#EAF3F3",
              color: "#024C4F",
              borderRadius: "999px",
              padding: "6px 14px",
              fontFamily: "Inter, var(--font-family-primary), sans-serif",
              fontSize: "12px",
              fontWeight: 500,
              lineHeight: "1.4",
            }}
            role="note"
          >
            <span aria-hidden="true">●</span>
            <span>Process case study — no client data. Based on a DS Manager assignment brief.</span>
          </motion.div>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2 mb-6">
            {["Design Systems", "Token Architecture", "Documentation", "Cross-platform"].map((t) => (
              <Tag key={t} variant="outlined" size="md">{t}</Tag>
            ))}
          </div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-gray-900 mb-5"
            style={{
              fontSize: "clamp(26px, 4vw, 46px)",
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              maxWidth: "820px",
            }}
          >
            Design System Audit &amp;{" "}
            <span style={{ color: "#1773D1", fontStyle: "italic", fontWeight: 600 }}>Roadmap</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-gray-600 mb-10"
            style={{
              fontSize: "var(--typo-ol-body-size)",
              lineHeight: "var(--typo-ol-body-line-height)",
              maxWidth: "640px",
            }}
          >
            A structured, actionable plan to take a broken Figma library from zero trust to
            full adoption — the first 30 days, Figma-to-code handoff, and documentation
            strategy.
          </motion.p>

          {/* Role strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap gap-8 pt-8"
            style={{ borderTop: "1px solid #d4cfc8" }}
          >
            {[
              { key: "Role",   val: "DS Manager Assignment" },
              { key: "Format", val: "Figma · Notion · Storybook" },
              { key: "Scope",  val: "30-day roadmap · Token architecture · Docs strategy" },
              { key: "Output", val: "Audit framework · Implementation plan · Doc system" },
            ].map((r) => (
              <div key={r.key}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-400 mb-1">
                  {r.key}
                </p>
                <p className="text-gray-700 font-medium" style={{ fontSize: "var(--typo-p-xs-size)" }}>
                  {r.val}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </header>

      {/* ── SECTION PROGRESS NAV ──────────────────────────── */}
      <nav
        className="sticky z-40 bg-white/95 backdrop-blur-sm"
        style={{ top: 57, borderBottom: "1px solid #d4cfc8" }}
        aria-label="Case study sections"
      >
        <div className="max-w-5xl mx-auto px-6 overflow-x-auto">
          <div className="flex min-w-max">
            {CS_SECTIONS.map(({ id, label, num }) => {
              const isActive = activeSection === id;
              return (
                <a
                  key={id}
                  href={`#${id}`}
                  className={`flex items-center gap-2 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] border-b-2 transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? "border-[#0d9488] text-[#0d9488]"
                      : "border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className={isActive ? "text-[#0d9488]" : "text-gray-300"}>{num}</span>
                  {label}
                </a>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ── SECTION 01: QUICK BRIEF ───────────────────────── */}
      <CsSection id="cs-brief" num="01" title="Quick Brief">
        {/* Three outcome cards */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-2xl overflow-hidden"
          style={{ background: "#d4cfc8", border: "1.5px solid #d4cfc8" }}
        >
          {[
            { val: "30 days", label: "Time-to-trust roadmap" },
            { val: "3-tier",  label: "Token architecture (primitive → semantic → component)" },
            { val: "Zero",    label: "Hard-coded values in stable components" },
          ].map((m) => (
            <div key={m.label} className="bg-white px-6 py-6">
              <p
                className="font-bold mb-1.5"
                style={{ fontSize: "clamp(26px, 3vw, 36px)", lineHeight: 1, color: "#1a1a1a", fontWeight: 700 }}
              >
                {m.val}
              </p>
              <p
                className="leading-snug"
                style={{ fontSize: "12px", lineHeight: "1.4", color: "#5a5550" }}
              >
                {m.label}
              </p>
            </div>
          ))}
        </div>

        {/* Pull quote */}
        <div
          className="relative mt-8 mb-2"
          style={{
            background: "#ffffff",
            border: "1px solid #d4cfc8",
            borderLeft: "3px solid #1773D1",
            borderRadius: "0 10px 10px 0",
            padding: "22px 24px",
          }}
        >
          <span
            className="text-gray-200 absolute top-3 left-4 text-5xl leading-none select-none font-serif"
            aria-hidden="true"
          >
            "
          </span>
          <p
            className="pl-6 leading-relaxed"
            style={{ color: "#1a1a1a", fontStyle: "italic", fontSize: "17px", lineHeight: "1.6" }}
          >
            The real problem isn't broken components — it's invisible ones. Teams stop using
            a design system when they can't trust it. My first 30 days are about earning
            trust through quick, visible fixes, not a six-week audit report nobody reads.
          </p>
        </div>
      </CsSection>

      {/* ── SECTION 02: THE PROBLEM ───────────────────────── */}
      <CsSection id="cs-problem" num="02" title="The Problem">
        <BH>What a broken design system actually looks like</BH>
        <BP>
          I've rebuilt a design system from scratch at CYGNVS — cross-platform (Web / iOS /
          Android). The recurring pattern: systems don't fail because of bad components,
          they fail because of invisible ones. Hard-coded hex values, raw spacing numbers,
          no token adoption, documentation nobody reads, and engineers who stopped trusting
          Figma three sprints ago.
        </BP>

        <BH>Three failure modes</BH>
        <div className="grid sm:grid-cols-3 gap-3 mt-3">
          {[
            {
              num: "1",
              label: "Token adoption gap",
              body: "Hard-coded hex values, raw spacing numbers, and inline font sizes scattered across components. Figma Analytics reveals the true scale.",
            },
            {
              num: "2",
              label: "Invisible broken components",
              body: "Teams build workarounds rather than flag issues. The system appears stable while quietly diverging from production.",
            },
            {
              num: "3",
              label: "Documentation nobody reads",
              body: "Written for completeness, not for the person searching at 11 PM with a deadline. No clear reader type, no rationale, no ownership.",
            },
          ].map((c) => (
            <div
              key={c.num}
              className="bg-white rounded-xl px-4 py-4"
              style={{ border: "1px solid #d4cfc8", borderLeft: "4px solid #1773D1", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-400 mb-1.5">
                Failure mode {c.num}
              </p>
              <p className="font-semibold text-gray-900 mb-1.5" style={{ fontSize: "13px" }}>
                {c.label}
              </p>
              <p className="text-gray-600 leading-relaxed" style={{ fontSize: "var(--typo-p-xs-size)", lineHeight: "1.6" }}>
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </CsSection>

      {/* ── SECTION 03: THE APPROACH ──────────────────────── */}
      <CsSection id="cs-approach" num="03" title="The Approach">
        <BH>First 30 days — earn trust, then scale</BH>
        <BP>
          Rather than disappearing for a month and re-emerging with "v2," I fix P1 issues in
          the live library with a clear changelog, open a #design-system Slack channel, and
          make progress visible weekly.
        </BP>

        <div className="space-y-4 mt-6">
          <StepCard num="1" title="Audit fast (Week 1)">
            <p className="mb-3">Two parallel tracks:</p>
            <ul className="space-y-2 mb-4" style={{ paddingLeft: "1.1em" }}>
              <li style={{ listStyle: "disc" }}>
                <strong className="text-gray-800">Figma Analytics + codebase scan:</strong>{" "}
                how many hard-coded hex values, raw spacing numbers, or inline font sizes
                exist? This reveals the true "token adoption gap."
              </li>
              <li style={{ listStyle: "disc" }}>
                <strong className="text-gray-800">20-minute interviews</strong> with 3–4
                designers and 2 engineers. Question: "What's the one thing in the system
                that costs you the most time?" Listen for patterns, not feature requests.
              </li>
            </ul>
            <p className="mb-3">
              Score every issue against two axes:{" "}
              <strong className="text-gray-800">frequency and effort.</strong>{" "}
              High-frequency, low-effort issues become Week 3 fixes. Everything else gets
              sequenced.
            </p>
            <p>
              Critically: map each issue to its Atomic level — is this broken at the
              token/atom level, or a molecule/organism that's only broken because its
              underlying atom is wrong? Fixing a token fixes every component that inherits it.
            </p>
          </StepCard>

          <StepCard num="2" title="Ship tokens before components (Week 2–3)">
            <p className="mb-3">Three-tier token architecture:</p>
            <ul className="space-y-1.5 mb-4" style={{ paddingLeft: "1.1em" }}>
              <li style={{ listStyle: "disc" }}>
                <strong className="text-gray-800">Primitive:</strong>{" "}
                <code style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "13px", color: "#1773D1" }}>
                  color.primitive.B500 = #1773D1
                </code>
              </li>
              <li style={{ listStyle: "disc" }}>
                <strong className="text-gray-800">Semantic:</strong>{" "}
                <code style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "13px", color: "#1773D1" }}>
                  color.semantic.surface.default → color.primitive.B500
                </code>
              </li>
              <li style={{ listStyle: "disc" }}>
                <strong className="text-gray-800">Component:</strong>{" "}
                <code style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "13px", color: "#1773D1" }}>
                  color.component.button.bg.primary → color.semantic.surface.default
                </code>
              </li>
            </ul>

            <p className="mb-2">Output per platform:</p>
            <pre
              className="overflow-x-auto rounded-lg p-4 mb-4"
              style={{
                background: "#0f172a",
                color: "#e2e8f0",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                fontSize: "13px",
                lineHeight: "1.65",
              }}
            >
              <code>
                <span style={{ color: "#7dd3c0" }}>{"// CSS"}</span>{"\n"}
                <span style={{ color: "#cbd5e1" }}>{"--ds-button-bg-primary: "}</span>
                <span style={{ color: "#93c5fd" }}>{"#1773D1"}</span>
                <span style={{ color: "#cbd5e1" }}>{";"}</span>{"\n\n"}
                <span style={{ color: "#7dd3c0" }}>{"// Swift"}</span>{"\n"}
                <span style={{ color: "#cbd5e1" }}>{"DSColor."}</span>
                <span style={{ color: "#fcd34d" }}>{"buttonBgPrimary"}</span>
              </code>
            </pre>

            <p>
              <strong className="text-gray-800">Verifying developer implementation:</strong>{" "}
              visual QA session with Figma frame and live build side-by-side, plus a token
              audit script that confirms no hard-coded values remain. Run before every
              component is marked "stable."
            </p>
          </StepCard>

          <StepCard num="3" title="Fix high-impact components (Week 3–4)">
            <p>
              <strong className="text-gray-800">Before "shipped" checklist:</strong> token
              parity, responsive breakpoints, dark mode, keyboard a11y, motion. No
              exceptions — a component without documentation is "beta," not "stable."
            </p>
          </StepCard>

          <StepCard num="4" title="Atomic structure as shared mental model">
            <p className="mb-4">
              Atomic Design isn't just a filing system — it's a shared mental model. When
              designers and engineers use the same vocabulary (atoms, molecules, organisms),
              handoffs shrink, reviews get faster, and contribution guidelines write themselves.
            </p>

            <div
              className="overflow-x-auto rounded-lg overflow-hidden bg-white"
              style={{ border: "1px solid #d4cfc8" }}
            >
              <table className="w-full border-collapse" style={{ fontFamily: "Inter, var(--font-family-primary), sans-serif" }}>
                <thead>
                  <tr style={{ background: "#f0ede8", borderBottom: "2px solid #d4cfc8" }}>
                    {["Atomic level", "Contents", "Audit focus"].map((h) => (
                      <th
                        key={h}
                        className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      level: "Foundations / Atoms",
                      contents: "Tokens, typography, spacing, icons, single button, input field",
                      focus: "Token consistency",
                    },
                    {
                      level: "Molecules",
                      contents: "Search bar, form field — simple testable combos",
                      focus: "Composition",
                    },
                    {
                      level: "Organisms",
                      contents: "Nav bar, data table, card grid",
                      focus: "Responsive behaviour",
                    },
                    {
                      level: "Templates / Pages",
                      contents: "Dashboards, forms, empty states — usage guidelines only",
                      focus: "Handoff boundary",
                    },
                  ].map((row, i) => (
                    <tr
                      key={i}
                      className="last:border-0"
                      style={{ borderBottom: "1px solid #e8e3dc", fontSize: "13px" }}
                    >
                      <td className="py-3 px-4 font-semibold align-top" style={{ color: "#1a1a1a" }}>
                        {row.level}
                      </td>
                      <td className="py-3 px-4 align-top" style={{ color: "#5a5550" }}>
                        {row.contents}
                      </td>
                      <td className="py-3 px-4 align-top font-medium" style={{ color: "#1773D1" }}>
                        {row.focus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </StepCard>
        </div>
      </CsSection>

      {/* ── SECTION 04: THE RESULT ────────────────────────── */}
      <CsSection id="cs-result" num="04" title="The Result">
        <BH>Documentation strategy</BH>
        <BP>
          Documentation fails when it's written for completeness, not for the person
          searching at 11 PM with a deadline. I write for two reader types: the designer
          asking <em>"when do I use this?"</em> and the engineer asking{" "}
          <em>"how do I build this?"</em>
        </BP>

        {/* 3-column structure card */}
        <div className="grid md:grid-cols-3 gap-3 mt-6">
          {[
            {
              label: "Foundations",
              body: "Tokens, typography scale, colour system, spacing, motion principles. The “why” behind every visual decision.",
            },
            {
              label: "Components (Molecules & Organisms)",
              body: "Anatomy, states, usage do/don't, props/variants, a11y notes, code snippet. Each page declares its Atomic level and links to consuming organisms.",
            },
            {
              label: "Patterns (Templates & Pages)",
              body: "“Use a ghost button when the action is secondary to the primary CTA on the same surface” — not “A ghost button has a transparent background.” Every rule has a rationale.",
            },
          ].map((c) => (
            <div
              key={c.label}
              className="bg-white rounded-xl p-5"
              style={{ border: "1px solid #d4cfc8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-400 mb-2">
                Doc layer
              </p>
              <p className="font-semibold text-gray-900 mb-2" style={{ fontSize: "14px" }}>
                {c.label}
              </p>
              <p className="text-gray-600 leading-relaxed" style={{ fontSize: "var(--typo-p-xs-size)", lineHeight: "1.6" }}>
                {c.body}
              </p>
            </div>
          ))}
        </div>

        {/* Dual-tool approach */}
        <Callout label="Dual-tool approach" variant="blue" className="my-6">
          <p className="mb-2">
            <strong className="text-gray-900">Notion</strong> hosts decision logs, principles,
            and visual usage guidance — the "why" layer Storybook can't carry.
          </p>
          <p>
            A Storybook component page links to Notion rationale. A Notion component page
            links to the live Storybook story.
          </p>
        </Callout>

        {/* Quality gates */}
        <BH>Quality gates</BH>
        <ul className="space-y-2 mt-2" style={{ paddingLeft: "1.1em" }}>
          <li style={{ listStyle: "disc", color: "#5a5550", fontSize: "var(--typo-p-base-size)", lineHeight: "var(--typo-p-base-line-height)" }}>
            A component without documentation is{" "}
            <strong className="text-gray-900">not "stable" — it's "beta."</strong> No exceptions.
          </li>
          <li style={{ listStyle: "disc", color: "#5a5550", fontSize: "var(--typo-p-base-size)", lineHeight: "var(--typo-p-base-line-height)" }}>
            <strong className="text-gray-900">Quarterly doc review sprint:</strong> every
            component page has a one-click "Flag as outdated" link that creates a Jira ticket.
          </li>
        </ul>
      </CsSection>

      {/* ── SECTION 05: LEARNING ──────────────────────────── */}
      <CsSection id="cs-learning" num="05" title="Learning">
        <BH>What I'd do differently</BH>
        <BP>
          A roadmap is a hypothesis. These are the three calls I'd revisit if I were briefed
          on a new system tomorrow.
        </BP>

        <div className="space-y-4 my-6">
          {[
            {
              num: "1",
              title: "Start with engineer pain, not designer pain",
              body: "The token adoption gap is always wider on the engineering side. I'd run the codebase scan before the designer interviews — it reframes every conversation that follows.",
            },
            {
              num: "2",
              title: "Ship a “system health” dashboard on day 1",
              body: "A visible, auto-updating metric (% token adoption, % components documented) changes the team's relationship with the system. Progress you can see compounds faster than progress you report in a slide deck.",
            },
            {
              num: "3",
              title: "Contribution model needs teeth, not guidelines",
              body: "“Anyone can contribute” doesn't work without a clear review SLA and an owner for each Atomic level. I'd assign molecule/organism ownership in week 1, not week 6.",
            },
          ].map((p) => (
            <div
              key={p.num}
              className="bg-white rounded-xl p-5 flex items-start gap-4"
              style={{ border: "1px solid #d4cfc8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <div
                className="rounded-full text-white flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ width: 28, height: 28, background: "#c47a5e", fontSize: 13, fontWeight: 700 }}
              >
                {p.num}
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1.5" style={{ fontSize: "var(--typo-ol-body-semi-size)" }}>
                  {p.title}
                </p>
                <p className="text-gray-600 leading-relaxed" style={{ fontSize: "var(--typo-p-xs-size)", lineHeight: "1.6" }}>
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CsSection>

      {/* ── FOOTER CTA ────────────────────────────────────── */}
      <div className="py-16 md:py-20 bg-white" style={{ borderTop: "1px solid #d4cfc8" }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h3
            className="text-gray-900 font-semibold mb-3"
            style={{ fontSize: "var(--typo-h3-size)", lineHeight: "var(--typo-h3-line-height)" }}
          >
            Want to see how this applies to your system?
          </h3>
          <p
            className="text-gray-500 mb-8 max-w-lg mx-auto"
            style={{ fontSize: "var(--typo-p-base-size)", lineHeight: "var(--typo-p-base-line-height)" }}
          >
            Happy to walk through the audit framework, token architecture, or documentation
            model in detail — and to talk through how this would apply to your library.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <PortfolioButton
              href="https://calendly.com/eswarcreatives/25-min-intro-call"
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              size="lg"
            >
              Book a 30-min intro
              <ExternalLink className="w-4 h-4" />
            </PortfolioButton>
            <PortfolioButton
              href="/Eswar-AI-Native-UX-Lead-2026.pdf"
              onClick={handleDownload}
              variant="secondary"
              size="lg"
              loading={isDownloading}
            >
              Download Resume
              <Download className="w-4 h-4" />
            </PortfolioButton>
            <PortfolioButton asChild variant="secondary" size="lg">
              <Link to="/contact">
                Contact Eswar
                <ArrowRight className="w-4 h-4" />
              </Link>
            </PortfolioButton>
          </div>
        </div>
      </div>
    </div>
  );
}
