import * as React from "react";
import { cn } from "./utils";

/**
 * ContactRow — key-value row with icon, used in FooterSection (4 instances).
 *
 * Layout: icon + label (left) ↔ value/link (right)
 * Separator: border-b on all except last
 * Surface: inverse (dark footer)
 */
type ContactRowProps = {
  icon: React.ReactNode;
  label: string;
  href: string;
  value: string;
  external?: boolean;
  isLink?: boolean;
  isLast?: boolean;
  className?: string;
};

function ContactRow({
  icon,
  label,
  href,
  value,
  external = false,
  isLink = false,
  isLast = false,
  className,
}: ContactRowProps) {
  return (
    <div
      data-slot="contact-row"
      className={cn(
        "flex items-center justify-between py-3",
        !isLast && "border-b border-white/[0.06]",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-icon-secondary [&_svg]:w-4 [&_svg]:h-4">{icon}</span>
        <span
          className="text-text-inverse-quaternary"
          style={{
            fontSize: "var(--typo-caption-r-size)",
            lineHeight: "var(--typo-caption-r-line-height)",
            fontWeight: "var(--typo-caption-r-weight)",
          }}
        >
          {label}
        </span>
      </div>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={cn(
          "transition-colors",
          isLink
            ? "text-text-link-inverse hover:text-text-inverse"
            : "text-text-inverse-secondary hover:text-text-inverse"
        )}
        style={{
          fontSize: "var(--typo-caption-m-size)",
          lineHeight: "var(--typo-caption-m-line-height)",
          fontWeight: "var(--typo-caption-m-weight)",
        }}
      >
        {value}
      </a>
    </div>
  );
}

export { ContactRow };
export type { ContactRowProps };