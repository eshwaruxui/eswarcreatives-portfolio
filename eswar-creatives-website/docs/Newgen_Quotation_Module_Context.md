# Newgen Quotation Module - Continuation Context

**Project:** Newgen Event Studio - Semi-automated Quotation System
**Owner:** Eswar Creatives (Eswar Maheswaran, founder)
**Client:** Mohan A (founder, Newgen Event Studio) - addressed as "Mohan anna"
**MD ma'am:** Co-owner, must be present at formal presentations
**WhatsApp Business:** 9176045045 (Wati CRM)

> **Updated 04 Sep 2026.** Section 2 (domain model and costing) added from a 60 minute recorded walkthrough with Mohan anna, transcribed in Tamil. That section supersedes the six-category item library described in Section 1 and closes the module's largest open risk. Em dashes removed throughout to match the standing Newgen documentation rule.

---

# SECTION 1 - What exists today, Phase 1 (confirmed, Mohan anna approved)

A fully working React/JSX artifact was built as a Claude artifact. It is production-quality UI ready for handoff. The artifact file is `newgen_quotation.jsx`.

### Three-step flow

**Step 1 - Client and Event Details form**

Fields: client name, phone, email, address, event type (16 types from Wedding Reception to Temple Function), event date, venue/mandapam, expected guest count, special notes. Cannot proceed without name, phone, event type, date, venue.

**Step 2 - Build the Scope (builder)**

Two-panel layout. Left panel: item library + mockup analyser + manual entry. Right panel: live quote summary with qty/rate controls, discount, advance, GST, validity days.

Item library as built: 40+ items across 6 categories (Stage and Backdrop, Floral Decoration, Lighting and AV, Photography and Video, Event Management, Furniture and Props).

**This grouping is superseded. See Section 2.** It was a reasonable guess made before the walkthrough and it is not how Newgen quotes.

Mockup analysis: upload a ChatGPT concept image, Claude API reads it and auto-identifies decoration elements, adds them to line items with pre-filled rates.

Manual entry: custom item name, rate, qty, unit, category.

**Step 3 - Preview and Print**

Full branded quotation document in Newgen visual language: teal header, gold type, Cormorant Garamond serif for brand elements, Inter for all document body text. Print button, Save as PDF, Email button (opens mail client with pre-filled subject and body).

Quote number format: NES-2026-1001 (structured for Supabase storage).

### Font system (locked)

Inter throughout the entire UI (all three steps). Cormorant Garamond kept only in the printed quotation output document (header, client name display, "Quotation" title, footer tagline).

### Brand colours

| Token | Hex |
|---|---|
| Teal (primary) | #024C4F |
| Gold | #D5B067 |
| Cream | #FAF8F4 |
| Ochre | #E1A23D |
| Ruby | #B00D2D |
| Border | #E2DDD6 |

### Confirmed operational details (for document accuracy)

| Field | Value |
|---|---|
| GSTIN | 33CJWPD2137G1ZA |
| SAC code | 998596 |
| Stationery address | 15, Major Mukund Varadarajan Rd., Narayanapuram, Pallikaranai, Chennai 600100 |
| GST address | No.5, Easwar Nagar, 5th Street, Kodambakkam, Chennai-600024 |
| WhatsApp | +91 9176045045 |
| Email | studio@newgeneventstudio.com |
| Website | newgeneventstudio.com |

---

# SECTION 2 - Domain model and costing (added 04 Sep 2026)

**Source:** 60 minute recorded walkthrough with Mohan anna, transcribed in Tamil.
**Status:** domain model confirmed by the client. Rates still to be supplied.
**Related:** Notion, "Newgen service vocabulary and the guest journey" under the Newgen Project master page.

This closes the module's biggest open risk. Phase 1 shipped with 40+ items across 6 invented categories and placeholder rates. The walkthrough gives Newgen's real structure, in Mohan anna's own vocabulary, with the actual cost drivers.

## 2.1 Why the current item library is structurally wrong

Mohan anna quotes by walking the venue from outside in, pricing each zone as he reaches it. His words: **first I come from outside in.** Every job is priced against the guest journey, not against a category list.

Two consequences.

**The library should be organised by zone, then element.** A quotation built zone by zone mirrors the conversation that produced it, which makes it faster to build and far easier for the client to read, because it matches the walkthrough they just had.

**Finish level is a variable, not a line item.** It applies across floral elements and changes both material cost and labour count. Modelling it as a line item would be wrong.

## 2.2 Zones, in quoting order

1. Valet parking area
2. Lift placard
3. Entrance and elevation
4. Pathway
5. Hall door
6. Selfie point
7. Welcome table
8. Aisle
9. Stage
10. Hall
11. Music and dance stage
12. Buffet and dining
13. Return gift point

Not every job uses every zone. The builder should present all thirteen and let unused ones stay empty, because the empty ones are the upsell prompts.

## 2.3 Elements, by system

Each is a distinct billable item with its own labour basis.

### Floral elements
| Element | Notes |
|---|---|
| Stage garden | Row along the front of the stage |
| Top garden | Along the top of the backdrop only |
| Ceiling garden | Hangs above the couple. Requires truss and mesh. Cannot be fixed direct |
| Shape garden | Heart, arch, ring, U |
| Sofa garden | Beside the sofa, to highlight the couple |
| Bunches | Fitted flat to the wall |
| Bushes | On a stand, round, finished all four sides |
| Bouquets | Arranged in rows. Not garlands. Garland is maalai |
| Floral pasting | Flowers on foam on plywood. Garden pasting and traditional pasting are different jobs |
| Floral canopy | Poo pandhal. Carried over the couple, or fixed. Umbrella variant is now common |

### Structure and surface
Backdrop, panels, printing, glass, metal, wood, flooring, ceiling, side wall, mugappu, elevation or pergola, ramp platform, step and grill covering.

### Flooring types
Constructed or plywood floor, carpet, masking (custom print on flex, laid over carpet), vinyl.

### Lights and props
Chandeliers, bird lights (still or moving), butterflies (static or motorised), stands, flower pots, flower vases, name logos, shape cuttings, parachute, metal formed with stretched cloth and internal lighting.

Props split cleanly into **motionable** and **static**. Motion carries a motor and a higher rate.

### Furniture
VIP sofas (traditional or fancy, customised to the setup), tables, chairs, chair covers, sashes, centre pieces, stalls.

### Traditional properties
Ammi, arasaani kaal, muthappaanai, vilakku. Arranged when the family does not have them. Ritual items, not decoration, and they belong in their own group.

### Aha moments
Mohan anna's own term, better than "special effects". Spyro (cold spark, gold, not tissue), fog, flower shower, balloon blast, helium release, palanquin entry on a motor.

### Signage and wayfinding
Name board (two recommended: one with the couple's names, one with both sets of parents' names, because guests know the bride's name but often not the groom's), lift placard, hall door board, selfie point marker.

## 2.4 The finish ladder

The single biggest cost variable, and it is currently absent from the module.

| Finish | What changes |
|---|---|
| 100% real | Highest florist count, highest material cost, shortest life span |
| 60:40 real to artificial | One step below full real |
| 50:50 | Alternating lines of real and artificial. Read as a whole, the difference is not visible |
| 30:70 | Leaves and gypsy real, flowers artificial. Reads as roughly 70% natural to the eye. Crew shorthand is "307"; Mohan anna writes 30 and the team understands |
| Ready-made artificial | Pre-made panels, zero florist work. Two options only: with red (traditional) or without red (pink, peach, white, beige, reads fancy). Colour cannot be customised |

**Implementation:** a single selector on the quotation that recalculates florist count and material cost across all floral line items. Not a line item.

**Gerbera is the budget flex.** Where artificial would otherwise be used, gerbera covers the gap and holds the look. Worth exposing as an option on floral items.

**Client-facing language.** Never "70% artificial". Use the finish name and what it delivers. The internal ratios and the "307" code stay inside the module and never appear on a client document.

## 2.5 Labour basis for rate calculation

Straight from the walkthrough. These are the numbers that should sit behind the rates.

| Work type | Capacity | Note |
|---|---|---|
| Garden work | 30 to 40 running feet per person per 6 hour shift | This is true capacity. Mohan anna quotes at 15 to 20 feet per person and was explicit that the lower figure is a sales method, not the real rate |
| Floral pasting | One 8x4 plywood panel per person per session | In practice two people to two panels, because leaf work and foam cutting slow it |
| Ceiling work | One 8x4 per person per day maximum | Work is done with the neck extended, so output halves |

**Ceiling costs more than floor for the same area.** That is the reason, and it should be built into the rate rather than applied as an ad hoc uplift.

**Available window is a cost driver.** Muhurtham setup happens after the reception clears, typically 1am to 2am, with a hard finish around 5am. Roughly five hours. Crew size to hit that window is a real quotation input.

**Carpet is single use.** Once walked on it marks. Price as consumed, not as rental.

## 2.6 Materials

Four base materials drive cost before any decoration: **cloth, flex, plywood, iron.**

The backdrop material choice is the first budget lever in every conversation.

## 2.7 Muhurtham is a separate job

Currently missing from both the business profile service list and, effectively, from the module.

It is not a discount on the reception. Equivalent working hours, executed overnight in a five hour window, and clients frequently specify **real flowers for the morning even when they accepted artificial the night before**, because the fragrance is believed to invite the elders and ancestors. Cost is not the deciding factor there.

Quotation implication: muhurtham needs its own finish selector, independent of the reception. Defaulting it to the reception's finish will produce wrong quotes.

**Reuse question the builder should ask:** is the reception setup retained with additions, or fully changed? This materially changes the price and Mohan anna asks it on every job.

## 2.8 Community variation affects the canopy

Operational, not cosmetic.

- **Brahmin:** no muhurtham mandapam. A muhurtham backdrop instead, because many priests and continuous homams mean centre pillars obstruct the ceremony
- **Nadar:** no mandapam. Elders hand over the thaali directly
- Others vary again

The event type selector should carry community as an optional field, since it changes what gets built.

## 2.9 Terminology corrections

- **Mandapam setup means the venue building setup**, not the wedding canopy. The canopy is **muhurtham setup**. The Step 1 field currently labelled "venue/mandapam" is correct in that sense, but any item named "mandapam setup" meaning a canopy is wrong
- **Garland is maalai** and is not a bouquet. The rows on a stage are bouquets

## 2.10 Recommended changes to the Phase 1 module

1. Restructure the item library from 6 invented categories to **zone, then element**
2. Add a **finish level selector** applying across floral items, with independent selectors for reception and muhurtham
3. Add **Muhurtham setup** as a first-class event component
4. Add **traditional properties** as an item group
5. Rename "special effects" to **Aha moments**
6. Add **community** as an optional field on the event details step
7. Add the **retain or replace** question for multi-function bookings
8. Keep the internal ratio codes out of every client-facing document

## 2.11 Still outstanding

The rates themselves. The domain model is now confirmed but the item library still carries the prototype's placeholder pricing. That remains the largest risk before the module touches a live client, and it needs a working session with Mohan anna against this structure rather than against the old six categories.

---

# SECTION 3 - Proposal status, in progress

A new proposal needs to be raised through the eswarcreatives.in portal. This is separate from EC-P-2026-005 (Strategic Growth Execution Plan). It is NOT connected to the Rs.3L/month growth partnership - it is a standalone product scope.

### Confirmed answers to the five open questions

1. **Pricing:** Scope not fully defined yet - total target around Rs.58,000 for confirmed items
2. **Scope boundary:** Quotation module sits alongside Solution 07 CRM and Lead Automation as additional scope within that solution
3. **Proposal format:** Combined or separate proposal through eswarcreatives.in portal (to be decided)
4. **Recipient:** Through portal - both Mohan anna and MD ma'am
5. **Growth partnership connection:** Not connected - separate billing

### Confirmed line items for the proposal

| Item | Amount |
|---|---|
| Architectural and Database setup - Quotation Module | Rs. 26,000 |
| Design system development - Quotation Module specific | Rs. 4,000 |
| Visual Proposal feature (new) | Pending - documents and audio transcript to be shared by Eswar |
| Visual Work Order feature (new) | Pending - documents and audio transcript to be shared by Eswar |
| Monthly maintenance | To be confirmed |

**Note on Rs.58,000:** Rs.26,000 + Rs.4,000 = Rs.30,000 confirmed. The remaining amount covering Visual Proposal and Visual Work Order needs breakdown clarification - is Rs.58,000 the total of all four items, or Rs.30,000 + Rs.28,000 for the two new features? Clarify before finalising proposal.

### Items still blocking the proposal

1. Documents and audio transcript for Visual Proposal feature - Eswar to share
2. Documents and audio transcript for Visual Work Order feature - Eswar to share
3. Confirmation of whether Rs.58,000 is the combined total or additional amount

**Possible scope addition:** the Section 2 restructure is real work and is not in the current line items. Decide whether it is absorbed or quoted before the proposal goes out.

---

# SECTION 4 - Ideal features by phase (CRM, ERP, Inventory)

### Phase 1 - Quotation System (confirmed)

- Client and event details form
- Item library, to be restructured per Section 2
- AI mockup analyser (Claude API reads concept images, auto-populates line items)
- Manual item entry
- Qty and rate editing inline
- Discount, advance percentage, GST toggle, validity days
- Branded print-ready quotation document (Newgen visual system)
- Email send via mailto with pre-filled subject and body
- Quote number format: NES-YYYY-XXXX

### Phase 2 - CRM Integration (pipeline)

- Supabase storage for all quotations (quote number, client, event, items, totals, status)
- Quote status tracking: Draft, Sent, Approved, Rejected, Converted
- Wati integration: auto-send quotation summary to client WhatsApp on generation
- Lead pipeline view: New Enquiry, Quotation Sent, Follow-up, Booked, Completed
- Auto follow-up sequences: Day 1, Day 3, Day 7 after quotation sent
- Client history: all past quotes per phone number
- WhatsApp warm greeting image trigger on first contact

### Phase 3 - ERP and Inventory (pipeline)

- Event execution checklist linked to each confirmed booking (Notion SOP integration)
- Inventory tracking: items owned vs. rented per event
- Vendor management: supplier contacts, rates, availability
- Revenue dashboard: monthly, by event type, by venue
- Staff assignment per event
- Post-event: actual vs. quoted cost reconciliation
- Google review request automation triggered after event completion

---

# SECTION 5 - Technical stack confirmed

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript |
| Database | Supabase (ref: urrinqwcrpivmvenupiu, region ap-south-1) |
| CDN/Functions | Cloudflare Pages |
| CRM/WhatsApp | Wati Growth plan |
| Hosting | Hostinger Business (Mumbai server) |
| Domains | newgeneventstudio.com, newgeneventstudio.in |
| Portal pattern | Reusing eswarcreatives.in architecture (multi-tenant, per TENANT_ID) |

---

# SECTION 6 - Key working rules

- No em dashes anywhere - use hyphen with spaces, comma, colon, or parenthesis
- No exclamation marks in Newgen copy
- No rhetorical questions in headlines or body copy
- WhatsApp messages to Mohan anna: colloquial Chennai Tamil/Tanglish, domain nouns stay in English, anna address form throughout
- Quote number format: NES-YYYY-XXXX (Supabase-ready)
- Static QR codes only for printed material (api.qrserver.com, no account, no expiry)
- Proposal framing: Eswar Creatives owns execution, not advisory only
- Internal finish ratios and the "307" code never appear on a client-facing document

---

# SECTION 7 - Additional skills built

- `newgen-crew-illustration.skill` - generates ChatGPT prompts to convert any cropped object photo into a watercolor and ink illustration with 3 Newgen crew members. Enforces the full illustration system: teal uniforms (#024C4F), shadow dot colour #596d68, transparent background, 16:9 ratio, ground line. Packaged and ready to install.

- Standalone halftone ground shadow prompt created (evolved version) - for adding or correcting shadow on existing illustrations only.

---

# SECTION 8 - Next actions

1. Working session with Mohan anna on rates, against the Section 2 zone and element structure rather than the old six categories
2. Share the Visual Proposal and Visual Work Order documents and transcripts
3. Clarify the Rs.58,000 breakdown
4. Decide whether the Section 2 restructure is absorbed or quoted
5. Then draft the full proposal for the eswarcreatives.in portal

The `newgen_quotation.jsx` artifact is complete with the Inter font system throughout the UI and is ready for development handoff, subject to the Section 2.10 restructure.

---

# SECTION 9 - Build 2, applied 9 Sep 2026 (curve pricing, snapshots, commission, venues, days/sessions)

The finish ladder locked with Mohan anna on 8 Sep replaced the single global multiplier. Migrations 0115-0118 applied to `mqkvguzyjvhlnilmollp`; 0119 (drops the deprecated `floral_multiplier` column) is committed but must be applied only AFTER the build-2 frontend deploys, because the pre-build-2 builder still selects that column.

**Pricing model now:** `quotation_curves` + `quotation_curve_steps` (ratio, 6dp) + `quotation_item_rates` (anchor per item AND unit; an item can price per running ft and per sqft with different curves). Price = `round(anchor * ratio)` to the rupee. Null curve = flat rate, no finish selection (Bunches, Bushes). A curve with no step for a level does not offer that level - the 3-step curves (canopy, ceiling, bouquet) show only their 3 levels on the line's own finish selector.

**Snapshot:** on quotation INSERT a trigger copies all curve steps + item rates into `quotation_snapshot_*` tables and freezes `commission_pct` onto the row. Pricing reads the snapshot only; editing the global card never touches an existing quotation (verified: global anchor set to 9999, snapshot and line stayed 1000).

**Commission:** rates already contain it (that is why figures end in 50). Per-line "Commission applied" checkbox, checked by default = rate card figure exactly. Unchecked = strip: divide for the global % (1000 @ 10% -> 909.09, never subtract), subtract for a per-item flat override (`quotation_item_rates.commission_flat`). Internal builder figure only, never on client surfaces. **Global % seeded at 10.00 as a placeholder - confirm with Mohan anna.**

**Venues:** `quotation_venues` seeded with the nine verified 4 Sep; the intake field is a combobox that persists new names as rows.

**Zones:** now fourteen; new zone 2 `mandapam_building` ("Mandapam building decoration (exterior and elevation)" - the venue building, NOT the canopy). Order re-confirmed 8 Sep: entrance, mandapam building, pathway, valet, lift placard, hall door, selfie, welcome table, aisle, stage, hall, music and dance, buffet, return gift.

**Days/sessions:** explicit 1/2/3-day selection (`quotations.day_count`) + `quotation_day_sessions` (day_number, slot morning|evening, max 2/day, min 1). Never inferred from dates. "Evening reception", never "night"; muhurtham is the morning slot.

**Mockup analysis** now returns a candidate list with unchecked checkboxes; nothing is added until the operator confirms.

**Intake form:** required = name, phone, event type only (date optional - astrologer). Venue/guests/community/notes behind "Add event details". Days/sessions is its own card. The continue button shows a live count of what remains instead of a grey disabled state.

**Builder header:** event type is the only H1, venue is the H2, date/days/sessions/customer are metadata, days/sessions always visible with inline edit.

**Still open after build 2:** commission % placeholder; Bunches/Bushes have anchors but no curve (by design, pending client); tenth venue may exist (create-new covers it); contact-details discrepancy on the document unresolved (do not change); ANTHROPIC_API_KEY still unset so the analyser cannot run; NES-2026-1010 ("Test name") left in the DB because only 1007-1009 were authorised for deletion.
