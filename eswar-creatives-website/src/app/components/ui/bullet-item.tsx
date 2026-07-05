import * as React from "react";
import { cn } from "./utils";

/**
 * BulletItem — dot-prefixed list row used in FlagshipCase
 * (Key decisions, Outcomes & metrics — 4 instances).
 *
 * Consistent dot size (5×5), alignment (mt-[9px]),
 * and text token (text-text-tertiary, 13px, line-height 1.6).
 */
function BulletItem({
  children,
  className,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="bullet-item"
      className={cn("flex gap-2.5 items-start", className)}
      {...props}
    >
      <span className="w-[5px] h-[5px] rounded-full bg-text-primary mt-[9px] shrink-0" />
      <span
        className="text-text-primary"
        style={{
          fontSize: "var(--typo-p-sm-med-size)",
          lineHeight: "var(--typo-p-sm-med-line-height)",
          fontWeight: "var(--typo-p-sm-med-weight)",
          letterSpacing: "var(--typo-p-sm-med-letter-spacing)",
        }}
      >
        {children}
      </span>
    </li>
  );
}

export { BulletItem };