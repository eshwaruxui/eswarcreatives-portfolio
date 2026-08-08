# Eswar Creatives Portal - Component Patterns

Last updated: 8 August 2026 (added the Overflow Fade pattern for `FadeOverflow`,
plus a Planned stub for Pagination / usePagination).

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
- Shipped in Phase 6 (`feature/phase6-mobile-responsive`)
- Hook lives at `src/portal/hooks/useBreakpoint.ts` — matchMedia-backed, no polling

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

## Overflow Fade Pattern

### Rule
When a value can outrun its container and clipping it mid-character would read as
a bug rather than as truncation, wrap it in the shared FadeOverflow component.
The trailing edge then fades into the surface behind it, which reads as
"continues past here".

### Component
- `src/portal/components/shared/FadeOverflow.tsx`

### Props
- `direction`: `'horizontal' | 'vertical'`, default `'horizontal'`
- `width`: number (px), default 48. Size of the fade on the horizontal axis.
- `height`: number (px), default 32. Size of the fade on the vertical axis.
- `surfaceVar`: string, default `'--surface-page'`. Name of a CSS custom
  property to use as the gradient endpoint.
- `style`: CSSProperties. Escape hatch for the wrapper, typically a `maxWidth`
  so the fade has something to clip against.

### Gradient endpoint
The endpoint is emitted as `var(--surface-page, <t.background.page>)`: a CSS
custom property with a JS token fallback. Never a hardcoded hex.

### Gotcha: the portal has zero CSS custom properties
`theme.ts` exports plain JS objects (`tokens`, `t`) and nothing under
`src/portal` declares `--surface-page` or any other custom property. A bare
`var(--surface-page)` is therefore an invalid gradient stop, and CSS drops the
entire `background` declaration when any stop is invalid. The component would
render with no fade at all, silently, with nothing in the console. Always
include the token fallback. The `var()` form is kept anyway so the component
defers to a custom property automatically if the portal ever grows one.

### Match the fallback to what is actually behind the element
The default is `t.background.page` (the cream admin content area). On a white
card, pass `t.background.surface` instead, or the fade will resolve to a
near-miss colour that reads as a smudge.

### Current usages
- `ActivityTab` status cell, horizontal only, on the **approved** variant. Both
  of its lines are nowrap and the scheduled one can outrun a narrow Status
  column. Capped at `maxWidth: 190`, a measured value: at a 1280px viewport the
  table wrapper is 961px, and 190 is the widest cap that brings the table to
  exactly 961px with zero horizontal scroll.
- Do **not** apply it to the "Awaiting approval" rows in that same cell. That
  string is two short words, never overflows, and a fade there is noise.

### Usage
```tsx
<FadeOverflow style={{ maxWidth: 190 }}>
  <span style={{ whiteSpace: 'nowrap' }}>{longValue}</span>
</FadeOverflow>
```

---

## Pagination Pattern (Planned)

### Status
**Not built yet.** Stub only, to be completed in a later session once
`Pagination` and `usePagination` actually exist. Do not cite this section as a
pattern to follow until it is filled in, and do not treat the paths below as
real: nothing lives at them today.

### Intended shape
- `src/portal/components/shared/Pagination.tsx` (planned)
- `src/portal/hooks/usePagination.ts` (planned)

### To be decided when built
- Page-number controls vs. load-more vs. infinite scroll, and whether one
  component covers all three
- Where page state lives: local state, URL query param, or both
- How it composes with the existing `useReloadableList` hook, which already
  distinguishes first load from background refresh
- How it composes with `SortableTableHeader`'s multi-column sort, since sorting
  currently happens client-side over an already-fetched window
- Whether the row cap moves server-side. `ActivityTab` currently fetches a flat
  `limit(200)` and filters client-side, which is the most likely first caller.

---

## Standing rules
- No em dashes in any component copy or code
- No raw hex outside theme.ts
- All colors from t.* semantic tokens or tokens.*
- motionTokens for all transitions
