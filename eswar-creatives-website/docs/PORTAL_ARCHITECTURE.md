# Eswar Creatives — Portal Architecture and Execution Handbook

Last updated: 6 July 2026. Keep this in the repo at `docs/PORTAL_ARCHITECTURE.md` and point Claude Code at it before starting any portal work.

---

## 1. Current branch state

**Active branch:** `main`
**Status:** Stable. All recent PRs merged.

**Shipped and merged to main:**

_Invoice payments (PR #2 — `feature/invoice-payments`):_
- `invoice_payments` table (migration 0065): partial payment tracking with proof upload
- `ConfirmPaymentModal`: mark paid + record payment modes
- `PaymentsSection`: reusable payment draft editor
- `balance_due` computed client-side from `amount` minus `sum(invoice_payments.amount)`
- `proof_url` on invoice_payments + `payment_proofs` private storage bucket

_Phase 6 mobile-responsive client portal (PR #3 — `feature/phase6-mobile-responsive`):_
- `useBreakpoint` hook — single source of truth for all breakpoint logic (no exceptions)
- ClientNav: mobile collapses to 64px bottom tab bar (6 tabs, safe-area-inset-bottom, ruby badges); desktop unchanged
- ClientShell: `paddingBottom` on mobile for bottom tab bar clearance
- All client routes: 16px horizontal padding on mobile, 24px on desktop
- `/portal/projects`: horizontal snap-scroll phase carousel on mobile, vertical stepper on desktop
- `/portal/proposals`: full-width cards; ClientProposalPanel bottom-sheet on mobile
- `/portal/invoices`: card list on mobile (table on desktop); invoice detail full-screen overlay
- `/portal/mockups`: 1/2/3 col grid; ConceptSetPanel 100dvh overlay with swipe-down-to-close; lightbox buttons 44px
- Mobile polish: skeleton loaders, transitions, overlay coverage, bottom nav height
- Admin iPad pass: sidebar 180px icon-only at 768px; overflowX hidden on layout root

_Invoice nudge system (PR #4 — `feature/invoice-nudge-system`):_
- `InvoiceDocument` header: SVG logo, `EswarCreatives`, `Branding Solution`
- `public_token` + expiry on invoices (migration 0068); `get_invoice_by_token` RPC callable by anon
- `nudge_log` table (migration 0069): per-invoice reminder history
- `/invoice/:token` public invoice page — no auth required, token + expiry enforced server-side
- `NudgeModal`: WhatsApp (wa.me) + email channel; token rotates on every send (7-day TTL)
- `send-invoice-nudge` edge function: admin-JWT-verified, sends via Resend
- Nudge history section in the admin invoice open drawer

_Invoice UX polish (direct commits to main — 6 July 2026):_
- Record payment available on `pending`, `sent`, and `overdue` invoices (not just `partially_paid`); `ConfirmPaymentModal` in `record_payment` mode auto-derives status via `syncInvoiceStatus`
- Both "Record payment" and "Mark paid" actions available for `pending`/`sent`/`overdue`; only "Record payment" for `partially_paid`
- Admin invoice list action column refactored to a 3-dot overflow menu (`MoreVertical`): Nudge bell stays always-visible for nudgeable statuses; menu contains Open, Record payment, Mark paid, Delete in that order
- Overflow menu dropdown rendered with `position: fixed` + `getBoundingClientRect()` to escape `Card overflow: hidden` and table row stacking context; `z-index: 1000`
- Balance due column: shows actual computed balance in `tokens.ruby` for `partially_paid`, `0` in `t.text.muted` for `paid`, full amount in `t.text.primary` for all other statuses
- PDF download via `window.print()`: `ec-invoice-document` class on `InvoiceDocument` wrapper; `@media print` in `index.css` hides all chrome (A4, 16mm margins, visibility technique); "Download PDF" outlined button in admin `InvoicePreview` drawer and client `InvoicePanel` (both mobile overlay and desktop panel)

**Merged branches (reference only):**
- `feature/client-portal-phase5` — Phase 5 screens
- `feature/invoice-payments` — Invoice payments
- `feature/phase6-mobile-responsive` — Phase 6 mobile
- `feature/invoice-nudge-system` — Nudge system + public invoice view

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

**Notification and timeline tables:**
`client_notifications` (type, reference_id, is_read), `timeline_extensions` (project timeline change proposals)

**Invoice payment tables (migration 0065):**
- `invoice_payments`: id, invoice_id, amount, paid_on, method, reference_note, proof_url, created_at, created_by
- `invoice_line_items`: id, invoice_id, label, amount, sort_order, proposal_item_id

**Nudge log table (migration 0069):**
- `nudge_log`: id, invoice_id, sent_at, channel (whatsapp|email), message_preview, sent_by

**Key columns added:**
- `proposal_phases`: solution_title, timeline, key_note
- `proposal_line_items`: solution_title, solution_overview
- `proposals`: revision_rounds, key_note, accepted_at, declined_at, decline_reason
- `clients`: founder_name, whatsapp_number
- `projects`: timeline
- `invoices`: full schema (id, project_id, proposal_id, client_id, invoice_number, label, amount, currency, status, due_date, issued_at, paid_date, payment_method, pct_of_total, notes, client_name, company_name, created_by, created_at)
- `invoices` (migration 0068): public_token (uuid, unique, default gen_random_uuid()), public_token_expires_at (timestamptz), last_nudge_sent_at (timestamptz), nudge_count (integer, default 0)

**RPCs:**
- `get_invoice_by_token(p_token uuid) → jsonb` — SECURITY DEFINER, callable by `anon`. Returns invoice + line_items + payments for a valid non-expired token only. Returns null otherwise. No other rows exposed.

**Invoice number sequence:** Starts at EC-I-2026-105 (via invoice_number_seq)

**FK delete order (full):** `invoice_payments` → `nudge_log` → `invoices` → `invoice_line_items` → `projects` → `orders` → `proposals` → `clients`

---

## 4. Route structure

| Surface | Routes | Guard |
|---|---|---|
| Admin portal | `/portal/admin/*` | is_admin() SECURITY DEFINER |
| Client portal | `/portal/projects`, `/portal/proposals`, `/portal/invoices`, `/portal/mockups`, `/portal/campaigns`, `/portal/account` | role = client |
| Reviewer portal | `/portal/review/:campaignId` | role = reviewer |
| Public vote | `/portal/vote/:token` | No auth |
| Public invoice | `/invoice/:token` | No auth — token + expiry enforced server-side via RPC |

**Login redirects:**
- `admin` / `owner` → `/portal/admin` (not /portal/admin/sketches)
- `client` → `/portal/projects`
- `reviewer` → `/portal/review/:firstCampaignId`

---

## 5. Key components and patterns

### Responsive breakpoints
- **Single source of truth:** `src/portal/hooks/useBreakpoint.ts`
- Returns `{ isMobile, isTablet, isDesktop }`
- Breakpoints: mobile `< 768px`, tablet `768–1023px`, desktop `>= 1024px`
- **Rule:** Never use `window.innerWidth`, `window.matchMedia`, or ad-hoc resize listeners in component files. Only `useBreakpoint`.

### Key shared components

| Component | Location | Notes |
|---|---|---|
| `InvoiceDocument` | `src/portal/components/shared/InvoiceDocument.tsx` | Read-only invoice template; shared by admin drawer + client panel + public page. Header: SVG logo, EswarCreatives, Branding Solution. Accepts `readOnly` prop. |
| `ClientNav` | `src/portal/client/ClientNav.tsx` | Desktop top bar + mobile 64px bottom tab bar (safe-area-inset aware, ruby badges) |
| `useBreakpoint` | `src/portal/hooks/useBreakpoint.ts` | Sole breakpoint authority; matchMedia-backed, no polling |
| `NudgeModal` | `src/portal/admin/NudgeModal.tsx` | WhatsApp + email nudge; rotates `public_token` on every send (7-day TTL); inserts `nudge_log` row |
| `PublicInvoicePage` | `src/portal/PublicInvoicePage.tsx` | `/invoice/:token` — no auth; fetches via `get_invoice_by_token` RPC; shows expired-link error (Nielsen H9) |
| `ConfirmPaymentModal` | `src/portal/admin/ConfirmPaymentModal.tsx` | Mark paid + record partial payment modes; proof upload. Available for pending/sent/overdue/partially_paid statuses. |
| `InvoicesAdmin` overflow menu | `src/portal/admin/InvoicesAdmin.tsx` | 3-dot `MoreVertical` button per row. Dropdown uses `position: fixed` + `getBoundingClientRect()` to escape `Card overflow:hidden`. Nudge bell always visible outside the menu. `z-index: 1000`. |
| `ProgressiveImage` | `src/portal/components/shared/ProgressiveImage.tsx` | All remote image rendering; shimmer placeholder; never use raw `<img>` for remote URLs |

---

## 6. Edge functions (all deployed)

| Function | Version | jwt_verify | Purpose |
|---|---|---|---|
| admin-create-client | v3 | true | Creates auth user + profile + client row |
| admin-delete-client | v1 | true | FK-safe atomic delete |
| confirm-proposal | v2 | true | Accepts proposal, creates per-phase advance invoices |
| send-welcome-email | v3 | true | Sends branded welcome email via Resend |
| decline-proposal | v1 | true | SECURITY DEFINER, captures decline reason |
| respond-to-timeline-extension | v1 | true | Client approves/denies timeline change |
| update-own-full-name | v1 | true | SECURITY DEFINER, client updates their profile name |
| send-invoice-nudge | v1 | true | Sends payment reminder email via Resend; verifies admin JWT; never surfaces raw errors |

**Secrets set:** `RESEND_API_KEY`, `PORTAL_URL`

---

## 7. Theme and token system

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

## 8. Real clients

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

## 9. Payment and invoice model

**Proposal payment schedule** (`proposal_payment_schedule`):
- `id`, `proposal_id`, `phase_id`, `instalment_number`, `label`, `pct_of_total`, `triggered_by` (acceptance|manual)
- Per-phase schedule; on proposal acceptance `confirm_proposal()` creates one advance invoice per phase
- Default schedule: 35% advance, 35% mid, 30% final (admin can customise, must sum to 100%)

**Partial payment tracking** (`invoice_payments`, migration 0065):
- `balance_due` computed client-side: `amount - sum(invoice_payments.amount)`
- Status derivation: `paid` when balance = 0; `partially_paid` when 0 < paid < amount
- `proof_url` stores optional payment proof in the `payment_proofs` private bucket

**Public token + nudge system** (migration 0068):
- `public_token` regenerates on every nudge send; expires after 7 days (`public_token_expires_at`)
- `/invoice/:token` fetches via `get_invoice_by_token` RPC — token + expiry enforced server-side
- WhatsApp nudge: opens `wa.me/[whatsapp_number]?text=[encoded message]` in new tab
- Email nudge: calls `send-invoice-nudge` edge function via Resend
- Every send inserts a row into `nudge_log`; history shown in the admin invoice drawer

---

## 10. Pending work

| Item | Priority |
|---|---|
| Moorthy 123 Adsprint re-add via Add Client modal | High |
| design-system-v1 Task 4 (About, Services, case study pages) | Medium |
| design-system-v1 Cloudflare preview review | Medium, blocked on Task 4 |
| Per-campaign invite scoping for reviewers (RLS tightening) | Medium |
| AdminSketchUpload Nielsen audit (~20 raw error surfaces) | Medium |
| Portal UX writing pass (raw err.message strings) | Medium |
| AccountPage.tsx full polish | Low |
| Public campaign responses pagination + filters (deferred) | Low |
| Invoice nudge automation (scheduled reminders at due date, +3d, +7d) | Future phase |
| Razorpay/Stripe payment integration | Next phase |
| Admin portal mobile responsive | Future consideration |
| WhatsApp Business API (replace wa.me deep-link with full API) | Phase 10 |

---

## 11. Roadmap in pipeline

**Project status share button (planned):**
- Per-project button in admin and client portal
- One click sends visual progress brief (phase stepper + summary) to client email and WhatsApp
- Shows current phase, completed tasks, next action

**Invoice nudge automation (future phase):**
- Scheduled reminders at due date, +3 days, +7 days (manual nudge already shipped)
- Invoice PDF attachment
- Triggered automatically by status = pending or overdue

**Razorpay/Stripe payment integration (next phase):**
- Replace manual "Mark paid" with a real payment gateway
- Client-facing pay button on the public invoice page

Prerequisites before starting:
- Supabase Pro upgrade complete
- Image transforms enabled
- All Phase 5 pending debt resolved
- PORTAL_ARCHITECTURE.md committed to repo

---

## 12. Execution rules

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
- FK delete order: `invoice_payments` → `nudge_log` → `invoices` → `invoice_line_items` → `projects` → `orders` → `proposals` → `clients`.
- **Responsive breakpoints:** Use `useBreakpoint` from `src/portal/hooks/useBreakpoint.ts` exclusively. No inline `window.innerWidth`, no `window.matchMedia` in components, no ad-hoc resize listeners. See `docs/COMPONENT_PATTERNS.md` for the full pattern.

---

## 13. One-line summary

Three roles, three portals, reviews never need a project, accounts always go through the admin API, no UI ships on raw hex, teal only on interactive elements.

---

## 14. Phase 6 — Mobile-responsive client portal

**Branch:** `feature/phase6-mobile-responsive`
**Status:** Shipped and merged to main.

Breakpoints: mobile < 768px, tablet 768-1023px, desktop >= 1024px.

Key patterns shipped:
- `useBreakpoint` is the single source of truth for all breakpoint logic (no exceptions)
- ClientNav: desktop top bar unchanged; mobile collapses to 64px bottom tab bar (6 tabs, safe-area-inset-bottom)
- ClientShell: adds `paddingBottom` on mobile to clear bottom tab bar
- All client page containers: 16px horizontal padding on mobile, 24px on desktop
- `/portal/projects`: horizontal snap-scroll phase carousel on mobile; vertical stepper on desktop
- Panels on mobile: SidePanel renders as bottom sheet; InvoicePanel and ClientConceptSetPanel render as 100dvh full-screen overlays (slide up from bottom)
- ClientConceptSetPanel: swipe-down-to-close (80px threshold) on mobile
- ClientLightbox: touch swipe left/right; close/fullscreen/thumbnail buttons bumped to 44px
- Admin: sidebar 180px icon-only at tablet (768px), overflowX: hidden on layout root
