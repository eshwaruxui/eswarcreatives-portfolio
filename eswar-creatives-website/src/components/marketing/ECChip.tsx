import type { ReactNode } from "react";
import { t } from "../../portal/theme";

// Figma "EC-Chip" component set (fileKey 0SGbENUggpj9Fe6NebJ9QM, frame
// 4030:350) — two states, Default and Active. Both confirmed via
// get_design_context on the real instances (4028:232 / 4030:351), not
// guessed from the screenshot.
export type ECChipVariant = "default" | "active";

interface ECChipProps {
  children: ReactNode;
  variant?: ECChipVariant;
}

// Figma's "background/page" for Default resolves to white (neutral.0) — a
// different thing than this codebase's own t.background.page (#FAF8F4,
// cream), which is a same-name-different-meaning collision. Using
// t.background.surface (#FFFFFF) instead, since that's the actual color.
const BORDER_OVERLAY_STRONG = "rgba(28,24,45,0.1)"; // Figma border/overlay-strong — no theme.ts equivalent (closest, t.border.overlayStrong, is a different base rgb: rgba(10,10,23,0.14))

const CHIP_STYLES: Record<
  ECChipVariant,
  { bg: string; border?: string; text: string; paddingX: number; paddingY: number; fontSize: number; lineHeight: string; letterSpacing: string }
> = {
  default: {
    bg: t.background.surface,
    border: BORDER_OVERLAY_STRONG,
    text: t.text.primary,
    paddingX: 12,
    paddingY: 4,
    fontSize: 13,
    lineHeight: "18px",
    letterSpacing: "-0.08px",
  },
  active: {
    bg: t.background.dark3,
    text: t.text.inverse,
    paddingX: 8,
    paddingY: 4,
    fontSize: 11,
    lineHeight: "14px",
    letterSpacing: "0.06px",
  },
};

export function ECChip({ children, variant = "default" }: ECChipProps) {
  const s = CHIP_STYLES[variant];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: `${s.paddingY}px ${s.paddingX}px`,
        borderRadius: 9999,
        background: s.bg,
        border: s.border ? `1px solid ${s.border}` : "none",
        color: s.text,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        fontWeight: 500,
        fontSize: s.fontSize,
        lineHeight: s.lineHeight,
        letterSpacing: s.letterSpacing,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}
