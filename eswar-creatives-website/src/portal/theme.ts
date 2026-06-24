// Phase 3 — portal Atelier theme tokens.
// Imported by LoginPage, ClientDashboard, ProposalView, and PortalGuard's
// loading screen so the palette lives in exactly one place.

export const tokens = {
  bg:         '#FAF8F4',  // cream
  surface:    '#FFFFFF',
  border:     '#D8E8E8',
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
    subtle:             '#F3F4F6',              // lightest dividers, card outlines
    default:            '#E5E7EB',              // standard input/card borders
    medium:             '#D1D5DB',              // stronger dividers
    strong:             '#9CA3AF',              // emphasis borders
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
