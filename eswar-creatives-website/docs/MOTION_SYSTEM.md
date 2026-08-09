# Eswar Creatives Portal - Motion System

Last updated: 9 August 2026 (created). Canonical motion reference for the
portal. Section 11 is an audit of what is actually in the code as of this date,
not a description of a target state. Where the two differ, the difference is
stated explicitly rather than smoothed over.

---

## 1. Purpose

This document is the single reference for motion in the Eswar Creatives portal:
what the durations, easings, distances and patterns are, which ones the code
actually uses today, and which are planned. It exists because motion values had
been accumulating in two incompatible ways at once, a shared `motionTokens`
object in `theme.ts` used by roughly sixty call sites, and a long tail of raw
values (`0.15s ease`, `0.28s ease`, `0.6s ease`, `1s linear`) hardcoded inline
in individual components, with no written rule saying which was correct. The
audience is designers and developers working on the portal: a designer should be
able to specify an interaction here without reading the code, and a developer
should be able to implement it without inventing a number.

---

## 2. Core Principles

In priority order. When two principles conflict, the lower number wins.

**1. Functional First.** Motion explains a change, confirms an action, or guides
attention. It is never decorative. If an animation can be removed without the
user losing information about what just happened, remove it.

**2. Instant Data.** Client-side operations (pagination, sort, filter) swap
instantly. Animation may overlay the result, never gate it. There is no
artificial delay before showing real data. The portal's lists are already held
in memory and paging is an array slice, so there is genuinely nothing to wait
for, and pretending otherwise makes a fast tool feel slow.

**3. Fast by Default.** This is an operational admin tool, not a marketing
surface. Motion is short and direct. Most transitions complete in 120ms to
200ms, which is what the two most-used tokens in the codebase already are.

**4. Interruptible.** Every animation must handle rapid input cleanly, with no
stuck in-between state. A user who clicks a drawer open and closed three times
in a second must end in a correct, settled state.

**5. Accessible by Default.** `prefers-reduced-motion` is respected once at the
CSS level, not negotiated component by component. A component author should not
be able to forget it.

---

## 3. Motion Architecture

| Level | Description | Examples |
|---|---|---|
| Motion atoms | Primitive values | Duration ms, easing curves, distance px |
| Motion tokens | Named variables | `motion.duration.fast`, `motion.easing.enter` |
| Basic animations | Single property | fade, move, scale, rotate |
| Motion patterns | Combinations | modal-enter, drawer-slide, toast-enter |
| Component choreography | Full behavior | SidePanel open, TouchPreviewModal enter |

The rule that follows from this structure: components consume patterns, patterns
consume tokens, tokens own the atoms. A component should never name a raw
duration, and a new pattern should not introduce a new atom without going
through Section 13's change process.

---

## 4. Motion Tokens

### 4.1 Current State vs. Planned

**The portal has zero CSS custom properties.** `theme.ts` exports plain JS
objects and nothing under `src/portal` declares a single `--custom-property`.
This is the same constraint `FadeOverflow` documents for its gradient endpoint,
and it applies identically to motion. Every motion value today is either a JS
constant or a raw string inline in a component file. CSS custom properties are
planned for a future token migration sprint (Section 14, Phase 3) and are
deliberately not being introduced for motion alone.

Until then the rule is: **use named JS constants, never raw ms values scattered
in components.**

| Token | Current implementation | Planned (CSS vars) |
|---|---|---|
| motion.duration.instant | Not defined. Absence of a transition | `--motion-duration-instant: 0ms` |
| motion.duration.micro | Not defined. No 80ms value exists in the portal | `--motion-duration-micro: 80ms` |
| motion.duration.fast | `motionTokens.durationFast` in `theme.ts`, `'120ms'` | `--motion-duration-fast: 120ms` |
| motion.duration.base | `motionTokens.durationBase` in `theme.ts`, `'200ms'` | `--motion-duration-base: 200ms` |
| motion.duration.moderate | Not defined. Nearest live value is a raw `0.28s` | `--motion-duration-moderate: 280ms` |
| motion.duration.slow | `motionTokens.durationSlow` in `theme.ts`, `'350ms'`. **Diverges from the 360ms in this doc, see below** | `--motion-duration-slow: 360ms` |
| motion.duration.slower | Not defined | `--motion-duration-slower: 480ms` |
| motion.duration.expressive | Not defined | `--motion-duration-expressive: 640ms` |
| motion.duration.shimmer | Hardcoded `1.5s` in 9 files. **Diverges from the 1400ms in this doc, see 4.2** | `--motion-duration-shimmer: 1500ms` |
| motion.easing.standard | Not defined. `motionTokens.easeDefault` is `cubic-bezier(0.4, 0, 0.2, 1)`, a **different curve** from this doc's standard | `--motion-easing-standard` |
| motion.easing.enter | `motionTokens.easeEnter`, `cubic-bezier(0, 0, 0.2, 1)`. **Matches** | `--motion-easing-enter` |
| motion.easing.exit | `motionTokens.easeExit`, `cubic-bezier(0.4, 0, 1, 1)`. **Matches** | `--motion-easing-exit` |
| motion.easing.linear | Used as the literal `linear` in every keyframe animation | `--motion-easing-linear` |
| motion.easing.snap | Not defined | `--motion-easing-snap` |
| motion.easing.emphasized | Not defined | `--motion-easing-emphasized` |
| motion.distance.* | Not defined. `8px` and `16px` appear as literals in keyframes | `--motion-distance-*` |
| motion.delay.* | Not defined. No portal animation uses a delay | `--motion-delay-*` |
| motion.opacity.* | Not defined as motion tokens. Scrim opacity comes from `t.background.scrim` | `--motion-opacity-*` |

**Two naming systems now exist, and this is a live trap.** `theme.ts` exports a
flat `motionTokens` (`durationFast`, `easeEnter`) and `src/portal/motion.ts`
exports a nested `motionTokens` (`duration.fast`, `easing.enter`) under the same
export name. Nothing today imports the new one, so nothing is broken, but
`motionTokens.durationFast` read off the new object is `undefined` and would
serialize into a CSS string as the literal text `undefined`, silently killing
the transition with no console error. Until Phase 2 migrates the call sites:
**never import both into the same file, and check which module you imported
from before reading a key.** See Section 13 for the resolution plan.

**Three real divergences to resolve in Phase 2**, listed here so they are not
rediscovered as bugs:

1. `durationSlow` is **350ms** in code, **360ms** in this doc's scale.
2. `easeDefault` is `cubic-bezier(0.4, 0, 0.2, 1)` in code, while this doc's
   `easing.standard` is `cubic-bezier(0.2, 0, 0, 1)`. These are visibly
   different curves, not a rounding difference.
3. Shimmer runs at **1.5s** in code, 1400ms in the original specification. The
   code value is authoritative in this document (see 4.2).

### 4.2 Duration Tokens

| Token | Value | Usage |
|---|---:|---|
| motion.duration.instant | 0ms | Client-side data swap, reduced-motion fallback |
| motion.duration.micro | 80ms | Press feedback, icon state, checkbox |
| motion.duration.fast | 120ms | Hover, focus, simple opacity/color |
| motion.duration.base | 200ms | Default UI transitions, tabs, menus |
| motion.duration.moderate | 280ms | Popovers, dropdowns, small drawers |
| motion.duration.slow | 360ms | Modals, larger panels, expand/collapse |
| motion.duration.slower | 480ms | Page-level transitions, empty state entrance |
| motion.duration.expressive | 640ms | Rare branded or onboarding motion |

**Accepted exception: the shimmer keyframe sits outside this scale.** It is a
looping perceived-performance pattern, not a UI transition, so the scale does
not apply to it. **The value is 1.5s, not the 1400ms originally specified.**
That was verified against the code, not assumed: `1.5s` appears identically in
`Skeleton.tsx:30`, `ProgressiveImage.tsx:117` and the seven inline `.ec-shimmer`
CSS blocks listed in Section 11. Changing all nine to 1400ms would be a
cosmetic, uniformly-applied change with no defect behind it, so the token
records reality at `shimmer: '1500ms'` instead.

**A second accepted exception: spinner rotation.** Rotation speeds in the portal
are `600ms` (`Spinner.tsx`), `0.8s` (`AdminSketchUpload`) and `1s` (the inline
`Loader2` spinners). These are also loops rather than transitions. They are
inconsistent with each other, which is worth fixing, but they do not belong on
the transition scale either.

### 4.3 Dynamic Duration

For elements that travel a meaningful distance, a fixed duration reads as too
slow at short distances and too abrupt at long ones.

| Token | Formula | Min | Max |
|---|---|---:|---:|
| motion.duration.byDistance.short | 40ms per 100px | 120ms | 280ms |
| motion.duration.byDistance.panel | 60ms per 100px | 200ms | 420ms |
| motion.duration.byHeight.expand | 50ms per 100px | 160ms | 420ms |

**None of these are implemented.** `SidePanel` currently uses a flat
`motionTokens.durationBase` (200ms) regardless of whether it is sliding a 480px
desktop panel or a full 100vw mobile overlay. Under `byDistance.panel` those
would be roughly 288ms and 420ms respectively. This is a Phase 2 item, and it is
the clearest single case where the dynamic formula would improve the current
behaviour.

### 4.4 Delay Tokens

| Token | Value | Usage |
|---|---:|---|
| motion.delay.none | 0ms | Default, most portal UI |
| motion.delay.short | 40ms | Small stagger between related children |
| motion.delay.base | 80ms | Sequenced entrance, menu content after container |
| motion.delay.long | 160ms | Rare staged reveal |

**Rule: most portal UI uses `motion.delay.none`.** Delay is never used to make a
fast operation feel "more processed". Data swaps are instant. No animation in
the portal currently uses a delay of any kind, and that is the correct default
for an operational tool.

### 4.5 Easing Tokens

| Token | CSS Value | Usage |
|---|---|---|
| motion.easing.linear | `linear` | Shimmer, progress bars, constant rotation |
| motion.easing.standard | `cubic-bezier(0.2,0,0,1)` | Default state changes |
| motion.easing.enter | `cubic-bezier(0,0,0.2,1)` | Elements entering or expanding |
| motion.easing.exit | `cubic-bezier(0.4,0,1,1)` | Elements leaving or collapsing |
| motion.easing.emphasized | `cubic-bezier(0.2,0,0,1.2)` | Rare expressive entrance |
| motion.easing.snap | `cubic-bezier(0.16,1,0.3,1)` | Drawer and panel motion |

`enter` and `exit` match the values already in `theme.ts` exactly. `standard`
does not, see 4.1. `emphasized` overshoots (the final control point exceeds 1)
and should be used sparingly, never on anything that changes layout size.

### 4.6 Distance Tokens

| Token | Value | Usage |
|---|---:|---|
| motion.distance.xs | 2px | Press movement, subtle nudge |
| motion.distance.sm | 4px | Hover lift, icon shift |
| motion.distance.md | 8px | Menu or tooltip entrance |
| motion.distance.lg | 16px | Drawer content entrance |
| motion.distance.xl | 24px | Page-level content transition |

Live keyframes already use `8px` (`dashBannerIn`, `deleteProposalIn`,
`deleteInvoiceIn`) and `16px` (`adminToastIn`, `adminToastOut`) as literals,
which map cleanly onto `md` and `lg`.

### 4.7 Opacity Tokens

| Token | Value | Usage |
|---|---:|---|
| motion.opacity.hidden | 0 | Start/end hidden state |
| motion.opacity.faint | 0.4 | Disabled or loading support layer |
| motion.opacity.visible | 1 | Final visible state |
| motion.opacity.scrim | 0.48 | Modal or drawer backdrop |

**Do not apply `motion.opacity.scrim` to existing scrims without a design
decision.** Portal scrim colour comes from `t.background.scrim`, which carries
its own alpha, and the shared `Modal` scrim is a fixed token per the admin
mobile pass. Introducing a second opacity authority for the same surface is the
kind of collision Section 13 exists to prevent.

---

## 5. TypeScript Token Object

Lives at `src/portal/motion.ts`. It is the code counterpart of Section 4 and
contains no colour values of any kind.

```ts
export const motionTokens = {
  duration: {
    instant: '0ms',
    micro: '80ms',
    fast: '120ms',
    base: '200ms',
    moderate: '280ms',
    slow: '360ms',
    slower: '480ms',
    expressive: '640ms',
    shimmer: '1500ms', // accepted exception, looping perceived-performance pattern
  },
  delay: {
    none: '0ms',
    short: '40ms',
    base: '80ms',
    long: '160ms',
  },
  easing: {
    linear: 'linear',
    standard: 'cubic-bezier(0.2,0,0,1)',
    enter: 'cubic-bezier(0,0,0.2,1)',
    exit: 'cubic-bezier(0.4,0,1,1)',
    emphasized: 'cubic-bezier(0.2,0,0,1.2)',
    snap: 'cubic-bezier(0.16,1,0.3,1)',
  },
  distance: {
    xs: '2px',
    sm: '4px',
    md: '8px',
    lg: '16px',
    xl: '24px',
  },
} as const
```

`shimmer` is `'1500ms'` rather than the `'1400ms'` of the original
specification, matching the nine live call sites. See 4.2.

**Nothing imports this file yet, by design.** Migrating the roughly sixty
existing `theme.ts` call sites is Phase 2 work and must happen in one pass, not
opportunistically, because the two objects share an export name. See the trap
note in 4.1.

---

## 6. Basic Animations

### Fade

| Name | Properties | Default Tokens |
|---|---|---|
| fade-in | opacity 0 to 1 | duration.fast, easing.enter |
| fade-out | opacity 1 to 0 | duration.fast, easing.exit |
| fade-cross | old fades out, new fades in | duration.base, easing.standard |

### Move

| Name | Properties | Default Tokens |
|---|---|---|
| move-up | translateY(8px) to 0 | duration.base, easing.enter |
| move-down | translateY(-8px) to 0 | duration.base, easing.enter |
| move-left | translateX(8px) to 0 | duration.base, easing.enter |
| move-right | translateX(-8px) to 0 | duration.base, easing.enter |

### Scale

| Name | Properties | Default Tokens |
|---|---|---|
| scale-in | scale(0.98) to scale(1) | duration.base, easing.enter |
| scale-out | scale(1) to scale(0.98) | duration.fast, easing.exit |
| press-scale | scale(1) to 0.98 to 1 | duration.micro, easing.standard |

### Elevate

| Name | Properties | Default Tokens |
|---|---|---|
| elevate-up | translateY(0 to -4px), shadow increase | duration.base, easing.standard |
| elevate-down | translateY(-4px to 0), shadow decrease | duration.fast, easing.exit |

### Rotate

| Name | Properties | Default Tokens |
|---|---|---|
| rotate-quarter | 0deg to 90deg | duration.base, easing.standard |
| rotate-half | 0deg to 180deg | duration.base, easing.standard |
| spin-linear | 0deg to 360deg | duration.slow, easing.linear |

`rotate-quarter` is the accordion chevron already specified in
COMPONENT_PATTERNS.md, which pairs the rotation with a colour change from
`t.text.muted` to `t.text.primaryBrand`. That pattern remains the authority for
chevrons; this row is the motion half of it.

`spin-linear` at `duration.slow` describes a single revolution. The live
spinners loop at 600ms, 0.8s and 1s, none of which match it, see 4.2.

---

## 7. Motion Patterns (Portal-specific)

Each subsection marks whether the pattern is **live** (implemented as described),
**partial**, or **planned**.

### 7.1 Button Interaction (live, partial)

| State | Animation | Tokens |
|---|---|---|
| Hover | Background/color fade | duration.fast, easing.standard |
| Press | press-scale or translateY(1px) | duration.micro, easing.standard |
| Disabled | No motion | duration.instant |
| Loading | Optional spinner rotation | duration.slow, easing.linear |

Hover is live and consistent: `background`, `color` and `border-color` at
`durationFast` with `easeDefault` is the single most common transition in the
portal (41 of the 79 token-based transitions). **Press feedback is not
implemented anywhere**, and there is no 80ms value in the codebase.

### 7.2 Pagination (live, with one correction)

| Trigger | Animation | Token |
|---|---|---|
| Page number change | **None today.** Instant swap | duration.instant |
| Filter/sort change | Instant swap, no animation | duration.instant |
| Page size change | Instant swap, reset to page 1 | duration.instant |
| Button hover/active | Background, opacity and color fade | duration.fast, easing.standard |
| First load | SkeletonRow shimmer | shimmer 1.5s, easing.linear |

**Correction to the original specification, which listed a `tbody` opacity 0.85
to 1 fade on page change as current implementation. It is not implemented.**
`Pagination.tsx:190` defines exactly one transition, on the page buttons
themselves, and no caller animates its `tbody`. COMPONENT_PATTERNS.md states the
opposite intent explicitly: "The bar does not animate on a page change. The bar
staying still is what makes the content above it read as the thing that
changed." The proposed `tbody` fade is therefore a **Phase 2 proposal that
contradicts a documented, deliberate decision**, and it should not be
implemented without revisiting that decision first. It is listed in Section 14
as a proposal, not as a gap.

Rule: pagination is client-side array slicing. Never show skeletons on
subsequent page changes, only on first load.

### 7.3 Skeleton / Loading (live)

| Pattern | Animation | Token |
|---|---|---|
| `ecShimmer` keyframe | Linear background-position sweep | shimmer 1.5s, easing.linear |
| `SkeletonRow` (ActivityTab, EnquiriesTab) | Composes `Skeleton` | inherited |
| `LeadRowSkeleton` (LeadsTab) | Composes `Skeleton`, per-column sizes | inherited |
| `MobileCardSkeleton` (LeadsTab mobile) | Composes `Skeleton`, per-column sizes | inherited |
| `ProgressiveImage` placeholder | Own `ecShimmer` definition | shimmer 1.5s, easing.linear |

**Shimmer gradient, as actually implemented:**

```
linear-gradient(90deg,
  t.background.subtle 25%,
  t.background.muted  50%,
  t.background.subtle 75%)
background-size: 200% 100%
```

**Correction to the original specification, which gave the stops as
`t.border.subtle 25%, t.background.surface 50%, t.border.subtle 75%`. Do not use
those.** COMPONENT_PATTERNS.md rules that pair out by name: `t.border.subtle` is
a 6 percent alpha border token and `t.background.surface` is white, so the
gradient would be very nearly invisible on a white table. The
subtle-to-muted pair above is what `Skeleton.tsx` uses and what is visible.

There is no CSS custom property fallback pattern to apply here. The portal has
zero CSS custom properties, and `Skeleton.tsx` interpolates the JS token
directly into the gradient string, which is correct for today.

**Known drift: two different `ecShimmer` definitions share one keyframe name.**
`Skeleton.tsx:22` sweeps `-200%` to `200%`; `ProgressiveImage.tsx:44` sweeps
`200%` to `-200%`, the opposite direction. Both inject a `<style>` tag with the
same name, so on any screen rendering both, whichever is inserted last wins and
one of them silently sweeps backwards. COMPONENT_PATTERNS.md predicted exactly
this ("a second definition would either collide with those or drift from them").
It has drifted. Logged in Section 14, Phase 2.

### 7.4 Drawer / Side Panel (partial)

| Phase | Animation | Token |
|---|---|---|
| Enter | Translate from edge to 0 | duration.byDistance.panel, easing.snap |
| Exit | Translate back to edge | duration.moderate, easing.exit |
| Scrim | Fade in/out | duration.base, easing.standard |

Live today in `SidePanel.tsx:88-107` and `AdminShell.tsx:300-314`: translate at
a flat `durationBase` (200ms) with `easeEnter` opening and `easeExit` closing,
scrim opacity at `durationBase` with `easeDefault`. The differences from the
target are the flat duration (see 4.3) and `easing.snap`, which does not exist
yet.

`SidePanel` derives its unmount timer from the same token
(`SLIDE_MS = parseInt(motionTokens.durationBase, 10)`), which is the right
pattern: a JS timeout that must outlast a CSS transition should be computed from
the token, never typed as a second literal. **Any change to the drawer duration
must keep that derivation intact.**

### 7.5 Modal / TouchPreviewModal (planned, not implemented)

| Element | Animation | Token |
|---|---|---|
| Scrim | Fade in/out | duration.base, easing.standard |
| Dialog enter | Fade + scale 0.98 to 1 + move 8px to 0 | duration.slow, easing.enter |
| Dialog exit | Fade + scale 1 to 0.98 | duration.fast, easing.exit |

Timeline: 0ms scrim fades in, 40ms dialog scales and fades in, 80ms dialog
content fades in.

**The shared `Modal` in `src/portal/admin/ui.tsx` has no motion at all**, not a
scrim fade and not a dialog transition. It appears and disappears instantly.
`TouchPreviewModal` renders through that shared `Modal` and therefore has no
enter animation either; its only opacity values are the static `0.6` applied to
buttons while a request is in flight. The original specification listed this
pattern under current implementation; it is planned.

Two modals do animate, and both hand-roll it rather than going through the
shared component: `DeleteProposalModal` (`deleteProposalIn`, `durationFast`,
`easeEnter`) and `DeleteInvoiceModal` (`deleteInvoiceIn`, same). Both use
`translateY(8px) scale(0.98)`, which is already the shape described above, at
`fast` rather than `slow`. These are two of the three modals COMPONENT_PATTERNS
notes are deliberately outside the shared `Modal`. When Section 14, Phase 2
implements this pattern, do it in the shared `Modal` and delete these two
keyframes rather than adding a third copy.

### 7.6 Toast / Alert (live, close)

| Phase | Animation | Token |
|---|---|---|
| Enter | Fade in + move up 8px to 0 | duration.base, easing.enter |
| Exit | Fade out + move down 0 to 4px | duration.fast, easing.exit |

`admin/toast.tsx:72-83` implements this with the correct durations and easings.
Two deviations: it travels **16px** rather than 8px, and it enters from **above**
(`translateY(-16px)` to 0) rather than from below, because the admin toast is
top-anchored. The distance maps to `motion.distance.lg`. Given the anchor, the
direction is correct as built; the table above assumes a bottom-anchored toast
and should be read as direction-agnostic.

### 7.7 Tabs (live, partial)

| Element | Animation | Token |
|---|---|---|
| Indicator | Move left/right | duration.base, easing.standard |
| Exiting panel | Fade out | duration.fast, easing.exit |
| Entering panel | Fade in | duration.base, easing.enter |

Entering panels are live: `TabBar.tsx:43` and `OutreachAdmin.tsx:105` both run
`ecTabFadeIn` at `durationFast` with `easeDefault`, keyed on the active tab so
React remounts and replays it. Two deviations from the target: the entering
panel uses `fast` rather than `base`, and **there is no exit animation and no
moving indicator**. The tab bar marks its active tab with a static border, so
the indicator row is planned, not live.

### 7.8 Dropdown Menu (planned)

| Phase | Animation | Token |
|---|---|---|
| Enter | Fade in + move down 8px to 0 | duration.base, easing.enter |
| Exit | Fade out + move up 0 to -4px | duration.fast, easing.exit |
| Items stagger | 40ms stagger, max 3 to 5 items | delay.short |

Not implemented. The portal's 3-dot overflow menus (`InvoicesAdmin`,
`ClientsList`, `ProjectsList`) are `position: fixed` dropdowns that appear
instantly. Note that the item stagger conflicts with Section 9's guidance
against stagger in admin interfaces; if this is built, prefer animating the
menu container only.

### 7.9 FadeOverflow gradient (live, deliberately static)

Not a transition. `FadeOverflow` is a static CSS gradient overlay with no
duration, no easing and no animated property. Confirmed: the component file
contains no `transition` or `animation` declaration at all.

**Do not apply motion tokens to `FadeOverflow`.** Its gradient endpoint is a
colour concern governed by COMPONENT_PATTERNS.md's Overflow Fade Pattern, not a
motion concern. The same applies to `StickyBar` and `TouchProgressLine`, both of
which are also entirely static by design.

---

## 8. What NOT to Animate

- Client-side data swaps: sort, filter, paginate.
- Row content changes after first load.
- Text content changes.
- Skeletons on a pagination page change. First load only, instant thereafter.
- Any operation that blocks user input.
- Error states. Use a colour change, never a shake.
- Tooltips on hover. Fade only, no translate.

---

## 9. Choreography Rules

### Order

1. Container establishes context.
2. Primary content appears.
3. Supporting content follows.
4. Decorative or secondary elements last.

### Stagger

| Item count | Recommended stagger |
|---:|---:|
| 2 to 3 items | 40ms |
| 4 to 6 items | 40ms, cap total at 160ms |
| 7 or more items | No individual stagger, animate the group |

**Rule: avoid stagger in productivity and admin interfaces.** Use it only where
it genuinely improves scanability of a list on first load. No portal surface
staggers today, and given that the admin lists page at 25 rows, none should:
25 rows at 40ms would take a full second to finish drawing a table the user can
already read.

---

## 10. Accessibility

### prefers-reduced-motion

Implemented in `src/styles/index.css`:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Scope note: `src/styles/index.css` is the whole application's stylesheet, not
a portal-only one.** It is imported once by `src/main.tsx` and covers the
marketing site as well. There is no CSS file anywhere under `src/portal`; portal
styling is entirely inline JS style objects plus injected `<style>` tags. Global
was therefore the only option, and it is also the correct one for this rule,
since a per-component opt-in is exactly what Principle 5 rejects. Be aware that
the marketing site's motion is now covered by it too.

**Known consequence: looping spinners freeze.** The blanket rule sets
`animation-iteration-count: 1`, which stops `Spinner.tsx`, the inline `Loader2`
spinners and the shimmer after a single 0.01ms cycle. For the shimmer that is
the intended outcome (a static placeholder block). For a spinner it means the
only visual signal that work is in progress stops moving. This is the accepted
standard tradeoff of the blanket approach and it is not a reason to weaken the
rule, but it does mean **any in-flight state must also be conveyed
non-visually**, through `aria-live`, a disabled control, or a text label. Giving
spinners a reduced-motion-safe alternative is a Phase 2 item.

### Portal-specific reduced-motion alternatives

| Default motion | Reduced-motion alternative |
|---|---|
| Drawer translate | Instant placement, scrim fade only |
| Modal scale + fade | Fade only |
| Skeleton shimmer | Static background, no animation |
| Page-change `tbody` fade | Instant swap |
| Pagination button hover | Colour change only, no background transition |
| Toast enter/exit | Instant appear and dismiss |

### Avoid always

- Large zoom transitions.
- Parallax tied to scroll.
- Shake effects for errors.
- Flashing or strobing.
- Long looping animations near controls.
- Motion that blocks interaction after content is visually available.

---

## 11. Component Inventory (audited 9 August 2026)

Every row verified against the live code. All paths are relative to
`src/portal/`. "Token" means the value comes from `theme.ts`'s `motionTokens`;
"raw" means a hardcoded literal.

### Shared components

| Component | File | Animation | Value in use |
|---|---|---|---|
| `Skeleton` | `components/shared/Skeleton.tsx:22,30` | `ecShimmer` keyframe | raw `1.5s linear infinite` |
| `SkeletonRow` | `components/shared/SkeletonRow.tsx` | None of its own, composes `Skeleton` | inherited |
| `ProgressiveImage` | `components/shared/ProgressiveImage.tsx:44,117,156` | Own `ecShimmer` (reversed direction) + fade-in on decode | raw `1.5s linear`; token `durationBase` + `easeDefault` |
| `Pagination` | `components/shared/Pagination.tsx:190` | Button hover only: background, opacity, color | token `durationFast` + `easeDefault` |
| `StickyBar` | `components/shared/StickyBar.tsx` | **None** | n/a |
| `FadeOverflow` | `components/shared/FadeOverflow.tsx` | **None**, static gradient | n/a |
| `TouchProgressLine` | `components/shared/TouchProgressLine.tsx` | **None** | n/a |
| `TouchPreviewModal` | `components/shared/TouchPreviewModal.tsx:289,300` | **None.** Static `opacity: 0.6` while busy | n/a |
| `TabBar` | `components/TabBar.tsx:42-43` | `ecTabFadeIn` on panel enter | token `durationFast` + `easeDefault` |
| `SidePanel` | `admin/SidePanel.tsx:18,88,96,107` | Slide from edge + scrim fade; `SLIDE_MS` derived from the token | token `durationBase`, `easeEnter`/`easeExit` |
| `Modal` | `admin/ui.tsx` | **None at all** | n/a |
| `Spinner` | `Spinner.tsx:22,26` | `portalSpin` rotation | raw `600ms linear infinite` |
| `LeadDrawer` | `components/LeadDrawer.tsx:816` | Inline `Loader2` rotation | raw `spin 1s linear infinite` |
| `EnquiryDrawer` | `components/EnquiryDrawer.tsx:192,209,279` | Inline `Loader2` rotation | raw `spin 1s linear infinite` |

### Admin surfaces

| Component | File | Animation | Value in use |
|---|---|---|---|
| `AdminShell` | `admin/AdminShell.tsx:300,314` | Mobile drawer slide + scrim fade | token `durationBase`, `easeDefault`/`easeEnter` |
| `TopBar` | `admin/TopBar.tsx:253,509` | `settingsPanelIn` slide from right | token `durationBase` + `easeEnter` |
| `toast` | `admin/toast.tsx:72-83` | `adminToastIn` / `adminToastOut`, 16px | token `durationBase`+`easeEnter` / `durationFast`+`easeExit` |
| `OutreachAdmin` | `admin/OutreachAdmin.tsx:104-105` | `ecTabFadeIn` on tab panel | token `durationFast` + `easeDefault` |
| `DeleteProposalModal` | `admin/DeleteProposalModal.tsx:113,208` | `deleteProposalIn`, 8px + scale 0.98 | token `durationFast` + `easeEnter` |
| `DeleteInvoiceModal` | `admin/DeleteInvoiceModal.tsx:61,151` | `deleteInvoiceIn`, 8px + scale 0.98 | token `durationFast` + `easeEnter` |
| `LeadsTab` | `admin/outreach/LeadsTab.tsx:578,609,966` | `ecFadeIn` on list | token `durationBase` + `easeEnter` |
| `LeadRowSkeleton` | `admin/outreach/LeadsTab.tsx:747` | Composes `Skeleton` | inherited |
| `MobileCardSkeleton` | `admin/outreach/LeadsTab.tsx:772` | Composes `Skeleton` | inherited |
| `ActivityTab` | `admin/outreach/ActivityTab.tsx:464,631,677` | Inline `Loader2` rotation | raw `spin 1s linear infinite` |
| `EnquiriesTab` | `admin/outreach/EnquiriesTab.tsx:171-172` | Inline `Loader2` rotation | raw `spin 1s linear infinite` |
| `TodayTab` | `admin/outreach/TodayTab.tsx:522,953` | `Loader2` rotation; progress bar width | raw `spin 1s linear`; raw `width 0.3s ease` |
| `MockupsAdmin` | `admin/MockupsAdmin.tsx:899,1386,1466` | `mockupBar` indeterminate bar; card transform | raw `1.1s ease-in-out`; raw `0.28s ease` |
| `ClientsList` | `admin/ClientsList.tsx:413,427,437` | Row highlight fade | raw `0.6s ease` |
| `ProjectsList` | `admin/ProjectsList.tsx:1264,1266` | Row highlight fade | raw `0.6s ease` |
| `NudgeModal` | `admin/NudgeModal.tsx:425` | Opacity | raw `120ms ease` |
| `ProposalNudgeModal` | `admin/ProposalNudgeModal.tsx:473` | Opacity | raw `120ms ease` |
| `ConfirmPaymentModal` | `admin/ConfirmPaymentModal.tsx:387` | Border colour | raw `0.15s ease` |
| `InvoicePreview` | `admin/InvoicePreview.tsx:649` | Transform | raw `0.28s ease` |

### Client and public surfaces

| Component | File | Animation | Value in use |
|---|---|---|---|
| `ClientDashboard` | `ClientDashboard.tsx:269-274,634,761` | `dashBannerIn` (8px), `dashBadgeIn` (scale), `.ec-shimmer` | token `durationBase`/`durationFast` + `easeEnter`; raw `1.5s linear` |
| `ClientNav` | `client/ClientNav.tsx:105,277,358` | `clientBadgeIn` scale-in | token `durationFast` + `easeEnter` |
| `ClientProposals` | `client/ClientProposals.tsx:103-104` | Inline `.ec-shimmer` | raw `1.5s linear infinite` |
| `ClientInvoices` | `client/ClientInvoices.tsx:118-119,638` | Inline `.ec-shimmer`; transform | raw `1.5s linear`; raw `0.28s ease` |
| `ClientCampaigns` | `client/ClientCampaigns.tsx:243-244` | Inline `.ec-shimmer` | raw `1.5s linear infinite` |
| `ProjectsList` (client) | `client/ProjectsList.tsx:90-91` | Inline `.ec-shimmer` | raw `1.5s linear infinite` |
| `MockupsPage` | `client/MockupsPage.tsx:186-187` | Inline `.ec-shimmer` | raw `1.5s linear infinite` |
| `ClientConceptSetPanel` | `client/ClientConceptSetPanel.tsx:298` | Panel transform | raw `0.3s cubic-bezier(0.4, 0, 0.2, 1)` |
| `ClientLightbox` | `mockups/ClientLightbox.tsx:231,262-385` | `fsIconIn`; control hovers | raw `120ms cubic-bezier(.4,0,.2,1)`; raw `.15s`/`.2s ease` |
| `SwipeCard` | `SwipeCard.tsx:50-58` | **`motion/react` (Framer Motion)**, drag + exit | raw `duration: 0.3, ease: [0.25,0.46,0.45,0.94]` |
| `ProposalView` | `ProposalView.tsx:683,699` | Background, border colour | raw `0.15s ease` |
| `PublicVotePage` | `PublicVotePage.tsx:935,951,977` | Progress bar width; background | raw `0.2s`/`0.3s`/`0.15s ease` |
| `SketchReviewPage` | `SketchReviewPage.tsx:1182` | Progress bar width | raw `0.3s ease` |
| `AdminSketchUpload` | `AdminSketchUpload.tsx:1958,2084,2117,2272` | Spinner; border; width | raw `0.8s linear`; raw `0.15s`; raw `0.2s ease` |

### Audit summary

- **79 transitions use `motionTokens`** from `theme.ts`. The dominant pattern is
  `<property> durationFast easeDefault`, which accounts for 41 of them.
- **31 transitions and 15 animations use raw values**, spread across 24 files.
  The raw duration set is `0.15s, 0.2s, 0.28s, 0.3s, 0.6s, 0.8s, 1s, 1.1s,
  1.5s, 120ms, 600ms`. Of these, only `120ms` and `1.5s` correspond to anything
  in the token scale.
- **`0.6s ease` row-highlight fades** in `ClientsList` and `ProjectsList` are
  the furthest outliers, three times `duration.slower`.
- **A second animation library is in use.** `SwipeCard.tsx` imports
  `motion/react` (the Framer Motion successor package). It is the only file in
  the portal that does. Its timings are unrelated to any token.
- **Zero `prefers-reduced-motion` handling existed** anywhere in `src/` before
  this document. That is now fixed, see Section 10.
- **Zero delays and zero staggers** exist in the portal, which matches Section 9.

---

## 12. Design Handoff Specification

Every non-trivial animation is documented with these fields. The point is that a
developer can implement from the table alone and a reviewer can check it without
reading the diff.

| Field | Description | Example |
|---|---|---|
| Component | What moves | Drawer, Modal, Tab panel |
| Trigger | What starts it | hover, click, route change |
| Pattern | Motion pattern name | modal-enter, drawer-slide |
| Properties | CSS properties | opacity, transform |
| Start state | Initial values | `opacity: 0`, `translateY(8px)` |
| End state | Final values | `opacity: 1`, `translateY(0)` |
| Duration | Token name | `motion.duration.slow` |
| Easing | Token name | `motion.easing.enter` |
| Delay | Token or 0ms | `motion.delay.short` |
| Reduced motion | Alternative | fade only |
| Notes | Edge cases | Content starts 40ms after scrim |

Worked example, the one live pattern that already meets this bar:

| Field | Value |
|---|---|
| Component | `SidePanel` |
| Trigger | Row click, panel `open` prop becomes true |
| Pattern | drawer-slide |
| Properties | `transform`, and `opacity` on the scrim |
| Start state | `translateX(100%)` desktop, `translateX(100vw)` mobile; scrim `opacity: 0` |
| End state | `translateX(0)`; scrim `opacity: 1` |
| Duration | `motion.duration.base` today, `motion.duration.byDistance.panel` planned |
| Easing | `motion.easing.enter` opening, `motion.easing.exit` closing |
| Delay | 0ms |
| Reduced motion | Instant placement, scrim fade only |
| Notes | Unmount is timed by `SLIDE_MS`, parsed from the duration token. A JS timeout that must outlast a CSS transition is always derived from the token, never retyped as a literal |

---

## 13. Governance

### Source of truth

- **`docs/MOTION_SYSTEM.md`** (this file) for the portal's motion rules.
- **`src/portal/motion.ts`** for the code token object.
- **`src/portal/theme.ts`** for the legacy flat `motionTokens` still in use by
  every current call site, until Phase 2.
- **`docs/COMPONENT_PATTERNS.md`** for per-component usage.

Where this file and COMPONENT_PATTERNS.md both describe a component,
COMPONENT_PATTERNS.md wins on component behaviour and this file wins on motion
values. The pagination case in 7.2 is the worked example: COMPONENT_PATTERNS
decides that the bar does not animate, this file decides what `duration.fast`
means when something does.

### Resolving the two `motionTokens`

Until Phase 2 completes, both `theme.ts` and `motion.ts` export a symbol named
`motionTokens` with incompatible shapes. Rules while that is true:

1. Existing code keeps importing from `theme.ts`. Do not migrate a file
   opportunistically.
2. Never import both into one file.
3. New code that needs a value absent from `theme.ts` (`micro`, `moderate`,
   `slower`, `snap`, distances, delays) imports from `motion.ts` and states so
   in a comment.
4. The migration is one atomic pass, and it must reconcile the three
   divergences in 4.1 as part of that pass.

### Change process

1. Propose the new token or pattern.
2. Check whether an existing token already solves it.
3. Add only if it covers a repeated use case, not a single screen.
4. Update `docs/MOTION_SYSTEM.md`, `src/portal/motion.ts` and
   `docs/COMPONENT_PATTERNS.md` together.
5. No new animation without a token reference.

### Review checklist

- Uses approved duration and easing tokens?
- Explains a state change or improves usability?
- Avoids unnecessary layout shift?
- Handles `prefers-reduced-motion`?
- Remains interruptible during rapid interaction?
- Performs well on lower-power devices?
- Documented in handoff format if complex?
- If it sets a JS timeout to match a CSS transition, is that timeout derived
  from the token rather than retyped?

---

## 14. Implementation Roadmap

### Phase 1 (done, 9 August 2026): Foundation

- Motion token object at `src/portal/motion.ts`.
- Global `prefers-reduced-motion` block in `src/styles/index.css`.
- Existing animations documented and audited, Section 11.

No component behaviour changed in Phase 1. The reduced-motion block is the one
exception and it changes behaviour only for users who have asked for it.

### Phase 2 (next sprint): Core patterns

Ordered by value, defects first:

1. **Resolve the duplicate `ecShimmer` keyframe** (7.3). Two definitions sweep
   in opposite directions under one name. This is a live defect, not a cleanup.
2. **Migrate the roughly sixty `theme.ts` call sites to `motion.ts`** in one
   pass, reconciling `durationSlow` 350 vs 360, `easeDefault` vs
   `easing.standard`, and retiring the flat export. Nothing else in Phase 2
   should start before this lands.
3. **Replace the 31 raw transition values** with tokens, starting with the
   `0.6s ease` row highlights and the four `0.28s ease` transforms.
4. **Unify spinner rotation.** 600ms, 0.8s and 1s currently coexist. Pick one
   and give spinners a reduced-motion-safe alternative (Section 10).
5. **Apply the modal pattern in the shared `Modal`** (7.5), then delete the
   hand-rolled `deleteProposalIn` and `deleteInvoiceIn` keyframes.
6. **Apply `easing.snap` and `byDistance.panel` to `SidePanel`** (7.4),
   preserving the `SLIDE_MS` derivation.

Proposed, and requiring a design decision first because it contradicts a
documented one: the pagination `tbody` fade in 7.2.

### Phase 3 (future): CSS custom properties

Migrate from JS constants to CSS custom properties. **Do not start this until
the colour tokens migrate too.** The portal has zero custom properties today,
and introducing them for motion alone would leave two token layers with
different mechanics, which is the exact problem `FadeOverflow` already works
around for its gradient endpoint.

### Phase 4: Governance

- Motion review added to the PR checklist.
- Visual regression coverage for animations.
