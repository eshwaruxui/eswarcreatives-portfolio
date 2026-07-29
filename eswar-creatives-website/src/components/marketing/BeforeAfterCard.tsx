import type { ReactNode } from "react";
import { t, tokens } from "../../portal/theme";

export type BeforeAfterCardType = "redesign" | "new-build";

interface BeforeAfterCardProps {
  beforeContent?: ReactNode;
  afterContent: ReactNode;
  categoryLabel: string;
  proofCaption?: string;
  cardType: BeforeAfterCardType;
}

const MONO = "'SF Mono', monospace";
const BODY = "'Inter', system-ui, -apple-system, sans-serif";

// A handful of roles in this card have no equivalent in src/portal/theme.ts
// (which only covers portal light-surface UI, not a dark before/after
// showcase panel). These are bound directly to the values get_design_context
// returned for node 4379:1453, named after their Figma token, rather than
// inventing new hex — flagged per COMPONENT LOCATION instructions.
const FIGMA_ONLY = {
  cardDarkBg: "#222222", // background/dark-3 — BEFORE / STARTING POINT panel
  borderOnDark: "rgba(210,212,217,0.24)", // border/on-dark — proof caption border
  textOnDarkMuted: "rgba(234,235,238,0.74)", // text/on-dark-muted — proof caption body
} as const;

// ProcessStageLabel (node 4422:5901) ships 4 variants keyed by project type:
// Before/After for a redesign, Starting Point/Output for a from-scratch
// build. The proof box's label follows the same split (Cost vs Proof). Do
// not hardcode "Before"/"After" per call site — resolve through this map so
// cardType is the single source of truth for wording.
const VARIANT_LABELS: Record<BeforeAfterCardType, { before: string; after: string; proof: string }> = {
  redesign: { before: "BEFORE", after: "AFTER", proof: "COST" },
  "new-build": { before: "STARTING POINT", after: "OUTPUT", proof: "PROOF" },
};

function StageLabelPill({ label, tone }: { label: string; tone: "on-dark" | "on-light" }) {
  const isOnDark = tone === "on-dark";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 18px",
        borderRadius: 9999, // radius/component-full
        // border-width has no literal Figma token — the source badge is a
        // vector asset, not a CSS border. 1.5px chosen so the outline reads
        // with visible weight per design QA, up from the earlier 1px.
        border: `1.5px solid ${isOnDark ? FIGMA_ONLY.borderOnDark : t.border.medium}`,
        background: isOnDark ? "rgba(255,255,255,0.04)" : "transparent",
      }}
    >
      <p
        style={{
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
        border: `1px solid ${FIGMA_ONLY.borderOnDark}`,
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
      <p style={{ margin: 0, fontFamily: BODY, fontSize: 13, lineHeight: "18px", color: FIGMA_ONLY.textOnDarkMuted }}>{caption}</p>
    </div>
  );
}

export function BeforeAfterCard({ beforeContent, afterContent, categoryLabel, proofCaption, cardType }: BeforeAfterCardProps) {
  const labels = VARIANT_LABELS[cardType];
  const hasBeforePanel = cardType === "redesign" && Boolean(beforeContent);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "relative" }}>
        {/* Stacked-deck backdrop: two layers offset down-right with reduced
            opacity, approximating the fanned photo stack in the Figma comp
            (Rectangle13/14/15, node 4424:6945) without pulling in 3 large
            rotated photo assets for a purely decorative backdrop. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 16,
            background: t.background.surface,
            border: `1px solid ${t.border.subtle}`,
            opacity: 0.35,
            transform: "translate(14px, 14px)",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 16,
            background: t.background.surface,
            border: `1px solid ${t.border.subtle}`,
            opacity: 0.6,
            transform: "translate(7px, 7px)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: hasBeforePanel ? "minmax(0,0.43fr) minmax(0,0.57fr)" : "1fr",
            minHeight: 360,
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid ${t.border.overlayExtraStrong}`,
            boxShadow: "-2px -2px 4px 0px rgba(178,170,149,0.12)",
          }}
        >
          {hasBeforePanel && (
            <div
              style={{
                background: FIGMA_ONLY.cardDarkBg,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "24px 20px",
                gap: 16,
              }}
            >
              <StageLabelPill label={labels.before} tone="on-dark" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, width: "100%" }}>
                {beforeContent}
              </div>
              {proofCaption && <ProofBox label={labels.proof} caption={proofCaption} />}
            </div>
          )}

          <div
            style={{
              position: "relative",
              background: hasBeforePanel ? t.background.page : t.background.subtle,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "24px 20px",
              gap: 16,
            }}
          >
            <StageLabelPill label={labels.after} tone="on-light" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, width: "100%" }}>
              {afterContent}
            </div>
            {!hasBeforePanel && proofCaption && <ProofBox label={labels.proof} caption={proofCaption} />}
          </div>

          {hasBeforePanel && (
            <div
              style={{
                position: "absolute",
                left: "43%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: 34,
                height: 34,
                borderRadius: 16,
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

      {/* Per-card category chip only makes sense for placeholder/new-build
          slides that have nothing else identifying them — the real Newgen
          redesign slide already carries its category via the hero caption
          below the dots, so showing it twice reads as redundant. */}
      {cardType === "new-build" && (
        <p
          style={{
            marginTop: 16,
            textAlign: "center",
            fontFamily: MONO,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: t.text.muted,
          }}
        >
          {categoryLabel}
        </p>
      )}
    </div>
  );
}
