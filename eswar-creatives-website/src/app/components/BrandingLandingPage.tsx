import { useEffect } from "react";
import { ArrowRight, PenLine, BookOpen, Layers } from "lucide-react";
import { motion } from "motion/react";
import { Navbar } from "./Navbar";
import { PortfolioButton } from "./ui/portfolio-button";

const C = {
  pageBg:      "#FAF8F4",
  gold:        "#D5B067",
  border:      "#E5E5E4",
  surface:     "var(--card)",
  inverse:     "var(--surface-inverse)",
  teal:        "var(--text-brand)",
  text:        "var(--text-primary)",
  textSec:     "var(--text-secondary)",
  textMuted:   "var(--text-tertiary)",
  textInv:     "var(--text-inverse)",
  textInvSec:  "var(--text-inverse-secondary)",
  textInvTert: "var(--text-inverse-tertiary)",
} as const;

const SERIF       = "'Fraunces', Georgia, 'Times New Roman', serif";
const CARD_SHADOW = "0px 4px 6px -1px rgba(2,4,4,0.07)";

const overline = {
  fontSize:      "var(--typo-ol-overline-bold-size)",
  fontWeight:    "var(--typo-ol-overline-bold-weight)",
  lineHeight:    "var(--typo-ol-overline-bold-line-height)",
  letterSpacing: "var(--typo-ol-overline-bold-letter-spacing)",
  textTransform: "uppercase" as const,
  color:         C.textMuted,
};

const WHAT_WE_BUILD = [
  {
    Icon:  PenLine,
    title: "Logo and Mark System",
    desc:  "Primary mark, wordmark, sub-marks, and usage rules built for print and digital.",
  },
  {
    Icon:  BookOpen,
    title: "Brand Guidelines",
    desc:  "Colour palette, typography, spacing, tone of voice, and do/don't examples in a ready-to-share PDF.",
  },
  {
    Icon:  Layers,
    title: "Collateral and Social Kit",
    desc:  "Business cards, letterhead, social media templates, and pitch deck covers formatted to your new identity.",
  },
];

export function BrandingLandingPage() {
  useEffect(() => {
    document.title = "Brand Identity Design — Eswar Creatives";
    document.documentElement.style.background = C.pageBg;
    document.body.style.background = "transparent";
    return () => {
      document.documentElement.style.background = "";
      document.body.style.background = "";
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.pageBg,
        fontFamily: "var(--font-family-primary)",
        color: C.text,
      }}
    >
      <Navbar />

      {/* ── 1. HERO ────────────────────────────────────────────── */}
      <section style={{ paddingTop: "80px" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "72px 24px 64px" }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <p style={{ ...overline, marginBottom: "16px" }}>
              Eswar Creatives · Brand Identity
            </p>
            <h1
              style={{
                fontFamily:     SERIF,
                fontWeight:     600,
                fontStyle:      "italic",
                fontSize:       "clamp(36px, 5.5vw, 52px)",
                lineHeight:     1.08,
                letterSpacing:  "-0.02em",
                color:          C.text,
                maxWidth:       "680px",
                marginBottom:   "20px",
              }}
            >
              Your brand is the first thing they judge.
            </h1>
            <p
              style={{
                fontSize:     "var(--typo-ol-body-size)",
                fontWeight:   "var(--typo-ol-body-weight)",
                lineHeight:   1.65,
                color:        C.textSec,
                maxWidth:     "560px",
                marginBottom: "36px",
              }}
            >
              We build visual identities for businesses that want to look as good as they perform: logo, colour, typography, and the collateral that makes it stick.
            </p>
            <PortfolioButton
              href="/services/branding"
              variant="primary"
              size="lg"
              style={{
                background:   C.inverse,
                color:        C.textInv,
                borderColor:  C.inverse,
                borderRadius: "8px",
                fontSize:     "var(--typo-p-sm-size)",
              }}
            >
              See pricing and packages
              <ArrowRight className="w-4 h-4" />
            </PortfolioButton>
          </motion.div>
        </div>
      </section>

      {/* ── 2. WHAT WE BUILD ────────────────────────────────────── */}
      <section style={{ paddingBottom: "80px" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <p style={{ ...overline, marginBottom: "12px" }}>What we build</p>
            <h2
              style={{
                fontFamily:    SERIF,
                fontWeight:    600,
                fontSize:      "clamp(24px, 3vw, 34px)",
                lineHeight:    1.2,
                letterSpacing: "-0.02em",
                color:         C.text,
                marginBottom:  "40px",
                maxWidth:      "560px",
              }}
            >
              Everything your brand needs to show up consistently.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {WHAT_WE_BUILD.map(({ Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                style={{
                  background:   C.surface,
                  border:       `1px solid ${C.border}`,
                  borderRadius: "16px",
                  boxShadow:    CARD_SHADOW,
                  padding:      "28px",
                }}
              >
                <div
                  style={{
                    width:           "40px",
                    height:          "40px",
                    borderRadius:    "10px",
                    background:      "#FBF5E8",
                    border:          `1px solid ${C.border}`,
                    display:         "flex",
                    alignItems:      "center",
                    justifyContent:  "center",
                    marginBottom:    "16px",
                    flexShrink:      0,
                  }}
                >
                  <Icon style={{ width: "18px", height: "18px", color: C.gold }} />
                </div>
                <p
                  style={{
                    fontFamily:    SERIF,
                    fontWeight:    600,
                    fontSize:      "18px",
                    lineHeight:    1.3,
                    color:         C.text,
                    marginBottom:  "10px",
                  }}
                >
                  {title}
                </p>
                <p
                  style={{
                    fontSize:   "var(--typo-p-sm-size)",
                    fontWeight: "var(--typo-p-sm-weight)",
                    lineHeight: "var(--typo-p-sm-line-height)",
                    color:      C.textSec,
                  }}
                >
                  {desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. WHO THIS IS FOR ──────────────────────────────────── */}
      <section style={{ background: C.inverse, padding: "80px 0" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <p style={{ ...overline, color: C.textInvTert, marginBottom: "36px" }}>
              Who this is for
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: 0.05 }}
            >
              <h3
                style={{
                  fontFamily:    SERIF,
                  fontWeight:    600,
                  fontStyle:     "italic",
                  fontSize:      "clamp(20px, 2.5vw, 26px)",
                  lineHeight:    1.35,
                  color:         C.textInvSec,
                  marginBottom:  "16px",
                }}
              >
                You're serious about growth but your brand doesn't show it.
              </h3>
              <p
                style={{
                  fontSize:   "var(--typo-ol-body-size)",
                  lineHeight: 1.7,
                  color:      C.textInvTert,
                }}
              >
                Your product or service is strong. The business is growing. But your logo was done in a hurry, your colours aren't consistent, and your Instagram looks nothing like your visiting card.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: 0.12 }}
            >
              <h3
                style={{
                  fontFamily:    SERIF,
                  fontWeight:    600,
                  fontSize:      "clamp(20px, 2.5vw, 26px)",
                  lineHeight:    1.35,
                  color:         C.textInv,
                  marginBottom:  "16px",
                }}
              >
                You need a visual identity that works on a pitch deck, a visiting card, and Instagram. Consistently.
              </h3>
              <p
                style={{
                  fontSize:   "var(--typo-ol-body-size)",
                  lineHeight: 1.7,
                  color:      C.textInvSec,
                }}
              >
                That's exactly what we build: a complete brand system with logo, colour, typography, and collateral ready to work everywhere your business shows up.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 4. FEATURED RESULT ──────────────────────────────────── */}
      <section style={{ padding: "80px 0" }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 24px" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <p style={{ ...overline, marginBottom: "32px" }}>Client result</p>
            <div
              style={{
                background:   C.surface,
                border:       `1px solid ${C.border}`,
                borderLeft:   `4px solid ${C.gold}`,
                borderRadius: "16px",
                boxShadow:    CARD_SHADOW,
                padding:      "40px 48px",
                maxWidth:     "720px",
              }}
            >
              <p
                style={{
                  fontFamily:    SERIF,
                  fontWeight:    600,
                  fontStyle:     "italic",
                  fontSize:      "clamp(18px, 2vw, 22px)",
                  lineHeight:    1.4,
                  color:         C.text,
                  marginBottom:  "16px",
                }}
              >
                Newgen Event Makers: logo identity, brand guidelines, and social kit delivered in 3 weeks.
              </p>
              <p
                style={{
                  fontSize:   "var(--typo-p-sm-size)",
                  fontWeight: "var(--typo-p-sm-weight)",
                  lineHeight: "var(--typo-p-sm-line-height)",
                  color:      C.textMuted,
                }}
              >
                Full brand identity from brief to final files, including a primary mark, wordmark, brand colour system, typography guide, and a set of Instagram and WhatsApp story templates.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 5. CTA STRIP ────────────────────────────────────────── */}
      <section
        style={{
          background:  C.pageBg,
          borderTop:   `3px solid ${C.gold}`,
          padding:     "72px 0",
        }}
      >
        <div
          style={{
            maxWidth:   "1152px",
            margin:     "0 auto",
            padding:    "0 24px",
            textAlign:  "center",
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
          >
            <h2
              style={{
                fontFamily:    SERIF,
                fontWeight:    600,
                fontSize:      "28px",
                lineHeight:    1.25,
                letterSpacing: "-0.02em",
                color:         C.text,
                marginBottom:  "12px",
              }}
            >
              Ready to build a brand that lasts?
            </h2>
            <p
              style={{
                fontSize:     "var(--typo-ol-body-size)",
                color:        C.textSec,
                marginBottom: "32px",
              }}
            >
              Three tiers. Fixed scope. Delivered in weeks.
            </p>
            <div
              className="flex flex-wrap gap-4 justify-center items-center"
            >
              <PortfolioButton
                href="/services/branding"
                variant="primary"
                size="lg"
                style={{
                  background:   C.gold,
                  color:        C.text,
                  borderColor:  C.gold,
                  borderRadius: "12px",
                  fontSize:     "var(--typo-ol-body-semi-size)",
                  fontWeight:   "var(--typo-ol-body-semi-weight)",
                }}
              >
                See packages and pricing
                <ArrowRight className="w-4 h-4" />
              </PortfolioButton>
              {/* Replace 91XXXXXXXXXX with the real WhatsApp number */}
              <a
                href="https://wa.me/91XXXXXXXXXX"
                style={{
                  fontSize:       "var(--typo-ol-body-size)",
                  fontWeight:     "var(--typo-ol-body-semi-weight)",
                  color:          C.teal,
                  textDecoration: "none",
                }}
              >
                Or WhatsApp us directly →
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
