# Newgen quotation module, field test round 2 findings

Run on **production** (portal.newgeneventstudio.com, main @ 4b9eb7a7, Build 4 phases 1–7 complete) on 9 Sept 2026. Driven by Mani in the browser with Eswar watching. Scenarios S1 and S2 from the Quotation Builder Field Test artifact. Round 1 covered the Phase 1.5 build; this round covers the Build 4 rebuild.

Test records created: **NES-2026-1020** (S1, left in `sent` state with a live public link), **NES-2026-1021** (S2, left as `draft`), and **NES-2026-1022** (created later the same day, "Test", Engagement, while confirming the finding-6 fix below). All three need cleanup with the earlier test records.

---

## S1, the Saturday enquiry — PASS on screen and share link, FAILED on PDF export

Wedding Reception, 15 Nov 2026, Shree Venkatesh Mahal, 400 guests. Four zones, finish left on default, sent, public link opened as the client.

**Verified working:**

- Venue autocomplete returns the Google-verified spelling and offers to save an unmatched entry as a new venue.
- `Build the Scope` states its own disabled reason as a live count ("3 details to go") rather than sitting greyed and silent.
- Fourteen zones on the rail in spec order with short labels; per-zone line counts appear as badges.
- An unpriced line trips the amber notice, the total reads incomplete, and Send stays blocked until every line is priced. Entering the rate clears all three at once.
- Totals recompute instantly on quantity, rate and finish changes with no save step.
- The 10/90 advance is live: Advance (10%) ₹480 due now, Balance (90%) ₹4,320 due 5 Nov 2026, computed as Day 1 minus ten days, and stated in the terms with the real date rather than a vague "before the event."
- The document carries the real gold lockup, the white kolam lattice at the approved .13 and the sheen at .68, zone group headers, per-line finish on floral lines, and no finish label on non-curve lines (Chandeliers correctly bare).
- The public link renders the client document alone: no admin toolbar, no nav, tenant-titled tab. A find across it for `307`, `multiplier`, `curve` and `artificial` returns nothing; finish appears only as ladder labels.
- No em dashes anywhere in generated copy.

**Findings:**

1. **Login route carries the portfolio tab title.** `/portal/login` shows "Eswar Maheswaran — Enterprise SaaS Design Systems Architect". Every post-login route is correct ("Dashboard · Newgen Event Studio", "Quotations · Newgen Event Studio") and the public quotation page is correct too, so the Build 2 item 2.7 fix reached the app but not the login shell. Cosmetic, but it is the first screen a client-facing user sees. The real cause turned out to be pre-hydration: every route ships the portfolio `<title>` in the raw served HTML and JS corrects it after mount, worse on login because that's the coldest first load. Real fix needs a tenant-aware `<title>` at build time, in `vite.config.ts` or `prerender.mjs`. **S3, open — blocked on Eswar committing or stashing his own uncommitted edits to those two files, so the fix doesn't sweep his work into its commit.**
2. **Catalogue add buttons are not keyboard reachable.** The `+` controls on catalogue rows are absent from the accessibility tree and carry no accessible name, so they are mouse-only targets. Field-test items M3 and M4 fail on the builder's primary action. This was visible during the run because even automation had to aim by pixel rather than by reference. **S2, and the most substantive S1 finding. Fix open as PR #47 — not yet merged; sits one commit behind `main` after PR #48 landed and needs a rebase and re-verify before it goes in.**

3. **Quotation PDFs print completely blank. Found by the coding session's own smoke, missed by this run.** Printing NES-2026-1020 produced a correctly paginated but empty 1310-byte PDF. Cause is pre-existing and app-wide, not a Phase 7 regression: the invoice print block in `styles/index.css` opens with a global `body:not([data-ec-printing]) * { visibility: hidden }` and re-shows only `.ec-invoice-document`, while both quotation print buttons call a bare `window.print()`. Quotations have therefore printed blank since the invoice PDF feature landed, with the old document design too. Related: `.no-print` sits on both quotation surfaces but was never defined anywhere. **Fix merged and live in production as PR #46**: blank → 552 KB, two pages, kolam and sheen painting, computed balance date on page 2, no clipped rows, real-invoice printing confirmed untouched. Outstanding: an end-to-end billing confirmation on a real (non-test) invoice print hasn't been done yet.

   *Method note, worth keeping.* This run checked the document on screen and through the public share link and called S1 a pass. It never exercised Print / Save PDF, which is field-test item H7 and an explicit Gate 7 line. The scenario script says to preview and send; it does not say to print, so the omission was in the script as much as the run. **S3 and S5 must include an actual saved PDF, not a print preview**, and the field-test artifact's S1 steps should say so.

**Timing:** roughly twelve minutes with deliberately careful automation clicking. A practiced human lands comfortably under ten, against the forty-minute Word baseline.

---

## S2, the full wedding, two functions — PASS

Reception 14 Nov evening and Muhurtham 15 Nov morning, community Brahmin, Illam Hospitality Amazonite, 600 guests, "same mandapam" answered as retained with additions. Two lines per function, reception at 50:50 Fresh then dropped to 30:70, muhurtham at 100% Fresh.

This scenario exists to catch one silent failure: lines landing in the wrong function, and a finish change bleeding across functions. Neither occurred.

**The function context is stated four independent ways at once:**

- the active Reception / Muhurtham tab,
- a per-function line-count badge on each tab,
- "Showing: Muhurtham" in the drawer header,
- "Adding to Aisle · Muhurtham" at the add point.

Zone counts rescope per function, and the catalogue reprices to the active function's finish, so the price shown before adding is the price you get.

**Verified working:**

- Ticking the Muhurtham checkbox reveals the retain-or-replace question, which prints on the document as a chip reading "Reception setup retained, with additions."
- The finish selector is labelled with its own scope, "FINISH — MUHURTHAM", not a bare "Finish."
- **Cross-function independence (item E7).** Muhurtham at 100% Fresh sat at ₹1,000 per line. Dropping reception from 50:50 to 30:70 moved its lines ₹500 → ₹350 each and left muhurtham at exactly ₹1,000. Total ₹2,700 = reception ₹700 + muhurtham ₹2,000.
- Null-curve items hold flat through every finish change: Bunches ₹1,500 and Bushes ₹2,500 in both functions.
- Each line carries a "→ Muhurtham" / "→ Reception" move control, tooltip "Move this line to the other function. Curved lines reprice at that function's finish." Not specified anywhere; a good addition.
- The document groups by function with per-function subtotals, then a combined subtotal and total.
- Balance due date anchors to **Day 1** on a multi-day event: 4 Nov 2026 from a 14 Nov start, not counted from Day 2.
- **Venue seed fix confirmed live.** Typing "Illam" returns all four halls in the correct comma form (Illam Hospitality, Amazonite / Priyam / Shivam / Varham). Build 2 blocker 1.1 is closed on production.

**Findings:**

4. **Muhurtham is expressed in two places that do not talk to each other.** The enquiry step has both a "This quotation includes a Muhurtham" checkbox (which creates the second function) and a Days and Sessions block whose helper text reads "Muhurtham is the morning slot; the reception is the evening." Nothing validates one against the other. A user can tick the checkbox while leaving every session as Evening, or set a Day 2 morning session without ticking the box, and the build accepts either silently. Needs a decision: either the morning session drives the checkbox, or the two disagree visibly with a warning. Recommendation on record: a non-blocking inline note, shown only when they contradict, only on wedding-family event types, that never blocks Continue — deriving the checkbox from the session slot was rejected (would silently change the pricing model, "morning" isn't muhurtham outside weddings, Build 2 deliberately made days/sessions explicit rather than inferred, and real bookings legitimately disagree). **S2, open — waiting on Eswar's go-ahead to build.**
5. **Zone 2's short label is misleading.** The rail reads "Entrance / Elevation" for zones 1 and 2, which parses as zone 1 split in two, because zone 1's full name is "Entrance and elevation" and zone 2's short label is "Elevation". Zone 2 is actually "Mandapam building decoration (exterior and elevation)" — the short label was taken from the parenthetical rather than the zone's identity. Fix: short label "Mandapam", and audit the other thirteen for the same trap. **Shipped to production in PR #45**; the audit found no other instance, and two deliberate near-misses are now documented in the module ("Hall door" not shortened to "Hall" since zone 11 owns that, "Music stage" keeping its noun so it cannot read as zone 10's "Stage"). The identity-not-qualifier rule is recorded at the top of the file, and the zone rail spec doc — previously untracked in git — was brought under version control in the same commit. **S3, closed.**

6. **Follow-up, same day: the rail's short label didn't reach the zone-assignment dropdowns.** Caught live by Eswar while re-checking finding 5 — the rail tab correctly read "Mandapam", but both the "move this line to another zone" select and the mockup-candidate zone picker still spelled out the full DB name, "2. Mandapam building decoration (exterior and elevation)". Same zone, two different names on screen at once. The code comment documenting `zoneShortLabels.ts` had claimed this was deliberate ("the assignment dropdown menu ... always use the full DB name"); it wasn't — that line was simply wrong. Fix: route both dropdowns through the same `zoneShortLabel()` helper the rail uses, in `QuotationBuilder.tsx` (mockup-candidate picker and the line-move select), and correct the stale comment. Useful side effect: a native `<select>`'s closed state now shows the chosen option's own text, so the on-screen chip reads "2. Mandapam" outright instead of the ellipsised "2. Mandapam building dec…" that Phase 7 item 10 had worked around with truncation. **This supersedes an approved Gate 7 line** ("the open menu shows the full name") — that verified behaviour is exactly what this finding identifies as the bug, noted in the commit and PR so it doesn't read as a silent regression later. **Shipped to production in PR #48.** One small inconsistency left on purpose (scope was kept tight): the mockup-candidate picker has no hover title showing the full name, unlike the move-line select — low impact until the mockup analyser is wired up (needs `ANTHROPIC_API_KEY`); flagged as a one-attribute follow-up if wanted.

---

## Carried forward, not from this run

- Mohan anna's one-line confirmation: does the 10/90 split stay per-quotation editable, or become fixed?
- Footer domain conflict, newgeneventstudio.com against newgeneventmakers.com, still unresolved.
- Test records in the live tenant: NES-2026-1007, 1008, 1009, 1014, 1019, 1020 (sent, live link), 1021 (draft), and now 1022 (Test, Engagement — created confirming finding 6's fix).
- Scenarios S3 (shop opening, conditional logic), S4 (photography gap) and S5 (revision after sending, the silent price-change risk) not yet run this round. S5 is the commercially significant one.
- PR #47 (catalogue keyboard accessibility, finding 2) needs a rebase against `main` and re-verify before merge.
