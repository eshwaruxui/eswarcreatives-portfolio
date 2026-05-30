import { useEffect } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronRight, ExternalLink, Download } from "lucide-react";
import { motion } from "motion/react";
import { Navbar } from "./Navbar";
import { Tag } from "./ui/tag";
import { PortfolioButton } from "./ui/portfolio-button";
import { useResumeDownload } from "./useResumeDownload";

// ── Main component ───────────────────────────────────────────
export function DsAuditCaseStudy() {
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
        "A structured 30-day plan to take a broken Figma library from zero trust to full adoption — atomic foundation, token architecture, Figma-to-code handoff, and documentation strategy."
      );
    }
    const prevBg = document.documentElement.style.background;
    document.documentElement.style.background = "#ffffff";
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = prevBg;
      document.body.style.background = "";
    };
  }, []);

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "#ffffff", fontFamily: "var(--font-family-primary)" }}
    >
      <Navbar />

      {/* ══════════════════════════════════════════════════════
          SECTION 1 — COVER
          ══════════════════════════════════════════════════════ */}
      <header className="pt-20 md:pt-24">
        <div className="max-w-5xl mx-auto px-6 pb-16 md:pb-20">

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

          {/* Context badge */}
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
            <span>Process case study — based on a DS Manager assignment brief</span>
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
              fontSize: "clamp(28px, 4.4vw, 50px)",
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              maxWidth: "880px",
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

      {/* ══════════════════════════════════════════════════════
          SECTION 2 — THE FOUNDATION  (light teal bg)
          ══════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24" style={{ background: "#EAF3F3" }}>
        <div className="max-w-5xl mx-auto px-6">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3"
            style={{ color: "#024C4F", opacity: 0.7 }}
          >
            The Foundation
          </p>
          <h2
            className="mb-8"
            style={{
              fontSize: "clamp(26px, 3.6vw, 40px)",
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "#0A1A1B",
              maxWidth: "780px",
            }}
          >
            Atomic Design — not just a filing system
          </h2>

          {/* Pull quote — full width */}
          <blockquote
            className="mb-12"
            style={{
              fontSize: "clamp(18px, 1.9vw, 24px)",
              lineHeight: 1.45,
              color: "#024C4F",
              fontStyle: "italic",
              borderLeft: "3px solid #024C4F",
              paddingLeft: "20px",
              maxWidth: "960px",
            }}
          >
            "Atomic Design isn't just a filing system — it's a shared mental model. When
            designers and engineers use the same vocabulary, handoffs shrink, reviews get
            faster, and contribution guidelines write themselves."
          </blockquote>

          {/* Atomic table */}
          <div className="overflow-x-auto -mx-1 px-1">
            <table
              className="w-full"
              style={{
                borderCollapse: "collapse",
                fontFamily: "Inter, var(--font-family-primary), sans-serif",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid #024C4F" }}>
                  {["Level", "Contents", "Audit focus"].map((h) => (
                    <th
                      key={h}
                      className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-[0.06em]"
                      style={{ color: "#024C4F" }}
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
                    contents:
                      "Tokens, typography, spacing, icons, single button, input — cannot be broken down further. This is where tokens live.",
                    focus: "Token consistency",
                  },
                  {
                    level: "Molecules",
                    contents:
                      "Search field + button = search bar. Label + input + error = form field. Simple, testable, reusable.",
                    focus: "Composition",
                  },
                  {
                    level: "Organisms",
                    contents:
                      "Navigation bar, data table with filters, card grid — what product designers compose directly in Figma.",
                    focus: "Responsive behaviour",
                  },
                  {
                    level: "Templates / Pages",
                    contents:
                      "Dashboards, forms, empty states. Usage guidelines in Notion/Storybook, not live components. The system's handoff boundary.",
                    focus: "Handoff boundary",
                  },
                ].map((row) => (
                  <tr
                    key={row.level}
                    style={{ borderBottom: "1px solid rgba(2, 76, 79, 0.18)" }}
                  >
                    <td className="py-4 px-4 align-top font-semibold" style={{ color: "#0A1A1B" }}>
                      {row.level}
                    </td>
                    <td className="py-4 px-4 align-top" style={{ color: "#0A1A1B", opacity: 0.78, lineHeight: 1.6 }}>
                      {row.contents}
                    </td>
                    <td className="py-4 px-4 align-top font-medium" style={{ color: "#024C4F", whiteSpace: "nowrap" }}>
                      {row.focus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footnote */}
          <p
            className="mt-8"
            style={{
              fontSize: "13px",
              lineHeight: 1.6,
              color: "#024C4F",
              fontStyle: "italic",
              opacity: 0.85,
              maxWidth: "760px",
            }}
          >
            Atomic structure makes audits structural — scan atoms for token consistency,
            molecules for composition, organisms for responsive behaviour.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 3 — THE AUDIT APPROACH  (white)
          ══════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-3"
          >
            The Audit Approach
          </p>
          <h2
            className="mb-3 text-gray-900"
            style={{
              fontSize: "clamp(26px, 3.6vw, 40px)",
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              maxWidth: "780px",
            }}
          >
            First 30 days — earn trust, then scale
          </h2>
          <p
            className="mb-6"
            style={{
              fontSize: "clamp(17px, 1.7vw, 21px)",
              lineHeight: 1.4,
              color: "#1773D1",
              fontWeight: 500,
              maxWidth: "780px",
            }}
          >
            The real problem isn't broken components — it's invisible ones.
          </p>
          <p
            className="text-gray-600 mb-12"
            style={{
              fontSize: "var(--typo-p-base-size)",
              lineHeight: "var(--typo-p-base-line-height)",
              maxWidth: "760px",
            }}
          >
            Teams stop using a design system when they can't trust it. My first 30 days are
            about earning trust through quick, visible fixes — not a six-week audit report
            nobody reads. Rather than disappearing for a month and re-emerging with "v2," I
            fix P1 issues in the live library with a clear changelog and open a
            #design-system Slack channel.
          </p>

          {/* Two-track audit card */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {[
              {
                badge: "Track 1",
                title: "Figma Analytics + codebase scan",
                body: "How many hard-coded hex values, raw spacing numbers, or inline font sizes exist? This reveals the true \"token adoption gap.\"",
              },
              {
                badge: "Track 2",
                title: "20-minute interviews",
                body: "3–4 designers and 2 engineers. One question: \"What's the one thing in the system that costs you the most time?\" Listen for patterns, not feature requests.",
              },
            ].map((t) => (
              <div
                key={t.badge}
                className="bg-white rounded-2xl p-6 md:p-7"
                style={{ border: "1px solid #d4cfc8", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
              >
                <p
                  className="inline-block text-[10px] font-semibold uppercase tracking-[0.08em] mb-3 px-2.5 py-1 rounded-full"
                  style={{ background: "#EAF3F3", color: "#024C4F" }}
                >
                  {t.badge}
                </p>
                <h3
                  className="font-semibold text-gray-900 mb-2"
                  style={{ fontSize: "18px", lineHeight: 1.3 }}
                >
                  {t.title}
                </h3>
                <p
                  className="text-gray-600"
                  style={{ fontSize: "var(--typo-p-base-size)", lineHeight: "var(--typo-p-base-line-height)" }}
                >
                  {t.body}
                </p>
              </div>
            ))}
          </div>

          {/* Scoring note */}
          <div
            className="rounded-xl p-6"
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderLeft: "4px solid #1773D1",
            }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-400 mb-2">
              Scoring
            </p>
            <p
              className="text-gray-700"
              style={{ fontSize: "var(--typo-p-base-size)", lineHeight: "var(--typo-p-base-line-height)" }}
            >
              I score every issue against two axes:{" "}
              <strong className="text-gray-900 font-semibold">frequency and effort.</strong>{" "}
              High-frequency, low-effort issues become Week 3 fixes. Everything else gets
              sequenced. Critically, I map each issue to its Atomic level — fixing a token
              fixes every component that inherits it.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 4 — TOKEN ARCHITECTURE  (dark bg)
          ══════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24" style={{ background: "#0f1117", color: "#e2e8f0" }}>
        <div className="max-w-5xl mx-auto px-6">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3"
            style={{ color: "#7dd3c0" }}
          >
            Token Architecture
          </p>
          <h2
            className="mb-3"
            style={{
              fontSize: "clamp(26px, 3.6vw, 40px)",
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "#ffffff",
              maxWidth: "780px",
            }}
          >
            Ship tokens before components
          </h2>
          <p
            className="mb-10"
            style={{
              fontSize: "clamp(15px, 1.4vw, 18px)",
              lineHeight: 1.5,
              color: "#94a3b8",
              maxWidth: "640px",
            }}
          >
            Three-tier architecture.
          </p>

          {/* Code block */}
          <pre
            className="overflow-x-auto rounded-xl p-5 md:p-6 mb-8"
            style={{
              background: "#0a0d14",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#e2e8f0",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              fontSize: "13px",
              lineHeight: 1.75,
            }}
          >
            <code>
              <span style={{ color: "#7dd3c0" }}>{"/* Primitive — raw values */"}</span>{"\n"}
              <span style={{ color: "#cbd5e1" }}>{"color.primitive.B500 = "}</span>
              <span style={{ color: "#93c5fd" }}>{"#1773D1"}</span>{"\n\n"}
              <span style={{ color: "#7dd3c0" }}>{"/* Semantic token layer — role-based */"}</span>{"\n"}
              <span style={{ color: "#cbd5e1" }}>{"color.semantic.surface.default "}</span>
              <span style={{ color: "#fcd34d" }}>{"→"}</span>
              <span style={{ color: "#cbd5e1" }}>{" color.primitive.B500"}</span>{"\n\n"}
              <span style={{ color: "#7dd3c0" }}>{"/* Component token — purpose-specific */"}</span>{"\n"}
              <span style={{ color: "#cbd5e1" }}>{"color.component.button.bg.primary "}</span>
              <span style={{ color: "#fcd34d" }}>{"→"}</span>
              <span style={{ color: "#cbd5e1" }}>{" color.semantic.surface.default"}</span>{"\n\n"}
              <span style={{ color: "#7dd3c0" }}>{"/* Output per platform */"}</span>{"\n"}
              <span style={{ color: "#cbd5e1" }}>{"CSS:    --ds-button-bg-primary: "}</span>
              <span style={{ color: "#93c5fd" }}>{"#1773D1"}</span>
              <span style={{ color: "#cbd5e1" }}>{";"}</span>{"\n"}
              <span style={{ color: "#cbd5e1" }}>{"Swift:  DSColor."}</span>
              <span style={{ color: "#fcd34d" }}>{"buttonBgPrimary"}</span>
            </code>
          </pre>

          {/* Verification note */}
          <p
            className="mb-10"
            style={{
              fontSize: "15px",
              lineHeight: 1.7,
              color: "#cbd5e1",
              maxWidth: "780px",
            }}
          >
            I use two checks in parallel — (1) a visual QA session with a Figma frame and
            the live build side-by-side, and (2) a token audit script that confirms no
            hard-coded values remain. Run before every component is marked "stable."
          </p>

          {/* Before "shipped" checklist — pill row */}
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-3"
            style={{ color: "#7dd3c0" }}
          >
            Before "shipped" checklist
          </p>
          <div className="flex flex-wrap gap-2">
            {["Token parity", "Responsive breakpoints", "Dark mode", "Keyboard a11y", "Motion"].map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full"
                style={{
                  background: "rgba(125, 211, 192, 0.08)",
                  border: "1px solid rgba(125, 211, 192, 0.35)",
                  color: "#e2e8f0",
                  fontSize: "12px",
                  fontWeight: 500,
                  fontFamily: "Inter, var(--font-family-primary), sans-serif",
                }}
              >
                <span style={{ color: "#7dd3c0", fontWeight: 700 }} aria-hidden="true">✓</span>
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 5 — DOCUMENTATION STRATEGY  (white)
          ══════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-3"
          >
            Documentation Strategy
          </p>
          <h2
            className="text-gray-900 mb-8"
            style={{
              fontSize: "clamp(26px, 3.6vw, 40px)",
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              maxWidth: "780px",
            }}
          >
            Documentation that gets read
          </h2>

          {/* Large quote */}
          <blockquote
            className="mb-12"
            style={{
              fontSize: "clamp(20px, 2.2vw, 28px)",
              lineHeight: 1.4,
              color: "#0A1A1B",
              fontStyle: "italic",
              borderLeft: "3px solid #1773D1",
              paddingLeft: "20px",
              maxWidth: "960px",
            }}
          >
            "Documentation fails when it's written for completeness, not for the person
            searching at 11 PM with a deadline."
          </blockquote>

          {/* Two reader types */}
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-3">
            Two reader types
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-12">
            {[
              { who: "Designer", question: "When do I use this?" },
              { who: "Engineer", question: "How do I build this?" },
            ].map((r) => (
              <div
                key={r.who}
                className="rounded-2xl p-6"
                style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400 mb-2">
                  {r.who}
                </p>
                <p
                  className="text-gray-900"
                  style={{ fontSize: "20px", lineHeight: 1.35, fontStyle: "italic" }}
                >
                  "{r.question}"
                </p>
              </div>
            ))}
          </div>

          {/* 3-column doc structure */}
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-3">
            Three documentation layers
          </p>
          <div className="grid md:grid-cols-3 gap-3 mb-12">
            {[
              {
                label: "Foundations",
                body: "Tokens, typography scale, colour system, spacing, motion. The \"why\" behind every visual decision.",
              },
              {
                label: "Components",
                body: "Anatomy, states, usage do/don't, props/variants, a11y notes, code snippet. Each page declares its Atomic level.",
              },
              {
                label: "Patterns",
                body: "\"Use a ghost button when the action is secondary to the primary CTA\" — not \"A ghost button has a transparent background.\" Every rule has a rationale.",
              },
            ].map((c) => (
              <div
                key={c.label}
                className="bg-white rounded-xl p-5"
                style={{ border: "1px solid #d4cfc8", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
              >
                <p className="font-semibold text-gray-900 mb-2" style={{ fontSize: "15px" }}>
                  {c.label}
                </p>
                <p className="text-gray-600 leading-relaxed" style={{ fontSize: "13px", lineHeight: 1.6 }}>
                  {c.body}
                </p>
              </div>
            ))}
          </div>

          {/* Dual-tool row */}
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-3">
            Dual-tool approach
          </p>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {[
              {
                tool: "Notion",
                body: "Decision logs, principles, visual usage — the \"why\" layer Storybook can't carry.",
              },
              {
                tool: "Storybook",
                body: "Live stories, component props, interactive states.",
              },
            ].map((t) => (
              <div
                key={t.tool}
                className="rounded-2xl p-6"
                style={{
                  background: "#ffffff",
                  border: "1px solid #d4cfc8",
                  borderLeft: "4px solid #1773D1",
                }}
              >
                <p className="font-semibold text-gray-900 mb-2" style={{ fontSize: "16px" }}>
                  {t.tool}
                </p>
                <p
                  className="text-gray-600"
                  style={{ fontSize: "var(--typo-p-base-size)", lineHeight: "var(--typo-p-base-line-height)" }}
                >
                  {t.body}
                </p>
              </div>
            ))}
          </div>
          <p
            className="text-center mb-12"
            style={{
              fontSize: "13px",
              fontStyle: "italic",
              color: "#5a5550",
            }}
          >
            A Storybook page links to Notion rationale. A Notion page links to the live
            Storybook story.
          </p>

          {/* Quality gates */}
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-3">
            Quality gates
          </p>
          <div className="space-y-3">
            {[
              "A component without documentation is not “stable” — it's “beta.” No exceptions.",
              "Quarterly doc review sprint: one-click “Flag as outdated” link → Jira ticket. Teams stay engaged when they see their flags get resolved.",
            ].map((q, i) => (
              <div
                key={i}
                className="rounded-r-xl py-4 px-5"
                style={{
                  background: "#f0faf9",
                  borderLeft: "4px solid #0d9488",
                }}
              >
                <p
                  className="text-gray-900"
                  style={{ fontSize: "var(--typo-p-base-size)", lineHeight: "var(--typo-p-base-line-height)" }}
                >
                  {q}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SECTION 6 — PROOF  (teal bg)
          ══════════════════════════════════════════════════════ */}
      <section className="py-16 md:py-24" style={{ background: "#024C4F", color: "#ffffff" }}>
        <div className="max-w-5xl mx-auto px-6">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-3"
            style={{ color: "#7dd3c0" }}
          >
            Proof
          </p>
          <h2
            className="mb-5"
            style={{
              fontSize: "clamp(26px, 3.6vw, 40px)",
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              color: "#ffffff",
            }}
          >
            Applied at CYGNVS
          </h2>
          <p
            className="mb-10"
            style={{
              fontSize: "clamp(16px, 1.6vw, 19px)",
              lineHeight: 1.55,
              color: "#FAF8F4",
              maxWidth: "780px",
            }}
          >
            I've shipped this end-to-end — not as a consultant, but as the sole designer
            owning a cross-platform design system in a high-stakes cybersecurity SaaS
            product.
          </p>

          {/* Stats row */}
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden mb-8"
            style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            {[
              { val: "60+",  label: "Components" },
              { val: "180+", label: "Semantic tokens" },
              { val: "3",    label: "Platforms — Web + iOS + Android" },
              { val: "Live", label: "Shipped in production" },
            ].map((s) => (
              <div
                key={s.label}
                className="px-5 py-5"
                style={{ background: "#024C4F" }}
              >
                <p
                  className="font-bold mb-1.5"
                  style={{ fontSize: "clamp(22px, 2.4vw, 30px)", lineHeight: 1, color: "#ffffff" }}
                >
                  {s.val}
                </p>
                <p
                  className="leading-snug"
                  style={{ fontSize: "12px", lineHeight: 1.4, color: "rgba(255,255,255,0.7)" }}
                >
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* NDA note */}
          <div
            className="inline-flex items-start gap-2"
            style={{
              fontSize: "12px",
              lineHeight: 1.5,
              color: "rgba(250, 248, 244, 0.7)",
              fontFamily: "Inter, var(--font-family-primary), sans-serif",
            }}
          >
            <span aria-hidden="true">🔒</span>
            <span>
              Original interface details are NDA-protected.{" "}
              <Link
                to="/work/securevault"
                style={{ color: "#7dd3c0", textDecoration: "underline", textUnderlineOffset: "2px" }}
              >
                See the SecureVault case study
              </Link>{" "}
              for published outcomes.
            </span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOOTER CTA  (white)
          ══════════════════════════════════════════════════════ */}
      <div className="py-16 md:py-20 bg-white" style={{ borderTop: "1px solid #d4cfc8" }}>
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2
            className="text-gray-900 mb-3"
            style={{ fontSize: "var(--typo-h3-size)", lineHeight: "var(--typo-h3-line-height)", fontWeight: 600 }}
          >
            Want to see how this applies to your system?
          </h2>
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
