# Eswar Creatives — Portal Architecture and Execution Handbook

Last updated: 14 July 2026. Keep this in the repo at `docs/PORTAL_ARCHITECTURE.md` and point Claude Code at it before starting any portal work.

---

## 1. Current branch state

**Active branch:** `main`
**Status:** Stable. PR #10 (`feature/project-stage-module`) squash-merged to main on 14 July 2026.

**Shipped and merged to main (chronological):**

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

_Proposal nudge system (PR #5 — `feature/proposal-nudge`):_
- `public_token` + expiry + nudge tracking on proposals (migration 0071); `get_proposal_by_token` RPC callable by anon
- `proposal_nudge_log` table: per-proposal reminder history; RLS admin-only
- `/proposal/:token` public proposal page — no auth required, responsive via `useBreakpoint`
- `ProposalNudgeModal`: WhatsApp + email; token always regenerated server-side (7-day TTL); rate-limit warning at 1-hour threshold
- `send-proposal-nudge` edge function: admin-JWT-verified; guards status='sent'; regenerates token on every call
- Nudge bell on 'sent' proposals in `ProposalsAdmin` card view and `ProposalDetail` action bar

_Razorpay live mode (PR #6 — `feature/razorpay-integration` + direct commits 10 July 2026):_
- KYC completed (Video KYC). Live mode active; `rzp_live_*` keys in Supabase secrets + Cloudflare Production env vars
- Migration 0070 applied; edge functions `create-razorpay-order` + `verify-razorpay-payment` deployed
- Payment checkout confirmed working on eswarcreatives.in

_Sales Cadence CRM module (PR #8 — `feature/sales-cadence`):_
- Tables: leads, sequences, sequence_steps, lead_enrollments, outreach_touches, suppression_list, reply_messages
- Edge functions: send-outreach-email, resend-outreach-webhook, extract-lead-from-image
- Public unsubscribe page, daily motion tracker, screenshot-to-lead, LinkedIn visitor fast-track, reply rate diagnostics
- Migrations 0072, 0072b, 0072c, 0073 applied

_Invoice public token fixes (direct commits to main — 11 Jul 2026):_
- Migration 0074: `regenerate_invoice_token(p_invoice_id uuid)` RPC — admin-only SECURITY DEFINER, rotates token + sets 30-day expiry
- `public_token_expires_at` now set at invoice creation (was NULL, causing all links to show "expired" immediately)
- "Copy link" + "Test payment flow" buttons call regenerate_invoice_token RPC on click
- PORTAL_URL secret corrected to https://www.eswarcreatives.in

_Invoice UX polish (direct commits to main — 6-11 July 2026):_
- Record payment available on pending/sent/overdue (not just partially_paid)
- Admin invoice list: 3-dot overflow menu (MoreVertical); nudge bell always visible; position:fixed dropdown to escape Card overflow:hidden; z-index 1000
- Balance due column: ruby for partially_paid, muted for paid, primary for all other statuses
- PDF download via window.print(): ec-invoice-document class; @media print in index.css hides chrome (A4, 16mm margins)
- PDF double-page fix: clones .ec-invoice-document, appends to body as #ec-print-root, removes on afterprint
- Trust badge section on public invoice: Shield + "Secured by Razorpay" + UPI/Cards/Net Banking pills

_Invoice OG meta tags (direct commits to main — 12 Jul 2026):_
- Cloudflare Pages Function at functions/invoice/[token].js — intercepts GET /invoice/:token for 13 crawler user-agents
- For crawlers: fetches invoice via RPC, injects 9 OG/Twitter meta tags; og:title = "Invoice {number} · {client_company}"
- ?og_debug=1 param bypasses UA check for testing
- Cloudflare env vars required: SUPABASE_URL, SUPABASE_ANON_KEY (Production)

_Static OG pages (direct commits to main — 12-13 Jul 2026):_
- scripts/generate-og-pages.mjs: postbuild script generating static HTML at dist/branding/, dist/design-systems/, dist/portal/, dist/portal/login/
- public/_redirects: explicit rules above SPA catch-all
- OG images: og-portfolio.png, og-branding.png, og-design-systems.png, og-portal.png (all 1200x630px in public/)

_Design systems landing page + wordmark (direct commits to main — 13 Jul 2026):_
- Middot separators (not em dashes) in document.title and meta tags
- TRIAGE_MECHANISM: 3-column grid, hairline border separator
- Audit section: 4px #D5B067 left border + CARD_SHADOW; "LOW-RISK ENTRY POINT" SF Mono label
- Wordmark: Navbar.tsx, TopBar.tsx, ClientNav.tsx, PortalNav.tsx all → "EswarCreatives"

_Project stage module (PR #10 — `feature/project-stage-module` — 14 Jul 2026):_
- project_stages table + seed trigger (migration 0075): admin-named stages, auto-seeded 4 defaults on project creation
- project_stage_attachments, project_stage_tasks (+ parent_task_id for subtasks), project_client_notes, project_stage_proposal_links (migration 0075)
- project_attachments table (project-level files, migration 0076)
- projects: start_date, end_date, linked_proposal_id, linked_proposal_phase_id, linked_proposal_line_item_id (migration 0076)
- Storage bucket: stage-attachments (private); blanket admin policy + client read-own policy
- Shared components: StageLabel, TaskList, AttachmentSection, ClientNotes, ProposalLinkPicker (src/portal/components/)
- Admin ProjectPanel: 4-tab layout (Overview, Stages, Notes, Settings); stage delete impact warning modal
- Client dashboard: data-driven stage stepper, task-based progress ring, stage right drawer, status banners
- Terminology: "Phase" → "Stage" in all UI copy (DB column names unchanged)
- Stage status labels: "Upcoming" (not "Pending"), "In progress", "Done"

**Next migration number: 0077**

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

All migrations live on Supabase project `urrinqwcrpivmvenupiu` (Mumbai, ap-south-1).

**Core tables:**
`profiles`, `clients`, `projects`, `orders`, `invoices`, `proposals`, `proposal_phases`, `proposal_line_items`, `proposal_payment_schedule`, `proposal_documents`

**Project stage module (migration 0075-0076):**
- `project_stages`: id, project_id, stage_number, name, status (pending/in_progress/done), sort_order. Seeded by trigger on project creation.
- `project_stage_tasks`: id, project_id, stage_number, title, description, status, sort_order, parent_task_id (1-level nested subtasks)
- `project_stage_attachments`: id, project_id, stage_number, category (design_brief/development/output_delivery), file_name, storage_path
- `project_attachments`: id, project_id, category, file_name, storage_path (project-level, not stage-scoped)
- `project_client_notes`: id, project_id, author_role (admin/client), author_id, body
- `project_stage_proposal_links`: id, project_id, stage_number, proposal_id, proposal_phase_id. UNIQUE(project_id, stage_number)

**Key columns added (project):**
- `projects`: timeline, start_date, end_date, linked_proposal_id, linked_proposal_phase_id, linked_proposal_line_item_id

**Review system:**
`reviewers`, `review_campaigns` (visibility: public|private, status: draft|active|closed), `review_items`, `review_votes`

**Public vote system (legacy, live data):**
`public_campaigns` (+ visibility column), `public_votes`, `logo_sketch_sets`, `logo_sketch_submissions`, `logo_sketch_reviews`

**Notification and timeline tables:**
`client_notifications` (type, reference_id, is_read), `timeline_extensions`

**Invoice tables:**
- `invoice_payments` (migration 0065): id, invoice_id, amount, paid_on, method, reference_note, proof_url, created_at, created_by
- `invoice_line_items`: id, invoice_id, label, amount, sort_order, proposal_item_id
- `nudge_log` (migration 0069): id, invoice_id, sent_at, channel, message_preview, sent_by
- `proposal_nudge_log` (migration 0071): id, proposal_id, sent_at, channel, message_preview, sent_by

**Sales Cadence tables (migrations 0072-0073):**
- `leads`: phone_business, phone_personal, unsubscribe_token, linkedin_visitor source
- `sequences`, `sequence_steps`, `lead_enrollments` (statuses: active/paused/completed/cancelled), `outreach_touches`, `suppression_list`, `reply_messages`

**Key proposal columns:**
- `proposal_phases`: solution_title, timeline, key_note
- `proposal_line_items`: solution_title, solution_overview
- `proposals`: revision_rounds, key_note, accepted_at, declined_at, decline_reason, public_token, public_token_expires_at, last_nudge_sent_at, nudge_count
- `invoices`: public_token, public_token_expires_at, last_nudge_sent_at, nudge_count (migration 0068)

**RPCs:**
- `get_invoice_by_token(p_token uuid) → jsonb` — anon callable, token+expiry enforced
- `get_proposal_by_token(token uuid) → jsonb` — anon callable, token+expiry enforced
- `regenerate_invoice_token(p_invoice_id uuid) → text` — admin-only SECURITY DEFINER, 30-day expiry
- `confirm_proposal(proposal_id)` — per-phase advance invoices on acceptance
- `decline_proposal(proposal_id, reason)` — client SECURITY DEFINER
- `respond_to_timeline_extension(id, decision)` — client SECURITY DEFINER
- `update_own_full_name(name)` — client SECURITY DEFINER
- `mark_proposal_viewed(proposal_id)` — client SECURITY DEFINER
- `is_admin()` — SECURITY DEFINER, used by all RLS policies

**Invoice number sequence:** Starts at EC-I-2026-105 (via invoice_number_seq)

**FK delete order (full):**
`invoice_payments` → `nudge_log` → `invoices` → `invoice_line_items` → `project_stage_tasks` → `project_stage_attachments` → `project_stage_proposal_links` → `project_client_notes` → `project_stages` → `project_attachments` → `projects` → `orders` → `proposals` → `clients`

**Storage buckets:**

| Bucket | Access | Path pattern |
|---|---|---|
| `stage-attachments` | Private; admin upload + client read own | Stage: `{project_id}/{stage_number}/{category}/{filename}` / Project: `{project_id}/project-level/{category}/{filename}` |
| `payment_proofs` | Private, admin only | `{invoice_id}/{filename}` |
| `proposal-documents` | Private, admin + client read own | `{proposal_id}/{filename}` |

---

## 4. Route structure

| Surface | Routes | Guard |
|---|---|---|
| Admin portal | `/portal/admin/*` | is_admin() SECURITY DEFINER |
| Client portal | `/portal/projects`, `/portal/proposals`, `/portal/invoices`, `/portal/mockups`, `/portal/campaigns`, `/portal/account` | role = client |
| Reviewer portal | `/portal/review/:campaignId` | role = reviewer |
| Public vote | `/portal/vote/:token` | No auth |
| Public invoice | `/invoice/:token` | No auth, token+expiry via RPC |
| Public proposal | `/proposal/:token` | No auth, token+expiry via RPC |
| Public unsubscribe | `/unsubscribe/:token` | No auth |

**Login redirects:**
- `admin` / `owner` → `/portal/admin`
- `client` → `/portal/projects`
- `reviewer` → `/portal/review/:firstCampaignId`

---

## 5. Key components and patterns

### Responsive breakpoints
- **Single source of truth:** `src/portal/hooks/useBreakpoint.ts`
- Returns `{ isMobile, isTablet, isDesktop }`
- Breakpoints: mobile `< 768px`, tablet `768–1023px`, desktop `>= 1024px`
- **Rule:** Never use `window.innerWidth`, `window.matchMedia`, or ad-hoc resize listeners. Only `useBreakpoint`.

### Shared reusable components

| Component | Location | Notes |
|---|---|---|
| `StageLabel` | `src/portal/components/StageLabel.tsx` | Stage header, inline name edit (admin), status pill: Upcoming/In progress/Done |
| `TaskList` | `src/portal/components/TaskList.tsx` | Drag reorder, status cycle, nested subtasks (↳ 1-level), progress bar (secondary color) |
| `AttachmentSection` | `src/portal/components/AttachmentSection.tsx` | Drag+drop+paste upload, signed URL download, projectLevel prop for project_attachments table |
| `ClientNotes` | `src/portal/components/ClientNotes.tsx` | Threaded notes, avatar + role badge, auto-grow textarea, Cmd+Enter to post |
| `ProposalLinkPicker` | `src/portal/components/ProposalLinkPicker.tsx` | 3-step picker: proposal → phase → solution. Read-only insight card for client |
| `InvoiceDocument` | `src/portal/components/shared/InvoiceDocument.tsx` | Read-only invoice template; readOnly prop; shared by admin/client/public |
| `ClientNav` | `src/portal/client/ClientNav.tsx` | Desktop top bar + mobile 64px bottom tab bar, safe-area-inset, ruby badges |
| `NudgeModal` | `src/portal/admin/NudgeModal.tsx` | WhatsApp + email nudge; rotates public_token; inserts nudge_log row |
| `ConfirmPaymentModal` | `src/portal/admin/ConfirmPaymentModal.tsx` | Mark paid + record partial payment; proof upload |
| `ProgressiveImage` | `src/portal/components/shared/ProgressiveImage.tsx` | All remote image rendering; shimmer placeholder. Never use raw `<img>` for remote URLs |
| `SidePanel` | `src/portal/admin/SidePanel.tsx` | z-201, motionTokens slide-in, shared by all drawers |
| `useBreakpoint` | `src/portal/hooks/useBreakpoint.ts` | Sole breakpoint authority |

### Admin ProjectPanel — 4-tab layout

| Tab | Contents |
|---|---|
| Overview | Project name (inline edit), start date, end date, client name, ProposalLinkPicker (project-level), AttachmentSection ×3 (project-level) |
| Stages | Data-driven from project_stages. Per stage: StageLabel (editable name), status selector, ProposalLinkPicker, TaskList (with subtasks), AttachmentSection ×3. Stage delete: impact warning modal (counts tasks/files/links). "+ Add stage" at bottom. |
| Notes | ClientNotes (admin role) |
| Settings | Current stage selector (reads project_stages.name), status (active/on_hold/completed) |

### Client dashboard — stage module

- Stepper driven from `project_stages` table (not hardcoded)
- Progress ring: task-based % if tasks exist, else stage-based (done=1.0, in_progress=0.5)
- Stage subtitle: "Stage [N] · [name from DB]" — never hardcoded
- Stage click → right drawer (SidePanel): StageLabel, ProposalLinkPicker (read-only), TaskList (read-only), AttachmentSection ×3 (read-only)
- Status banners: on_hold → neutral, completed → green
- ClientNotes section below stepper (client role)

---

## 6. Edge functions (all deployed)

| Function | Version | jwt_verify | Purpose |
|---|---|---|---|
| admin-create-client | v3 | true | Creates auth user + profile + client row + sends welcome email |
| admin-delete-client | v1 | true | FK-safe atomic delete |
| confirm-proposal | v2 | true | Accepts proposal, creates per-phase advance invoices |
| send-welcome-email | v3 | true | Branded welcome email via Resend |
| send-invoice-nudge | v1 | true | Invoice nudge via Resend/WhatsApp |
| send-proposal-nudge | v1 | true | Proposal nudge; guards status='sent'; always regenerates token |
| decline-proposal | v1 | true | SECURITY DEFINER, captures decline reason |
| respond-to-timeline-extension | v1 | true | Client approve/deny |
| update-own-full-name | v1 | true | SECURITY DEFINER |
| create-razorpay-order | v1 | false | Creates Razorpay order; verifies invoice token server-side |
| verify-razorpay-payment | v1 | false | Verifies HMAC-SHA256 signature; inserts invoice_payments; syncs status |
| send-outreach-email | v1 | true | Sends cold email via Resend; guards: suppression, daily cap (25), missing_observation, unresolved variables |
| resend-outreach-webhook | v1 | false | Verifies RESEND_WEBHOOK_SECRET; handles email.bounced + email.opened events |
| extract-lead-from-image | v1 | true | Calls Anthropic claude-sonnet-4-6; extracts lead fields from screenshot |

**Secrets set:** `RESEND_API_KEY`, `PORTAL_URL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `ANTHROPIC_API_KEY`
**Secrets pending:** `RESEND_WEBHOOK_SECRET` (required before resend-outreach-webhook goes live)

---

## 7. Theme and token system

**File:** `src/portal/theme.ts`

Two exports:
- `tokens` — legacy flat strings (~360 usages). Do not restructure.
- `t` — EC Design System semantic map:
  - `t.text.*` (primary, secondary, tertiary, muted, disabled, inverse, onPrimary, urlLink, primaryBrand)
  - `t.border.*` (subtle, default, medium, strong, focus, overlay variants, brand, danger, success, warning)
  - `t.background.*` (page, subtle, muted, surface, raised, sunken, tint1/2/3, overlay variants, scrim)

**Figma Design System Master:** `0SGbENUggpj9Fe6NebJ9QM`
Token collections: teal (20), gold (20), neutral (21), ruby (20), success (20), warning (20), neutral-alpha (18), teal-alpha (20), yellow (20), avatar-palette (42), radius (15), spacing (33). Semantic Tokens: 268 total.

**Design rules:**
- No raw hex outside theme.ts
- No em dashes anywhere in copy or UI text
- Fraunces: headings. Inter: body. SF Mono: numbers/IDs
- motionTokens: fast 120ms, base 200ms, slow 350ms (cubic-bezier(0.4,0,0.2,1))
- Teal/brand: interactive elements only. Never on static text.
- Borders: always from t.border.* or overlay tokens
- Stage status labels: "Upcoming", "In progress", "Done" — never "Pending"
- Reusable components in src/portal/components/ only — never duplicated per screen

---

## 8. Real clients

| Client | Email | Company | Currency | Status |
|---|---|---|---|---|
| Mohan | newgeneventtn@gmail.com | Newgen Event Makers | INR | Active — Newgen Branding 2026 |
| Moorthy | (re-add via Add Client modal) | 123 Adsprint | INR | Needs re-adding |
| Eswar (test) | eswarcreatives@gmail.com | Eswar Creatives Test | INR | Internal test account |

**Reviewers (in reviewers table):** keerthigc24, darshanraphal, sajhith, krithik6607, paavansai032012, bewithmehmm

**Public campaigns:**
- "Newgen Logo Concept Polling - Jun 2026" — 548 real votes, visibility = private, KEEP
- "Smoke testing Campaign" — DELETED

---

## 9. Payment and invoice model

**Proposal payment schedule:**
- Per-phase, must sum to 100% per phase
- Default: 35% advance (triggered on acceptance), 35% mid, 30% final
- `confirm_proposal()` creates one advance invoice per phase on acceptance

**Partial payment tracking:**
- balance_due computed client-side: amount - sum(invoice_payments.amount)
- Status: paid when balance = 0; partially_paid when 0 < paid < amount
- proof_url in payment_proofs private bucket

**Public token + nudge:**
- public_token regenerates on every nudge send; 7-day TTL (invoices), 30-day at creation
- WhatsApp: opens wa.me with encoded text
- Email: sends via Resend
- Every send inserts nudge_log row; history in admin invoice drawer

**Razorpay live mode:**
- create-razorpay-order + verify-razorpay-payment edge functions deployed
- Migration 0070 applied
- rzp_live_* keys in Supabase secrets + Cloudflare Production

---

## 10. Sales Cadence module

**Admin-only. Tables:** leads, sequences, sequence_steps, lead_enrollments, outreach_touches, suppression_list, reply_messages

**Key rules:**
- Leads are never clients. No auth/profile row until explicit "Convert to client."
- Daily cap: 25 cold emails. Weekend rollover intentional (next_business_day logic).
- Delete order: outreach_touches first, then lead_enrollments (FK-ordered).
- Hard delete blocked if lead has sent touches.

**Error codes from send-outreach-email:**
`missing_observation`, `unresolved_variables`, `daily_cap_reached`, `send_failed`, `suppressed`

**Template variables:** `{{first_name}}`, `{{company}}`, `{{specific_observation}}`, `{{flow}}`, `{{unsubscribe_url}}`. `{{topic}}` is intentionally left for manual substitution in LinkedIn DM step 4.

**Frontend tabs:** Today (daily motion tracker), Leads (sortable table + drawer), Sequences (step rail + inline editor), Activity (last 200 touches)

**Public route:** `/unsubscribe/:token` — confirmation step before RPC fires (prevents pre-fetcher unsubscribes)

**Secrets pending:** `RESEND_WEBHOOK_SECRET` before resend-outreach-webhook goes live. Register in Resend dashboard for email.bounced + email.opened events.

**Phase 2 TODO:** Gmail API inbox sync, automated scheduled sending, LinkedIn API, open rate analytics, WhatsApp Business API for outreach.

---

## 11. Pending work

| Item | Priority |
|---|---|
| File upload bug in AttachmentSection — storage policy fix applied, needs retest | High |
| Notes saving — fix applied (commit 8ca9f702), needs retest | High |
| Moorthy 123 Adsprint re-add via Add Client modal | High |
| PORTAL_ARCHITECTURE.md commit to repo | High |
| RESEND_WEBHOOK_SECRET secret — set in Supabase before bounce/open tracking | High |
| Sales Cadence smoke test checklist (see Section 10) | High |
| design-system-v1 Task 4 (About, Services, case study pages) | Medium |
| Per-campaign invite scoping for reviewers (RLS tightening) | Medium |
| Portal UX writing pass (raw err.message strings) | Medium |
| Public campaign responses pagination + filters | Low |

---

## 12. Roadmap in pipeline

**Invoice nudge automation:** Scheduled reminders at due date, +3d, +7d. PDF attachment. Auto-triggered.

**Project status share button:** One-click sends visual progress brief (stage stepper + summary) to client email and WhatsApp.

**Razorpay/Stripe for client portal:** Replace manual "Mark paid" with gateway. Client-facing pay button.

---

## 13. Execution rules

- One branch per feature. One commit per logical layer.
- Never merge to main without Cloudflare preview + incognito test.
- Migrations: apply one at a time in Supabase SQL Editor, confirm green before next.
- Never raw-insert into auth.users. Always `supabase.auth.admin.createUser`.
- RLS admin policies use `is_admin()` SECURITY DEFINER only. Never inline subqueries on profiles.
- Never surface raw err.message to client.
- Test every login flow in incognito before marking complete.
- Cloudflare preview needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- FK delete order must be followed (see Section 3).
- Stage status labels: always "Upcoming", "In progress", "Done" — never "Pending".
- Reusable components in `src/portal/components/` only — never duplicated per screen.
- `useBreakpoint` is the only breakpoint authority — no ad-hoc resize listeners.

---

## 14. One-line summary

Three roles, three portals, reviews never need a project, accounts always through admin API, no raw hex, teal only on interactive elements, stages not phases, "Upcoming" not "Pending".
