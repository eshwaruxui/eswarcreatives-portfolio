# Newgen Event Studio x Eswar Creatives
## Project Context & Memory - For Continuity Across Chats

> **Note on this version:** updated 02 September 2026. Incorporates all work from the Jul 23 session:
> domain registration, Google Workspace setup, Solutions 05/06/07 architecture decisions,
> multi-tenant portal architecture confirmed, website strategy (10 pages), Wati CRM confirmed,
> Notion SOP confirmed, client portal scoped as Solution 09, MD ma'am name confirmed as Deepika Mohan.
> Sep 01 additions: Quotation Module invoice raised (EC-I-2026-111, Rs.26,000, Architecture & Database Setup),
> WhatsApp BSP architecture decision confirmed (Wati Growth, stay), Interakt and AiSensy evaluated and ruled out,
> monthly maintenance charges deferred to post-project delivery conversation.
> Sep 02 additions: Tagline CONFIRMED and locked ("Your vision. Their memory."), Solution 05 website stack
> switched from WordPress + Hostinger to React + Vite + Supabase + Cloudflare Pages (tenant of shared
> multi-tenant codebase), coming soon page LIVE at newgeneventstudio.com (zone active, SPF added, ruby favicon).

### Documentation style rules
**Never use the em dash in this file or any Newgen documentation.** Use a hyphen with spaces ( - ), a comma, a colon, or a parenthesis instead. **Never use the word "unmistakably" in tagline or copy work** - too hard to read instantly. No em dashes anywhere, ever.

---

## WHO YOU ARE TALKING TO
- **Eswar** - Founder, Eswar Creatives, Chennai
- HFI-CUA certified UX/brand designer, 15+ years
- Brand color: `#007872` - Eswar Creatives logo SVG is in project files
- Contact: 98410 85484 · eswar@eswarcreatives.in · eswarcreatives.in

---

## THE CLIENT
- **Mohan A** - Founder, Newgen Event Studio (formerly Newgen Event Makers)
- Full name for stationery: **Mohan A**
- Title on stationery: **Founder & Creative Director**
- Co-owner: **Deepika Mohan** - confirmed name as of Jul 23, 2026. Use "MD ma'am" in all client-facing communication - never "your wife" or "his wife"
- MD ma'am must be present at all concept presentations - **non-negotiable**
- Communication: **WhatsApp only** · Voice notes preferred · 6am-9pm · 25,000 unread emails
- Relationship: Mohan is Eswar's close friend - tone should be warm, not formal
- WhatsApp Business number (dedicated, for Wati CRM): **9176045045**
- Personal Gmail: mohan.flowerdecorator.ma@gmail.com

### Communication rule
**Never refer to the co-owner as "your wife" / "his wife" in any client-facing communication - always use "MD ma'am."** Applies to WhatsApp drafts, presentation copy, PDFs - everything.

### Client address - stationery (confirmed)
#15, Velachery to Tambaram Main Road, Narayanapuram, Pallikaranai, Chennai 600100

### GST-registered address (invoices/GST documents only)
No.5, Easwar Nagar, 5th Street, Kodambakkam, Chennai-600024

### Client contact numbers (confirmed)
+91 94980 78181 / 91760 45045

### Client website (old - being replaced)
www.newgeneventmakers.com (phasing out - new domain below)

---

## NEWGEN BUSINESS FACTS
| Field | Detail |
|---|---|
| Founded | 2018 |
| HQ | Narayanapuram, Chennai (registered) / Pallikaranai, Chennai (stationery address) |
| Branches | Tiruchi (active) · Bengaluru (launching) |
| Primary service | Wedding decoration |
| Other services | Corporate events · Social celebrations · Destination weddings · Eco-friendly weddings · AV · Photography · Videography · Logistics · Catering coordination |
| Events completed | 1,500+ |
| Mandapam contracts | 6 (Chennai + Tamil Nadu) |
| Google rating | 4.9 stars · 26 reviews |
| Instagram | ~200 followers |
| Revenue | Rs.15L/month current · Rs.30L/month peak capability |
| Corporate clients | Aachi Masala · IC Mobile |
| Competitors | Vivahitha · Wedding Chakra · Green House · Manish Garland (5L followers) |
| Mohan's vision (4yr) | Hand business to daughter · systems-independent operation |
| Mohan's vision (10yr) | Own a 5-star hotel under Newgen brand · IPL/star night events |
| Key insight | "1,500 events panni 200 followers - oru proof illame nadandhutten" |

---

## DOMAIN AND EMAIL - COMPLETED 23 JULY 2026

### Domains (registered on Namecheap)
| Domain | Purpose | Status | Renewal from Year 2 |
|---|---|---|---|
| newgeneventstudio.com | Primary - all marketing, website, email | ACTIVE | ~Rs. 999-1,049/yr |
| newgeneventstudio.in | Redirect - brand protection, local SEO | ACTIVE | ~Rs. 599-699/yr |

- Both registered under Eswar Creatives account (Year 1 cost borne by Eswar Creatives)
- Transfer to Mohan's Namecheap account at handover
- Auto-renew: OFF
- Domain privacy: ON for .com (free forever on Namecheap)

### Google Workspace - Business Base
| Account | Name | Role | Status |
|---|---|---|---|
| studio@newgeneventstudio.com | Newgen Studio | Admin (Eswar manages) | Active |
| mohan@newgeneventstudio.com | Mohan A | Founder | Active |
| deepika@newgeneventstudio.com | Deepika Mohan | Co-Director / MD ma'am | Active |
| hello@newgeneventstudio.com | Hello Newgen | General enquiries | Active |

- Plan: Business Base · Rs. 60/user/month (50% off for 3 months) · Rs. 120/user/month from Nov 2026
- Cost: Rs. 240/month (4 users) for first 3 months, then Rs. 480/month
- Gmail: activated ✓
- MX record: set via Custom MX in Namecheap Mail Settings · SMTP.GOOGLE.COM · Priority 1 ✓
- DKIM: configured and verified ✓ (emails land in inbox, not spam)
- Domain verification TXT record: added ✓
- Profile pictures: to be set via Admin Console (org-managed - users cannot set their own)
- Profile picture design: Crown Pillar mark with colour-coded backgrounds per account
  - studio@: Crown Pillar on Teal #024C4F (brand mark, no initial)
  - mohan@: Crown Pillar + M on Gold #D5B067
  - deepika@: Crown Pillar + D on Ruby #B00D2D
  - hello@: Crown Pillar + H on Dark Teal

### DNS records in Namecheap (newgeneventstudio.com)
| Type | Host | Value | Notes |
|---|---|---|---|
| TXT | @ | google-site-verification=Hj6H... | Domain verification - done |
| MX | @ | SMTP.GOOGLE.COM | Priority 1, Custom MX - done |
| TXT | google._domainkey | v=DKIM1;k=rsa;p=MIIB... | DKIM authentication - done |

**Sep 02 note:** website now targets Cloudflare Pages, so the domain's nameservers will move from Namecheap to Cloudflare. All records above must be re-created in the Cloudflare zone before switching NS so email is never interrupted.

---

## BRAND NAME - CONFIRMED FINAL

**Line 1:** NewGen
**Line 2 (descriptor):** Event Studio

"Studio" chosen over "Event Makers" - signals creative process and craft, scales to hospitality context, doesn't lock to weddings-only. "Event Makers" was the previous descriptor and should not appear in new production files.

The descriptor "Event Studio" is removable in future - "NewGen" will stand alone when the hotel phase arrives.

---

## TAGLINE - CONFIRMED AND LOCKED (02 SEP 2026)

**"Your vision. Their memory."** - confirmed by Mohan anna + MD ma'am. Locked, use verbatim in all production files. Applied to the coming soon page on 02 Sep 2026.

Treatment: Cormorant italic (calligraphic W swash), per the typography system below.

**Eliminated options (do not resurface):**
- "Where your vision lives." - shortlisted, not picked
- "Crafted for you. Felt by all." - shortlisted, not picked
- "Envisioned before it's built" - too process-centric, sounds local
- "Every moment, unmistakably yours" - "unmistakably" is too hard to read instantly
- "Moments made to move people" - not the right register
- "Where every detail begins with a vision" - was a working tagline for ChatGPT mockup prompts only, never confirmed

---

## LOGO - CROWN PILLAR - CONFIRMED FINAL

### Decision
**Crown Pillar** - confirmed by Mohan anna as the final logo concept. Selected from Logo System Option 1.

### Voting round results (context)
- Public voting: 80% acceptance (12/15 voters) - outright highest across all 28 concepts
- Internal design score: 56/60 - joint highest
- Both measures converged on the same mark - strongest possible outcome

### Mark construction
The Crown Pillar mark is built from three symbolic elements:

| Element | Symbol | Meaning |
|---|---|---|
| N Curve | The swoosh / aspiration gesture | Forward motion, next generation |
| N Line + Temple Pillar | The vertical pillar with capital | Stability, South Indian heritage |
| Flame + Deepam | Flame finial + deepam lamp form | Vision, celebration, light (universal - not festival-specific) |

**Mark construction note:** the gap between the diagonal N-swoosh and the pillar shaft is intentional - it creates figure-ground depth (swoosh in front of pillar). It must not be closed or merged. However the gap should not taper to a knife-point at the bottom join - this is a production risk for vinyl, foil, and embossing. Minimum gap width should be consistent along its entire length.

### Logo system - Option 1 confirmed
Three options were presented. **Option 1** was selected by Mohan anna.

### Small-size / favicon variant
Per the Aug 1 architecture session: the full mark works at all sizes down to 16x16 - no simplified variant needed. Use the full mark for favicon, WhatsApp DP, app icon, embroidery, and all small-size applications. (Earlier plan for a separate simplified variant with Options A/B/C is superseded.)

### Master files
- Master vector file: created in Illustrator 2026 (CMYK), file name `Newgen Logo System.ai`
- The mark was fully redrawn as clean vector paths in Illustrator (not traced from AI raster)
- Master web asset: `Negen logo.svg` (I Foundation Phase/SVG) - full lockup, gold paths + ruby gem O on transparent, used as-is on the coming soon page

---

## TYPOGRAPHY SYSTEM - CONFIRMED

| Element | Font | Weight/Style | Notes |
|---|---|---|---|
| NEWGEN | Cormorant Garamond | Bold | High-contrast editorial serif |
| EVENT STUDIO | Futura PT | Light, wide tracking | Pure geometric sans - uniform stroke, circular O |
| Tagline | Cormorant (base, not Garamond variant) | Italic, Light or Regular | Calligraphic W swash, sharp pointed v, double-storey g |
| Divider rule | Custom ornament | Diamond center point | Thin horizontal rule between descriptor and tagline |

**Type system logic:** Cormorant carries brand voice (serif, heritage, editorial). Futura PT creates modern-luxury contrast against the serif. The contrast between the two is intentional and must be preserved - do not "fix" it by matching weights.

**Free alternatives if licensed fonts unavailable:**
- Cormorant: use "Cormorant" (base family on Google Fonts, not Cormorant Garamond - the base family has more pronounced calligraphic swashes)
- Futura PT: use "Jost Light" from Google Fonts - nearest free match
- Body / UI: Inter (per architecture doc)

**Tagline font note:** Times New Roman Italic is close on the v and g but lacks the calligraphic W entry swash. IM Fell English Italic (Google Fonts, free) has the correct swash W. Garamond Premier Pro Italic is the closest paid option.

---

## BRAND PATTERN - KOLAM DIAMOND LATTICE - IN PROGRESS

### Master unit created
- A kolam-inspired diamond lattice pattern drawn as clean vector in Illustrator
- Master unit size: **46.9959mm x 46.9959mm** (square tile)
- Stroke weights: primary linework 0.4pt, dot anchors 2.5pt (may reduce dots to 1.5pt - pending review; architecture doc records 1.5pt as the standard)
- Pattern tile created using: Object > Pattern > Make, Tile Type: Grid, H Spacing: 0mm, V Spacing: 0mm
- Must always be drawn as a true unicursal line - one continuous unbroken stroke

### Pattern colourways (in production)
1. Gold (#D5B067) linework on deep teal (#024C4F) - primary
2. Gold (#D5B067) linework on cream (#FAF8F4) - secondary
3. Teal (#024C4F) linework on cream (#FAF8F4) - tertiary

### Pattern application notes
- At business card back size: reads as delicate texture
- At letterhead footer band: clear geometric detail visible
- At envelope lining: full pattern legible and elegant
- Pattern swatch saved in Illustrator Swatches panel as "Newgen Kolam - Gold on Teal"
- The dot anchors at 2.5pt are currently slightly dominant - consider reducing to 1.5pt before final production

### Ruby gem accent rule (pattern application)
Every touchpoint should include one small ruby red (#B00D2D) gem/dot as a focusable accent. Used as:
- A punctuation dot replacing the letter O in STUDIO (on teal/dark surfaces)
- A punctuation dot replacing the letter O in MOHAN (on the business card back)
- A centered divider dot in footer lines

---

## BRAND IDENTITY DIRECTION (ALL CONFIRMED BY MOHAN)
| Field | Decision |
|---|---|
| Typography | Cormorant + Futura PT (see Typography System above) |
| Logo type | Crown Pillar - abstract N monogram with temple pillar and flame finial |
| Tagline | "Your vision. Their memory." - locked |
| Motifs | Kolam diamond lattice (confirmed and in production) |
| Cultural direction | South Indian roots, global finish - Temple · Heritage · Global · Premium |
| Colours | Gold `#D5B067` (dominant) · Teal `#024C4F` (grounding) · Cream `#FAF8F4` (background) · Ochre `#E1A23D` (accent only) · Ruby `#B00D2D` (sparingly, one focal point per touchpoint) |
| Avoid | Black as dominant colour · Flower/vine fonts · Cartoon-like logos · Event-specific visuals |
| Brand promise | "We sketch your celebration before we build it - and what you see is exactly what your guests will feel." |

### Colour hierarchy rule
- Gold: dominant. Use most.
- Teal: grounding. Second most.
- Cream: backgrounds and breathing space.
- Ochre: accent only, highlights/CTAs.
- Ruby: one small focal element per touchpoint only - never a base colour.
- No black as dominant colour anywhere in wedding-facing applications (Mohan's explicit, non-negotiable call).

---

## VISUAL MOODBOARDS - THREE THEMES (generated and approved by Mohan anna)

All three moodboards were generated via ChatGPT image generation and approved:

1. **Temple Heritage, Modern Lens** - temple gopuram, kolam line art, sandstone arch, teal silk, brass
2. **Boutique Hotel Premium** - hotel lobby, marble reception with kolam inlay, teal velvet, gold tray, corridor
3. **Sketch-to-Stage** - pencil sketch, watercolour render, stage under construction, fabric swatches, finished stage at dusk

These are the approved visual reference frames for all subsequent touchpoint mockups and design decisions.

---

## STATIONERY TOUCHPOINTS - STATUS

### Business card - mockup approved
- Front: teal (#024C4F) card, gold logo mark, NEWGEN (Cormorant Bold), EVENT STUDI● (ruby gem replaces O), tagline in fine italic cream
- Back: cream (#FAF8F4), M●HAN A (ruby gem replaces O in MOHAN), Founder & Creative Director, phone/address/website with minimal teal icons, faint kolam watermark bottom-right
- Environment approved: marble surface, soft natural light

### Letterhead - prompt prepared, mockup pending
- Header: logo mark + NEWGEN EVENT STUDIO left-aligned, contact details right-aligned, thin gold rule below
- Body: empty cream, no watermark in body
- Footer: address + ruby dot divider + website, faint kolam border along bottom

### Other stationery prompts prepared (not yet generated/approved)
- Quotation/Invoice
- Round seal + address seal
- Event concept sheet
- Signboard
- Vehicle branding

**All ChatGPT prompts for stationery include:**
- All three moodboard images as reference attachments
- Exact hex colour values
- Ruby gem replacement rule for O in STUDIO and MOHAN
- "Use the exact logo mark from the attached image without modifying, redrawing, or reinterpreting it."

---

## LOGO SYSTEM DOCUMENT - STATUS

A 3-page logo system document (Option 1, 2, 3) was created for client presentation. **Option 1 was confirmed by Mohan anna.**

Document structure per page:
- Primary Mark section: mark + description copy
- Mark Breakdown panel: formula N Curve + N Line & Temple Pillar + Flame & Deepam = Newgen Logo
- Size Stress Test: 64x64, 32x32, 24x24, 16x16 + refined simplification variant
- Application Examples: Favicon/App Icon, Emboss on card, Engraving on metal, Foil on board

### Confirmed copy for logo system document

**Primary Mark description:**
"The full mark is our signature - a temple pillar and flame finial woven into the N, where stability meets aspiration. Built to hold its presence with equal clarity across print, signage, and digital touchpoints."

**Mark Breakdown captions:**
- N Curve: the swoosh / aspiration gesture
- N Line + Temple Pillar: stability, South Indian heritage
- Flame & Deepam: vision, celebration, light
- Newgen Logo: heritage, vision, light in motion

**Size Stress Test captions:**
- "At 16px, fine detail begins to lose clarity - the flame and inner negative space are the first to weaken."
- "A refined simplification ensures clarity and recognizability at the smallest sizes - used for favicons, app icons, and other compact applications."

**Known remaining issue:** "Application Exampels" heading typo (should be "Application Examples") - flagged multiple times, check if fixed in final file.

**Tamil version:** all logo system copy translated into Modern Colloquial Tamil (Tanglish register) for client-facing version. Tamil rendering must use NotoSansTamil font - plain paste into layout tools will garble Tamil Unicode.

---

## VOTING RESULTS DOCUMENT - FINAL

`Newgen_Logo_Voting_Results.pdf` - single-page on-brand client overview
- Top Pick: Crown Pillar, Set 3 Concept 3, 80%, 12/15 voters
- Runners-up (3-way tie): Heritage Scroll (Set 1 C10), Infinity Bloom (Set 2 C6), Guardian Vel (Set 3 C4) - all 73.3%
- Gender breakdown included per concept
- About this round: 11 of 15 were general public, not personal contacts - genuine outside-opinion signal
- Script: `/home/claude/newgen_voting_results.py` (resets between sessions - will need recreating)

**Decisions from voting results:**
- Heritage Scroll (Set 1 C10) excluded: shape resolves like a full stop - unsuitable for a logo
- Guardian Vel (Set 3 C4) excluded: vel shape is religion-specific, fails the universal application test

---

## SUPABASE INFRASTRUCTURE

### Eswar Creatives project (existing)
- Project: `eswarcreatives` · ref `urrinqwcrpivmvenupiu` · region `ap-south-1`
- Connected via Supabase MCP
- Reusable view: `public.vote_results_summary` - deduped vote counts, acceptance %, rank per sketch, for any campaign
- `public_votes` quirk: some voters double-submitted - always dedupe with `DISTINCT ON (voter_name, set_id, sketch_index) ORDER BY submitted_at DESC`
- Portal admin URL: `https://eswarcreatives.in/portal/admin/sketches`
- Voting URL format: `/portal/vote/{campaign-id}`
- Mohan is a user in this project: UUID `42f77e83-1be6-4177-83e7-1ca2c5d3fc80` · email `newgeneventtn@gmail.com`
- Project slug: `newgen-branding-2026`

### Newgen Event Studio project (to be created)
- Separate Supabase project - NOT the eswarcreatives project
- Mohan's business data must never share a database with Eswar Creatives data
- TENANT_ID: `newgen`
- Deployed at: `portal.newgeneventstudio.com`
- Also backs website enquiry capture (`enquiry_submissions` pattern)
- Create before portal build begins
- Apply migrations only after review against `TENANT_PROVISIONING_LOG.md` - early migrations and edge functions in the shared codebase hardcode Eswar-specific identity and are not tenant-safe as-is

---

## MULTI-TENANT ARCHITECTURE - CONFIRMED DECISION

**Architecture:** Single codebase, per-tenant config file, separate Supabase project per client, separate Cloudflare Pages deployment per client on their own domain.

### Core pattern - tenant.config.ts
```typescript
// tenants/newgen.config.ts
export const tenantConfig = {
  id: 'newgen',
  name: 'Newgen Event Studio',
  domain: 'portal.newgeneventstudio.com',
  supabaseRef: 'newgen-project-ref', // separate project, not eswarcreatives
  theme: {
    primary: '#024C4F',
    gold: '#D5B067',
    cream: '#FAF8F4',
    fontHeading: 'Cormorant Garamond',
    fontBody: 'Futura PT',
    logo: '/newgen-logo.svg'
  },
  modules: {
    invoicing: true,
    branding: true,
    crm: true,
    projects: true,
    mockups: true,
    qualityControl: false,
    vendorManagement: false
  }
}
```

### Build sequence
- Phase 1 (2 days): Abstract theme system - move hardcoded tokens behind getTenantTheme()
- Phase 2 (1 day): Add module feature flags - wrap each admin section
- Phase 3 (3 days): Newgen deployment - new Supabase project, new Cloudflare deployment
- Phase 4+: Every new client = Phase 3 only (new config + new Supabase + new deployment)

### Why separate Supabase projects
Mohan's invoice data and other client data should never share a database even with RLS. Separate projects provide true isolation, independent uptime, and data residency guarantee.

---

## TECHNOLOGY STACK - CONFIRMED

### Newgen Event Studio website (Solution 05) - STACK CHANGED 02 SEP 2026
| Layer | Choice |
|---|---|
| Frontend | React + Vite - tenant of the shared multi-tenant codebase |
| Prerendering | prerender.mjs pattern from eswarcreatives.in (all 10 routes, SEO launch gate) |
| Backend | Supabase newgen project (enquiry form direct to `enquiry_submissions`) |
| Hosting | Cloudflare Pages (`newgen-website` deployment) - Rs. 0 hosting |
| SEO | Per-page meta, LocalBusiness/Service JSON-LD, sitemap, GBP, Search Console verification |
| Domain | newgeneventstudio.com (Namecheap registration, Cloudflare nameservers) |
| SSL | Cloudflare (automatic) |

**WordPress + Bricks + Hostinger dropped 02 Sep 2026.** Decision record and conditions in `Newgen_Architecture.md` Section 4. Content updates flow through the Performance Growth Retainer - no self-serve editing promise at launch.

### Newgen Event Studio portal (Solution 07 + 09)
| Layer | Choice |
|---|---|
| Frontend | React + Vite (same stack as eswarcreatives.in portal) |
| Backend | Supabase (new separate project) |
| Hosting | Cloudflare Pages |
| Subdomain | portal.newgeneventstudio.com |
| TENANT_ID | newgen |

### SOP system (Solution 06)
| Layer | Choice |
|---|---|
| Tool | Notion (free plan) |
| Field access | WhatsApp-shared links - no app install needed |
| Structure | API-first database structure (ready for future PWA) |

### CRM (Solution 07)
| Layer | Choice |
|---|---|
| WhatsApp automation | Wati Growth plan |
| Dedicated number | 9176045045 |
| Pipeline data | Supabase (newgen project) |
| Reporting | Notion database view |
| Monthly cost | Rs. 2,999/month (Wati only) |

### Eswar Creatives portfolio (separate - do not mix)
| Layer | Choice |
|---|---|
| Stack | React + Vite SSG, TypeScript, Tailwind CSS v4 |
| Hosting | Cloudflare Pages |
| Backend | Supabase - eswarcreatives project |
| Domain | eswarcreatives.in |

---

## 8 SOLUTIONS + ADDITIONAL - FULL SCOPE

### Phase 1 - Foundation (Month 1-2) - IN PROGRESS
| # | Solution | Budget | Timeline | Status |
|---|---|---|---|---|
| 01 | Brand Identity Design | Rs.85,000 | 2-3 weeks | IN PROGRESS - logo confirmed, typography confirmed, tagline confirmed (Sep 02), pattern in progress |
| 02 | Brand Guidelines Document | Rs.30,000 | 1 week | Not started - to be done end of July 2026 |
| 03 | Business Profile PDF | Rs.25,000 | 3 weeks | Not started - running parallel with Phase 2 |
| 04 | Social Media Branding + Workflow | Rs.13,500 | 3 weeks | Not started |

### Phase 2 - Visibility (Month 2-4) - KICKED OFF
| # | Solution | Budget | Timeline | Status |
|---|---|---|---|---|
| 05 | Website Design | Rs.1,50,000 (quotation scope Rs.1,02,500) | 4-5 weeks | Domain + email done. Stack: React + Vite + Supabase + Cloudflare (changed from WordPress, Sep 02). 10 pages. Coming soon page built, awaiting deploy. |

### Phase 3 - Scale (Month 4-6)
| # | Solution | Budget | Timeline | Status |
|---|---|---|---|---|
| 06 | SOP & Workflow Definition | Rs.65,000 | 15 days | Confirmed. Notion workspace. 15 SOPs across 3 categories. |
| 07 | CRM & Lead Automation | Rs.1,10,000 | 30 days | Confirmed. Wati + Supabase. Wati number: 9176045045. |
| 08 | Personal Brand - Mohan as Founder | Rs.60K-90K | TBD | Not started |

### Additional solutions (scoped, separate budget)
| # | Solution | Budget | Timeline | Status |
|---|---|---|---|---|
| 09 | Client Portal (bride/groom login, concept approval, timeline, documents) | Rs.70-80K | 3-4 weeks | Scoped. React + Supabase. Reuses eswarcreatives portal architecture. After Sol.05 launch. |
| 10 | ERP: HR + attendance module | Rs.60-80K | 8 weeks | Future - after CRM proves value |
| 11 | ERP: Inventory + logistics | Rs.70-90K | 8 weeks | Future |
| 12 | PWA hardening + offline sync | Rs.40-50K | 4 weeks | Future |

**Solutions 06 + 07 combined budget: Rs.1,75,000 · 45 days total**

**Parker Frontier Gold Roller Ball Pen** (gold body, gold trim, blue ink, Rs.860 on Amazon) - defined as Mohan's personal identity object for Solution 08 / client meetings. Eswar to suggest when discussing Solution 08.

---

## SOLUTION 05 - WEBSITE ARCHITECTURE

### 10-page site structure at launch
| Page | Type | SEO target |
|---|---|---|
| Home | Core | "Newgen Event Studio Chennai" |
| About | Core | Brand trust + Mohan story |
| Services (hub) | Core | Overview, links to category pages |
| Wedding Decoration | Category landing | "Wedding decorator Chennai" |
| Corporate Events | Category landing | "Corporate event planner Chennai" |
| Social Celebrations | Category landing | "Birthday event decorator Chennai" |
| Destination Weddings | Category landing | "Destination wedding decorator Kodaikanal" |
| Portfolio | Core | Gallery by category, credibility |
| Testimonials | Core | 4.9 rating, Google reviews embed |
| Contact | Core | WhatsApp, form, Maps, QR |

### Deferred to retainer phase (post-launch)
- Eco-friendly weddings category page
- Blog (long-tail SEO content)

### Hosting details (updated Sep 02)
- Cloudflare Pages - free hosting, global edge
- Year 1 pass-through: ~Rs. 2,024 (domains only) - Hostinger ~Rs. 7,788/yr removed with the stack change
- Year 2 renewal: ~Rs. 1,600-1,750/yr (domains only)

---

## SOLUTION 06 - SOP ARCHITECTURE

### 15 SOPs across 3 categories

**Field Execution SOP (5)**
1. Venue walkthrough checklist - Mohan's mental model documented
2. Mandatory setup shots protocol - 4 photos every event
3. Material order and quality check
4. Day-of team briefing format
5. Completion sign-off and photo send

**Customer Relationship SOP (5)**
1. Lead intake to site visit workflow
2. Quotation format and approval process
3. Contract and advance payment process
4. Client communication templates - 12 WhatsApp templates Tamil + English
5. Post-event: invoice, photos, review request

**Business Operations SOP (5)**
1. Mandapam owner relationship management
2. Team onboarding document - 3-day new staff guide
3. Vendor briefing and brand guidelines handover
4. Monthly reporting and revenue tracking
5. Branch manager accountability checklist

### Notion structure (API-first for future PWA)
- Each SOP as a Notion database row with status, category, branch properties
- Checklist items as a relation to a separate checklist database
- Template pages per event type (wedding, corporate, eco-wedding)
- Branch property on every page (Chennai/Tiruchi/Bengaluru filters)

---

## SOLUTION 07 - CRM ARCHITECTURE

### Lead pipeline stages
Enquiry - Replied - Site Visit - Quote Sent - Confirmed - Delivered

### Wati automation flows
- Auto-reply: enquiry received, response within 60 seconds
- Day 1, 3, 7 follow-up sequences
- 12 pre-approved Tamil + English message templates
- Post-event: review request 24 hours after Delivered
- Referral request: 3 days after Delivered
- Mandapam partner tracking in Notion

### Wati account details
- Plan: Wati Growth
- Dedicated WhatsApp Business number: **9176045045**
- Monthly cost: Rs. 2,999
- Pre-start dependency: CLEARED (number confirmed by Mohan anna)

### WhatsApp BSP architecture decision - confirmed Sep 01 2026

Three platforms evaluated for tailor-made automation with API leverage and cost sustainability: Wati Growth, Interakt, AiSensy.

**Verdict: Wati Growth confirmed. No change.**

Reasoning specific to Newgen (service business, not D2C ecommerce, low-medium conversation volume, custom Supabase-triggered flows):

- **Wati** - strongest CRM integration (Zoho, HubSpot, Freshsales, Pipedrive), best agent inbox with team routing and SLA tracking, reliable webhook-based triggers from Supabase, well-documented integration patterns for custom builds. Serves 8,000+ businesses. Correct for Newgen's lead-to-booking flow and the warm greeting, follow-up sequences, and Google review trigger use cases.
- **Interakt** - ruled out. Shopify-first and ecommerce-tilted. Not a fit for a service business with custom automation.
- **AiSensy** - lowest platform fee (Rs.1,500-3,200/month), strongest for high-volume broadcast campaigns, native click-to-WhatsApp Ads. CRM and multi-step custom automation are weaker. Revisit only if Newgen scales to high-volume outbound broadcast in Phase 3 - could run alongside Wati for broadcast-only.

**Cost note:** Wati Growth (~Rs.4,999-5,999/month on current India pricing) + Meta conversation charges (pass-through, separate from Wati fee). Budget Meta fees independently - billed per 24-hour conversation window, not per message.

---

## PERFORMANCE GROWTH RETAINER - POST PHASE 3

Confirmed by Mohan anna. Structure:
- Minimal fixed monthly retainer (covers SEO, content, reporting)
- Performance incentive per lead confirmed through website
- Zero risk for Mohan - pays more only when revenue comes in

**What retainer covers:**
- SEO - monthly content + technical maintenance
- Google Business Profile management - weekly posts, review responses, photo uploads
- Local search ranking per event category
- Performance reporting - monthly dashboard
- Conversion tracking
- Blog content (adding long-tail keyword pages)
- Eco-wedding page addition
- Website content updates (portfolio, testimonials) - part of the Sep 02 stack decision: no self-serve editing at launch

---

## AD HOC BILLABLE ITEMS (outside 8-solution scope - invoice separately)
1. QR code feature for venue boards
2. Quotation module as part of CRM development
3. Theotocos venue pitch materials (pending - on hold)
4. BNI Mega Visitors Day promotional deliverables (EC-2026-109)

---

## BILLING STATUS
- EC-2026-109: BNI Mega Visitors Day ad hoc promotional deliverable - paid
- EC-2026-110: Foundation Final & Visibility Advance (Rs.1,08,175) - paid
- EC-2026-111: Architecture & Database Setup - Quotation, Website & CRM Module (Rs.26,000, one-time) - raised Sep 01 2026, paid
- Mid-Foundation invoice: confirmed paid by Mohan anna verbally - retrospective invoice needed

### Monthly maintenance - deferred
Maintenance charges for the Quotation Module (backup, minimal content updates, Supabase monthly costs) will NOT be quoted or discussed until after the full project is delivered. To be framed as a long-term relationship retainer conversation at handover. Do not include in any current proposal or invoice.

---

## UPCOMING CONTEXT - GROWTH PARTNERSHIP

Discussed in Jul 27, 2026 meeting:
- Mohan anna wants Eswar Creatives as execution partner (not advisory) for 10x growth
- Proposed: Rs.3L/month engagement, separate from existing project scope
- Includes building a dedicated team (not just Eswar's time)
- Goal: negotiate profit share from Newgen
- Newgen assets: 3,400 sqft godown (rental inventory), office on Pallikaranai-Medavakkam road, vehicle fleet
- Vehicle fleet for branding mockups: Mahindra Bolero Pik-Up and Mahindra Bolero Dost XL
- Old fleet branding: "New Gen Event" red/gold - to be replaced with new Crown Pillar system
- Illam Hospitality visit: Aug 1-2, 2026 (Eswar to capture wedding reception pre-execution)

---

## TECHNICAL NOTES (for PDF generation)
- **Logo files:** `/home/claude/ec_logo_white.png` (dark bg) · `/home/claude/ec_logo_brand.png` (light bg) - `/home/claude/` resets between sessions, re-supply if needed
- **Never use `drawString` inside bounded cards** - always use `Paragraph` + `wrap()`
- **Tamil rendering:** register NotoSansTamil-Regular.ttf and NotoSansTamil-Bold.ttf from `/usr/share/fonts/truetype/noto/` - if not installed: `apt-get install -y fonts-noto fonts-noto-core`
- **Stat/result cards:** prefer `reportlab.platypus.Table` flowables over hand-drawn canvas grids
- **One-page budgeting:** expect to trim 4-6 spacers to keep a page - budget 2 QA-render iterations
- **Pattern tile in Illustrator:** Object > Pattern > Make, Tile Type: Grid, H Spacing: 0mm, V Spacing: 0mm, tile must be square, bounding box sent to back before making pattern
- **Cover page in ReportLab:** use BaseDocTemplate with two PageTemplates (Cover + Content) - Cover uses canvas drawing, Content uses Frame with on_page footer/header. Do NOT use Flowable for cover - causes LayoutError.
- **ReportLab alpha colors:** `colors.HexColor('#FFFFFF12')` does not work in canvas - use a solid color instead

---

## DELIVERABLES PRODUCED

| File | Description | Status |
|---|---|---|
| `Newgen_Creative_Brief.pdf` | 9-page client-facing creative brief | Final |
| `Newgen_Strategic_Execution_Plan.pptx` | 18-slide strategy deck | Final |
| `newgen_brand_discovery_prefilled.html` | Brand discovery form pre-filled | Ready - email + WhatsApp still blank |
| `Newgen_Audio_Key_Discoveries.pdf` | Tamil/English audio discoveries PDF | Final - not yet confirmed sent |
| `Newgen_Logo_Voting_Results.pdf` | Single-page voting results overview | Final |
| `Newgen_Design_Touchpoint_Reference.pdf` | Single-page design checklist | Final |
| Logo system PDF (Option 1, 2, 3) | Three logo system comparison pages | Option 1 confirmed by Mohan anna |
| Tagline options PDF | Three tagline options with Tamil explanations | Resolved - "Your vision. Their memory." locked (Sep 02) |
| Business card mockup | ChatGPT-generated, approved | Pending Illustrator production file |
| Moodboards (3 themes) | Temple Heritage / Boutique Hotel / Sketch-to-Stage | Approved by Mohan anna |
| Kolam pattern master | Illustrator vector, 46.9959mm tile | In progress - tile created, colourways in production |
| `Newgen_S0607_Handbook.pdf` | 11-page Solutions 05/06/07 handbook with use cases | Final |
| `Newgen_Domain_Email_Proposal.pdf` | 2-page domain and email proposal | Final |
| Coming soon page (`index.html`) | Crown Pillar lockup, tagline, ruby favicon, WhatsApp CTA, kolam lattice | LIVE Sep 02 at newgeneventstudio.com |

---

## NOTION SOURCE MATERIAL
- Parent page: "Newgenevent - client discovery questionnaire"
- Child page: "Audio-ல இருந்து கிடைச்ச key discoveries" (`https://www.notion.so/35bbf6ff547980adbac8f649b4cb0e85`)

---

## PENDING ITEMS

### Immediate - next session
- [x] DONE 02 Sep: Coming soon page LIVE at newgeneventstudio.com + www (Cloudflare Pages `newgen-coming-soon`, zone active, all mail records + SPF re-created, nameservers switched)
- [x] DONE 02 Sep: newgeneventstudio.in + www 301-redirect to .com over http and https (own Cloudflare zone + Single Redirect rule; Namecheap URL redirect abandoned - no SSL, blank page on https)
- [ ] Delete unused `newgen-launch` Cloudflare API token (needs Eswar email verification code)
- [ ] Quotation + Invoice portal at portal.newgeneventstudio.com (React + Supabase new project, TENANT_ID=newgen)
- [ ] QR code scanning system - confirm use case first (event entry, inventory, staff check-in, or client-facing?)
- [ ] Set profile pictures for all 4 Google Workspace accounts via Admin Console

### Brand identity completion
- [ ] Apply brand pattern to all stationery touchpoints (letterhead, quotation, envelope, card)
- [ ] Generate remaining stationery mockups: letterhead, quotation/invoice, round seal, address seal, event concept sheet, signboard, vehicle branding
- [ ] Reduce dot anchor stroke from 2.5pt to 1.5pt in pattern - review and confirm
- [ ] Fix "Application Exampels" typo in logo system document
- [ ] Tamil rendering check on logo system PDF

### Brand guidelines document (Solution 02)
- [ ] Build brand guidelines document - logo system, typography, colour, pattern, clear space, do/don't
- [ ] Document the construction grid rationale
- [ ] Include 16x16 favicon test as evidence

### Stationery production
- [ ] All 7 remaining ChatGPT stationery mockups to generate
- [ ] Illustrator production files for all approved mockups
- [ ] Confirm print vendor and turnaround times

### Client communications
- [ ] Send `Newgen_Audio_Key_Discoveries.pdf` if not yet sent
- [ ] Retrospective invoice for mid-Foundation payment (confirmed paid verbally by Mohan anna)
- [ ] EC-2026-110 due 30 July 2026

### Infrastructure
- [ ] Wire `vote_results_summary` Supabase view into permanent admin portal results page
- [ ] Create new Supabase project for Newgen (separate from eswarcreatives, review TENANT_PROVISIONING_LOG.md first)
- [ ] Transfer domains to Mohan's Namecheap account at handover

---

## KEY TAMIL PHRASES FROM TRANSCRIPT (for tone/context)
- "1,500 events panni 200 followers - oru proof illame nadandhutten" - Mohan on the visibility gap
- "naan 4-5 logo mattittu irukken" - changed logos 4-5 times
- "New Gen always refers to next generation - no need to change the name ever"
- "visually think pannu" - Mohan's sketch-first philosophy
- Address Mohan as **"Mohan anna"** in all communications
- Address co-owner as **"MD ma'am"** or **"Deepika ma'am"** - never "your wife"
- Client-facing Tamil: Modern Colloquial Chennai Tamil, Tanglish register, domain terms in English, respectful plural verb forms, warm tone

---

## CONTEXT BRIEFING FOR NEW CHAT (copy this block to start a new session)

**Project:** Newgen Event Studio - Phase 2 (Visibility) now active. Phase 1 (Foundation) near complete.

**Infrastructure done (Jul 23, 2026):** Domains newgeneventstudio.com + .in registered on Namecheap. Google Workspace Business Base live with studio@, mohan@, deepika@, hello@ accounts. Gmail + DKIM active.

**Brand status:** Crown Pillar logo confirmed. Cormorant + Futura PT typography confirmed. Tagline confirmed and locked: "Your vision. Their memory." Kolam diamond lattice pattern in production. Business card mockup approved.

**Website stack (decided Sep 02, 2026):** React + Vite + Supabase + Cloudflare Pages, as a tenant of the shared multi-tenant codebase. WordPress + Hostinger dropped. Decision record in `Newgen_Architecture.md` Section 4.

**Immediate next tasks:** (1) DONE: coming soon page LIVE at newgeneventstudio.com (02 Sep). (2) Quotation + Invoice portal at portal.newgeneventstudio.com - new Supabase project, TENANT_ID=newgen, React + Vite, multi-tenant architecture. (3) QR code system - use case TBC. (4) Brand guidelines document (Solution 02). (5) Remaining 7 stationery mockups.

**Tech stack:** React + Vite + Supabase + Cloudflare Pages (website AND portal, shared multi-tenant codebase) · Notion (SOPs) · Wati 9176045045 (CRM WhatsApp).

**Non-negotiables:** MD ma'am (Deepika Mohan) must be present at all concept presentations. Never use "your wife." Never use em dash. Company name is "Newgen Event Studio" - never "Event Makers." Tagline is "Your vision. Their memory." - use verbatim, never reworded.

---

*Last updated: 02 September 2026 · Updated by Mani (Claude) for Eswar Creatives*

*Jul 23 additions: domain/email setup, Google Workspace accounts, MD ma'am name confirmed (Deepika Mohan), multi-tenant architecture decision, Solution 05 10-page site structure, Solutions 06/07 architecture, Wati number confirmed, growth partnership context, deliverables list updated*

*Sep 01 additions: Invoice EC-I-2026-111 raised (Architecture & Database Setup, Rs.26,000), WhatsApp BSP evaluation completed (Wati Growth confirmed, Interakt and AiSensy ruled out for current scope), monthly maintenance charges strategy noted (deferred to post-delivery)*

*Sep 02 additions: Tagline locked ("Your vision. Their memory."), website stack changed to React + Vite + Supabase + Cloudflare Pages, coming soon page built with tagline, Cloudflare nameserver migration plan noted*
