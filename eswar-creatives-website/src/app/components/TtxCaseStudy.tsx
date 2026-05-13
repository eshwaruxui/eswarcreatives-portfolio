import { useEffect } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { Navbar } from "./Navbar";
import { Tag } from "./ui/tag";
import { PortfolioButton } from "./ui/portfolio-button";

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
  const styles: Record<string, { border: string; bg: string }> = {
    teal:  { border: "#0d9488", bg: "#f0faf9" },
    amber: { border: "#f59e0b", bg: "#fffbeb" },
    blue:  { border: "#3b82f6", bg: "#eff6ff" },
  };
  const { border, bg } = styles[variant];
  return (
    <div
      className={`rounded-r-xl px-5 py-4 ${className}`}
      style={{ borderLeft: `4px solid ${border}`, background: bg }}
    >
      {label && (
        <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-400 mb-2">
          {label}
        </p>
      )}
      <div
        className="text-gray-600 leading-relaxed"
        style={{ fontSize: "var(--typo-p-base-size)", lineHeight: "var(--typo-p-base-line-height)" }}
      >
        {children}
      </div>
    </div>
  );
}

// ── Artifact placeholder ──────────────────────────────────────
function ArtifactPlaceholder({
  type,
  label,
  spec,
  badge,
  badgeColor = "amber",
  className = "",
}: {
  type: string;
  label: React.ReactNode;
  spec?: string;
  badge?: string;
  badgeColor?: "amber" | "teal" | "blue";
  className?: string;
}) {
  const badgeCls = {
    amber: "bg-amber-50 text-amber-600",
    teal:  "bg-[#f0faf9] text-[#0d9488]",
    blue:  "bg-blue-50 text-blue-700",
  }[badgeColor];
  return (
    <div className={`border-2 border-dashed border-black/[0.15] rounded-2xl overflow-hidden bg-white ${className}`}>
      <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">{type}</span>
        {badge && (
          <span className={`text-[10px] font-semibold uppercase tracking-[0.05em] px-2.5 py-1 rounded-full ${badgeCls}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="flex flex-col items-center justify-center px-8 py-10 text-center gap-3 min-h-[180px]">
        <div className="w-10 h-10 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 text-lg select-none">
          ⬡
        </div>
        <p
          className="text-gray-500 max-w-sm leading-relaxed"
          style={{ fontSize: "var(--typo-p-base-size)", lineHeight: "1.6" }}
        >
          {label}
        </p>
        {spec && (
          <code className="text-[11px] text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 font-mono">
            {spec}
          </code>
        )}
      </div>
    </div>
  );
}

// ── Design decision card ─────────────────────────────────────
function DecisionCard({
  num,
  title,
  rationale,
  tradeoff,
  impact,
}: {
  num: number;
  title: string;
  rationale: string;
  tradeoff: string;
  impact: string;
}) {
  return (
    <div className="bg-white border border-black/[0.06] rounded-2xl overflow-hidden">
      <div className="flex items-start gap-4 p-5 border-b border-black/[0.06]">
        <div className="w-7 h-7 rounded-full bg-[#0d9488] text-white text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
          {num}
        </div>
        <div>
          <p
            className="font-semibold text-gray-900 leading-snug"
            style={{ fontSize: "var(--typo-ol-body-semi-size)", lineHeight: "1.4" }}
          >
            {title}
          </p>
          <p className="text-gray-400 mt-1 leading-snug" style={{ fontSize: "var(--typo-p-xs-size)" }}>
            {rationale}
          </p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.06]">
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-400 mb-2">
            Tradeoff accepted
          </p>
          <p className="text-gray-600 leading-relaxed" style={{ fontSize: "var(--typo-p-xs-size)", lineHeight: "1.6" }}>
            {tradeoff}
          </p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-400 mb-2">Impact</p>
          <p className="text-gray-600 leading-relaxed" style={{ fontSize: "var(--typo-p-xs-size)", lineHeight: "1.6" }}>
            {impact}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Case section layout ──────────────────────────────────────
function CsSection({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-black/[0.06] py-16 md:py-20">
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

// ── Main component ───────────────────────────────────────────
export function TtxCaseStudy() {
  useEffect(() => {
    document.title = "CYGNVS TTX — UX Case Study · Eswar";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "How I reduced cognitive load in cyber tabletop exercises by designing a state-aware navigation system for CYGNVS TTX — delivered across Web, iOS, and Android in 12 weeks."
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

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: "#f5f3f0", fontFamily: "var(--font-family-primary)" }}
    >
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────── */}
      <header className="pt-20 md:pt-24">
        <div className="max-w-5xl mx-auto px-6 pb-14 md:pb-16 border-b border-black/[0.06]">

          {/* Breadcrumb */}
          <nav
            className="flex items-center gap-1.5 text-gray-400 mb-8 pt-6 md:pt-8"
            aria-label="Breadcrumb"
            style={{ fontSize: "var(--typo-p-xs-size)" }}
          >
            <Link to="/#work" className="hover:text-gray-700 transition-colors">
              Work
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-gray-600 font-medium">CYGNVS TTX</span>
          </nav>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2 mb-6">
            {["Enterprise SaaS", "Cybersecurity", "Cross-platform", "Design Systems"].map((t) => (
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
            Reducing cognitive load in cyber tabletop exercises{" "}
            <span className="text-gray-400">with state-aware navigation</span>
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
              maxWidth: "620px",
            }}
          >
            Participants in a live cyber crisis exercise couldn't tell if the exercise was
            running, paused, or over — so facilitators were narrating the UI instead of
            running the scenario. I redesigned the product around an explicit state model.
          </motion.p>

          {/* Metrics strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-px bg-black/[0.06] rounded-2xl overflow-hidden mb-10"
          >
            {[
              { val: "−32%",   label: "Median triage time for critical alerts" },
              { val: "+18%",   label: "Analyst satisfaction with workflows" },
              { val: "↓ sig.", label: "Missed critical incidents (qualitative)" },
              { val: "12 wks", label: "Delivery across Web + iOS + Android" },
            ].map((m) => (
              <div key={m.val} className="bg-white px-6 py-5">
                <p
                  className="font-bold text-[#0d9488] mb-1"
                  style={{ fontSize: "clamp(22px, 2.5vw, 30px)", lineHeight: 1 }}
                >
                  {m.val}
                </p>
                <p
                  className="text-gray-500 leading-snug"
                  style={{ fontSize: "var(--typo-p-xs-size)", lineHeight: "1.4" }}
                >
                  {m.label}
                </p>
              </div>
            ))}
          </motion.div>

          {/* Role strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap gap-8 pt-8 border-t border-black/[0.06]"
          >
            {[
              { key: "Role",     val: "Lead Product Designer" },
              { key: "Product",  val: "CYGNVS TTX — Cyber crisis tabletop platform" },
              { key: "Team",     val: "PM · Security · Engineering · Mobile · Platform" },
              { key: "Timeline", val: "12 weeks" },
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

      {/* ── SECTION 01: PROBLEM ───────────────────────────── */}
      <CsSection num="01" title="Problem">
        <BH>The tool was fighting the exercise</BH>
        <BP>
          A tabletop exercise (TTX) is a structured rehearsal for a cyberattack. Leadership,
          legal, comms, and IT teams play through a realistic scenario so they know their roles
          before a real incident. CYGNVS ran these exercises — but the platform had a systemic
          orientation problem.
        </BP>
        <Callout label="Core problem" variant="amber" className="my-6">
          Participants joined from multiple entry points with no shared understanding of where
          they were in the exercise. Facilitators were spending their time answering "Where should
          I be now?" instead of running the scenario.
        </Callout>

        <BH>Three failure modes, one root cause</BH>
        <BP>
          User interviews with facilitators and SOC leads surfaced three distinct patterns — all
          tracing back to the same gap:{" "}
          <strong className="text-gray-900 font-semibold">
            the exercise state was invisible in the UI.
          </strong>
        </BP>
        <ArtifactPlaceholder
          type="Artefact · Research synthesis"
          badge="Add: affinity map or interview insight clusters"
          badgeColor="amber"
          label={
            <>
              <strong className="text-gray-700 block mb-1">Three failure modes — visual from research</strong>
              "Unclear state" · "Unclear actions" · "Facilitator drag"
              <span className="text-gray-400 text-xs block mt-1">
                Each column with a representative quote from user interviews
              </span>
            </>
          }
          spec="Figma frame · 1200×500 · Export @2x PNG"
          className="my-7"
        />

        <BP>Existing constraints made this harder:</BP>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {[
            {
              label: "No backend overhaul",
              body: "Had to design within the existing alert engine — a full data model rewrite was out of scope.",
            },
            {
              label: "24/7 operations",
              body: "Zero downtime during rollout. SOC analysts couldn't absorb a disruptive change mid-shift.",
            },
            {
              label: "Strict compliance",
              body: "Every user action needed to be auditable. No ephemeral state, no ambiguity in the log.",
            },
            {
              label: "Limited research time",
              body: "Senior analysts had 1–2 hours per week maximum for validation. Every session had to count.",
            },
          ].map((c) => (
            <div
              key={c.label}
              className="bg-white rounded-xl px-4 py-4"
              style={{ border: "1px solid rgba(0,0,0,0.06)", borderLeft: "4px solid #0d9488" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-400 mb-1.5">
                {c.label}
              </p>
              <p className="text-gray-600 leading-relaxed" style={{ fontSize: "var(--typo-p-xs-size)", lineHeight: "1.6" }}>
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </CsSection>

      {/* ── SECTION 02: PROCESS ───────────────────────────── */}
      <CsSection num="02" title="Process">
        <BH>Start from the state model, not the screen</BH>
        <BP>
          Most navigation redesigns start with the nav. I started with the state machine —
          mapping every possible exercise state, every role, every entry point. The UI would
          follow from that contract.
        </BP>

        {/* Process steps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
          {[
            { num: "01", label: "Discover",  desc: "Map how exercises behave across roles and entry points" },
            { num: "02", label: "Model",     desc: "Define states, transitions, and edge cases as a shared contract" },
            { num: "03", label: "Prototype", desc: "Design Web and mobile navigation patterns per state" },
            { num: "04", label: "Validate",  desc: "Test flows in real and internal exercises; capture 'lost' moments" },
          ].map((s) => (
            <div key={s.num} className="bg-white border border-black/[0.06] rounded-xl p-4 text-center">
              <p className="text-[#0d9488] font-bold text-2xl leading-none mb-2">{s.num}</p>
              <p className="font-semibold text-gray-900 mb-1" style={{ fontSize: "var(--typo-p-xs-size)" }}>
                {s.label}
              </p>
              <p className="text-gray-500 leading-snug" style={{ fontSize: "11px", lineHeight: "1.45" }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        <ArtifactPlaceholder
          type="Artefact · State machine diagram"
          badge="Highest-value artefact in this case study"
          badgeColor="teal"
          label={
            <>
              <strong className="text-gray-700 block mb-1">TTX exercise lifecycle — state diagram</strong>
              4 states: Not Started → Live → Paused → Wrapped.
              <span className="text-gray-400 text-xs block mt-1">
                Show transitions, who triggers them (facilitator vs system), and what UI elements change per state. The shared contract design and engineering both worked from.
              </span>
            </>
          }
          spec="Figma / FigJam · 1400×600 · Abstract enough to show without NDA conflict"
          className="my-7"
        />

        <BH>Four design decisions, each with a real tradeoff</BH>
        <BP>
          Each decision was deliberate — not just "what looks good" but "what constraint does
          this solve and what does it cost."
        </BP>
        <div className="space-y-4 my-6">
          <DecisionCard
            num={1}
            title="Make exercise state explicit in the UI"
            rationale="Participants shouldn't have to ask a facilitator what's happening"
            tradeoff="Introduced a persistent state header and status chips — costs some vertical space but removes all ambiguity about exercise state."
            impact="Reduced orientation time at exercise start and after breaks. Facilitators stopped narrating state."
          />
          <DecisionCard
            num={2}
            title="Navigation adapts to exercise state"
            rationale="Surface only what matters right now — hide what doesn't"
            tradeoff="Tighter coupling between backend state and UI — required close engineering partnership to avoid performance regressions."
            impact="Less wandering through screens. Participants moved directly to active injects and tasks."
          />
          <DecisionCard
            num={3}
            title="Standardise state cues across Web and mobile"
            rationale="Facilitators should explain the experience once, not twice"
            tradeoff="Aligned patterns even when platform conventions differed — balanced native behaviours with a shared mental model across iOS and Web."
            impact="Single explanation for 'how TTX works', reducing facilitator training time and onboarding overhead."
          />
          <DecisionCard
            num={4}
            title="Clarify inject status and expectations inline"
            rationale="Participants needed to know what to do next without a heavier dashboard"
            tradeoff="Added explicit status labels, priorities, and lightweight filters — deliberately avoided a full dashboard to keep cognitive load low."
            impact="More participants could explain what the current inject required — and what was next — in their own words."
          />
        </div>

        {/* Two-up artefact placeholders */}
        <div className="grid sm:grid-cols-2 gap-4 my-7">
          <ArtifactPlaceholder
            type="Artefact · State header component"
            badge="Key screen"
            badgeColor="teal"
            label="Persistent state header — 4 states with status chips. Show colour/label change per state (Not Started / Live / Paused / Wrapped)."
            spec="Web · abstracted component · 1200×200"
          />
          <ArtifactPlaceholder
            type="Artefact · Mobile state nav"
            badge="Cross-platform"
            badgeColor="blue"
            label="iOS bottom nav adapting to exercise state. Show active vs locked destinations per state. Side-by-side 2 states."
            spec="iOS · 390×844 × 2 states · @2x"
          />
        </div>

        <Callout
          label="Operating rhythm — what actually kept this on track"
          variant="blue"
          className="my-6"
        >
          Weekly triad reviews (design · PM · eng lead) using a shared state diagram and test
          injects to decide what to cut, keep, or move to backlog. Design crits with adjacent
          teams reused patterns instead of inventing new ones. Build checks paired me with
          engineers on edge cases, reviewing against the state contract rather than static screens.
        </Callout>
      </CsSection>

      {/* ── SECTION 03: OUTCOME ───────────────────────────── */}
      <CsSection num="03" title="Outcome">
        <BH>Measured results, 8 weeks post-launch</BH>
        <BP>
          Data gathered from product analytics, SOC operational reports, and facilitator feedback
          approximately 8 weeks post-launch. Qualitative signals from pilot exercises and internal
          dogfooding sessions.
        </BP>

        {/* Before / after table */}
        <div className="overflow-x-auto -mx-2 px-2 my-6 rounded-2xl border border-black/[0.06] bg-white">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-black/[0.06]">
                {["Metric", "Before", "After", "Change"].map((h) => (
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
                  metric: "Median time-to-triage critical alerts",
                  before: "25–30 minutes",
                  after: "17 minutes",
                  change: "↓ 32%",
                },
                {
                  metric: "Analyst satisfaction with triage workflows",
                  before: "3.0 / 5",
                  after: "3.6 / 5",
                  change: "↑ 18%",
                },
                {
                  metric: "Missed critical incidents",
                  before: "Frequent escalations due to missed alerts",
                  after: "Fewer escalations reported",
                  change: "↓ sig.",
                },
                {
                  metric: "Facilitator orientation overhead",
                  before: "Narrating state at exercise start + after breaks",
                  after: "UI handles orientation without facilitator narration",
                  change: "↓ sig.",
                },
                {
                  metric: "Late joiner onboarding",
                  before: "Required 1:1 explanation to understand current state",
                  after: "Self-oriented from state header within seconds",
                  change: "↓ sig.",
                },
              ].map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-black/[0.04] last:border-0 hover:bg-black/[0.015] transition-colors"
                >
                  <td className="py-3.5 px-4 font-semibold text-gray-800" style={{ fontSize: "var(--typo-p-xs-size)" }}>
                    {row.metric}
                  </td>
                  <td className="py-3.5 px-4 text-gray-400" style={{ fontSize: "var(--typo-p-xs-size)" }}>
                    {row.before}
                  </td>
                  <td className="py-3.5 px-4 text-[#0d9488] font-medium" style={{ fontSize: "var(--typo-p-xs-size)" }}>
                    {row.after}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[#0d9488] font-semibold text-xs">{row.change}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ArtifactPlaceholder
          type="Artefact · Before / after comparison"
          badge="Critical for trust"
          badgeColor="teal"
          label={
            <>
              <strong className="text-gray-700 block mb-1">Side-by-side: Old nav vs state-aware nav</strong>
              Left: original — no state indicator, scattered entry points, cluttered actions.
              Right: redesigned — persistent state header, context-aware nav, clear inject status.
              <span className="text-gray-400 text-xs block mt-1">
                Annotate 3–4 specific changes. No proprietary screens needed — abstract the content.
              </span>
            </>
          }
          spec="1400×700 · 2-panel split · Annotated · @2x PNG"
          className="my-7"
        />

        <BH>What users said</BH>
        <div className="space-y-3 mt-4">
          {[
            {
              quote: "I no longer have to narrate where we are in the exercise — the UI does that for me.",
              source: "TTX Facilitator — post-pilot feedback",
            },
            {
              quote: "It's much easier to see what's live and what's just context.",
              source: "Exercise Participant — pilot session debrief",
            },
            {
              quote: "State cues feel consistent whether I'm on my laptop or phone.",
              source: "Leadership team member — cross-platform review",
            },
          ].map((q, i) => (
            <div key={i} className="bg-white border border-black/[0.06] rounded-xl p-5 relative overflow-hidden">
              <span
                className="text-gray-200 absolute top-3 left-4 text-4xl leading-none select-none font-serif"
                aria-hidden="true"
              >
                "
              </span>
              <p
                className="text-gray-600 italic pl-5 leading-relaxed"
                style={{ fontSize: "var(--typo-p-base-size)", lineHeight: "1.65" }}
              >
                {q.quote}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-400 mt-3 pl-5">
                {q.source}
              </p>
            </div>
          ))}
        </div>
      </CsSection>

      {/* ── SECTION 04: LEARNING ──────────────────────────── */}
      <CsSection num="04" title="Learning">
        <BH>What I'd keep</BH>
        <BP>
          Starting with a state model rather than a screen was the right call. It gave
          engineering and design a shared contract from day one — not a design artefact that
          engineers had to interpret. That contract is what made cross-platform consistency
          achievable without redundant work.
        </BP>
        <BP>
          The weekly triad rhythm (design · PM · eng) using the state diagram as the meeting
          artefact, not static Figma frames, kept decisions grounded in system behaviour rather
          than visual preference.
        </BP>

        <BH>What I'd do differently</BH>
        <Callout label="Opportunity missed early" variant="amber" className="my-6">
          Facilitator-side tooling was lower priority than participant experience — but
          facilitator drag was the root cause. I'd instrument facilitator workflows earlier and
          treat them as the first user, not a secondary persona. Integrating predictive incident
          detection signals from product analytics as proactive triage flags would have been the
          natural next step.
        </Callout>

        <BH>Design principles this project reinforced</BH>
        <div className="space-y-3 mt-4">
          {[
            {
              num: "1",
              title: "Treat system state as a first-class design object",
              body: "State and transitions aren't implementation details — they're the primary design material. Design navigation, visibility, and permissions around those states first, not last.",
            },
            {
              num: "2",
              title: "Design for fast orientation, not just task completion",
              body: "Users who don't know where they are can't complete tasks efficiently. Reducing 'what should I do now?' questions is a measurable UX outcome, not a soft improvement.",
            },
            {
              num: "3",
              title: "Share contracts, not just screens",
              body: "A state machine as a shared artefact between design and engineering is more durable than a Figma prototype. It survives handoff, scope changes, and release trains.",
            },
            {
              num: "4",
              title: "Favour patterns teams can reuse",
              body: "Every pattern invented only for this project is a debt. Reusing and extending existing design system components — even when they needed adaptation — kept the system coherent and reduced engineering rework.",
            },
          ].map((p) => (
            <div key={p.num} className="bg-white border border-black/[0.06] rounded-xl p-5 flex items-start gap-4">
              <span className="text-[#0d9488] font-bold text-2xl leading-none flex-shrink-0 mt-0.5">
                {p.num}
              </span>
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
      <div className="border-t border-black/[0.06] py-16 md:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h3
            className="text-gray-900 font-semibold mb-3"
            style={{ fontSize: "var(--typo-h3-size)", lineHeight: "var(--typo-h3-line-height)" }}
          >
            Want to see more of this work?
          </h3>
          <p
            className="text-gray-500 mb-8 max-w-lg mx-auto"
            style={{ fontSize: "var(--typo-p-base-size)", lineHeight: "var(--typo-p-base-line-height)" }}
          >
            I'm happy to walk through this case in detail, share additional artefacts, or talk
            through the design system that underpinned it — in a live conversation.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <PortfolioButton
              href="https://calendly.com/eswarcreatives/25-min-intro-call"
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              size="lg"
            >
              Book a 30-min conversation
              <ArrowRight className="w-4 h-4" />
            </PortfolioButton>
            <PortfolioButton href="/#work" variant="secondary" size="lg">
              View another case study
              <ArrowRight className="w-4 h-4" />
            </PortfolioButton>
          </div>
        </div>
      </div>
    </div>
  );
}
