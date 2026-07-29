import type { MouseEvent } from "react";
import { t, tokens, motionTokens } from "../../portal/theme";

export type CTAButtonVariant = "primary" | "outline";

interface CTAButtonProps {
  variant: CTAButtonVariant;
  label: string;
  href: string;
  target?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

// brand/primary (#007872) and radius/md + radius/button (8px) come straight
// from the Figma Buttons/Button component (node 4429:8815) — theme.ts has no
// dedicated radius scale, so the pixel value is used directly rather than
// invented.
export function CTAButton({ variant, label, href, target, onClick }: CTAButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <a
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "12px 24px",
        borderRadius: 8,
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        fontSize: 14,
        fontWeight: 600,
        textDecoration: "none",
        whiteSpace: "nowrap",
        background: isPrimary ? tokens.accent : "transparent",
        color: isPrimary ? t.text.onPrimary : t.text.primary,
        border: `1px solid ${isPrimary ? tokens.accent : t.border.overlayExtraStrong}`,
        transition: `opacity ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
      }}
    >
      {label}
    </a>
  );
}
