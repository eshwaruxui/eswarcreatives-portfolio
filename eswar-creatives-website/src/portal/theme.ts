// Phase 3 — portal Atelier theme tokens.
// Imported by LoginPage, ClientDashboard, ProposalView, and PortalGuard's
// loading screen so the palette lives in exactly one place.

export const tokens = {
  bg:         '#FAF8F4',  // cream
  surface:    '#FFFFFF',
  // Overlay-based neutral border (was a low-contrast teal tint #D8E8E8). A
  // semi-transparent near-black reads with consistent contrast on both the
  // white surfaces and the cream page. See t.border.* for the full scale.
  border:     'rgba(10, 10, 23, 0.12)',
  primary:    '#024C4F',  // deep teal
  accent:     '#007872',  // teal-mid
  gold:       '#D5B067',
  goldDark:   '#8B6200',
  goldLight:  '#FDF6E8',
  text:       '#0A1A1B',
  textMuted:  '#3D6163',
  tealLight:  '#EAF3F3',
  ruby:       '#B00D2D',
  rubyLight:  '#FCE9EE',
  dangerText: '#ee98a8',  // Figma: state/danger-text (teal primitive scale equivalent to be confirmed)
  green:      '#1B5E20',
  greenLight: '#E6F4EA',
  inputBg:    '#FAF8F4',
} as const

// EC Design System semantic tokens (canonical Figma mapping).
// Separate from the legacy flat `tokens` above to avoid colliding with the
// existing string-valued `tokens.text` / `tokens.border` keys. Use these for
// all new/audited work: `t.text.primary`, `t.border.default`, etc.
// Rules:
//   - Static text never uses brand/teal; use t.text.* neutrals.
//   - Brand teal (t.text.primaryBrand / t.border.brand) only on interactive
//     elements: CTAs, links, active nav, selected states, focus rings.
export const t = {
  text: {
    primary:      '#1A1A1A',  // body text, headings, labels
    primaryBrand: '#024C4F',  // interactive only: CTAs, links, active nav
    secondary:    '#4B5563',  // supporting text, subtitles
    tertiary:     '#6B7280',  // placeholder text, hints
    muted:        '#9CA3AF',  // timestamps, helper text, captions
    disabled:     '#D1D5DB',  // disabled state text
    inverse:      '#FFFFFF',  // text on dark backgrounds
    onPrimary:    '#FFFFFF',  // text on teal primary buttons
    onAccent:     '#FFFFFF',  // text on accent fills
    urlLink:      '#024C4F',  // hyperlinks only
  },
  border: {
    // Overlay-based neutral scale: semi-transparent near-black so borders keep
    // consistent contrast on white surfaces and the cream page (the old solid
    // greys washed out and looked invisible on light backgrounds).
    subtle:             'rgba(10,10,23,0.06)',  // lightest dividers, card outlines
    default:            'rgba(10,10,23,0.12)',  // standard input/card borders
    medium:             'rgba(10,10,23,0.18)',  // stronger dividers
    strong:             'rgba(10,10,23,0.30)',  // emphasis borders
    focus:              '#024C4F',              // focus ring on inputs
    overlaySubtle:      'rgba(10,10,23,0.04)',  // frosted/glass panels subtle edge
    overlayMedium:      'rgba(10,10,23,0.08)',  // panel borders on overlays
    overlayStrong:      'rgba(10,10,23,0.14)',  // modal/drawer borders
    overlay:            'rgba(10,10,23,0.20)',  // standard overlay border
    overlayExtraStrong: 'rgba(10,10,23,0.30)',  // high contrast overlay edge
    brand:              '#024C4F',              // active/selected states only
    danger:             '#C0392B',              // error states
    success:            '#1B5E20',              // success states
    warning:            '#D5B067',              // warning states
  },
  background: {
    page:           '#FAF8F4',              // page background
    subtle:         '#F9FAFB',              // subtle section bg
    muted:          '#F3F4F6',              // muted fills
    surface:        '#FFFFFF',              // card/panel surfaces
    raised:         '#FFFFFF',              // elevated cards
    sunken:         '#F3F4F6',              // inset areas
    tint1:          'rgba(2,76,79,0.04)',   // tinted fills
    tint2:          'rgba(2,76,79,0.08)',
    tint3:          'rgba(2,76,79,0.12)',
    overlaySubtle:  'rgba(10,10,23,0.04)',  // overlay layers
    overlayNormal:  'rgba(10,10,23,0.08)',
    overlayMedium:  'rgba(10,10,23,0.18)',
    overlayDark:    'rgba(10,10,23,0.40)',
    overlayStrong:  'rgba(10,10,23,0.70)',
    scrim:          'rgba(10,10,23,0.60)',  // modal backdrop
    // Light (white-alpha) overlays for content on dark surfaces, e.g. the
    // mockup lightbox shimmer. The overlay* tokens above are dark and vanish on
    // a near-black stage, so these read as a soft grey instead.
    overlayLight:       'rgba(255,255,255,0.06)',
    overlayLightStrong: 'rgba(255,255,255,0.12)',
  },
} as const

export const fonts = {
  heading: "'Fraunces', Georgia, 'Times New Roman', serif",
  body:    "'Inter', system-ui, -apple-system, sans-serif",
} as const

// Motion tokens — the single source of truth for portal transitions.
// Rules (applied across every portal screen):
//   - Interactive elements (buttons, badges, tabs): durationFast + easeDefault
//   - Panels sliding in/out: durationBase + easeEnter / easeExit
//   - Page-level transitions: durationSlow + easeDefault
//   - Lightbox open/close: durationSlow + easeEnter
//   - Never animate layout properties (width/height); transform + opacity only.
export const motionTokens = {
  durationFast: '120ms',
  durationBase: '200ms',
  durationSlow: '350ms',
  easeDefault: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeEnter: 'cubic-bezier(0, 0, 0.2, 1)',
  easeExit: 'cubic-bezier(0.4, 0, 1, 1)',
} as const

// Status pill palette — used by ClientDashboard list rows and ProposalView header.
// Keys match the proposal_status enum from migration 0011.
export const statusPalette: Record<
  'draft' | 'sent' | 'viewed' | 'accepted' | 'declined',
  { bg: string; fg: string; label: string }
> = {
  draft:    { bg: '#F0EEEA',         fg: tokens.textMuted, label: 'Draft' },
  sent:     { bg: tokens.goldLight,  fg: tokens.goldDark,  label: 'New' },
  viewed:   { bg: tokens.tealLight,  fg: tokens.primary,   label: 'Reviewing' },
  accepted: { bg: tokens.greenLight, fg: tokens.green,     label: 'Accepted' },
  declined: { bg: tokens.rubyLight,  fg: tokens.ruby,      label: 'Declined' },
}

// Phase tag palette — Phase 1 teal, Phase 2 gold, Phase 3 ruby.
// Used for the phase tags in ProposalView and the left-border accent
// on individual solution rows.
export const phasePalette: Record<
  number,
  { bg: string; fg: string; border: string }
> = {
  1: { bg: tokens.tealLight,  fg: tokens.primary,  border: tokens.accent },
  2: { bg: tokens.goldLight,  fg: tokens.goldDark, border: tokens.gold },
  3: { bg: tokens.rubyLight,  fg: tokens.ruby,     border: tokens.ruby },
}

// Hi-fi client-dashboard project stepper — values taken from the EC Design
// System master (Figma node 4149:31). nodeFill is the brand-subtle teal used
// for completed/active phase nodes and connectors; the status palette drives
// the per-phase Done / Active / Pending pills. Badge label text uses
// t.text.primary. Raw hex is allowed here because this IS the token source.
export const phaseUI = {
  nodeFill: '#009990', // icon/brand-subtle: done + active node circles and the joining connector
  status: {
    done:    { bg: '#E8F8F0', border: '#A8E2C4', label: 'Done' },     // state/success-subtle + success-border
    active:  { bg: '#FAF4EA', border: '#EDDDB5', label: 'Active' },   // status/sent-bg + sent-border
    pending: { bg: '#F5F5F4', border: '#E5E5E4', label: 'Pending' },  // status/draft-bg + draft-border
  },
} as const

export type PhaseState = keyof typeof phaseUI.status
