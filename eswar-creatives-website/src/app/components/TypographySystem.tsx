import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import { copyToClipboard } from "./clipboard";

/* ═══════════════════════════════════════════════════════════════════════
   TYPOGRAPHY TOKEN DATA — 43 styles · 3 categories
   ═══════════════════════════════════════════════════════════════════════ */

type TypoToken = {
  id: string;
  label: string;
  aliasLabel?: string;       // e.g. "H1R" shown as secondary alias
  aliasName?: string;        // e.g. "Heading XL Light"
  size: number;
  weight: number;
  lineHeight: number;
  letterSpacing: string;
  transform?: string;
  decoration?: string;
  cssVar: string;
  category: "heading" | "paragraph" | "one-line";
};

const HEADING_TOKENS: TypoToken[] = [
  { id: "display", label: "D", size: 48, weight: 700, lineHeight: 56, letterSpacing: "-0.02em", cssVar: "--typo-display", category: "heading" },
  { id: "h1", label: "H1", aliasLabel: "H1R", aliasName: "Heading XL Light", size: 36, weight: 600, lineHeight: 44, letterSpacing: "-0.02em", cssVar: "--typo-h1", category: "heading" },
  { id: "h2", label: "H2", aliasLabel: "H2B", aliasName: "Heading L Bold", size: 30, weight: 600, lineHeight: 36, letterSpacing: "-0.02em", cssVar: "--typo-h2", category: "heading" },
  { id: "h3", label: "H3", aliasLabel: "H3B", aliasName: "Heading M Bold", size: 24, weight: 600, lineHeight: 32, letterSpacing: "-0.01em", cssVar: "--typo-h3", category: "heading" },
  { id: "h4", label: "H4", aliasLabel: "H4R", aliasName: "Heading S Regular", size: 20, weight: 600, lineHeight: 28, letterSpacing: "-0.01em", cssVar: "--typo-h4", category: "heading" },
  { id: "h5", label: "H5", size: 18, weight: 600, lineHeight: 24, letterSpacing: "-0.01em", cssVar: "--typo-h5", category: "heading" },
  { id: "h6", label: "H6", size: 16, weight: 600, lineHeight: 24, letterSpacing: "0.06em", transform: "uppercase", cssVar: "--typo-h6", category: "heading" },
  { id: "h7", label: "H7", aliasLabel: "H7M", aliasName: "Body Large Med", size: 14, weight: 400, lineHeight: 20, letterSpacing: "0em", cssVar: "--typo-h7", category: "heading" },
  { id: "h8", label: "H8", aliasLabel: "H8M", aliasName: "Body Small Med", size: 12, weight: 400, lineHeight: 16, letterSpacing: "0em", cssVar: "--typo-h8", category: "heading" },
  { id: "h9", label: "H9", aliasLabel: "H9R", aliasName: "Overline Reg", size: 11, weight: 600, lineHeight: 16, letterSpacing: "0.08em", transform: "uppercase", cssVar: "--typo-h9", category: "heading" },
];

const HEADING_NAMES: Record<string, { primary: string; alias?: string }> = {
  display: { primary: "Display" },
  h1: { primary: "Heading XL", alias: "Heading XL Light" },
  h2: { primary: "Heading L", alias: "Heading L Bold" },
  h3: { primary: "Heading M", alias: "Heading M Bold" },
  h4: { primary: "Heading S", alias: "Heading S Regular" },
  h5: { primary: "Heading XS" },
  h6: { primary: "LABEL CAPS" },
  h7: { primary: "Body Large", alias: "Body Large Med" },
  h8: { primary: "Body Small", alias: "Body Small Med" },
  h9: { primary: "OVERLINE", alias: "OVERLINE REG" },
};

const HEADING_ALIAS_WEIGHTS: Record<string, number> = {
  h1: 300,  // XL Light
  h2: 700,  // L Bold
  h3: 700,  // M Bold
  h4: 400,  // S Regular
  h7: 500,  // Body Large Med
  h8: 500,  // Body Small Med
  h9: 400,  // Overline Reg
};

const PARAGRAPH_TOKENS: TypoToken[] = [
  { id: "p-xs", label: "12", size: 12, weight: 400, lineHeight: 20, letterSpacing: "0em", cssVar: "--typo-p-xs", category: "paragraph" },
  { id: "p-sm", label: "13", size: 13, weight: 400, lineHeight: 20, letterSpacing: "0em", cssVar: "--typo-p-sm", category: "paragraph" },
  { id: "p-sm-med", label: "13", size: 13, weight: 500, lineHeight: 20, letterSpacing: "0em", cssVar: "--typo-p-sm-med", category: "paragraph" },
  { id: "p-base", label: "14", size: 14, weight: 400, lineHeight: 24, letterSpacing: "0em", cssVar: "--typo-p-base", category: "paragraph" },
  { id: "p-base-med", label: "14", size: 14, weight: 500, lineHeight: 24, letterSpacing: "0em", cssVar: "--typo-p-base-med", category: "paragraph" },
  { id: "p-base-bold", label: "14", size: 14, weight: 700, lineHeight: 24, letterSpacing: "0em", cssVar: "--typo-p-base-bold", category: "paragraph" },
  { id: "p-lg", label: "16", size: 16, weight: 400, lineHeight: 28, letterSpacing: "0em", cssVar: "--typo-p-lg", category: "paragraph" },
  { id: "p-lg-semi", label: "16", size: 16, weight: 600, lineHeight: 28, letterSpacing: "0em", cssVar: "--typo-p-lg-semi", category: "paragraph" },
  { id: "p-xl", label: "18", size: 18, weight: 400, lineHeight: 28, letterSpacing: "0em", cssVar: "--typo-p-xl", category: "paragraph" },
  { id: "p-link", label: "16", size: 16, weight: 400, lineHeight: 24, letterSpacing: "0em", decoration: "underline", cssVar: "--typo-p-link", category: "paragraph" },
  { id: "p-blockquote", label: "14", size: 14, weight: 400, lineHeight: 24, letterSpacing: "0em", cssVar: "--typo-p-blockquote", category: "paragraph" },
];

const PARAGRAPH_NAMES: Record<string, string> = {
  "p-xs": "Extra Small Regular",
  "p-sm": "Small Regular",
  "p-sm-med": "Small Medium",
  "p-base": "Base Regular",
  "p-base-med": "Base Medium",
  "p-base-bold": "Base Bold",
  "p-lg": "Large Regular",
  "p-lg-semi": "Large Semibold",
  "p-xl": "XL Regular",
  "p-link": "Link",
  "p-blockquote": "Block quote",
};

const ONELINE_TOKENS: TypoToken[] = [
  { id: "btn-default", label: "14", size: 14, weight: 400, lineHeight: 20, letterSpacing: "0em", cssVar: "--typo-btn-default", category: "one-line" },
  { id: "btn-med", label: "14", size: 14, weight: 500, lineHeight: 20, letterSpacing: "0em", cssVar: "--typo-btn-med", category: "one-line" },
  { id: "btn-semi", label: "14", size: 14, weight: 600, lineHeight: 20, letterSpacing: "0em", cssVar: "--typo-btn-semi", category: "one-line" },
  { id: "btn-bold", label: "14", size: 14, weight: 700, lineHeight: 20, letterSpacing: "0em", cssVar: "--typo-btn-bold", category: "one-line" },
  { id: "label-r", label: "11", size: 11, weight: 400, lineHeight: 16, letterSpacing: "0em", cssVar: "--typo-label-r", category: "one-line" },
  { id: "label-m", label: "11", size: 11, weight: 500, lineHeight: 16, letterSpacing: "0em", cssVar: "--typo-label-m", category: "one-line" },
  { id: "caption-r", label: "13", size: 13, weight: 400, lineHeight: 16, letterSpacing: "0em", cssVar: "--typo-caption-r", category: "one-line" },
  { id: "caption-m", label: "13", size: 13, weight: 500, lineHeight: 16, letterSpacing: "0em", cssVar: "--typo-caption-m", category: "one-line" },
  { id: "ol-body", label: "15", size: 15, weight: 400, lineHeight: 20, letterSpacing: "0em", cssVar: "--typo-ol-body", category: "one-line" },
  { id: "ol-body-semi", label: "15", size: 15, weight: 600, lineHeight: 20, letterSpacing: "0em", cssVar: "--typo-ol-body-semi", category: "one-line" },
  { id: "lead-r", label: "17", size: 17, weight: 400, lineHeight: 24, letterSpacing: "0em", cssVar: "--typo-lead-r", category: "one-line" },
  { id: "lead-m", label: "17", size: 17, weight: 500, lineHeight: 24, letterSpacing: "0em", cssVar: "--typo-lead-m", category: "one-line" },
  { id: "lead-semi", label: "17", size: 17, weight: 600, lineHeight: 24, letterSpacing: "0em", cssVar: "--typo-lead-semi", category: "one-line" },
  { id: "ol-overline-bold", label: "11", size: 11, weight: 700, lineHeight: 16, letterSpacing: "0.08em", transform: "uppercase", cssVar: "--typo-ol-overline-bold", category: "one-line" },
  { id: "pointer", label: "10", size: 10, weight: 400, lineHeight: 16, letterSpacing: "0em", cssVar: "--typo-pointer", category: "one-line" },
];

const ONELINE_NAMES: Record<string, string> = {
  "btn-default": "Button Default",
  "btn-med": "Button Medium",
  "btn-semi": "Button Semibold",
  "btn-bold": "Button Bold",
  "label-r": "Label-R",
  "label-m": "Label-M",
  "caption-r": "Caption-R",
  "caption-m": "Caption-M",
  "ol-body": "Body Regular",
  "ol-body-semi": "Body Semibold",
  "lead-r": "Lead Regular",
  "lead-m": "Lead Medium",
  "lead-semi": "Lead Semibold",
  "ol-overline-bold": "Overline Bold",
  "pointer": "Pointer",
};

/* Paired one-line tokens displayed side-by-side */
const ONELINE_PAIRS: { left: string; right?: string }[] = [
  { left: "btn-default" },
  { left: "btn-med" },
  { left: "btn-semi" },
  { left: "btn-bold" },
  { left: "label-r", right: "label-m" },
  { left: "caption-r", right: "caption-m" },
  { left: "ol-body" },
  { left: "ol-body-semi" },
  { left: "lead-r", right: "lead-m" },
  { left: "lead-semi" },
  { left: "ol-overline-bold" },
  { left: "pointer" },
];

const WEIGHT_LABELS: Record<number, string> = {
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semibold",
  700: "Bold",
};

/* ══════════════════════════════════════════════════════════════════════
   COPY BUTTON COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    copyToClipboard(value, value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100"
      title={`Copy ${value}`}
    >
      {copied ? (
        <Check className="w-3 h-3 text-green-500" />
      ) : (
        <Copy className="w-3 h-3 text-gray-400" />
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   HEADING ROW COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

function HeadingRow({ token }: { token: TypoToken }) {
  const names = HEADING_NAMES[token.id];
  const aliasWeight = HEADING_ALIAS_WEIGHTS[token.id];

  return (
    <div className="group flex items-baseline gap-3 md:gap-4 py-3 md:py-4 border-b border-gray-50 hover:bg-gray-50/50 transition-colors rounded px-2 -mx-2">
      {/* Scale label + size */}
      <div className="flex flex-col items-center shrink-0 w-[28px]">
        <span
          className="text-gray-400 tabular-nums"
          style={{
            fontSize: "var(--typo-pointer-size)",
            lineHeight: "var(--typo-pointer-line-height)",
            fontWeight: "var(--typo-label-m-weight)",
          }}
        >
          {token.label}
        </span>
        <span className="text-[9px] text-gray-300 tabular-nums" style={{ fontWeight: "var(--typo-pointer-weight)" }}>
          {token.size}
        </span>
      </div>

      {/* Primary specimen */}
      <div className="flex-1 min-w-0 flex items-baseline gap-4 md:gap-8 flex-wrap">
        <span
          className="text-text-primary shrink-0"
          style={{
            fontSize: `${token.size}px`,
            fontWeight: token.weight,
            lineHeight: `${token.lineHeight}px`,
            letterSpacing: token.letterSpacing,
            textTransform: (token.transform as React.CSSProperties["textTransform"]) || "none",
          }}
        >
          {names?.primary || token.id}
        </span>

        {/* Alias specimen (if has variant) */}
        {names?.alias && aliasWeight !== undefined && (
          <>
            <span className="text-[9px] text-gray-300 self-center hidden md:inline tabular-nums" style={{ fontWeight: "var(--typo-label-m-weight)" }}>
              {token.aliasLabel}
            </span>
            <span
              className="text-text-primary shrink-0 hidden md:inline"
              style={{
                fontSize: `${token.size}px`,
                fontWeight: aliasWeight,
                lineHeight: `${token.lineHeight}px`,
                letterSpacing: token.letterSpacing,
                textTransform: (token.transform as React.CSSProperties["textTransform"]) || "none",
              }}
            >
              {names.alias}
            </span>
          </>
        )}
      </div>

      {/* Copy button */}
      <CopyButton value={token.cssVar} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PARAGRAPH ROW COMPONENT
   ═════════════════════════════════════════════════════════════════���════ */

function ParagraphRow({ token }: { token: TypoToken }) {
  const name = PARAGRAPH_NAMES[token.id] || token.id;

  return (
    <div className="group flex items-baseline gap-3 md:gap-4 py-2.5 md:py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors rounded px-2 -mx-2">
      {/* Size label */}
      <div className="flex flex-col items-center shrink-0 w-[22px]">
        <span
          className="text-gray-400 tabular-nums"
          style={{
            fontSize: "var(--typo-pointer-size)",
            lineHeight: "var(--typo-pointer-line-height)",
            fontWeight: "var(--typo-label-m-weight)",
          }}
        >
          {token.size}
        </span>
      </div>

      {/* Specimen */}
      <span
        className="text-text-primary flex-1"
        style={{
          fontSize: `${token.size}px`,
          fontWeight: token.weight,
          lineHeight: `${token.lineHeight}px`,
          letterSpacing: token.letterSpacing,
          textDecoration: token.decoration || "none",
        }}
      >
        {name}
      </span>

      {/* Copy */}
      <CopyButton value={token.cssVar} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   ONE-LINE ROW COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

function OneLineRow({ leftId, rightId }: { leftId: string; rightId?: string }) {
  const leftToken = ONELINE_TOKENS.find(t => t.id === leftId)!;
  const rightToken = rightId ? ONELINE_TOKENS.find(t => t.id === rightId) : null;
  const leftName = ONELINE_NAMES[leftId];
  const rightName = rightId ? ONELINE_NAMES[rightId] : null;

  return (
    <div className="group flex items-baseline gap-3 md:gap-4 py-2.5 md:py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors rounded px-2 -mx-2">
      {/* Size label */}
      <div className="flex flex-col items-center shrink-0 w-[22px]">
        <span
          className="text-gray-400 tabular-nums"
          style={{
            fontSize: "var(--typo-pointer-size)",
            lineHeight: "var(--typo-pointer-line-height)",
            fontWeight: "var(--typo-label-m-weight)",
          }}
        >
          {leftToken.size}
        </span>
      </div>

      {/* Left specimen */}
      <span
        className="text-text-primary flex-1 min-w-0"
        style={{
          fontSize: `${leftToken.size}px`,
          fontWeight: leftToken.weight,
          lineHeight: `${leftToken.lineHeight}px`,
          letterSpacing: leftToken.letterSpacing,
          textTransform: (leftToken.transform as React.CSSProperties["textTransform"]) || "none",
        }}
      >
        {leftName}
      </span>

      {/* Right specimen (paired) */}
      {rightToken && rightName && (
        <span
          className="text-text-primary flex-1 min-w-0 hidden md:inline"
          style={{
            fontSize: `${rightToken.size}px`,
            fontWeight: rightToken.weight,
            lineHeight: `${rightToken.lineHeight}px`,
            letterSpacing: rightToken.letterSpacing,
            textTransform: (rightToken.transform as React.CSSProperties["textTransform"]) || "none",
          }}
        >
          {rightName}
        </span>
      )}

      {/* Copy */}
      <CopyButton value={leftToken.cssVar} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   TOKEN DETAIL TABLE
   ═══════════════════════════════════════════════════════════════════════ */

function TokenDetailRow({ token, name }: { token: TypoToken; name: string }) {
  return (
    <tr className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
      <td className="py-2.5 pr-3">
        <span className="text-text-primary" style={{ fontSize: "var(--typo-h8m-size)", lineHeight: "var(--typo-h8m-line-height)", fontWeight: "var(--typo-h8m-weight)" }}>{name}</span>
      </td>
      <td className="py-2.5 pr-3">
        <code className="text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded" style={{ fontSize: "var(--typo-label-r-size)", lineHeight: "var(--typo-label-r-line-height)", fontWeight: "var(--typo-label-r-weight)" }}>
          {token.cssVar}
        </code>
      </td>
      <td className="py-2.5 pr-3">
        <span className="text-gray-500 tabular-nums" style={{ fontSize: "var(--typo-label-r-size)", lineHeight: "var(--typo-label-r-line-height)", fontWeight: "var(--typo-label-r-weight)" }}>{token.size}px</span>
      </td>
      <td className="py-2.5 pr-3">
        <span className="text-gray-500" style={{ fontSize: "var(--typo-label-r-size)", lineHeight: "var(--typo-label-r-line-height)", fontWeight: "var(--typo-label-r-weight)" }}>{WEIGHT_LABELS[token.weight] || token.weight}</span>
      </td>
      <td className="py-2.5 pr-3">
        <span className="text-gray-500 tabular-nums" style={{ fontSize: "var(--typo-label-r-size)", lineHeight: "var(--typo-label-r-line-height)", fontWeight: "var(--typo-label-r-weight)" }}>{token.lineHeight}px</span>
      </td>
      <td className="py-2.5">
        <span className="text-gray-500 tabular-nums" style={{ fontSize: "var(--typo-label-r-size)", lineHeight: "var(--typo-label-r-line-height)", fontWeight: "var(--typo-label-r-weight)" }}>{token.letterSpacing}</span>
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN TYPOGRAPHY SYSTEM COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

type ViewMode = "type-scale" | "token-table";

export function TypographySystem() {
  const [viewMode, setViewMode] = useState<ViewMode>("type-scale");

  const allTokens = [...HEADING_TOKENS, ...PARAGRAPH_TOKENS, ...ONELINE_TOKENS];
  const totalTokens = allTokens.length;

  /* Gather all alias tokens for total count */
  const aliasCount = HEADING_TOKENS.filter(t => HEADING_ALIAS_WEIGHTS[t.id] !== undefined).length;
  const displayTotal = totalTokens + aliasCount;

  return (
    <div className="flex-1">
      {/* Page header */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-4">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex items-center gap-2">
                <span
                  className="text-gray-400 uppercase"
                  style={{
                    fontSize: "var(--typo-h9-size)",
                    lineHeight: "var(--typo-h9-line-height)",
                    fontWeight: "var(--typo-h9-weight)",
                    letterSpacing: "var(--typo-h9-letter-spacing)",
                  }}
                >
                  Typography
                </span>
                <span className="text-gray-200">&middot;</span>
                <span
                  className="text-gray-400"
                  style={{
                    fontSize: "var(--typo-label-r-size)",
                    lineHeight: "var(--typo-label-r-line-height)",
                    fontWeight: "var(--typo-label-r-weight)",
                  }}
                >
                  Foundation &middot; Type Scale
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2 mb-1">
              <button
                onClick={() => setViewMode("type-scale")}
                className={`px-3 py-1 rounded-md border transition-all ${
                  viewMode === "type-scale"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                }`}
                style={{
                  fontSize: "var(--typo-h8m-size)",
                  lineHeight: "var(--typo-h8m-line-height)",
                  fontWeight: "var(--typo-h8m-weight)",
                }}
              >
                Type Scale
              </button>
              <button
                onClick={() => setViewMode("token-table")}
                className={`px-3 py-1 rounded-md border transition-all ${
                  viewMode === "token-table"
                    ? "bg-gray-900 text-white border-gray-900"
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700"
                }`}
                style={{
                  fontSize: "var(--typo-h8m-size)",
                  lineHeight: "var(--typo-h8m-line-height)",
                  fontWeight: "var(--typo-h8m-weight)",
                }}
              >
                Token Table
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span
                className="text-blue-700"
                style={{
                  fontSize: "var(--typo-h9-size)",
                  lineHeight: "var(--typo-h9-line-height)",
                  fontWeight: "var(--typo-h9-weight)",
                }}
              >
                Ready for dev
              </span>
            </div>
          </div>
        </div>
      </div>

      {viewMode === "type-scale" ? (
        /* ── TYPE SCALE VIEW ── */
        <div className="max-w-7xl mx-auto px-4 md:px-8 pb-8">
          {/* Three-column layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Heading column */}
            <div>
              <h2
                className="text-text-primary mb-6"
                style={{
                  fontSize: "var(--typo-h1r-size)",
                  fontWeight: "var(--typo-h1r-weight)",
                  lineHeight: "var(--typo-h1r-line-height)",
                  letterSpacing: "var(--typo-h1r-letter-spacing)",
                }}
              >
                heading
              </h2>
              <div>
                {HEADING_TOKENS.map(token => (
                  <HeadingRow key={token.id} token={token} />
                ))}
              </div>
            </div>

            {/* Paragraph column */}
            <div>
              <h2
                className="text-text-primary mb-6"
                style={{
                  fontSize: "var(--typo-h1r-size)",
                  fontWeight: "var(--typo-h1r-weight)",
                  lineHeight: "var(--typo-h1r-line-height)",
                  letterSpacing: "var(--typo-h1r-letter-spacing)",
                }}
              >
                paragraph
              </h2>
              <div>
                {PARAGRAPH_TOKENS.map(token => (
                  <ParagraphRow key={token.id} token={token} />
                ))}
              </div>
            </div>

            {/* One-line column */}
            <div>
              <h2
                className="text-text-primary mb-6"
                style={{
                  fontSize: "var(--typo-h1r-size)",
                  fontWeight: "var(--typo-h1r-weight)",
                  lineHeight: "var(--typo-h1r-line-height)",
                  letterSpacing: "var(--typo-h1r-letter-spacing)",
                }}
              >
                one-line
              </h2>
              <div>
                {ONELINE_PAIRS.map(pair => (
                  <OneLineRow key={pair.left} leftId={pair.left} rightId={pair.right} />
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── TOKEN TABLE VIEW ── */
        <div className="max-w-7xl mx-auto px-4 md:px-8 pb-8">
          {/* Heading tokens table */}
          <div className="mb-8">
            <h3 className="text-text-primary mb-3" style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-btn-semi-weight)" }}>
              Heading Tokens
              <span className="text-gray-400 ml-2" style={{ fontWeight: "var(--typo-caption-r-weight)" }}>{HEADING_TOKENS.length} styles + {aliasCount} aliases</span>
            </h3>
            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Name</th>
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>CSS Variable</th>
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Size</th>
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Weight</th>
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Line-H</th>
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Tracking</th>
                  </tr>
                </thead>
                <tbody className="px-3">
                  {HEADING_TOKENS.map(token => (
                    <TokenDetailRow
                      key={token.id}
                      token={token}
                      name={HEADING_NAMES[token.id]?.primary || token.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paragraph tokens table */}
          <div className="mb-8">
            <h3 className="text-text-primary mb-3" style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-btn-semi-weight)" }}>
              Paragraph Tokens
              <span className="text-gray-400 ml-2" style={{ fontWeight: "var(--typo-caption-r-weight)" }}>{PARAGRAPH_TOKENS.length} styles</span>
            </h3>
            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Name</th>
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>CSS Variable</th>
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Size</th>
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Weight</th>
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Line-H</th>
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Tracking</th>
                  </tr>
                </thead>
                <tbody className="px-3">
                  {PARAGRAPH_TOKENS.map(token => (
                    <TokenDetailRow
                      key={token.id}
                      token={token}
                      name={PARAGRAPH_NAMES[token.id] || token.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* One-line tokens table */}
          <div className="mb-8">
            <h3 className="text-text-primary mb-3" style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-btn-semi-weight)" }}>
              One-line Tokens
              <span className="text-gray-400 ml-2" style={{ fontWeight: "var(--typo-caption-r-weight)" }}>{ONELINE_TOKENS.length} styles</span>
            </h3>
            <div className="overflow-x-auto border border-gray-100 rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Name</th>
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>CSS Variable</th>
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Size</th>
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Weight</th>
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Line-H</th>
                    <th className="text-left py-2 px-3 text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Tracking</th>
                  </tr>
                </thead>
                <tbody className="px-3">
                  {ONELINE_TOKENS.map(token => (
                    <TokenDetailRow
                      key={token.id}
                      token={token}
                      name={ONELINE_NAMES[token.id] || token.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sticky footer with meta cards */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 md:py-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Breadcrumb */}
            <div>
              <p className="text-gray-900" style={{ fontSize: "var(--typo-caption-m-size)", lineHeight: "var(--typo-caption-m-line-height)", fontWeight: "var(--typo-btn-semi-weight)" }}>
                Design System &middot; Typography &middot; Web
              </p>
              <p className="text-gray-400 mt-0.5" style={{ fontSize: "var(--typo-label-r-size)", lineHeight: "var(--typo-label-r-line-height)", fontWeight: "var(--typo-label-r-weight)" }}>
                4px grid &middot; Inter Variable &middot; {displayTotal} tokens
              </p>
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-1.5">
              {["Inter", "Display", "Heading", "Paragraph", "One-line"].map(pill => (
                <span
                  key={pill}
                  className="px-3 py-1 rounded-full border border-gray-200 text-gray-600 bg-white"
                  style={{
                    fontSize: "var(--typo-label-m-size)",
                    lineHeight: "var(--typo-label-m-line-height)",
                    fontWeight: "var(--typo-label-m-weight)",
                  }}
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>

          {/* Meta cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <div className="border border-gray-100 rounded-lg px-4 py-3">
              <span className="text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Font Family</span>
              <p className="text-text-primary mt-1" style={{ fontSize: "var(--typo-h4r-size)", lineHeight: "var(--typo-h4r-line-height)", fontWeight: "var(--typo-lead-m-weight)" }}>Inter</p>
              <p className="text-gray-400" style={{ fontSize: "var(--typo-label-r-size)", lineHeight: "var(--typo-label-r-line-height)", fontWeight: "var(--typo-label-r-weight)" }}>Google Fonts &middot; Variable</p>
            </div>
            <div className="border border-gray-100 rounded-lg px-4 py-3">
              <span className="text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Scale Base</span>
              <p className="text-text-primary mt-1" style={{ fontSize: "var(--typo-h4r-size)", lineHeight: "var(--typo-h4r-line-height)", fontWeight: "var(--typo-lead-m-weight)" }}>4px grid</p>
              <p className="text-gray-400" style={{ fontSize: "var(--typo-label-r-size)", lineHeight: "var(--typo-label-r-line-height)", fontWeight: "var(--typo-label-r-weight)" }}>8pt / 4pt spacing system</p>
            </div>
            <div className="border border-gray-100 rounded-lg px-4 py-3">
              <span className="text-gray-400 uppercase" style={{ fontSize: "var(--typo-pointer-size)", lineHeight: "var(--typo-pointer-line-height)", fontWeight: "var(--typo-h9-weight)", letterSpacing: "var(--typo-h9-letter-spacing)" }}>Total Styles</span>
              <p className="text-text-primary mt-1" style={{ fontSize: "var(--typo-h4r-size)", lineHeight: "var(--typo-h4r-line-height)", fontWeight: "var(--typo-lead-m-weight)" }}>{displayTotal} tokens</p>
              <p className="text-gray-400" style={{ fontSize: "var(--typo-label-r-size)", lineHeight: "var(--typo-label-r-line-height)", fontWeight: "var(--typo-label-r-weight)" }}>Heading + Paragraph + One-line</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}