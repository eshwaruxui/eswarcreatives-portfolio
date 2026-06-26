# Eswar Creatives — Portal Architecture and Execution Handbook

Last updated: 25 June 2026. Keep this in the repo at `docs/PORTAL_ARCHITECTURE.md` and point Claude Code at it before starting any portal work.

---

## 1. Current branch state

**Active branch:** `feature/client-portal-phase5`
**Draft PR:** https://github.com/eshwaruxui/eswarcreatives-portfolio/pull/1
**Status:** Staging audit in progress. Do not merge to main until audit is complete.

Key commits on this branch:
- Migrations 0038–0057 applied via Supabase MCP
- Phase 5 client portal screens: dashboard, proposals, invoices, mockups, account, campaigns
- Reviewer role + reviewers table, review_campaigns/items/votes
- Route guards by role, login redirect by role
- confirm-proposal edge function (per-phase advance invoices)
- send-welcome-email edge function via Resend (domain eswarcreatives.in verified)
- admin-delete-client edge function (FK-safe atomic delete via service role)
- Proposal modal: solution groups, per-phase payment schedule builder, error prevention
- ClientProposalPanel: full proposal detail in right-side slide-in
- Campaign module: public/private visibility, unified public_campaigns + review_campaigns view
- Global neutral text + border token audit (t export added to theme.ts)
- Client dashboard Figma hi-fi rebuild: progress ring, 4-column phase stepper, quick link cards
- ClientNav: "Client portal" label, Sign out button, active nav pill

**Surgical fix on main (pending):** `fix/client-login-redirect` — client role redirects to `/portal/projects` not `/portal/sketch-review`. Magic-link emailRedirectTo also fixed.

---

## 2. The three roles

`user_role` enum: `owner`, `admin`, `client`, `reviewer`

| Role | Who | Has projects | Has billing | Sees |
|---|---|---|---|---|
| admin / owner | Eswar | n/a | n/a | Everything |
| client | Mohan (Newgen), Moorthy (123 Adsprint) | Yes | Yes | Only their own data |
| reviewer | External logo voters | No | No | Only their invited campaign |

**Rule:** A reviewer must never require a project row.

---

## 3. Data model — current state

All migrations are live on Supabase project `urrinqwcrpivmvenupiu` (Mumbai, ap-south-1).

**Core tables (stable):**
`profiles`, `clients`, `projects`, `orders`, `invoices`, `proposals`, `proposal_phases`, `proposal_line_items`, `proposal_payment_schedule`, `proposal_documents`

**Review system (migrated off project-bound flow):**
`reviewers`, `review_campaigns` (visibility: public|private, status: draft|active|closed), `review_items`, `review_votes`

**Public vote system (legacy, live data):**
`public_campaigns` (+ visibility column added), `public_votes`, `logo_sketch_sets`, `logo_sketch_submissions`, `logo_sketch_reviews`

**New tables this phase:**
`client_notifications` (type, reference_id, is_read), `timeline_extensions` (project timeline change proposals)

**Key columns added:**
- `proposal_phases`: solution_title, timeline, key_note
- `proposal_line_items`: solution_title, solution_overview
- `proposals`: revision_rounds, key_note, accepted_at, declined_at, decline_reason
- `clients`: founder_name, whatsapp_number
- `projects`: timeline
- `invoices`: full schema confirmed (id, project_id, proposal_id, client_id, invoice_number, label, amount, currency, status, due_date, issued_at, paid_date, payment_method, pct_of_total, notes, client_name, company_name, created_by, created_at)

**Invoice number sequence:** Starts at EC-I-2026-105 (via invoice_number_seq)

---

## 4. Route structure

| Surface | Routes | Guard |
|---|---|---|
| Admin portal | `/portal/admin/*` | is_admin() SECURITY DEFINER |
| Client portal | `/portal/projects`, `/portal/proposals`, `/portal/invoices`, `/portal/mockups`, `/portal/campaigns`, `/portal/account` | role = client |
| Reviewer portal | `/portal/review/:campaignId` | role = reviewer |
| Public vote | `/vote/:slug` | No auth |

**Login redirects:**
- `admin` / `owner` → `/portal/admin` (not /portal/admin/sketches)
- `client` → `/portal/projects`
- `reviewer` → `/portal/review/:firstCampaignId`

---

## 5. Edge functions (all deployed)

| Function | Version | jwt_verify | Purpose |
|---|---|---|---|
| admin-create-client | v3 | true | Creates auth user + profile + client row |
| admin-delete-client | v1 | true | FK-safe atomic delete (payments→invoices→projects→orders→proposals→clients) |
| confirm-proposal | v2 | true | Accepts proposal, creates per-phase advance invoices |
| send-welcome-email | v3 | true | Sends branded welcome email via Resend |
| decline-proposal | v1 | true | SECURITY DEFINER, captures decline reason |
| respond-to-timeline-extension | v1 | true | Client approves/denies timeline change |
| update-own-full-name | v1 | true | SECURITY DEFINER, client updates their profile name |

**Secrets set:** `RESEND_API_KEY`, `PORTAL_URL`

---

## 6. Theme and token system

**File:** `src/portal/theme.ts`

Two exports:
- `tokens` — legacy flat string values (~360 usages across portal). Do not restructure.
- `t` — new EC Design System semantic token map:
  - `t.text.*` (primary, secondary, tertiary, muted, disabled, inverse, onPrimary, urlLink, primaryBrand)
  - `t.border.*` (subtle, default, medium, strong, focus, overlay variants, brand, danger, success, warning)
  - `t.background.*` (page, subtle, muted, surface, raised, sunken, tint1/2/3, overlay variants, scrim)

**Token collections in Figma Design System Master (`0SGbENUggpj9Fe6NebJ9QM`):**
- Primitives: teal (20), gold (20), neutral (21), ruby (20), success (20), warning (20), neutral-alpha (18), teal-alpha (20), yellow (20), avatar-palette (42), radius (15), spacing (33)
- Semantic Tokens (268 total): background, border, text, brand, state, status, phase, component, layout, touch, portal, page, icon, skeleton, shadow, severity, ai, incident, entity, mitre, avatar (42), overlay, notification, interactive, motion

**Design rules:**
- No raw hex outside theme.ts
- No em dashes anywhere
- Fraunces: headings. Inter: body. SF Mono: numbers/IDs
- motionTokens: fast 120ms, base 200ms, slow 350ms (easeDefault cubic-bezier(0.4,0,0.2,1))
- Teal/brand color: interactive elements only (buttons, active nav, CTAs). Never on static text.
- Borders: always from t.border.* or overlay tokens

---

## 7. Real clients

| Client | Email | Company | Currency | Status |
|---|---|---|---|---|
| Mohan | newgeneventtn@gmail.com | Newgen Event Makers | INR | Active, proposal accepted |
| Moorthy | (to be added via Add Client modal) | 123 Adsprint | INR | Needs re-adding |
| Eswar (test) | eswarcreatives@gmail.com | Eswar Creatives Test | INR | Internal test account |

**Reviewers (migrated to reviewers table):** keerthigc24, darshanraphal, sajhith, krithik6607, paavansai032012, bewithmehmm

**Public campaigns:**
- "Newgen Logo Concept Polling - Jun 2026" — 548 real votes, visibility = private, KEEP
- "Smoke testing Campaign" — DELETED

---

## 8. Payment schedule model

`proposal_payment_schedule` table:
- `id`, `proposal_id`, `phase_id`, `instalment_number`, `label`, `pct_of_total`, `triggered_by` (acceptance|manual)
- Per-phase schedule: each phase has its own instalment rows
- On proposal acceptance: `confirm_proposal()` creates one advance invoice per phase (first instalment where triggered_by = 'acceptance')
- Default schedule: 35% advance, 35% mid, 30% final (admin can customise freely, must sum to 100%)

---

## 9. Pending debt (do after staging audit passes)

| Item | Priority |
|---|---|
| Surgical fix/client-login-redirect merge to main | High, in progress |
| Moorthy 123 Adsprint re-add via Add Client modal | High |
| PORTAL_ARCHITECTURE.md commit to repo | High |
| Staging audit completion before phase-5 merge to main | High |
| design-system-v1 Task 4 (About, Services, case study pages) | Medium |
| design-system-v1 Cloudflare preview review | Medium, blocked on Task 4 |
| Per-campaign invite scoping for reviewers (RLS tightening) | Medium |
| AdminSketchUpload Nielsen audit (~20 raw error surfaces) | Medium |
| Portal UX writing pass (raw err.message strings) | Medium |
| AccountPage.tsx full polish | Low |
| Public campaign responses pagination + filters (6f deferred) | Low |
| Razorpay/Stripe payment integration | Phase 6 |
| WhatsApp notifications provider setup | Phase 10 |

---

## 10. Roadmap ideas in pipeline

**Invoice nudge system (planned):**
- Auto scheduled reminders at due date, +3 days, +7 days
- Manual CTA per invoice: [Nudge via email] [Nudge via WhatsApp]
- Strategic message with invoice PDF attachment
- Triggered by invoice status = pending or overdue

**Project status share button (planned):**
- Per-project button in admin and client portal
- One click sends visual progress brief (phase stepper + summary)
- Delivered to client email and WhatsApp
- Shows current phase, completed tasks, next action

**Mobile-friendly client portal (Phase 6 planned):**

Scope: Client portal only (not admin portal).
Backend unchanged — Supabase, RLS, edge functions all stay identical. Frontend-only effort.

Architecture approach:
- Add `src/portal/hooks/useBreakpoint.ts` as single source of truth for all responsive logic. Returns: `{ isMobile, isTablet, isDesktop }`
- Document in COMPONENT_PATTERNS.md as standing pattern.
- No Tailwind — use CSS media queries and inline style conditions via useBreakpoint hook.

Screens and complexity:
- Projects (phase stepper): Medium — 4-column stepper collapses to vertical stack on mobile
- Proposals (list + panel): High — ClientProposalPanel goes full-screen overlay on mobile
- Invoices: Low — table gets horizontal scroll or card layout
- Mockups lightbox: Medium — touch swipe gestures replace prev/next buttons, thumbnail strip scrollable
- Campaigns: Low — list view, minimal changes
- Account: Low — form layout reflow

Key UX decisions needed before build:
- Nav: hamburger menu or bottom tab bar on mobile
- Panels: full-screen overlay pattern (consistent across ClientProposalPanel, ClientConceptSetPanel)
- Lightbox: touch swipe via touch events or a lightweight gesture library

Prerequisites before starting:
- Supabase Pro upgrade complete
- Image transforms enabled
- All Phase 5 pending debt resolved
- PORTAL_ARCHITECTURE.md committed to repo

---

## 11. Execution rules

- One branch per phase. One commit per logical layer.
- Never merge to main without Cloudflare preview review and incognito test.
- Migrations: apply via Supabase MCP, confirm green before next.
- Never raw-insert into auth.users. Always `supabase.auth.admin.createUser`.
- RLS admin policies use `is_admin()` SECURITY DEFINER only. Never inline subqueries on profiles.
- Never surface raw err.message to client.
- Test every login flow in incognito before marking complete.
- Cloudflare preview needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (not ANON_KEY).
- Password reset: `UPDATE auth.users SET encrypted_password = crypt('pw', gen_salt('bf'))` if needed.
- Schema changes applied via Supabase MCP `apply_migration`. SELECT preview before any DELETE.
- FK delete order: payments → invoices → projects → orders → proposals → clients.

---

## 12. One-line summary

Three roles, three portals, reviews never need a project, accounts always go through the admin API, no UI ships on raw hex, teal only on interactive elements.
