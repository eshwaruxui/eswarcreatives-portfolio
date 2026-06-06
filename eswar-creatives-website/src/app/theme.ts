// ════════════════════════════════════════════════════════════════════
// Design System v1 — typed mirror of the CSS token layer.
//
// The single source of truth is src/styles/theme.css. This file holds NO
// colour/size VALUES — every entry is a `var(--token)` reference back to
// that file, so the two can never drift. Use it for inline styles in
// components that build style objects in JS (charts, motion, canvas, etc.):
//
//   import { theme } from '@/app/theme'
//   <div style={{ background: theme.bg.surface, color: theme.text.primary }} />
//
// For everyday markup prefer the Tailwind utilities generated from the same
// tokens (bg-bg-surface, text-text-primary, border-border-default, …).
// ════════════════════════════════════════════════════════════════════

const v = (name: string) => `var(--${name})`

// ── Palettes ────────────────────────────────────────────────────────
export const teal = {
  10: v('teal-10'), 50: v('teal-50'), 100: v('teal-100'), 200: v('teal-200'),
  300: v('teal-300'), 400: v('teal-400'), 450: v('teal-450'), 500: v('teal-500'),
  600: v('teal-600'), 700: v('teal-700'), 800: v('teal-800'), 900: v('teal-900'),
  950: v('teal-950'),
} as const

export const gold = {
  50: v('gold-50'), 100: v('gold-100'), 200: v('gold-200'), 300: v('gold-300'),
  400: v('gold-400'), 500: v('gold-500'), 600: v('gold-600'), 700: v('gold-700'),
} as const

export const neutral = {
  0: v('neutral-0'), 50: v('neutral-50'), 100: v('neutral-100'), 150: v('neutral-150'),
  200: v('neutral-200'), 250: v('neutral-250'), 300: v('neutral-300'), 400: v('neutral-400'),
  450: v('neutral-450'), 500: v('neutral-500'), 600: v('neutral-600'), 700: v('neutral-700'),
  800: v('neutral-800'), 900: v('neutral-900'),
} as const

export const ruby = {
  50: v('ruby-50'), 100: v('ruby-100'), 200: v('ruby-200'), 300: v('ruby-300'),
  400: v('ruby-400'), 500: v('ruby-500'), 600: v('ruby-600'), 700: v('ruby-700'),
  800: v('ruby-800'),
} as const

export const success = {
  50: v('success-50'), 100: v('success-100'), 200: v('success-200'), 300: v('success-300'),
  400: v('success-400'), 500: v('success-500'), 600: v('success-600'), 700: v('success-700'),
  800: v('success-800'),
} as const

export const warning = {
  50: v('warning-50'), 100: v('warning-100'), 200: v('warning-200'), 300: v('warning-300'),
  400: v('warning-400'), 500: v('warning-500'), 600: v('warning-600'), 700: v('warning-700'),
} as const

export const palette = { teal, gold, neutral, ruby, success, warning } as const

// ── Semantic · Background ───────────────────────────────────────────
export const bg = {
  page: v('bg-page'),
  subtle: v('bg-subtle'),
  muted: v('bg-muted'),
  surface: v('bg-surface'),
  raised: v('bg-raised'),
  overlay: v('bg-overlay'),
  inverse: v('bg-inverse'),
  inverseSubtle: v('bg-inverse-subtle'),
  sunken: v('bg-sunken'),
  tint1: v('bg-tint-1'),
  tint2: v('bg-tint-2'),
  tint3: v('bg-tint-3'),
  dark1: v('bg-dark-1'),
  dark2: v('bg-dark-2'),
  dark3: v('bg-dark-3'),
} as const

// ── Semantic · Border ───────────────────────────────────────────────
export const border = {
  subtle: v('border-subtle'),
  default: v('border-default'),
  medium: v('border-medium'),
  strong: v('border-strong'),
  emphasis: v('border-emphasis'),
  focus: v('border-focus'),
  brand: v('border-brand'),
  danger: v('border-danger'),
  success: v('border-success'),
  warning: v('border-warning'),
} as const

// ── Semantic · Text ─────────────────────────────────────────────────
export const text = {
  primary: v('text-primary'),
  secondary: v('text-secondary'),
  muted: v('text-muted'),
  disabled: v('text-disabled'),
  inverse: v('text-inverse'),
  onPrimary: v('text-on-primary'),
  onAccent: v('text-on-accent'),
} as const

// ── Semantic · Icon (21) ────────────────────────────────────────────
export const icon = {
  primary: v('icon-primary'),
  primaryHover: v('icon-primary-hover'),
  primaryActive: v('icon-primary-active'),
  primaryDisabled: v('icon-primary-disabled'),
  secondary: v('icon-secondary'),
  secondaryHover: v('icon-secondary-hover'),
  secondaryActive: v('icon-secondary-active'),
  secondaryDisabled: v('icon-secondary-disabled'),
  tertiary: v('icon-tertiary'),
  inverse: v('icon-inverse'),
  brand: v('icon-brand'),
  brandHover: v('icon-brand-hover'),
  brandActive: v('icon-brand-active'),
  brandDisabled: v('icon-brand-disabled'),
  danger: v('icon-danger'),
  success: v('icon-success'),
  warning: v('icon-warning'),
  interactive: v('icon-interactive'),
  interactiveHover: v('icon-interactive-hover'),
  interactiveActive: v('icon-interactive-active'),
  interactiveDisabled: v('icon-interactive-disabled'),
} as const

// ── Semantic · Skeleton ─────────────────────────────────────────────
export const skeleton = {
  base: v('skeleton-base'),
  highlight: v('skeleton-highlight'),
  border: v('skeleton-border'),
} as const

// ── Typography ──────────────────────────────────────────────────────
export const font = {
  heading: v('font-heading'),
  body: v('font-body'),
  mono: v('font-mono'),
} as const

export const fontSize = {
  xs: v('ds-text-xs'),
  sm: v('ds-text-sm'),
  base: v('ds-text-base'),
  md: v('ds-text-md'),
  lg: v('ds-text-lg'),
  xl: v('ds-text-xl'),
  '2xl': v('ds-text-2xl'),
  '3xl': v('ds-text-3xl'),
  '4xl': v('ds-text-4xl'),
} as const

export const fontWeight = {
  heading: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  body: { regular: 400, medium: 500, semibold: 600 },
} as const

// ── Radius ──────────────────────────────────────────────────────────
export const radius = {
  none: '0px',
  xs: '2px',
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '28px',
  full: '9999px',
} as const

// ── Elevation ───────────────────────────────────────────────────────
export const shadow = {
  sm: v('ds-shadow-sm'),
  base: v('ds-shadow'),
  md: v('ds-shadow-md'),
  lg: v('ds-shadow-lg'),
  xl: v('ds-shadow-xl'),
  '2xl': v('ds-shadow-2xl'),
  inner: v('ds-shadow-inner'),
  focusRing: v('ds-focus-ring'),
} as const

// ── Spacing · base-8 semantic groups ────────────────────────────────
export const space = {
  component: {
    gap: {
      xs: v('space-component-gap-xs'), sm: v('space-component-gap-sm'),
      md: v('space-component-gap-md'), lg: v('space-component-gap-lg'),
      xl: v('space-component-gap-xl'),
    },
    padding: {
      xs: v('space-component-padding-xs'), sm: v('space-component-padding-sm'),
      md: v('space-component-padding-md'), lg: v('space-component-padding-lg'),
      xl: v('space-component-padding-xl'), '2xl': v('space-component-padding-2xl'),
    },
  },
  layout: {
    section: {
      sm: v('space-layout-section-sm'), md: v('space-layout-section-md'),
      lg: v('space-layout-section-lg'), xl: v('space-layout-section-xl'),
    },
    stack: {
      xs: v('space-layout-stack-xs'), sm: v('space-layout-stack-sm'),
      md: v('space-layout-stack-md'), lg: v('space-layout-stack-lg'),
      xl: v('space-layout-stack-xl'),
    },
    inline: {
      xs: v('space-layout-inline-xs'), sm: v('space-layout-inline-sm'),
      md: v('space-layout-inline-md'), lg: v('space-layout-inline-lg'),
      xl: v('space-layout-inline-xl'),
    },
  },
  touch: { min: v('space-touch-min'), comfortable: v('space-touch-comfortable') },
  portal: { gutter: v('space-portal-gutter'), section: v('space-portal-section') },
  page: { gutter: v('space-page-gutter'), margin: v('space-page-margin'), max: v('space-page-max') },
} as const

// ── Aggregate ───────────────────────────────────────────────────────
export const theme = {
  palette, bg, border, text, icon, skeleton,
  font, fontSize, fontWeight, radius, shadow, space,
} as const

export type Theme = typeof theme
