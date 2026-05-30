import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronRight, ExternalLink } from "lucide-react";
import { motion } from "motion/react";
import { Navbar } from "./Navbar";
import { Tag } from "./ui/tag";
import { PortfolioButton } from "./ui/portfolio-button";
import { ProgressiveImage } from "./ProgressiveImage";

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
    blue:  { border: "#3b82f6", bg: "#eff6ff",  borderWidth: "4px", italic: false },
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

// ── Artifact placeholder ──────────────────────────────────────
function ArtifactPlaceholder({
  type,
  label,
  badge,
  badgeColor = "amber",
  className = "",
}: {
  type: string;
  label: React.ReactNode;
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
      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid #d4cfc8" }}>
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
    <div
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: "1px solid #d4cfc8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      <div className="flex items-start gap-4 p-5" style={{ borderBottom: "1px solid #d4cfc8" }}>
        <div
          className="rounded-full text-white flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ width: 28, height: 28, background: "#1a1a1a", fontSize: 13, fontWeight: 700 }}
        >
          {num}
        </div>
        <div>
          <p
            className="font-semibold leading-snug"
            style={{ fontSize: "var(--typo-ol-body-semi-size)", lineHeight: "1.4", color: "#1a1a1a" }}
          >
            {title}
          </p>
          <p className="mt-1 leading-snug" style={{ fontSize: "var(--typo-p-xs-size)", color: "#5a5550" }}>
            {rationale}
          </p>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#d4cfc8]">
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-400 mb-2">
            Tradeoff accepted
          </p>
          <p className="leading-relaxed" style={{ fontSize: "var(--typo-p-xs-size)", lineHeight: "1.6", color: "#5a5550" }}>
            {tradeoff}
          </p>
        </div>
        <div className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-gray-400 mb-2">Impact</p>
          <p className="leading-relaxed" style={{ fontSize: "var(--typo-p-xs-size)", lineHeight: "1.6", color: "#5a5550" }}>
            {impact}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Section progress nav data ─────────────────────────────────
const CS_SECTIONS = [
  { id: "cs-brief",    label: "Quick Brief",  num: "01" },
  { id: "cs-problem",  label: "The Problem",  num: "02" },
  { id: "cs-process",  label: "The Approach", num: "03" },
  { id: "cs-outcome",  label: "The Result",   num: "04" },
  { id: "cs-learning", label: "Learning",     num: "05" },
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

// ── Main component ───────────────────────────────────────────
export function TtxCaseStudy() {
  const [activeSection, setActiveSection] = useState<string>("");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

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

    // Preload first visible artifact image
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = '/assets/ttx/preview/problem-artifacts-1.webp';
    document.head.appendChild(link);

    return () => {
      document.documentElement.style.background = prevBg;
      document.body.style.background = "";
      document.head.removeChild(link);
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
            {["Enterprise SaaS", "Cybersecurity", "Android · iOS · Web", "Design Systems"].map((t) => (
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
            Redesigning the TTX platform end-to-end —{" "}
            <span className="text-gray-400">room, injects, navigation, and state model</span>
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
            running, paused, or over. Facilitators were narrating the UI instead of running
            the scenario. I redesigned the entire TTX experience — from the state model up —
            across Web, iOS, and Android.
          </motion.p>

          {/* Metrics strip */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl overflow-hidden mb-10"
            style={{ background: "#d4cfc8", border: "1.5px solid #d4cfc8" }}
          >
            {[
              { val: "Faster",   label: "Participant orientation — facilitators reported faster onboarding for first-time and late-joining participants" },
              { val: "Drop",     label: `Support overhead — noticeable reduction in "What should I do now?" questions during live exercises` },
              { val: "$3.25M+",  label: "ARR contribution — AI-assisted TTX Player became a key driver in the CYGNVS mobile offering" },
              { val: "Reusable", label: "Platform pattern — state-aware navigation formalised as a reusable interaction pattern for future features" },
            ].map((m) => (
              <div key={m.val} className="bg-white px-6 py-5">
                <p
                  className="font-bold mb-1"
                  style={{ fontSize: "clamp(22px, 2.5vw, 30px)", lineHeight: 1, color: "#1a1a1a", fontWeight: 700 }}
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
          </motion.div>

          {/* Role strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap gap-8 pt-8"
            style={{ borderTop: "1px solid #d4cfc8" }}
          >
            {[
              { key: "Role",    val: "Lead Product Designer" },
              { key: "Product", val: "CYGNVS TTX — Cyber crisis tabletop platform" },
              { key: "Scope",   val: "TTX Room · Inject system · Navigation · State model" },
              { key: "Team",    val: "PM · Security · Engineering · Mobile · Platform" },
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
        <BP>
          Participants in a live cyber crisis exercise couldn't tell if the exercise was
          running, paused, or over. Facilitators were narrating the UI instead of running
          the scenario. I redesigned the entire TTX experience — from the state model up —
          across Web, iOS, and Android.
        </BP>
      </CsSection>

      {/* ── SECTION 02: THE PROBLEM ───────────────────────── */}
      <CsSection id="cs-problem" num="02" title="The Problem">
        <BH>The tool was fighting the exercise</BH>
        <BP>
          A tabletop exercise (TTX) is a structured rehearsal for a cyberattack. Leadership,
          legal, comms, and IT teams play through a realistic scenario under pressure — so they
          know their roles before a real incident hits. CYGNVS ran these exercises for enterprise
          clients. The platform had four surfaces: the TTX Room, an Inject list, Comments, and
          Messages. The problem was systemic across all of them.
        </BP>
        <Callout label="The core failure" variant="amber" className="my-6">
          There was no shared concept of exercise state in the UI. Participants joined from
          multiple entry points — mobile, web, late to the room — with no common understanding
          of whether the exercise was running, paused, or already over. Every question about
          "where are we?" landed on the facilitator, not the product.
        </Callout>

        <BH>Three distinct failure modes</BH>
        <BP>
          Research with facilitators, SOC leads, and exercise participants surfaced three
          patterns — all with the same root cause:{" "}
          <strong className="text-gray-900 font-semibold">
            state was invisible.
          </strong>
        </BP>
        <ProgressiveImage
          previewSrc="/assets/ttx/preview/problem-artifacts-1.webp"
          fullSrc="/assets/ttx/full/problem-artifacts-1.webp"
          alt="Research synthesis diagram showing three failure modes: Unclear state, Unclear actions, and Facilitator drag — from user interviews"
          caption="Three failure modes from user interviews: Unclear state · Unclear actions · Facilitator drag"
          className="my-7"
        />

        <BP>What made this hard to solve:</BP>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {[
            {
              label: "State lived in the backend only",
              body: "Exercise state was tracked server-side but never surfaced in the UI. There was no visual contract between what the system knew and what the participant saw.",
            },
            {
              label: "Cross-platform parity didn't exist",
              body: "Web and mobile showed the same exercise differently. A facilitator explaining the flow on web couldn't transfer that to a mobile participant without re-explaining.",
            },
            {
              label: "Injects had no sequence or status",
              body: "The inject list showed all injects at once with no clear ordering, active state, or indication of what was \"live\" vs upcoming vs already actioned.",
            },
            {
              label: "24/7 operation, no downtime tolerance",
              body: "CYGNVS ran live client exercises continuously. The redesign had to ship incrementally — no big-bang cutover, no disruption to running exercises.",
            },
          ].map((c) => (
            <div
              key={c.label}
              className="bg-white rounded-xl px-4 py-4"
              style={{ border: "1px solid #d4cfc8", borderLeft: "4px solid #0d9488", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
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
        <ProgressiveImage
          previewSrc="/assets/ttx/preview/problem-artifacts-2.webp"
          fullSrc="/assets/ttx/full/problem-artifacts-2.webp"
          alt="What made this hard to solve — state lived in backend only, cross-platform parity didn't exist, injects had no sequence or status, 24/7 operation with no downtime tolerance"
          caption="Artefact · Research synthesis — pain points mapped across Visibility, Navigation, Context, and Collaboration"
          className="mt-6"
        />
      </CsSection>

      {/* ── SECTION 03: THE APPROACH ──────────────────────── */}
      <CsSection id="cs-process" num="03" title="The Approach">
        <BH>Start from the state model, not the screen</BH>
        <BP>
          The instinct was to redesign the navigation. I pushed back — you can't design the
          right navigation without first defining what states the system can be in. I mapped
          the exercise lifecycle as an explicit state machine and made that the shared contract
          for design, engineering, and product.
        </BP>

        {/* Process steps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
          {[
            { num: "01", label: "Discover",  desc: "Map exercise behaviour across roles, entry points, and platforms" },
            { num: "02", label: "Model",     desc: "Define the 3-state lifecycle, transitions, triggers, and what each state unlocks" },
            { num: "03", label: "Prototype", desc: "Design TTX Room, inject system, and navigation tied to state across Web + Android + iOS" },
            { num: "04", label: "Validate",  desc: "Test in pilot exercises; measure orientation time and facilitator load" },
          ].map((s) => (
            <div
              key={s.num}
              className="bg-white rounded-lg p-4 text-center"
              style={{ border: "1.5px solid #d4cfc8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <span style={{ fontSize: 28, fontWeight: 700, color: "#c47a5e", lineHeight: 1, display: "block", marginBottom: 8 }}>
                {s.num}
              </span>
              <p className="font-semibold mb-1" style={{ fontSize: "13px", color: "#1a1a1a" }}>
                {s.label}
              </p>
              <p className="leading-snug" style={{ fontSize: "12px", lineHeight: "1.45", color: "#5a5550" }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        <ProgressiveImage
          previewSrc="/assets/ttx/preview/process-artifacts-1.webp"
          fullSrc="/assets/ttx/full/process-artifacts-1.webp"
          alt="TTX exercise lifecycle state model — 3 states: Not Started, In Progress, and Complete, with transitions, triggers, and what each state unlocks in the UI"
          caption="TTX exercise lifecycle — 3-state model: Not Started → In Progress → Complete"
          className="mt-7"
        />
        <div style={{ marginTop: 16 }}>
          <ProgressiveImage
            previewSrc="/assets/ttx/preview/process-artifacts-2.webp"
            fullSrc="/assets/ttx/full/process-artifacts-2.webp"
            alt="Inject list before and after redesign — before: flat unordered list with no status; after: sequenced with N/Total numbering, status chips, and active inject visually highlighted"
            caption="Artefact · State transitions — trigger, role, and notes for each state change"
            className="mb-7"
          />
        </div>

        <BH>Six design decisions, each with a real tradeoff</BH>
        <BP>
          Each decision was deliberate — not just "what looks good" but "what constraint does
          this solve and what does it cost."
        </BP>
        <div className="space-y-4 my-6">
          <DecisionCard
            num={1}
            title="Make exercise state explicit with a persistent chip + bottom sheet"
            rationale="Participants need to know state without asking anyone"
            tradeoff="The chip and bottom sheet cost vertical space on a small mobile screen. Accepted this to eliminate all ambiguity — a smaller content area is better than a confused participant."
            impact={`Participants self-oriented from the state chip within seconds of joining. Facilitators stopped narrating "we're about to start" or "the exercise is live."`}
          />
          <DecisionCard
            num={2}
            title="Bottom sheet carries the primary orientation message per state"
            rationale={`One persistent place that answers "what should I do right now?"`}
            tradeoff={`The bottom sheet is always visible, which reduces content area. Tested with a dismissable version — participants dismissed it and then asked "what should I do?" thirty seconds later. Non-dismissable won.`}
            impact={`"Exercise not started — no action needed" and "Exercise in progress — start responding to injects →" gave every participant the same instruction at the same time.`}
          />
          <DecisionCard
            num={3}
            title="Navigation adapts to exercise state — items appear and disappear"
            rationale="Don't show destinations that don't apply to the current state"
            tradeoff="Dynamic navigation required tight coupling between backend state events and the UI layer. Worked closely with engineering to ensure state changes propagated to nav without performance regressions."
            impact="Messages tab disappears when the exercise completes — participants aren't presented with channels that serve no purpose after the scenario ends. Nav reflects reality."
          />
          <DecisionCard
            num={4}
            title="Inject list shows sequence number, not just inject title"
            rationale="Progress through the exercise should be visible at a glance"
            tradeoff="Sequential numbering (7/9) works for linearly structured exercises. For branching exercises, this framing is less clear. Scoped to linear TTX flows for v1."
            impact="Participants could tell how far through the scenario they were without asking the facilitator. Late joiners understood context immediately from the progress fraction."
          />
          <DecisionCard
            num={5}
            title="Active inject highlighted — not buried in the list"
            rationale="The most important inject right now should require zero scanning"
            tradeoff="Visual differentiation of the active inject (blue border, filled circle) creates a denser-looking list. Tested alternatives — separate tabs, auto-scroll, modal overlay. Inline differentiation with clear status won for simplicity."
            impact={`"In Progress" with a "View →" CTA gave participants one clear next action without requiring them to scan the whole list to find where they were.`}
          />
          <DecisionCard
            num={6}
            title="State patterns standardised across Android and iOS"
            rationale="Facilitators explain the experience once, not twice"
            tradeoff="Standardised state chips and bottom sheets across platforms means some native Android conventions (e.g. Material snackbars) were set aside in favour of a shared mental model."
            impact="Leadership participants moving between their laptop and phone saw the same state chips, the same language, and the same bottom sheet copy. One mental model for the whole exercise."
          />
        </div>

        <Callout
          label="Operating rhythm"
          variant="blue"
          className="my-6"
        >
          Weekly triad reviews (design · PM · eng lead) using the state model as the shared
          meeting artefact — not a Figma prototype. We reviewed decisions against the state
          contract: "does this behaviour make sense in Not Started? In Progress? Complete?"
          Design crits with adjacent teams reused existing design system patterns where possible.
          Build reviews happened against the state spec, not static screens.
        </Callout>
      </CsSection>

      {/* ── SECTION 04: THE RESULT ────────────────────────── */}
      <CsSection id="cs-outcome" num="04" title="The Result">
        <BH>Measured results, 8 weeks post-launch</BH>
        <BP>
          Data from product analytics, SOC operational reports, facilitator debriefs, and pilot
          exercise observations. Qualitative signals from internal dogfooding and live client
          exercises.
        </BP>

        {/* Before / after table */}
        <div className="overflow-x-auto -mx-2 px-2 my-6 rounded-lg overflow-hidden bg-white" style={{ border: "1px solid #d4cfc8" }}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "#f0ede8", borderBottom: "2px solid #d4cfc8" }}>
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
                  metric: "Participant orientation time at exercise start",
                  before: `Required facilitator narration: “We’re starting now”`,
                  after: "State chip + bottom sheet — self-oriented without facilitator",
                  change: "↓ sig.",
                },
                {
                  metric: "Late joiner onboarding",
                  before: "Needed 1:1 explanation to understand current exercise state",
                  after: "State chip visible immediately on join; bottom sheet gives current instruction",
                  change: "↓ sig.",
                },
                {
                  metric: "Facilitator drag (time spent narrating product)",
                  before: `Significant — facilitators answering "where should I be?" throughout`,
                  after: "Noticeably reduced — UI answered orientation questions",
                  change: "↓ sig.",
                },
                {
                  metric: "Analyst satisfaction with triage workflows",
                  before: "3.0 / 5",
                  after: "3.6 / 5",
                  change: "↑ 18%",
                },
                {
                  metric: "Median time-to-triage critical alerts",
                  before: "25–30 minutes",
                  after: "17 minutes",
                  change: "↓ 32%",
                },
                {
                  metric: "Cross-platform consistency (facilitator training time)",
                  before: "Separate explanation needed for Web vs Android users",
                  after: "Single explanation — same state chips + bottom sheet copy across platforms",
                  change: "↓ sig.",
                },
              ].map((row, i) => (
                <tr
                  key={i}
                  className="last:border-0 hover:bg-black/[0.015] transition-colors"
                  style={{ borderBottom: "1px solid #e8e3dc" }}
                >
                  <td className="py-3.5 px-4 font-semibold" style={{ fontSize: "var(--typo-p-xs-size)", color: "#1a1a1a" }}>
                    {row.metric}
                  </td>
                  <td className="py-3.5 px-4 text-gray-400" style={{ fontSize: "var(--typo-p-xs-size)" }}>
                    {row.before}
                  </td>
                  <td className="py-3.5 px-4 font-medium" style={{ fontSize: "var(--typo-p-xs-size)", color: "#1a7a4a" }}>
                    {row.after}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-xs" style={{ color: "#1a7a4a" }}>{row.change}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ArtifactPlaceholder
          type="Artefact · Before / after — TTX Room"
          badge="Screens redacted · NDA"
          badgeColor="teal"
          label={
            <>
              <strong className="text-gray-700 block mb-1">TTX Room — before vs after (mobile)</strong>
              Left panel: old experience — no state chip, no bottom sheet, full inject list unordered.
              Right panel: redesign — state chip top-left, bottom sheet with contextual instruction,
              inject list with sequence numbers and active state highlighted.
            </>
          }
          className="my-7"
        />

        <BH>What users said</BH>
        <div className="space-y-3 mt-4">
          {[
            {
              quote: "I no longer have to narrate where we are in the exercise — the UI does that for me.",
              source: "TTX Facilitator — post-pilot debrief",
            },
            {
              quote: "It's much easier to see what's live and what's just context.",
              source: "Exercise Participant — pilot session",
            },
            {
              quote: "State cues feel consistent whether I'm on my laptop or my phone.",
              source: "Leadership team member — cross-platform review",
            },
          ].map((q, i) => (
            <div
              key={i}
              className="relative overflow-hidden"
              style={{
                background: "#ffffff",
                border: "1px solid #d4cfc8",
                borderLeft: "3px solid #c47a5e",
                borderRadius: "0 8px 8px 0",
                padding: "18px 20px",
              }}
            >
              <span
                className="text-gray-200 absolute top-3 left-4 text-4xl leading-none select-none font-serif"
                aria-hidden="true"
              >
                "
              </span>
              <p
                className="pl-5 leading-relaxed"
                style={{ color: "#1a1a1a", fontStyle: "italic", fontSize: "15px", lineHeight: "1.6" }}
              >
                {q.quote}
              </p>
              <p
                className="font-semibold uppercase tracking-[0.06em] pl-5"
                style={{ fontSize: "12px", color: "#5a5550", marginTop: "10px" }}
              >
                {q.source}
              </p>
            </div>
          ))}
        </div>
      </CsSection>

      {/* ── SECTION 05: LEARNING ──────────────────────────── */}
      <CsSection id="cs-learning" num="05" title="Learning">
        <BH>What I'd keep</BH>
        <BP>
          Starting with the state model rather than the screen was the right call — and the
          hardest sell. "We're redesigning navigation" is a familiar brief. "We need to define
          the exercise state machine before we touch any UI" takes more convincing. But that
          contract is what made it possible to redesign four surfaces consistently without each
          one being its own separate negotiation.
        </BP>
        <BP>
          The non-dismissable bottom sheet was counterintuitive but correct. Every time we
          tested a dismissable version, participants dismissed it and then asked for the
          information it contained. Persistent contextual instruction beats a cleaner screen.
          Using the state model as the weekly triad meeting artefact — not Figma frames — kept
          decisions grounded in system behaviour rather than visual preference.
        </BP>

        <BH>What I'd do differently</BH>
        <Callout label="Facilitator tools came too late" variant="amber" className="my-6">
          The redesign correctly prioritised participant orientation — that was the visible pain.
          But facilitator drag was the root cause, and facilitator-side controls (exercise start,
          inject activation, state transitions) were descoped to a later release. I'd instrument
          facilitator workflows earlier and treat them as the primary user of state transitions,
          not a secondary persona who happens to control the exercise.
        </Callout>

        <BH>Design principles this project reinforced</BH>
        <div className="space-y-3 mt-4">
          {[
            {
              num: "1",
              title: "Treat system state as a first-class design object",
              body: "State and transitions aren't engineering details — they're the primary design material for any workflow product. Design navigation, content visibility, and available actions around state first. Screens are a consequence of state, not the other way around.",
            },
            {
              num: "2",
              title: "Design for fast orientation, not just task completion",
              body: `"What should I do right now?" is a UX failure, not a user education problem. If the answer requires a facilitator to speak it out loud, the product hasn't done its job. Orientation time is a measurable outcome worth designing for explicitly.`,
            },
            {
              num: "3",
              title: "Share contracts, not just screens",
              body: "A state machine reviewed weekly by design, PM, and engineering is more durable than a Figma prototype handed over at the end of a sprint. It survives scope changes, release trains, and personnel turnover because the behaviour is agreed, not just illustrated.",
            },
            {
              num: "4",
              title: "Favour patterns teams can reuse",
              body: "The state chip, bottom sheet, and inject status patterns were built on the existing CYGNVS design system — not invented for this project. Every novel pattern is a maintenance cost. Extension is cheaper than invention.",
            },
          ].map((p) => (
            <div
              key={p.num}
              className="bg-white rounded-xl p-5 flex items-start gap-4"
              style={{ border: "1px solid #d4cfc8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <div
                className="rounded-full text-white flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ width: 28, height: 28, background: "#1a1a1a", fontSize: 13, fontWeight: 700 }}
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
            Want to see more of this work?
          </h3>
          <p
            className="text-gray-500 mb-8 max-w-lg mx-auto"
            style={{ fontSize: "var(--typo-p-base-size)", lineHeight: "var(--typo-p-base-line-height)" }}
          >
            I'm happy to walk through this case in detail, share additional artefacts, or demo
            the state model in a live conversation.
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
              <ExternalLink className="w-4 h-4" />
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
