import { useState, useCallback } from "react";
import { Check, Circle, Copy, ArrowRight } from "lucide-react";
import { copyToClipboard } from "./clipboard";

/* ═══════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════ */

type Shade = { step: number; value: string };
type Palette = {
  name: string;
  description: string;
  pillLabel: string;
  prefix: string;
  dotColor: string;
  isAlpha?: boolean;
  shades: Shade[];
};

type SemanticToken = {
  name: string;
  value: string;
  primitiveRef: string;
  description: string;
  category: string;
  isAlpha?: boolean;
};

/* ═══════════════════════════════════════════════════════════════════════
   PRIMITIVE PALETTE DATA
   ═══════════════════════════════��═���═════════════════════════════════════ */

const PALETTES: Palette[] = [
  {
    name: "Neutral",
    description: "Light",
    pillLabel: "Neutral (Light)",
    prefix: "N",
    dotColor: "#7c807e",
    shades: [
      { step: 50, value: "#f9fafa" },
      { step: 100, value: "#f7f7f7" },
      { step: 200, value: "#f3f4f4" },
      { step: 300, value: "#ecedec" },
      { step: 400, value: "#e3e5e4" },
      { step: 500, value: "#d9dbda" },
      { step: 600, value: "#cacccb" },
      { step: 700, value: "#aeb1af" },
      { step: 800, value: "#949896" },
      { step: 900, value: "#7c807e" },
      { step: 950, value: "#6f7371" },
      { step: 1000, value: "#585c5a" },
      { step: 1100, value: "#4b4f4e" },
      { step: 1200, value: "#414543" },
      { step: 1300, value: "#353837" },
      { step: 1400, value: "#282b29" },
      { step: 1500, value: "#202221" },
      { step: 1600, value: "#181a19" },
      { step: 1700, value: "#0f1211" },
      { step: 1800, value: "#070908" },
    ],
  },
  {
    name: "Alpha Neutral",
    description: "Dark (Opacity)",
    pillLabel: "Neutral (Light, Alpha)",
    prefix: "NA",
    dotColor: "#949896",
    isAlpha: true,
    shades: [
      { step: 50, value: "rgba(7,9,8,0.02)" },
      { step: 100, value: "rgba(7,9,8,0.03)" },
      { step: 200, value: "rgba(7,9,8,0.04)" },
      { step: 300, value: "rgba(7,9,8,0.07)" },
      { step: 400, value: "rgba(7,9,8,0.10)" },
      { step: 500, value: "rgba(7,9,8,0.14)" },
      { step: 600, value: "rgba(7,9,8,0.20)" },
      { step: 700, value: "rgba(7,9,8,0.30)" },
      { step: 800, value: "rgba(7,9,8,0.41)" },
      { step: 900, value: "rgba(7,9,8,0.50)" },
      { step: 950, value: "rgba(7,9,8,0.55)" },
      { step: 1000, value: "rgba(7,9,8,0.65)" },
      { step: 1100, value: "rgba(7,9,8,0.70)" },
      { step: 1200, value: "rgba(7,9,8,0.74)" },
      { step: 1300, value: "rgba(7,9,8,0.78)" },
      { step: 1400, value: "rgba(7,9,8,0.83)" },
      { step: 1500, value: "rgba(7,9,8,0.87)" },
      { step: 1600, value: "rgba(7,9,8,0.90)" },
      { step: 1700, value: "rgba(7,9,8,0.93)" },
      { step: 1800, value: "rgba(7,9,8,0.97)" },
    ],
  },
  {
    name: "Primary",
    description: "Teal",
    pillLabel: "Primary Teal",
    prefix: "P",
    dotColor: "#007872",
    shades: [
      { step: 50, value: "#f1fdfb" },
      { step: 100, value: "#dffcf7" },
      { step: 200, value: "#ccfaf4" },
      { step: 300, value: "#b4f7ee" },
      { step: 400, value: "#98f3e8" },
      { step: 500, value: "#78eee1" },
      { step: 600, value: "#53e6d9" },
      { step: 700, value: "#2bd9cd" },
      { step: 800, value: "#00ccc1" },
      { step: 900, value: "#00beb4" },
      { step: 950, value: "#00ada6" },
      { step: 1000, value: "#009a95" },
      { step: 1100, value: "#008986" },
      { step: 1200, value: "#007872" },
      { step: 1300, value: "#026c6b" },
      { step: 1400, value: "#085f5f" },
      { step: 1500, value: "#0e5656" },
      { step: 1600, value: "#114d4d" },
      { step: 1700, value: "#0b3e3f" },
      { step: 1800, value: "#052e2f" },
    ],
  },
  {
    name: "Success",
    description: "Green",
    pillLabel: "Success Green",
    prefix: "Su",
    dotColor: "#0fba73",
    shades: [
      { step: 50, value: "#effcf5" },
      { step: 100, value: "#e3fbed" },
      { step: 200, value: "#d6f9e5" },
      { step: 300, value: "#c3f6da" },
      { step: 400, value: "#aef2ce" },
      { step: 500, value: "#91edbe" },
      { step: 600, value: "#71e6ad" },
      { step: 700, value: "#4edc99" },
      { step: 800, value: "#2cd088" },
      { step: 900, value: "#18c47b" },
      { step: 950, value: "#0fba73" },
      { step: 1000, value: "#00a364" },
      { step: 1100, value: "#00915a" },
      { step: 1200, value: "#058051" },
      { step: 1300, value: "#0b714a" },
      { step: 1400, value: "#0f6442" },
      { step: 1500, value: "#115a3d" },
      { step: 1600, value: "#125038" },
      { step: 1700, value: "#0c3e2b" },
      { step: 1800, value: "#062c1f" },
    ],
  },
  {
    name: "Alert",
    description: "Yellow",
    pillLabel: "Alert Yellow",
    prefix: "Al",
    dotColor: "#f0b100",
    shades: [
      { step: 50, value: "#fefce8" },
      { step: 100, value: "#fefad4" },
      { step: 200, value: "#fef9bf" },
      { step: 300, value: "#fef4a0" },
      { step: 400, value: "#ffee7e" },
      { step: 500, value: "#ffe653" },
      { step: 600, value: "#ffdc02" },
      { step: 700, value: "#fecf00" },
      { step: 800, value: "#fbc300" },
      { step: 900, value: "#f0b100" },
      { step: 950, value: "#e8a500" },
      { step: 1000, value: "#d88f00" },
      { step: 1100, value: "#c37a00" },
      { step: 1200, value: "#ad6500" },
      { step: 1300, value: "#9b5700" },
      { step: 1400, value: "#8c4d00" },
      { step: 1500, value: "#804500" },
      { step: 1600, value: "#743e0a" },
      { step: 1700, value: "#5c2f08" },
      { step: 1800, value: "#432004" },
    ],
  },
  {
    name: "Warning",
    description: "Orange",
    pillLabel: "Warning Orange",
    prefix: "W",
    dotColor: "#ff6900",
    shades: [
      { step: 50, value: "#fff7ed" },
      { step: 100, value: "#fff2e0" },
      { step: 200, value: "#ffecd1" },
      { step: 300, value: "#ffe0ba" },
      { step: 400, value: "#ffd3a0" },
      { step: 500, value: "#ffc380" },
      { step: 600, value: "#ffb15c" },
      { step: 700, value: "#ff982f" },
      { step: 800, value: "#ff8200" },
      { step: 900, value: "#ff6900" },
      { step: 950, value: "#ff5f00" },
      { step: 1000, value: "#fa4e00" },
      { step: 1100, value: "#e94100" },
      { step: 1200, value: "#d23600" },
      { step: 1300, value: "#bb3000" },
      { step: 1400, value: "#a52c00" },
      { step: 1500, value: "#922b02" },
      { step: 1600, value: "#812909" },
      { step: 1700, value: "#621e08" },
      { step: 1800, value: "#441205" },
    ],
  },
  {
    name: "Danger",
    description: "Red",
    pillLabel: "Danger Red",
    prefix: "D",
    dotColor: "#fb2c36",
    shades: [
      { step: 50, value: "#fef2f2" },
      { step: 100, value: "#ffe9e9" },
      { step: 200, value: "#ffe0e0" },
      { step: 300, value: "#ffd3d3" },
      { step: 400, value: "#ffc5c5" },
      { step: 500, value: "#ffb0b0" },
      { step: 600, value: "#ff9899" },
      { step: 700, value: "#ff7879" },
      { step: 800, value: "#ff585c" },
      { step: 900, value: "#fe3b43" },
      { step: 950, value: "#fb2c36" },
      { step: 1000, value: "#ed0013" },
      { step: 1100, value: "#dd0002" },
      { step: 1200, value: "#c80002" },
      { step: 1300, value: "#b60008" },
      { step: 1400, value: "#a3000e" },
      { step: 1500, value: "#940c14" },
      { step: 1600, value: "#841518" },
      { step: 1700, value: "#660e10" },
      { step: 1800, value: "#470708" },
    ],
  },
  {
    name: "System-Blue",
    description: "Vivid Blue",
    pillLabel: "System Blue",
    prefix: "SB",
    dotColor: "#2b7fff",
    shades: [
      { step: 50, value: "#eff6ff" },
      { step: 100, value: "#e4f0ff" },
      { step: 200, value: "#d9e9fe" },
      { step: 300, value: "#cae1ff" },
      { step: 400, value: "#b9d9ff" },
      { step: 500, value: "#a0cdff" },
      { step: 600, value: "#84c0ff" },
      { step: 700, value: "#64aeff" },
      { step: 800, value: "#489bff" },
      { step: 900, value: "#3489ff" },
      { step: 950, value: "#2b7fff" },
      { step: 1000, value: "#1865fe" },
      { step: 1100, value: "#1556f5" },
      { step: 1200, value: "#144be9" },
      { step: 1300, value: "#1743d5" },
      { step: 1400, value: "#193dbd" },
      { step: 1500, value: "#1a3ba6" },
      { step: 1600, value: "#1c3990" },
      { step: 1700, value: "#1a2f73" },
      { step: 1800, value: "#162556" },
    ],
  },
  {
    name: "Spl-Rose",
    description: "Warm Rose",
    pillLabel: "Special Rose",
    prefix: "R",
    dotColor: "#ff2056",
    shades: [
      { step: 50, value: "#fff1f2" },
      { step: 100, value: "#ffeaeb" },
      { step: 200, value: "#ffe2e5" },
      { step: 300, value: "#ffd6da" },
      { step: 400, value: "#ffc7ce" },
      { step: 500, value: "#ffb0bb" },
      { step: 600, value: "#ff97a5" },
      { step: 700, value: "#ff778d" },
      { step: 800, value: "#ff5675" },
      { step: 900, value: "#ff3460" },
      { step: 950, value: "#ff2056" },
      { step: 1000, value: "#f30043" },
      { step: 1100, value: "#e2003b" },
      { step: 1200, value: "#ce0036" },
      { step: 1300, value: "#bc0035" },
      { step: 1400, value: "#aa0035" },
      { step: 1500, value: "#9b0036" },
      { step: 1600, value: "#8d0135" },
      { step: 1700, value: "#6e0127" },
      { step: 1800, value: "#4e0118" },
    ],
  },
  {
    name: "Spl-Violet",
    description: "Violet",
    pillLabel: "Special Violet",
    prefix: "V",
    dotColor: "#8e51ff",
    shades: [
      { step: 50, value: "#f5f3ff" },
      { step: 100, value: "#f1eeff" },
      { step: 200, value: "#ece8fe" },
      { step: 300, value: "#e4deff" },
      { step: 400, value: "#dad2ff" },
      { step: 500, value: "#cdc0ff" },
      { step: 600, value: "#bfacff" },
      { step: 700, value: "#b093ff" },
      { step: 800, value: "#a17aff" },
      { step: 900, value: "#945fff" },
      { step: 950, value: "#8e51ff" },
      { step: 1000, value: "#832dff" },
      { step: 1100, value: "#7b18f8" },
      { step: 1200, value: "#7308ec" },
      { step: 1300, value: "#6906da" },
      { step: 1400, value: "#5f0ac5" },
      { step: 1500, value: "#5711b1" },
      { step: 1600, value: "#4e159d" },
      { step: 1700, value: "#3e1182" },
      { step: 1800, value: "#2f0c68" },
    ],
  },
  {
    name: "Spl-Cyan",
    description: "Cyan",
    pillLabel: "Special Cyan",
    prefix: "SC",
    dotColor: "#00aed2",
    shades: [
      { step: 50, value: "#ecfeff" },
      { step: 100, value: "#ddfcfe" },
      { step: 200, value: "#ccfafe" },
      { step: 300, value: "#b6f6fd" },
      { step: 400, value: "#9cf3fd" },
      { step: 500, value: "#76eefd" },
      { step: 600, value: "#45e6fb" },
      { step: 700, value: "#00daf6" },
      { step: 800, value: "#00cdee" },
      { step: 900, value: "#00b8db" },
      { step: 950, value: "#00aed2" },
      { step: 1000, value: "#009ac0" },
      { step: 1100, value: "#0089ad" },
      { step: 1200, value: "#007a9a" },
      { step: 1300, value: "#006d8a" },
      { step: 1400, value: "#00617b" },
      { step: 1500, value: "#085870" },
      { step: 1600, value: "#104f65" },
      { step: 1700, value: "#0b4155" },
      { step: 1800, value: "#053345" },
    ],
  },
];

/* ═══════��═══════════════════════════════════════════════════════════════
   SEMANTIC TOKEN DEFINITIONS — Industry-standard mapping to primitives
   ═══════════════════════════════════════════════════════════════════════ */

const SEMANTIC_TOKENS: SemanticToken[] = [
  /* ──────────────── SURFACE (18) ──────────────── */
  { category: "surface", name: "surface/page",             value: "#f9fafa",            primitiveRef: "N50",    description: "App-level page background" },
  { category: "surface", name: "surface/default",          value: "#ffffff",            primitiveRef: "White",  description: "Default card & container bg" },
  { category: "surface", name: "surface/subtle",           value: "#f7f7f7",            primitiveRef: "N100",   description: "Subtle secondary background" },
  { category: "surface", name: "surface/muted",            value: "#f3f4f4",            primitiveRef: "N200",   description: "De-emphasized sections & wells" },
  { category: "surface", name: "surface/raised",           value: "#ffffff",            primitiveRef: "White",  description: "Elevated surfaces — modals, popovers" },
  { category: "surface", name: "surface/sunken",           value: "#ecedec",            primitiveRef: "N300",   description: "Recessed areas — code blocks, inputs" },
  { category: "surface", name: "surface/overlay",          value: "rgba(7,9,8,0.41)",   primitiveRef: "NA800",  description: "Scrim / overlay backdrop", isAlpha: true },
  { category: "surface", name: "surface/inverse",          value: "#0f1211",            primitiveRef: "N1700",  description: "Inverted surface — tooltips, toasts" },
  { category: "surface", name: "surface/brand/default",    value: "#f1fdfb",            primitiveRef: "P50",    description: "Brand-tinted subtle background" },
  { category: "surface", name: "surface/brand/bold",       value: "#00ccc1",            primitiveRef: "P800",   description: "Bold brand surface — banners, badges" },
  { category: "surface", name: "surface/success/default",  value: "#effcf5",            primitiveRef: "Su50",   description: "Success feedback background" },
  { category: "surface", name: "surface/success/bold",     value: "#2cd088",            primitiveRef: "Su800",  description: "Bold success — filled badges" },
  { category: "surface", name: "surface/warning/default",  value: "#fff7ed",            primitiveRef: "W50",    description: "Warning feedback background" },
  { category: "surface", name: "surface/warning/bold",     value: "#ff8200",            primitiveRef: "W800",   description: "Bold warning — filled badges" },
  { category: "surface", name: "surface/danger/default",   value: "#fef2f2",            primitiveRef: "D50",    description: "Danger/error feedback background" },
  { category: "surface", name: "surface/danger/bold",      value: "#ff585c",            primitiveRef: "D800",   description: "Bold danger — error badges" },
  { category: "surface", name: "surface/info/default",     value: "#eff6ff",            primitiveRef: "SB50",   description: "Informational feedback background" },
  { category: "surface", name: "surface/info/bold",        value: "#489bff",            primitiveRef: "SB800",  description: "Bold info — info badges" },

  /* ──────────────── BORDER (15) ──────────────── */
  { category: "border", name: "border/default",    value: "#e3e5e4",           primitiveRef: "N400",   description: "Default container & card border" },
  { category: "border", name: "border/subtle",     value: "#ecedec",           primitiveRef: "N300",   description: "Subtle dividers & separators" },
  { category: "border", name: "border/muted",      value: "#f3f4f4",           primitiveRef: "N200",   description: "Barely-visible structural lines" },
  { category: "border", name: "border/bold",       value: "#aeb1af",           primitiveRef: "N700",   description: "Strong emphasis border" },
  { category: "border", name: "border/inverse",    value: "#202221",           primitiveRef: "N1500",  description: "Border on light backgrounds" },
  { category: "border", name: "border/brand",      value: "#00ccc1",           primitiveRef: "P800",   description: "Brand-accent border" },
  { category: "border", name: "border/focus",      value: "#2b7fff",           primitiveRef: "SB950",  description: "Focus ring — keyboard navigation" },
  { category: "border", name: "border/success",    value: "#2cd088",           primitiveRef: "Su800",  description: "Success state border" },
  { category: "border", name: "border/warning",    value: "#ff8200",           primitiveRef: "W800",   description: "Warning state border" },
  { category: "border", name: "border/danger",     value: "#fb2c36",           primitiveRef: "D950",   description: "Danger/error state border" },
  { category: "border", name: "border/disabled",   value: "#ecedec",           primitiveRef: "N300",   description: "Disabled element border" },
  { category: "border", name: "border/input",      value: "#d9dbda",           primitiveRef: "N500",   description: "Default form input border" },
  { category: "border", name: "border/light-alpha",   value: "rgba(0, 0, 0, 0.06)",  primitiveRef: "NA300~",  description: "Subtle card edges & section dividers", isAlpha: true },
  { category: "border", name: "border/medium-alpha",  value: "rgba(0, 0, 0, 0.12)",  primitiveRef: "NA400~",  description: "Standard card borders & input boundaries", isAlpha: true },
  { category: "border", name: "border/deep-alpha",    value: "rgba(0, 0, 0, 0.22)",  primitiveRef: "NA600~",  description: "Strong separators & high-contrast dividers", isAlpha: true },

  /* ──────────────── TEXT (16) ──────────────── */
  { category: "text", name: "text/primary",         value: "#181a19",  primitiveRef: "N1600",  description: "Headings, high-emphasis body" },
  { category: "text", name: "text/secondary",       value: "#4b4f4e",  primitiveRef: "N1100",  description: "Body copy, descriptions" },
  { category: "text", name: "text/tertiary",        value: "#6f7371",  primitiveRef: "N950",   description: "Captions, helper text — AA 4.84:1" },
  { category: "text", name: "text/quaternary",      value: "#727674",  primitiveRef: "N950–900", description: "De-emphasized metadata — AA 4.61:1" },
  { category: "text", name: "text/placeholder",     value: "#cacccb",  primitiveRef: "N600",   description: "Placeholder & ghost text" },
  { category: "text", name: "text/disabled",        value: "#d9dbda",  primitiveRef: "N500",   description: "Disabled text — fails AA" },
  { category: "text", name: "text/disabled-alpha",  value: "rgba(0, 0, 0, 0.15)", primitiveRef: "NA400~", description: "Alpha-based disabled text — transparent overlay", isAlpha: true },
  { category: "text", name: "text/inverse",         value: "#ffffff",  primitiveRef: "White",  description: "Text on dark / inverse surfaces" },
  { category: "text", name: "text/on-bold",         value: "#ffffff",  primitiveRef: "White",  description: "Text on bold-color surfaces" },
  { category: "text", name: "text/brand",           value: "#007872",  primitiveRef: "P1200",  description: "Brand-colored text — AA compliant" },
  { category: "text", name: "text/link/default",    value: "#2563eb",  primitiveRef: "SB1050", description: "Hyperlink default — AA 5.19:1" },
  { category: "text", name: "text/link/hover",      value: "#1556f5",  primitiveRef: "SB1100", description: "Hyperlink hover color" },
  { category: "text", name: "text/link/visited",    value: "#7c3aed",  primitiveRef: "V1050",  description: "Visited link — AA 5.72:1" },
  { category: "text", name: "text/success",         value: "#058051",  primitiveRef: "Su1200", description: "Success message text — AA" },
  { category: "text", name: "text/warning",         value: "#d23600",  primitiveRef: "W1200",  description: "Warning message text — AA" },
  { category: "text", name: "text/danger",          value: "#ed0013",  primitiveRef: "D1000",  description: "Error / destructive text" },
  { category: "text", name: "text/info",            value: "#144be9",  primitiveRef: "SB1200", description: "Informational message text — AA" },
  /* ──────────────── TEXT · ACCENT (4) ──────────────── */
  { category: "text", name: "text/accent-violet",   value: "#6d28d9",  primitiveRef: "V1200",  description: "Accent text — Strategy · violet — AA 8.36:1" },
  { category: "text", name: "text/accent-sky",      value: "#0369a1",  primitiveRef: "SK1200", description: "Accent text — Systems · sky — AA 5.52:1" },
  { category: "text", name: "text/accent-emerald",  value: "#047857",  primitiveRef: "E1200",  description: "Accent text — Validation · emerald — AA 5.14:1" },
  { category: "text", name: "text/accent-amber",    value: "#b45309",  primitiveRef: "A1200",  description: "Accent text — Collaboration · amber — AA 4.56:1" },

  /* ──────────────── ICON (10) ──────────────── */
  { category: "icon", name: "icon/primary",    value: "#353837",  primitiveRef: "N1300",  description: "Default high-emphasis icon" },
  { category: "icon", name: "icon/secondary",  value: "#7c807e",  primitiveRef: "N900",   description: "Secondary / supporting icon" },
  { category: "icon", name: "icon/tertiary",   value: "#aeb1af",  primitiveRef: "N700",   description: "De-emphasized icon" },
  { category: "icon", name: "icon/disabled",   value: "#d9dbda",  primitiveRef: "N500",   description: "Disabled / inactive icon" },
  { category: "icon", name: "icon/inverse",    value: "#ffffff",  primitiveRef: "White",  description: "Icon on dark surfaces" },
  { category: "icon", name: "icon/brand",      value: "#00beb4",  primitiveRef: "P900",   description: "Brand-accent icon" },
  { category: "icon", name: "icon/success",    value: "#0fba73",  primitiveRef: "Su950",  description: "Success state icon" },
  { category: "icon", name: "icon/warning",    value: "#ff6900",  primitiveRef: "W900",   description: "Warning state icon" },
  { category: "icon", name: "icon/danger",     value: "#fb2c36",  primitiveRef: "D950",   description: "Danger / error icon" },
  { category: "icon", name: "icon/info",       value: "#2b7fff",  primitiveRef: "SB950",  description: "Informational icon" },

  /* ──────────────── STATE (14) ──────────────── */
  { category: "state", name: "state/hover",              value: "rgba(7,9,8,0.04)",  primitiveRef: "NA200",  description: "Hover overlay on neutral surfaces", isAlpha: true },
  { category: "state", name: "state/pressed",            value: "rgba(7,9,8,0.07)",  primitiveRef: "NA300",  description: "Active / pressed overlay", isAlpha: true },
  { category: "state", name: "state/focus/ring",         value: "#2b7fff",           primitiveRef: "SB950",  description: "Focus ring — 2px offset, keyboard nav" },
  { category: "state", name: "state/selected/subtle",    value: "#dffcf7",           primitiveRef: "P100",   description: "Selected row / item background" },
  { category: "state", name: "state/selected/bold",      value: "#00ccc1",           primitiveRef: "P800",   description: "Selected indicator — active tab, radio" },
  { category: "state", name: "state/disabled/surface",   value: "#f3f4f4",           primitiveRef: "N200",   description: "Disabled element background" },
  { category: "state", name: "state/disabled/content",   value: "#d9dbda",           primitiveRef: "N500",   description: "Disabled text & icon fill" },
  { category: "state", name: "state/disabled/border",    value: "#ecedec",           primitiveRef: "N300",   description: "Disabled element border" },
  { category: "state", name: "state/success/subtle",     value: "#e3fbed",           primitiveRef: "Su100",  description: "Success highlight background" },
  { category: "state", name: "state/success/bold",       value: "#0fba73",           primitiveRef: "Su950",  description: "Success indicator fill" },
  { category: "state", name: "state/warning/subtle",     value: "#fefad4",           primitiveRef: "Al100",  description: "Warning highlight background" },
  { category: "state", name: "state/warning/bold",       value: "#ff6900",           primitiveRef: "W900",   description: "Warning indicator fill" },
  { category: "state", name: "state/danger/subtle",      value: "#ffe9e9",           primitiveRef: "D100",   description: "Danger highlight background" },
  { category: "state", name: "state/danger/bold",        value: "#fb2c36",           primitiveRef: "D950",   description: "Danger indicator fill" },

  /* ──────────────── INTERACTIVE (12) ──────────────── */
  { category: "interactive", name: "interactive/primary/default",       value: "#00ccc1",  primitiveRef: "P800",   description: "Primary CTA — buttons, anchors" },
  { category: "interactive", name: "interactive/primary/hover",         value: "#00beb4",  primitiveRef: "P900",   description: "Primary CTA hover" },
  { category: "interactive", name: "interactive/primary/active",        value: "#009a95",  primitiveRef: "P1000",  description: "Primary CTA pressed" },
  { category: "interactive", name: "interactive/primary/disabled",      value: "#98f3e8",  primitiveRef: "P400",   description: "Primary CTA disabled" },
  { category: "interactive", name: "interactive/secondary/default",     value: "#202221",  primitiveRef: "N1500",  description: "Secondary CTA — outline / ghost" },
  { category: "interactive", name: "interactive/secondary/hover",       value: "#181a19",  primitiveRef: "N1600",  description: "Secondary CTA hover" },
  { category: "interactive", name: "interactive/secondary/active",      value: "#0f1211",  primitiveRef: "N1700",  description: "Secondary CTA pressed" },
  { category: "interactive", name: "interactive/destructive/default",   value: "#fb2c36",  primitiveRef: "D950",   description: "Destructive CTA — delete, remove" },
  { category: "interactive", name: "interactive/destructive/hover",     value: "#ed0013",  primitiveRef: "D1000",  description: "Destructive CTA hover" },
  { category: "interactive", name: "interactive/destructive/active",    value: "#dd0002",  primitiveRef: "D1100",  description: "Destructive CTA pressed" },
  { category: "interactive", name: "interactive/link/default",          value: "#2563eb",  primitiveRef: "SB1050", description: "Inline link default — AA 5.19:1" },
  { category: "interactive", name: "interactive/link/hover",            value: "#1556f5",  primitiveRef: "SB1100", description: "Inline link hover" },
];

/* ═══════��═══════════════════════════════════════════════════════════════
   SIDEBAR CONFIG
   ═══════════════════════════════��═══════════════════════════════════════ */

const totalColorTokens = PALETTES.reduce((s, p) => s + p.shades.length, 0);

type SidebarPrimItem = {
  label: string;
  count: number;
  icon: "corner" | "size" | "color";
  id: string;
};

const PRIMITIVES_ITEMS: SidebarPrimItem[] = [
  { label: "Corner Radius", count: 16, icon: "corner", id: "prim-corner" },
  { label: "Size", count: 29, icon: "size", id: "prim-size" },
  { label: "Colors", count: totalColorTokens, icon: "color", id: "prim-colors" },
];

type SemanticSidebarItem = {
  label: string;
  count: number;
  color: string;
  id: string;
};

const SEMANTIC_SIDEBAR: SemanticSidebarItem[] = [
  { label: "All categories", count: SEMANTIC_TOKENS.length, color: "", id: "sem-all" },
  { label: "Surface", count: SEMANTIC_TOKENS.filter((t) => t.category === "surface").length, color: "#2b7fff", id: "sem-surface" },
  { label: "Border", count: SEMANTIC_TOKENS.filter((t) => t.category === "border").length, color: "#00ada6", id: "sem-border" },
  { label: "Text", count: SEMANTIC_TOKENS.filter((t) => t.category === "text").length, color: "#7c807e", id: "sem-text" },
  { label: "Icon", count: SEMANTIC_TOKENS.filter((t) => t.category === "icon").length, color: "#8e51ff", id: "sem-icon" },
  { label: "State", count: SEMANTIC_TOKENS.filter((t) => t.category === "state").length, color: "#ff6900", id: "sem-state" },
  { label: "Interactive", count: SEMANTIC_TOKENS.filter((t) => t.category === "interactive").length, color: "#0fba73", id: "sem-interactive" },
];

const CATEGORY_META: Record<string, { label: string; description: string; color: string }> = {
  surface:     { label: "Surface",     description: "Backgrounds for containers, cards, pages, overlays, and feedback areas",     color: "#2b7fff" },
  border:      { label: "Border",      description: "Strokes for dividers, inputs, cards, focus rings, and state feedback",       color: "#00ada6" },
  text:        { label: "Text",        description: "Typography colors for headings, body, captions, links, and status messages", color: "#7c807e" },
  icon:        { label: "Icon",        description: "Iconography fills for default, semantic, and interactive contexts",          color: "#8e51ff" },
  state:       { label: "State",       description: "Hover, pressed, focus, selected, and disabled state overlays and fills",     color: "#ff6900" },
  interactive: { label: "Interactive", description: "CTAs, buttons, links — default, hover, active, and disabled variants",       color: "#0fba73" },
};

/* ══════════════════════════════���════════════════════════════════════════
   SIZE PRIMITIVE TOKENS — 8px base-grid, 29 steps
   ═══════════════════════════════════════════════════════════════════════ */

type SizeToken = {
  name: string;
  step: string;
  px: number;
  rem: string;
  description: string;
  gridMultiple: string;
  usage: string;
};

const SIZE_TOKENS: SizeToken[] = [
  { name: "size/0",    step: "0",    px: 0,   rem: "0",      description: "Zero — reset / collapse",         gridMultiple: "0×",     usage: "Reset margin, padding" },
  { name: "size/0.5",  step: "0.5",  px: 2,   rem: "0.125",  description: "Hairline — fine borders & gaps",  gridMultiple: "0.25×",  usage: "Divider thickness, fine gaps" },
  { name: "size/1",    step: "1",    px: 4,   rem: "0.25",   description: "Micro — tightest spacing",        gridMultiple: "0.5×",   usage: "Inline icon gap, badge padding" },
  { name: "size/1.5",  step: "1.5",  px: 6,   rem: "0.375",  description: "Petite — compact inner space",    gridMultiple: "0.75×",  usage: "Tag padding, tight inner gaps" },
  { name: "size/2",    step: "2",    px: 8,   rem: "0.5",    description: "Base unit — 8px grid anchor",     gridMultiple: "1×",     usage: "Icon-text gap, small padding" },
  { name: "size/2.5",  step: "2.5",  px: 10,  rem: "0.625",  description: "Compact ��� between base & sm",     gridMultiple: "1.25×",  usage: "Chip padding, compact insets" },
  { name: "size/3",    step: "3",    px: 12,  rem: "0.75",   description: "Small — standard inner gap",      gridMultiple: "1.5×",   usage: "Input padding-y, small card gap" },
  { name: "size/3.5",  step: "3.5",  px: 14,  rem: "0.875",  description: "Snug — between sm & md",          gridMultiple: "1.75×",  usage: "Dense list item padding" },
  { name: "size/4",    step: "4",    px: 16,  rem: "1",      description: "Medium — primary spacing unit",   gridMultiple: "2×",     usage: "Card padding, section gap" },
  { name: "size/5",    step: "5",    px: 20,  rem: "1.25",   description: "Comfortable — relaxed inner",     gridMultiple: "2.5×",   usage: "Input padding-x, modal gap" },
  { name: "size/6",    step: "6",    px: 24,  rem: "1.5",    description: "Large — prominent spacing",       gridMultiple: "3×",     usage: "Card gap, group spacing" },
  { name: "size/7",    step: "7",    px: 28,  rem: "1.75",   description: "Between large & x-large",         gridMultiple: "3.5×",   usage: "Panel padding, wide insets" },
  { name: "size/8",    step: "8",    px: 32,  rem: "2",      description: "X-Large — section-level gap",     gridMultiple: "4×",     usage: "Section gap, modal padding" },
  { name: "size/9",    step: "9",    px: 36,  rem: "2.25",   description: "Between xl & 2xl",                gridMultiple: "4.5×",   usage: "Avatar large, component height" },
  { name: "size/10",   step: "10",   px: 40,  rem: "2.5",    description: "2X-Large — component height",     gridMultiple: "5×",     usage: "Button height, input height" },
  { name: "size/12",   step: "12",   px: 48,  rem: "3",      description: "3X-Large — tall components",      gridMultiple: "6×",     usage: "Large button, toolbar height" },
  { name: "size/14",   step: "14",   px: 56,  rem: "3.5",    description: "Between 3xl & 4xl",               gridMultiple: "7×",     usage: "Navbar height, card header" },
  { name: "size/16",   step: "16",   px: 64,  rem: "4",      description: "4X-Large — layout landmark",      gridMultiple: "8×",     usage: "Sidebar icon area, avatar xl" },
  { name: "size/18",   step: "18",   px: 72,  rem: "4.5",    description: "Between 4xl & 5xl",               gridMultiple: "9×",     usage: "Feature icon container" },
  { name: "size/20",   step: "20",   px: 80,  rem: "5",      description: "5X-Large — section padding",      gridMultiple: "10×",    usage: "Section padding-y, hero gap" },
  { name: "size/24",   step: "24",   px: 96,  rem: "6",      description: "6X-Large — major spacing",        gridMultiple: "12×",    usage: "Section padding desktop" },
  { name: "size/28",   step: "28",   px: 112, rem: "7",      description: "Between 6xl & 7xl",               gridMultiple: "14×",    usage: "Feature section spacing" },
  { name: "size/30",   step: "30",   px: 120, rem: "7.5",    description: "7X-Large �� hero-level",           gridMultiple: "15×",    usage: "Hero padding, page header" },
  { name: "size/32",   step: "32",   px: 128, rem: "8",      description: "Between 7xl & 8xl",               gridMultiple: "16×",    usage: "Large illustration area" },
  { name: "size/36",   step: "36",   px: 144, rem: "9",      description: "8X-Large — layout region",        gridMultiple: "18×",    usage: "Sidebar width sm, card image" },
  { name: "size/40",   step: "40",   px: 160, rem: "10",     description: "9X-Large — max spacing",          gridMultiple: "20×",    usage: "Section padding max, hero vpad" },
  { name: "size/48",   step: "48",   px: 192, rem: "12",     description: "10X-Large — layout container",    gridMultiple: "24×",    usage: "Sidebar width md, modal min-w" },
  { name: "size/56",   step: "56",   px: 224, rem: "14",     description: "11X-Large — wide layout",         gridMultiple: "28×",    usage: "Sidebar width lg, drawer" },
  { name: "size/64",   step: "64",   px: 256, rem: "16",     description: "12X-Large — max container",       gridMultiple: "32×",    usage: "Sidebar width xl, panel max-w" },
];

const MAX_SIZE_PX = SIZE_TOKENS[SIZE_TOKENS.length - 1].px;

/* ══════════════════════════════════════════��════════════════════════════
   CORNER RADIUS PRIMITIVE TOKENS — 16 steps
   ═══════════════════════════════════════════════════════════════════════ */

type CornerToken = {
  name: string;
  step: string;
  value: string;
  px: number | null;
  description: string;
  usage: string;
  tier: "sharp" | "subtle" | "default" | "rounded" | "pill" | "circle";
};

const CORNER_TOKENS: CornerToken[] = [
  { name: "corner/none",   step: "none",   value: "0px",    px: 0,    description: "Sharp — no rounding",                   usage: "Dividers, table cells, hard edges",       tier: "sharp" },
  { name: "corner/1",      step: "1",      value: "1px",    px: 1,    description: "Hairline — barely perceptible",          usage: "Inline code, micro badges, dense UI",     tier: "subtle" },
  { name: "corner/2",      step: "2",      value: "2px",    px: 2,    description: "Extra-small — tight rounding",           usage: "Tags, status dots, small indicators",     tier: "subtle" },
  { name: "corner/3",      step: "3",      value: "3px",    px: 3,    description: "Small-tight — compact components",       usage: "Chips, dense buttons, compact inputs",    tier: "subtle" },
  { name: "corner/4",      step: "4",      value: "4px",    px: 4,    description: "Small — standard component radius",      usage: "Buttons sm, inputs sm, tooltips",         tier: "default" },
  { name: "corner/5",      step: "5",      value: "5px",    px: 5,    description: "Small-medium — transitional",            usage: "Snackbars, select menus, small cards",    tier: "default" },
  { name: "corner/6",      step: "6",      value: "6px",    px: 6,    description: "Medium — default component radius",      usage: "Buttons, inputs, dropdowns, alerts",      tier: "default" },
  { name: "corner/8",      step: "8",      value: "8px",    px: 8,    description: "Large — prominent component radius",     usage: "Cards, popovers, menus, dropdowns",       tier: "rounded" },
  { name: "corner/10",     step: "10",     value: "10px",   px: 10,   description: "Extra-large tight — between lg & xl",    usage: "Large cards, image containers",           tier: "rounded" },
  { name: "corner/12",     step: "12",     value: "12px",   px: 12,   description: "Extra-large — overlay components",       usage: "Modals, dialogs, sheets, toasts",         tier: "rounded" },
  { name: "corner/16",     step: "16",     value: "16px",   px: 16,   description: "2X-Large — hero elements",              usage: "Hero cards, feature panels, callouts",    tier: "rounded" },
  { name: "corner/20",     step: "20",     value: "20px",   px: 20,   description: "3X-Large — showcase containers",        usage: "Feature cards, onboarding panels",        tier: "rounded" },
  { name: "corner/24",     step: "24",     value: "24px",   px: 24,   description: "4X-Large — decorative rounding",        usage: "Marketing cards, spotlight containers",   tier: "rounded" },
  { name: "corner/32",     step: "32",     value: "32px",   px: 32,   description: "5X-Large — prominent floating UI",      usage: "Floating toolbars, feature highlights",   tier: "rounded" },
  { name: "corner/pill",   step: "pill",   value: "9999px", px: 9999, description: "Pill — fully rounded on short axis",    usage: "Pill buttons, tags, search bars, badges", tier: "pill" },
  { name: "corner/circle", step: "circle", value: "50%",    px: null, description: "Circle — perfect round (square aspect)", usage: "Avatars, FABs, status indicators, dots",  tier: "circle" },
];

const MAX_CORNER_PX = 32;

const CORNER_TIER_META: Record<string, { label: string; color: string }> = {
  sharp:   { label: "Sharp",   color: "#6b7280" },
  subtle:  { label: "Subtle",  color: "#a78bfa" },
  default: { label: "Default", color: "#2b7fff" },
  rounded: { label: "Rounded", color: "#00ada6" },
  pill:    { label: "Pill",    color: "#f59e0b" },
  circle:  { label: "Circle",  color: "#f472b6" },
};

/* ═══════════════════════════════════════════════════════════════════════
   SHARED HELPERS
   ═══════════════════════════════════════════════════════════════════════ */

const CHECKERBOARD_BG =
  "repeating-conic-gradient(#d4d4d4 0% 25%, #ffffff 0% 50%) 0 0 / 8px 8px";

function hexToLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getEffectiveLuminance(value: string): number {
  if (value.startsWith("#")) return hexToLuminance(value);
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]*)\)/);
  if (!match) return 1;
  const r = parseInt(match[1]) / 255;
  const g = parseInt(match[2]) / 255;
  const b = parseInt(match[3]) / 255;
  const a = match[4] ? parseFloat(match[4]) : 1;
  return 0.2126 * (r * a + 1 - a) + 0.7152 * (g * a + 1 - a) + 0.0722 * (b * a + 1 - a);
}

/* copyToClipboard imported from ./clipboard */

/* ═══════════════════════════════════════════════════════════════════════
   SIDEBAR ICONS
   ═══════════════════════════════════════════════════════════════════════ */

function SidebarIcon({ type }: { type: string }) {
  if (type === "corner")
    return (
      <div className="w-4 h-4 flex items-center justify-center">
        <div className="w-3 h-3 border-2 border-gray-400 rounded-sm" />
      </div>
    );
  if (type === "size")
    return (
      <div className="w-4 h-4 flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7h10M2 7l2-2M2 7l2 2M12 7l-2-2M12 7l-2 2" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  if (type === "color")
    return (
      <div className="w-4 h-4 flex items-center justify-center">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="5.5" stroke="#3b82f6" strokeWidth="1.5" />
          <circle cx="7" cy="7" r="2" fill="#3b82f6" />
        </svg>
      </div>
    );
  return <Circle className="w-4 h-4 text-gray-400" />;
}

/* ═══════════════════════════════════════════════════════════════════════
   COLOR SWATCH COMPONENT
   ═══════════════════════════════════════��═══════════════════════════════ */

function ColorSwatch({
  value,
  size = 32,
  isAlpha,
  copied,
}: {
  value: string;
  size?: number;
  isAlpha?: boolean;
  copied?: boolean;
}) {
  const isLight = getEffectiveLuminance(value) > 0.55;
  return (
    <div
      className="rounded-md border border-black/[0.08] relative overflow-hidden shrink-0"
      style={
        isAlpha
          ? { background: CHECKERBOARD_BG, width: size, height: size }
          : { backgroundColor: value, width: size, height: size }
      }
    >
      {isAlpha && (
        <div className="absolute inset-0" style={{ backgroundColor: value }} />
      )}
      {copied && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10 rounded-md">
          <Check className={`w-3 h-3 ${isLight ? "text-gray-800" : "text-white"}`} />
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PRIMITIVE TOKEN TABLE ROW
   ═══════════════════════════════════════════════════════════════════════ */

function PrimitiveTokenRow({
  index,
  shade,
  prefix,
  isAlpha,
  copied,
  onCopy,
}: {
  index: number;
  shade: Shade;
  prefix: string;
  isAlpha?: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <tr
      className="group border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer"
      onClick={onCopy}
    >
      <td className="py-3 pl-4 pr-2 text-gray-300 tabular-nums" style={{ fontSize: "var(--typo-h8m-size)", lineHeight: "var(--typo-h8m-line-height)", fontWeight: "var(--typo-h8m-weight)" }}>
        {String(index + 1).padStart(2, "0")}
      </td>
      <td className="py-3 px-2">
        <div className="w-5 h-5 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="#d1d5db" strokeWidth="1.2" />
            <circle cx="8" cy="8" r="2.5" fill="#d1d5db" />
          </svg>
        </div>
      </td>
      <td className="py-3 px-3">
        <button
          className="text-gray-800 hover:text-teal-700 hover:underline decoration-teal-300 underline-offset-2 transition-colors cursor-copy"
          style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-btn-semi-weight)" }}
          onClick={(e) => { e.stopPropagation(); copyToClipboard(`${prefix}${shade.step}`, `${prefix}${shade.step}`); }}
          title={`Copy name: ${prefix}${shade.step}`}
        >
          {prefix}{shade.step}
        </button>
      </td>
      <td className="py-3 px-3">
        <div className="flex items-center justify-center">
          <ColorSwatch value={shade.value} isAlpha={isAlpha} copied={copied} />
        </div>
      </td>
      <td className="py-3 pl-3 pr-4">
        <div className="flex items-center gap-2">
          <code className="text-gray-500 tabular-nums" style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-caption-m-weight)" }}>
            {shade.value}
          </code>
          <Copy className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SEMANTIC TOKEN TABLE ROW
   ═══════════════════════════════════════════════════════════════════════ */

function SemanticTokenRow({
  index,
  token,
  copied,
  onCopy,
  categoryColor,
}: {
  index: number;
  token: SemanticToken;
  copied: boolean;
  onCopy: () => void;
  categoryColor: string;
}) {
  return (
    <tr
      className="group border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer"
      onClick={onCopy}
    >
      {/* # */}
      <td className="py-3.5 pl-4 pr-2 text-gray-300 tabular-nums" style={{ fontSize: "var(--typo-h8m-size)", lineHeight: "var(--typo-h8m-line-height)", fontWeight: "var(--typo-h8m-weight)" }}>
        {String(index + 1).padStart(2, "0")}
      </td>
      {/* TYPE dot */}
      <td className="py-3.5 px-2">
        <div className="w-5 h-5 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: categoryColor }} />
        </div>
      </td>
      {/* NAME */}
      <td className="py-3.5 px-3">
        <div className="flex flex-col">
          <button
            className="text-gray-800 hover:text-teal-700 hover:underline decoration-teal-300 underline-offset-2 transition-colors cursor-copy text-left w-fit"
            style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-btn-semi-weight)" }}
            onClick={(e) => { e.stopPropagation(); copyToClipboard(token.name, token.name); }}
            title={`Copy name: ${token.name}`}
          >
            {token.name}
          </button>
          <span className="text-gray-400 mt-0.5" style={{ fontSize: "var(--typo-label-r-size)", lineHeight: "var(--typo-label-r-line-height)", fontWeight: "var(--typo-label-r-weight)" }}>
            {token.description}
          </span>
        </div>
      </td>
      {/* SWATCH */}
      <td className="py-3.5 px-3">
        <div className="flex items-center justify-center">
          <ColorSwatch value={token.value} isAlpha={token.isAlpha} copied={copied} />
        </div>
      </td>
      {/* VALUE */}
      <td className="py-3.5 px-3">
        <code className="text-gray-500 tabular-nums" style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-caption-m-weight)" }}>
          {token.value}
        </code>
      </td>
      {/* REFERENCE */}
      <td className="py-3.5 pl-3 pr-4">
        <div className="flex items-center gap-1.5">
          <ArrowRight className="w-3 h-3 text-gray-300" />
          <span
            className="text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md tabular-nums"
            style={{ fontSize: "var(--typo-h8m-size)", lineHeight: "var(--typo-h8m-line-height)", fontWeight: "var(--typo-btn-semi-weight)" }}
          >
            {token.primitiveRef}
          </span>
          <Copy className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SIZE TOKEN TABLE ROW
   ═══════════════════════════════════════════════════════════════════════ */

function SizeTokenRow({
  index,
  token,
  copied,
  onCopy,
}: {
  index: number;
  token: SizeToken;
  copied: boolean;
  onCopy: () => void;
}) {
  const barWidth = token.px === 0 ? 1 : Math.max(2, (token.px / MAX_SIZE_PX) * 100);
  const isGridAligned = token.px % 8 === 0;
  const isBaseUnit = token.px === 8;

  return (
    <tr
      className={`group border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer ${
        isBaseUnit ? "bg-teal-50/30" : ""
      }`}
      onClick={onCopy}
    >
      {/* # */}
      <td className="py-3.5 pl-4 pr-2 text-gray-300 tabular-nums" style={{ fontSize: "var(--typo-h8m-size)", lineHeight: "var(--typo-h8m-line-height)", fontWeight: "var(--typo-h8m-weight)" }}>
        {String(index + 1).padStart(2, "0")}
      </td>
      {/* TYPE icon */}
      <td className="py-3.5 px-2">
        <div className="w-5 h-5 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 8h12M2 8l2-2M2 8l2 2M14 8l-2-2M14 8l-2 2" stroke={isGridAligned ? "#00ada6" : "#d1d5db"} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </td>
      {/* NAME */}
      <td className="py-3.5 px-3" style={{ minWidth: 160 }}>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <button
              className="text-gray-800 hover:text-teal-700 hover:underline decoration-teal-300 underline-offset-2 transition-colors cursor-copy"
              style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-btn-semi-weight)" }}
              onClick={(e) => { e.stopPropagation(); copyToClipboard(token.name, token.name); }}
              title={`Copy name: ${token.name}`}
            >
              {token.name}
            </button>
            {isBaseUnit && (
              <span
                className="text-[9px] tracking-[0.06em] uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 border border-teal-200"
                style={{ fontWeight: 700 }}
              >
                Base
              </span>
            )}
            {isGridAligned && !isBaseUnit && token.px > 0 && (
              <span
                className="text-[9px] tracking-[0.04em] px-1.5 py-0.5 rounded bg-gray-50 text-gray-400 border border-gray-100"
                style={{ fontWeight: 600 }}
              >
                {token.gridMultiple}
              </span>
            )}
          </div>
          <span className="text-gray-400 mt-0.5" style={{ fontSize: "var(--typo-label-r-size)", lineHeight: "var(--typo-label-r-line-height)", fontWeight: "var(--typo-label-r-weight)" }}>
            {token.description}
          </span>
        </div>
      </td>
      {/* VISUAL BAR */}
      <td className="py-3.5 px-3" style={{ minWidth: 200 }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-[28px] flex items-center">
            <div
              className="h-[20px] rounded-sm transition-all duration-300 relative"
              style={{
                width: `${barWidth}%`,
                minWidth: token.px === 0 ? 1 : 2,
                backgroundColor: isBaseUnit ? "#00ada6" : isGridAligned && token.px > 0 ? "#a5f3eb" : "#e3e5e4",
                border: isBaseUnit ? "1px solid #009a95" : isGridAligned && token.px > 0 ? "1px solid #53e6d9" : "1px solid #d9dbda",
              }}
            >
              {/* 8px grid tick marks inside large bars */}
              {token.px >= 32 && (
                <div className="absolute inset-0 flex items-stretch overflow-hidden rounded-sm">
                  {Array.from({ length: Math.floor(token.px / 8) }).map((_, i) => (
                    <div
                      key={i}
                      className="border-r border-black/[0.06]"
                      style={{ width: `${(8 / token.px) * 100}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </td>
      {/* PX */}
      <td className="py-3.5 px-3 text-right" style={{ width: 80 }}>
        <code
          className={`tabular-nums ${isBaseUnit ? "text-teal-700" : "text-gray-600"}`}
          style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-btn-semi-weight)" }}
        >
          {token.px}
          <span className="text-gray-400" style={{ fontWeight: "var(--typo-caption-r-weight)" }}>px</span>
        </code>
      </td>
      {/* REM */}
      <td className="py-3.5 px-3 text-right" style={{ width: 80 }}>
        <code className="text-gray-400 tabular-nums" style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-caption-m-weight)" }}>
          {token.rem}
        </code>
      </td>
      {/* USAGE */}
      <td className="py-3.5 pl-3 pr-4" style={{ minWidth: 180 }}>
        <div className="flex items-center gap-2">
          <span className="text-gray-400" style={{ fontSize: "var(--typo-h8-size)", lineHeight: "var(--typo-h8-line-height)", fontWeight: "var(--typo-h8-weight)" }}>
            {token.usage}
          </span>
          {copied && (
            <span className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)" }}>
              Copied!
            </span>
          )}
          <Copy className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
        </div>
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CORNER RADIUS TOKEN TABLE ROW
   ═══════════════════════════════════════════════════════════════════════ */

function CornerTokenRow({
  index,
  token,
  copied,
  onCopy,
}: {
  index: number;
  token: CornerToken;
  copied: boolean;
  onCopy: () => void;
}) {
  const tierMeta = CORNER_TIER_META[token.tier];
  const isDefault = token.step === "6";
  const isPill = token.tier === "pill";
  const isCircle = token.tier === "circle";
  const previewRadius = isPill ? "9999px" : isCircle ? "50%" : `${token.px}px`;

  /* Visual bar width — cap at MAX_CORNER_PX for numeric tokens, special for pill/circle */
  const barPct = isPill || isCircle
    ? 100
    : token.px === 0
      ? 0.5
      : Math.max(2, ((token.px ?? 0) / MAX_CORNER_PX) * 100);

  return (
    <tr
      className={`group border-b border-gray-50 hover:bg-gray-50/60 transition-colors cursor-pointer ${
        isDefault ? "bg-blue-50/30" : ""
      }`}
      onClick={onCopy}
    >
      {/* # */}
      <td className="py-3.5 pl-4 pr-2 text-gray-300 tabular-nums" style={{ fontSize: "var(--typo-h8m-size)", lineHeight: "var(--typo-h8m-line-height)", fontWeight: "var(--typo-h8m-weight)" }}>
        {String(index + 1).padStart(2, "0")}
      </td>
      {/* TIER dot */}
      <td className="py-3.5 px-2">
        <div className="flex items-center justify-center">
          <div className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: tierMeta.color, opacity: 0.75 }} />
        </div>
      </td>
      {/* NAME */}
      <td className="py-3.5 px-3" style={{ minWidth: 170 }}>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <button
              className="text-gray-800 hover:text-teal-700 hover:underline decoration-teal-300 underline-offset-2 transition-colors cursor-copy"
              style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-btn-semi-weight)" }}
              onClick={(e) => { e.stopPropagation(); copyToClipboard(token.name, token.name); }}
              title={`Copy name: ${token.name}`}
            >
              {token.name}
            </button>
            {isDefault && (
              <span
                className="text-[9px] tracking-[0.06em] uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200"
                style={{ fontWeight: 700 }}
              >
                Default
              </span>
            )}
            <span
              className="text-[9px] tracking-[0.04em] px-1.5 py-0.5 rounded border"
              style={{
                fontWeight: 600,
                backgroundColor: `${tierMeta.color}10`,
                borderColor: `${tierMeta.color}30`,
                color: tierMeta.color,
              }}
            >
              {tierMeta.label}
            </span>
          </div>
          <span className="text-gray-400 mt-0.5" style={{ fontSize: "var(--typo-label-r-size)", lineHeight: "var(--typo-label-r-line-height)", fontWeight: "var(--typo-label-r-weight)" }}>
            {token.description}
          </span>
        </div>
      </td>
      {/* VISUAL PREVIEW — shape with applied border-radius */}
      <td className="py-3.5 px-3" style={{ minWidth: 220 }}>
        <div className="flex items-center gap-3">
          {/* Shape preview box */}
          <div
            className="shrink-0 border-2 transition-all duration-300"
            style={{
              width: isCircle ? 36 : isPill ? 64 : 36,
              height: 36,
              borderRadius: previewRadius,
              borderColor: tierMeta.color,
              backgroundColor: `${tierMeta.color}12`,
            }}
          />
          {/* Visual bar showing relative magnitude */}
          <div className="flex-1 h-[6px] bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${barPct}%`,
                backgroundColor: tierMeta.color,
                opacity: isPill || isCircle ? 0.5 : 0.7,
              }}
            />
          </div>
        </div>
      </td>
      {/* VALUE */}
      <td className="py-3.5 px-3 text-right" style={{ width: 90 }}>
        <code
          className={`tabular-nums ${isDefault ? "text-blue-700" : "text-gray-600"}`}
          style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-btn-semi-weight)" }}
        >
          {token.value}
        </code>
      </td>
      {/* USAGE */}
      <td className="py-3.5 pl-3 pr-4" style={{ minWidth: 200 }}>
        <div className="flex items-center gap-2">
          <span className="text-gray-400" style={{ fontSize: "var(--typo-h8-size)", lineHeight: "var(--typo-h8-line-height)", fontWeight: "var(--typo-h8-weight)" }}>
            {token.usage}
          </span>
          {copied && (
            <span className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)" }}>
              Copied!
            </span>
          )}
          <Copy className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
        </div>
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════���═════════════════════���═════════════════════════════════ */

export function TokenLibraryColors() {
  const [activeSidebar, setActiveSidebar] = useState("prim-colors");
  const [activePaletteIdx, setActivePaletteIdx] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isPrimitivesView = activeSidebar.startsWith("prim-");
  const isSemanticView = activeSidebar.startsWith("sem-");

  const activePalette = PALETTES[activePaletteIdx];

  /* Determine which semantic category to show */
  const semanticCategoryId = activeSidebar.replace("sem-", "");
  const filteredSemanticTokens =
    semanticCategoryId === "all"
      ? SEMANTIC_TOKENS
      : SEMANTIC_TOKENS.filter((t) => t.category === semanticCategoryId);
  const activeCategoryMeta =
    semanticCategoryId !== "all" ? CATEGORY_META[semanticCategoryId] : null;

  const handleCopy = useCallback((value: string, key: string) => {
    copyToClipboard(value, value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  }, []);

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-0">
      {/* ═════ LEFT SIDEBAR ═════ */}
      <aside className="w-full md:w-[248px] shrink-0 border-r border-gray-100 bg-white overflow-y-auto">
        <div className="py-5 px-4">
          {/* ── PRIMITIVES ── */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="1" width="5" height="5" rx="1" fill="#9ca3af" />
                <rect x="8" y="1" width="5" height="5" rx="1" fill="#9ca3af" />
                <rect x="1" y="8" width="5" height="5" rx="1" fill="#9ca3af" />
                <rect x="8" y="8" width="5" height="5" rx="1" fill="#9ca3af" />
              </svg>
              <span
                className="text-gray-400 uppercase"
                style={{
                  fontSize: "var(--typo-h9-size)",
                  lineHeight: "var(--typo-h9-line-height)",
                  fontWeight: "var(--typo-h9-weight)",
                  letterSpacing: "var(--typo-h9-letter-spacing)",
                }}
              >
                Primitives
              </span>
            </div>
            <div className="space-y-0.5">
              {PRIMITIVES_ITEMS.map((item) => {
                const isActive = item.id === activeSidebar;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSidebar(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-150 ${
                      isActive
                        ? "bg-blue-50/70 text-blue-700 border-l-[3px] border-blue-600 pl-2.5"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-800 border-l-[3px] border-transparent pl-2.5"
                    }`}
                    style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: isActive ? "var(--typo-btn-semi-weight)" : 450 }}
                  >
                    <SidebarIcon type={item.icon} />
                    <span className="flex-1 text-left">{item.label}</span>
                    <span
                      className={`tabular-nums px-1.5 py-0.5 rounded ${
                        isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"
                      }`}
                      style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)" }}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── SEMANTIC ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1l1.5 3 3.5.5-2.5 2.5.5 3.5L7 9l-3 1.5.5-3.5L2 4.5l3.5-.5L7 1z"
                  stroke="#9ca3af"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              <span
                className="text-gray-400 uppercase"
                style={{
                  fontSize: "var(--typo-h9-size)",
                  lineHeight: "var(--typo-h9-line-height)",
                  fontWeight: "var(--typo-h9-weight)",
                  letterSpacing: "var(--typo-h9-letter-spacing)",
                }}
              >
                Semantic
              </span>
            </div>
            <div className="space-y-0.5">
              {SEMANTIC_SIDEBAR.map((item) => {
                const isActive = item.id === activeSidebar;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSidebar(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-150 ${
                      isActive
                        ? "bg-blue-50/70 text-blue-700 border-l-[3px] border-blue-600 pl-2.5"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-800 border-l-[3px] border-transparent pl-2.5"
                    }`}
                    style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: isActive ? "var(--typo-btn-semi-weight)" : 450 }}
                  >
                    {item.color ? (
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="1" y="3" width="12" height="2" rx="1" fill={isActive ? "#3b82f6" : "#d1d5db"} />
                        <rect x="1" y="7" width="8" height="2" rx="1" fill={isActive ? "#3b82f6" : "#d1d5db"} />
                        <rect x="1" y="11" width="10" height="2" rx="1" fill={isActive ? "#3b82f6" : "#d1d5db"} />
                      </svg>
                    )}
                    <span className="flex-1 text-left">{item.label}</span>
                    <span
                      className={`tabular-nums px-1.5 py-0.5 rounded ${
                        isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"
                      }`}
                      style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)" }}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* ═════ MAIN CONTENT ═════ */}
      <main className="flex-1 overflow-y-auto bg-gray-50/30">
        {/* ─��──── PRIMITIVES VIEW ────── */}
        {isPrimitivesView && activeSidebar === "prim-colors" && (
          <>
            {/* Breadcrumb */}
            <div className="px-6 pt-5 pb-0">
              <div className="flex items-center gap-1.5 text-gray-400 mb-5" style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)" }}>
                <span style={{ fontWeight: "var(--typo-caption-m-weight)" }}>Token Library</span>
                <span className="text-gray-300">/</span>
                <span style={{ fontWeight: "var(--typo-caption-m-weight)" }}>Primitives</span>
                <span className="text-gray-300">/</span>
                <span className="text-gray-600" style={{ fontWeight: "var(--typo-btn-semi-weight)" }}>
                  Colors
                </span>
              </div>

              {/* Palette pills */}
              <div className="flex gap-2 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide">
                {PALETTES.map((palette, idx) => {
                  const isActive = idx === activePaletteIdx;
                  return (
                    <button
                      key={palette.name}
                      onClick={() => setActivePaletteIdx(idx)}
                      className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full border transition-all duration-200 ${
                        isActive
                          ? "bg-white border-gray-300 text-gray-800 shadow-sm"
                          : "bg-white/60 border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      }`}
                      style={{ fontSize: "var(--typo-h8m-size)", lineHeight: "var(--typo-h8m-line-height)", fontWeight: isActive ? "var(--typo-btn-semi-weight)" : 450 }}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: palette.dotColor }}
                      />
                      <span>{palette.pillLabel}</span>
                      <span
                        className={`tabular-nums ${isActive ? "text-gray-500" : "text-gray-400"}`}
                        style={{ fontSize: "var(--typo-label-m-size)", lineHeight: "var(--typo-label-m-line-height)", fontWeight: "var(--typo-label-m-weight)" }}
                      >
                        {palette.shades.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Palette detail header */}
            <div className="px-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-1.5">
                <h2 className="text-gray-900" style={{ fontSize: "var(--typo-h4-size)", lineHeight: "var(--typo-h4-line-height)", fontWeight: "var(--typo-h4-weight)", letterSpacing: "var(--typo-h4-letter-spacing)" }}>
                  {activePalette.pillLabel}
                </h2>
                <span
                  className="uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200"
                  style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}
                >
                  Color
                </span>
              </div>
              <p className="text-gray-400" style={{ fontSize: "var(--typo-caption-r-size)", lineHeight: "var(--typo-caption-r-line-height)", fontWeight: "var(--typo-caption-r-weight)" }}>
                Primitives &middot; {PALETTES.length} Colors &middot;{" "}
                {activePalette.shades.length} tokens &middot; Default mode
              </p>
            </div>

            {/* Primitive token table */}
            <div className="px-6 py-2">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 pl-4 pr-2 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", width: 48 }}>#</th>
                    <th className="py-3 px-2 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", width: 40 }}>Type</th>
                    <th className="py-3 px-3 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Name</th>
                    <th className="py-3 px-3 text-center text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", width: 80 }}>Swatch</th>
                    <th className="py-3 pl-3 pr-4 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Default</th>
                  </tr>
                </thead>
                <tbody>
                  {activePalette.shades.map((shade, i) => {
                    const key = `prim-${activePalette.name}-${shade.step}`;
                    return (
                      <PrimitiveTokenRow
                        key={key}
                        index={i}
                        shade={shade}
                        prefix={activePalette.prefix}
                        isAlpha={activePalette.isAlpha}
                        copied={copiedKey === key}
                        onCopy={() => handleCopy(shade.value, key)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ────── SEMANTIC VIEW ────── */}
        {isSemanticView && (
          <>
            {/* Breadcrumb */}
            <div className="px-6 pt-5 pb-0">
              <div className="flex items-center gap-1.5 text-gray-400 mb-5" style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)" }}>
                <span style={{ fontWeight: "var(--typo-caption-m-weight)" }}>Token Library</span>
                <span className="text-gray-300">/</span>
                <span style={{ fontWeight: "var(--typo-caption-m-weight)" }}>Semantic</span>
                <span className="text-gray-300">/</span>
                <span className="text-gray-600" style={{ fontWeight: "var(--typo-btn-semi-weight)" }}>
                  {activeCategoryMeta?.label ?? "All Categories"}
                </span>
              </div>

              {/* Category pills */}
              <div className="flex gap-2 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide">
                {SEMANTIC_SIDEBAR.map((item) => {
                  const isActive = item.id === activeSidebar;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveSidebar(item.id)}
                      className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full border transition-all duration-200 ${
                        isActive
                          ? "bg-white border-gray-300 text-gray-800 shadow-sm"
                          : "bg-white/60 border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      }`}
                      style={{ fontSize: "var(--typo-h8m-size)", lineHeight: "var(--typo-h8m-line-height)", fontWeight: isActive ? "var(--typo-btn-semi-weight)" : 450 }}
                    >
                      {item.color && (
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                      <span>{item.label}</span>
                      <span
                        className={`tabular-nums ${isActive ? "text-gray-500" : "text-gray-400"}`}
                        style={{ fontSize: "var(--typo-label-m-size)", lineHeight: "var(--typo-label-m-line-height)", fontWeight: "var(--typo-label-m-weight)" }}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Semantic detail header */}
            <div className="px-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-1.5">
                {activeCategoryMeta && (
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: activeCategoryMeta.color }}
                  />
                )}
                <h2 className="text-gray-900" style={{ fontSize: "var(--typo-h4-size)", lineHeight: "var(--typo-h4-line-height)", fontWeight: "var(--typo-h4-weight)", letterSpacing: "var(--typo-h4-letter-spacing)" }}>
                  {activeCategoryMeta?.label ?? "All Semantic Colors"}
                </h2>
                <span
                  className="uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200"
                  style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}
                >
                  Semantic
                </span>
              </div>
              <p className="text-gray-400" style={{ fontSize: "var(--typo-caption-r-size)", lineHeight: "var(--typo-caption-r-line-height)", fontWeight: "var(--typo-caption-r-weight)" }}>
                {activeCategoryMeta?.description ??
                  `All semantic color tokens across ${Object.keys(CATEGORY_META).length} categories`}
                {" "}&middot; {filteredSemanticTokens.length} tokens &middot; Linked to Primitives
              </p>
            </div>

            {/* Semantic token table */}
            <div className="px-6 py-2">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 pl-4 pr-2 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", width: 48 }}>#</th>
                    <th className="py-3 px-2 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", width: 40 }}>Type</th>
                    <th className="py-3 px-3 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Name</th>
                    <th className="py-3 px-3 text-center text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", width: 80 }}>Swatch</th>
                    <th className="py-3 px-3 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Value</th>
                    <th className="py-3 pl-3 pr-4 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSemanticTokens.map((token, i) => {
                    const key = `sem-${token.name}`;
                    const catMeta = CATEGORY_META[token.category];
                    return (
                      <SemanticTokenRow
                        key={key}
                        index={i}
                        token={token}
                        copied={copiedKey === key}
                        onCopy={() => handleCopy(token.value, key)}
                        categoryColor={catMeta?.color ?? "#9ca3af"}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ────── SIZE PRIMITIVES VIEW ────── */}
        {isPrimitivesView && activeSidebar === "prim-size" && (
          <>
            {/* Breadcrumb */}
            <div className="px-6 pt-5 pb-0">
              <div className="flex items-center gap-1.5 text-gray-400 mb-5" style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)" }}>
                <span style={{ fontWeight: "var(--typo-caption-m-weight)" }}>Token Library</span>
                <span className="text-gray-300">/</span>
                <span style={{ fontWeight: "var(--typo-caption-m-weight)" }}>Primitives</span>
                <span className="text-gray-300">/</span>
                <span className="text-gray-600" style={{ fontWeight: "var(--typo-btn-semi-weight)" }}>
                  Size
                </span>
              </div>

              {/* Scale category pills */}
              <div className="flex gap-2 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide">
                {[
                  { label: "All Sizes", count: SIZE_TOKENS.length, active: true },
                  { label: "Grid-aligned (8px)", count: SIZE_TOKENS.filter(t => t.px % 8 === 0 && t.px > 0).length, active: false },
                  { label: "Half-steps", count: SIZE_TOKENS.filter(t => t.px % 8 !== 0).length, active: false },
                  { label: "Component Heights", count: 6, active: false },
                  { label: "Layout Spacing", count: 8, active: false },
                ].map((pill) => (
                  <div
                    key={pill.label}
                    className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full border transition-all duration-200 ${
                      pill.active
                        ? "bg-white border-gray-300 text-gray-800 shadow-sm"
                        : "bg-white/60 border-gray-200 text-gray-500"
                    }`}
                    style={{ fontSize: "var(--typo-h8m-size)", lineHeight: "var(--typo-h8m-line-height)", fontWeight: pill.active ? "var(--typo-btn-semi-weight)" : 450 }}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${pill.active ? "bg-teal-500" : "bg-gray-300"}`} />
                    <span>{pill.label}</span>
                    <span className={`tabular-nums ${pill.active ? "text-gray-500" : "text-gray-400"}`} style={{ fontSize: "var(--typo-label-m-size)", lineHeight: "var(--typo-label-m-line-height)", fontWeight: "var(--typo-label-m-weight)" }}>
                      {pill.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Size detail header */}
            <div className="px-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-1.5">
                <h2 className="text-gray-900" style={{ fontSize: "var(--typo-h4-size)", lineHeight: "var(--typo-h4-line-height)", fontWeight: "var(--typo-h4-weight)", letterSpacing: "var(--typo-h4-letter-spacing)" }}>
                  Size Scale
                </h2>
                <span
                  className="uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200"
                  style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}
                >
                  Dimension
                </span>
                <span
                  className="uppercase px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200"
                  style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}
                >
                  8px Grid
                </span>
              </div>
              <p className="text-gray-400" style={{ fontSize: "var(--typo-caption-r-size)", lineHeight: "var(--typo-caption-r-line-height)", fontWeight: "var(--typo-caption-r-weight)" }}>
                Primitives &middot; {SIZE_TOKENS.length} tokens &middot; Base unit 8px &middot; Range 0–{SIZE_TOKENS[SIZE_TOKENS.length - 1].px}px &middot; Default mode
              </p>

              {/* Grid visualization mini bar */}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-gray-400 shrink-0" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-label-m-weight)" }}>Grid preview</span>
                <div className="flex-1 flex items-center gap-[1px] h-[8px] overflow-hidden rounded-sm">
                  {SIZE_TOKENS.filter(t => t.px > 0 && t.px <= 96).map((t) => (
                    <div
                      key={t.name}
                      className="h-full rounded-[1px] transition-all"
                      style={{
                        width: Math.max(2, t.px * 0.4),
                        backgroundColor: t.px % 8 === 0 ? "#00ada6" : "#d9dbda",
                        opacity: t.px === 8 ? 1 : 0.5 + (t.px / 96) * 0.5,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Size token table */}
            <div className="px-6 py-2 overflow-x-auto">
              <table className="w-full" style={{ minWidth: 840 }}>
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 pl-4 pr-2 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", width: 48 }}>#</th>
                    <th className="py-3 px-2 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", width: 40 }}>Type</th>
                    <th className="py-3 px-3 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", minWidth: 160 }}>Name</th>
                    <th className="py-3 px-3 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", minWidth: 200 }}>Visual</th>
                    <th className="py-3 px-3 text-right text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", width: 80 }}>PX</th>
                    <th className="py-3 px-3 text-right text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", width: 80 }}>REM</th>
                    <th className="py-3 pl-3 pr-4 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", minWidth: 180 }}>Usage</th>
                  </tr>
                </thead>
                <tbody>
                  {SIZE_TOKENS.map((token, i) => {
                    const key = `size-${token.step}`;
                    return (
                      <SizeTokenRow
                        key={key}
                        index={i}
                        token={token}
                        copied={copiedKey === key}
                        onCopy={() => handleCopy(`${token.px}px`, key)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 8px grid legend */}
            <div className="px-6 py-5 border-t border-gray-100 mt-2">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-teal-500 border border-teal-600" />
                  <span className="text-gray-500" style={{ fontSize: "var(--typo-label-m-size)", lineHeight: "var(--typo-label-m-line-height)", fontWeight: "var(--typo-label-m-weight)" }}>Base unit (8px)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-teal-100 border border-teal-300" />
                  <span className="text-gray-500" style={{ fontSize: "var(--typo-label-m-size)", lineHeight: "var(--typo-label-m-line-height)", fontWeight: "var(--typo-label-m-weight)" }}>Grid-aligned (n×8)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-gray-200 border border-gray-300" />
                  <span className="text-gray-500" style={{ fontSize: "var(--typo-label-m-size)", lineHeight: "var(--typo-label-m-line-height)", fontWeight: "var(--typo-label-m-weight)" }}>Half-step (off-grid)</span>
                </div>
                <div className="ml-auto text-gray-400" style={{ fontSize: "var(--typo-label-r-size)", lineHeight: "var(--typo-label-r-line-height)", fontWeight: "var(--typo-label-r-weight)" }}>
                  Click any row to copy px value
                </div>
              </div>
            </div>
          </>
        )}

        {/* ────── CORNER RADIUS PRIMITIVES VIEW ────── */}
        {isPrimitivesView && activeSidebar === "prim-corner" && (
          <>
            {/* Breadcrumb */}
            <div className="px-6 pt-5 pb-0">
              <div className="flex items-center gap-1.5 text-gray-400 mb-5" style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)" }}>
                <span style={{ fontWeight: "var(--typo-caption-m-weight)" }}>Token Library</span>
                <span className="text-gray-300">/</span>
                <span style={{ fontWeight: "var(--typo-caption-m-weight)" }}>Primitives</span>
                <span className="text-gray-300">/</span>
                <span className="text-gray-600" style={{ fontWeight: "var(--typo-btn-semi-weight)" }}>Corner Radius</span>
              </div>

              {/* Tier filter pills */}
              <div className="flex gap-2 overflow-x-auto pb-4 -mx-1 px-1 scrollbar-hide">
                {[
                  { label: "All Radii", count: CORNER_TOKENS.length, active: true, color: "#374151" },
                  ...Object.entries(CORNER_TIER_META).map(([key, meta]) => ({
                    label: meta.label,
                    count: CORNER_TOKENS.filter(t => t.tier === key).length,
                    active: false,
                    color: meta.color,
                  })),
                ].map((pill) => (
                  <div
                    key={pill.label}
                    className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full border transition-all duration-200 ${
                      pill.active
                        ? "bg-white border-gray-300 text-gray-800 shadow-sm"
                        : "bg-white/60 border-gray-200 text-gray-500"
                    }`}
                    style={{ fontSize: "var(--typo-h8m-size)", lineHeight: "var(--typo-h8m-line-height)", fontWeight: pill.active ? "var(--typo-btn-semi-weight)" : 450 }}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pill.color }} />
                    <span>{pill.label}</span>
                    <span className={`tabular-nums ${pill.active ? "text-gray-500" : "text-gray-400"}`} style={{ fontSize: "var(--typo-label-m-size)", lineHeight: "var(--typo-label-m-line-height)", fontWeight: "var(--typo-label-m-weight)" }}>
                      {pill.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Header */}
            <div className="px-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3 mb-1.5">
                <h2 className="text-gray-900" style={{ fontSize: "var(--typo-h4-size)", lineHeight: "var(--typo-h4-line-height)", fontWeight: "var(--typo-h4-weight)", letterSpacing: "var(--typo-h4-letter-spacing)" }}>
                  Corner Radius Scale
                </h2>
                <span
                  className="uppercase px-2 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200"
                  style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}
                >
                  Shape
                </span>
                <span
                  className="uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200"
                  style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}
                >
                  6px Default
                </span>
              </div>
              <p className="text-gray-400" style={{ fontSize: "var(--typo-caption-r-size)", lineHeight: "var(--typo-caption-r-line-height)", fontWeight: "var(--typo-caption-r-weight)" }}>
                Primitives &middot; {CORNER_TOKENS.length} tokens &middot; 6 tiers &middot; Range 0px–50% &middot; Default mode
              </p>

              {/* Shape ramp visualization */}
              <div className="mt-4 flex items-center gap-2">
                <span className="text-gray-400 shrink-0" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-label-m-weight)" }}>Shape ramp</span>
                <div className="flex-1 flex items-center gap-[6px]">
                  {CORNER_TOKENS.map((t) => {
                    const r = t.tier === "pill" ? "9999px" : t.tier === "circle" ? "50%" : `${t.px}px`;
                    const w = t.tier === "pill" ? 24 : t.tier === "circle" ? 16 : 16;
                    return (
                      <div
                        key={t.name}
                        className="h-[16px] border transition-all"
                        style={{
                          width: w,
                          borderRadius: r,
                          borderColor: CORNER_TIER_META[t.tier].color,
                          backgroundColor: `${CORNER_TIER_META[t.tier].color}18`,
                          borderWidth: t.step === "6" ? 2 : 1,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Corner token table */}
            <div className="px-6 py-2 overflow-x-auto">
              <table className="w-full" style={{ minWidth: 780 }}>
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="py-3 pl-4 pr-2 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", width: 48 }}>#</th>
                    <th className="py-3 px-2 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", width: 40 }}>Tier</th>
                    <th className="py-3 px-3 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", minWidth: 170 }}>Name</th>
                    <th className="py-3 px-3 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", minWidth: 220 }}>Preview</th>
                    <th className="py-3 px-3 text-right text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", width: 90 }}>Value</th>
                    <th className="py-3 pl-3 pr-4 text-left text-gray-400 uppercase" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)", minWidth: 200 }}>Usage</th>
                  </tr>
                </thead>
                <tbody>
                  {CORNER_TOKENS.map((token, i) => {
                    const key = `corner-${token.step}`;
                    return (
                      <CornerTokenRow
                        key={key}
                        index={i}
                        token={token}
                        copied={copiedKey === key}
                        onCopy={() => handleCopy(token.value, key)}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tier legend */}
            <div className="px-6 py-5 border-t border-gray-100 mt-2">
              <div className="flex flex-wrap items-center gap-5">
                {Object.entries(CORNER_TIER_META).map(([, meta]) => (
                  <div key={meta.label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: meta.color, opacity: 0.75 }} />
                    <span className="text-gray-500" style={{ fontSize: "var(--typo-label-m-size)", lineHeight: "var(--typo-label-m-line-height)", fontWeight: "var(--typo-label-m-weight)" }}>{meta.label}</span>
                  </div>
                ))}
                <div className="ml-auto text-gray-400" style={{ fontSize: "var(--typo-label-r-size)", lineHeight: "var(--typo-label-r-line-height)", fontWeight: "var(--typo-label-r-weight)" }}>
                  Click any row to copy value
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
