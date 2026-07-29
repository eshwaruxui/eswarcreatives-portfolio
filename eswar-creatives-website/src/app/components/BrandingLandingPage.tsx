import { useEffect, useState, type ReactNode } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Check, TrendingUp, UserCog, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { PortfolioButton } from "./ui/portfolio-button";
import { LandingNav } from "../../components/LandingNav";
import { useBreakpoint } from "../../portal/hooks/useBreakpoint";
import { t, tokens, motionTokens } from "../../portal/theme";
import { CTAButton } from "../../components/marketing/CTAButton";
import { FitPill } from "../../components/marketing/FitPill";
import { BeforeAfterCard, type BeforeAfterCardType } from "../../components/marketing/BeforeAfterCard";
import { IconWrapper } from "../../components/marketing/IconWrapper";

const WHATSAPP_URL = "https://wa.me/919841085484";
const RETAINER_WHATSAPP_URL =
  "https://wa.me/919841085484?text=Hi%2C%20I%27m%20interested%20in%20the%20Performance%20Growth%20Retainer%20on%20eswarcreatives.in";
const BRAND_BRIEF_MAILTO = "mailto:eswar@eswarcreatives.in?subject=Brand%20brief";
const LETS_TALK_MAILTO = "mailto:eswar@eswarcreatives.in?subject=Let%27s%20talk%20about%20my%20brand";

// background/subtle-warm (#e8dcc4) — vertical tab strip on the Newgen AFTER
// panel. No equivalent in theme.ts (portal tokens don't cover this warm-tab
// role), bound directly from the Figma variable per node 4379:1453.
const VERTICAL_TAB_BG = "#e8dcc4";

type CarouselSlide = {
  id: string;
  cardType: BeforeAfterCardType;
  categoryLabel: string;
  proofCaption?: string;
  before?: ReactNode;
  after: ReactNode;
};

function ChecklistItem({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, width: "100%" }}>
      <Check size={14} style={{ color: tokens.accent, marginTop: 3, flexShrink: 0 }} />
      <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 13, color: t.text.secondary, lineHeight: 1.5 }}>{text}</p>
    </div>
  );
}

function VerticalTab({ label }: { label: string }) {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        right: 0,
        top: "50%",
        transform: "translateY(-50%)",
        background: VERTICAL_TAB_BG,
        borderRadius: "8px 0 0 8px",
        padding: "12px 4px",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "'SF Mono', monospace",
          fontWeight: 700,
          fontSize: 9,
          letterSpacing: "1.5px",
          color: t.text.secondary,
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </p>
    </div>
  );
}

function ChartRupeeIcon() {
  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <TrendingUp size={30} strokeWidth={1.75} />
      <span
        style={{
          position: "absolute",
          bottom: -4,
          right: -6,
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        &#8377;
      </span>
    </span>
  );
}

function PlaceholderSlideContent({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, color: t.text.muted }}>
      <IconWrapper size={32} color={t.text.muted}>
        <TrendingUp size={32} strokeWidth={1.5} />
      </IconWrapper>
      <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 13, textAlign: "center" }}>
        {label} case study coming soon
      </p>
    </div>
  );
}

const CAROUSEL_SLIDES: CarouselSlide[] = [
  {
    id: "newgen-redesign",
    cardType: "redesign",
    categoryLabel: "Events",
    proofCaption: "Looks dated. Feels untrustworthy. Blends in.",
    before: (
      <img
        src="/img/branding/hero/newgen-before-crest.png"
        alt="New Gen Event's original ornate crest logo"
        style={{ width: 130, height: 130, objectFit: "contain" }}
      />
    ),
    after: (
      <>
        <img
          src="/img/branding/hero/newgen-after-wordmark.svg"
          alt="Redesigned NEWGEN EVENT STUDIO wordmark with N monogram"
          style={{ width: 150, height: "auto" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
          <ChecklistItem text="Clean. Confident. Memorable." />
          <ChecklistItem text="Built for scale across every touchpoint." />
          <ChecklistItem text="Instantly communicates trust." />
        </div>
        <VerticalTab label="STRATEGY · DESIGN · IMPACT" />
      </>
    ),
  },
  {
    // TODO: replace with real retail case study asset
    id: "retail-placeholder",
    cardType: "new-build",
    categoryLabel: "Retail",
    after: <PlaceholderSlideContent label="Retail" />,
  },
  {
    // TODO: replace with real clinic/services case study asset
    id: "clinic-placeholder",
    cardType: "new-build",
    categoryLabel: "Clinic",
    after: <PlaceholderSlideContent label="Clinic/services" />,
  },
];

const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";
const BODY = "'Inter', system-ui, -apple-system, sans-serif";
const MONO = "'SF Mono', monospace";

const eyebrow: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: tokens.gold,
};

const sectionLabel: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: ".12em",
  textTransform: "uppercase",
  color: t.text.muted,
};

const PHASES = [
  {
    id: "foundation",
    color: tokens.primary,
    label: "PHASE 1",
    title: "Foundation",
    timeline: "Month 1 - 2",
    description: "Before anything goes public, build an identity that carries the brand for the next 10 years.",
  },
  {
    id: "visibility",
    color: tokens.gold,
    label: "PHASE 2",
    title: "Visibility",
    timeline: "Month 2 - 4",
    description: "The brand exists. Now it needs to be seen on every screen where your clients are looking.",
  },
  {
    id: "scale",
    color: t.border.danger,
    label: "PHASE 3",
    title: "Scale",
    timeline: "Month 4 - 6",
    description: "Build the engine underneath so the business grows whether you are at the event or not.",
  },
] as const;

const WORKFLOW_STEPS = [
  { number: "01", label: "Capture", description: "Every event photographed and logged." },
  { number: "02", label: "Triage", description: "15 minutes to sort the keepers each evening." },
  { number: "03", label: "Produce", description: "Reels, posts, and stories cut to the brand template." },
  { number: "04", label: "Publish", description: "Scheduled across Instagram and WhatsApp Status." },
  { number: "05", label: "Amplify", description: "Best performers repurposed into paid and BNI content." },
];

const WEBSITE_PAGES = [
  { name: "Home", description: "The pitch in 10 seconds." },
  { name: "About", description: "Founder story and credibility." },
  { name: "Services", description: "Every offering, clearly scoped." },
  { name: "Portfolio", description: "Weddings, corporate, destination." },
  { name: "Testimonials", description: "Social proof that converts." },
  { name: "Contact", description: "One form, one WhatsApp link." },
];

export function BrandingLandingPage() {
  const { isMobile } = useBreakpoint();
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = CAROUSEL_SLIDES[activeSlide];

  useEffect(() => {
    document.title = "Brand Identity Design · Eswar Creatives";
    document.documentElement.style.background = t.background.page;
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Brand Identity Design &middot; Eswar Creatives</title>
        <meta property="og:title" content="Brand Identity Design &middot; Eswar Creatives" />
        <meta property="og:description" content="Visual identity systems for growing businesses. Logo, colour, typography, and collateral that works everywhere your brand shows up. Three packages from Rs 25,000." />
        <meta property="og:image" content="https://www.eswarcreatives.in/og-branding.png" />
        <meta property="og:url" content="https://www.eswarcreatives.in/branding/" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Eswar Creatives" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Brand Identity Design &middot; Eswar Creatives" />
        <meta name="twitter:description" content="Visual identity systems for growing businesses. Logo, colour, typography, and collateral that works everywhere your brand shows up. Three packages from Rs 25,000." />
        <meta name="twitter:image" content="https://www.eswarcreatives.in/og-branding.png" />
      </Helmet>

      <div style={{ minHeight: "100vh", background: t.background.page, fontFamily: BODY, color: t.text.primary }}>
        <LandingNav />

        {/* SECTION 1 — HERO */}
        <section style={{ paddingTop: 80 }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "32px 20px 0" : "72px 24px 0" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) 560px",
                gap: isMobile ? 40 : 42,
                alignItems: "center",
              }}
            >
              <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}>
                <div style={{ position: "relative", display: "inline-block", marginBottom: 16 }}>
                  <p style={{ ...eyebrow, color: tokens.goldDark, margin: 0 }}>Branding for established Indian businesses</p>
                  <div style={{ position: "absolute", left: 0, bottom: -7, height: 2, width: 78, background: tokens.gold, borderRadius: 9999 }} />
                </div>
                <h1
                  style={{
                    fontFamily: SERIF,
                    fontWeight: 600,
                    fontSize: isMobile ? 30 : 44,
                    lineHeight: 1.15,
                    letterSpacing: "-0.02em",
                    color: t.text.primary,
                    marginBottom: 20,
                  }}
                >
                  You built a real business. Your brand should{" "}
                  <span style={{ position: "relative", display: "inline-block", color: tokens.accent, fontStyle: "italic" }}>
                    look like it.
                    <img
                      src="/img/branding/hero/headline-underline.svg"
                      alt=""
                      aria-hidden
                      style={{ position: "absolute", left: 0, bottom: -6, width: "100%", height: "auto", pointerEvents: "none" }}
                    />
                  </span>
                </h1>
                <p style={{ fontFamily: BODY, fontSize: 15, lineHeight: 1.6, color: t.text.primary, maxWidth: 500, marginBottom: 20 }}>
                  Somewhere between your first customer and your fortieth lakh a month, the business changed. The{" "}
                  <strong style={{ fontWeight: 700 }}>logo</strong>, the <strong style={{ fontWeight: 700 }}>website</strong>, and the{" "}
                  <strong style={{ fontWeight: 700 }}>pitch</strong> never did. <strong style={{ fontWeight: 700 }}>We close that gap,</strong> so
                  your brand finally looks like what you actually built.
                </p>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start", borderLeft: `3px solid ${tokens.gold}`, padding: "2px 0 2px 12px", marginBottom: 32, maxWidth: 520 }}>
                  <p style={{ fontFamily: BODY, fontStyle: "italic", fontSize: 15, color: t.text.primary, margin: 0, lineHeight: 1.55 }}>
                    Every customer who <strong style={{ fontWeight: 700 }}>checks you out online</strong> before they call is quietly deciding
                    if you're the real thing.
                  </p>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <CTAButton variant="primary" label="See our work →" href="/branding/work" />
                  <CTAButton variant="outline" label="Let's talk" href={LETS_TALK_MAILTO} />
                </div>
                <p style={{ fontFamily: BODY, fontSize: 12, color: t.text.muted, marginTop: 12 }}>
                  Prefer async?{" "}
                  <a href={BRAND_BRIEF_MAILTO} style={{ color: t.text.urlLink, textDecoration: "underline" }}>
                    Fill a brand brief
                  </a>{" "}
                  instead.
                </p>
              </motion.div>

              <div>
                <BeforeAfterCard
                  beforeContent={slide.before}
                  afterContent={slide.after}
                  categoryLabel={slide.categoryLabel}
                  proofCaption={slide.proofCaption}
                  cardType={slide.cardType}
                />
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
                  {CAROUSEL_SLIDES.map((s, index) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-label={`Show ${s.categoryLabel} case`}
                      aria-current={index === activeSlide}
                      onClick={() => setActiveSlide(index)}
                      style={{
                        width: index === activeSlide ? 20 : 7,
                        height: 7,
                        borderRadius: 9999,
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        background: index === activeSlide ? t.text.primary : t.border.medium,
                        transition: `width ${motionTokens.durationFast} ${motionTokens.easeDefault}, background ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
                      }}
                    />
                  ))}
                </div>
                <p style={{ fontFamily: BODY, fontStyle: "italic", fontSize: 13, color: t.text.tertiary, textAlign: "center", marginTop: 8 }}>
                  Real client work across categories, not just one vertical
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "center",
                gap: 20,
                padding: isMobile ? "32px 0" : "26px 0 36px",
              }}
            >
              <FitPill
                icon={
                  <IconWrapper size={40} color={tokens.gold}>
                    <ChartRupeeIcon />
                  </IconWrapper>
                }
                title="Already scaling"
                description="Built for owners doing ₹30L to ₹1Cr a month"
              />
              {!isMobile && <div style={{ width: 1, height: 109, background: t.border.default }} />}
              <FitPill
                icon={
                  <IconWrapper size={40} color={tokens.gold}>
                    <UserCog size={32} strokeWidth={1.5} />
                  </IconWrapper>
                }
                title="Owner-run, any category"
                description="Retail, clinics, events, real estate, services"
              />
              {!isMobile && <div style={{ width: 1, height: 109, background: t.border.default }} />}
              <FitPill
                icon={
                  <IconWrapper size={40} color={tokens.gold}>
                    <Trophy size={32} strokeWidth={1.5} />
                  </IconWrapper>
                }
                title="The credibility gap"
                description="Real revenue, not yet a real brand"
              />
            </div>
          </div>
        </section>

        {/* SECTION 2 — THREE PHASE INTRO */}
        <section style={{ padding: isMobile ? "0 20px 56px" : "0 24px 80px" }}>
          <div style={{ maxWidth: 1152, margin: "0 auto" }}>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.5 }}>
              <p style={{ ...eyebrow, marginBottom: 12 }}>How it works</p>
              <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: isMobile ? 26 : 32, color: t.text.primary, marginBottom: 12 }}>
                3 phases. 8 solutions. 6 months.
              </h2>
              <p style={{ fontFamily: BODY, fontSize: 15, color: t.text.secondary, marginBottom: 40, maxWidth: 560, lineHeight: 1.7 }}>
                Every business is different. Every engagement starts with Foundation and grows at your pace.
              </p>
            </motion.div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20 }}>
              {PHASES.map((phase) => (
                <div
                  key={phase.id}
                  style={{
                    background: t.background.surface,
                    border: `1px solid ${t.border.subtle}`,
                    borderTop: `4px solid ${phase.color}`,
                    borderRadius: 12,
                    padding: 24,
                  }}
                >
                  <p style={{ fontFamily: MONO, fontSize: 10, color: phase.color, letterSpacing: ".1em", marginBottom: 8 }}>{phase.label}</p>
                  <h3 style={{ fontFamily: SERIF, fontSize: 20, fontWeight: 600, color: t.text.primary, marginBottom: 6 }}>{phase.title}</h3>
                  <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.muted, marginBottom: 14 }}>{phase.timeline}</p>
                  <p style={{ fontFamily: BODY, fontSize: 14, color: t.text.secondary, lineHeight: 1.6 }}>{phase.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3 — PHASE 1 FOUNDATION */}
        <section style={{ padding: isMobile ? "0 20px 56px" : "0 24px 80px" }}>
          <div style={{ maxWidth: 1152, margin: "0 auto" }}>
            <PhaseHeader color={tokens.primary} eyebrow="PHASE 1 &middot; FOUNDATION" title="Before anything goes public" isMobile={isMobile} />

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20 }}>
              <ServiceCard number="01" title="Brand Identity Design">
                <ScopeList
                  items={[
                    "Abstract monogram + wordmark logo system",
                    "Full colour system: Gold, Teal, Cream, Ochre, Ruby",
                    "Premium typography pair",
                    "Application proofs: business card, quotation, WhatsApp, signboard",
                    "Photo watermark",
                    "All master files: AI, EPS, SVG, PNG, PDF",
                  ]}
                />
                <CardFooter timeline="2 - 3 weeks" />
              </ServiceCard>

              <ServiceCard number="02" title="Brand Guidelines Document">
                <ScopeList
                  items={[
                    "Brand story, mission, vision, personality",
                    "Logo usage rules + visual violations guide",
                    "Colour codes: HEX, RGB, CMYK, Pantone",
                    "Typography hierarchy + approved fonts",
                    "Photography style guide + mandatory shots",
                    "Tone of voice + Tamil/English caption framework",
                    "1-page quick reference for field team",
                  ]}
                />
                <CardFooter timeline="1 week" />
              </ServiceCard>

              <ServiceCard number="03" title="Business Profile PDF">
                <p style={{ fontFamily: BODY, fontStyle: "italic", fontSize: 13, color: t.text.muted, marginBottom: 12 }}>
                  10 pages. Replaces the 1-hour verbal pitch.
                </p>
                <ScopeList
                  items={[
                    "Cover + founder story",
                    "Services overview (icon grid, no paragraphs)",
                    "3 differentiators: guest-first, sketch-led, end-to-end",
                    "Credibility stats",
                    "Portfolio: weddings, corporate, destination",
                    "Client testimonials + Google review QR",
                  ]}
                />
                <CardFooter timeline="3 weeks" />
              </ServiceCard>
            </div>
          </div>
        </section>

        {/* SECTION 4 — PHASE 2 VISIBILITY */}
        <section style={{ padding: isMobile ? "0 20px 56px" : "0 24px 80px" }}>
          <div style={{ maxWidth: 1152, margin: "0 auto" }}>
            <PhaseHeader color={tokens.gold} eyebrow="PHASE 2 &middot; VISIBILITY" title="The brand exists. Now it needs to be seen." isMobile={isMobile} />

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20 }}>
              <ServiceCard number="04" title="Social Media Branding + Workflow">
                <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.muted, marginBottom: 20 }}>
                  Turn 1,500 events of invisible proof into a content machine that works while you sleep.
                </p>
                <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: isMobile ? 12 : 8, marginBottom: 16 }}>
                  {WORKFLOW_STEPS.map((step) => (
                    <div key={step.number} style={{ flex: 1 }}>
                      <p style={{ fontFamily: MONO, fontSize: 12, color: tokens.primary, marginBottom: 4 }}>{step.number}</p>
                      <p style={{ fontFamily: BODY, fontSize: 13, fontWeight: 700, color: t.text.primary, marginBottom: 2 }}>{step.label}</p>
                      <p style={{ fontFamily: BODY, fontSize: 12, color: t.text.muted, lineHeight: 1.5 }}>{step.description}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background: tokens.primary, color: t.text.onPrimary, borderRadius: 8, padding: "16px 20px", marginTop: 16 }}>
                  <p style={{ fontFamily: MONO, fontSize: 10, color: tokens.gold, marginBottom: 6 }}>Your only new habit:</p>
                  <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.onPrimary, margin: 0, lineHeight: 1.6 }}>
                    15 minutes of photo review each evening. Everything else (design, scheduling, captions, Google profile) is handled by us.
                  </p>
                </div>
                <CardFooter timeline="Ongoing from Month 1" />
              </ServiceCard>

              <ServiceCard number="05" title="Website Design">
                <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.muted, marginBottom: 20 }}>
                  A lead-generation site, not a brochure. Built so Google sends you clients while you are at a venue partner.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 12, marginBottom: 16 }}>
                  {WEBSITE_PAGES.map((page) => (
                    <div key={page.name}>
                      <p style={{ fontFamily: BODY, fontSize: 13, fontWeight: 500, color: t.text.primary, marginBottom: 2 }}>{page.name}</p>
                      <p style={{ fontFamily: BODY, fontSize: 12, color: t.text.muted }}>{page.description}</p>
                    </div>
                  ))}
                </div>
                <div style={{ border: `1px solid ${t.border.subtle}`, borderRadius: 6, padding: "12px 16px", marginTop: 4, marginBottom: 16 }}>
                  <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.secondary, margin: 0, lineHeight: 1.6 }}>
                    SEO built-in, not bolted on. Each service page targets one search term. No paid ads needed to start.
                  </p>
                </div>
                <CardFooter timeline="4 - 6 weeks" />
              </ServiceCard>
            </div>
          </div>
        </section>

        {/* SECTION 5 — PHASE 3 SCALE */}
        <section style={{ padding: isMobile ? "0 20px 56px" : "0 24px 80px" }}>
          <div style={{ maxWidth: 1152, margin: "0 auto" }}>
            <PhaseHeader color={t.border.danger} eyebrow="PHASE 3 &middot; SCALE" title="Build the engine so it runs without you." isMobile={isMobile} />

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 20 }}>
              <ServiceCard number="06" title="SOP + Workflow Definition">
                <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.muted, marginBottom: 16 }}>
                  Document the system that currently exists only in your head so Bengaluru and Tiruchi can run the same playbook.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
                  {["Field execution", "Customer relationship", "Business operations"].map((label) => (
                    <p key={label} style={{ ...sectionLabel, margin: 0 }}>{label.toUpperCase()}</p>
                  ))}
                </div>
                <CardFooter timeline="2 - 3 weeks" />
              </ServiceCard>

              <ServiceCard number="07" title="CRM + Lead Automation">
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontFamily: SERIF, fontSize: 32, fontWeight: 600, color: tokens.primary, margin: 0 }}>300</p>
                  <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.secondary, margin: 0 }}>leads per season never followed up</p>
                </div>
                <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.secondary, marginBottom: 12 }}>
                  Enquiry <ArrowRight className="w-3 h-3" style={{ display: "inline", verticalAlign: "middle" }} /> Quote{" "}
                  <ArrowRight className="w-3 h-3" style={{ display: "inline", verticalAlign: "middle" }} /> Confirmed{" "}
                  <ArrowRight className="w-3 h-3" style={{ display: "inline", verticalAlign: "middle" }} /> Delivered
                </p>
                <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.muted, marginBottom: 4 }}>
                  Auto follow-up: Day 1, 3, 7 post-enquiry
                </p>
                <CardFooter timeline="4 weeks" />
              </ServiceCard>

              <ServiceCard number="08" title="Personal Brand: Founder as Brand">
                <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.muted, marginBottom: 16 }}>
                  Your hand-sketch approach and your founder story is your biggest untapped asset.
                </p>
                <ScopeList
                  items={[
                    "Founder story content series (Reels + posts)",
                    "Sketch to setup, behind the scenes format",
                    "BNI profile + one-to-one pitch deck",
                  ]}
                />
                <CardFooter timeline="Ongoing" />
              </ServiceCard>
            </div>
          </div>
        </section>

        {/* ON INVESTMENT */}
        <section style={{ padding: isMobile ? "0 20px" : "0 24px" }}>
          <div style={{ maxWidth: 1152, margin: "0 auto" }}>
            <div
              style={{
                background: t.background.subtle,
                border: `1px solid ${t.border.subtle}`,
                borderRadius: 12,
                padding: isMobile ? "28px 20px" : "36px 40px",
                margin: "0 0 64px",
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: isMobile ? 20 : 48,
                alignItems: isMobile ? "flex-start" : "center",
              }}
            >
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase", color: tokens.gold, marginBottom: 10 }}>
                  On investment
                </p>
                <h2 style={{ fontFamily: SERIF, fontSize: isMobile ? 20 : 24, fontWeight: 600, color: t.text.primary, marginBottom: 10 }}>
                  Price is proposed after we understand your business.
                </h2>
                <p style={{ fontFamily: BODY, fontSize: 14, color: t.text.secondary, lineHeight: 1.8, margin: 0 }}>
                  Every engagement is scoped to your specific situation, not a fixed package. We start with a short discovery conversation. If there is a fit, we propose an investment with a clear return on it.
                </p>
              </div>

              <div style={{ flexShrink: 0, textAlign: "center" }}>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block",
                    padding: "14px 28px",
                    background: tokens.primary,
                    color: t.text.onPrimary,
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    borderRadius: 8,
                    textDecoration: "none",
                  }}
                >
                  Book a discovery call &rarr;
                </a>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: t.text.muted, marginTop: 8 }}>
                  30 minutes. No commitment.
                </p>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: t.text.muted, marginTop: 12 }}>
                  or{" "}
                  <a href="/branding/brand-identity-discovery" style={{ color: tokens.primary, textDecoration: "underline", fontWeight: 500 }}>
                    start with a brand brief
                  </a>
                  , we follow up within 3 days
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6 — ONGOING RETAINER */}
        <section style={{ padding: isMobile ? "0 20px 56px" : "0 24px 80px" }}>
          <div style={{ maxWidth: 1152, margin: "0 auto" }}>
            <div style={{ background: t.background.subtle, padding: isMobile ? "32px 24px" : "48px 40px", borderRadius: 12 }}>
              <p style={{ ...eyebrow, marginBottom: 12 }}>Ongoing partnership</p>
              <h2 style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 600, color: t.text.primary, marginBottom: 10 }}>Performance Growth Retainer</h2>
              <p style={{ fontFamily: BODY, fontSize: 15, color: t.text.secondary, marginBottom: 32, maxWidth: 560, lineHeight: 1.7 }}>
                Organic client acquisition through search. You pay more only when revenue comes from the website.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)", gap: 24 }}>
                <div>
                  <p style={{ ...sectionLabel, marginBottom: 12 }}>What is covered</p>
                  <ScopeList
                    items={[
                      "SEO",
                      "Google Business optimisation",
                      "Local search rankings",
                      "Performance reporting",
                      "Conversion tracking",
                    ]}
                  />
                </div>
                <div style={{ background: tokens.primary, padding: 24, borderRadius: 8, color: t.text.onPrimary }}>
                  <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: ".1em", color: tokens.gold, marginBottom: 12 }}>THE INCENTIVE MODEL</p>
                  <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.onPrimary, marginBottom: 8, lineHeight: 1.6 }}>
                    Minimal fixed monthly retainer (keeps overhead low)
                  </p>
                  <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.onPrimary, marginBottom: 20, lineHeight: 1.6 }}>
                    Performance incentive per confirmed booking
                  </p>
                  <CTAButton variant="primary" label="Chat on WhatsApp →" href={RETAINER_WHATSAPP_URL} target="_blank" />
                  <p style={{ fontFamily: BODY, fontSize: 12, color: t.text.onPrimary, opacity: 0.75, marginTop: 10, marginBottom: 0 }}>
                    Opens WhatsApp. We reply personally, usually same day.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7 — CTA */}
        <section style={{ padding: isMobile ? "48px 20px" : "64px 24px", textAlign: "center" }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <h2 style={{ fontFamily: SERIF, fontSize: isMobile ? 24 : 32, fontWeight: 600, color: t.text.primary, marginBottom: 32, lineHeight: 1.3 }}>
              The most authentic event business in Chennai deserves the most authentic brand.
            </h2>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <PortfolioButton
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: tokens.primary,
                  color: t.text.onPrimary,
                  borderColor: tokens.primary,
                  padding: "12px 24px",
                  borderRadius: 6,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Book a discovery call
                <ArrowRight className="w-4 h-4" />
              </PortfolioButton>
            </div>
            <p style={{ fontFamily: BODY, fontSize: 13, color: t.text.muted, marginTop: 12 }}>
              or{" "}
              <a href="/branding/brand-identity-discovery" style={{ color: tokens.primary, textDecoration: "underline" }}>
                start with a written brief
              </a>{" "}
              at your own pace
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

function PhaseHeader({ color, eyebrow: label, title, isMobile }: { color: string; eyebrow: string; title: string; isMobile: boolean }) {
  return (
    <div style={{ borderLeft: `4px solid ${color}`, paddingLeft: 16, marginBottom: 32 }}>
      <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: ".1em", color: tokens.primary, marginBottom: 6 }}>{label}</p>
      <h2 style={{ fontFamily: SERIF, fontSize: isMobile ? 22 : 26, fontWeight: 600, color: t.text.primary, margin: 0 }}>{title}</h2>
    </div>
  );
}

function ServiceCard({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: t.background.surface,
        border: `1px solid ${t.border.subtle}`,
        borderRadius: 12,
        padding: 24,
        transition: `border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
      }}
    >
      <p style={{ fontFamily: MONO, fontSize: 11, color: t.text.muted, marginBottom: 8 }}>{number}</p>
      <h3 style={{ fontFamily: BODY, fontSize: 16, fontWeight: 600, color: t.text.primary, marginBottom: 14 }}>{title}</h3>
      {children}
    </div>
  );
}

function ScopeList({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0, marginBottom: 4 }}>
      {items.map((item) => (
        <li key={item} style={{ fontFamily: BODY, fontSize: 13, color: t.text.secondary, padding: "4px 0", lineHeight: 1.5 }}>
          <span style={{ color: tokens.primary, marginRight: 6 }}>&middot;</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function CardFooter({ timeline }: { timeline: string }) {
  if (!timeline) return null;
  return (
    <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${t.border.subtle}` }}>
      <p style={{ fontFamily: MONO, fontSize: 12, color: t.text.muted, margin: 0 }}>{timeline}</p>
    </div>
  );
}
