import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronRight, ExternalLink, Download } from "lucide-react";
import { motion } from "motion/react";
import { Navbar } from "./Navbar";
import { Tag } from "./ui/tag";
import { PortfolioButton } from "./ui/portfolio-button";
import { ProgressiveImage } from "./ProgressiveImage";
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
  { id: "cs-brief",      label: "Brief",            num: "01" },
  { id: "cs-problem",    label: "The Problem",      num: "02" },
  { id: "cs-approach",   label: "The Approach",     num: "03" },
  { id: "cs-result",     label: "The Result",       num: "04" },
  { id: "cs-reflection", label: "Reflection",       num: "05" },
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
  const { handleDownload, isDownloading } = useResumeDownload();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    document.title = "SecureVault — Reducing alert fatigue · Eswar";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        "How I cut time-to-triage for critical alerts by 32% in a cybersecurity SaaS platform — by redesigning the alert pipeline around state-aware navigation and risk-based scoring."
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
            <span className="text-gray-600 font-medium">SecureVault</span>
          </nav>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2 mb-6">
            {["Enterprise SaaS", "Cybersecurity", "Design Systems", "Cross-platform"].map((t) => (
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
            Reducing alert fatigue in a{" "}
            <span className="text-gray-400">cybersecurity SaaS platform</span>
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
            Security analysts were missing critical alerts in a noisy, fragmented triage
            workflow. I redesigned the alert pipeline around state-aware navigation and
            risk-based scoring.
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
              { key: "Role",     val: "Lead Product Designer" },
              { key: "Client",   val: "CYGNVS (anonymized as SecureVault)" },
              { key: "Duration", val: "10 months · Shipped across Web, iOS, Android" },
              { key: "Team",     val: "PM · Security · Engineering · Mobile · Platform" },
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
          SecureVault is an enterprise cybersecurity SaaS platform where security analysts
          triage incidents across three fragmented tools. I led a 10-month redesign of the
          alert pipeline — consolidating surfaces, introducing risk-based scoring, and making
          exercise state visible across Web, iOS, and Android. The result: faster triage,
          higher analyst satisfaction, and fewer critical incidents slipping through the
          cracks.
        </BP>

        {/* Headline metrics — front and centre */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-2xl overflow-hidden mt-8"
          style={{ background: "#d4cfc8", border: "1.5px solid #d4cfc8" }}
        >
          {[
            { val: "−32%",  label: "Time-to-triage critical alerts" },
            { val: "+18%",  label: "Analyst satisfaction with workflows" },
            { val: "Fewer", label: "Missed critical incidents (post-launch)" },
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
      </CsSection>

      {/* ── SECTION 02: THE PROBLEM ───────────────────────── */}
      <CsSection id="cs-problem" num="02" title="The Problem">
        <BH>The triage workflow was fighting the analyst</BH>
        <BP>
          SecureVault's analysts triaged alerts across three separate surfaces — an alert
          queue, a comments thread, and a messaging channel — with no shared concept of
          incident state. Critical alerts looked the same as routine ones. Analysts joined
          shifts from multiple entry points with no common understanding of what was live,
          what was paused, or what had already been actioned.
        </BP>
        <Callout label="The core failure" variant="amber" className="my-6">
          The product had no opinion about which alerts mattered most. Severity, confidence,
          and asset criticality lived in the backend but never surfaced in the UI. Every
          decision about "should I look at this now?" landed on the analyst, not the product.
        </Callout>

        <BH>Current state triage flow</BH>
        <BP>
          Research with SOC leads, on-shift analysts, and incident facilitators surfaced
          three failure modes — all with the same root cause:{" "}
          <strong className="text-gray-900 font-semibold">risk was invisible.</strong>
        </BP>
        <ProgressiveImage
          previewSrc="/assets/ttx/preview/problem-artifacts-1.webp"
          fullSrc="/assets/ttx/full/problem-artifacts-1.webp"
          alt="Current state triage flow — three failure modes from analyst interviews: Unclear priority, Unclear actions, Fragmented surfaces"
          caption="Current state triage flow — three failure modes: Unclear priority · Unclear actions · Fragmented surfaces"
          className="my-7"
        />

        <BH>Constraints</BH>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {[
            {
              label: "Risk lived in the backend only",
              body: "Severity and confidence scores were tracked server-side but never surfaced in the alert queue. There was no visual contract between what the system knew and what the analyst saw.",
            },
            {
              label: "Cross-platform parity didn't exist",
              body: "Web and mobile showed the same alert differently. An on-call analyst pivoting between laptop and phone re-oriented every time.",
            },
            {
              label: "Alerts had no sequence or status",
              body: "The queue showed all alerts at once with no clear ordering, active state, or indication of what was \"live\" vs upcoming vs already triaged.",
            },
            {
              label: "24/7 operation, no downtime tolerance",
              body: "SecureVault ran live client SOC operations continuously. The redesign had to ship incrementally — no big-bang cutover, no disruption to running shifts.",
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
          alt="Research synthesis — pain points mapped across Visibility, Navigation, Context, and Collaboration"
          caption="Artefact · Research synthesis — pain points mapped across Visibility, Navigation, Context, and Collaboration"
          className="mt-6"
        />
      </CsSection>

      {/* ── SECTION 03: THE APPROACH ──────────────────────── */}
      <CsSection id="cs-approach" num="03" title="The Approach">
        <BH>Start from risk and state, not the screen</BH>
        <BP>
          The instinct was to redesign the alert queue. I pushed back — you can't design the
          right queue without first defining what risk signals the system has and what
          incident states can be. I mapped the triage lifecycle as an explicit state machine
          and used it as the shared contract for design, engineering, and product.
        </BP>

        {/* Process steps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
          {[
            { num: "01", label: "Discover",  desc: "Map analyst behaviour across shifts, entry points, and platforms" },
            { num: "02", label: "Model",     desc: "Define risk scoring + the triage state machine and what each state unlocks" },
            { num: "03", label: "Prototype", desc: "Design consolidated alert pipeline tied to state across Web + Android + iOS" },
            { num: "04", label: "Validate",  desc: "Test in pilot shifts; measure time-to-triage and analyst satisfaction" },
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
          alt="Triage lifecycle state model — incident states, transitions, triggers, and what each unlocks in the UI"
          caption="Triage lifecycle — incident state model with transitions, triggers, and UI affordances"
          className="mt-7"
        />
        <div style={{ marginTop: 16 }}>
          <ProgressiveImage
            previewSrc="/assets/ttx/preview/process-artifacts-2.webp"
            fullSrc="/assets/ttx/full/process-artifacts-2.webp"
            alt="Risk-scoring model — severity, confidence, asset criticality combined into a single priority signal"
            caption="Artefact · Risk-scoring model — severity, confidence, and asset criticality combined into one signal"
            className="mb-7"
          />
        </div>

        <BH>Three key design decisions</BH>
        <BP>
          Each decision was deliberate — not just "what looks good" but "what constraint does
          this solve and what does it cost."
        </BP>
        <div className="space-y-4 my-6">
          <DecisionCard
            num={1}
            title="Consolidate alerts into a single incident view"
            rationale="Analysts shouldn't pivot between three tools to triage one incident"
            tradeoff="Merging the alert queue, comments thread, and messaging channel into one surface meant rewriting three teams' mental models. Accepted the migration cost to eliminate context-switching — fewer surfaces beat richer ones when triage speed is the outcome."
            impact="Analysts triaged from one place. Time spent re-orienting between tools dropped to near zero. Late joiners onto a shift could see incident, comments, and messages in a single scan."
          />
          <DecisionCard
            num={2}
            title="Allow critical alerts to break through Do-Not-Disturb"
            rationale="A real critical incident should never wait for the next shift refresh"
            tradeoff="Bypassing DND is a strong signal that erodes if used carelessly. Worked with security ops to define a strict threshold — only alerts above a combined risk score AND on a critical asset bypass DND. Anything else respects quiet hours."
            impact="Critical incidents reached the right analyst within seconds, even outside shift hours. Notification noise stayed flat — the bypass was used sparingly because the threshold was strict."
          />
          <DecisionCard
            num={3}
            title="Visually separate critical alerts from routine"
            rationale="The most important alert right now should require zero scanning"
            tradeoff="Visual differentiation (priority chip, accent border, dedicated top region) creates a denser-looking queue. Tested alternatives — separate tabs, auto-collapse, modal overlay. Inline differentiation with a clear top-pinned region won for speed."
            impact="Analysts spotted critical alerts at a glance instead of scanning the full queue. Median time-to-triage on critical alerts dropped 32%."
          />
        </div>

        <Callout label="Operating rhythm" variant="blue" className="my-6">
          Weekly triad reviews (design · PM · eng lead) using the state model and risk
          scoring as the shared meeting artefact — not a Figma prototype. We reviewed
          decisions against the state contract: "does this behaviour make sense for Critical?
          For Triaged? For Resolved?" Design crits with adjacent teams reused existing
          SecureVault design system patterns where possible. Build reviews happened against
          the state spec, not static screens.
        </Callout>
      </CsSection>

      {/* ── SECTION 04: THE RESULT ────────────────────────── */}
      <CsSection id="cs-result" num="04" title="The Result">
        <BH>Outcomes & impact</BH>
        <BP>
          Measured across product analytics, SOC operational reports, and analyst debriefs
          from pilot shifts. Quantitative outcomes confirmed by qualitative signals from
          internal dogfooding and live client operations.
        </BP>

        {/* Before / after table — PROMINENT */}
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
                  metric: "Missed critical incidents (per quarter)",
                  before: "Several per quarter — flagged in post-incident review",
                  after: "Materially fewer — bypass-DND caught off-hours criticals",
                  change: "↓ sig.",
                },
                {
                  metric: "Late-joiner onboarding (mid-shift handover)",
                  before: "Needed 1:1 explanation to understand current incident state",
                  after: "State chip + consolidated view — self-oriented without handover",
                  change: "↓ sig.",
                },
                {
                  metric: "Cross-platform consistency (training overhead)",
                  before: "Separate explanation needed for Web vs Mobile users",
                  after: "Single explanation — same state cues across Web, iOS, Android",
                  change: "↓ sig.",
                },
                {
                  metric: "Tool-switching during a single triage",
                  before: "3 surfaces (queue, comments, messages)",
                  after: "1 consolidated incident view",
                  change: "↓ 66%",
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

        <Callout label="Validation" variant="teal" className="my-6">
          Metrics measured 8 weeks post-launch across pilot SOC teams. Quantitative outcomes
          (triage time, satisfaction) drawn from product analytics and post-shift surveys;
          qualitative signals from facilitator debriefs and live client exercises. Sample
          size: 4 pilot teams across enterprise clients.
        </Callout>

        <BH>What users said</BH>
        <div className="space-y-3 mt-4">
          {[
            {
              quote: "I no longer have to scan the whole queue — what's critical is right at the top, every time.",
              source: "SOC Analyst — post-pilot debrief",
            },
            {
              quote: "It's much easier to see what's live and what's just context.",
              source: "Incident Lead — pilot session",
            },
            {
              quote: "Triage cues feel consistent whether I'm on my laptop or my phone.",
              source: "On-call Analyst — cross-platform review",
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

      {/* ── SECTION 05: WHAT I'D DO DIFFERENTLY ───────────── */}
      <CsSection id="cs-reflection" num="05" title="What I'd Do Differently">
        <BP>
          The redesign shipped what it set out to ship — but with hindsight there are three
          calls I'd make differently next time.
        </BP>

        <div className="space-y-4 my-6">
          {[
            {
              num: "1",
              title: "Early task mapping was too module-focused",
              body: "I started by mapping tasks around the three existing surfaces — queue, comments, messages. That kept early thinking inside the product's current structure. I'd start from business outcomes earlier: \"reduce missed critical incidents,\" \"shorten time-to-triage\" — and let the surface structure fall out of that, not the reverse.",
            },
            {
              num: "2",
              title: "Limited usability testing",
              body: "Pilots ran with four SOC teams from existing enterprise clients — useful, but narrow. Analysts at smaller orgs and at MSSPs likely have different workflows we didn't observe. I'd push for broader participant recruitment earlier — including non-customer analysts — to surface patterns the existing customer base doesn't show.",
            },
            {
              num: "3",
              title: "Would explore predictive analytics for proactive detection",
              body: "The redesign made reactive triage faster. The bigger lever — and the one we didn't pull — is shifting from reactive to proactive: surfacing precursor patterns before an alert fires, scoring incident likelihood across asset clusters. I'd scope a predictive analytics workstream alongside the triage redesign, not after it.",
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

        <BH>Related design principles</BH>
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
              body: `"What should I do right now?" is a UX failure, not a user education problem. If the answer requires a colleague to speak it out loud, the product hasn't done its job. Orientation time is a measurable outcome worth designing for explicitly.`,
            },
            {
              num: "3",
              title: "Share contracts, not just screens",
              body: "A state machine reviewed weekly by design, PM, and engineering is more durable than a Figma prototype handed over at the end of a sprint. It survives scope changes, release trains, and personnel turnover because the behaviour is agreed, not just illustrated.",
            },
            {
              num: "4",
              title: "Favour patterns teams can reuse",
              body: "The priority chip, consolidated view, and state cues were built on the existing SecureVault design system — not invented for this project. Every novel pattern is a maintenance cost. Extension is cheaper than invention.",
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
            Want to walk through this case in more detail?
          </h3>
          <p
            className="text-gray-500 mb-8 max-w-lg mx-auto"
            style={{ fontSize: "var(--typo-p-base-size)", lineHeight: "var(--typo-p-base-line-height)" }}
          >
            Happy to share additional artefacts, walk through the state model and risk
            scoring in detail, or talk through how this would apply to your product.
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
