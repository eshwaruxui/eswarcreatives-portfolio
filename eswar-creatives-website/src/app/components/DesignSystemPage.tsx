import { useState, useCallback } from "react";
import { Link } from "react-router";
import { ArrowLeft, Check, ChevronDown } from "lucide-react";
import { TokenLibraryColors } from "./TokenLibraryColors";
import { TypographySystem } from "./TypographySystem";
import { ComponentLibrary } from "./ComponentLibrary";
import { copyToClipboard } from "./clipboard";

/* ─── Color palette definitions sourced from theme-colors.css (hex) ─── */

type Shade = { step: number; value: string };
type Palette = {
  name: string;
  description: string;
  hueLabel: string;
  hueStep?: number;
  category: string;
  isAlpha?: boolean;
  shades: Shade[];
};

const PALETTES: Palette[] = [
  {
    name: "Neutral",
    description: "Light",
    hueLabel: "",
    category: "Neutral",
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
    hueLabel: "",
    category: "Alpha Neutral",
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
    hueLabel: "brand-teal",
    hueStep: 1200,
    category: "Primary",
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
    hueLabel: "green-hue",
    hueStep: 950,
    category: "Success",
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
    hueLabel: "yellow-hue",
    hueStep: 900,
    category: "Alert",
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
    hueLabel: "orange-hue",
    hueStep: 900,
    category: "Warning",
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
    hueLabel: "red-hue",
    hueStep: 950,
    category: "Danger",
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
    hueLabel: "blue-hue",
    hueStep: 950,
    category: "System-Blue",
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
    hueLabel: "rose-hue",
    hueStep: 950,
    category: "Spl-Rose",
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
    hueLabel: "violet-hue",
    hueStep: 950,
    category: "Spl-Violet",
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
    hueLabel: "cyan-hue",
    hueStep: 900,
    category: "Spl-Cyan",
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

const CATEGORIES = [
  "All",
  "Neutral",
  "Alpha Neutral",
  "Primary",
  "Success",
  "Alert",
  "Warning",
  "Danger",
  "System-Blue",
  "Spl-Rose",
  "Spl-Violet",
  "Spl-Cyan",
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  All: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200" },
  Neutral: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-300" },
  "Alpha Neutral": { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-400" },
  Primary: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-300" },
  Success: { bg: "bg-green-50", text: "text-green-700", border: "border-green-300" },
  Alert: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-300" },
  Warning: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-300" },
  Danger: { bg: "bg-red-50", text: "text-red-700", border: "border-red-300" },
  "System-Blue": { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300" },
  "Spl-Rose": { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-300" },
  "Spl-Violet": { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-300" },
  "Spl-Cyan": { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-300" },
};

/* ─── Hex luminance helper for text contrast ─── */

function hexToLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/* ─── Checkerboard CSS for alpha swatches ─── */

const CHECKERBOARD_BG =
  "repeating-conic-gradient(#e0e0e0 0% 25%, #ffffff 0% 50%) 0 0 / 10px 10px";

/* ─── Extract opacity % from rgba string ─── */

function getAlphaLabel(value: string): string {
  const match = value.match(/,\s*([\d.]+)\)$/);
  if (!match) return value;
  return `${Math.round(parseFloat(match[1]) * 100)}%`;
}

/* ─── Luminance helper that works for both hex and rgba ─── */

function getEffectiveLuminance(value: string): number {
  if (value.startsWith("#")) return hexToLuminance(value);
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]*)\)/);
  if (!match) return 1;
  const r = parseInt(match[1]) / 255;
  const g = parseInt(match[2]) / 255;
  const b = parseInt(match[3]) / 255;
  const a = match[4] ? parseFloat(match[4]) : 1;
  const br = r * a + 1 * (1 - a);
  const bg = g * a + 1 * (1 - a);
  const bb = b * a + 1 * (1 - a);
  return 0.2126 * br + 0.7152 * bg + 0.0722 * bb;
}

/* ─── Swatch with copy-to-clipboard ─── */

function Swatch({ shade, paletteName, isAlpha }: { shade: Shade; paletteName: string; isAlpha?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    copyToClipboard(shade.value, `${paletteName}-${shade.step}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [shade.value, paletteName, shade.step]);

  const isLight = getEffectiveLuminance(shade.value) > 0.55;

  return (
    <button
      onClick={handleCopy}
      className="group flex flex-col items-center gap-1 cursor-pointer"
      title={`${paletteName}-${shade.step}: ${shade.value}`}
    >
      <span
        className="text-[9px] text-gray-400 transition-colors group-hover:text-gray-900 tabular-nums"
        style={{ fontWeight: 500 }}
      >
        {shade.step}
      </span>
      <div
        className="w-[40px] h-[40px] rounded-md border border-black/[0.06] transition-all duration-200 group-hover:scale-110 relative overflow-hidden"
        style={isAlpha ? { background: CHECKERBOARD_BG } : { backgroundColor: shade.value }}
      >
        {isAlpha && (
          <div className="absolute inset-0" style={{ backgroundColor: shade.value }} />
        )}
        {copied && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-md z-10">
            <Check className={`w-3 h-3 ${isLight ? "text-gray-800" : "text-white"}`} />
          </div>
        )}
      </div>
      <span
        className="text-[8px] text-gray-400 uppercase transition-colors group-hover:text-gray-700 tabular-nums"
        style={{ fontWeight: 500 }}
      >
        {isAlpha ? getAlphaLabel(shade.value) : shade.value}
      </span>
    </button>
  );
}

/* ─── Palette Row ─── */

function PaletteRow({ palette }: { palette: Palette }) {
  const hueShadeIndex = palette.shades.findIndex((s) => s.step === 500);

  return (
    <div className="py-6 md:py-8 border-b border-gray-100 last:border-b-0">
      <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
        {/* Label */}
        <div className="md:w-[100px] shrink-0">
          <h3
            className="text-gray-900 mb-0.5"
            style={{
              fontSize: "var(--typo-caption-m-size)",
              lineHeight: "var(--typo-caption-m-line-height)",
              fontWeight: "var(--typo-btn-semi-weight)",
            }}
          >
            {palette.name}
          </h3>
          <p className="text-gray-400" style={{ fontSize: "var(--typo-label-r-size)", lineHeight: "var(--typo-label-r-line-height)", fontWeight: "var(--typo-label-r-weight)" }}>
            {palette.description}
          </p>
          <p className="text-[9px] text-gray-300 mt-0.5" style={{ fontWeight: "var(--typo-pointer-weight)" }}>
            {palette.shades.length} shades
          </p>
        </div>

        {/* Swatches */}
        <div className="flex-1">
          {palette.hueLabel && (
            <div className="flex items-center mb-2 ml-0">
              <div
                className="flex flex-col items-center"
                style={{
                  marginLeft: `${Math.max(0, (palette.hueStep ? palette.shades.findIndex(s => s.step === palette.hueStep) : hueShadeIndex) * 48 + 20)}px`,
                }}
              >
                <span
                  className="px-2 py-0.5 rounded-full"
                  style={{
                    fontSize: "var(--typo-pointer-size)",
                    lineHeight: "var(--typo-pointer-line-height)",
                    fontWeight: "var(--typo-label-m-weight)",
                    color: palette.shades[5]?.value,
                  }}
                >
                  {palette.hueLabel}
                </span>
                <div
                  className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent"
                  style={{ borderTopColor: palette.shades[5]?.value }}
                />
              </div>
            </div>
          )}
          <div className="flex flex-nowrap gap-2 overflow-x-auto">
            {palette.shades.map((shade) => (
              <Swatch
                key={`${palette.name}-${shade.step}`}
                shade={shade}
                paletteName={palette.name}
                isAlpha={palette.isAlpha}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ─── */

export function DesignSystemPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<"Foundation" | "Token Library" | "Components">("Foundation");
  const [foundationSection, setFoundationSection] = useState<"colors" | "typography">("colors");

  const filteredPalettes =
    activeFilter === "All"
      ? PALETTES
      : PALETTES.filter((p) => p.category === activeFilter);

  const totalTokens = PALETTES.reduce((sum, p) => sum + p.shades.length, 0);

  const TABS = ["Foundation", "Token Library", "Components"] as const;

  return (
    <div
      className="min-h-screen w-full bg-white flex flex-col"
      style={{
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Top navigation bar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-[56px]">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-2 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-caption-m-weight)" }}>
                Back to Portfolio
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              <span className="text-gray-900" style={{ fontSize: "var(--typo-btn-semi-size)", lineHeight: "var(--typo-btn-semi-line-height)", fontWeight: "var(--typo-btn-semi-weight)" }}>
                Design System
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-md transition-colors ${
                    activeTab === tab
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                  style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-caption-m-weight)" }}
                >
                  {tab}
                  {tab !== "Foundation" && activeTab !== tab && <ChevronDown className="w-3 h-3 inline ml-1" />}
                </button>
              ))}
            </div>
            <span className="text-gray-400 border border-gray-200 px-2 py-0.5 rounded-full" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)" }}>
              V2.1
            </span>
          </div>
        </div>
      </header>

      {activeTab === "Token Library" ? (
        <TokenLibraryColors />
      ) : activeTab === "Components" ? (
        <ComponentLibrary />
      ) : activeTab === "Foundation" && foundationSection === "typography" ? (
        /* ── Typography section ── */
        <>
          {/* Foundation sub-nav */}
          <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 pb-0">
            <div className="flex items-center gap-1 border-b border-gray-100 pb-0">
              <button
                onClick={() => setFoundationSection("colors")}
                className={`px-3 py-2 border-b-2 transition-colors ${
                  foundationSection === "colors"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
                style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-caption-m-weight)" }}
              >
                Color Palette
              </button>
              <button
                onClick={() => setFoundationSection("typography")}
                className={`px-3 py-2 border-b-2 transition-colors ${
                  foundationSection === "typography"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
                style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-caption-m-weight)" }}
              >
                Typography
              </button>
            </div>
          </div>
          <TypographySystem />
        </>
      ) : (
        <>
          {/* Foundation sub-nav */}
          <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 pb-0">
            <div className="flex items-center gap-1 border-b border-gray-100 pb-0">
              <button
                onClick={() => setFoundationSection("colors")}
                className={`px-3 py-2 border-b-2 transition-colors ${
                  foundationSection === "colors"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
                style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-caption-m-weight)" }}
              >
                Color Palette
              </button>
              <button
                onClick={() => setFoundationSection("typography")}
                className={`px-3 py-2 border-b-2 transition-colors ${
                  foundationSection === "typography"
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-400 hover:text-gray-600"
                }`}
                style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-caption-m-weight)" }}
              >
                Typography
              </button>
            </div>
          </div>

          {/* Page header */}
          <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1
                    className="text-gray-900"
                    style={{
                      fontSize: "var(--typo-h3-size)",
                      lineHeight: "var(--typo-h3-line-height)",
                      fontWeight: "var(--typo-h3-weight)",
                      letterSpacing: "var(--typo-h3-letter-spacing)",
                    }}
                  >
                    Color Palette
                  </h1>
                  <span className="text-gray-400" style={{ fontSize: "var(--typo-caption-r-size)", lineHeight: "var(--typo-caption-r-line-height)", fontWeight: "var(--typo-caption-r-weight)" }}>
                    Foundation &middot; Primitive Colors
                  </span>
                </div>
                <p className="text-gray-400" style={{ fontSize: "var(--typo-caption-r-size)", lineHeight: "var(--typo-caption-r-line-height)", fontWeight: "var(--typo-caption-r-weight)" }}>
                  {PALETTES.length} palettes &middot; {totalTokens} design tokens
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span className="text-green-700" style={{ fontSize: "var(--typo-h9-size)", lineHeight: "var(--typo-h9-line-height)", fontWeight: "var(--typo-h9-weight)" }}>
                    AA GUIDELINES - PASSED (WCAG)
                  </span>
                </div>
                <button className="text-gray-500 hover:text-gray-700 underline decoration-dotted underline-offset-2 transition-colors" style={{ fontSize: "var(--typo-h8m-size)", lineHeight: "var(--typo-h8m-line-height)", fontWeight: "var(--typo-h8m-weight)" }}>
                  Cross check
                </button>
              </div>
            </div>

            {/* Section label */}
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-gray-400 uppercase"
                style={{
                  fontSize: "var(--typo-h9-size)",
                  lineHeight: "var(--typo-h9-line-height)",
                  fontWeight: "var(--typo-h9-weight)",
                  letterSpacing: "var(--typo-h9-letter-spacing)",
                }}
              >
                Color Tokens
              </span>
              <span className="text-gray-400" style={{ fontSize: "var(--typo-label-r-size)", lineHeight: "var(--typo-label-r-line-height)", fontWeight: "var(--typo-label-r-weight)" }}>
                Hover swatch &middot; Click to copy hex
              </span>
            </div>

            <div className="h-[1px] bg-gray-100 mb-2" />
          </div>

          {/* Palette rows */}
          <div className="max-w-7xl mx-auto px-4 md:px-8">
            {filteredPalettes.map((palette) => (
              <PaletteRow key={palette.name} palette={palette} />
            ))}
          </div>

          {/* Footer with filter pills */}
          <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 mt-8">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <p className="text-gray-900" style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-btn-semi-weight)" }}>
                    Design System &middot; Color Library
                  </p>
                  <p className="text-gray-400 mt-0.5" style={{ fontSize: "var(--typo-label-r-size)", lineHeight: "var(--typo-label-r-line-height)", fontWeight: "var(--typo-label-r-weight)" }}>
                    Crafted with 20+ years of design expertise.
                    <br className="md:hidden" />
                    <span className="hidden md:inline"> </span>
                    WCAG AA compliant &middot; {PALETTES.length} palettes &middot;{" "}
                    {totalTokens} design tokens
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const colors = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.All;
                    const isActive = activeFilter === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveFilter(cat)}
                        className={`px-3 py-1 rounded-full border transition-all duration-200 ${
                          isActive
                            ? `${colors.bg} ${colors.text} ${colors.border}`
                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                        }`}
                        style={{ fontSize: "var(--typo-label-m-size)", lineHeight: "var(--typo-label-m-line-height)", fontWeight: "var(--typo-label-m-weight)" }}
                      >
                        {cat === "All" ? "All" : cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}