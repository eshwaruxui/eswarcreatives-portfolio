# Newgen quotation module, build 2 sanity check findings

Date: 8 Sept 2026. Checked on the local dev server against the live Newgen tenant, test quotation NES-2026-1014 (Wedding Reception, CPM Royal Palace, 3 days, two sessions on day 1). Combines the guided sanity pass with Eswar's annotated review. PR #37 should not merge until section 1 is fixed.

## 1. Blockers

### 1.1 Venue seed used the old unverified names

Seeded list: CPM Royal Palace, Illam Hospitality Amazonite, Illam Hospitality Priyam, Illam Hospitality Shivam, Illam Hospitality Varham, MKS Grand Palace, NRP Mahal, Selvi Mahal, Sri Venkatesh Mahal.

The build prompt gave the Google verified spellings and said explicitly not to seed the name Selvi Mahal, because two unrelated Chennai venues carry that exact name and outrank the partner. Reseed from `docs/Newgen_Venue_Directory.md`, including phones and addresses.

| Wrong in seed | Correct |
|---|---|
| Selvi Mahal | Selvi Thirumana Mahal |
| Sri Venkatesh Mahal | Shree Venkatesh Mahal |
| MKS Grand Palace | M.K.S Grand Palace |
| NRP Mahal | NRP MAHAL |
| Illam Hospitality Amazonite, Priyam, Shivam, Varham | Illam Hospitality, Amazonite (comma form; four halls under one listing, shared phone 098410 53871) |

### 1.2 The document states one finish while lines carry their own

The printed quotation reads "Finish: Full fresh flowers" at scope level while the Stage garden line on the same page is Balanced blend at ₹364. A client reads full fresh against a balanced price. Print the finish per line, and print the quotation level finish only when every line agrees with it.

### 1.3 Days and sessions never reach the document

The builder holds 3 days and four sessions. The printed document shows only event type and venue. Add the day and session summary to the event details block, plus the event date when one is set.

## 2. Small fixes, same pass

### 2.1 Zone banner reads as an error (Eswar)

The red banner "Pick a zone above to start adding elements. Nothing can be added until you do." renders on every load, including when a zone is already selected and the quotation holds two lines. Red fill plus the hard phrasing reads destructive, as if something failed. Change to neutral guidance styling with a friendly empty state tone, render it only when no zone is selected, and remove it entirely once a zone is picked.

### 2.2 Line items panel too small (Eswar)

The right panel gives line items a short internal scroll window. With only two lines the second is already clipped behind the finish block, and per line controls hide mid card. Make the region expandable: let the list grow with content and collapse the finish, discount, advance, validity and GST controls into a quotation settings group, or give each line a one row collapsed summary that expands on tap.

### 2.3 Full catalogue list is not user friendly (Eswar)

With All selected the catalogue renders roughly seventy flat rows, most reading rate TBC, in one long single column. Finding an item means scrolling the entire library. Quick mitigation in this pass: group rows under sticky category headings and sort priced items above rate TBC within each group. The fuller treatment belongs to the parked quotation layout design pass.

### 2.4 Stale panel copy

"Pick a zone above, then tap elements to add them here" stays in the right panel after a zone is picked.

### 2.5 Catalogue row shows the anchor, not the effective price

Stage garden shows ₹1,000 / running ft while the quotation finish is Balanced blend, and adding it lands at ₹500. Two numbers for the same item on one screen. Show the effective price for the current quotation finish, or label the anchor as the full fresh rate.

### 2.6 Session chips in insertion order

Day 1 reads Evening + Morning. Sort session chips chronologically, Morning first, in the days card and in the builder header line.

### 2.7 Browser tab title

The portal tab still reads "Eswar Maheswaran, Enterprise SaaS Design Systems Architect", inherited from the portfolio site. Set a tenant aware document title.

## 3. Known open items, unchanged by this build

- Terms still say 50 percent advance and 7 day validity. Mohan anna described 10 percent booking and 90 percent ten days before the event. Blocked on client confirmation.
- Footer contact set is still newgeneventstudio.com with 9176045045. The conflict with newgeneventmakers.com is unresolved.
- Test records NES-2026-1007, 1008, 1009 and now 1014 sit in the live tenant.

## 4. Verified correct

- Fourteen zones in the exact spec order, mandapam building decoration at position 2.
- Curve pricing. Running ft anchor 1000 lands at ₹500 balanced and ₹1,000 full fresh. Unit switch to sqft re-anchors to 650, giving ₹400 balanced.
- Per line finish overrides the quotation finish without changing it.
- Floral canopy (fixed) offers exactly three finish levels.
- Bunches ₹1,500 and Bushes ₹2,500 flat with no finish selector, as the null curve intends.
- Commission ticked shows incl. ₹36/unit, unticked shows stripped 10 percent, ₹364/unit.
- Intake counter, progressive disclosure, venue filter with the new venue hint, Muhurtham checkbox on wedding reception.
- Three day selection with a second session on day 1, chips removable.
- Full persistence through a page refresh.
