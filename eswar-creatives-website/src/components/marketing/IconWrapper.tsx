import type { CSSProperties, ReactNode } from "react";

interface IconWrapperProps {
  children: ReactNode;
  size?: number;
  color?: string;
  style?: CSSProperties;
}

/**
 * Sizes and recolors an inline SVG icon (e.g. a lucide-react element) via
 * currentColor, so icons follow token changes instead of carrying their own
 * fixed fill/stroke. Never pass exported PNG/SVG asset files as children.
 */
export function IconWrapper({ children, size = 24, color, style }: IconWrapperProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        color,
        flexShrink: 0,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
