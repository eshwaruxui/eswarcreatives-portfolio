import * as React from "react";
import { cn } from "./utils";

/**
 * SectionLabel — uppercase overline text used as a section category label.
 *
 * Found in SectionHeader (4 instances) and FooterSection (2 instances).
 * Maps to typography token: H9 (11px/600/uppercase/0.08em tracking).
 *
 * Surfaces:
 *   light   → text-text-quaternary (portfolio sections)
 *   inverse → text-text-inverse-quaternary (dark footer)
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
        "tracking-widest uppercase block",
        surface === "inverse"
          ? "text-text-inverse-quaternary"
          : "text-text-quaternary",
        className
      )}
      style={{
        fontSize: "var(--typo-h9-size)",
        lineHeight: "var(--typo-h9-line-height)",
        fontWeight: "var(--typo-h9-weight)",
        letterSpacing: "var(--typo-h9-letter-spacing)",
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