import type { CSSProperties, ReactNode } from "react";
import { t, tokens } from "../../portal/theme";

export type BeforeAfterCardType = "redesign" | "new-build";

interface BeforeAfterCardProps {
  beforeContent?: ReactNode;
  afterContent: ReactNode;
  proofCaption?: string;
  cardType: BeforeAfterCardType;
}

const MONO = "'SF Mono', monospace";
const BODY = "'Inter', system-ui, -apple-system, sans-serif";

// ProcessStageLabel (node 4422:5901) ships 4 variants keyed by project type:
// Before/After for a redesign, Starting Point/Output for a from-scratch
// build. The proof box's label follows the same split (Cost vs Proof). Do
// not hardcode "Before"/"After" per call site — resolve through this map so
// cardType is the single source of truth for wording.
const VARIANT_LABELS: Record<BeforeAfterCardType, { proof: string }> = {
  redesign: { proof: "COST" },
  "new-build": { proof: "PROOF" },
};

// Starting Point / Output labels ship as pre-baked SVGs (bracket + text as
// vector paths — "STARTING POINT" is too long to fit the short Before/After
// bracket at a fixed size) — real assets, not a dynamically drawn pill.
const LABEL_ASSETS: Record<"on-dark" | "on-light", string> = {
  "on-dark": "/img/branding/hero/label-starting-point.svg",
  "on-light": "/img/branding/hero/label-output.svg",
};

// Exact path from node 4422:5901's ProcessStageLabel background vector — a
// hand-drawn corner-bracket frame, not a solid rounded pill. preserveAspectRatio
// "none" matches Figma's own non-uniform stretch so the brackets always reach
// the pill's actual rendered edges regardless of label text length.
function LabelBracket({ color }: { color: string }) {
  return (
    <svg
      aria-hidden
      width="100%"
      height="100%"
      viewBox="0 0 97.387 34.8992"
      preserveAspectRatio="none"
      fill="none"
      style={{ position: "absolute", inset: 0 }}
    >
      <path
        d="M97.0064 3.28325H0.38M97.007 31.6237H1.74859M4.65203 0.38V34.5192M94.1034 0.38V34.5192"
        stroke={color}
        strokeWidth={0.76}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StageLabelPill({ label, tone, cardType }: { label: string; tone: "on-dark" | "on-light"; cardType: BeforeAfterCardType }) {
  const isOnDark = tone === "on-dark";

  if (cardType === "new-build") {
    return <img src={LABEL_ASSETS[tone]} alt="" aria-hidden style={{ display: "block" }} />;
  }

  // Exact per-variant box sizes from ProcessStageLabel (node 4422:5901):
  // Before (on-dark) 98x36, After (on-light) 97.4x34.9.
  return (
    <div
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: isOnDark ? 98 : 97.4,
        height: isOnDark ? 36 : 34.9,
      }}
    >
      <LabelBracket color={isOnDark ? t.border.onDark : t.border.overlayExtraStrong} />
      <p
        style={{
          position: "relative",
          margin: 0,
          fontFamily: BODY,
          fontWeight: 600,
          fontSize: 14, // matches Figma text-[14px]
          letterSpacing: "2px", // matches Figma tracking-[2px]
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          color: isOnDark ? t.text.inverse : t.text.primary,
        }}
      >
        {label}
      </p>
    </div>
  );
}

function ProofBox({ label, caption }: { label: string; caption: string }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 220,
        border: `1px solid ${t.border.onDark}`,
        borderRadius: 8,
        padding: "11px 13px",
      }}
    >
      <p
        style={{
          margin: "0 0 6px",
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: "0.76px",
          textTransform: "uppercase",
          color: tokens.gold,
          opacity: 0.7,
        }}
      >
        {label}
      </p>
      <p style={{ margin: 0, fontFamily: BODY, fontSize: 13, lineHeight: "18px", color: t.text.onDarkMuted }}>{caption}</p>
    </div>
  );
}

// Vertical "STRATEGY · DESIGN · IMPACT" tab, node 4424:6945's "Navigation
// container" — structural chrome on every card (all 12 reference slides
// carry it), not slide-specific content, so it lives here rather than being
// composed per-slide by the page.
function VerticalTab() {
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        right: 0,
        top: "50%",
        transform: "translateY(-50%)",
        background: t.background.subtleWarm,
        borderRadius: "8px 0 0 8px",
        padding: "12px 4px",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: MONO,
          fontWeight: 700,
          fontSize: 9,
          letterSpacing: "1.5px",
          color: t.text.secondary,
          writingMode: "vertical-rl",
          transform: "rotate(180deg)",
          whiteSpace: "nowrap",
        }}
      >
        STRATEGY  ·  DESIGN  ·  IMPACT
      </p>
    </div>
  );
}

// Exact backdrop layers from node 4424:6945 (Rectangle15/14/13) — soft blurred
// card silhouettes fanned out behind the main card. Positions/rotations are
// ported directly from Figma's outer wrapper transforms (measured against its
// 560px-wide reference card); they read as a subtle bleed at any card width.
const STACK_LAYERS: { src: string; style: CSSProperties }[] = [
  {
    src: "/img/branding/hero/stack-rect-15.svg",
    style: { position: "absolute", left: -44.86, top: -27.85, width: 613.679, height: 479.542, transform: "rotate(-7.19deg) skewX(-0.13deg)" },
  },
  {
    src: "/img/branding/hero/stack-rect-14.svg",
    style: { position: "absolute", left: -31.59, top: -30, width: 571.922, height: 424.795, transform: "rotate(-7.19deg) skewX(-0.13deg)" },
  },
  {
    src: "/img/branding/hero/stack-rect-13.svg",
    style: { position: "absolute", left: -18.18, top: -22.06, width: 573.626, height: 442.316, transform: "rotate(-4.29deg) skewX(-0.08deg)" },
  },
];

export function BeforeAfterCard({ beforeContent, afterContent, proofCaption, cardType }: BeforeAfterCardProps) {
  const labels = VARIANT_LABELS[cardType];
  const hasBeforePanel = Boolean(beforeContent);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "relative" }}>
        {STACK_LAYERS.map((layer) => (
          <img key={layer.src} src={layer.src} alt="" aria-hidden style={layer.style} />
        ))}

        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: hasBeforePanel ? "minmax(0,0.43fr) minmax(0,0.57fr)" : "1fr",
            minHeight: 440,
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid ${t.border.overlayExtraStrong}`,
            boxShadow: "-2px -2px 4px 0px rgba(178,170,149,0.12)",
          }}
        >
          {hasBeforePanel && (
            <div
              style={{
                background: t.background.dark3,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "24px 20px",
                gap: 16,
              }}
            >
              <div style={{ height: 60, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <StageLabelPill label="BEFORE" tone="on-dark" cardType={cardType} />
              </div>
              <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
                  {beforeContent}
                </div>
                {proofCaption && <ProofBox label={labels.proof} caption={proofCaption} />}
              </div>
            </div>
          )}

          <div
            style={{
              position: "relative",
              background: hasBeforePanel ? t.background.cardWarm : t.background.subtle,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "24px 20px",
              gap: 16,
            }}
          >
            <div style={{ height: 60, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <StageLabelPill label="AFTER" tone="on-light" cardType={cardType} />
            </div>
            <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
                {afterContent}
              </div>
              {!hasBeforePanel && proofCaption && <ProofBox label={labels.proof} caption={proofCaption} />}
            </div>
            {hasBeforePanel && <VerticalTab />}
          </div>

          {hasBeforePanel && (
            <div
              style={{
                position: "absolute",
                left: "calc(50% - 36px)",
                top: "calc(50% - 41px)",
                transform: "translate(-50%, -50%)",
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: tokens.gold,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                color: t.text.primary,
              }}
              aria-hidden
            >
              &rarr;
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
