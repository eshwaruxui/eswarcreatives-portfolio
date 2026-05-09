import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

/**
 * Tag / Pill — the most repeated pattern in the portfolio (15+ instances).
 *
 * Variants map to every visual context found in the audit:
 *   subtle       → hero tags (#enterprise, #design systems)
 *   outlined     → case-study & testimonial tags (Enterprise SaaS, Cybersecurity)
 *   filled       → sidebar active tags (bg-gray-100, no border)
 *   overlay-dark → image badge on dark overlay (Flagship label on image)
 *   overlay-light→ image badge on light overlay (Flagship label on card image)
 *
 * Sizes:
 *   sm  → 10px text, compact padding  (SelectedWorks tags, sidebar tags)
 *   md  → 11–12px text, standard      (FlagshipCase tags, hero tags)
 */
const tagVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full whitespace-nowrap shrink-0 transition-colors",
  {
    variants: {
      variant: {
        subtle:
          "bg-black/[0.04] text-text-tertiary tracking-wide",
        outlined:
          "border border-gray-200 text-text-tertiary",
        filled:
          "bg-gray-100 text-text-tertiary",
        "overlay-dark":
          "bg-black/70 backdrop-blur-sm text-text-on-bold",
        "overlay-light":
          "bg-white/90 backdrop-blur-sm text-text-secondary border border-black/5",
      },
      size: {
        sm: "px-2 py-0.5",
        md: "px-2.5 py-0.5",
        lg: "px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "outlined",
      size: "md",
    },
  }
);

type TagProps = React.ComponentProps<"span"> &
  VariantProps<typeof tagVariants> & {
    asChild?: boolean;
  };

function Tag({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: TagProps) {
  const Comp = asChild ? Slot : "span";

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      fontSize: "var(--typo-pointer-size)",
      lineHeight: "var(--typo-pointer-line-height)",
      fontWeight: 500,
    },
    md: {
      fontSize: "var(--typo-label-m-size)",
      lineHeight: "var(--typo-label-m-line-height)",
      fontWeight: "var(--typo-label-m-weight)" as any,
    },
    lg: {
      fontSize: "var(--typo-h8m-size)",
      lineHeight: "var(--typo-h8m-line-height)",
      fontWeight: "var(--typo-h8m-weight)" as any,
    },
  };

  return (
    <Comp
      data-slot="tag"
      className={cn(tagVariants({ variant, size }), className)}
      style={{ ...sizeStyles[size || "md"], ...props.style }}
      {...props}
    />
  );
}

export { Tag, tagVariants };
export type { TagProps };