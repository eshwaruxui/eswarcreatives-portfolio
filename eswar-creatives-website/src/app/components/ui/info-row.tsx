import * as React from "react";
import { cn } from "./utils";

/**
 * InfoRow — icon + text row, used in FooterSection "About" column (3 instances).
 *
 * Supports both light (default) and inverse (dark footer) surfaces.
 */
type InfoRowProps = {
  icon: React.ReactNode;
  children: React.ReactNode;
  surface?: "light" | "inverse";
  className?: string;
};

function InfoRow({
  icon,
  children,
  surface = "inverse",
  className,
}: InfoRowProps) {
  return (
    <div
      data-slot="info-row"
      className={cn(
        "flex items-center gap-3",
        surface === "inverse" ? "text-text-inverse-tertiary" : "text-text-tertiary",
        className
      )}
      style={{
        fontSize: "var(--typo-p-sm-size)",
        lineHeight: "var(--typo-p-sm-line-height)",
        fontWeight: "var(--typo-p-sm-weight)",
      }}
    >
      <span
        className={cn(
          "[&_svg]:w-4 [&_svg]:h-4 shrink-0",
          "text-icon-secondary"
        )}
      >
        {icon}
      </span>
      {children}
    </div>
  );
}

export { InfoRow };
export type { InfoRowProps };