import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

/**
 * PortfolioButton — unified button primitive for the portfolio site.
 *
 * Extracted from 8+ instances across HeroSection, FlagshipCase,
 * SelectedWorks, FooterSection, and Navbar.
 *
 * Variants:
 *   primary   → teal CTA (View Flagship Case, Download Resume, WhatsApp)
 *   secondary → outlined ghost (Download Resume alt, View case study)
 *   ghost     → text-only with arrow (Read full profile, accordion links)
 *   inverse   → outlined on dark surface (FooterSection "Read full profile")
 *
 * Sizes:
 *   sm → 12px text, compact   (card-level CTAs)
 *   md → 13px text, standard  (section-level CTAs, navbar)
 *   lg → 14px text, prominent (hero CTAs)
 */
const portfolioButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-interactive-primary text-text-primary hover:bg-interactive-primary-hover active:bg-interactive-primary-active hover:shadow-md hover:shadow-interactive-primary/20 hover:-translate-y-0.5",
        secondary:
          "border border-gray-300 text-text-secondary hover:border-gray-400 hover:bg-gray-50 hover:-translate-y-0.5",
        ghost:
          "text-text-primary hover:text-black",
        inverse:
          "border border-white/[0.15] text-text-inverse-secondary hover:bg-state-inverse-hover transition-all duration-200",
      },
      size: {
        sm: "px-4 py-2 [&_svg]:w-3 [&_svg]:h-3",
        md: "px-5 py-2.5 [&_svg]:w-3.5 [&_svg]:h-3.5",
        lg: "px-6 py-3 [&_svg]:w-4 [&_svg]:h-4",
      },
      fullWidth: {
        true: "w-full justify-center",
        false: "w-fit",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
    },
  }
);

type PortfolioButtonProps = React.ComponentProps<"a"> &
  React.ComponentProps<"button"> &
  VariantProps<typeof portfolioButtonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

function PortfolioButton({
  className,
  variant,
  size,
  fullWidth,
  asChild = false,
  loading,
  children,
  ...props
}: PortfolioButtonProps) {
  const hasHref = "href" in props && props.href != null;
  const Comp = asChild ? Slot : hasHref ? "a" : "button";

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      fontSize: "var(--typo-h8m-size)",
      lineHeight: "var(--typo-h8m-line-height)",
      fontWeight: "var(--typo-h8m-weight)" as any,
    },
    md: {
      fontSize: "var(--typo-caption-m-size)",
      lineHeight: "var(--typo-caption-m-line-height)",
      fontWeight: "var(--typo-caption-m-weight)" as any,
    },
    lg: {
      fontSize: "var(--typo-btn-med-size)",
      lineHeight: "var(--typo-btn-med-line-height)",
      fontWeight: "var(--typo-btn-med-weight)" as any,
    },
  };

  return (
    <Comp
      data-slot="portfolio-button"
      className={cn(
        portfolioButtonVariants({ variant, size, fullWidth }),
        loading && "opacity-70 cursor-wait",
        className
      )}
      style={{ ...sizeStyles[size || "md"], ...props.style }}
      {...props}
    >
      {children}
    </Comp>
  );
}

export { PortfolioButton, portfolioButtonVariants };
export type { PortfolioButtonProps };