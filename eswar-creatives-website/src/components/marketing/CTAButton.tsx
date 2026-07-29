import type { MouseEvent } from "react";
import { t, tokens, motionTokens } from "../../portal/theme";

export type CTAButtonVariant = "primary" | "outline";
export type CTAButtonSize = "md" | "xl";

interface CTAButtonProps {
  variant: CTAButtonVariant;
  size?: CTAButtonSize;
  label: string;
  href: string;
  target?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  // Stretches to share the row equally with sibling buttons (flex: 1) instead
  // of hugging its own label — e.g. the hero's "See our work"/"Let's talk"
  // pair, which the hi-fi design shows as two equal 270px-wide buttons rather
  // than widths that vary with label length.
  fullWidth?: boolean;
}

// Figma Buttons/Button (node 4429:8815) Inspect panel: "xl" size is a 270x54
// hug box, radius 8 — this maps to the padding/fontSize below rather than a
// fixed 270px width, so it still hugs real label text ("See our work →")
// instead of Figma's placeholder "Button CTA" copy. "md" is the pre-existing
// size, kept as the default so the nav and retainer CTAs (never audited
// against this spec) don't change.
const SIZE_STYLES: Record<CTAButtonSize, { padding: string; fontSize: number }> = {
  md: { padding: "12px 24px", fontSize: 14 },
  xl: { padding: "16px 32px", fontSize: 16 },
};

// Hover/Focused state values read from the Buttons/Button component set
// (node 4157:2752, "Size=md, Hierarchy={Primary|Secondary gray}, State=...").
// None of these have a theme.ts equivalent (hover/focus aren't modeled
// there), so they're bound directly with their Figma token names:
// - Primary Default/Hover text+bg: brand/primary (#007872) / brand/primary-hover (#005450, teal.600)
// - Primary Focused: same fill as Default + a 4px ring, box-shadow 0 1px 2px rgba(0,0,0,.05), 0 0 0 4px #F4EBFF
//   (Figma's literal ring color — a generic violet, not brand teal/gold; flagged for Eswar to confirm
//   this wasn't left over from an unthemed base design-system component.)
// - Secondary gray Default/Focused text: text/secondary (#555, matches t.text.secondary exactly);
//   Hover text: text/primary (#111) — it's the one hierarchy where hover darkens the label.
// - Secondary gray border (all states): border/overlay-extra-strong = rgba(13,10,23,0.15) — close to
//   but not exactly t.border.overlayStrong (rgba(10,10,23,0.14)); kept as the literal per-state value
//   from this specific component rather than reusing that token, since Figma names it differently here.
// - Secondary gray Hover background: literal bg-[#fafafa] in the component.
// - Secondary gray Focused ring: box-shadow 0 1px 2px rgba(0,0,0,.05), 0 0 0 4px #F5F5F5 (near-identical
//   to t.background.muted #F5F5F4 — reused that token instead of a second near-duplicate hex).
const PRIMARY_HOVER_BG = "#005450";
const PRIMARY_FOCUS_RING = "#F4EBFF";
const SECONDARY_GRAY_BORDER = "rgba(13,10,23,0.15)";
const SECONDARY_GRAY_HOVER_BG = "#FAFAFA";

const STATE_CSS = `
.ec-cta-primary {
  background: ${tokens.accent};
  border-color: ${tokens.accent};
  color: ${t.text.onPrimary};
}
.ec-cta-primary:hover {
  background: ${PRIMARY_HOVER_BG};
  border-color: ${PRIMARY_HOVER_BG};
}
.ec-cta-primary:focus-visible {
  outline: none;
  box-shadow: 0px 1px 2px 0px rgba(0,0,0,0.05), 0px 0px 0px 4px ${PRIMARY_FOCUS_RING};
}
.ec-cta-secondary-gray {
  background: ${t.background.surface};
  border-color: ${SECONDARY_GRAY_BORDER};
  color: ${t.text.secondary};
}
.ec-cta-secondary-gray:hover {
  background: ${SECONDARY_GRAY_HOVER_BG};
  border-color: ${SECONDARY_GRAY_BORDER};
  color: ${t.text.primary};
}
.ec-cta-secondary-gray:focus-visible {
  outline: none;
  box-shadow: 0px 1px 2px 0px rgba(0,0,0,0.05), 0px 0px 0px 4px ${t.background.muted};
}
`;

// brand/primary (#007872) and radius/md + radius/button (8px) come straight
// from the Figma Buttons/Button component (node 4429:8815) — theme.ts has no
// dedicated radius scale, so the pixel value is used directly rather than
// invented.
//
// Color/border/hover/focus all live in a CSS class (STATE_CSS above) rather
// than the inline `style` object: React inline styles always beat stylesheet
// rules (including :hover/:focus-visible ones) regardless of specificity, so
// there is no way to express interactive states through `style` alone.
export function CTAButton({ variant, size = "md", label, href, target, onClick, fullWidth = false }: CTAButtonProps) {
  const isPrimary = variant === "primary";
  const { padding, fontSize } = SIZE_STYLES[size];

  return (
    <>
      <style>{STATE_CSS}</style>
      <a
        href={href}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        onClick={onClick}
        className={isPrimary ? "ec-cta-primary" : "ec-cta-secondary-gray"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          flex: fullWidth ? "1 1 0" : undefined,
          padding,
          borderRadius: 8,
          borderWidth: 1,
          borderStyle: "solid",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          fontSize,
          fontWeight: 600,
          textDecoration: "none",
          whiteSpace: "nowrap",
          transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}, border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}, color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
        }}
      >
        {label}
      </a>
    </>
  );
}
