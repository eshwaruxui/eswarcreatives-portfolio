import type { MouseEvent, ReactNode } from "react";
import { t, tokens, motionTokens } from "../../portal/theme";

// Full port of the Figma "Buttons/EC-Button" component set
// (fileKey 0SGbENUggpj9Fe6NebJ9QM, node 4157:2752). Every value below was
// read directly off that component's variants via get_design_context, not
// guessed — see the per-block comments for which cells were sampled vs.
// extrapolated from a sibling variant.
export type ECButtonHierarchy =
  | "primary"
  | "secondary-color"
  | "secondary-gray"
  | "tertiary-color"
  | "tertiary-gray"
  | "link-color"
  | "link-gray"
  | "neutral-dark";

export type ECButtonSize = "sm" | "md" | "lg" | "xl";
export type ECButtonIconPosition = "leading" | "trailing" | "dot" | "only";

interface ECButtonProps {
  hierarchy: ECButtonHierarchy;
  size?: ECButtonSize;
  // Optional when icon="only" (icon-only buttons render no text).
  label?: string;
  // Omit entirely for Figma's Icon=False. When set, `iconElement` supplies
  // the actual glyph — this component only handles layout (size/gap/padding
  // per Icon=Leading/Trailing/Only), never draws icons itself. "dot" is the
  // one exception: Figma's Dot is a plain filled circle, not a custom glyph,
  // so it's rendered here as a `currentColor` circle instead of an <img>
  // pointed at a Figma-hosted asset URL that expires in ~7 days.
  icon?: ECButtonIconPosition;
  iconElement?: ReactNode;
  // Required when icon="only", since there's no visible label for a11y to read.
  ariaLabel?: string;
  href: string;
  target?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  disabled?: boolean;
  // For nav usages inside a `role="menu"` container (e.g. the mobile nav
  // dropdown), where each item needs `role="menuitem"` for correct a11y.
  role?: string;
  // Stretches to share the row equally with sibling buttons (flex: 1) instead
  // of hugging its own label — e.g. the hero's "See our work"/"Let's talk"
  // pair, which the hi-fi design shows as two equal 270px-wide buttons rather
  // than widths that vary with label length.
  fullWidth?: boolean;
}

// Size axis — re-sampled directly (Hierarchy=Primary, Icon=False,
// State=Default at each of sm/md/lg/xl) after Eswar's 1 Aug 2026 Round 2
// fix, which rebound md/lg/xl to real named text styles instead of
// orphaned one-off values. Figma text styles now: sm = One-line/Medium-M,
// md = One-line/Normal Semibold, lg/xl = Heading/Body Bold (same style —
// they differ only in padding). All confirmed present in
// text.styles.tokens.json. md's letter-spacing updated again in Round 3
// (-0.23px → -0.1px, per a further edit to One-line/Normal Semibold);
// sm and lg/xl unchanged in Round 3.
const SIZE_STYLES: Record<
  ECButtonSize,
  { paddingX: number; paddingY: number; fontSize: number; fontWeight: number; lineHeight: string; letterSpacing?: string }
> = {
  sm: { paddingX: 12, paddingY: 6, fontSize: 13, fontWeight: 500, lineHeight: "18px", letterSpacing: "-0.08px" },
  md: { paddingX: 16, paddingY: 10, fontSize: 15, fontWeight: 600, lineHeight: "20px", letterSpacing: "-0.1px" },
  lg: { paddingX: 18, paddingY: 10, fontSize: 17, fontWeight: 700, lineHeight: "22px", letterSpacing: "-0.43px" },
  xl: { paddingX: 20, paddingY: 12, fontSize: 17, fontWeight: 700, lineHeight: "22px", letterSpacing: "-0.43px" },
};

// Icon axis — sampled at Hierarchy=Primary, Size=md. Icon size (20px) and dot
// size (8px) are held constant across all four sizes since Figma was only
// sampled at md for icon layout; flagged here rather than invented per-size.
const ICON_GAP = 8;
const ICON_SIZE = 20;
const DOT_SIZE = 8;
// Leading reduces its near-side padding by half the icon gap (16px → 12px at
// md) so the icon+text block keeps the same optical footprint as text alone;
// Trailing and Dot keep full symmetric padding; Only collapses to a square
// (padding = paddingY on every side).
const LEADING_PADDING_INSET = ICON_GAP / 2;

interface HierarchyColors {
  // false = Link color/gray: zero padding/border/radius, plain inline text —
  // not a "transparent button", an actual unboxed link.
  hasBox: boolean;
  bg?: string;
  border?: string;
  text: string;
  hoverBg?: string;
  hoverBorder?: string;
  hoverText: string;
  // Full box-shadow value. Omitted where Figma has genuinely no focus ring
  // (confirmed directly for tertiary-color; extrapolated for its siblings —
  // see comments below).
  focusRing?: string;
  disabledBg?: string;
  disabledBorder?: string;
  disabledText: string;
}

// Literal values with no theme.ts equivalent — each is a direct Figma
// variable reference, kept literal (not invented) because reusing a
// near-duplicate existing token would silently drift from the design file.
const PRIMARY_HOVER_BG = "#005450"; // Figma brand/primary-hover
// Fixed in Eswar's 1 Aug 2026 Round 2 pass: Primary/Secondary-color/
// Neutral-Dark focus rings were previously two unlinked violet one-offs
// (#F4EBFF, #E5E1FE) that matched no token anywhere in the library — now
// unified to the real effect token "Shadows/xs focused 4px brand-100",
// bound to teal.100 (#ccf0ee), confirmed present in the Round 2
// effect.styles.tokens.json and on all three hierarchies' live instances.
// Round 3: ring spread tightened 4px → 3px (still teal.100).
const BRAND_FOCUS_RING = "0px 1px 2px 0px rgba(0,0,0,0.05), 0px 0px 0px 3px #ccf0ee"; // teal/100
const SECONDARY_COLOR_DISABLED_BG = "#fcfaff"; // Figma literal — very faint violet-white, no token match
// Confirmed against the design-tokens package (not just the live instance):
// border/overlay-bold resolves to neutral-alpha.400 = rgba(13,10,23,0.431),
// i.e. exactly this value — no theme.ts equivalent exists (closest,
// t.border.overlayExtraStrong, is a different base rgb *and* alpha:
// rgba(10,10,23,0.30)), but this literal is a verified token value, not a guess.
const SECONDARY_GRAY_BORDER = "rgba(13,10,23,0.43)";
const SECONDARY_GRAY_DISABLED_BORDER = "#e5e5e5"; // Figma literal, no token match
// Confirmed: background/overlay-normal resolves to neutral-alpha.80 =
// rgba(28,24,45,0.078) — different base rgb than theme.ts's
// t.background.overlayNormal (10,10,23), same alpha; this is the real,
// deliberate token value, not a stray one-off.
const TERTIARY_GRAY_HOVER_BG = "rgba(28,24,45,0.08)";

// Hierarchy axis — Default/Hover/Focused/Disabled sampled directly for every
// hierarchy at Size=md, Icon=False except:
// - tertiary-gray focus ring, link-color focus ring, link-gray focus ring:
//   extrapolated as "no ring" from tertiary-color, the one ghost/link
//   hierarchy actually sampled in a Focused state (its Focused instance has
//   no shadow at all).
// - link-gray hover: sampled directly and genuinely unchanged from Default
//   (#555 → #555) — not an omission, that's what the component does.
const HIERARCHY: Record<ECButtonHierarchy, HierarchyColors> = {
  primary: {
    hasBox: true,
    bg: tokens.accent,
    border: tokens.accent,
    text: t.text.onPrimary,
    hoverBg: PRIMARY_HOVER_BG,
    hoverBorder: PRIMARY_HOVER_BG,
    hoverText: t.text.onPrimary,
    focusRing: BRAND_FOCUS_RING,
    disabledBg: t.text.muted,
    disabledBorder: t.text.muted,
    disabledText: t.text.onPrimary,
  },
  "secondary-color": {
    hasBox: true,
    bg: tokens.tealLight,
    border: tokens.tealLight,
    text: tokens.accent,
    hoverBg: t.background.subtle,
    hoverBorder: t.background.subtle,
    hoverText: tokens.accent,
    focusRing: BRAND_FOCUS_RING,
    disabledBg: SECONDARY_COLOR_DISABLED_BG,
    disabledBorder: SECONDARY_COLOR_DISABLED_BG,
    disabledText: t.text.muted,
  },
  "secondary-gray": {
    hasBox: true,
    bg: t.background.surface,
    border: SECONDARY_GRAY_BORDER,
    text: t.text.secondary,
    hoverBg: t.background.subtle,
    hoverBorder: SECONDARY_GRAY_BORDER,
    hoverText: t.text.primary,
    focusRing: `0px 1px 2px 0px rgba(0,0,0,0.05), 0px 0px 0px 4px ${t.background.muted}`,
    disabledBg: t.background.surface,
    disabledBorder: SECONDARY_GRAY_DISABLED_BORDER,
    disabledText: t.text.muted,
  },
  "tertiary-color": {
    hasBox: true, // padded ghost button — has the box, just no default fill/border
    text: tokens.accent,
    hoverBg: tokens.tealLight,
    hoverText: tokens.accent,
    disabledText: t.text.muted,
  },
  "tertiary-gray": {
    hasBox: true,
    text: t.text.secondary,
    hoverBg: TERTIARY_GRAY_HOVER_BG,
    hoverText: t.text.primary,
    disabledText: t.text.muted,
  },
  "link-color": {
    hasBox: false, // zero padding/box — plain inline text link, confirmed (no px/py/bg/border classes at all on the Figma instance)
    text: tokens.accent,
    hoverText: PRIMARY_HOVER_BG,
    disabledText: t.text.muted,
  },
  "link-gray": {
    hasBox: false,
    text: t.text.secondary,
    hoverText: t.text.secondary,
    disabledText: t.text.muted,
  },
  "neutral-dark": {
    hasBox: true,
    bg: t.background.dark3,
    border: t.background.dark3,
    text: t.text.inverse,
    hoverBg: t.background.dark2,
    hoverBorder: t.background.dark2,
    hoverText: t.text.inverse,
    focusRing: BRAND_FOCUS_RING,
    disabledBg: t.text.muted,
    disabledBorder: t.text.muted,
    disabledText: t.text.inverse,
  },
};

// Color/border/hover/focus all live in generated CSS classes rather than the
// inline `style` object: React inline styles always beat stylesheet rules
// (including :hover/:focus-visible ones) regardless of specificity, so
// there's no way to express interactive states through `style` alone.
const STATE_CSS = (Object.keys(HIERARCHY) as ECButtonHierarchy[])
  .map((key) => {
    const h = HIERARCHY[key];
    const cls = `ec-btn-${key}`;
    return [
      `.${cls} { background: ${h.bg ?? "transparent"}; border-color: ${h.border ?? "transparent"}; color: ${h.text}; }`,
      `.${cls}:hover { background: ${h.hoverBg ?? h.bg ?? "transparent"}; border-color: ${h.hoverBorder ?? h.border ?? "transparent"}; color: ${h.hoverText}; }`,
      `.${cls}:focus-visible { outline: none;${h.focusRing ? ` box-shadow: ${h.focusRing};` : ""} }`,
    ].join("\n");
  })
  .join("\n");

export function ECButton({
  hierarchy,
  size = "md",
  label,
  icon,
  iconElement,
  ariaLabel,
  href,
  target,
  onClick,
  disabled = false,
  role,
  fullWidth = false,
}: ECButtonProps) {
  const h = HIERARCHY[hierarchy];
  const s = SIZE_STYLES[size];
  const isOnly = icon === "only";
  const hasIcon = icon != null;

  let padding: string;
  if (!h.hasBox) {
    padding = "0";
  } else if (isOnly) {
    padding = `${s.paddingY}px`;
  } else if (icon === "leading") {
    padding = `${s.paddingY}px ${s.paddingX}px ${s.paddingY}px ${Math.max(s.paddingX - LEADING_PADDING_INSET, 0)}px`;
  } else {
    padding = `${s.paddingY}px ${s.paddingX}px`;
  }

  // Disabled colors are set inline (which always wins over the CSS class)
  // rather than via a variant class, so hover/focus-visible can never
  // override them; `pointer-events: none` also means hover won't fire.
  const disabledColorStyle = disabled
    ? {
        background: h.hasBox ? h.disabledBg ?? "transparent" : undefined,
        borderColor: h.hasBox ? h.disabledBorder ?? "transparent" : undefined,
        color: h.disabledText,
      }
    : undefined;

  const iconSpan = iconElement ? (
    <span style={{ display: "inline-flex", width: ICON_SIZE, height: ICON_SIZE, flexShrink: 0 }}>{iconElement}</span>
  ) : null;

  return (
    <>
      <style>{STATE_CSS}</style>
      <a
        href={href}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        onClick={disabled ? undefined : onClick}
        role={role}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel}
        tabIndex={disabled ? -1 : undefined}
        className={disabled ? undefined : `ec-btn-${hierarchy}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: hasIcon && !isOnly ? ICON_GAP : undefined,
          flex: fullWidth ? "1 1 0" : undefined,
          padding,
          borderRadius: h.hasBox ? 8 : undefined,
          borderWidth: h.hasBox ? 1 : 0,
          borderStyle: h.hasBox ? "solid" : "none",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          fontSize: s.fontSize,
          lineHeight: s.lineHeight,
          letterSpacing: s.letterSpacing,
          fontWeight: s.fontWeight,
          textDecoration: "none",
          whiteSpace: "nowrap",
          cursor: disabled ? "not-allowed" : "pointer",
          pointerEvents: disabled ? "none" : undefined,
          transition: `background ${motionTokens.durationFast} ${motionTokens.easeDefault}, border-color ${motionTokens.durationFast} ${motionTokens.easeDefault}, color ${motionTokens.durationFast} ${motionTokens.easeDefault}`,
          ...disabledColorStyle,
        }}
      >
        {icon === "leading" && iconSpan}
        {icon === "dot" && (
          <span
            style={{
              display: "inline-block",
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: "50%",
              background: "currentColor",
              flexShrink: 0,
            }}
          />
        )}
        {!isOnly && label}
        {icon === "trailing" && iconSpan}
        {isOnly && iconSpan}
      </a>
    </>
  );
}
