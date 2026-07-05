import * as React from "react";
import { cn } from "./utils";

/**
 * SectionLabel — uppercase overline text used as a section category label.
 *
 * Found in SectionHeader (4 instances) and FooterSection (2 instances).
 * Design System v1: 12px / 700 / uppercase / 1.14px tracking.
 *
 * Surfaces:
 *   light   → text-text-muted (portfolio sections)
 *   inverse → text-text-inverse-tertiary (dark footer)
 */
type SectionLabelProps = React.ComponentProps<"span"> & {
  surface?: "light" | "inverse";
};

function SectionLabel({
  surface = "light",
  className,
  children,
  ...props
}: SectionLabelProps) {
  return (
    <span
      data-slot="section-label"
      className={cn(
        "uppercase block font-bold",
        surface === "inverse"
          ? "text-text-inverse-tertiary"
          : "text-text-muted",
        className
      )}
      style={{
        fontSize: "var(--ds-text-sm)",
        lineHeight: "16px",
        letterSpacing: "1.14px",
        ...props.style,
      }}
      {...props}
    >
      {children}
    </span>
  );
}

export { SectionLabel };
export type { SectionLabelProps };