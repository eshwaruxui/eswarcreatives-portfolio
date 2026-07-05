import * as React from "react";
import { cn } from "./utils";

/**
 * AccentBar — vertical 3px indicator used in Testimonials sidebar
 * and Principles accordion (7+ instances).
 *
 * States: active (gold) → hover (gold-200) → default (transparent)
 */
type AccentBarProps = {
  active?: boolean;
  className?: string;
};

function AccentBar({ active = false, className }: AccentBarProps) {
  return (
    <div
      data-slot="accent-bar"
      className={cn(
        "w-[3px] rounded-full transition-all duration-300",
        active
          ? "bg-gold-400 h-full"
          : "bg-transparent group-hover:bg-gold-200 h-full",
        className
      )}
    />
  );
}

export { AccentBar };
export type { AccentBarProps };
