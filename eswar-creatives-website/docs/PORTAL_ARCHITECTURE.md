# Eswar Creatives — Portal Architecture and Execution Handbook

Last updated: 24 July 2026 (Smart Shortlist + Outreach fixes merged). Keep this in the repo at `docs/PORTAL_ARCHITECTURE.md` and point Claude Code at it before starting any portal work.

---

## 1. Current branch state

**Active branch:** `main` (stable) + `feature/invoice-billing-title-and-proof-attachments` (in progress, not yet merged — see entry below)
**Status:** Stable. `feature/smart-shortlist` and `feature/outreach-shortlist-fixes` merged to main on 24 July 2026. PR #16 (`fix/invoice-og-precedence`) merged to main on 22 July 2026.

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
- **Full admin mobile pass shipped in PR #13** — see PR #13 entry below for complete details

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
- Cloudflare env vars required: SUPABASE_URL, SUPABASE_ANON_KEY (Production AND Preview — see PR #16 note below)

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
- project_attachments table (project-level files, migration 0075)
- projects: start_date, end_date, linked_proposal_id, linked_proposal_phase_id, linked_proposal_line_item_id (migration 0075)
- Storage bucket: stage-attachments (private); blanket admin policy + client read-own policy — **note:** the bucket itself was never actually created during this PR (SQL Editor step was skipped); it silently broke all uploads until fixed in migration 0077, see below
- Shared components: StageLabel, TaskList, AttachmentSection, ClientNotes, ProposalLinkPicker (src/portal/components/)
- Admin ProjectPanel: 4-tab layout (Overview, Stages, Notes, Settings); stage delete impact warning modal
- Client dashboard: data-driven stage stepper, task-based progress ring, stage right drawer, status banners
- Terminology: "Phase" → "Stage" in all UI copy (DB column names unchanged)
- Stage status labels: "Upcoming" (not "Pending"), "In progress", "Done"

_Outreach improvements (PR #11 — `feature/outreach-improvements` — merged 14 Jul 2026):_
- Business hours email scheduling: send-outreach-email defers sends outside 09:00–18:00 Mon–Fri in recipient's timezone; touch status → `scheduled`; COUNTRY_TZ map for 10 countries; returns `{ scheduled: true, scheduled_for }` to caller
- `confirm-scheduled-touch` edge function: admin verifies JWT, confirms a `scheduled` touch, calls Resend directly, updates status to `sent`/`failed`
- ActivityTab: "Scheduled" filter option; "Confirm and Send" button on scheduled email rows with optimistic status update + spinner
- TodayTab: "Pending Confirmation" section showing future scheduled email touches with "Confirm and Send" action
- LinkedIn planner tab (5th tab in OutreachAdmin): Mon/Wed/Fri week-slot grid at 09:00 IST; inline textarea composer (3000 char); "Publish Now" copies to clipboard + updates DB; post history (last 20); `send-linkedin-reminder` edge function triggered by pg_cron Sunday 12:30 UTC
- `linkedin_posts` table + `get_upcoming_linkedin_week()` STABLE SECURITY DEFINER RPC (migration 0076)
- Leads tab: debounced full-text search across 7 fields; filter chips (status/enrollment/source); sortable column headers (asc → desc → clear); result count; empty state with Search icon
- Add Lead CTA in TopBar: primary "Add Lead" button on all `/portal` routes; navigates to `?tab=leads&addLead=1` which auto-opens AddLeadModal
- extract-lead-from-image: updated Claude prompt now extracts 13 fields including phone_business, phone_personal, website, location, notes; max_tokens 800; client-side website inference from business email domain

_Admin portal full mobile-responsive pass (PR #13 — `feature/admin-mobile-responsive` — merged 16 Jul 2026):_
- `AdminShell`: hamburger drawer nav on mobile (< 768px) — 280px slide-in from left, `t.background.surface`, z-index 300, scrim z-index 299, body scroll-lock while open
- `TopBar`: condensed on mobile — Menu icon (44×44px) left, wordmark centered, Add Lead icon-only (no label), Settings gear right
- Admin sidebar: hidden on mobile (< 768px); hamburger drawer replaces it; icon-only 180px stays at tablet (768–1023px); full labels at desktop (>= 1024px)
- `SidePanel` (`src/portal/admin/SidePanel.tsx`): 100vw × 100dvh on mobile, position fixed, slides from right; existing width on tablet+; close button 44×44px always visible top-right
- `ui.tsx` shared `Modal` component: scrim fixed to `t.background.scrim` at z-index 400 (was raw `rgba(10,26,27,0.4)` at z-index 100, below SidePanel z-201); fixes AddLeadModal, NudgeModal, ConfirmPaymentModal, ProposalNudgeModal, CsvImportModal, AddClientModal simultaneously
- `/portal/admin` dashboard: 2-column KPI grid on mobile (4-column on desktop)
- `/portal/admin/clients` (`ClientsList.tsx`): table → card list on mobile; card: name + status pill, company, email, 3-dot overflow menu; sticky "+ Add Client" footer button
- `/portal/admin/projects` (`ProjectsList.tsx`): table → card list on mobile; card: project name, client, status pill, stage count
- `ProjectPanel.tsx`: 4-tab bar horizontally scrollable on mobile; Overview/Stages/Notes/Settings all full-width stacked; stage cards vertical accordion; "+" Add stage full-width
- `/portal/admin/invoices` (`InvoicesAdmin.tsx`): table → card list on mobile; card: invoice number (SF Mono), client, amount, due date, status pill, nudge bell + 3-dot menu
- `/portal/admin/proposals` (`ProposalsAdmin.tsx`): 1-column card grid on mobile (was multi-column)
- `OutreachAdmin.tsx`: 5-tab bar horizontally scrollable on mobile (overflow-x auto, no wrap)
- `LeadsTab.tsx`: table → card list; horizontal scrollable filter chips; sort bottom-sheet on mobile; `AddLeadModal` full-screen on mobile
- `SequencesTab.tsx`: step rail → full-width vertical stack on mobile
- `ActivityTab.tsx`: table → card list; status filter scrollable chips
- `LinkedInTab.tsx`: 3-column Mon/Wed/Fri slot grid → single-column stack on mobile
- `TodayTab.tsx`: single-column stack; "Confirm and Send" full-width on mobile
- Micro-transitions: `motionTokens.durationFast` (120ms) on tab content fade, stage chevron rotate (0→90deg), card tap feedback; hamburger drawer + SidePanel already on `motionTokens.durationBase` (200ms)
- Pre-existing bug fixed in passing: `InvoicePreview.tsx` had raw `window.matchMedia` call violating useBreakpoint-only rule — replaced with `useBreakpoint`
- Three modals intentionally left desktop-only (use custom fixed-position layout outside shared Modal): `DeleteProposalModal`, `DeleteInvoiceModal`, `OutreachSendModal`
- Two duplicate `ProjectPanel` implementations found (one via ClientPanel+SidePanel, one hand-rolled in ProjectsList.tsx for main route) — both fixed independently; consolidation deferred to a future cleanup PR

_Stage-attachments bucket + notes schema-cache fix (PR #12 — `fix/stage-attachments-bucket-and-notes-schema` — merged 15 Jul 2026):_
- Root cause 1: `stage-attachments` storage bucket was never created during the project-stage-module rollout (SQL Editor step skipped), silently breaking every file upload in AttachmentSection for both admin and client
- Root cause 2: `project_client_notes.author_name` column was missing (not just an uncached table), breaking every note post for both admin and client with `PGRST204`
- Diagnosed by directly probing the live Storage and REST APIs (bucket-not-found signature comparison; permission-denied vs schema-cache-miss error comparison) rather than guessing from code
- Migration 0077: creates `stage-attachments` bucket (private, 10MB limit, matches AttachmentSection's accepted file types) + admin-all and client-read-own RLS policies on `storage.objects`; adds `project_client_notes.author_name` defensively (`ADD COLUMN IF NOT EXISTS`); forces a schema-cache reload via `COMMENT ON COLUMN` + `NOTIFY pgrst, 'reload schema'`
- Both fixes confirmed live post-merge: upload now returns the same MIME-validation signature as working buckets; notes insert now reaches the same downstream permission check as any other working table (no more `PGRST204`)

_Outreach preview polish + follow-up system (`feature/outreach-preview-polish` — merged 17 Jul 2026):_
- `LeadDrawer.tsx` moved from `admin/outreach/` to `src/portal/components/LeadDrawer.tsx` — single shared component, wired into TodayTab, ActivityTab, LeadsTab
- TodayTab: "Pending Confirmation" lead name/avatar now opens LeadDrawer (was not clickable before)
- ActivityTab: mobile and desktop both open LeadDrawer locally (was inconsistent — mobile navigated away)
- Dead cross-tab navigation props removed from OutreachAdmin, TodayTab, ActivityTab, LeadsTab (`onOpenLeadDrawer`, `initialOpenLeadId`, `onDrawerClosed`)
- Email preview modal: "Preview" ghost button added to every Pending Confirmation row
- Preview modal fetches touch content by joining `sequence_steps` (subject + body); resolves template variables (first_name, company, specific_observation, unsubscribe_token) client-side via `resolveTemplate()` helper mirroring `confirm-scheduled-touch` edge function logic
- Preview modal: Subject editable input, Body editable textarea; "Save changes" button appears only when dirty; on save writes `subject_snapshot`, `body_snapshot`, `step_id: null` to outreach_touches row
- Preview modal: scrim click disabled (`closeOnBackdrop` false); close only via X button or Close button; unsaved changes guard via native `confirm()` on close
- Preview modal: "Previous emails" collapsible section showing all sent touches for the same lead, read-only, ordered by sent_at desc; joined via `sequence_steps`
- "Changes saved" confirmation moved to `showToast` system ("Email content saved", 2s) — inline footer text removed
- Follow-up date (`follow_up_date` date, nullable) added to leads table via migration 0078
- Draft message (`draft_message` text, nullable) added to leads table via migration 0078
- LeadDrawer: "Follow-up" section below Notes — date input with explicit Save button (appears only when dirty); on save shows toast "We'll remind you on [Day], [DD] [Mon] [YYYY]"
- LeadDrawer: "Draft message" textarea, auto-saves on blur
- TodayTab: "Follow-ups today" section above Due Today — queries leads where follow_up_date = today and status != 'not_interested'; each row shows lead + draft preview (first 100 chars); "Mark done" clears follow_up_date and shows "Follow-up cleared" toast
- Login page (`LoginPage.tsx`): password show/hide toggle added — Eye/EyeOff from lucide-react, absolute right 12px, 44x44px tap target, aria-label toggling, type="button"
- `AddClientModal.tsx`: password toggle brought to same 44x44px spec (was already present but undersized)
- Modal component (`ui.tsx`): `closeOnBackdrop` prop confirmed already existed — no change needed
- Add Project button restored in `ProjectsList.tsx`: `AddProjectModal` (client picker + project name), desktop top-right + mobile sticky footer button — a follow-up commit the same day (`fix/projects`) added the mobile sticky-footer entry point after the desktop-only version shipped first

_Invoice OG meta tag precedence fix (PR #16 — `fix/invoice-og-precedence` — merged 22 Jul 2026):_
- Root cause: `functions/invoice/[token].js` injected invoice-specific OG tags but the homepage `og:url`, `og:title`, `og:description` tags from index.html were already present before the injected tags; Facebook and WhatsApp use the first occurrence of each OG tag, so the homepage card always showed regardless of injection
- Fix: function now strips all existing `og:*` and `twitter:*` meta tags from index.html content before injecting invoice-specific tags, using regex replace on the raw HTML string
- Confirmed via Facebook Sharing Debugger post-merge: `og:title` = "Invoice EC-I-2026-108 · Newgen Event Studio", `og:url` = invoice URL (not homepage), single occurrence of each — no duplicates
- Cloudflare env var fix: `SUPABASE_URL` and `SUPABASE_ANON_KEY` were scoped to Production environment only in Cloudflare Pages Settings; the invoice Cloudflare Pages Function was silently falling back to the SPA shell on all preview URLs (function could not reach Supabase); both vars added to Preview environment on 22 Jul 2026
- **Important distinction:** `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` are React app build-time vars (Vite prefix required). `SUPABASE_URL` / `SUPABASE_ANON_KEY` (no prefix) are Cloudflare Pages Function runtime vars. Both sets must be present in both Production and Preview environments.
- No migration required — Cloudflare Function change only

_Smart Shortlist tab (`feature/smart-shortlist` — merged 24 Jul 2026):_
- Migration 0079 applied: `icp_configs`, `shortlist_runs`, `shortlist_run_screenshots`, `shortlist_candidates` tables; all admin-only RLS via `is_admin()`
- `icp-attachments` private storage bucket created (10MB limit); blanket admin RLS policy
- `leads.vertical` column added (nullable text, CHECK IN ('design_systems','branding')) — separate from `leads.segment`; avoids taxonomy conflict
- `leads.source` CHECK constraint extended to include `'smart_shortlist'`
- `stage-attachments` bucket allow-list extended to include `image/webp`
- `process-shortlist-run` edge function: downloads screenshots from storage as base64, calls claude-sonnet-4-6 (max_tokens 4000) with ICP/goal text + existing-leads fuzzy-dedup list; parses candidate JSON; filters excluded + not_interested matches; inserts shortlist_candidates; sets shortlist_runs.status to complete/failed; async background processing via `EdgeRuntime.waitUntil`
- `SmartShortlistTab.tsx` (`src/portal/admin/outreach/SmartShortlistTab.tsx`): 6th tab in OutreachAdmin (Sparkles icon); sections: ICP summary card (read-only, links to Settings), runs listing as main content, "New shortlist" modal CTA
- `NewShortlistModal.tsx`: vertical selector (Design Systems/Branding), channel selector (Email outreach/LinkedIn DM — one per run), volume selector (5/10/15), screenshot upload with client-side compression (1200px longest side, JPEG 0.85), filename sanitization (strips U+202F and all non-ASCII/special chars), async polling for run completion
- `CandidateCard.tsx` + `src/portal/components/shortlist/types.ts`: reusable candidate card with ICP score bar, confidence indicator, Add to leads inline form, Ignore action
- Settings page (`src/portal/admin/settings/SettingsPage.tsx`): ICP configuration moved here from SmartShortlistTab; accessible via gear panel "ICP configuration" link; two vertical tabs (Design Systems/Branding); ICP text, attachment upload, goal text, goal attachment, Save ICP button with toast confirmation
- **AI run button currently disabled** ("AI processing coming soon") pending queue-based async architecture refactor. All other tab functionality (ICP config, history, channel selector, review panel) is live and working.
- "Beta" pill added to Smart Shortlist tab label in OutreachAdmin

_Ten Outreach + Smart Shortlist fixes (`feature/outreach-shortlist-fixes` — merged 24 Jul 2026):_
- Migration 0080 applied: `shortlist_runs.channel` column (email/linkedin/both, default both); `shortlist_runs.error_code` column (carries the async task's specific failure reason back to the polling client); `outreach_touches` status constraint extended to include `'held'`; `enroll_lead` replaced to gate `requires_connected` steps behind `held` (not `scheduled`) at enrollment time; new `mark_lead_connected(p_lead_id)` RPC promotes a lead's held touches to scheduled atomically
- LinkedIn "waiting on connection" pileup fix: touches for `requires_connected` steps created as `held` at enrollment time; `mark_lead_connected` RPC promotes held→scheduled for that lead; TodayTab shows only earliest unresolved touch per enrollment (dedup)
- Drag and drop fixed on all upload zones (ICP attachments in Settings, screenshots in New Shortlist modal)
- Progress indicator with 4 stages (Uploading, Optimising, Analysing, Scoring) + % completion bar in New Shortlist modal during processing
- Specific error messages per error type: `anthropic_timeout`, `parse_failed`, `no_icp`, `upload_failed` — shown as banner inside modal, never raw strings
- File size warning banner (gold) when total upload exceeds 15MB
- Screenshot filename sanitization: strips extension, folds accents, collapses all non-word/whitespace (including U+00A0, U+202F, U+2009, U+200B) to hyphens, lowercases — fixes macOS default screenshot filenames causing Supabase Storage 400
- `shortlist_run_screenshots` insert error now surfaces correctly (was silently swallowed)
- Add Project button restored in ProjectsList.tsx: `AddProjectModal` (client picker + project name), desktop top-right + mobile sticky footer button
- Docs updated in PORTAL_ARCHITECTURE.md post-merge

_Invoice billing title + payment proof attachments (`feature/invoice-billing-title-and-proof-attachments` — in progress, not yet merged):_
- Migration 0081 applied: `invoices.billing_title` (text, nullable). Note: `invoices.project_id` already existed live (from an earlier, undocumented change) — verified via `list_tables` before writing the migration rather than assuming, so the migration only added the missing column.
- Admin invoice create form: "Billing for" dropdown directly after Client (that client's `projects.title` values + "Custom"); selecting a project autofills an editable "Billing title" input with the project title, "Custom" clears it for manual entry; both `project_id` and `billing_title` are written on save
- `billing_title` surfaced as a muted subtext line (above the existing item-description line) in `InvoicesAdmin.tsx` list (desktop table + mobile card), as a "For" row in the shared `InvoiceDocument` Details box (alongside Issued/Due/Currency) — covers the admin preview drawer, the public `/invoice/:token` page, and the print/PDF output, since all three render the same component. `get_invoice_by_token` needed no RPC change: it returns `to_jsonb(invoices row)`, which picks up new columns automatically.
- `payment_proofs` bucket (private, 5MB limit) and its `admin_all_payment_proofs` + `client_read_own_payment_proofs` RLS policies already existed live (shipped quietly with PR #2 but never wired into any UI) — confirmed via direct bucket + `pg_policies` inspection before building on top of them, per the stage-attachments-bucket lesson (Section 1, PR #12). No storage migration needed.
- `InvoiceDocument` gained an optional `renderPaymentProof(payment, index)` render-prop so it stays role-agnostic; each surface supplies its own control. Admin (`InvoicePreview.tsx`): paperclip icon opens a signed URL for rows with `proof_url`, "+ Attach proof" ghost link uploads to `payment_proofs/{invoice_id}/{timestamp}-{sanitized}.{ext}` and writes the path back to `invoice_payments.proof_url` for rows without. Client (`ClientInvoices.tsx`): same paperclip/view treatment, no upload control. Public invoice page: no proof control (out of scope).
- `sanitizeFilename` extracted from `NewShortlistModal.tsx` into a shared `src/lib/sanitizeFilename.ts` helper (was duplicated logic in the making); both the Smart Shortlist screenshot upload and the new payment-proof attach path now import it.
- Cloudflare preview smoke-tested (admin + client sessions): Billing for/Billing title flow, list/detail/public-page/PDF surfacing, admin attach+view proof, client view-only proof all confirmed working end to end. One fix from that pass: the "For" value initially rendered in the mono font used by short Details tokens (dates, currency), which wrapped awkwardly for longer titles — switched to the body font for that row only (`DetailLine`'s `prose` variant).
- Not yet merged to main.

**Supabase plan:** Pro ($25/month, upgraded 24 Jul 2026). Project ref: `urrinqwcrpivmvenupiu` (Mumbai, ap-south-1).

**Next migration number: 0082**

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
- `invoice_payments` (migration 0065): id, invoice_id, amount, paid_on, method, reference_note, proof_url, created_at, created_by. `proof_url` view/attach UI added on `feature/invoice-billing-title-and-proof-attachments` (column existed since 0065, unused in UI until then).
- `invoice_line_items`: id, invoice_id, label, amount, sort_order, proposal_item_id
- `nudge_log` (migration 0069): id, invoice_id, sent_at, channel, message_preview, sent_by
- `proposal_nudge_log` (migration 0071): id, proposal_id, sent_at, channel, message_preview, sent_by
- `invoices.project_id` (undocumented, present live) + `invoices.billing_title` (migration 0081): optional link to the billed project + an editable label for what the invoice is for; see Section 1

**Sales Cadence tables (migrations 0072-0073):**
- `leads`: phone_business, phone_personal, unsubscribe_token, linkedin_visitor source
- `sequences`, `sequence_steps`, `lead_enrollments` (statuses: active/paused/completed/cancelled), `outreach_touches`, `suppression_list`, `reply_messages`

**Outreach scheduling tables (migration 0076):**
- `outreach_touches` — 3 new columns: `recipient_timezone text`, `draft_confirmed_at timestamptz`, `draft_confirmed_by uuid → auth.users`; status constraint extended: `('pending','sent','failed','skipped','scheduled','cancelled')` (further extended to add `'held'` in migration 0080, see below)
- `linkedin_posts`: id, content, scheduled_for (timestamptz at 09:00+05:30 for Mon/Wed/Fri), status (`pending`/`published`/`failed`), published_at, reminder_sent_at, created_at, updated_at. RLS: admin-only via `is_admin()`.

**Migration 0078 — leads table additions:**
- `follow_up_date` date (nullable): powers Follow-ups today section in TodayTab and date input in LeadDrawer
- `draft_message` text (nullable): staged message shown as preview in Follow-ups today, edited in LeadDrawer

**Migration 0079 — Smart Shortlist tables:**
- `icp_configs`: id, vertical (design_systems/branding, one row per vertical, upserted), icp_text, goal_text, icp_attachment_url, goal_attachment_url, updated_at. Admin-only RLS.
- `shortlist_runs`: id, vertical (CHECK design_systems/branding), volume_email, volume_linkedin, channel (email/linkedin/both), status (CHECK processing/complete/archived/failed), created_at. Admin-only RLS.
- `shortlist_run_screenshots`: id, run_id (FK→shortlist_runs CASCADE), storage_path, created_at. Admin-only RLS.
- `shortlist_candidates`: id, run_id (FK→shortlist_runs CASCADE), extracted_name, extracted_title, extracted_company, extracted_linkedin_url, channel (email/linkedin), icp_score (0-100), confidence (high/low, NOT NULL), connection_status, icp_match_reason, channel_reason, decision (pending/added/ignored, NOT NULL), lead_id (nullable FK→leads), created_at. Admin-only RLS.
- `leads.vertical` column added (nullable text, CHECK IN ('design_systems','branding'))
- `leads.source` CHECK extended to include 'smart_shortlist'
- `stage-attachments` bucket allow-list extended to include image/webp

**Migration 0080 — Outreach fixes:**
- `shortlist_runs.channel` column (text, CHECK IN ('email','linkedin','both'), DEFAULT 'both')
- `shortlist_runs.error_code` column (text, nullable) — carries the async background task's specific failure reason back to the polling client, since the frontend no longer awaits `process-shortlist-run`'s direct response
- `outreach_touches` status constraint extended to include 'held' (for LinkedIn touches waiting on connection acceptance)
- `enroll_lead(p_lead_id, p_sequence_id, p_start_date)` replaced: same body as migration 0072's version, except touches for any step with `sequence_steps.requires_connected = true` are now inserted with `status = 'held'` instead of the column default `'scheduled'`
- `mark_lead_connected(p_lead_id uuid)` RPC added (admin-only SECURITY DEFINER) — sets `leads.linkedin_status = 'connected'` and promotes that lead's `held` touches to `scheduled` in one call

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
- `get_upcoming_linkedin_week() → TABLE(monday date, wednesday date, friday date)` — STABLE SECURITY DEFINER; returns the Mon/Wed/Fri dates for the upcoming week (Mon if today is Monday)
- `mark_lead_connected(p_lead_id uuid)` — admin-only SECURITY DEFINER (migration 0080); sets `leads.linkedin_status = 'connected'` and promotes that lead's `held` touches to `scheduled` in one call

**Invoice number sequence:** Starts at EC-I-2026-105 (via invoice_number_seq)

**FK delete order (full):**
`invoice_payments` → `nudge_log` → `invoices` → `invoice_line_items` → `project_stage_tasks` → `project_stage_attachments` → `project_stage_proposal_links` → `project_client_notes` → `project_stages` → `project_attachments` → `projects` → `orders` → `proposals` → `clients`

**Storage buckets:**

| Bucket | Access | Path pattern |
|---|---|---|
| `stage-attachments` | Private; admin upload + client read own | Stage: `{project_id}/{stage_number}/{category}/{filename}` / Project: `{project_id}/project-level/{category}/{filename}` / Shortlist: `shortlist-runs/{run_id}/{timestamp}-{filename}` |
| `payment_proofs` | Private; admin upload + client read own | `{invoice_id}/{filename}` |
| `proposal-documents` | Private, admin + client read own | `{proposal_id}/{filename}` |
| `icp-attachments` | Private, admin only | `icp/{vertical}/icp-{timestamp}.{ext}` / `icp/{vertical}/goal-{timestamp}.{ext}` |

---

## 4. Route structure

| Surface | Routes | Guard |
|---|---|---|
| Admin portal | `/portal/admin/*` | is_admin() SECURITY DEFINER |
| Settings page | `/portal/admin/settings` | is_admin() — ICP configuration for Smart Shortlist verticals |
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
| `LeadDrawer` | `src/portal/components/LeadDrawer.tsx` | Shared drawer used by TodayTab, ActivityTab, LeadsTab. Shows name, company, title, email, LinkedIn, status, observation, sequence, follow-up date, draft message, notes. |
| `NudgeModal` | `src/portal/admin/NudgeModal.tsx` | WhatsApp + email nudge; rotates public_token; inserts nudge_log row |
| `ConfirmPaymentModal` | `src/portal/admin/ConfirmPaymentModal.tsx` | Mark paid + record partial payment; proof upload |
| `ProgressiveImage` | `src/portal/components/shared/ProgressiveImage.tsx` | All remote image rendering; shimmer placeholder. Never use raw `<img>` for remote URLs |
| `SidePanel` | `src/portal/admin/SidePanel.tsx` | z-201, motionTokens slide-in, 100vw x 100dvh on mobile, shared by all drawers |
| `useBreakpoint` | `src/portal/hooks/useBreakpoint.ts` | Sole breakpoint authority |
| `CandidateCard` | `src/portal/components/shortlist/CandidateCard.tsx` | Smart Shortlist candidate card; ICP score bar, confidence badge, Add to leads inline form, Ignore action |
| `AddProjectModal` | `src/portal/admin/AddProjectModal.tsx` | Client picker + project name field; inserts into projects; desktop top-right + mobile sticky footer button |

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
| admin-create-client | v13 | true | Creates auth user + profile + client row + sends welcome email |
| admin-delete-client | v10 | true | FK-safe atomic delete |
| admin-delete-proposal | v10 | true | FK-safe atomic delete for a proposal and its dependent invoices |
| admin-delete-invoice | v10 | true | Hard-deletes a standalone invoice via service role; rejects with 400 if the invoice is linked to a proposal (delete the proposal instead, via admin-delete-proposal, to keep them consistent) |
| confirm-proposal | v12 | true | Accepts proposal, creates per-phase advance invoices |
| send-welcome-email | v13 | true | Branded welcome email via Resend |
| send-invoice-nudge | v10 | true | Invoice nudge via Resend/WhatsApp |
| send-proposal-nudge | v6 | true | Proposal nudge; guards status='sent'; always regenerates token |
| create-razorpay-order | v6 | false | Creates Razorpay order; verifies invoice token server-side |
| verify-razorpay-payment | v6 | false | Verifies HMAC-SHA256 signature; inserts invoice_payments; syncs status |
| send-outreach-email | v6 | true | Sends cold email via Resend; guards: suppression, daily cap (25), missing_observation, unresolved variables; business hours check — defers to next Mon-Fri 09:00-18:00 in recipient timezone; returns `{ scheduled: true }` if deferred |
| resend-outreach-webhook | v5 | true | Verifies RESEND_WEBHOOK_SECRET; handles email.bounced + email.opened events |
| extract-lead-from-image | v6 | true | Calls claude-sonnet-4-6; extracts 13 fields: name, company, title, email, phone_business, phone_personal, website, location, source, linkedin_url, instagram_url, twitter_handle, notes; max_tokens 800; client infers website from business email domain |
| confirm-scheduled-touch | v1 | true | Admin verifies touch status='scheduled', sends immediately via Resend, sets draft_confirmed_at/by, updates status to 'sent'/'failed' |
| send-linkedin-reminder | v1 | true | Calls get_upcoming_linkedin_week() RPC; counts pending posts for Mon/Wed/Fri; sends reminder to eswar@eswarcreatives.in via Resend if any slot unfilled; triggered by pg_cron Sunday 12:30 UTC |
| process-shortlist-run | v4 | true | Admin JWT + explicit profiles.role check; downloads run screenshots from stage-attachments as base64; calls claude-sonnet-4-6 (max_tokens 4000) with ICP/goal text + existing-leads fuzzy-dedup list; parses candidate JSON array; filters excluded + not_interested matches; inserts shortlist_candidates; sets shortlist_runs.status to complete/failed, writing error_code on failure. Async via EdgeRuntime.waitUntil. **AI run currently disabled in UI pending queue-based architecture refactor.** |

Edge function versions confirmed live via Supabase on 24 Jul 2026 — check `list_edge_functions` before citing a version number elsewhere, they increment on every deploy.

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
| Moorthy | (re-add via Add Client modal) | 123 Adsprint | INR | Active — proposal EC-P-2026-006, status accepted |
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
Response `{ scheduled: true, scheduled_for: ISO-string, message: string }` when deferred by business hours logic.

**Template variables:** `{{first_name}}`, `{{company}}`, `{{specific_observation}}`, `{{flow}}`, `{{unsubscribe_url}}`. `{{topic}}` is intentionally left for manual substitution in LinkedIn DM step 4.

**Business hours scheduling:**
- Detected at send time using `Intl.DateTimeFormat` with `recipient_timezone` on the touch row
- COUNTRY_TZ map covers 10 countries (IN, US, GB, SG, AU, AE, CA, NL, DE, FR); fallback = `Asia/Kolkata`
- Touch status → `scheduled`; `scheduled_for` timestamptz set to next Mon-Fri 09:00 in recipient timezone
- ActivityTab shows "Scheduled" in filter dropdown; per-row "Confirm and Send" button
- TodayTab shows "Pending Confirmation" section for future scheduled email touches
- `confirm-scheduled-touch` edge function sends immediately and marks `draft_confirmed_at/by`

**Frontend tabs (6, OutreachAdmin.tsx):** Today (daily motion tracker), Leads (search + filter chips + sortable table + drawer), Sequences (step rail + inline editor), Activity (last 200 touches; includes scheduled status), LinkedIn (Mon/Wed/Fri week planner, post history, reminder trigger), Smart Shortlist (Beta pill — ICP summary, runs listing, New shortlist modal; AI run disabled pending architecture fix, see Section 1)

**LeadDrawer (`src/portal/components/LeadDrawer.tsx`):** shared drawer used by TodayTab, ActivityTab, LeadsTab. Shows: name, company, title, email (mailto), LinkedIn URL, status pill, specific observation, enrolled sequence + current step, last touch date (IST SF Mono), Notes (auto-save on blur), Follow-up date (explicit save + toast), Draft message (auto-save on blur).

**Leads tab search + filter:**
- Debounced (300ms) full-text search across: name, company, title, email, phone, source, notes
- Filter chips: status (New/Contacted/…), enrollment (Enrolled/Not Enrolled), source (values from data)
- Sortable columns: click cycles asc → desc → clear (third click); sort icon shows active direction
- Result count displayed as `[N] leads` in SF Mono; empty state with Search icon + "No leads match"
- URL param `?addLead=1`: auto-opens AddLeadModal on mount, clears param with replace:true

**Add Lead CTA (TopBar):**
- "Add Lead" primary button (tokens.primary background) shown on all routes starting with `/portal`
- `UserPlus` icon from lucide-react; height 34px; navigates to `/portal/admin/outreach?tab=leads&addLead=1`
- Sits between the flex spacer and the Settings gear

**LinkedIn planner tab:**
- `isoSlotDate(dateStr)` formats Mon/Wed/Fri as `${date}T09:00:00+05:30`
- On mount: calls `get_upcoming_linkedin_week()` RPC; fetches existing posts for those 3 slots
- 3-column slot grid; each slot has inline textarea composer with 3000-char limit and character count
- "Publish Now" button: copies content to clipboard + inserts/upserts `linkedin_posts` row optimistically
- Post history table: last 20 rows ordered by created_at desc; published_at formatted in IST
- Weekend reminder banner when today is Sat/Sun; "Send Test Reminder" ghost button calls edge function directly
- pg_cron job: `linkedin-weekly-reminder` schedule `'30 12 * * 0'` (Sunday 12:30 UTC) — requires pg_cron + pg_net extensions enabled

**Smart Shortlist tab:** see Section 1's `feature/smart-shortlist` and `feature/outreach-shortlist-fixes` entries for full detail (tables, edge function, frontend, current disabled-AI-run state). Admin-only, 6th tab, Sparkles icon.

**Public route:** `/unsubscribe/:token` — confirmation step before RPC fires (prevents pre-fetcher unsubscribes)

**Secrets pending:** `RESEND_WEBHOOK_SECRET` before resend-outreach-webhook goes live. Register in Resend dashboard for email.bounced + email.opened events.

**Phase 2 TODO:** Gmail API inbox sync, LinkedIn API posting (replace clipboard copy), open rate analytics, WhatsApp Business API for outreach.

---

## 11. Pending work

| Item | Priority |
|---|---|
| Smart Shortlist AI run — queue-based async architecture refactor (pg_net or dedicated worker) to fix edge function timeout; currently disabled in UI | High |
| RESEND_WEBHOOK_SECRET secret — set in Supabase before bounce/open tracking | High |
| Invoice nudge automation (next available migration, 0081 now used by billing_title): scheduled reminders at due date, +3d, +7d with PDF attachment | High |
| pg_cron + pg_net extensions: confirm the `linkedin-weekly-reminder` job is actually scheduled and firing (function itself confirmed working via direct probe) | Medium |
| Per-campaign invite scoping for reviewers (RLS tightening) | Medium |
| Portal UX writing pass (raw err.message strings) — standing gap across Proposals, Invoices admin, and all portal error states | Medium |
| Reviewers / clients architecture separation — six logo review users currently added as clients with dummy projects; needs dedicated `reviewers` table separation | Medium |
| Project status share button — one-click visual progress brief (stage stepper + summary) to client via email and WhatsApp | Medium |
| Consolidate duplicate `ProjectPanel` implementations — one via ClientPanel+SidePanel, one hand-rolled in ProjectsList.tsx; deferred from PR #13 | Low |
| Three admin modals desktop-only (DeleteProposalModal, DeleteInvoiceModal, OutreachSendModal) — not using shared Modal component; mobile treatment deferred | Low |
| Public campaign responses pagination + filters | Low |
| /branding landing page gallery/case showcase section — Vim Events and Newgen projects; `/branding/work` route, card grid + per-project case view | Low |

---

## 12. Roadmap in pipeline

**Smart Shortlist AI run fix:** Queue-based async processing via pg_net or dedicated worker to bypass edge function execution limits. Replaces current disabled synchronous flow.

**Invoice nudge automation:** Scheduled reminders at due date, +3d, +7d. PDF attachment. Auto-triggered + manual CTA buttons per invoice. Next available migration (0082+; 0081 now used by billing_title).

**Project status share button:** One-click sends visual progress brief (stage stepper + summary) to client email and WhatsApp.

**Razorpay/Stripe for client portal:** Replace manual "Mark paid" with gateway. Client-facing pay button.

**Multi-tenant architecture:** Single codebase + per-tenant `tenant.config.ts` + separate Supabase project per client + separate Cloudflare Pages deployment per client on custom domain. Implement before client 3. See architecture decision doc for full plan (not yet located/verified in this repo — confirm location before relying on it).

---

## 13. Execution rules

- One branch per feature. One commit per logical layer.
- Never merge to main without Cloudflare preview + incognito test.
- Migrations: apply one at a time in Supabase SQL Editor, confirm green before next.
- Never raw-insert into auth.users. Always `supabase.auth.admin.createUser`.
- RLS admin policies use `is_admin()` SECURITY DEFINER only. Never inline subqueries on profiles.
- Never surface raw err.message to client.
- Test every login flow in incognito before marking complete.
- Cloudflare preview needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (React app vars) AND `SUPABASE_URL` + `SUPABASE_ANON_KEY` (Cloudflare Pages Function vars). Both sets required in both environments.
- FK delete order must be followed (see Section 3).
- Stage status labels: always "Upcoming", "In progress", "Done" — never "Pending".
- Reusable components in `src/portal/components/` only — never duplicated per screen.
- `useBreakpoint` is the only breakpoint authority — no ad-hoc resize listeners, no `window.matchMedia`, no `window.innerWidth`.
- Admin mobile patterns: hamburger drawer (z-300) + scrim (z-299) for nav; SidePanel full-screen (z-201) on mobile; shared Modal scrim at z-400. Never use `position: fixed` inside SidePanel (breaks iOS).
- All migrations use `apply_migration`, not `execute_sql`. Always preview SQL before applying.
- For long agent runs (25+ minutes without committing): open a separate terminal tab and run `git add src/ && git commit -m "wip(...): checkpoint"` manually.

---

## 14. One-line summary

Three roles, three portals, reviews never need a project, accounts always through admin API, no raw hex, teal only on interactive elements, stages not phases, "Upcoming" not "Pending", Cloudflare Function vars unprefixed, React app vars VITE_ prefixed, Smart Shortlist AI run disabled pending queue-based architecture fix, next migration 0082.
