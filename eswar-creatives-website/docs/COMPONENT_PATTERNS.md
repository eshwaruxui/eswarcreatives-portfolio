# Eswar Creatives Portal - Component Patterns

Last updated: 9 August 2026 (a Token Sources section added, pointing at the new
`docs/MOTION_SYSTEM.md` and `src/portal/motion.ts`, whose export is named
`motionSystem` specifically so it cannot collide with the flat `motionTokens`
in `theme.ts`. The Pagination Pattern's no-animation-on-page-change decision
below is reaffirmed by that doc, not superseded by it. Previously the same day: a Variant Union Pattern added after
`fix/ts-real-defects` found `PortfolioButton` being passed a variant outside
its union: cva emits no variant classes at all for an unrecognised value rather
than falling back to the default, so that CTA had no border width and rendered
as bare text on a dark surface. The same section records why a TS2367 dead
comparison is not automatically a rendering bug, since the other two findings
that session were dead code sitting on the correct side of a narrowed union.
Previously: Pagination is now always wrapped in the new
`StickyBar`, with the z-index rationale and the AdminShell offsets it tracks;
the single-page rule revised to keep both the count label and the page size
selector, hiding only the nav, so a one-page result is neither a dead end nor
silent about its total; and a Dense Table Width pattern added for the LeadsTab
horizontal-scroll fix; an Admin Shell Scroll and Sticky pattern, after finding
that `overflow-x: hidden` on the shell root had been silently disabling
`position: sticky` on TopBar and the sidebar across every admin route; and a
Page Canvas Token pattern, after the portal dropped the warm cream `#FAF8F4`
and split the canvas (`#FFFFFF`) from component surfaces (`#FAFAF9`). All of it
merged to `main`. Previously, 8 August: the Pagination stub
replaced with the real pattern, the Table Skeleton Row pattern for
`SkeletonRow`, the Overflow Fade pattern for `FadeOverflow`, the Outreach Touch
Approve / Preview pattern, and `t.text.muted` aligned to #717171 / neutral/500,
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

Measured contrast at #717171: 4.88:1 on white, which since 9 August 2026 is
both t.background.surface and the t.background.page canvas, and 4.67:1 on
t.background.subtle/raised and on tokens.bg component surfaces. All clear AA.
It was 4.60:1 on the old cream #FAF8F4, so dropping the cream improved it on
every surface.

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
The default is `t.background.page` (the body canvas, #FFFFFF since 9 August
2026, the cream #FAF8F4 before that). On a white
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
- `src/portal/components/shared/StickyBar.tsx`

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

### Always sticky: wrap it in StickyBar

Every caller renders `Pagination` inside `StickyBar`, which pins it to the
bottom of the content area. Paging a 174-row feed otherwise meant scrolling
past every row to reach the controls.

```tsx
{!initialLoading && sorted.length > 0 && (
  <StickyBar>
    <Pagination ... />
  </StickyBar>
)}
```

`StickyBar` reuses the existing admin sticky-footer treatment from
`InvoicesAdmin` / `ProposalsAdmin` / `ClientsList` verbatim: `position: fixed`,
`bottom: 0`, **z-index 40**, a `t.border.subtle` top border, `t.background.page`
fill, and safe-area-aware bottom padding.

**On z-index 40.** The portal's rule is that a sticky bar sits *below* every
overlay so it can never paint over an open dialog. `TopBar` states the same at
z-index 90. 40 clears page content while staying under modals at 100+,
`SidePanel` at 201, the mobile nav drawer at 300, the shared `Modal` scrim at
400, and the lightbox and toasts at 9999. Verified live: `LeadDrawer` opens at
z-index 10000 and paints over the bar.

**It tracks AdminShell, in two places.** The left offset matches the sidebar
(240 desktop, 180 tablet, 0 mobile) so the bar starts at the content column
rather than running under the nav. The horizontal padding matches the shell's
own content padding (32px desktop, 16px mobile and tablet) so the first control
lines up with the table above it. An earlier flat 24px left the count label 8px
adrift, which read as a misaligned bar rather than a deliberate inset. If
AdminShell's sidebar or padding ever changes, both values here must follow.

**The spacer is measured, not hardcoded.** The bar is out of flow, so
`StickyBar` renders a spacer of exactly the bar's height ahead of it, sized by a
`ResizeObserver`. The bar wraps to two lines on narrow viewports, so a constant
would either clip the last row or leave a visible gap.

**Chrome belongs to the container, not the component.** `Pagination` itself
carries no border, background or outer margin, so the two cannot double up and
a future non-sticky caller can frame it however it likes.

### Edge cases, all verified live
- **0 items:** the component returns `null` and the caller skips `StickyBar`
  entirely, so the bar disappears with it. The caller's own empty state shows
  instead. Do not wrap it in a second emptiness check.
- **Fits on one page:** the bar stays and keeps **both the count label and the
  page size selector**. Only the nav buttons are hidden. Two separate reasons,
  and both were learned by getting it wrong first. Hiding the selector made a
  single page a dead end, with no route from "39 rows at 50 per page" back to a
  paged view except widening the result set, which is not what the user was
  trying to do. Hiding the count removed the only thing on screen stating the
  total, which matters *more* here than on a paged view, because there are no
  page numbers left to infer it from. Verified live: "Showing 1 to 4 of 4
  leads" renders with the selector beside it, and dropping 50 to 10 on a
  single-page result turns it back into a paged one.
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

## Dense Table Width Pattern

### Rule
An admin table must not scroll horizontally at a 1280px viewport, where the
content column is 961px. Two tables have now needed the same fix
(`ActivityTab` on 8 August, `LeadsTab` on 9 August), so the method is written
down rather than rediscovered a third time.

### Diagnose before cutting
Measure at more than one viewport width first. If the column widths are
identical at, say, a 753px and a 1016px wrapper, every column is already at its
intrinsic minimum and the table cannot compress: the overflow is content-driven
and no amount of shrinking the container will help. Also measure at more than
one page size, because intrinsic width grows with row count (`LeadsTab`
measured 178px over at 10 rows and 261px at 100). A `minWidth` on the table is
usually not the binding constraint; check before blaming it.

### The three levers, in order of yield
1. **Gutters.** The shared `SortableTableHeader` uses 12px. Trimming to 8px or
   6px, scoped by class, reclaims `columns x 2 x delta` px. `ActivityTab` uses
   8px, `LeadsTab` 6px, `EnquiriesTab` keeps the shared 12px.
2. **Cap the widest cell's content.** A `max-width` on a `<td>` is **ignored**
   under auto table layout. The cap has to go on a block inside the cell, with
   `overflow: hidden` and `text-overflow: ellipsis`, and the full value moved to
   a `title` attribute so nothing is actually lost.
3. **Cap embedded controls.** A `<select>` sizes to its longest option.
   `LeadsTab` caps `SegmentSelect` from the table's own scoped CSS rather than
   inside the shared component, which is also used by `LeadDrawer` where the
   longest label has room to render in full.

### Scope every rule by class
Gutter and control rules go in a `<style>` block scoped to that table's own
class (`.ec-activity-table`, `.ec-leads-table`). An unscoped `table td` rule
would silently reflow every other admin table. Verify after: `EnquiriesTab`'s
cells were re-measured at 12px to confirm the `LeadsTab` rule had not leaked.

### There is a floor, and it is the headers
Once the cells are capped, the uppercase column labels plus their sort icons
become the binding minimum, and further text trimming stops helping.
`LeadsTab` at 8px gutters was still 9px over no matter how far the lead and
company caps came down; 6px is what actually closed it. If you are trimming
text to illegibility for the last few pixels, take them from the gutters, or
question whether the column earns its place at all. (`LeadsTab`'s COMPANY
column duplicates the company already shown under the lead name; dropping it
would free 102px outright.)

### Pick values with headroom, and measure them
Find the point where overflow returns and then back off. `LeadsTab` ships lead
104px / company 86px, having measured that it starts overflowing again at 120 /
100. Record the measured numbers in a comment so the next person does not
re-derive them.

### A new column costs its header, not its cells
Before adding a column to `ActivityTab`, price it. The budget is 961px at a
1280px viewport and the table has historically sat at exactly that, so a new
column starts from zero slack. What you pay is the uppercase header label,
which is the floor described above, and that is usually far more than the cell
content. Three date columns for `delivered_at` / `opened_at` / `clicked_at`
measured **32px over even at 6px gutters**, and capping the status cell
reclaimed nothing at all, because `tdStatus` is `width: 100%` and simply
absorbs whatever is left rather than contributing to intrinsic width.

Measured on `ActivityTab`, 9 August 2026, all against the same shipped
reference layout:

| Change | Result at 961px |
|---|---|
| 3 separate date columns, 6px gutters | 32px over |
| `ENGAGEMENT` header replacing `OPENED`, 8px gutters | 36px over |
| `ENGAGEMENT`, 6px gutters | 4px over |
| **`ENGAGED`, 6px gutters** | **938px, 23px spare** |
| `SIGNALS` or `OPENS`, 6px gutters | about 30px spare |

The lesson is to collapse related signals into one column rather than adding
several. `ENGAGED` renders delivered, opened and clicked as an icon cluster,
each icon present only once its event arrived, with the timestamp in the
icon's `title`. One header instead of three. If a column truly cannot be
collapsed and will not fit, the options are to cut an existing column or to
gate the new one behind a wider breakpoint added to `useBreakpoint`. Note that
`isDesktop` is `>1024px` and so does **not** help here: 1280px is already
desktop, and 1280px is exactly where the overflow happens.

### Measuring without an admin session
The portal needs an admin session that browser tooling has repeatedly failed
to hold, so table widths are measured with a standalone HTML harness instead.
Two rules make it trustworthy:

1. **Pin the wrapper, or set `table { width: auto }`.** A table at `width:
   100%` inside an unconstrained wrapper reports the *window* width from
   `scrollWidth`, not its intrinsic width. This silently invalidated a first
   attempt where every variant measured identically.
2. **Measure deltas against the shipped layout, never absolutes.** Render the
   current header set and the proposed one over identical rows and compare.
   The harness's absolute numbers drift with font loading and mock content,
   but the delta holds, and the shipped layout's real width is already known.

### formatPortalDate in table cells
`formatPortalDate` returns `'-'` for `null`, `undefined` and unparseable
input, so an unrecorded timestamp renders as a dash with no caller-side
fallback. Do not write `value ? formatPortalDate(value) : '-'`; that is the
function's own behaviour. Where the value is shown in a `title` rather than as
text, as with the `ENGAGED` icons, guard on the raw value instead, since a
tooltip reading "Opened -" is worse than no tooltip.

---

## Page Canvas Token

### Rule
The portal has **two** neutral background values and they are not
interchangeable:

| Token | Value | Role |
|---|---|---|
| `t.background.page` | `#FFFFFF` | the body canvas, and only the canvas |
| `tokens.bg` | `#FAFAF9` | component surfaces: chips, inputs, modal fills |
| `tokens.inputBg` | `#FAFAF9` | input fills, always matches `tokens.bg` |
| `t.background.subtle` | `#FAFAF9` | section fills, Figma background/subtle |
| `t.background.surface` | `#FFFFFF` | cards and panels, unchanged |

Until 9 August 2026 the canvas and the component surfaces were one value, the
warm cream `#FAF8F4`. Splitting them is the whole point of this pattern: a
chip or an input has to read as a fill *against* the canvas, so it cannot be
the same colour as the canvas.

### Changing the canvas
Edit `t.background.page` in `theme.ts`. Nothing else. `AdminShell`'s `layout`
rule, `StickyBar` and `FadeOverflow` all resolve from that token, so the body,
the sticky footer and the fade endpoint move together and none of them names a
hex. That is what makes this a one-value change rather than a sweep.

**Do not** repoint a canvas at `tokens.bg` to change it, and do not change
`tokens.bg` to change the canvas. `tokens.bg` has ~74 call sites and 7 of them
are `{ bg: tokens.bg }` status chips (Draft, Expired, Closed) sitting on white
cards. Taking that value to white renders them invisible.

### Surfaces separate by border, not by fill
A white card measures **1.04:1** against `#FAFAF9` and 1.00:1 against the white
canvas. Both are imperceptible. Card, table and panel separation therefore
comes from `t.border.subtle` / `t.border.default`. Do not try to manufacture
surface contrast by nudging a background token: at this end of the scale
nothing you can pick will read.

### Measured contrast
`t.text.muted` (#717171), the lightest text role, clears the 4.5:1 AA floor on
both neutrals: **4.88:1** on the white canvas and **4.673:1** on `#FAFAF9`. It
was 4.601:1 on the old cream, so this move improved it slightly on both.

### The only warm surfaces left
`t.background.cardWarm` (#F5F0E6) and `subtleWarm` (#E8DCC4) stay warm on
purpose. The marketing site keeps its own `#FAF8F4` in `src/app/` and
`src/components/marketing/`, independently of these tokens, so the portal and
marketing canvases now differ by design.

---

## Admin Shell Scroll and Sticky Pattern

### Rule
The admin shell scrolls the **window**. There is no inner scroll container.
`TopBar` and the sidebar hold their place with `position: sticky`; the page
header and the tab bar scroll away with the content; the pagination bar is
`position: fixed`. Do not introduce a nested scroll container to "fix"
scrolling without reading the trap below first.

### The trap: overflow-x on the shell root breaks every sticky descendant
`AdminShell`'s root previously set `overflow-x: hidden` (added by the admin
mobile pass to stop horizontal scrolling). Per the CSS overflow spec, a
`visible` value on one axis computes to **`auto`** when the other axis is
`hidden`, `scroll` or `auto`. So `overflow-x: hidden` silently produced
`overflow-y: auto`, which made the shell root the nearest scrolling ancestor
for every `position: sticky` descendant.

That root is `min-height: 100vh` and grows with content rather than scrolling
internally, so it never scrolls. Sticky elements were resolving against a box
that never moves, which is the same as not sticking at all. Measured on
production before the fix, at scrollY 800: `TopBar` at top **-800** and the
sidebar at **-744**, both scrolled completely off screen, on every admin
route.

### The fix
`overflow-x: clip`. It clips the same horizontal overflow but does **not**
create a scroll container, so `overflow-y` stays `visible` and sticky resolves
against the viewport again. Emitted with the old value first as a fallback:

```css
.ec-admin-shell { overflow-x: hidden; overflow-x: clip; }
```

A browser without `clip` support keeps the previous behaviour rather than
losing horizontal clipping altogether.

After the fix, same scroll position: `TopBar` at **0**, sidebar at **56**.

### Symptoms that point back here
If a `position: sticky` element anywhere in the admin portal does not stick,
check the overflow on every ancestor before touching the element itself. The
element's own CSS will look perfectly correct. `overflow: hidden` anywhere up
the chain is the usual cause, and a `transform` on an ancestor is the other
one (that one breaks `position: fixed` too, which is why `Lightbox` portals to
`document.body`).

### Heights, if you ever do need them
`TopBar` 56px, the Outreach tab bar 45px, `StickyBar` 47px (measured, and it
grows when the bar wraps on narrow viewports, which is why `StickyBar` sizes
its own spacer with a `ResizeObserver` rather than a constant).

---

## Variant Union Pattern (cva)

### Rule
Never pass a `variant` value that is not in the component's union. It does
**not** fall back to the default variant. It falls back to nothing.

### Why this is worth its own section
`cva` applies `defaultVariants` only when a prop is `undefined`. A value that is
*defined but unrecognised* matches no key in the variant map, so cva emits **no
classes for that variant at all** and you are left with the base and size
classes only. There is no warning, at build time or in the console.

Found on `DesignSystemsCaseStudy:878` (9 August 2026), which passed
`variant="outline"` to `PortfolioButton`, whose union is `accent | brand |
ghost | inverse | primary | secondary`. The typecheck flagged it; nothing else
did.

### The failure is quieter than it sounds
That call site sets `borderColor` in an inline `style`, so it read as a
correctly specified outline button. But no variant meant no `border` class,
which means no border *width*, and `border-color` alone paints nothing.
Measured on the live page: `border-top-width` was `0px` before the fix and
`1px` after. The button had been rendering as bare text on a dark teal surface.

If a variant looks like it is being ignored, check the union before checking
your CSS. And be careful with inline `style` overrides on a variant component:
they can make a broken variant look deliberate, because the properties you
named are all correct and it is the one you did not name that is missing.

### Pick an existing variant over widening the union
`inverse` already existed for exactly this case, documented in
`portfolio-button.tsx` as "outlined on dark surface". Adding `outline` would
have been a seventh near-duplicate of it. Widen the union only when no existing
variant expresses the role, not to make a call site compile.

`PortfolioButton` variants and their intended roles:

| Variant | Role |
|---|---|
| `primary` | dark CTA |
| `brand` | teal fill |
| `accent` | gold CTA |
| `secondary` | outlined ghost on a light surface |
| `ghost` | text only |
| `inverse` | **outlined on a dark surface** |

### A TS2367 is not automatically a rendering bug
Related, from the same audit. Two other findings that session compared string
literals that could never be equal, and both turned out to be **dead code
sitting on the correct side of a narrowed union**: a duplicated sub-nav whose
inactive styling happened to be right, and a redundant `kind === 'image'` guard
inside the else of a `kind === 'image'` ternary. Changing the comparison, which
is what "fix the dead branch" implies, would have introduced a bug in the first
case. Read what the narrowed branch actually renders before assuming something
is missing from the screen. Only the cva variant above changed any pixels.

---

## Token Sources

Where each kind of value comes from. Import from the source that owns the
concern, and do not restate a value in a component.

| Concern | Source of truth | Notes |
|---|---|---|
| Colour, text, border, background | `src/portal/theme.ts` | Two systems: legacy flat `tokens` and the nested semantic `t`. See the Text Color Token Rule and Page Canvas Token sections above. |
| Motion values in current use | `src/portal/theme.ts`, the flat `motionTokens` | `durationFast` 120ms, `durationBase` 200ms, `durationSlow` 350ms, `easeDefault`/`easeEnter`/`easeExit`. Every existing call site uses this. |
| Motion scale, patterns, accessibility | `docs/MOTION_SYSTEM.md` | The canonical motion reference: full duration/easing/distance/delay scale, per-component patterns, reduced-motion policy, and an audit of every animation live in `src/portal` as of 9 August 2026. |
| Motion token object, new values | `src/portal/motion.ts`, exported as `motionSystem` | Nested shape (`duration.fast`, `easing.enter`). Added 9 August 2026. Carries the values `theme.ts` lacks: `micro`, `moderate`, `slower`, `expressive`, `snap`, `emphasized`, `distance.*`, `delay.*`. |
| Breakpoints | `src/portal/hooks/useBreakpoint.ts` | Sole authority. No `window.innerWidth`, no `matchMedia`. |

**The two motion objects have deliberately different names.** `theme.ts` exports
flat `motionTokens` (`durationFast`, `easeEnter`), which every current call site
uses. `motion.ts` exports nested `motionSystem` (`duration.fast`,
`easing.enter`). Sharing the name `motionTokens` would have meant an import from
the wrong module reading `motionTokens.durationFast` as `undefined`, which
serializes into a CSS string as the literal text `"undefined"` and silently
kills the transition with no console error. Distinct names remove that failure
mode entirely and let both be imported into one file during the one-pass
migration in MOTION_SYSTEM.md's Phase 2. Until that pass lands, existing code
keeps importing `motionTokens` from `theme.ts`; reach for `motionSystem` only
when you need a value `theme.ts` does not have.

`prefers-reduced-motion` is handled once globally in `src/styles/index.css`, not
per component. There is no CSS file under `src/portal`, so that app-wide
stylesheet is the only place it can live. Do not add a component-level
reduced-motion check.

---

## Standing rules
- No em dashes in any component copy or code
- No raw hex outside theme.ts
- All colors from t.* semantic tokens or tokens.*
- motionTokens for all transitions. Never a raw ms or s value in a component;
  see docs/MOTION_SYSTEM.md for the scale and the current audit
- Never pass a variant value outside a cva component's union: unrecognised
  values emit no variant classes at all, they do not fall back to the default
