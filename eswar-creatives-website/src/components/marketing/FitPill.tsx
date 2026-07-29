import type { ReactNode } from "react";
import { t, tokens } from "../../portal/theme";

interface FitPillProps {
  icon: ReactNode;
  title: string;
  description: string;
}

// Layout matches the Figma Badge Card component (node 4429:8808): radius/lg
// (12px), component/padding-lg (24px), component/gap-sm (8px) — used as raw
// pixel values since theme.ts has no radius/spacing scale to bind through.
export function FitPill({ icon, title, description }: FitPillProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: 24,
        borderRadius: 12,
        width: 320,
        maxWidth: "100%",
        textAlign: "center",
      }}
    >
      <div style={{ marginBottom: 4, color: tokens.gold }}>{icon}</div>
      <p
        style={{
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          fontWeight: 600,
          fontSize: 17,
          lineHeight: "22px",
          letterSpacing: "-0.43px",
          color: t.text.primary,
          margin: 0,
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          fontWeight: 400,
          fontSize: 13,
          lineHeight: "18px",
          letterSpacing: "-0.08px",
          color: t.text.secondary,
          margin: 0,
        }}
      >
        {description}
      </p>
    </div>
  );
}
