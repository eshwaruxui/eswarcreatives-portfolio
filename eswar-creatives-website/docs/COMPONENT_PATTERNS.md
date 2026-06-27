# Eswar Creatives Portal - Component Patterns

Last updated: 25 June 2026.

---

## Image Loading Pattern

### Rule
All image rendering across the portal must use the shared ProgressiveImage component and useImagePriority hook. Never use raw img tags for remote images.

### Components
- src/portal/components/shared/ProgressiveImage.tsx
- src/portal/hooks/useImagePriority.ts

### ProgressiveImage props
- src: string - full-size URL
- thumbnailSrc?: string - optional low-res placeholder
- alt: string
- priority?: boolean - cancels other loads, fetches first
- shimmerHeight?: number - matches container height
- variant?: 'light' | 'dark' - shimmer palette, default 'light'
- loader?: ImagePriorityApi - optional shared loader so several images on one surface share a cache and abort scope
- fit?: 'contain' | 'cover' - object-fit for the image, default 'contain'
- radius?, className?, style?, imgStyle? - styling passthrough (a height in style reserves the box)

### useImagePriority returns
- loadImage(url, priority) - fetch with AbortController
- cancelCurrent() - abort in-progress fetch
- preloadNext(url) - background preload next 1 only
- getCached(url) - read an already-loaded object URL without starting a fetch

### Shimmer tokens
- variant 'light' (default): t.background.subtle + t.background.muted
- variant 'dark': t.background.overlayLight + t.background.overlayLightStrong
- The overlay* dark tokens are near-black and vanish on a dark stage, so dark surfaces use the white-alpha overlayLight tokens instead
- Animation: 1.5s infinite linear gradient sweep
- No raw hex values

### Fade-in on load
- motionTokens.base (200ms) opacity 0 to 1

### Supabase image transforms
- Requires Supabase Pro plan
- Currently on Free plan - do NOT use transform URLs
- Bucket is private - use createSignedUrl not getPublicUrl
- When upgraded to Pro: width 1920, quality 80, WebP auto for display. width 120, quality 60 for thumbnails. Omit format field (WebP is default).
- Track this as a Phase 6 upgrade item.

### Current usages
- ClientLightbox (mockup lightbox) - primary implementation, variant 'dark' on the dark stage
- ClientConceptSetPanel - sketch thumbnails, light background (default 'light')

### Adding new image surfaces
Before using an img tag anywhere in the portal, check this doc first and use ProgressiveImage instead.

---

## Responsive Breakpoint Pattern

### Rule
All responsive logic across the client portal must use the shared useBreakpoint hook. Never use ad-hoc `window.innerWidth` checks inline in components.

### Hook
- `src/portal/hooks/useBreakpoint.ts`
- Returns: `{ isMobile, isTablet, isDesktop }`
- Breakpoints: mobile < 768px, tablet 768-1024px, desktop > 1024px

### Usage
```ts
const { isMobile } = useBreakpoint()
```

Panel behaviour on mobile:
- Right-side slide-in panels (ClientProposalPanel, ClientConceptSetPanel) become full-screen overlays
- Width: 100vw, height: 100vh
- Close via X button or swipe down

### Status
- Planned for Phase 6
- Hook not yet created — create it before any responsive work begins

---

## Accordion / Expand Chevron Pattern

### Rule
All chevron icons used for expand/collapse must follow this state pattern:
- Collapsed state: t.text.muted
- Expanded state: t.text.primaryBrand
- Rotation: 90deg when expanded (for the rotating ChevronRight variant)
- Transition: motionTokens.fast (120ms) for both color and rotation simultaneously
- Never use raw hex for chevron color

A down/right or up/down icon swap is an accepted alternative to rotation (it
already conveys the 90deg state change); the color rule still applies to it.

### Current usages
- ProposalAccordion (phase rows, solution rows) - rotating ChevronRight; the
  shared chevronOpen style carries both the rotation and the brand color.
- ClientCampaigns (campaign history rows) - ChevronRight/ChevronDown swap.
- AdminSketchUpload (sketch set rows, campaign rows) - ChevronUp/ChevronDown swap.

Note: ClientConceptSetPanel and ClientProposalPanel have no expand chevrons of
their own (ClientProposalPanel renders the proposal through ProposalAccordion).

### Adding new expandable surfaces
Any new accordion or expand/collapse pattern must follow this spec before
shipping.

---

## Text Color Token Rule

### Rule
All text colors across the portal must use t.text.* semantic tokens only. No raw
hex, no tokens.n* values for text.

### Token hierarchy
- t.text.primary (neutral/900): headings, labels, key data, amounts
- t.text.secondary (neutral/600): body, descriptions
- t.text.tertiary (neutral/500): supporting, metadata
- t.text.muted (neutral/450): hints, placeholders, timestamps, captions
- t.text.disabled (neutral/350): disabled states only

White text on a teal/brand fill uses t.text.onPrimary (not a raw hex).

### Never use for text
- Raw hex values
- tokens.n* directly
- Any color not in the t.text.* map

Note: the legacy flat tokens.text / tokens.textMuted are teal-tinted and must not
be used for text; teal character belongs on interactive elements only. The
ClientLightbox is an intentionally self-contained dark surface with its own local
palette and is exempt.

---

## Standing rules
- No em dashes in any component copy or code
- No raw hex outside theme.ts
- All colors from t.* semantic tokens or tokens.*
- motionTokens for all transitions
