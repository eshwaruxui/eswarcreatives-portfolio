# Newgen Event Studio - Technical Architecture
## Complete architecture reference for all digital systems

> Last updated: 2 September 2026
> Owner: Eswar Creatives
> Client: Newgen Event Studio (Mohan A, Deepika Mohan)
> Sep 02 change: Solution 05 website stack decision finalised - React + Vite + Supabase + Cloudflare Pages as a tenant of the shared multi-tenant codebase. WordPress + Hostinger dropped. See Section 4. Coming soon page LIVE at newgeneventstudio.com same day.

---

## Documentation rules
- Never use the em dash. Use a hyphen with spaces ( - ), comma, colon, or parenthesis
- No exclamation marks
- No rhetorical questions
- Specific over superlative, real numbers over adjectives

---

## 1. BRAND CONSTANTS (apply to all digital touchpoints)

### Colours
| Token | Screen (RGB) | Print (CMYK) | Usage |
|---|---|---|---|
| Teal | `#024C4F` | `#024C51` | Primary grounding colour |
| Gold | `#D5B067` | `#D5B067` | Dominant brand colour |
| Cream | `#FAF8F4` | `#FAF8F4` | Backgrounds, breathing space |
| Ochre | `#E1A23D` | `#E1A23D` | Accent, highlights, CTAs |
| Ruby | `#B00D2D` | `#B00D2D` | One focal point per touchpoint only |

**Rule:** Use `#024C4F` for all web, screen, and digital work. Use `#024C51` only for Illustrator CMYK print production. The difference is CMYK rounding, not a design decision.

**Colour hierarchy:** Gold dominant, Teal grounding, Cream backgrounds, Ochre accent only, Ruby single focal element. No black as a dominant colour anywhere.

### Typography
| Element | Font | Fallback (free) |
|---|---|---|
| Display / wordmark | Cormorant Garamond Bold | Cormorant (Google Fonts) |
| Functional text | Futura PT Light | Jost Light (Google Fonts) |
| Body / UI | Inter | Inter (Google Fonts) |

### Logo
- **Crown Pillar** mark - confirmed final
- Full mark works at all sizes down to 16x16 - no simplified variant needed
- Use for favicon, WhatsApp DP, app icon, embroidery, all small-size applications
- Construction: N Curve (aspiration) + N Line/Temple Pillar (stability) + Flame/Deepam (vision)
- The gap between the diagonal N-swoosh and pillar shaft is intentional - never close it
- Master web asset: `Negen logo.svg` (I Foundation Phase/SVG) - full lockup, gold paths on transparent, used as-is on the coming soon page

### Tagline
**"Your vision. Their memory."** - confirmed, locked, use verbatim

### Kolam pattern
- Diamond lattice, master tile 46.9959mm square
- Must always be drawn as a true unicursal line - one continuous unbroken stroke
- Stroke weights: primary linework 0.4pt, dot anchors 1.5pt

---

## 2. DOMAINS AND EMAIL

### Domains (Namecheap, registered 23 July 2026)
| Domain | Purpose | Expiry | Auto-renew |
|---|---|---|---|
| newgeneventstudio.com | Primary - website, email, all marketing | Jul 23, 2027 | OFF (manual) |
| newgeneventstudio.in | Redirect to .com - brand protection, local SEO | Jul 23, 2027 | OFF (manual) |

**Registrant contacts (all four types):** Mohan Arjun Sundaram, Newgen Event Studio, 15 Major Mukund Varadarajan Rd., Narayanapuram, Pallikaranai, Chennai 600100, +91 9498078181, mohan@newgeneventstudio.com

**Old domain:** newgeneventmakers.com - being phased out. Existing printed visiting cards carry hello@newgeneventmakers.com - flag for correction in next print run.

**Done 02 Sep 2026:** .com moved to Cloudflare nameservers (ace + bella.ns.cloudflare.com), parking gone. newgeneventstudio.in is now its own Cloudflare zone (id f00cc34c415e0333607903e01f0f2bc7, same ace/bella nameservers): two proxied A records (@ and www, dummy 192.0.2.1) plus a Single Redirect rule (all requests, 301) to https://newgeneventstudio.com. Works over http AND https. Namecheap URL redirect was tried first and abandoned - it has no SSL, so https://newgeneventstudio.in served a blank page.

### DNS records (newgeneventstudio.com)
| Type | Host | Value | Purpose |
|---|---|---|---|
| TXT | @ | google-site-verification=Hj6H... | Google domain verification |
| MX | @ | SMTP.GOOGLE.COM (priority 1) | Email routing - set via Custom MX in Namecheap Mail Settings |
| TXT | google._domainkey | v=DKIM1;k=rsa;p=MIIB... | DKIM email authentication |

**Namecheap quirk:** MX Record does not appear in the Advanced DNS record type dropdown. Set it via Mail Settings - select "Custom MX" (not MXE Record).

**DNS migration note (Sep 02):** serving newgeneventstudio.com from Cloudflare Pages requires moving the domain's nameservers from Namecheap to Cloudflare (add site to the Cloudflare account, import records, switch NS at Namecheap). All existing records (Google verification TXT, MX, DKIM) must be re-created in the Cloudflare zone before the switch so email is never interrupted. One-time change.

### Google Workspace (Business Base)
| Account | Display name | Role |
|---|---|---|
| studio@newgeneventstudio.com | Newgen Studio | Admin - Eswar manages, client-facing sender for invoices |
| mohan@newgeneventstudio.com | Mohan A | Founder |
| deepika@newgeneventstudio.com | Deepika Mohan | Co-Director (MD ma'am) |
| hello@newgeneventstudio.com | Newgen Hello | General enquiries, website contact form |

- Plan: Business Base, Rs. 60/user/month for first 3 months, then Rs. 120/user/month
- Cost: Rs. 240/month (4 users) until Nov 2026, then Rs. 480/month
- Gmail: activated
- DKIM: configured and verified
- Profile pictures: org-managed - must be set via Admin Console, not by individual users

### Profile picture system
Crown Pillar mark with colour-coded backgrounds, 401x401px PNG:
| Account | Background | Mark |
|---|---|---|
| studio@ | Teal `#024C4F` | Crown Pillar only, no initial (brand mark) |
| mohan@ | Gold `#D5B067` | Crown Pillar + M |
| deepika@ | Ruby `#B00D2D` | Crown Pillar + D |
| hello@ | Dark Teal | Crown Pillar + H |

---

## 3. MULTI-TENANT PORTAL ARCHITECTURE

### Core decision
**Single codebase, per-tenant config file, separate Supabase project per client, separate Cloudflare Pages deployment per client domain.**

### Rationale
Mohan's invoice, HR, and inventory data should never share a database with Eswar Creatives data or any other client - even with RLS. Separate Supabase projects give true isolation, independent uptime, and data residency guarantee. Also makes handover clean: transfer the Supabase project and Cloudflare deployment, done.

### Tenant config pattern
```typescript
// tenants/newgen.config.ts
export const tenantConfig = {
  id: 'newgen',
  name: 'Newgen Event Studio',
  domain: 'portal.newgeneventstudio.com',
  supabaseRef: 'newgen-project-ref', // separate project, NOT eswarcreatives
  theme: {
    primary: '#024C4F',
    gold: '#D5B067',
    cream: '#FAF8F4',
    ochre: '#E1A23D',
    ruby: '#B00D2D',
    fontHeading: 'Cormorant Garamond',
    fontBody: 'Futura PT',
    fontUI: 'Inter',
    logo: '/newgen-crown-pillar.svg'
  },
  modules: {
    invoicing: true,
    quotations: true,
    branding: true,
    crm: true,
    projects: true,
    mockups: true,
    qualityControl: false,
    vendorManagement: false,
    inventory: false,   // Phase 3
    hr: false           // Phase 3
  }
}
```

### Build sequence
| Phase | Work | Duration |
|---|---|---|
| 1 | Abstract theme system - move hardcoded tokens behind `getTenantTheme()` | 2 days |
| 2 | Add module feature flags - wrap each admin section | 1 day |
| 3 | Newgen deployment - new Supabase project, new Cloudflare deployment | 3 days |
| 4+ | Every new client = Phase 3 only (new config + Supabase + deployment) | 3 days each |

### Tenant portability caveat (from TENANT_PROVISIONING_LOG.md, found 26 Aug 2026)
Early migrations and Edge Functions in the shared codebase were written when Eswar was the only tenant and mix schema with hardcoded business-specific identity, content, and infrastructure references. Do not assume any migration or Edge Function is safe to apply to the Newgen Supabase project as-is - review each against the provisioning log first.

### Domain structure
```
newgeneventstudio.com          - React marketing site (public, SEO, prerendered)
portal.newgeneventstudio.com   - React PWA (CRM, quotations, client portal)
eswarcreatives.in              - Eswar Creatives portfolio (separate, do not mix)
```

**Why the split:** the marketing site stays a fully prerendered, SEO-clean static surface while the portal remains an authenticated application. Separate Pages deployments keep crawlability, caching, and access control independent even though both come from the shared codebase.

---

## 4. TECHNOLOGY STACK BY SOLUTION

### Solution 05 - Website - STACK DECISION FINALISED 02 SEP 2026

**Decision: React + Vite + Supabase + Cloudflare Pages, as a tenant of the shared multi-tenant codebase. WordPress + Hostinger dropped.**

Final scoped value per quotation: Rs. 1,02,500 (Services pages 24,000 · Portfolio 20,500 · Home 19,000 · Testimonials 13,500 · About 12,500 · Contact 8,000 · SEO setup 5,000).

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | React + Vite, tenant of shared codebase | Same design tokens, components, and deployment pipeline as portal and quotation module |
| Prerendering | prerender.mjs pattern from eswarcreatives.in | All 10 marketing routes prerendered for SEO, proven approach |
| Backend | Supabase newgen project | Enquiry form posts straight into `enquiry_submissions`, same DB the Wati CRM flows read - no bridge |
| Hosting | Cloudflare Pages (`newgen-website` deployment) | Free, global edge, faster than origin hosting for NRI and destination-wedding searches |
| SEO | Per-page meta, LocalBusiness/Service JSON-LD, sitemap, GBP integration | Launch gate - verified in Search Console before done |
| Forms | React form to Supabase + WhatsApp CTA | Direct lead capture into CRM pipeline |
| SSL | Cloudflare | Automatic |
| Cost | Rs. 0 hosting (domains only pass-through) | Was ~Rs. 7,788/yr Hostinger + Bricks licence |

**Why WordPress was dropped (decision record):**
1. The original WordPress rationale (Mohan's team self-serve edits) no longer holds - content updates are covered by the Performance Growth Retainer, and Mohan operates on WhatsApp only
2. Lead generation is the site's job - a React form writing directly to `enquiry_submissions` feeds Wati automation with zero webhook bridge
3. One codebase to maintain instead of two stacks (WP plugins, security, backups eliminated)
4. Brand consistency - the same tenant theme config feeds website, portal, and quotation module
5. FutureNorms is already tenant two - Newgen website validates tenant three on proven infrastructure
6. Handover unchanged - transfer Pages project + Supabase, per the existing handover pattern

**Conditions attached to this decision:**
1. No self-serve editing promise to Mohan at launch - portfolio and testimonial updates flow through the retainer; a "website content" admin module in the portal is the later path if self-serve becomes real
2. SEO parity is a launch gate - all 10 routes prerendered, per-page meta and schema, sitemap submitted, GBP wired, verified in Search Console
3. Tenant portability caveat applies - nothing from the eswarcreatives Supabase project applied to the Newgen project as-is

### Solution 06 - SOP (Rs. 65,000)
| Layer | Choice | Rationale |
|---|---|---|
| Tool | Notion (free plan) | Works on any Android, no app install for field staff |
| Field access | WhatsApp-shared links | Opens in Chrome, no login for read-only |
| Structure | API-first database structure | Ready for future PWA without rebuild |

**Notion structure (API-first):**
- Each SOP as a database row with status, category, branch properties
- Checklist items as a relation to a separate checklist database
- Template pages per event type (wedding, corporate, eco-wedding)
- Branch property on every page (Chennai / Tiruchi / Bengaluru filters)

**Why databases not pages:** Notion API returns structured properties cleanly from databases. Building this way now makes the Phase 2 PWA shell significantly faster to build.

### Solution 07 - CRM (Rs. 1,10,000)
| Layer | Choice | Rationale |
|---|---|---|
| WhatsApp automation | Wati Growth plan | Sits inside WhatsApp - zero staff behaviour change |
| Dedicated number | 9176045045 | Confirmed by Mohan anna, separate from personal |
| Pipeline data | Supabase (newgen project) | Structured lead data, connects to portal |
| Reporting | Notion database view | Mohan sees numbers without a separate tool |
| Monthly cost | Rs. 2,999 | Only recurring cost for CRM |

**Why Wati over Zoho or custom build:**
| | Wati | Zoho CRM | Custom |
|---|---|---|---|
| WhatsApp-native | Yes | Via integration | Build it |
| Setup time | 3 days | 2-3 weeks | 3-4 months |
| Training needed | Minimal | Moderate | High |
| Monthly cost | Rs. 2,999 | Rs. 5,000-8,000 | Rs. 0 (high build cost) |
| Mohan can manage | Yes | Partially | No |

### Solution 09 - Client portal (Rs. 70-80K, scoped not started)
| Layer | Choice |
|---|---|
| Frontend | React + Vite (same stack as eswarcreatives.in portal) |
| Backend | Supabase - new separate newgen project |
| Hosting | Cloudflare Pages |
| Subdomain | portal.newgeneventstudio.com |

**Screens:** Client login (bride/groom or corporate), event timeline view, concept approval (reuses existing voting portal pattern), document access (quote, contract, invoice), WhatsApp escalation button.

**Note:** ~60% already built - reuses existing eswarcreatives.in portal architecture, auth, and voting/approval flow.

### Solutions 10-12 - ERP (future, Rs. 1,70,000 - 2,20,000 combined)
| # | Module | Notes |
|---|---|---|
| 10 | HR + attendance | Mobile attendance, contract staff management |
| 11 | Inventory + logistics | Item tracking, event-wise allocation, damage reports |
| 12 | PWA hardening + offline sync | Service worker queue, IndexedDB, sync on reconnect |

**Critical requirement for ERP:** field team works in low-network areas (mandapams, Kodaikanal). Requires PWA with offline write queue, not just a mobile-friendly website. Writes go to IndexedDB locally, sync queue pushes to Supabase when connection restores.

**Deferred deliberately:** budget and timeline do not support ERP now. Notion SOPs serve as the operational foundation that ERP will eventually digitise.

---

## 5. WHATSAPP AUTOMATION - FULL PICTURE

### Scoped (Solution 07, Rs. 1,10,000, confirmed)
- Auto-reply within 60 seconds of any new enquiry
- Lead pipeline: Enquiry - Replied - Site Visit - Quote Sent - Confirmed - Delivered
- Day 1, 3, 7 automated follow-up sequences
- 12 pre-approved templates in Tamil + English
- Post-event review request, auto-sent 24 hours after Delivered
- Referral request, 3 days after Delivered
- Mandapam owner relationship tracking in Notion
- Monthly revenue + conversion dashboard

### Ideated (not formally scoped)

**Warm greeting image touchpoint**
Personalised "Hi [Lead Name], it was nice talking with you" image sent as the first automated message after a new lead's first call. Design: teal-top/cream-bottom split matching letterhead, handshake icon, multi-city footer, contact block. No GST/SAC - not transactional.

Four decisions needed before build:
1. Name-field fallback logic (first-name-only, corporate leads, unclear gender)
2. Compressed image export for fast WhatsApp delivery
3. One-time-only trigger logic so repeat messages do not re-fire
4. Personalisation pipeline: Wati native vs Supabase-triggered image generation

**Quotation module WhatsApp trigger (quotation Phase 2)**
On quote generation, Wati auto-sends a quotation summary to the client's WhatsApp. Quote number NES-YYYY-XXXX is the shared reference across PDF and WhatsApp message.

### Current status
| Item | Status |
|---|---|
| Wati account | Not set up - Solution 07 not started |
| Number 9176045045 | Confirmed, ready to onboard |
| Wati Growth subscription | Not purchased |
| 12 message templates | Not written |
| Auto-reply flow | Not configured |
| Warm greeting image | Ideated only, design not started |
| Quotation WhatsApp trigger | Quotation Phase 2 - Phase 1 UI in build now |

### Important constraint
Wati requires the number to be migrated to WhatsApp Business API. Once migrated, that number **cannot** be used on the regular WhatsApp app on a phone. 9176045045 was chosen specifically as a dedicated business number so Mohan's personal number stays untouched.

---

## 6. QUOTATION MODULE ARCHITECTURE

### Phase 1 (in build now)
- Client and event details form
- 40+ item library across 6 categories
- AI mockup analyser (Claude API reads concept images, auto-populates line items)
- Manual item entry
- Qty and rate editing inline
- Discount, advance percentage, GST toggle, validity days
- Branded print-ready quotation document
- Email send via mailto with pre-filled subject and body
- Quote number format: **NES-YYYY-XXXX** (Supabase-ready)
- Font: Inter throughout the UI

**No Wati dependency in Phase 1.** Build cleanly, Wati slots in as an additive layer later.

### Phase 2 (pipeline)
- Supabase storage for all quotations (quote number, client, event, items, totals, status)
- Quote status tracking: Draft, Sent, Approved, Rejected, Converted
- Wati integration: auto-send quotation summary on generation
- Lead pipeline view
- Auto follow-up sequences after quotation sent
- Client history by phone number
- Warm greeting image trigger on first contact

### Phase 3 (pipeline)
- Event execution checklist linked to each confirmed booking (Notion SOP integration)
- Inventory tracking: owned vs rented per event
- Vendor management
- Revenue dashboard: monthly, by event type, by venue
- Staff assignment per event
- Post-event actual vs quoted reconciliation
- Google review request automation

### Billing
Quotation module is an **ad hoc billable item** outside the 8-solution scope. Must be invoiced separately, never absorbed into existing solution budgets.

---

## 7. SUPABASE PROJECTS

### eswarcreatives (existing)
- Ref: `urrinqwcrpivmvenupiu` · region `ap-south-1`
- Powers eswarcreatives.in portal
- Mohan is a user here: UUID `42f77e83-1be6-4177-83e7-1ca2c5d3fc80`, email `newgeneventtn@gmail.com`
- Project slug: `newgen-branding-2026`
- Reusable view: `public.vote_results_summary` - deduped vote counts, acceptance %, rank per sketch
- **Quirk:** `public_votes` has double-submissions - always dedupe with `DISTINCT ON (voter_name, set_id, sketch_index) ORDER BY submitted_at DESC`

### newgen (to be created)
- Separate project - must NOT reuse eswarcreatives
- TENANT_ID: `newgen`
- Powers portal.newgeneventstudio.com and the website enquiry capture
- Create before portal build begins
- Region: ap-south-1 (Mumbai) for latency
- Apply migrations only after review against TENANT_PROVISIONING_LOG.md (see Section 3 caveat)

### Migration path
When handing over to Mohan: export Newgen tables to a fresh Supabase project under his account, transfer Cloudflare Pages deployment. Clean break, no shared infrastructure.

---

## 8. WEBSITE ARCHITECTURE (Solution 05)

### 10 pages at launch
| Page | Type | SEO target |
|---|---|---|
| Home | Core | "Newgen Event Studio Chennai" |
| About | Core | Brand trust, Mohan story, team |
| Services (hub) | Core | Overview, links to category pages |
| Wedding Decoration | Category landing | "Wedding decorator Chennai" |
| Corporate Events | Category landing | "Corporate event planner Chennai" |
| Social Celebrations | Category landing | "Birthday event decorator Chennai" |
| Destination Weddings | Category landing | "Destination wedding decorator Kodaikanal" |
| Portfolio | Core | Gallery by category |
| Testimonials | Core | 4.9 rating, Google reviews embed |
| Contact | Core | WhatsApp, form, Maps, QR |

### Deferred to retainer phase
- Eco-friendly weddings category page
- Blog (long-tail SEO content, monthly)

### Why 10 pages not 6
Google ranks pages, not websites. "Wedding decorator Chennai" and "Corporate event planner Chennai" are different search intents - one Services page cannot rank for both. Each category needs its own landing page targeting its own keyword. This is the SEO architecture the Performance Growth Retainer builds on.

### SEO launch gates (React stack)
All 10 routes prerendered via the prerender.mjs pattern, per-page title/meta/OG, LocalBusiness + Service JSON-LD, sitemap.xml submitted, Google Business Profile linked, verified rendering in Search Console URL inspection before launch is declared complete.

### Content update model
Launch content is built and updated by Eswar Creatives under the Performance Growth Retainer. No WordPress-style self-serve editing at launch. If Mohan's team later needs self-serve, add a "website content" module in the portal admin (gallery pattern already exists in Brand Visual Guide).

### Team photography needed
About page team section and Google Workspace profile pictures both require a Newgen team photography session. Not yet scheduled.

---

## 9. CLOUDFLARE

### Account
- Under `Eswarcreatives@gmail.com`
- Account ID: `b2a26f4e78f04dee2fc554ae9092942a`
- Subdomain: `eswarcreatives.workers.dev`

### Existing deployments
| Project | Domains |
|---|---|
| eswarcreatives-portfolio | eswarcreatives.in + 2 others |
| vim-events-decor | vim-events-decor.pages.dev + 3 others |

### Planned for Newgen
| Deployment | Purpose |
|---|---|
| newgen-coming-soon | LIVE since 02 Sep 2026 on newgeneventstudio.com + www (ruby favicon v2 deployed) |
| newgen-website | newgeneventstudio.com - React marketing site (replaces coming soon at Solution 05 launch) |
| newgen-portal | portal.newgeneventstudio.com - React PWA |

**Handover note:** transfer all Pages projects to Mohan's own Cloudflare account (free tier sufficient) at project close.

---

## 10. QR CODE SYSTEM

### Critical rule for print
**Static QR codes via api.qrserver.com MUST always be used for any printed material.** Never use dynamic QR services (qr.io, QR Tiger, Beaconstac) for print - free tiers expire and kill QRs on already-printed material.

Learned from the BNI bookmark incident where a qr.io free trial expired on 150 distributed bookmarks.

### WhatsApp QR format
```
https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=https://wa.me/[number]?text=[encoded message]&bgcolor=FAF8F4&color=024C4F&margin=20
```

Dynamic QRs are acceptable only for digital-only use.

### QR Manager module (planned, ad hoc billable)
To be built inside eswarcreatives.in portal (Migration 0105):
- Static QR image pointing to `eswarcreatives.in/qr/[slug]`
- Cloudflare Pages function redirects to destination stored in Supabase
- Allows changing destination without reprinting

### Venue board QR (new ask from Mohan anna)
Ad hoc billable item, use case to be confirmed - event entry, inventory, staff check-in, or client-facing bookings. Scope determines whether simple URL QR or backend lookup is needed.

---

## 11. SOP DELIVERY - CURRENT INTERIM

The Illam Shoot Guide is published at `eswarcreatives.in/illam-shoot-guide` as a temporary solution. Bilingual (English + Tamil), mobile-friendly, no login needed.

**Migration path:** when Solution 06 Notion workspace is built, move all SOPs there so Mohan's team accesses everything from one place without dependency on the Eswar Creatives domain.

**Do not put internal SOPs on the public newgeneventstudio.com marketing site** - it is public and SEO-indexed. Operational checklists should not be crawlable.

### WhatsApp group
"Newgen Event Studio - Media team" created. Naveen is the media person. Group profile picture still shows the old logo - update to Crown Pillar on Teal.

---

## 12. TECHNICAL LEARNINGS

### ReportLab PDF patterns
- Use `BaseDocTemplate` with two `PageTemplate`s (Cover and Content), not custom `Flowable` subclasses for cover - causes LayoutError
- Use `Paragraph` + `wrap()` for all text in bounded elements, never `drawString` (no wrapping)
- Bullet dot positioning: derive from text baseline after drawing text
- Card heights: compute from actual font sizes, never guessed fixed values
- Grid layouts: use pre-computed `row_tops[]` arrays
- All imports at module level only - inline re-imports shadow module-level imports
- **Alpha hex colours (e.g. `#FFFFFF12`) do not render in ReportLab canvas** - use solid colours instead
- Tamil rendering: register `NotoSansTamil-Regular.ttf` and `NotoSansTamil-Bold.ttf` from `/usr/share/fonts/truetype/noto/`. If missing: `apt-get install -y fonts-noto fonts-noto-core`

### PPTX/PDF QA
Fix one page at a time with a render between each change. Batch spacing changes cause regressions requiring full manual revert.

### Namecheap
- Use Custom MX in Mail Settings for Google Workspace, not the Advanced DNS record dropdown
- Registrant contact changes require email verification within 24 hours or the request is auto-cancelled

### Supabase
- `VITE_SUPABASE_PUBLISHABLE_KEY` not `VITE_SUPABASE_ANON_KEY`
- Run migrations one at a time in SQL Editor, confirm green before next
- RLS admin policies: use `SECURITY DEFINER` function (`is_admin()`) to avoid infinite recursion
- `auth.jwt() ->> 'role'` does NOT read from the profiles table - always use `is_admin()`
- `clients.id` is a separate UUID from `profiles.id`
- Admin password changes: use Supabase MCP (`execute_sql` with `crypt()`), not curl

### Cloudflare Pages
Set both env vars explicitly under the Preview environment - they do not inherit from Production.

### Illustrator
Pattern tile: Object > Pattern > Make, Tile Type Grid, H Spacing 0mm, V Spacing 0mm. Tile must be square, bounding box sent to back before making the pattern.

---

## 13. COST SUMMARY

### One-time (pass-through, Year 1)
| Item | Cost |
|---|---|
| newgeneventstudio.com | ~Rs. 1,060 |
| newgeneventstudio.in | ~Rs. 964 |
| **Total Year 1** | **~Rs. 2,024** |

Hostinger Business (~Rs. 7,788/yr) removed 02 Sep 2026 - website moved to Cloudflare Pages, Rs. 0 hosting.

### Recurring monthly
| Item | Cost |
|---|---|
| Google Workspace (4 users) | Rs. 240/mo until Nov 2026, then Rs. 480/mo |
| Wati Growth (when Solution 07 starts) | Rs. 2,999/mo |
| Supabase | Free tier sufficient initially |
| Cloudflare Pages | Free |
| Notion | Free |
| **Total once CRM is live** | **~Rs. 3,479/mo** |

### Year 2 renewals
| Item | Cost |
|---|---|
| Both domains | ~Rs. 1,600-1,750/yr |

---

## 14. IMMEDIATE NEXT ACTIONS

1. DONE 02 Sep: Cloudflare zone active, DNS records re-created (Google TXT, MX, DKIM, plus new SPF), nameservers switched, coming soon page LIVE on newgeneventstudio.com + www
2. DONE 02 Sep: newgeneventstudio.in + www 301-redirect to .com over http and https (Cloudflare zone + redirect rule, verified live)
3. Delete the unused `newgen-launch` API token in Cloudflare (needs Eswar email verification - pending)
4. Set profile pictures for all 4 Google Workspace accounts via Admin Console
5. Complete quotation module Phase 1 (React UI, no Wati dependency)
6. Create new Supabase project for Newgen (review TENANT_PROVISIONING_LOG.md before applying anything)
7. Confirm QR code system use case with Mohan anna before scoping
8. Schedule Newgen team photography session
9. Update WhatsApp media team group profile picture to Crown Pillar mark

---

*Prepared by Eswar Creatives · Confidential*
