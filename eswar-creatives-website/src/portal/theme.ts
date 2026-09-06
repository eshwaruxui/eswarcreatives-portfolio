// Phase 3 — portal Atelier theme tokens.
// Imported by LoginPage, ClientDashboard, ProposalView, and PortalGuard's
// loading screen so the palette lives in exactly one place.
import { getTenantTheme } from './tenant/getTenantTheme'
import { lightTint, subtleTint, midTint, darkShade, tintRgba } from './tenant/derivePalette'
import eswarLogo from '../imports/eswar-logo.svg'

// Phase 4 of the multi-tenant sprint: resolved once per module load, not per
// render — VITE_TENANT_ID is fixed at build time for a given deployment, so
// this is the same "compute once at import time" idiom every other constant
// in this file already uses.
const tenantTheme = getTenantTheme()

// Eswar's own hex/rgba literals throughout this file are audited against the
// Figma Design System Master and must render byte-identical to today
// regardless of this phase's wiring — every derived value below branches on
// isEswarPalette to guarantee that. An unresolved tenant (misconfigured
// VITE_TENANT_ID) falls back to the same branch: AdminShell already blocks
// the actual admin UI in that case (see useTenantConfig.tsx's error state),
// so the only surface this fallback reaches is public/login pages under a
// broken build — inheriting Eswar's palette there matches this app's
// behaviour from before tenants existed, rather than inventing a third,
// undesigned palette for a state that should never occur in production.
const isEswarPalette = !tenantTheme || tenantTheme.id === 'eswar'
const brandPrimary = isEswarPalette ? '#024C4F' : tenantTheme!.theme.primary
const brandGold = isEswarPalette ? '#D5B067' : tenantTheme!.theme.gold

// Colour/text roles that don't reduce to a clean formula from primary/gold
// (verified: tealLight is not a single-ratio mix of primary and white at any
// consistent ratio — it's its own Figma-sourced primitive, same for the
// others below). Each tenant with an audited Figma palette gets its own
// branch with real designer-picked values; any tenant without one yet falls
// back to derivePalette.ts's generic formula rather than inheriting a wrong
// hue by omission.
const derived = isEswarPalette
  ? {
      accent: '#007872', // teal-mid
      goldDark: '#8B6200',
      goldLight: '#FAF4EA',
      primaryLight: '#E0F7F6', // tealLight
      onAccent: '#4A2A00',
      nodeFill: '#009990', // icon/brand-subtle
      activeBorder: '#EDDDB5', // phaseUI status.active.border
    }
  : tenantTheme!.id === 'newgen'
  ? {
      // Figma-sourced (newgen-design-tokens-v1/🔗 Semantic Tokens.Light.tokens.json
      // + 🎨 Primitives.Mode 1.tokens.json, fileKey DRl9rzNzWKYhdVkOrGK8IK) —
      // Newgen has an audited palette, so these are real designer-picked
      // values rather than derivePalette.ts's generic formula, which produced
      // a grey-reading #C0D2D3 accent at 1.57:1 on white (below even the 3:1
      // non-text floor) and collapsed goldDark and onAccent onto one #756139.
      //
      // accent/nodeFill deliberately do NOT use the name-matching
      // icon/brand-subtle (teal.400 #14adb8): it measures 2.73:1 on white and
      // 2.57:1 on cream, failing the 3:1 non-text floor for the filled phase
      // nodes and connectors these roles paint. teal.450, the adjacent
      // darker step, measures 4.84:1 / 4.56:1, and being one step brighter
      // than primary (teal.500) it
      // preserves the primary/accent/nodeFill separation Eswar's branch has
      // (#024C4F / #007872 / #009990) rather than collapsing accent onto
      // primary.
      accent: '#077e87', // teal.450 — substituted for icon/brand-subtle (teal.400), which fails 3:1
      goldDark: '#7f5310', // brand/accent-dark, gold.700
      goldLight: '#f9f4e8', // brand/accent-subtle, gold.50
      primaryLight: '#e8f3f4', // brand/primary-tint-subtle, teal.50
      onAccent: '#492e09', // text/on-accent, gold.800
      nodeFill: '#077e87', // teal.450 — same substitution as accent above, for the same 3:1 reason
      activeBorder: '#eddbb8', // status/pending-border, gold.200 (Phase 2 = gold, not Newgen's teal "active" status)
    }
  : tenantTheme!.id === 'futurenorms'
  ? {
      // Figma-sourced (design-tokens/🔗 Semantic Tokens.Light.tokens.json +
      // 🎨 Primitives.Mode 1.tokens.json, fileKey HNcvu8LtGe4eAfM7R5fA61) —
      // FutureNorms has an audited palette, not the generic formula below.
      accent: '#5f449c', // icon/brand-subtle, violet.400
      goldDark: '#523e14', // brand/accent-dark, gold.700
      goldLight: '#fbf6e4', // brand/accent-subtle, gold.50
      primaryLight: '#ede6f9', // brand/primary-tint-subtle, violet.50
      onAccent: '#322711', // text/on-accent, gold.800
      nodeFill: '#5f449c', // icon/brand-subtle, violet.400
      activeBorder: '#ebd9a3', // status/pending-border, gold.200 (Phase 2 = gold, not her violet "active" status)
    }
  : {
      // Generic derivation — any tenant without an audited palette yet. See
      // derivePalette.ts for the exact ratios and why they're a reasonable
      // default rather than a design-reviewed one.
      accent: subtleTint(brandPrimary),
      goldDark: darkShade(brandGold),
      goldLight: lightTint(brandGold),
      primaryLight: lightTint(brandPrimary),
      onAccent: darkShade(brandGold),
      nodeFill: subtleTint(brandPrimary),
      activeBorder: midTint(brandGold),
    }

export const tokens = {
  // Page canvas. Was the warm cream #FAF8F4 ("Atelier cream") until 9 August
  // 2026, now Figma background/subtle (neutral.10). This is the single value
  // every page background in the portal resolves through, so changing it here
  // is what removes the cream everywhere rather than editing 74 call sites.
  bg:         isEswarPalette ? '#FAFAF9' : tenantTheme!.theme.cream,  // Figma background/subtle (neutral.10)
  surface:    '#FFFFFF',
  // Overlay-based neutral border (was a low-contrast teal tint #D8E8E8). A
  // semi-transparent near-black reads with consistent contrast on both the
  // white surfaces and the neutral page. See t.border.* for the full scale.
  border:     'rgba(10, 10, 23, 0.12)',
  primary:    brandPrimary,  // deep teal (Eswar) / tenant primary
  accent:     derived.accent,  // teal-mid (Eswar) / tenant accent step
  gold:       brandGold,
  goldDark:   derived.goldDark,
  goldLight:  derived.goldLight,
  text:       '#0A1A1B',
  textMuted:  '#3D6163',
  tealLight:  derived.primaryLight,  // Figma: brand/primary-tint-subtle, status/viewed-bg, phase/1-bg (teal.50, Eswar)
  ruby:       '#B00D2D',
  rubyLight:  '#FCEEF1',  // Figma: state/danger-subtle, status/declined-bg, phase/3-bg (ruby.50)
  // Figma's state/danger-text switches by mode: Light = {ruby.700} #820026 (dark
  // maroon, meant for on-light error copy), Dark = {ruby.300} #ee98a8 (this
  // value). Our actual usage is a caption on a permanently-dark card panel, so
  // the Dark-mode value is correct here — the Light value would be unreadable
  // on that panel. Figma has no mode-independent "on-dark danger text" token;
  // flagged for Eswar to add one if this role recurs.
  dangerText: '#ee98a8',  // Figma: state/danger-text (Dark mode) / ruby.300
  green:      '#1B6B4A',  // Figma: state/success, border/success, status/accepted-text (success.600)
  greenLight: '#E8F8F0',  // Figma: state/success-subtle, status/accepted-bg, status/paid-bg (success.50)
  // Matches the page canvas above, as it always has. Both were the cream
  // #FAF8F4 before 9 August 2026.
  inputBg:    isEswarPalette ? '#FAFAF9' : tenantTheme!.theme.cream,  // Figma background/subtle (neutral.10)
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
    primary:      '#111111',  // body text, headings, labels — Figma text/primary (neutral.900)
    primaryBrand: brandPrimary,  // interactive only: CTAs, links, active nav
    secondary:    '#555555',  // supporting text, subtitles — Figma text/secondary (neutral.600)
    tertiary:     '#717171',  // placeholder text, hints — Figma text/tertiary (neutral.500)
    // Figma spec is neutral.450 #888888, but that's 3.5:1 on white / 3.3:1 on
    // the cream `bg` — fails WCAG AA (4.5:1) at every size this role is
    // actually used at (10-14px timestamps/captions, not large text).
    // Darkened to the lightest grey that still clears AA on both surfaces;
    // sits close to `tertiary` as a result since there isn't much room
    // between AA-passing and `secondary` (#555555). Flagged for Eswar to
    // reconcile with Figma (neutral.450 needs the same fix upstream).
    // Shares the neutral.500 primitive with `tertiary` above. That's
    // intentional as of 8 Aug 2026 (Figma DS Master alignment) — two semantic
    // tokens may resolve to one primitive; keep both names, since the
    // distinction is semantic (role) not visual.
    // History: was Figma text/muted (neutral.450) #888888, which fails WCAG AA
    // at the 10-14px sizes this role is used at; darkened to #707070 on 6 Aug
    // as an interim fix, then re-aligned to neutral.500 here.
    // Contrast at #717171: 4.88:1 on surface white, 4.60:1 on the cream page,
    // 4.67:1 on background.subtle/raised — all clear the 4.5:1 AA floor. It
    // measures 4.47:1 on background.muted/sunken (#F5F5F4), 0.03 under the
    // floor; see COMPONENT_PATTERNS.md for that known exception.
    muted:        '#717171',  // timestamps, helper text, captions — Figma text/muted (neutral.500)
    disabled:     '#AAAAAA',  // disabled state text — Figma text/disabled (neutral.350)
    inverse:      '#FFFFFF',  // text on dark backgrounds
    onPrimary:    '#FFFFFF',  // text on teal primary buttons
    onAccent:     derived.onAccent,  // text on gold accent fills — Figma text/on-accent (gold.800); was #FFFFFF (unused, low contrast on gold)
    urlLink:      '#0A66C2',  // hyperlinks only — Figma text/url-link (Blue.500). Reverses an earlier deliberate teal-not-blue override; now intentionally matches Figma exactly per explicit request.
    // "On-dark" text roles: for content on permanently-dark surfaces (e.g. the
    // BeforeAfterCard Before panel) within an otherwise light-mode app.
    onDarkPrimary:   'rgba(244,245,247,0.90)',  // Figma text/on-dark-primary
    onDarkSecondary: 'rgba(223,225,228,0.65)',  // Figma text/on-dark-secondary
    onDarkTertiary:  'rgba(220,221,224,0.60)',  // Figma text/on-dark-tertiary
    onDarkMuted:     'rgba(234,235,238,0.74)',  // Figma text/on-dark-muted
    danger:          tokens.ruby,               // error/validation copy, alias of tokens.ruby (est. usage: LoginPage, SketchReviewPage)
  },
  border: {
    // Overlay-based neutral scale: semi-transparent near-black so borders keep
    // consistent contrast on white surfaces and the cream page (the old solid
    // greys washed out and looked invisible on light backgrounds).
    subtle:             'rgba(10,10,23,0.06)',  // lightest dividers, card outlines
    default:            'rgba(10,10,23,0.12)',  // standard input/card borders
    medium:             'rgba(10,10,23,0.18)',  // stronger dividers
    strong:             'rgba(10,10,23,0.30)',  // emphasis borders
    focus:              brandPrimary,           // focus ring on inputs
    overlaySubtle:      'rgba(10,10,23,0.04)',  // frosted/glass panels subtle edge
    overlayMedium:      'rgba(10,10,23,0.08)',  // panel borders on overlays
    overlayStrong:      'rgba(10,10,23,0.14)',  // modal/drawer borders
    overlay:            'rgba(10,10,23,0.20)',  // standard overlay border
    overlayExtraStrong: 'rgba(10,10,23,0.30)',  // high contrast overlay edge
    brand:              brandPrimary,           // active/selected states only
    danger:             '#B00D2D',              // error states — Figma border/danger (ruby.600)
    success:            '#1B6B4A',              // success states — Figma border/success (success.600)
    // Warning still reuses the gold/accent hue rather than Figma's dedicated
    // warning primitive scale (border/warning = warning.500 = #C45C00, a
    // saturated orange). This app has never had a distinct warning colour
    // family; flagged for Eswar to confirm before repointing the 3 live
    // usages (DeleteProposalModal, DeleteInvoiceModal, CandidateCard).
    warning:            brandGold,              // warning states
    // "On-dark" border roles: for content on permanently-dark surfaces.
    onDark:             'rgba(210,212,217,0.24)',  // Figma border/on-dark
    onDarkSubtle:       'rgba(210,212,217,0.30)',  // Figma border/on-dark-subtle
  },
  background: {
    // The body canvas, and only the canvas. White since 9 August 2026, having
    // been the warm cream #FAF8F4 and then briefly #FAFAF9 the same day.
    // Component surfaces are a separate concern and stay on `tokens.bg`
    // (#FAFAF9): chips, inputs and modal fills need to read as fills against
    // this canvas, so moving them here would flatten them into it.
    // `StickyBar` and `FadeOverflow` both resolve their colour from this
    // token, which is what keeps the footer and the fade matching the canvas
    // without either of them naming a hex.
    page:           '#FFFFFF',              // body canvas, Figma background/page (neutral.0)
    subtle:         '#FAFAF9',              // subtle section bg — Figma background/subtle (neutral.10)
    muted:          '#F5F5F4',              // muted fills — Figma background/muted (neutral.50)
    surface:        '#FFFFFF',              // card/panel surfaces
    raised:         '#FAFAF9',              // elevated cards — Figma background/raised (neutral.10)
    sunken:         '#F5F5F4',              // inset areas — Figma background/sunken (neutral.50)
    tint1:          tintRgba(brandPrimary, 0.04),   // tinted fills
    tint2:          tintRgba(brandPrimary, 0.08),
    tint3:          tintRgba(brandPrimary, 0.12),
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
    // Permanently-dark surfaces (cards, panels) within an otherwise light-mode
    // app — e.g. the BeforeAfterCard Before panel.
    dark1:      '#555555',  // Figma background/dark-1 (neutral.600)
    dark2:      '#3A3A3A',  // Figma background/dark-2 (neutral.700)
    dark3:      '#222222',  // Figma background/dark-3 (neutral.800)
    // Warm-cream card surfaces. These stay warm deliberately: they are the
    // only cream left in the portal now that page/inputBg are neutral.
    cardWarm:   '#F5F0E6',  // Figma background/card-warm (warm.50)
    subtleWarm: '#E8DCC4',  // Figma background/subtle-warm (warm.200)
    success:    tokens.greenLight,  // success/confirmation surfaces, alias of tokens.greenLight
  },
} as const

export const fonts = {
  heading: isEswarPalette ? "'Fraunces', Georgia, 'Times New Roman', serif" : tenantTheme!.theme.fontHeading,
  body:    isEswarPalette ? "'Inter', system-ui, -apple-system, sans-serif" : tenantTheme!.theme.fontBody,
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
  draft:    { bg: '#F5F5F4',         fg: tokens.textMuted, label: 'Draft' },  // bg: Figma status/draft-bg (neutral.50)
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
  nodeFill: derived.nodeFill, // icon/brand-subtle: done + active node circles and the joining connector
  status: {
    done:    { bg: '#E8F8F0', border: '#A8E2C4', label: 'Done' },     // state/success-subtle + success-border
    active:  { bg: tokens.goldLight, border: derived.activeBorder, label: 'Active' },   // status/sent-bg + sent-border
    pending: { bg: '#F5F5F4', border: '#E5E5E4', label: 'Pending' },  // status/draft-bg + draft-border
  },
} as const

// Multi-tenant sprint, Phase 4 — theme.ts now consumes tenantTheme directly
// (see isEswarPalette/brandPrimary/brandGold/derived above), so tokens/t/
// fonts resolve per-tenant without any change to their ~360 existing call
// sites. Still exported for the few places that need tenant-specific content
// theme.ts's colour/font tokens can't express — see brandName/brandLogo below.
export { tenantTheme }

// The wordmark text and logo image are literal content, not colour/font
// tokens, so they can't be folded into tokens/t/fonts above. Eswar's own
// values stay the exact literals live today ('EswarCreatives', no space —
// tenantTheme.name is 'Eswar Creatives', with a space, which would be a
// visible wordmark change for a phase that must not have one). Every other
// tenant reads its own config directly.
export const brandName = isEswarPalette ? 'EswarCreatives' : tenantTheme!.name
export const brandLogo = isEswarPalette ? eswarLogo : tenantTheme!.theme.logo

export type PhaseState = keyof typeof phaseUI.status
