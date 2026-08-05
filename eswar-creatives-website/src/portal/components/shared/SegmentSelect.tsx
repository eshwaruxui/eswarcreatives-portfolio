// Shared lead-segment control: label map + an inline-editable, chip-styled
// <select>. segment has always been a manually-set field (never an actual
// auto-classifier), but every insert path that doesn't know the lead's real
// vertical falls back to 'saas_product' — which reads like everything gets
// auto-classified the same way. This lets an admin manually correct it,
// from either the Leads table row or the lead drawer, without duplicating
// the option list or the chip styling in both places.
import type { CSSProperties } from 'react'
import { ChevronDown } from 'lucide-react'
import { tokens, t, fonts } from '../../theme'

export const SEGMENT_OPTIONS: { value: string; label: string }[] = [
  { value: 'security_ai', label: 'Security AI' },
  { value: 'aiml', label: 'AIML' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'healthtech', label: 'Healthtech' },
  { value: 'dev_tools', label: 'Dev Tools' },
  { value: 'hr_tech', label: 'HR Tech' },
  { value: 'workflow_heavy_saas', label: 'Workflow Heavy SaaS' },
]

// 'saas_product' predates this option list and is still written by a few
// insert paths (CSV import fallback, Smart Shortlist, enquiry conversion) —
// kept as a valid, labelled value so already-tagged leads display correctly,
// but deliberately left out of SEGMENT_OPTIONS: a fresh manual pick should
// always land on one of the 7 named verticals above.
export const SEGMENT_LABELS: Record<string, string> = {
  saas_product: 'SaaS Product',
  ...Object.fromEntries(SEGMENT_OPTIONS.map((o) => [o.value, o.label])),
}

// The design system only has 4 non-alarming hue families (teal, gold, green,
// neutral) — ruby is reserved for danger/unsubscribed/bounced elsewhere in
// this exact table (the Status column), so it's deliberately not used here
// to avoid a false "something's wrong" read next to a benign segment. With
// 8 values and 4 safe hues, each hue covers a loose pair rather than being
// fully unique — the segment label text is always shown too, so color is a
// supporting cue (skim by family), not the sole identifier.
const SEGMENT_COLORS: Record<string, { bg: string; fg: string }> = {
  security_ai: { bg: tokens.tealLight, fg: tokens.primary },
  aiml: { bg: tokens.tealLight, fg: tokens.primary },
  fintech: { bg: tokens.goldLight, fg: tokens.goldDark },
  healthtech: { bg: tokens.goldLight, fg: tokens.goldDark },
  dev_tools: { bg: tokens.greenLight, fg: tokens.green },
  hr_tech: { bg: tokens.greenLight, fg: tokens.green },
  workflow_heavy_saas: { bg: t.background.muted, fg: t.text.tertiary },
  saas_product: { bg: t.background.muted, fg: t.text.tertiary },
}
const DEFAULT_SEGMENT_COLOR = { bg: t.background.muted, fg: t.text.tertiary }

function segmentTone(segment: string) {
  return SEGMENT_COLORS[segment] ?? DEFAULT_SEGMENT_COLOR
}

export function SegmentChip({ segment }: { segment: string }) {
  const tone = segmentTone(segment)
  return (
    <span style={{ ...styles.chip, background: tone.bg, color: tone.fg }}>
      {SEGMENT_LABELS[segment] ?? segment}
    </span>
  )
}

export function SegmentSelect({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
}) {
  // A legacy value not in SEGMENT_OPTIONS (e.g. 'saas_product' on an
  // untouched row) is added as an extra option so opening the dropdown
  // never silently jumps the lead to whatever option happens to be first.
  const knownOptions = SEGMENT_OPTIONS.some((o) => o.value === value)
    ? SEGMENT_OPTIONS
    : [{ value, label: SEGMENT_LABELS[value] ?? value }, ...SEGMENT_OPTIONS]
  const tone = segmentTone(value)

  return (
    <span style={styles.wrap} onClick={(e) => e.stopPropagation()}>
      <select
        style={{
          ...styles.select,
          background: tone.bg,
          color: tone.fg,
          ...(disabled ? styles.selectDisabled : {}),
        }}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Segment"
      >
        {knownOptions.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={11} color={tone.fg} style={styles.caret} />
    </span>
  )
}

const styles: Record<string, CSSProperties> = {
  chip: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  wrap: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
  },
  select: {
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    display: 'inline-block',
    padding: '2px 20px 2px 8px',
    borderRadius: 999,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  selectDisabled: {
    opacity: 0.6,
    cursor: 'default',
  },
  caret: {
    position: 'absolute',
    right: 6,
    pointerEvents: 'none',
  },
}
