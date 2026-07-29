import type { ReactNode } from "react";
import { t, tokens } from "../../portal/theme";

export type BeforeAfterCardType = "redesign" | "new-build";

interface BeforeAfterCardProps {
  beforeContent: ReactNode;
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
  cardDarkBg: "#222222", // background/dark-3 — BEFORE panel
  borderOnDark: "rgba(210,212,217,0.24)", // border/on-dark — proof caption border
  textOnDarkMuted: "rgba(234,235,238,0.74)", // text/on-dark-muted — proof caption body
} as const;

function StageLabelPill({ stage }: { stage: "Before" | "After" }) {
  const isBefore = stage === "Before";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 16px",
        borderRadius: 9999, // radius/component-full
        border: `1px solid ${isBefore ? FIGMA_ONLY.borderOnDark : t.border.default}`,
        background: isBefore ? "rgba(255,255,255,0.04)" : "transparent",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "'Jost', 'Inter', sans-serif",
          fontWeight: 500,
          fontSize: 12,
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          color: isBefore ? t.text.inverse : t.text.primary,
        }}
      >
        {stage}
      </p>
    </div>
  );
}

export function BeforeAfterCard({ beforeContent, afterContent, categoryLabel, proofCaption, cardType }: BeforeAfterCardProps) {
  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "relative" }}>
        {/* Stacked-deck backdrop, matches the fanned card stack in the Figma comp */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 16,
            background: t.background.surface,
            border: `1px solid ${t.border.subtle}`,
            transform: "rotate(-4deg)",
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
            transform: "rotate(2deg)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: cardType === "redesign" ? "minmax(0,0.43fr) minmax(0,0.57fr)" : "1fr",
            minHeight: 360,
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid ${t.border.overlayExtraStrong}`,
            boxShadow: "-2px -2px 4px 0px rgba(178,170,149,0.12)",
          }}
        >
          {cardType === "redesign" && (
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
              <StageLabelPill stage="Before" />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, width: "100%" }}>
                {beforeContent}
              </div>
              {proofCaption && (
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
                    Cost
                  </p>
                  <p style={{ margin: 0, fontFamily: BODY, fontSize: 13, lineHeight: "18px", color: FIGMA_ONLY.textOnDarkMuted }}>
                    {proofCaption}
                  </p>
                </div>
              )}
            </div>
          )}

          <div
            style={{
              position: "relative",
              background: cardType === "redesign" ? t.background.page : t.background.subtle,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "24px 20px",
              gap: 16,
            }}
          >
            {cardType === "redesign" && <StageLabelPill stage="After" />}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, width: "100%" }}>
              {afterContent}
            </div>
          </div>

          {cardType === "redesign" && (
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
    </div>
  );
}
