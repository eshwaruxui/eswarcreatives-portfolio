import { BadgeCheck } from "lucide-react";
import hfiLogo from "figma:asset/6fbb4e650de7aa03cf61da817d2d4d915097f262.png";
import { cn } from "./utils";

export interface CuaBadgeProps {
  /** Accent color for the CUA™ label and verified icon */
  accent?: "danger" | "warning" | "brand";
  /** Visual variant: "default" for standard frosted-glass, "elevated" for stronger blur + shadow */
  variant?: "default" | "elevated";
  /** Additional class names on the outer pill container */
  className?: string;
}

const accentMap = {
  danger: "text-text-danger",
  warning: "text-text-warning",
  brand: "text-text-brand",
} as const;

const variantStyles = {
  default:
    "bg-white/70 backdrop-blur-sm border border-border-subtle shadow-sm",
  elevated:
    "bg-white/80 backdrop-blur-md border border-border-subtle shadow-lg",
} as const;

export function CuaBadge({
  accent = "danger",
  variant = "default",
  className,
}: CuaBadgeProps) {
  const accentClass = accentMap[accent];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 pl-1 pr-4 py-1.5 rounded-full",
        variantStyles[variant],
        className
      )}
    >
      {/* HFI logo mark */}
      <div className="w-[30px] h-[30px] rounded-full overflow-hidden shrink-0 ring-1 ring-black/[0.04]">
        <img
          src={hfiLogo}
          alt="HFI, Human Factors International"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Text block */}
      <div className="flex flex-col gap-0 leading-none">
        <span className="flex items-center gap-1">
          <span
            className="text-text-primary"
            style={{
              fontSize: "var(--typo-h8m-size)",
              lineHeight: "var(--typo-h8m-line-height)",
              fontWeight: "var(--typo-h8m-weight)",
              letterSpacing: "var(--typo-h8m-letter-spacing)",
            }}
          >
            Certified Usability Analyst
          </span>
          <span
            className={accentClass}
            style={{
              fontSize: "var(--typo-label-m-size)",
              lineHeight: "var(--typo-label-m-line-height)",
              fontWeight: "var(--typo-btn-semi-weight)",
            }}
          >
            CUA™
          </span>
          <BadgeCheck className={cn("w-3.5 h-3.5 shrink-0", accentClass)} />
        </span>
        <span
          className="text-text-quaternary mt-0.5"
          style={{
            fontSize: "var(--typo-pointer-size)",
            lineHeight: "var(--typo-pointer-line-height)",
            fontWeight: "var(--typo-pointer-weight)",
          }}
        >
          Human Factors International
        </span>
      </div>
    </div>
  );
}
