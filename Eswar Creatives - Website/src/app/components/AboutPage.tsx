import { Navbar } from "./Navbar";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { SectionHeader } from "./SectionHeader";
import { Tag } from "./ui/tag";
import { PortfolioButton } from "./ui/portfolio-button";
import { BulletItem } from "./ui/bullet-item";
import { ContactRow } from "./ui/contact-row";
import { ContactModal } from "./ContactModal";
import {
  useResumeDownload,
  RESUME_URL,
  RESUME_FILENAME,
} from "./useResumeDownload";
import { motion, useInView, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Download,
  Loader2,
  ArrowRight,
  Quote,
  Figma,
  Cpu,
  BarChart3,
  Wrench,
  Search,
  Palette,
  Briefcase,
  Phone,
  Mail,
  MessageCircle,
  Linkedin,
  Target,
  Network,
  ShieldCheck,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import aboutPortraitImg from "figma:asset/c4061f3859705f1a6e868e7847a1b31bfa55ffb7.png";
import { CuaBadge } from "./ui/cua-badge";
import kevinAvatar from "figma:asset/5ee03f7486adfebe6b0fe3e143bfd9dc5d3b92ec.png";
import michaelAvatar from "figma:asset/e0ab91900f0120ab7e2513447afe28d28fc12669.png";
import yuliAvatar from "figma:asset/34300ee8328fba57b01edb6d8c565580e891db48.png";

/* Testimonial avatars */
import vikasAvatar from "figma:asset/c7e1981fda092d53464367c0a485c692375a4f6c.png";
import dineshAvatar from "figma:asset/98298dc6ce93fe5bc45c1125c260d8c03e00a164.png";
import yaminiAvatar from "figma:asset/95e2834349edb3f775bc90fc70038b11053d1491.png";
import marlonAvatar from "figma:asset/bd23b25438aa80eae47baba4f52a26e91cae6128.png";
import kateAvatar from "figma:asset/fd2a390213d37753a74912bd86e43e95b1c59111.png";
import omarAvatar from "figma:asset/5838090c812866da0a937f88c78dcc558bce3954.png";
import karthickAvatar from "figma:asset/b632ce44227172738be44e679eaeddb763c325be.png";
import aarthiAvatar from "figma:asset/39c894e41306fa3a3920d48110af992629741e87.png";

/* Company logos */
import logoCygnvs from "../../imports/cyg-logo.svg";
import logoVectone from "../../imports/vectone-logo.svg";
import logoRevmakx from "../../imports/revmakx-logo.svg";
import logoUniversal from "../../imports/ucds-logo.svg";
import logoAd2pro from "../../imports/2adpro-logo.svg";
import logoNittany from "../../imports/nittany-logo.svg";

/* ═════════════════════════════════════════════════════
   1. ABOUT HERO
   ═══════════════════════════════════════════�������═════ */
function AboutHero({ onContactClick }: { onContactClick?: () => void }) {
  const { isDownloading, handleDownload, fileSize } = useResumeDownload();

  return (
    <section className="relative pt-20 md:pt-24 pb-10 md:pb-12 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
          {/* Left — Text */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <h1
              className="text-text-primary mb-4"
              style={{
                fontSize: "var(--typo-h1-size)",
                fontWeight: "var(--typo-h1-weight)",
                lineHeight: "var(--typo-h1-line-height)",
                letterSpacing: "var(--typo-h1-letter-spacing)",
              }}
            >
              About Eswar{" "}
              <span className="text-text-quaternary">(Maheswaran Y)</span>
            </h1>

            <p
              className="text-text-secondary mb-6 max-w-lg"
              style={{
                fontSize: "var(--typo-p-lg-size)",
                lineHeight: "var(--typo-p-lg-line-height)",
                fontWeight: "var(--typo-p-lg-weight)",
              }}
            >
              Senior Product Designer with 20+ years of experience — 11+ in
              enterprise SaaS and a foundation in visual design — crafting web
              and mobile workflows for data-heavy, security-sensitive products.
              Focused on turning complex systems into clear, measurable
              experiences for global teams.
            </p>

            {/* Bullet highlights */}
            <ul className="space-y-2 mb-6">
              <BulletItem>
                Turning complex systems into clear, measurable workflows
              </BulletItem>
              <BulletItem>
                Experience across cybersecurity, communication-focused SaaS
                workflows, and AI-integrated decision systems
              </BulletItem>
              <BulletItem>
                Based in Chennai, open to relocating or working with US/EU/APAC
                teams
              </BulletItem>
            </ul>

            {/* CUA Badge — mobile only, inline */}
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="mb-6 md:mb-8 md:hidden"
            >
              <CuaBadge accent="warning" />
            </motion.div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3">
              <PortfolioButton
                href={RESUME_URL}
                download={RESUME_FILENAME}
                onClick={handleDownload}
                variant="primary"
                size="lg"
                loading={isDownloading}
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isDownloading
                  ? "Downloading…"
                  : `Download resume • ${fileSize ?? "1.8 MB"} (PDF)`}
              </PortfolioButton>
              <PortfolioButton
                variant="secondary"
                size="lg"
                onClick={onContactClick}
              >
                Contact Eswar
              </PortfolioButton>
            </div>
          </motion.div>

          {/* Right — Portrait */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.8,
              delay: 0.2,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="relative flex justify-center md:justify-end"
          >
            {/* Background glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] md:w-[480px] md:h-[480px] rounded-full bg-gradient-to-br from-orange-100/40 via-amber-50/30 to-rose-100/20 blur-3xl" />
            <div className="absolute top-8 right-8 w-20 h-20 rounded-full border border-orange-200/40" />
            <div className="absolute bottom-12 left-8 w-12 h-12 rounded-full bg-amber-100/50" />

            <div className="relative w-full max-w-[392px] aspect-[392/417] md:max-w-none md:w-[541px] md:h-[538px] md:aspect-auto mx-auto md:mx-0">
              <ImageWithFallback
                src={aboutPortraitImg}
                alt="Eswar — Senior UX Designer"
                className="w-full h-full object-contain relative z-10"
              />

              {/* CUA Badge — desktop only, bottom-right of portrait */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="hidden md:block absolute bottom-[13%] right-[-8%] z-20"
              >
                <CuaBadge accent="warning" variant="elevated" />
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ═══════��════════════���══════════════════════════════
   2. SNAPSHOT TIMELINE
   ═══════════════════════════════════════════════════════ */

interface TimelineEntry {
  title: string;
  company: string;
  logo: string;
  period: string;
  years: number;
  label: string;
  summary: string;
  highlight?: string;
  tags: string[];
  accentDot: string;
  accentText: string;
  accentFrom: string;
  accentTo: string;
  achievements?: string[];
}

const uxRoles: TimelineEntry[] = [
  {
    title: "Lead Product Designer",
    company: "CYGNVS",
    logo: logoCygnvs,
    period: "2023 \u2013 2025",
    years: 2.5,
    label: "2.5 yrs",
    summary:
      "End-to-end mobile UX for AI cybersecurity SaaS across Web, iOS & Android. Built design system from scratch.",
    highlight: "$3.25M+ ARR from TTX Player \u00B7 45% faster design-to-dev",
    achievements: [
      "40% better user satisfaction & 25% faster task completion",
      "30% discoverability lift via enterprise IA redesign",
      "40% design-to-dev efficiency gain with scalable UI frameworks",
      "AI-assisted iconography system for crisis-workflow clarity",
      "Cross-functional IA strategy aligned AI-driven UX to business goals",
    ],
    tags: ["AI Workflows", "Cross-Platform", "Design Systems"],
    accentDot: "bg-violet-500",
    accentText: "text-violet-600",
    accentFrom: "from-violet-500/10",
    accentTo: "to-violet-500/5",
  },
  {
    title: "Head of UI Design",
    company: "Vectone",
    logo: logoVectone,
    period: "2021 \u2013 2023",
    years: 2,
    label: "2 yrs",
    summary:
      "Redesigned SaaS video collaboration platform. Unified meetings, messaging, files & tasks into one cohesive experience.",
    highlight: "Improved engagement via UX-driven re-platform",
    tags: ["SaaS Platform", "Design Systems", "Accessibility"],
    accentDot: "bg-violet-500",
    accentText: "text-purple-600",
    accentFrom: "from-purple-500/10",
    accentTo: "to-purple-500/5",
  },
  {
    title: "UX Designer",
    company: "Revmakx Technologies",
    logo: logoRevmakx,
    period: "2014 \u2013 2021",
    years: 7,
    label: "7 yrs",
    summary:
      "UI/UX for 6+ SaaS products \u2014 helpdesk, CRM, analytics, WordPress admin \u2014 web & mobile.",
    highlight: "100+ explorations \u00B7 Shipped HelpNinja, InfiniteWP v3 & WP Reports",
    tags: ["Multi-Product", "Prototyping", "WordPress"],
    accentDot: "bg-violet-500",
    accentText: "text-slate-600",
    accentFrom: "from-slate-500/10",
    accentTo: "to-slate-500/5",
  },
];

const creativeRoles: TimelineEntry[] = [
  {
    title: "Founder & Chief Visual Designer",
    company: "Universal Creative Design Studio",
    logo: logoUniversal,
    period: "2011 \u2013 2013",
    years: 3,
    label: "3 yrs",
    summary:
      "Founded studio. Led product design, UX & branding for a leading LMS while managing a team of three.",
    tags: ["Entrepreneurship", "LMS", "Branding"],
    accentDot: "bg-emerald-500",
    accentText: "text-emerald-600",
    accentFrom: "from-emerald-500/10",
    accentTo: "to-emerald-500/5",
  },
  {
    title: "Creative Specialist / Graphic Designer",
    company: "Ad2pro Media Solutions",
    logo: logoAd2pro,
    period: "2007 \u2013 2010",
    years: 3.5,
    label: "3.5 yrs",
    summary:
      "End-to-end visual & UI for global brands \u2014 digital systems, microsites, 2D/3D motion, and rich-media campaigns.",
    tags: ["Motion Design", "Branding", "Global Clients"],
    accentDot: "bg-emerald-500",
    accentText: "text-lime-700",
    accentFrom: "from-lime-500/10",
    accentTo: "to-lime-500/5",
  },
  {
    title: "Digital Artist / Graphic Designer",
    company: "Nittany Creative Solutions",
    logo: logoNittany,
    period: "2005 \u2013 2007",
    years: 2,
    label: "2 yrs",
    summary:
      "Produced 100+ vectorized assets/month \u2014 logos, scientific illustrations, anatomical visuals, and maps.",
    tags: ["Vector Art", "Illustration", "Production"],
    accentDot: "bg-emerald-500",
    accentText: "text-sky-600",
    accentFrom: "from-sky-500/10",
    accentTo: "to-sky-500/5",
  },
];

const allRoles = [...uxRoles, ...creativeRoles];
const totalYears = Math.round(allRoles.reduce((s, r) => s + r.years, 0));

/* Accent color resolver — single source of truth for overlay tints */
function getAccentRgba(accentFrom: string, intensity: number): string {
  const map: Record<string, string> = {
    violet: `rgba(139,92,246,${intensity})`,
    purple: `rgba(168,85,247,${intensity})`,
    slate: `rgba(100,116,139,${intensity * 0.85})`,
    emerald: `rgba(16,185,129,${intensity})`,
    lime: `rgba(101,163,13,${intensity * 0.85})`,
    sky: `rgba(14,165,233,${intensity})`,
  };
  const key = Object.keys(map).find((k) => accentFrom.includes(k));
  return key ? map[key] : `rgba(0,0,0,${intensity * 0.5})`;
}

/* Shared card renderer */
function TimelineCard({
  item,
  index,
  inView,
  isFeature = false,
  cardId,
  isHighlighted = false,
  onSelect,
  onHoverStart,
}: {
  item: TimelineEntry;
  index: number;
  inView: boolean;
  isFeature?: boolean;
  cardId?: string;
  isHighlighted?: boolean;
  onSelect?: (index: number) => void;
  onHoverStart?: () => void;
}) {
  /* Track whether the entrance animation has settled */
  const [settled, setSettled] = useState(false);
  const prevHighlighted = useRef(false);

  useEffect(() => {
    if (isHighlighted && !prevHighlighted.current) {
      setSettled(false);
    }
    if (!isHighlighted) {
      setSettled(false);
    }
    prevHighlighted.current = isHighlighted;
  }, [isHighlighted]);

  /* Precompute overlay color */
  const overlayGradient = `linear-gradient(135deg, ${getAccentRgba(item.accentFrom, 0.14)}, transparent)`;
  const overlaySettledGradient = `linear-gradient(135deg, ${getAccentRgba(item.accentFrom, 0.08)}, transparent)`;

  return (
    <motion.div
      id={cardId}
      initial={{ opacity: 0, y: 24 }}
      animate={
        isHighlighted && !settled
          ? { opacity: 1, y: 0, scale: [1, 1.035, 0.995, 1.01, 1] }
          : isHighlighted && settled
            ? { opacity: 1, y: 0, scale: 1 }
            : inView
              ? { opacity: 1, y: 0, scale: 1 }
              : {}
      }
      transition={
        isHighlighted && !settled
          ? { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
          : isHighlighted && settled
            ? { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }
            : !isHighlighted
              ? { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
              : { duration: 0.5, delay: 0.1 + index * 0.08 }
      }
      onAnimationComplete={() => {
        if (isHighlighted && !settled) {
          setSettled(true);
        }
      }}
      onClick={() => onSelect?.(index)}
      onMouseEnter={() => onHoverStart?.()}
      data-timeline-card
      className={`group relative overflow-hidden rounded-2xl border bg-white transition-[border-color,box-shadow] duration-300 ease-in-out cursor-pointer h-full ${
        isHighlighted
          ? "border-black/[0.14] shadow-lg shadow-black/[0.06]"
          : "border-black/[0.06] hover:border-border-medium-alpha hover:shadow-xl hover:shadow-black/[0.06]"
      }`}
      whileHover={!isHighlighted ? { y: -4 } : undefined}
      whileTap={!isHighlighted ? { scale: 0.995 } : undefined}
      style={isHighlighted ? { y: -2 } : undefined}
    >
      {/* Selection overlay — unified element with animated opacity */}
      <motion.div
        className="absolute inset-0 z-10 rounded-2xl pointer-events-none"
        style={{ background: isHighlighted && settled ? overlaySettledGradient : overlayGradient }}
        initial={{ opacity: 0 }}
        animate={
          isHighlighted && !settled
            ? { opacity: [0, 0.9, 0.55] }
            : isHighlighted && settled
              ? { opacity: 0.55 }
              : { opacity: 0 }
        }
        transition={
          isHighlighted && !settled
            ? { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
            : { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }
        }
      />

      {/* Hover gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${item.accentFrom} ${item.accentTo} opacity-0 group-hover:opacity-100 transition-opacity duration-400`}
      />

      <div
        className={`relative p-4 md:p-5 flex flex-col h-full ${
          isFeature ? "min-h-[240px]" : "min-h-[180px]"
        }`}
      >
        {/* Top: Logo + Period + Duration */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <img
              src={item.logo}
              alt={item.company}
              className="w-8 h-8 rounded-lg object-contain shrink-0"
            />
            <div>
              <span
                className="text-text-primary block"
                style={{
                  fontSize: "var(--typo-caption-m-size)",
                  lineHeight: "var(--typo-caption-m-line-height)",
                  fontWeight: "var(--typo-caption-m-weight)",
                }}
              >
                {item.company}
              </span>
              <span
                className="text-text-quaternary block"
                style={{
                  fontSize: "var(--typo-p-xs-size)",
                  lineHeight: "var(--typo-p-xs-line-height)",
                  fontWeight: "var(--typo-p-xs-weight)",
                }}
              >
                {item.period}
              </span>
            </div>
          </div>
          {/* Duration badge */}
          <span
            className="text-text-disabled-alpha opacity-50 group-hover:opacity-90 transition-opacity duration-300 select-none whitespace-nowrap shrink-0"
            style={{
              fontSize: isFeature ? "40px" : "26px",
              fontWeight: 700,
              lineHeight: "1",
              letterSpacing: "-0.04em",
            }}
          >
            {item.label}
          </span>
        </div>

        {/* Role title */}
        <h3
          className="text-text-primary mb-2"
          style={{
            fontSize: isFeature
              ? "var(--typo-h5-size)"
              : "var(--typo-ol-body-semi-size)",
            lineHeight: isFeature
              ? "var(--typo-h5-line-height)"
              : "var(--typo-ol-body-semi-line-height)",
            fontWeight: isFeature
              ? "var(--typo-h5-weight)"
              : "var(--typo-ol-body-semi-weight)",
          }}
        >
          {item.title}
        </h3>

        {/* Summary */}
        <p
          className="text-text-secondary mb-2 flex-1"
          style={{
            fontSize: "var(--typo-p-xs-size)",
            lineHeight: "var(--typo-p-xs-line-height)",
            fontWeight: "var(--typo-p-xs-weight)",
          }}
        >
          {item.summary}
        </p>

        {/* Highlight metric */}
        {item.highlight && (
          <p
            className="text-text-warning mb-3"
            style={{
              fontSize: "var(--typo-caption-m-size)",
              lineHeight: "var(--typo-caption-m-line-height)",
              fontWeight: "var(--typo-caption-m-weight)",
            }}
          >
            {item.highlight}
          </p>
        )}

        {/* Achievements */}
        {item.achievements && (
          <ul className="space-y-1 mb-3">
            {item.achievements.map((ach) => (
              <li
                key={ach}
                className="flex items-start gap-1.5 text-text-tertiary"
                style={{
                  fontSize: "var(--typo-p-xs-size)",
                  lineHeight: "var(--typo-p-xs-line-height)",
                  fontWeight: "var(--typo-p-xs-weight)",
                }}
              >
                <span className="shrink-0 mt-[5px] w-1 h-1 rounded-full bg-current opacity-40" />
                {ach}
              </li>
            ))}
          </ul>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-auto">
          {item.tags.map((tag) => (
            <Tag key={tag} variant="outlined" size="sm">
              {tag}
            </Tag>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function SnapshotTimeline() {
  const ref = useRef(null);
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [hoveredDash, setHoveredDash] = useState<number | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Auto-cycle state ── */
  const AUTO_CYCLE_INTERVAL = 3500;
  const AUTO_CYCLE_RESUME_DELAY = 6000;
  const AUTO_CYCLE_INITIAL_DELAY = 2000;
  const [autoCycleActive, setAutoCycleActive] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const autoCycleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCycleIndex = useRef(0);

  /* Start auto-cycle once section is in view */
  useEffect(() => {
    if (!inView) return;
    const delay = setTimeout(() => {
      if (!userInteracted) {
        setAutoCycleActive(true);
      }
    }, AUTO_CYCLE_INITIAL_DELAY);
    return () => clearTimeout(delay);
  }, [inView, userInteracted]);

  /* Run auto-cycle interval */
  useEffect(() => {
    if (!autoCycleActive) {
      if (autoCycleTimer.current) {
        clearInterval(autoCycleTimer.current);
        autoCycleTimer.current = null;
      }
      return;
    }

    /* Immediately highlight the first card */
    setHighlightedIndex(autoCycleIndex.current);

    autoCycleTimer.current = setInterval(() => {
      autoCycleIndex.current = (autoCycleIndex.current + 1) % allRoles.length;
      setHighlightedIndex(autoCycleIndex.current);
    }, AUTO_CYCLE_INTERVAL);

    return () => {
      if (autoCycleTimer.current) {
        clearInterval(autoCycleTimer.current);
        autoCycleTimer.current = null;
      }
    };
  }, [autoCycleActive]);

  /* Pause auto-cycle on user interaction, resume after delay */
  const highlightedIndexRef = useRef(highlightedIndex);
  highlightedIndexRef.current = highlightedIndex;

  const pauseAutoCycle = useCallback(() => {
    setUserInteracted(true);
    setAutoCycleActive(false);

    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      const current = highlightedIndexRef.current;
      const resumeFrom = current !== null
        ? (current + 1) % allRoles.length
        : 0;
      autoCycleIndex.current = resumeFrom;
      setUserInteracted(false);
      setAutoCycleActive(true);
    }, AUTO_CYCLE_RESUME_DELAY);
  }, []);

  /* Cleanup resume timer on unmount */
  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
    };
  }, []);

  /* Refs for measuring actual dash positions */
  const barRef = useRef<HTMLDivElement>(null);
  const dashRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [tooltipLeft, setTooltipLeft] = useState(0);

  /* Compute tooltip position from actual DOM measurements */
  const activeTooltipIdx =
    hoveredDash !== null
      ? hoveredDash
      : highlightedIndex !== null && highlightedIndex < allRoles.length
        ? highlightedIndex
        : null;

  useEffect(() => {
    if (activeTooltipIdx === null || !barRef.current) return;
    const dashEl = dashRefs.current[activeTooltipIdx];
    if (!dashEl) return;

    const barRect = barRef.current.getBoundingClientRect();
    const dashRect = dashEl.getBoundingClientRect();
    /* Center of the dash relative to the bar container */
    const center = dashRect.left + dashRect.width / 2 - barRect.left;
    setTooltipLeft(center);
  }, [activeTooltipIdx]);

  /* Click outside to deselect */
  useEffect(() => {
    if (highlightedIndex === null) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      /* If the click is inside a timeline card or a tenure dash, let those handlers manage state */
      if (
        target.closest("[data-timeline-card]") ||
        target.closest("[data-tenure-dash]")
      ) return;
      setHighlightedIndex(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [highlightedIndex]);

  const handleDashClick = useCallback((index: number) => {
    pauseAutoCycle();
    const cardEl = document.getElementById(`timeline-card-${index}`);
    if (!cardEl) return;

    /* Clear any previous highlight */
    if (highlightTimer.current) clearTimeout(highlightTimer.current);

    /* If clicking the same card, deselect it */
    setHighlightedIndex((prev) => {
      if (prev === index) return null;

      /* Smooth-scroll to the card, centered in viewport */
      cardEl.scrollIntoView({ behavior: "smooth", block: "center" });

      /* Brief null reset then re-highlight after scroll */
      setTimeout(() => {
        setHighlightedIndex(index);
      }, 350);

      return null;
    });
  }, [pauseAutoCycle]);

  /* Toggle selection directly on a card (no scroll needed) */
  const handleCardSelect = useCallback((index: number) => {
    pauseAutoCycle();
    if (highlightTimer.current) clearTimeout(highlightTimer.current);

    setHighlightedIndex((prev) => {
      if (prev === index) return null;

      /* Brief reset so the bounce animation re-triggers */
      requestAnimationFrame(() => {
        setHighlightedIndex(index);
      });
      return null;
    });
  }, [pauseAutoCycle]);

  return (
    <section className="pt-1 md:pt-2 pb-10 md:pb-12">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <SectionHeader
            label="Experience"
            title="Snapshot timeline"
            description={`\u201CWhere I\u2019ve spent the most time and impact.\u201D`}
          />

          {/* ── Summary Stats Bar ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="sticky top-[6.5rem] z-30 flex flex-wrap items-center gap-6 md:gap-10 mb-10 py-4 -mx-4 px-4 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(237,233,254,0.52) 0%, rgba(224,231,255,0.38) 30%, rgba(255,255,255,0.50) 60%, rgba(238,234,255,0.42) 100%)",
              backdropFilter: "blur(48px) saturate(2.2) brightness(1.08)",
              WebkitBackdropFilter: "blur(48px) saturate(2.2) brightness(1.08)",
              border: "1px solid rgba(255,255,255,0.55)",
              boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.85), inset 0 0 0 0.5px rgba(255,255,255,0.4), inset 0 -1px 0 0 rgba(255,255,255,0.15), 0 1px 2px rgba(139,92,246,0.04), 0 4px 24px -4px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div className="flex items-baseline gap-2">
              <span
                className="text-text-primary"
                style={{
                  fontSize: "var(--typo-h2-size)",
                  fontWeight: "var(--typo-h2-weight)",
                  lineHeight: "var(--typo-h2-line-height)",
                  letterSpacing: "var(--typo-h2-letter-spacing)",
                }}
              >
                {totalYears}+
              </span>
              <span
                className="text-text-tertiary"
                style={{
                  fontSize: "var(--typo-p-sm-size)",
                  lineHeight: "var(--typo-p-sm-line-height)",
                  fontWeight: "var(--typo-p-sm-weight)",
                }}
              >
                years in design
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="text-text-primary"
                style={{
                  fontSize: "var(--typo-h2-size)",
                  fontWeight: "var(--typo-h2-weight)",
                  lineHeight: "var(--typo-h2-line-height)",
                  letterSpacing: "var(--typo-h2-letter-spacing)",
                }}
              >
                {allRoles.length}
              </span>
              <span
                className="text-text-tertiary"
                style={{
                  fontSize: "var(--typo-p-sm-size)",
                  lineHeight: "var(--typo-p-sm-line-height)",
                  fontWeight: "var(--typo-p-sm-weight)",
                }}
              >
                companies
              </span>
            </div>
            {/* Visual tenure bar — interactive */}
            <div ref={barRef} className="hidden md:flex items-center gap-1.5 flex-1 max-w-sm ml-auto relative">
              {/* Single sliding tooltip bubble — positioned via measured DOM offsets */}
              <AnimatePresence>
                {activeTooltipIdx !== null && (
                  <motion.div
                    key="tenure-tooltip"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{
                      opacity: { duration: 0.15 },
                      y: { duration: 0.15 },
                    }}
                    className="absolute bottom-full mb-2.5 pointer-events-none z-50"
                    style={{ left: 0, right: 0 }}
                  >
                    <motion.div
                      animate={{ x: tooltipLeft }}
                      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
                      className="w-0 flex justify-center"
                    >
                      <div
                        className="px-2.5 py-1.5 bg-gray-900 text-white whitespace-nowrap shadow-lg relative"
                        style={{
                          fontSize: "var(--typo-caption-r-size)",
                          lineHeight: "var(--typo-caption-r-line-height)",
                          fontWeight: "var(--typo-caption-m-weight)",
                          borderRadius: "var(--corner-pill)",
                        }}
                      >
                        {/* Text crossfade */}
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={activeTooltipIdx}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            className="flex items-center"
                          >
                            <span>{allRoles[activeTooltipIdx].company}</span>
                            <span className="text-white/50 ml-1.5">
                              {allRoles[activeTooltipIdx].label}
                            </span>
                          </motion.span>
                        </AnimatePresence>
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-gray-900" />
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              {allRoles.map((r, i) => (
                <div
                  key={i}
                  className="relative"
                  data-tenure-dash
                  style={{ flex: r.years }}
                  ref={(el) => { dashRefs.current[i] = el; }}
                  onMouseEnter={() => { setHoveredDash(i); pauseAutoCycle(); }}
                  onMouseLeave={() => setHoveredDash(null)}
                >
                  <motion.button
                    type="button"
                    aria-label={`Jump to ${r.company} — ${r.label}`}
                    className={`w-full cursor-pointer transition-all duration-300 ease-out ${r.accentDot} ${
                      highlightedIndex === i
                        ? "h-3 brightness-110 ring-1 ring-inset ring-black/[0.12] shadow-sm shadow-black/[0.08]"
                        : hoveredDash === i
                          ? "h-2.5 brightness-110 ring-1 ring-inset ring-black/[0.08]"
                          : "h-1.5"
                    }`}
                    style={{ borderRadius: "var(--corner-pill)" }}
                    onClick={() => handleDashClick(i)}
                    initial={{ scaleX: 0 }}
                    animate={inView ? { scaleX: 1, scaleY: highlightedIndex === i ? 1.35 : hoveredDash === i ? 1.15 : 1 } : {}}
                    transition={{ duration: 0.6, delay: 0.3 + i * 0.08, scaleY: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] } }}
                    whileTap={{ scale: 0.96 }}
                  />
                </div>
              ))}
            </div>
          </motion.div>

          {/* ═══ GROUP 1: UX & UI Designing ═══ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mb-10"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1.5 h-6 bg-violet-500" style={{ borderRadius: "var(--corner-pill)" }} />
              <h3
                className="text-text-primary"
                style={{
                  fontSize: "var(--typo-h5-size)",
                  lineHeight: "var(--typo-h5-line-height)",
                  fontWeight: "var(--typo-h5-weight)",
                }}
              >
                UX Design
              </h3>
              <span
                className="text-text-quaternary"
                style={{
                  fontSize: "var(--typo-caption-r-size)",
                  lineHeight: "var(--typo-caption-r-line-height)",
                  fontWeight: "var(--typo-caption-r-weight)",
                }}
              >
                2014 &ndash; Present
              </span>
            </div>

            {/* Bento: CYGNVS large left, Vectone + Revmakx stacked right */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-7">
                <TimelineCard
                  item={uxRoles[0]}
                  index={0}
                  inView={inView}
                  isFeature
                  cardId="timeline-card-0"
                  isHighlighted={highlightedIndex === 0}
                  onSelect={handleCardSelect}
                  onHoverStart={pauseAutoCycle}
                />
              </div>
              <div className="md:col-span-5 flex flex-col gap-4">
                <TimelineCard
                  item={uxRoles[1]}
                  index={1}
                  inView={inView}
                  cardId="timeline-card-1"
                  isHighlighted={highlightedIndex === 1}
                  onSelect={handleCardSelect}
                  onHoverStart={pauseAutoCycle}
                />
                <TimelineCard
                  item={uxRoles[2]}
                  index={2}
                  inView={inView}
                  cardId="timeline-card-2"
                  isHighlighted={highlightedIndex === 2}
                  onSelect={handleCardSelect}
                  onHoverStart={pauseAutoCycle}
                />
              </div>
            </div>
          </motion.div>

          {/* ═══ GROUP 2: Creative & Visual Designing ���══ */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1.5 h-6 bg-emerald-500" style={{ borderRadius: "var(--corner-pill)" }} />
              <h3
                className="text-text-primary"
                style={{
                  fontSize: "var(--typo-h5-size)",
                  lineHeight: "var(--typo-h5-line-height)",
                  fontWeight: "var(--typo-h5-weight)",
                }}
              >
                Creative & Visual Design
              </h3>
              <span
                className="text-text-quaternary"
                style={{
                  fontSize: "var(--typo-caption-r-size)",
                  lineHeight: "var(--typo-caption-r-line-height)",
                  fontWeight: "var(--typo-caption-r-weight)",
                }}
              >
                2005 &ndash; 2013
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {creativeRoles.map((item, i) => (
                <TimelineCard
                  key={item.company}
                  item={item}
                  index={i + 3}
                  inView={inView}
                  cardId={`timeline-card-${i + 3}`}
                  isHighlighted={highlightedIndex === i + 3}
                  onSelect={handleCardSelect}
                  onHoverStart={pauseAutoCycle}
                />
              ))}
            </div>
          </motion.div>

        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════��════════════
   3. HOW I WORK
   ════════════════════���═════���═���══════════���═════════════ */
const principles = [
  {
    num: "01",
    label: "Strategy",
    title: "Start from business outcomes",
    mantra: "Metrics first, pixels second",
    description:
      "Define success in numbers, then design the flows that move them. Every screen traces back to a KPI.",
    outcome: "Cut billing disputes 35\u2009% at Telstra by redesigning around churn metrics.",
    link: "Billing platform case study",
    href: "/#work",
    icon: Target,
    accentColor: "rgb(139, 92, 246)",
    accentTextColor: "var(--text-accent-violet)",
    accentBg: "rgba(139, 92, 246, 0.08)",
    accentBgHover: "rgba(139, 92, 246, 0.14)",
    accentBorder: "rgba(139, 92, 246, 0.25)",
  },
  {
    num: "02",
    label: "Systems",
    title: "Systems over single screens",
    mantra: "Design the connections, not the nodes",
    description:
      "Map the full workflow and governance first. Individual interfaces follow the system logic.",
    outcome: "Unified 12 disconnected tools into one cohesive billing platform.",
    link: "Enterprise platform case study",
    href: "/#work",
    icon: Network,
    accentColor: "rgb(14, 165, 233)",
    accentTextColor: "var(--text-accent-sky)",
    accentBg: "rgba(14, 165, 233, 0.08)",
    accentBgHover: "rgba(14, 165, 233, 0.14)",
    accentBorder: "rgba(14, 165, 233, 0.25)",
  },
  {
    num: "03",
    label: "AI",
    title: "Make AI safe and explainable",
    mantra: "Visible, reversible, auditable",
    description:
      "AI suggestions are decisions\u2014they must be transparent and easy to override.",
    outcome: "Reduced alert fatigue 40\u2009% in CYGNVS with explainable AI triage.",
    link: "AI-assisted alerting case study",
    href: "/#work",
    icon: ShieldCheck,
    accentColor: "rgb(16, 185, 129)",
    accentTextColor: "var(--text-accent-emerald)",
    accentBg: "rgba(16, 185, 129, 0.08)",
    accentBgHover: "rgba(16, 185, 129, 0.14)",
    accentBorder: "rgba(16, 185, 129, 0.25)",
  },
  {
    num: "04",
    label: "Collaboration",
    title: "Design for cross-functional reality",
    mantra: "Co-design to ship faster",
    description:
      "Surface constraints early. Co-create with PMs and engineers to land feasible solutions on time.",
    outcome: "Shipped 3 major features in one quarter with zero design\u2013dev rework.",
    link: "Internal tooling case study",
    href: "/#work",
    icon: Users,
    accentColor: "rgb(245, 158, 11)",
    accentTextColor: "var(--text-accent-amber)",
    accentBg: "rgba(245, 158, 11, 0.08)",
    accentBgHover: "rgba(245, 158, 11, 0.14)",
    accentBorder: "rgba(245, 158, 11, 0.25)",
  },
];

function HowIWork() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

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
            label="Design Philosophy"
            title="How I work"
            description={`\u201CHow I think about product design.\u201D`}
          />

          {/* ── Labeled stepper — desktop only ── */}
          <div className="hidden md:flex items-start justify-between mb-6 relative">
            {/* Connector line */}
            <motion.div
              className="absolute left-[calc(12.5%-4px)] right-[calc(12.5%-4px)] top-4 h-px"
              style={{
                background: "linear-gradient(90deg, rgba(139,92,246,0.18), rgba(14,165,233,0.18), rgba(16,185,129,0.18), rgba(245,158,11,0.18))",
                transformOrigin: "left",
              }}
              initial={{ scaleX: 0 }}
              animate={inView ? { scaleX: 1 } : {}}
              transition={{ duration: 0.8, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
            {principles.map((p, i) => (
              <motion.div
                key={p.num}
                initial={{ scale: 0, opacity: 0 }}
                animate={inView ? { scale: 1, opacity: 1 } : {}}
                transition={{ duration: 0.35, delay: 0.4 + i * 0.12, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative z-10 flex flex-col items-center"
                style={{ width: "25%" }}
              >
                {/* Circle */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 mb-2"
                  style={{
                    background: hoveredCard === i ? p.accentColor : "white",
                    border: `2px solid ${hoveredCard === i ? p.accentColor : "var(--border-deep-alpha)"}`,
                    boxShadow: hoveredCard === i
                      ? `0 0 0 4px ${p.accentBg}, 0 2px 8px ${p.accentBg}`
                      : "0 1px 3px rgba(0,0,0,0.06)",
                  }}
                >
                  <span
                    className="transition-colors duration-300"
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: hoveredCard === i ? "var(--text-on-bold)" : "var(--text-quaternary)",
                    }}
                  >
                    {p.num}
                  </span>
                </div>
                {/* Label */}
                <span
                  className="transition-colors duration-300"
                  style={{
                    fontSize: "var(--typo-caption-r-size)",
                    fontWeight: 500,
                    color: hoveredCard === i ? p.accentTextColor : "var(--text-quaternary)",
                  }}
                >
                  {p.label}
                </span>
              </motion.div>
            ))}
          </div>

          {/* ── Cards — horizontal scroll on mobile, 4-col grid on desktop ── */}
          <div className="md:grid md:grid-cols-4 md:gap-4 flex gap-3 overflow-x-auto snap-x snap-mandatory md:overflow-visible pb-12 md:pb-2 pt-4 md:pt-2 -mx-6 px-6 md:mx-0 md:px-0 -mb-8 md:mb-0 scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {principles.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.num}
                  initial={{ opacity: 0, y: 24 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.45, delay: 0.15 + i * 0.1 }}
                  onMouseEnter={() => setHoveredCard(i)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className="group relative bg-white rounded-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col cursor-default snap-start shrink-0 w-[80vw] min-w-[260px] md:w-auto md:min-w-0 md:shrink overflow-hidden"
                  style={{
                    boxShadow: hoveredCard === i
                      ? `0 8px 30px rgba(0,0,0,0.08), inset 0 0 0 1px ${p.accentBorder}`
                      : "0 1px 3px rgba(0,0,0,0.04), inset 0 0 0 1px rgba(0,0,0,0.06)",
                  }}
                >
                  {/* Accent top bar — grows on hover */}
                  <motion.div
                    className="h-1 w-full"
                    style={{ background: p.accentColor, transformOrigin: "left" }}
                    initial={{ scaleX: 0 }}
                    animate={inView ? { scaleX: hoveredCard === i ? 1 : 0.35 } : {}}
                    transition={{ duration: 0.4, delay: hoveredCard === i ? 0 : 0.2 + i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                  />

                  <div className="relative p-5 flex flex-col flex-1">
                    {/* Icon */}
                    <motion.div
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 mb-4"
                      style={{
                        background: hoveredCard === i ? p.accentBg : "rgba(0,0,0,0.03)",
                      }}
                      animate={hoveredCard === i ? { rotate: [0, -8, 8, 0] } : { rotate: 0 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    >
                      <Icon
                        className="w-5 h-5 transition-colors duration-300"
                        style={{
                          color: hoveredCard === i ? p.accentColor : "var(--icon-secondary)",
                        }}
                      />
                    </motion.div>

                    {/* Title */}
                    <h3
                      className="text-text-primary mb-1"
                      style={{
                        fontSize: "var(--typo-ol-body-semi-size)",
                        lineHeight: "var(--typo-ol-body-semi-line-height)",
                        fontWeight: "var(--typo-ol-body-semi-weight)",
                      }}
                    >
                      {p.title}
                    </h3>

                    {/* Mantra — bold accent sub-line */}
                    <p
                      className="mb-2.5 transition-colors duration-300"
                      style={{
                        fontSize: "var(--typo-caption-m-size)",
                        lineHeight: "var(--typo-caption-m-line-height)",
                        fontWeight: "var(--typo-caption-m-weight)",
                        color: hoveredCard === i ? p.accentTextColor : "var(--text-tertiary)",
                      }}
                    >
                      {p.mantra}
                    </p>

                    {/* Description */}
                    <p
                      className="text-text-tertiary flex-1"
                      style={{
                        fontSize: "var(--typo-p-xs-size)",
                        lineHeight: "var(--typo-p-xs-line-height)",
                        fontWeight: "var(--typo-p-xs-weight)",
                      }}
                    >
                      {p.description}
                    </p>

                    {/* Outcome — concrete result */}
                    <div
                      className="mt-3 mb-4 py-2 px-2.5 rounded-lg transition-colors duration-300"
                      style={{
                        background: hoveredCard === i ? p.accentBg : "rgba(0,0,0,0.02)",
                      }}
                    >
                      <p
                        className="transition-colors duration-300"
                        style={{
                          fontSize: "var(--typo-caption-m-size)",
                          lineHeight: "var(--typo-caption-m-line-height)",
                          fontWeight: "var(--typo-caption-m-weight)",
                          color: hoveredCard === i ? p.accentTextColor : "var(--text-secondary)",
                        }}
                      >
                        {p.outcome}
                      </p>
                    </div>

                    {/* Case study link */}
                    <a
                      href={p.href}
                      className="mt-auto pt-3 inline-flex items-center gap-1.5 group/link transition-all duration-200"
                      style={{
                        fontSize: "var(--typo-caption-m-size)",
                        lineHeight: "var(--typo-caption-m-line-height)",
                        fontWeight: 600,
                        color: hoveredCard === i ? p.accentTextColor : "var(--text-secondary)",
                      }}
                    >
                      <span className="relative">
                        {p.link}
                        <span
                          className="absolute left-0 -bottom-px h-px w-0 group-hover/link:w-full transition-all duration-300"
                          style={{ background: hoveredCard === i ? p.accentTextColor : "var(--text-tertiary)" }}
                        />
                      </span>
                      <ArrowRight
                        className="w-3.5 h-3.5 transition-transform duration-200 group-hover/link:translate-x-1"
                      />
                    </a>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═════════════════════════════════════════════════════
   4. TESTIMONIALS (Paginated Card Grid — 11 recs, 3 per page)
   ════════════════════���═════════════════════════════════ */

/* ── Initials avatar colors — warm, muted, AA-safe on white ── */
const AVATAR_COLORS = [
  "#6d28d9", "#0369a1", "#047857", "#b45309",
  "#be185d", "#4338ca", "#0f766e", "#a16207",
];

interface AboutTestimonial {
  quote: string;
  name: string;
  role: string;
  tags: string[];
  avatar?: string;
  initials?: string;
  avatarBg?: string;
}

const aboutTestimonials: AboutTestimonial[] = [
  {
    quote:
      "Eswar owned our iOS and Android mobile design for two years — balancing user needs, platform constraints, and engineering realities with real care and clarity.",
    name: "Kevin Gaffney",
    role: "Chief Technology Officer — CYGNVS",
    tags: ["Mobile Design", "Design Systems"],
    avatar: kevinAvatar,
  },
  {
    quote:
      "Eswar turns vague ideas into clear, executable plans. His systems thinking and obsessive attention to detail produce design systems that stay robust in real use.",
    name: "Michael Rickard",
    role: "Design Manager — CYGNVS",
    tags: ["Enterprise SaaS", "Cybersecurity"],
    avatar: michaelAvatar,
  },
  {
    quote:
      "Eswar\u2019s work showed exceptional attention to detail and a commitment to thoughtful experiences. His curiosity and clarity of thought consistently raised the bar.",
    name: "Yuli Mitsner",
    role: "Principal Product Manager — CYGNVS",
    tags: ["Mobile Design", "Product Design"],
    avatar: yuliAvatar,
  },
  {
    quote:
      "Eswar delivered aesthetically pleasing designs and helped set up our mobile standards from scratch. It\u2019s always a pleasure to watch his ideas unfurl.",
    name: "Vikas C",
    role: "Engineering — CYGNVS",
    tags: ["Engineering Leadership", "Mobile Design"],
    avatar: vikasAvatar,
  },
  {
    quote:
      "Eswar\u2019s sharp eye for clean, intuitive UI/UX consistently elevates the product. He introduced a well-structured design system — a real game-changer for our team.",
    name: "Dinesh Kumar Muthusamy",
    role: "Senior iOS Developer",
    tags: ["iOS Development", "Design Systems"],
    avatar: dineshAvatar,
  },
  {
    quote:
      "Eswar delivers outstanding results with dedication and passion. He does thorough research to deliver only the best, consistently going above and beyond.",
    name: "Yamini Sagala",
    role: "Associate Product Manager — CYGNVS",
    tags: ["Product Management", "Cross-Functional"],
    avatar: yaminiAvatar,
  },
  {
    quote:
      "Eswar is a talented UX designer with great instincts and a collaborative mindset. Any team would benefit from his creativity and user-centered approach.",
    name: "Marlon Rodrigues",
    role: "Director of Engineering — CYGNVS",
    tags: ["Engineering Leadership", "Collaboration"],
    avatar: marlonAvatar,
  },
  {
    quote:
      "Eswar impressed me with his work ethic and attention to detail — a rare combination of creativity, precision, and dedication on every project.",
    name: "Kate Hurley",
    role: "Product Designer — CYGNVS",
    tags: ["Product Design", "Attention to Detail"],
    avatar: kateAvatar,
  },
  {
    quote:
      "Eswar\u2019s mobile designs were clean, intuitive, and easy to implement. He brought a positive attitude to every interaction — a great addition to any team.",
    name: "Omar Anshasi",
    role: "Software Engineer — CYGNVS",
    tags: ["Frontend Engineering", "Mobile UX"],
    avatar: omarAvatar,
  },
  {
    quote:
      "Eswar is committed to perfection and alignment. He approaches every problem holistically and improves outcomes through thoughtful peer reviews.",
    name: "Karthick Kumar",
    role: "Lead Software Engineer — CYGNVS",
    tags: ["Engineering", "Peer Reviews"],
    avatar: karthickAvatar,
  },
  {
    quote:
      "Eswar ensures every design decision is backed by strong reasoning. He champions design systems and advocates for consistency, scalability, and usability.",
    name: "Aarthi Kumar",
    role: "Technical Writer — CYGNVS",
    tags: ["Design Systems", "UX Writing"],
    avatar: aarthiAvatar,
  },
];

const CARDS_PER_PAGE = 3;
const TOTAL_PAGES = Math.ceil(aboutTestimonials.length / CARDS_PER_PAGE);

function TestimonialAvatar({ t, size = 40, className = "" }: { t: AboutTestimonial; size?: number; className?: string }) {
  if (t.avatar) {
    return (
      <img
        src={t.avatar}
        alt={t.name}
        className={`rounded-full object-cover shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: t.avatarBg || AVATAR_COLORS[0],
        color: "#fff",
        fontSize: size * 0.38,
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      {t.initials || t.name.split(" ").map((n) => n[0]).join("")}
    </div>
  );
}

/**
 * WCAG 2.1 contrast audit (on #fff):
 *  --text-secondary  #4b4f4e  -> 6.5:1  AA (quote body)
 *  --text-tertiary   #6f7371  -> 4.8:1  AA normal-text (role, counter)
 *  --text-quaternary #727674  -> 4.5:1  AA normal-text (quote icon)
 *  --text-disabled   #d9dbda  -> 1.5:1  FAIL — not used for text
 *  Inactive dots: rgba(0,0,0,.38) -> 3.5:1  SC 1.4.11 non-text UI
 */

const SWIPE_THRESHOLD = 50;

function AboutTestimonials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const swipeLocked = useRef(false);

  const goTo = useCallback((target: number, dir?: number) => {
    setPage((prev) => {
      const clamped = ((target % TOTAL_PAGES) + TOTAL_PAGES) % TOTAL_PAGES;
      setDirection(dir ?? (clamped > prev ? 1 : clamped < prev ? -1 : 1));
      return clamped;
    });
    setHasInteracted(true);
  }, []);

  const nextPage = useCallback(() => {
    setDirection(1);
    setPage((prev) => (prev + 1) % TOTAL_PAGES);
    setHasInteracted(true);
  }, []);

  const prevPage = useCallback(() => {
    setDirection(-1);
    setPage((prev) => (prev - 1 + TOTAL_PAGES) % TOTAL_PAGES);
    setHasInteracted(true);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextPage, 8000);
    return () => clearInterval(timer);
  }, [isPaused, nextPage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); nextPage(); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); prevPage(); }
    },
    [nextPage, prevPage],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    swipeLocked.current = false;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointerStart.current || pointerStart.current.id !== e.pointerId) return;
    const dx = Math.abs(e.clientX - pointerStart.current.x);
    const dy = Math.abs(e.clientY - pointerStart.current.y);
    if (dx > 10 && dx > dy) swipeLocked.current = true;
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!pointerStart.current || pointerStart.current.id !== e.pointerId) return;
      const dx = e.clientX - pointerStart.current.x;
      pointerStart.current = null;
      if (!swipeLocked.current) return;
      swipeLocked.current = false;
      if (dx < -SWIPE_THRESHOLD) nextPage();
      else if (dx > SWIPE_THRESHOLD) prevPage();
    },
    [nextPage, prevPage],
  );

  const pageItems = aboutTestimonials.slice(
    page * CARDS_PER_PAGE,
    page * CARDS_PER_PAGE + CARDS_PER_PAGE,
  );

  const slideDistance = 40;
  const variants = {
    enter: { opacity: 0, x: direction * slideDistance },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: direction * -slideDistance },
  };

  return (
    <section
      className="py-10 md:py-12"
      role="region"
      aria-roledescription="carousel"
      aria-label="Colleague testimonials"
    >
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <SectionHeader
            label="Social Proof"
            title="What colleagues & leaders say"
            description={`\u201C11 recommendations from cross-functional teammates\u201D`}
          />

          {/* Card grid with prev/next arrows */}
          <div className="relative">
            {/* ── Previous / Next arrow buttons ── */}
            <button
              onClick={prevPage}
              aria-label="Previous page"
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white border border-black/[0.08] shadow-md shadow-black/[0.06] text-text-tertiary hover:text-text-primary hover:border-black/[0.14] hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextPage}
              aria-label="Next page"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white border border-black/[0.08] shadow-md shadow-black/[0.06] text-text-tertiary hover:text-text-primary hover:border-black/[0.14] hover:shadow-lg transition-all duration-200 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* ── Swipeable card area ── */}
            <div
              className="relative h-[340px] touch-pan-y select-none outline-none overflow-hidden"
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => { pointerStart.current = null; swipeLocked.current = false; }}
              aria-live="polite"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={page}
                  className="absolute inset-0 grid md:grid-cols-3 gap-6 items-stretch"
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
                >
                  {pageItems.map((t) => (
                    <div
                      key={t.name}
                      className="group bg-white rounded-2xl border border-black/[0.06] p-6 md:p-8 hover:shadow-xl hover:shadow-black/[0.04] hover:-translate-y-1 transition-all duration-300 flex flex-col h-full"
                    >
                      {/* Quote icon — 4.5:1 on #fff */}
                      <Quote
                        className="w-6 h-6 mb-4 shrink-0"
                        style={{ color: "var(--text-quaternary)" }}
                        aria-hidden="true"
                      />

                      <p
                        className="text-text-secondary mb-6 flex-1"
                        style={{
                          fontSize: "var(--typo-p-base-size)",
                          lineHeight: "var(--typo-p-base-line-height)",
                          fontWeight: "var(--typo-p-base-weight)",
                        }}
                      >
                        &ldquo;{t.quote}&rdquo;
                      </p>

                      <div className="pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-3 mb-3">
                          <TestimonialAvatar t={t} size={40} />
                          <div className="min-w-0">
                            <p
                              className="text-text-primary truncate"
                              style={{
                                fontSize: "var(--typo-btn-semi-size)",
                                lineHeight: "var(--typo-btn-semi-line-height)",
                                fontWeight: "var(--typo-btn-semi-weight)",
                              }}
                            >
                              {t.name}
                            </p>
                            {/* Role — text-tertiary 4.8:1 */}
                            <p
                              className="text-text-tertiary truncate"
                              style={{
                                fontSize: "var(--typo-caption-r-size)",
                                lineHeight: "var(--typo-caption-r-line-height)",
                                fontWeight: "var(--typo-caption-r-weight)",
                              }}
                            >
                              {t.role}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {t.tags.map((tag) => (
                            <Tag key={tag} variant="outlined" size="sm">
                              {tag}
                            </Tag>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Pagination controls row */}
          <div className="mt-8 flex flex-col items-center gap-3">
            {/* Prev / dots / next inline row */}
            <div className="flex items-center gap-3">
              {/* Mobile prev button */}
              <button
                onClick={prevPage}
                aria-label="Previous page"
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-full border border-black/[0.08] text-text-tertiary hover:text-text-primary transition-colors duration-200 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Dots — SC 1.4.11: inactive rgba(0,0,0,.38) -> 3.5:1 */}
              <div className="flex items-center gap-2" role="tablist" aria-label="Testimonial pages">
                {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={i === page}
                    aria-label={`Page ${i + 1} of ${TOTAL_PAGES}`}
                    onClick={() => goTo(i)}
                    className="relative flex items-center justify-center cursor-pointer"
                    style={{ width: 24, height: 24 }}
                  >
                    {i === page && (
                      <motion.span
                        layoutId="testimonial-dot-ring"
                        className="absolute rounded-full"
                        style={{
                          inset: 3,
                          border: "1.5px solid var(--interactive-primary)",
                          opacity: 0.5,
                        }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span
                      className="block rounded-full transition-all duration-300"
                      style={{
                        width: i === page ? 8 : 6,
                        height: i === page ? 8 : 6,
                        background: i === page
                          ? "var(--interactive-primary)"
                          : "rgba(0, 0, 0, 0.38)",
                      }}
                    />
                  </button>
                ))}
              </div>

              {/* Mobile next button */}
              <button
                onClick={nextPage}
                aria-label="Next page"
                className="md:hidden flex items-center justify-center w-8 h-8 rounded-full border border-black/[0.08] text-text-tertiary hover:text-text-primary transition-colors duration-200 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Counter — text-tertiary 4.8:1 */}
            <p
              className="text-text-tertiary"
              style={{
                fontSize: "var(--typo-pointer-size)",
                lineHeight: "var(--typo-pointer-line-height)",
              }}
            >
              {page * CARDS_PER_PAGE + 1}&ndash;{Math.min((page + 1) * CARDS_PER_PAGE, aboutTestimonials.length)} of {aboutTestimonials.length}
            </p>

            {/* Swipe hint — mobile only, fades out after first interaction */}
            <AnimatePresence>
              {!hasInteracted && (
                <motion.p
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="md:hidden text-text-quaternary"
                  style={{
                    fontSize: "var(--typo-pointer-size)",
                    lineHeight: "var(--typo-pointer-line-height)",
                  }}
                >
                  Swipe or tap arrows to navigate
                </motion.p>
              )}
            </AnimatePresence>

            <PortfolioButton
              href="https://www.linkedin.com/in/eswaruxui/"
              target="_blank"
              rel="noopener noreferrer"
              variant="ghost"
              size="sm"
            >
              Read full testimonials on LinkedIn
              <ArrowRight className="w-3.5 h-3.5" />
            </PortfolioButton>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ══════════════���═══════���═══════════════════════════════
   5. STRENGTHS & TOOLS
   ═══════════════════════��═════════════════════════════ */
const strengths = [
  "Product discovery and UX research for complex workflows",
  "Enterprise architecture and interaction design for scalable products",
  "Design systems and cross-collaboration with UI engineering",
  "Holistic choice UX and experimentation",
  "Designing AI-assisted experiences that balance business-user needs",
];

const toolGroups = [
  {
    label: "Design",
    tools: "Figma (primary), Adobe Illustrator, Adobe XD · Previously: InVision, Sketch",
    icon: <Figma className="w-4 h-4" />,
  },
  {
    label: "AI & automation",
    tools: "Claude, ChatGPT, Midjourney, Cursor, Cline, V0, Figma Make",
    icon: <Cpu className="w-4 h-4" />,
  },
  {
    label: "Analytics & testing",
    tools: "Mixpanel, Amplitude, GA4, Firebase, Hotjar, UserTesting, Productboard",
    icon: <BarChart3 className="w-4 h-4" />,
  },
  {
    label: "Dev collaboration & design systems",
    tools: "Storybook, Tailwind CSS, shadcn/ui, GitHub",
    icon: <Wrench className="w-4 h-4" />,
  },
  {
    label: "Research & insights",
    tools: "Miro, Dovetail, Notion",
    icon: <Search className="w-4 h-4" />,
  },
  {
    label: "Presentation",
    tools: "Keynote, Google Slides, Figma prototypes, Loom",
    icon: <Palette className="w-4 h-4" />,
  },
  {
    label: "Productivity & collaboration",
    tools: "Jira, Confluence, Notion, Slack, MS Teams, Loom",
    icon: <Briefcase className="w-4 h-4" />,
  },
];

function StrengthsTools() {
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
            label="Capabilities"
            title="Strengths & tools"
            description={`\u201CHow I work day to day\u201D`}
          />

          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            {/* Left — Strengths */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <h3
                className="text-text-primary mb-4"
                style={{
                  fontSize: "var(--typo-h5-size)",
                  lineHeight: "var(--typo-h5-line-height)",
                  fontWeight: "var(--typo-h5-weight)",
                }}
              >
                Strengths
              </h3>
              <ul className="space-y-2">
                {strengths.map((s) => (
                  <BulletItem key={s}>{s}</BulletItem>
                ))}
              </ul>
            </motion.div>

            {/* Right — Tools */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3
                className="text-text-primary mb-4"
                style={{
                  fontSize: "var(--typo-h5-size)",
                  lineHeight: "var(--typo-h5-line-height)",
                  fontWeight: "var(--typo-h5-weight)",
                }}
              >
                Tools
              </h3>
              <p
                className="text-text-tertiary mb-5"
                style={{
                  fontSize: "var(--typo-p-sm-size)",
                  lineHeight: "var(--typo-p-sm-line-height)",
                  fontWeight: "var(--typo-p-sm-weight)",
                }}
              >
                I'll pick the tool that supports the work —
                these are the ones I reach for most.
              </p>
              <div className="flex flex-col gap-3">
                {toolGroups.map((g) => (
                  <div
                    key={g.label}
                    className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-text-quaternary mt-0.5 shrink-0">
                      {g.icon}
                    </span>
                    <div>
                      <span
                        className="text-text-primary block"
                        style={{
                          fontSize: "var(--typo-caption-m-size)",
                          lineHeight: "var(--typo-caption-m-line-height)",
                          fontWeight: "var(--typo-caption-m-weight)",
                        }}
                      >
                        {g.label}
                      </span>
                      <span
                        className="text-text-tertiary block mt-0.5"
                        style={{
                          fontSize: "var(--typo-p-xs-size)",
                          lineHeight: "var(--typo-p-xs-line-height)",
                          fontWeight: "var(--typo-p-xs-weight)",
                        }}
                      >
                        {g.tools}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════
   6. CONTACT SECTION
   ══════════════════════════════════════════════════════ */
function AboutContact() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { isDownloading, handleDownload, fileSize } = useResumeDownload();

  return (
    <section id="contact" className="py-10 md:py-12">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <SectionHeader label="Get in Touch" title="Contact" />

          <div className="bg-surface-inverse text-text-inverse rounded-3xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-10 md:gap-16">
              {/* Left — message */}
              <div>
                <p
                  className="text-text-inverse mb-3"
                  style={{
                    fontSize: "var(--typo-p-xl-size)",
                    lineHeight: "var(--typo-p-xl-line-height)",
                    fontWeight: "var(--typo-p-xl-weight)",
                  }}
                >
                  "Let's talk about your next product milestone."
                </p>
                <p
                  className="text-text-inverse-tertiary mb-8"
                  style={{
                    fontSize: "var(--typo-p-base-size)",
                    lineHeight: "var(--typo-p-base-line-height)",
                    fontWeight: "var(--typo-p-base-weight)",
                  }}
                >
                  Open to senior product design roles and consulting for
                  enterprise SaaS teams across US/EU/APAC.
                </p>

                <PortfolioButton
                  href={RESUME_URL}
                  download={RESUME_FILENAME}
                  onClick={handleDownload}
                  variant="primary"
                  size="lg"
                  loading={isDownloading}
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {isDownloading
                    ? "Downloading…"
                    : `Download resume • ${fileSize ?? "1.8 MB"} (PDF)`}
                </PortfolioButton>
              </div>

              {/* Right — contact rows */}
              <div>
                <ContactRow
                  icon={<Phone />}
                  label="Mobile no"
                  href="tel:+919841085484"
                  value="+91 98410 85484"
                />
                <ContactRow
                  icon={<Mail />}
                  label="Email"
                  href="mailto:eswarcreatives@gmail.com?subject=Design%20Inquiry%20%E2%80%94%20via%20Portfolio&body=Hi%20Eswar%2C%0A%0AI%20came%20across%20your%20portfolio%20and%20would%20love%20to%20discuss%20a%20potential%20collaboration.%0A%0A%E2%80%94%20Company%2FTeam%3A%20%0A%E2%80%94%20Role%2FProject%3A%20%0A%E2%80%94%20Timeline%3A%20%0A%0ALooking%20forward%20to%20hearing%20from%20you!"
                  value="eswarcreatives@gmail.com"
                />
                <ContactRow
                  icon={<MessageCircle />}
                  label="WhatsApp"
                  href="https://wa.me/919841085484"
                  value="Message / Call"
                  external
                  isLink
                />
                <ContactRow
                  icon={<Linkedin />}
                  label="LinkedIn"
                  href="https://www.linkedin.com/in/eswaruxui/"
                  value="/in/eswaruxui"
                  external
                  isLink
                  isLast
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ════════════════════════════════════════���══════════
   ABOUT PAGE — ASSEMBLED
   ════════════════════════════════════════════════���════ */
export function AboutPage() {
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);

    const bg = "#f5f3f0";
    document.documentElement.style.background = bg;
    document.body.style.background = "transparent";
  }, []);

  return (
    <div
      className="min-h-screen w-full"
      style={{
        fontFamily: "var(--font-family-primary)",
        background: "#f5f3f0",
      }}
    >
      <Navbar />
      <AboutHero onContactClick={() => setContactOpen(true)} />
      <ContactModal open={contactOpen} onOpenChange={setContactOpen} />
      <SnapshotTimeline />
      <HowIWork />
      <AboutTestimonials />
      <StrengthsTools />
      <AboutContact />

      {/* Minimal copyright footer */}
      <footer className="py-8 text-center">
        <p
          className="text-text-quaternary"
          style={{
            fontSize: "var(--typo-caption-r-size)",
            lineHeight: "var(--typo-caption-r-line-height)",
            fontWeight: "var(--typo-caption-r-weight)",
          }}
        >
          {"\u00A9"} 2026 Eswar (Maheswaran Y). Designed with care.
        </p>
      </footer>
    </div>
  );
}