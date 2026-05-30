import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, ChevronRight, ExternalLink, Download, Lock } from "lucide-react";
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
  links,
}: {
  num: number;
  title: string;
  rationale: string;
  tradeoff: string;
  impact: string;
  links?: { label: string }[];
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
            Trade-offs
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
      {links && links.length > 0 && (
        <div className="flex flex-wrap gap-x-5 gap-y-2 px-5 py-3" style={{ borderTop: "1px solid #d4cfc8", background: "#faf8f4" }}>
          {links.map((l) => (
            <span
              key={l.label}
              className="inline-flex items-center gap-1.5 text-[#0d9488] font-medium"
              style={{ fontSize: "var(--typo-p-xs-size)" }}
            >
              {l.label}
              <span aria-hidden="true">→</span>
            </span>
          ))}
        </div>
      )}
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
export function SecureVaultCaseStudy() {
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
        "How I cut time-to-triage for critical alerts by 32% in a cybersecurity SaaS platform — by redesigning the alert pipeline around consolidated incident views and risk-based scoring."
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
            {["Enterprise SaaS", "Cybersecurity", "High-risk / NOC"].map((t) => (
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
            workflow. I redesigned the alert pipeline around consolidated incident views and
            risk-based scoring.
          </motion.p>

          {/* NDA notice — inline pill */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="inline-flex items-start gap-2 mb-10"
            style={{
              background: "#EAF3F3",
              color: "#024C4F",
              borderRadius: "6px",
              padding: "8px 14px",
              fontFamily: "Inter, var(--font-family-primary), sans-serif",
              fontSize: "12px",
              lineHeight: "1.5",
              maxWidth: "640px",
            }}
            role="note"
            aria-label="NDA notice"
          >
            <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Screens and interface details in this case study are representative mockups.
              Original CYGNVS product UI is protected under a mutual NDA. All metrics shared
              with permission.
            </span>
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
              { key: "Role",     val: "Lead Product Designer" },
              { key: "Company",  val: "SecureVault — Enterprise cybersecurity SaaS" },
              { key: "Platform", val: "Web · iOS · Android" },
              { key: "Duration", val: "10 months" },
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
          triage incidents 24/7 across multiple tools. I led a 10-month redesign of the alert
          pipeline — consolidating surfaces, introducing risk-based scoring, and shipping a
          unified design system across Web, iOS, and Android. Three headline outcomes:
        </BP>

        {/* Headline metric cards — above fold */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-px rounded-2xl overflow-hidden mt-8"
          style={{ background: "#d4cfc8", border: "1.5px solid #d4cfc8" }}
        >
          {[
            { val: "−32%",  label: "Time-to-triage critical alerts" },
            { val: "+18%",  label: "Analyst satisfaction with workflows" },
            { val: "Fewer", label: "Missed critical incidents (qualitative, 60 days post-launch)" },
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
        <BH>Analysts were drowning in alerts across three tools</BH>
        <BP>
          Security analysts at SecureVault triaged across three separate tools. High alert
          volume — 200+ alerts per shift — led to missed or delayed responses. The pain
          surfaced as inconsistent data states, slow decision-making, and audit gaps.
        </BP>

        <Callout label="Current environment" variant="amber" className="my-6">
          Three tools running separately, causing fragmented workflows and cognitive
          overload. Analysts switched between an alert queue, a comments thread, and a
          messaging channel — re-orienting every time — with no shared concept of incident
          state across surfaces.
        </Callout>

        <BH>Constraints</BH>
        <div className="grid sm:grid-cols-2 gap-3 mt-3">
          {[
            {
              label: "Existing alert engine only",
              body: "We couldn't change the upstream detection or scoring engine. The redesign had to make better use of signals already produced, not invent new ones.",
            },
            {
              label: "24/7 SOC operations — zero-downtime deploys",
              body: "SecureVault ran live client SOC operations continuously. The redesign had to ship incrementally — no big-bang cutover, no disruption to running shifts.",
            },
            {
              label: "Strict compliance",
              body: "Must meet audit and regulatory requirements — every action traceable, every state change logged, every notification policy explicit.",
            },
            {
              label: "Limited analyst time",
              body: "Senior analysts only spare 1-3 hours per week for research and validation. Every contextual inquiry and usability session had to be tightly scoped.",
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
      </CsSection>

      {/* ── SECTION 03: THE APPROACH ──────────────────────── */}
      <CsSection id="cs-approach" num="03" title="The Approach">
        <BP>
          Collaborated closely with PM, Engineering Lead, and SOC managers to map current
          workflows, validate concepts, and refine designs based on real user feedback.
        </BP>

        <BH>Key activities</BH>
        <div className="grid sm:grid-cols-3 gap-3 mt-3 mb-2">
          {[
            {
              num: "01",
              label: "Discovery Studio",
              body: "Workshop with PM, SOC lead, and Engineering Lead to align on risks, constraints, and success metrics.",
            },
            {
              num: "02",
              label: "Contextual inquiries",
              body: "Observed 6 frontline analysts handling live incidents to capture workflow patterns and pain points.",
            },
            {
              num: "03",
              label: "Usability testing",
              body: "Two rounds of testing on interactive prototypes to capture robust feedback and refine interaction details.",
            },
          ].map((s) => (
            <div
              key={s.num}
              className="bg-white rounded-lg p-4"
              style={{ border: "1.5px solid #d4cfc8", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
            >
              <span style={{ fontSize: 22, fontWeight: 700, color: "#c47a5e", lineHeight: 1, display: "block", marginBottom: 8 }}>
                {s.num}
              </span>
              <p className="font-semibold mb-1" style={{ fontSize: "13px", color: "#1a1a1a" }}>
                {s.label}
              </p>
              <p className="leading-snug" style={{ fontSize: "12px", lineHeight: "1.5", color: "#5a5550" }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>

        <BH>Three key design decisions</BH>
        <p
          className="mt-2 mb-4"
          style={{
            color: "#3D6163",
            fontFamily: "Inter, var(--font-family-primary), sans-serif",
            fontSize: "13px",
            fontStyle: "italic",
            lineHeight: "1.6",
            borderLeft: "3px solid #D8E8E8",
            paddingLeft: "12px",
          }}
        >
          The following screens are representative mockups created for portfolio purposes.
          Original interface designs remain confidential under a mutual NDA with the client
          organisation.
        </p>
        <div className="space-y-4 my-6">
          <DecisionCard
            num={1}
            title="Consolidate alerts into a single incident view"
            rationale="Reduced context-switching by integrating all relevant information — live actions on one screen, aligned with analysts' mental models."
            tradeoff="Accepted a denser interface to minimise navigation overhead. Ran multiple rapid prototyping sessions and design critiques to optimise information density."
            impact="Enabled leaner triage and improved audit log accuracy."
            links={[{ label: "View flow diagram" }, { label: "View prototype screen" }]}
          />
          <DecisionCard
            num={2}
            title="Allow critical alerts to break through Do-Not-Disturb"
            rationale="Integrated filtering to surface urgent security alerts even when analyst devices were in Do-Not-Disturb mode — to avoid missed critical incidents."
            tradeoff="Required users to configure notification preferences explicitly. Implemented clear escalation design patterns to set expectations appropriately."
            impact="Ensured timely alert delivery to mobile SOC analysts, reducing the risk of missed critical alerts."
            links={[{ label: "View mobile prototype" }]}
          />
          <DecisionCard
            num={3}
            title="Visually separate alerts from routine pushes"
            rationale="Developed a distinct visual language using colour, iconography, and typography to separate security alert notifications from routine system pushes — while respecting existing design system consistency."
            tradeoff="Carefully balanced user fatigue and contrast — alerts had to be clearly distinguished from routine productivity notifications."
            impact="Improved analyst ability to prioritise and respond appropriately, increasing overall efficiency."
            links={[{ label: "View notification design components" }]}
          />
        </div>
      </CsSection>

      {/* ── SECTION 04: THE RESULT ────────────────────────── */}
      <CsSection id="cs-result" num="04" title="The Result">
        <BH>Before &amp; after</BH>

        <div className="overflow-x-auto -mx-2 px-2 my-6 rounded-lg overflow-hidden bg-white" style={{ border: "1px solid #d4cfc8" }}>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ background: "#f0ede8", borderBottom: "2px solid #d4cfc8" }}>
                {["Metric", "Before", "After", "Change / Impact"].map((h) => (
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
                  before: "25–30 mins",
                  after: "17 mins",
                  change: "Reduced by 32% — faster response to high-severity incidents",
                },
                {
                  metric: "Analyst satisfaction with triage workflows",
                  before: "3.2 / 5",
                  after: "3.8 / 5",
                  change: "Improved by 19% — cleaner workflows and reduced cognitive load",
                },
                {
                  metric: "Missed critical incidents (qualitative)",
                  before: "Frequent escalations due to missed alerts",
                  after: "Fewer escalations reported",
                  change: "SOC lead reports noticeable reduction; ongoing monitoring in place",
                },
                {
                  metric: "Cross-platform consistency (qualitative)",
                  before: "Fragmented design system, ~15 inconsistent components",
                  after: "Unified system — 60+ components, 180+ semantic tokens",
                  change: "Platform-consistent UI, reduced dev rework across iOS, Android, Web",
                },
              ].map((row, i) => (
                <tr
                  key={i}
                  className="last:border-0 hover:bg-black/[0.015] transition-colors"
                  style={{ borderBottom: "1px solid #e8e3dc" }}
                >
                  <td className="py-3.5 px-4 font-semibold align-top" style={{ fontSize: "var(--typo-p-xs-size)", color: "#1a1a1a" }}>
                    {row.metric}
                  </td>
                  <td className="py-3.5 px-4 text-gray-400 align-top" style={{ fontSize: "var(--typo-p-xs-size)" }}>
                    {row.before}
                  </td>
                  <td className="py-3.5 px-4 font-medium align-top" style={{ fontSize: "var(--typo-p-xs-size)", color: "#1a7a4a" }}>
                    {row.after}
                  </td>
                  <td className="py-3.5 px-4 align-top" style={{ fontSize: "var(--typo-p-xs-size)", color: "#5a5550" }}>
                    {row.change}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Callout label="Validation" variant="teal" className="my-6">
          Data collected from production analytics and SOC operational reports approximately
          8 weeks post-launch.
        </Callout>

        <BH>What users said</BH>
        <div className="space-y-3 mt-4">
          {[
            {
              quote: "I no longer have to scroll the whole queue — what's marked urgent is right at the top, every time.",
              source: "Analyst — post-pilot debrief",
            },
            {
              quote: "It's much easier to see what's first and there's clear options available now.",
              source: "Ryan — Analyst",
            },
            {
              quote: "I wasn't sure about crosspath whether to do my signup or by phone.",
              source: "Wendy — pre-launch usability test",
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
              body: "Spent early research mapping features rather than starting from business outcomes. Starting from \"what does a successful analyst shift look like?\" would have focused the brief faster.",
            },
            {
              num: "2",
              title: "Limited usability testing",
              body: "Only two rounds with 5 participants each. With more time I'd push for broader recruitment — including night-shift analysts and contractors with different fatigue profiles.",
            },
            {
              num: "3",
              title: "Would explore predictive analytics for proactive detection",
              body: "The redesign was reactive — consolidating existing alerts. A meaningful next step would be ML-assisted alert scoring to surface likely-critical items before analysts open them.",
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

        <BH>Related design principles in action</BH>
        <div className="space-y-3 mt-4">
          {[
            {
              num: "1",
              title: "Treat contexts as a first-class design object",
              body: "State, role, and shift context aren't engineering details — they're the primary design material for any workflow product. Design navigation, content visibility, and available actions around context first.",
            },
            {
              num: "2",
              title: "Systems over single screens",
              body: "60+ components and 180+ semantic tokens beat any single hero screen. A shared system survives scope changes, release trains, and personnel turnover; one-off screens don't.",
            },
            {
              num: "3",
              title: "Make AI safe and explainable",
              body: "Risk scoring and prioritisation that affect critical decisions need to be inspectable. Confidence labels, explicit thresholds, and clear escalation patterns turn opaque scoring into something analysts can trust and audit.",
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
            Happy to share additional artefacts, walk through the risk scoring and
            consolidated incident view in detail, or talk through how this would apply to
            your product.
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
