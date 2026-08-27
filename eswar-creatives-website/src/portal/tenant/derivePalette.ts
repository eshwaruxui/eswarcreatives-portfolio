// Phase 4 of the multi-tenant sprint: palette derivation for tenants with no
// hand-tuned Figma palette yet. Eswar's own tokens.ts literals are audited
// against the Figma Design System Master and are NEVER run through these
// formulas (see theme.ts's isEswarPalette branch) — a generic mix formula
// does not reproduce them. tealLight (#E0F7F6), for instance, is not a
// single-ratio mix of primary (#024C4F) and white at any consistent ratio;
// it is its own Figma-sourced primitive. These helpers exist so a tenant
// with only two declared brand colors (TenantTheme.primary/gold) gets a
// coherent set of tints and shades instead of inheriting Eswar's literal
// teal/gold by omission. Reasonable defaults, not design-reviewed ones — a
// future tenant is free to hand-tune a real palette later, the same way
// Eswar's own values were.

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

// Mixes `hex` toward `toward` by `ratio` (0 = hex unchanged, 1 = toward unchanged).
function mix(hex: string, toward: string, ratio: number): string {
  const [r1, g1, b1] = hexToRgb(hex)
  const [r2, g2, b2] = hexToRgb(toward)
  return rgbToHex(r1 + (r2 - r1) * ratio, g1 + (g2 - g1) * ratio, b1 + (b2 - b1) * ratio)
}

// Exact, not approximate — rgba(primary, alpha) IS what tokens.tint1/2/3
// already are today (rgba(2,76,79,...) is literally primary's own RGB).
// Safe to use for every tenant, including Eswar.
export function tintRgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

// Pale background tint — teal.50/gold.50-equivalent. 90% toward white.
export function lightTint(hex: string): string {
  return mix(hex, '#FFFFFF', 0.9)
}

// Saturated-but-light "brand-subtle" tint — phaseUI.nodeFill/accent-equivalent.
// 75% toward white: more saturated than lightTint, still far lighter than the base.
export function subtleTint(hex: string): string {
  return mix(hex, '#FFFFFF', 0.75)
}

// Mid tint, between lightTint and the base color — phase-active-border-equivalent.
// 80% toward white.
export function midTint(hex: string): string {
  return mix(hex, '#FFFFFF', 0.8)
}

// Dark, readable-as-text shade — goldDark/onAccent-equivalent. 45% toward black.
export function darkShade(hex: string): string {
  return mix(hex, '#000000', 0.45)
}
