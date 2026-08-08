# Eswar Creatives Portal - Component Patterns

Last updated: 8 August 2026 (the Pagination stub replaced with the real
Pagination pattern now that `Pagination` and `usePagination` exist, plus a new
Table Skeleton Row pattern for `SkeletonRow`. Earlier the same day: the
Overflow Fade pattern for `FadeOverflow`, the Outreach Touch Approve / Preview
pattern, and the `t.text.muted` token aligned to #717171 / neutral/500,
sharing a primitive with tertiary).

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
- t.text.muted (#717171, neutral/500): hints, placeholders, timestamps, captions
- t.text.disabled (neutral/350): disabled states only

Note on t.text.muted: value #717171, primitive neutral/500. It **shares that
primitive with t.text.tertiary**, which is intentional as of 8 August 2026
(Figma DS Master alignment). Two semantic tokens resolving to one primitive is
valid: keep both names and pick by role, because the distinction is semantic,
not visual. The two are indistinguishable on screen, so never choose between
them expecting a contrast difference.

Do **not** "fix" muted back to neutral/450 (#888888). That value fails WCAG AA
at the 10-14px sizes this role is actually used at (timestamps, captions,
helper text, which are normal text not large text): 3.5:1 on white and 3.3:1 on
the cream page, against a 4.5:1 floor. History is #888888, then #707070 as an
interim WCAG fix on 6 August 2026, then #717171 on 8 August.

Measured contrast at #717171: 4.88:1 on surface white, 4.60:1 on the cream page
(t.background.page), 4.67:1 on t.background.subtle/raised. All clear AA.

**Known exception:** on t.background.muted / t.background.sunken (#F5F5F4) it
measures **4.47:1, which is 0.03 under the AA floor**. The interim #707070
cleared it at 4.54:1, so aligning to neutral/500 gave this up. It is a hairline
miss rather than a visible legibility problem, and it was accepted knowingly in
exchange for design-system alignment. If muted text on a sunken or muted fill
ever needs to be strictly compliant, the fix is to darken that one surface or
use t.text.secondary there, not to un-align the token.

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

## Outreach Touch Approve / Preview Pattern

### Rule
There is exactly **one** approve path and **one** email preview modal in the
outreach module. Never reimplement either per tab. Any surface that needs to
approve or preview a scheduled touch imports these:

- `src/portal/hooks/useConfirmScheduledTouch.ts`
- `src/portal/components/shared/TouchPreviewModal.tsx`
- `src/portal/components/shared/TouchProgressLine.tsx`

### Why this is a rule and not a suggestion
TodayTab and ActivityTab each carried their own private copy of the approve
hook, and the copies silently drifted. ActivityTab kept a "Confirm and Send"
label and toasted "Email sent successfully" for weeks after TodayTab was
corrected, and it rendered Approve on rows that were already approved, so a
second click could reschedule a correct send. Consolidated 8 August 2026. If
you find yourself writing a second copy, that is the bug.

### useConfirmScheduledTouch
Returns `{ confirming, errors, confirm }`; `confirm(touchId)` resolves to a
boolean so a caller knows whether to close a modal.

**Critical:** `confirm-scheduled-touch` **approves and holds. It never sends.**
It stamps `draft_confirmed_at` and moves `scheduled_for` to the recipient's
next business-hours window; the Resend call happens later, on the 5 minute
`send-confirmed-outreach-touches` cron tick. No caller may report "sent" here.
That false claim is exactly what the consolidation removed.

### TouchPreviewModal
Callers pass `touch`, `canApprove`, `onApprove`, and optionally `onSaved` /
`approveError`. It deliberately does **not** own the approve call: the caller
supplies its own `onApprove` (from the hook above) so results land in that
screen's row state and toast, and the server-side `already_approved` guard
stays the single authority on double approves.

Gate `canApprove` on `draft_confirmed_at` being null, the same condition a
row-level Approve button uses. `PREVIEW_TOUCH_SELECT` is exported so every
caller fetches the same column shape; a narrow list query must top up through
it before opening the modal.

Behaviour that must not be "simplified" away: a non-null `subject_snapshot` /
`body_snapshot` beats re-rendering the template (otherwise a manual edit is
silently discarded), and `step_id` stays intact on save (nulling it once broke
every other consumer of `touch.step`, including step labels and the next due
step filter).

### TouchProgressLine
`layout` prop: `'inline'` (default, single line) or `'stacked'` (two lines, no
arrow). Use `'stacked'` in table rows and narrow cards; the inline variant is
nowrap and will set the row width, which is what pushed ActivityTab's action
buttons off screen. Stop rendering it once a touch reaches `status: 'sent'`.

---

## Pagination Pattern

### Rule
Any admin list long enough to page must use the shared `Pagination` component
and `usePagination` hook. Never hand-roll page state or page controls per
screen.

### Components
- `src/portal/components/shared/Pagination.tsx`
- `src/portal/hooks/usePagination.ts`

### The one ordering rule: sort first, then slice
`paginatedSlice()` takes an **already sorted** array. Slicing before sorting
would order only the visible window, so page 2 would hold rows that belong on
page 1. Every caller reads:

```tsx
const sorted = applySorting(filtered, sorts)
const {
  currentPage, pageSize, paginatedSlice, goToPage, changePageSize,
  reset: resetPage, pageStart, pageEnd,
} = usePagination(sorted.length, 25)
const pageRows = paginatedSlice(sorted)
```

### usePagination

`usePagination(totalItems: number, initialPageSize = 25)` returns:

| Name | Type | Notes |
|---|---|---|
| `currentPage` | number | Already clamped, see below |
| `pageSize` | number | |
| `totalPages` | number | Floor of 1, never 0 |
| `paginatedSlice` | `<T>(items: T[]) => T[]` | Pass the sorted array |
| `goToPage` | `(page: number) => void` | |
| `changePageSize` | `(size: number) => void` | Resets to page 1 |
| `reset` | `() => void` | Call on filter, search and sort change |
| `pageStart` / `pageEnd` | number | 1-indexed inclusive, both 0 when empty |

**`currentPage` is derived, not raw state.** The hook returns
`min(state, totalPages)`, so a list that shrinks underneath the user renders
the real last page instead of an empty table, and the slice can never disagree
with the count label. This matters in practice: `ActivityTab` polls every 30s
and can come back with fewer rows, and a lead can be deleted from its drawer.
State is pulled back in line by an effect, never during render.

### Where the reset call goes

Call `reset()` on anything that changes how many rows there are: every filter,
the search box, and both sort entry points (column headers and the mobile sort
sheet). Two placement rules that are not obvious:

- **Not inside `load()`.** `ActivityTab` and `TodayTab` call `load()` from a
  30s background poll. A reset there yanks the user back to page 1 every 30
  seconds mid-read. Put it in the filter effect instead.
- **Below the `usePagination` call, not beside the other effects.** Listing
  `resetPage` in the deps array of an effect declared earlier reads it before
  the hook has returned it, which is a temporal dead zone crash. `LeadsTab`
  keeps its reset effect directly under the hook for exactly this reason.

### Pagination props

| Prop | Default | Notes |
|---|---|---|
| `totalItems` | required | Length of the sorted array, not the page |
| `pageSize` / `currentPage` | required | From the hook |
| `onPageChange` | required | Wire to `goToPage` |
| `pageStart` / `pageEnd` | required | From the hook, so the label cannot drift |
| `pageSizeOptions` | `[10, 25, 50, 100]` | |
| `onPageSizeChange` | - | Selector is hidden unless this is passed |
| `showPageSizeSelector` | `true` | |
| `showItemCount` | `true` | |
| `itemLabel` | `'items'` | Pass the plural noun, e.g. `'touches'` |
| `isLoading` | `false` | Disables every control at opacity 0.5 |

Also exports `pageList(current, total)`, the ellipsis algorithm, so it can be
tested or reused without the component.

### Ellipsis pattern
Always shows first, last, current and current +/- 1, collapsing the rest. That
caps the run at five number buttons: `1 ... 4 5 6 ... 12`. Near an end there
are simply fewer buttons (`1 2 ... 7`); five is a ceiling, not a quota.

### Edge cases, all verified live
- **0 items:** the component returns `null`. The caller's own empty state shows
  instead. Do not wrap it in a second emptiness check.
- **Fits on one page:** the bar collapses to the count line only. No nav
  buttons, no page size selector. **Consequence worth knowing:** with 39 rows
  at 50 per page you cannot reduce the page size, because the selector is part
  of the hidden bar. Widen the result set first.
- **Last page short:** renders only the real rows. Never pad with placeholders.
- **Filter applied while deep in the list:** `reset()` handles it; the derived
  `currentPage` clamp is the backstop if a caller forgets.
- **Rapid clicks:** page changes are synchronous array slices, so there is no
  in-flight window to double-trigger. `isLoading` exists for callers that later
  move paging server-side.

### Deliberately not animated
The bar does not animate on a page change. The bar staying still is what makes
the content above it read as the thing that changed; animating both at once
reads as the whole screen reloading. Page buttons animate on hover and active
only, via `motionTokens.durationFast`.

### Client-side only
Every current caller already holds its rows in memory, so paging is an array
slice with no request behind it. There is no loading state to show and no
flash to guard against on a page change. `ActivityTab` still fetches a flat
`limit(200)`, so its "of 174 touches" is "of what was fetched", not of every
touch in the database. That understates the total once the table passes 200
rows, which is the point at which paging should move server-side.

### Current usages
- `ActivityTab`, `LeadsTab`, `EnquiriesTab`, all at 25 per page.

---

## Table Skeleton Row Pattern

### Rule
For the first load of a list that renders as a `<table>`, render N
`SkeletonRow`s inside the real `<thead>`. Do not swap the whole table for a
spinner or a "Loading..." string: keeping the header and column rhythm on
screen means nothing jumps when the real rows arrive.

### Component
- `src/portal/components/shared/SkeletonRow.tsx`

### Props
- `columns`: number. Pass the column array's length, never a literal.
- `height`: number (px), default 48.
- `animate`: boolean, default true.

### It composes Skeleton, it does not restate it
`Skeleton.tsx` owns the gradient, the `ecShimmer` keyframe and the timing, and
that same keyframe name is also emitted by `ProgressiveImage` and
`ClientDashboard`. A second definition would either collide with those or
drift from them, so `SkeletonRow` renders `<td>`s containing `Skeleton`.

If you are tempted to change the shimmer colours here: `t.border.subtle` is a
6 percent alpha border token and `t.background.surface` is white, so that pair
is very nearly invisible on a white table. The visible pair is
`t.background.subtle` to `t.background.muted`, which is what `Skeleton`
already uses.

### Usage
```tsx
<tbody>
  {Array.from({ length: 8 }).map((_, i) => (
    <SkeletonRow key={i} columns={ACTIVITY_COLUMNS.length} />
  ))}
</tbody>
```

### Current usages
- `ActivityTab` and `EnquiriesTab`, desktop first load, 8 rows.
- **Not** `LeadsTab`, which already has per-column tuned placeholders
  (`LeadRowSkeleton`, `MobileCardSkeleton`) that are a better fit than a
  generic row. Leave them.
- Mobile card stacks keep their existing spinner. A `<tr>` cannot render into a
  card list, and a card stack has no columns to hold still.

---

## Standing rules
- No em dashes in any component copy or code
- No raw hex outside theme.ts
- All colors from t.* semantic tokens or tokens.*
- motionTokens for all transitions
