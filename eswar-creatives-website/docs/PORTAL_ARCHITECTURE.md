# Eswar Creatives — Portal Architecture and Execution Handbook

Last updated: 8 July 2026. Keep this in the repo at `docs/PORTAL_ARCHITECTURE.md` and point Claude Code at it before starting any portal work.

---

> **Proposal nudge system in progress** (`feature/proposal-nudge`) — see Section 16 for details.
> **Sales Cadence module in progress** (`feature/sales-cadence`) — see Section 17 for details.

---

## 1. Current branch state

**Active branch:** `main`
**Status:** Stable. All recent PRs merged.

**In progress (not yet merged):**
- `feature/razorpay-integration` — Razorpay checkout on public invoice page (Section 15)
- `feature/proposal-nudge` — Proposal nudge system: public token, ProposalNudgeModal, public page, nudge history (Section 16)
- `feature/sales-cadence` — Sales Cadence outbound CRM: leads, sequences, Today queue, public unsubscribe page (Section 17)

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

_Proposal nudge system (in progress — `feature/proposal-nudge`):_
- `public_token` + expiry + nudge tracking on proposals (migration 0071); `get_proposal_by_token` RPC callable by anon
- `proposal_nudge_log` table (migration 0071): per-proposal reminder history; RLS admin-only via `is_admin()`
- `/proposal/:token` public proposal page — no auth required, token + expiry enforced server-side; responsive via `useBreakpoint`
- `ProposalNudgeModal`: WhatsApp (wa.me) + email channel; token always regenerated server-side (7-day TTL); rate-limit warning at 1-hour threshold
- `send-proposal-nudge` edge function: admin-JWT-verified, service-role writes, sends via Resend; guards: status must be 'sent', regenerates token on every call
- Nudge bell button on 'sent' proposals in `ProposalsAdmin` card view and `ProposalDetail` action bar
- Nudge history section in `ProposalDetail` (bottom of page)
- Status banners on public page for accepted/declined proposals (read-only, no CTA)

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

**Nudge log tables:**
- `nudge_log` (migration 0069): id, invoice_id, sent_at, channel (whatsapp|email), message_preview, sent_by
- `proposal_nudge_log` (migration 0071): id, proposal_id, sent_at, channel (whatsapp|email), message_preview, sent_by; RLS admin-only

**Key columns added:**
- `proposal_phases`: solution_title, timeline, key_note
- `proposal_line_items`: solution_title, solution_overview
- `proposals`: revision_rounds, key_note, accepted_at, declined_at, decline_reason
- `proposals` (migration 0071): public_token (uuid, unique, default gen_random_uuid()), public_token_expires_at (timestamptz), last_nudge_sent_at (timestamptz), nudge_count (integer, default 0)
- `clients`: founder_name, whatsapp_number
- `projects`: timeline
- `invoices`: full schema (id, project_id, proposal_id, client_id, invoice_number, label, amount, currency, status, due_date, issued_at, paid_date, payment_method, pct_of_total, notes, client_name, company_name, created_by, created_at)
- `invoices` (migration 0068): public_token (uuid, unique, default gen_random_uuid()), public_token_expires_at (timestamptz), last_nudge_sent_at (timestamptz), nudge_count (integer, default 0)

**RPCs:**
- `get_invoice_by_token(p_token uuid) → jsonb` — SECURITY DEFINER, callable by `anon`. Returns invoice + line_items + payments for a valid non-expired token only. Returns null otherwise. No other rows exposed.
- `get_proposal_by_token(token uuid) → jsonb` — SECURITY DEFINER, callable by `anon`. Returns proposal + proposal_phases + proposal_line_items + proposal_payment_schedule for a valid non-expired token only. Returns null otherwise. No other rows exposed.

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
| Public proposal | `/proposal/:token` | No auth — token + expiry enforced server-side via RPC (0071) |

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
| send-proposal-nudge | v1 | true | Sends proposal reminder (email via Resend or WhatsApp token+URL); regenerates public_token every send; guards status='sent' |
| create-razorpay-order | v1 | false | Creates a Razorpay order for a public invoice; verifies token server-side; returns order_id + key_id; never exposes key_secret |
| verify-razorpay-payment | v1 | false | Verifies Razorpay HMAC-SHA256 signature; cross-checks stored razorpay_order_id; inserts invoice_payments row; syncs invoice status |

**Secrets set:** `RESEND_API_KEY`, `PORTAL_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`

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
| Razorpay/Stripe payment integration | Shipped (feature/razorpay-integration) |
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

## 15. Razorpay payment integration

**Branch:** `feature/razorpay-integration`
**Status:** In progress; pending migration apply + Cloudflare preview test before merge.

### Migration

**0070** (`supabase/migrations/0070_razorpay_order_id_on_invoices.sql`): adds `razorpay_order_id text` (nullable) to `invoices`. Apply manually in Supabase SQL Editor.

### Edge functions (no JWT auth)

Both functions are called from the unauthenticated public invoice page (`/invoice/:token`).

| Function | What it does |
|---|---|
| `create-razorpay-order` | Verifies public token, creates Razorpay order via Basic-auth REST, stores `razorpay_order_id`, returns `{ order_id, amount, currency, key_id }` |
| `verify-razorpay-payment` | Re-verifies token, cross-checks stored order ID, validates HMAC-SHA256 signature, inserts `invoice_payments` row, syncs invoice status |

### Environment variables to set

| Where | Variable | Notes |
|---|---|---|
| Cloudflare Pages | `VITE_RAZORPAY_KEY_ID` | Public key ID; embedded at build time (safe for browser) |
| Supabase function secrets | `RAZORPAY_KEY_ID` | Same key ID; used by create-razorpay-order to return in response |
| Supabase function secrets | `RAZORPAY_KEY_SECRET` | Private; used for HMAC verification only; never exposed to client |

Use `rzp_test_*` keys in development. Switch to `rzp_live_*` in production Cloudflare env vars.
Test card: 4111 1111 1111 1111, any future date, CVV 123.

### Frontend changes

- `PublicInvoicePage.tsx`: replaces static CTA with a teal "Pay Rs X now" button when `balance_due > 0`. Checkout.js loaded dynamically (never bundled). Shows creating / opening / verifying / success / error states (Nielsen H9: all errors have plain-language copy + next step).
- `InvoicePreview.tsx` (admin drawer): "Payment link" section shows the `/invoice/:token` URL, copy button, and "Test payment flow" external link.

### Security rules

- `RAZORPAY_KEY_SECRET` never appears in frontend code or Vite env vars.
- Signature verification uses HMAC-SHA256 (Deno Web Crypto) on `order_id|payment_id`.
- Stored `razorpay_order_id` is cross-checked against what the client sends before verifying.
- Raw Razorpay error strings never surfaced to the client.

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

---

## 16. Proposal nudge system

**Branch:** `feature/proposal-nudge`
**Status:** In progress; pending edge function deploy + Cloudflare preview test before merge.

### Migration

**0071** (`supabase/migrations/0071_proposal_public_token_nudge.sql`): adds `public_token`, `public_token_expires_at`, `last_nudge_sent_at`, `nudge_count` to `proposals`; creates `proposal_nudge_log` table + RLS; creates `get_proposal_by_token(token uuid)` SECURITY DEFINER RPC callable by `anon`. Apply manually in Supabase SQL Editor.

### Edge function

`send-proposal-nudge` — jwt_verify: true. Accepts `{ proposal_id, channel }`. Guards:
- Caller must be admin (JWT verified)
- Proposal status must be `sent` (rejects accepted/declined/draft with typed error codes)
- Always regenerates `public_token` + resets `public_token_expires_at` to now + 7 days
- Increments `nudge_count`, sets `last_nudge_sent_at`
- Inserts row into `proposal_nudge_log`
- Email: sends via Resend (`RESEND_API_KEY`)
- WhatsApp: returns `{ token, public_url, whatsapp_text }` — client opens `wa.me` with encoded text
- Never surfaces raw errors

Error codes returned in `{ error: code }` body:
| Code | Meaning |
|---|---|
| `already_accepted` | Proposal status is accepted |
| `already_declined` | Proposal status is declined |
| `not_sent` | Proposal is not in 'sent' status |
| `no_email` | Client has no email on file |
| `no_whatsapp` | Client has no WhatsApp number on file |

### Public proposal page

Route: `/proposal/:token` — no auth required. Fetches via `get_proposal_by_token` RPC.

Sections (in order):
1. Header: logo + "EswarCreatives" + "Branding Solution"
2. Status banner: teal (accepted) or neutral (declined) — shown only when proposal is actioned
3. Proposal title + client name
4. Summary strip: total value, phase count, timeline hint
5. Phase breakdown: horizontal snap-scroll carousel on mobile, grid on desktop
6. Payment schedule: stacks vertically; shows label, pct, computed amount
7. CTA section: "Accept proposal" button (redirects to `/portal/login?redirect=/portal/proposals`) — hidden when accepted/declined
8. Footer: eswarcreatives.in + hello@eswarcreatives.in

Token expired or not found: friendly error card with mailto link.
No phases: "Proposal details coming soon." empty state (Nielsen H9).

### Admin nudge UI

**ProposalsAdmin** (card grid): Bell button in `cardTopRight` for `status === 'sent'` proposals only.
**ProposalDetail** (action bar): "Nudge" button with Bell icon for `status === 'sent'` only; nudge history section at bottom of page.
**ProposalNudgeModal** (`src/portal/admin/ProposalNudgeModal.tsx`): same pattern as `NudgeModal`.
- Rate limit warning when `last_nudge_sent_at < 1 hour ago` — shows "Send anyway" + "Cancel"
- Missing WhatsApp/email: shows inline warning, disables send button for that channel
- All errors handled with friendly plain-language copy (Nielsen H9)

### Deploy checklist (before merge)

- [ ] Run migration 0071 in Supabase SQL Editor
- [ ] Deploy `send-proposal-nudge` edge function via Supabase dashboard or CLI
- [ ] Confirm `PORTAL_URL`, `RESEND_API_KEY` secrets are set (already set from invoice nudge)
- [ ] Test `/proposal/:token` in incognito — valid token, expired token, accepted/declined states
- [ ] Test nudge bell in admin proposals list (sent proposal)
- [ ] Test nudge bell in admin proposal detail (sent proposal)
- [ ] Test WhatsApp + email channels, rate limit warning
- [ ] Mobile responsive test for `/proposal/:token`

---

## 17. Sales Cadence module

**Branch:** `feature/sales-cadence`
**Status:** In progress; pending migration apply + Cloudflare preview + incognito test before merge.

### Architectural rule: Leads are not clients

Leads follow the same separation rule as reviewers/clients. A lead record never gets a `profiles` row, auth user, project, or invoice until the admin explicitly runs "Convert to client." Conversion calls the existing `admin-create-client` edge function and stores `converted_client_id` on the lead. All five Sales Cadence tables are admin-only via `is_admin() SECURITY DEFINER` — no client-facing surface.

### Tables (migration 0072)

| Table | Purpose |
|---|---|
| `leads` | Outbound prospects. Never creates auth/profile rows. Partial unique index on `lower(email)` where `email is not null`. `unsubscribe_token` is a per-lead UUID used for opt-out. |
| `sequences` | Named outreach cadences. Optional segment association. |
| `sequence_steps` | Steps within a sequence: channel (`email`, `linkedin_connect`, `linkedin_dm`), `day_offset`, templates with `{{variable}}` syntax. |
| `lead_enrollments` | Links a lead to a sequence. Partial unique index enforces one active enrollment per lead+sequence pair. |
| `outreach_touches` | One row per step per enrollment. Stores scheduling, delivery status, snapshots, Resend message ID, open/bounce timestamps. |
| `suppression_list` | Email-level suppression (unsubscribed + hard bounce). Checked by `send-outreach-email` before every send. |

**FK delete order:** `outreach_touches` -> `lead_enrollments` -> `leads` (cascade). `suppression_list` is independent.

### Seed data (migration 0072b)

Three sequences seeded from the acquisition handbook:
- **Email A: Security / AI** (`security_ai`) — 3 email steps at day offsets 0, 3, 6
- **Email B: SaaS Product** (`saas_product`) — 3 email steps at day offsets 0, 3, 7
- **LinkedIn Outreach** (segment null, applies to both) — 4 steps: `linkedin_connect` (D+0), then 3x `linkedin_dm` at D+3, D+6, D+11

All templates use `{{first_name}}`, `{{company}}`, `{{specific_observation}}`, `{{flow}}`, `{{topic}}`, `{{unsubscribe_url}}` variables. No em dashes in any template copy.

### RPCs (all SECURITY DEFINER, set search_path = public)

| RPC | Description |
|---|---|
| `enroll_lead(p_lead_id, p_sequence_id, p_start_date)` | Creates enrollment + one touch per step. Validates `specific_observation` for email sequences. Weekend rollover on scheduling. Returns enrollment id. |
| `mark_lead_replied(p_lead_id)` | Sets lead status to `replied`. Stops active enrollments. Cancels scheduled touches where `stop_on_reply = true`. |
| `pause_enrollment(p_enrollment_id)` | Pauses an active enrollment, records `paused_at`. |
| `resume_enrollment(p_enrollment_id)` | Shifts remaining touches forward by days-paused with weekend rollover. |
| `unsubscribe_by_token(p_token)` | Callable by `anon`. Idempotent. Sets lead status, inserts to suppression list, cancels scheduled email touches. Never reveals token validity. |
| `next_business_day(d date)` | Helper: rolls Saturday -> Monday, Sunday -> Monday. |

### Migration patches

**0072c** (`supabase/migrations/0072c_fix_seed_and_visitor_source.sql`):
- Fixes Email B SaaS Product Step 1 body capitalisation (lowercase `i design` -> `I design`) — no-op if already correct.
- Adds `linkedin_visitor` to `leads.source` check constraint (drops and recreates `leads_source_check`).

### Leads source enum

Valid `source` values: `manual`, `csv`, `apollo`, `linkedin`, `referral`, `linkedin_visitor`.

`linkedin_visitor` = warm lead who visited the LinkedIn profile. AddLeadModal shows a warm-lead chip and LeadDrawer pre-selects LinkedIn Outreach sequence (no auto-enroll; Eswar clicks Enroll manually).

### Edge functions

**`send-outreach-email`** (`jwt_verify: true`)

Input: `{ touch_id: string }`

Error codes (all returned as `{ error: code }` with status 400):

| Code | Meaning |
|---|---|
| `invalid_touch` | Touch not found, not email channel, or status not in (scheduled, failed) |
| `no_email` | Lead has no email address |
| `suppressed` | Lead email in suppression_list OR lead.status is unsubscribed/bounced |
| `missing_observation` | lead.specific_observation is null or empty |
| `unresolved_variables` | Rendered body still contains `{{` after substitution |
| `daily_cap_reached` | 25 email sends already completed today |
| `send_failed` | Resend API returned an error (never exposes Resend's raw error) |

Template variables substituted: `{{first_name}}`, `{{company}}`, `{{specific_observation}}`, `{{flow}}` (falls back to "product"), `{{unsubscribe_url}}` (PORTAL_URL + /unsubscribe/ + token). `{{topic}}` is intentionally left for manual substitution in the LinkedIn DM step 4.

On success: updates touch `status='sent'`, `sent_at`, `subject_snapshot`, `body_snapshot`, `resend_message_id`.
On Resend error: sets touch `status='failed'`, returns `{ error: 'send_failed' }`.

**`resend-outreach-webhook`** (`jwt_verify: false`)

- Verifies Resend webhook HMAC-SHA256 signature via `RESEND_WEBHOOK_SECRET`
- `email.bounced`: marks touch `bounced_at`, sets lead `status='bounced'`, inserts to suppression list, cancels remaining scheduled email touches
- `email.opened`: sets touch `opened_at` on first open only (idempotent by `opened_at is null` guard)
- All other event types: 200 + ignore
- Idempotent by `resend_message_id`

Register in Resend dashboard: `POST /functions/v1/resend-outreach-webhook` for events `email.bounced` and `email.opened`.

**`extract-lead-from-image`** (`jwt_verify: true`)

Input: `{ image_base64: string, media_type: 'image/jpeg' | 'image/png' | 'image/webp' }`.
Calls Anthropic Messages API using `claude-sonnet-4-6` to extract `first_name`, `last_name`, `email`, `linkedin_url`, `company`, `role_title`, `country` from a screenshot.
Returns `{ data: {...} }` on success, `{ error: 'extraction_failed' }` on soft failure (never surfaces raw Anthropic errors).
Guard codes: `invalid_image`, `invalid_media_type`, `image_too_large` (5MB server-side / 4MB client-side).
Used by AddLeadModal screenshot-to-lead upload zone.

### Secrets required

| Secret | Where | Notes |
|---|---|---|
| `RESEND_API_KEY` | Supabase edge function secrets | Already set |
| `PORTAL_URL` | Supabase edge function secrets | Already set |
| `RESEND_WEBHOOK_SECRET` | Supabase edge function secrets | Add before deploying `resend-outreach-webhook` |
| `ANTHROPIC_API_KEY` | Supabase edge function secrets | Add manually in Supabase Edge Function secrets. Never commit. |

### Frontend: /portal/admin/outreach

**Sidebar:** "Outreach" nav item with Send icon. Badge shows count of scheduled touches due + overdue. Badge hidden when count is 0. Uses `tokens.ruby` background, `t.text.onPrimary` text, SF Mono.

**Four tabs:**

**Today** — Daily Motion Tracker stats strip (emails sent today / LI touches today / replies this week / calls booked this week, each with X/Y target display in SF Mono; green when met). Below the strip: Overdue (scheduled_for < today) and Due Today sections. Row action buttons: "Review and Send" (email), "Send Connect" (linkedin_connect), "Send Message" (linkedin_dm). Secondary overflow actions: Skip (with reason picker), Snooze +1 or +3 days (weekend rollover applied). Stats re-fetch after every send/skip/snooze. Edge cases: leads with no email show amber "No email address" warning + "Add email" inline link; awaiting-connection DMs show "Waiting on connection" with "Mark connected" and "Skip" buttons.

**OutreachSendModal** — Email: editable subject + body, rendered template, character count, send button. Error states: `missing_observation` shows inline obs editor; `unresolved_variables` highlights token names; `daily_cap_reached` shows close-only message; `suppressed` auto-cancels touch. LinkedIn: read-only rendered message, Copy button (label changes to "Copied" for 2s), Open LinkedIn Profile button (disabled with hint if no URL), Mark sent button (disables if unresolved `{{topic}}`), Skip link.

**Leads** — Sortable table (desktop), card stack (mobile via `useBreakpoint`). Filters: status, segment, missing-observation toggle. Add Lead modal: screenshot-to-lead upload zone (jpg/png/webp, 4MB limit, calls `extract-lead-from-image`, pre-fills fields on success); `linkedin_visitor` source option with warm-lead chip; inline dup-email warning with link chip. CSV Import modal (parse -> preview table with row-level status -> import valid rows only). Lead drawer (SidePanel): all editable fields, specific_observation highlighted card with explicit Save button (dirty-check; shows "Saved" for 1.5s); `linkedin_visitor` leads auto-pre-select LinkedIn Outreach sequence (Enroll is still manual); enroll section with sequence picker and today-defaulted start date, timeline feed, status action buttons (contextual), LinkedIn status toggle, Convert to client flow.

**Sequences** — Sequence cards, expand to step rail (day_offset badges, channel icons, template previews), inline step editor with variable legend chips. One-time warning on first edit: "Editing templates affects future renders only. Sent snapshots are preserved." Reply rate diagnostic: warning banner (below 4% after 10+ sends, dismissible, component state only) and positive chip (above 10% after 10+ sends). Reply rate calculated client-side: replied leads / distinct leads with sent touch.

**Activity** — Last 200 non-scheduled touches, channel + status filters. Eye icon for opens, bounced label. Click row opens lead drawer.

**Admin dashboard card** — Outreach stats: touches due today, overdue (ruby if > 0), replies this week. "View queue" teal link to /portal/admin/outreach.

### Public route: /unsubscribe/:token

No auth. Calls `unsubscribe_by_token` RPC on mount. Always shows confirmation ("You have been unsubscribed. You will not receive any further emails from Eswar Creatives."). Invalid or already-used token shows the same message. No error state exposed. EC logo + studio name in header.

### Edge cases handled

- Lead with LinkedIn URL but no email: email touch rows show amber "No email address" warning + "Add email" button. Not auto-cancelled.
- Lead with email but no LinkedIn URL: LinkedIn touches auto-skip on their scheduled date with `skipped_reason='no_linkedin_url'`.
- Hard delete blocked if lead has any sent touches: "This lead has sent touches and cannot be deleted. Archive instead."
- Unsubscribed lead re-added via CSV: duplicate check on email catches it. If inserted, suppression_list blocks sends at edge function level.
- All steps complete with no reply: enrollment auto-sets `status='completed'` when last touch is sent/skipped (handled via enrollment status).
- Sequence with no email steps: `enroll_lead` skips specific_observation validation.
- `{{topic}}` in LinkedIn DM step 4: shown un-substituted with ruby highlight, Mark sent disabled until placeholder is removed.
- Weekend scheduling: `enroll_lead` and snooze both roll Saturday -> Monday, Sunday -> Monday.

### Phase 2 TODO list

- Gmail API inbox sync for automatic reply detection
- Automated scheduled sending via cron / pg_cron (v1 is human-in-the-loop by design)
- LinkedIn API integration of any kind
- Open rate and click analytics dashboard
- WhatsApp Business API for outreach (distinct from existing invoice/proposal nudge wa.me links)
- Apollo.io or ZoomInfo MCP lead import (connector available)
- Content scheduling for LinkedIn posts Mon/Wed/Fri from 30-day handbook (planned, not in current sprint)
