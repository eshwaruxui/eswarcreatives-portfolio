# Tenant Provisioning Log

Running log of what happens when a new tenant's Supabase project is
provisioned from this codebase's migrations and Edge Functions. Add a new
dated section per tenant rather than overwriting previous entries — the
whole point of this file is that the same categories of issue keep
recurring, and a future session should be able to grep this file's history
before repeating the discovery work.

---

## How fixes and features propagate across tenants

Standing reference, not tied to any one tenant. Three different layers
behave differently when something is changed or fixed, and conflating
them leads to false confidence that "the fix shipped everywhere":

1. **Application code** (React components, business logic, UI) is
   genuinely shared. All tenants run the same codebase from the same
   repo. A fix or feature ships to every tenant automatically the next
   time each tenant's Cloudflare Pages deployment rebuilds. There is no
   per-tenant fork of this layer to maintain.

2. **Tenant data is never shared, by design.** Each tenant has its own
   separate Supabase project (own database, own auth, own rows). A code
   fix does not touch or migrate anyone's existing data. This is
   intentional and matches the "client data must never share a Supabase
   project" architecture rule.

3. **Edge Functions are the layer where this gets non-obvious**: the
   *source* is shared (one file in the repo, like any other code), but
   each Edge Function must be individually *deployed* to each tenant's
   own Supabase project to actually take effect there. Fixing an Edge
   Function's source and redeploying it to Eswar's project does **not**
   automatically update the live copy running on FutureNorms' project, or
   any future tenant's project. Each deployment is a separate, explicit
   action.

   Concrete example from this session: `send-confirmed-outreach-touches`
   was found to hardcode Eswar's sender identity. The fix was made once
   in the shared source, but had to be deployed twice — once to Eswar's
   project, once to FutureNorms' — to actually take effect for both. A
   third tenant would need a third explicit deployment of the same fixed
   source.

**Practical implication for future work:** before considering any Edge
Function bug fix or feature "shipped" across all tenants, explicitly
check whether it has been redeployed to every active tenant's Supabase
project, not just the one being tested. Application-layer fixes (React
components/pages) do not have this problem and can be trusted to
propagate on their own.

---

## Batching gotchas

Standing reference, not tied to any one tenant. When concatenating multiple
migration files into fewer `apply_migration` calls to reduce round-trips
(this codebase's provisioning pattern for a fresh tenant project), one
category of migration cannot be safely batched with anything that depends
on it, even when the original files were written to work fine
individually:

**Any migration that does `ALTER TYPE ... ADD VALUE` on an existing enum
must be applied in its own isolated transaction — completely alone, not
just separated from *other* files.** Postgres will not let a transaction
reference a freshly-added enum value in most expression contexts
(`CREATE POLICY ... USING`, `CHECK` constraints, etc.) until that value
has actually committed, and `apply_migration` wraps everything submitted
in one call inside a single transaction. Confirmed by direct testing
during FutureNorms' provisioning: a migration that both added a new enum
value **and used that same value later in the same file** failed with
`55P04: unsafe use of new value ... HINT: New enum values must be
committed before they can be used` — even when that migration was
submitted as the *only* content in its own `apply_migration` call, fully
isolated from every other file. The original file historically applied
fine on Eswar's project, which only means whatever process applied it
there did not wrap the whole file in one manual transaction (most likely
autocommit per statement) — not that the file is safe to batch here.

**The fix, confirmed working:** split that one file into two separate
`apply_migration` calls — the bare `ALTER TYPE ... ADD VALUE` statement
alone first, then everything else in the file (which references the new
value) as a second, later call. This will recur for every future tenant
provisioning unless migrations are pre-scanned for this exact pattern
(`ALTER TYPE .* ADD VALUE` followed by a use of that value later in the
same file) before batching begins, so the offending file can be split in
advance instead of discovered via a failed apply.

---

## FutureNorms (Kiruthika, futurenorms.in) — 26 August 2026

Branch: `feat/tenant-theme`. Supabase project: `ywppmokydzlxtqbfpzra`
(South Asia / Mumbai). **Migration batching complete** — all of
0001-0108 applied except `0014`, `0066`, `0072b` (skipped for
tenant-inappropriate content, see below) and `0077` (skipped, missing
prerequisite table — see below); `0085` and `0011`/`0018` applied in
modified form (see below). Verified via `list_tables`: 59 tables, all
RLS-enabled, all empty (fresh tenant, no seed data). Confirmed `tenants`
and `tenant_modules` do **not** exist on this project — correct, those
are specific to Eswar's management project (migration `0109`, never
applied here). `project_client_notes` confirmed absent, matching the
`0077` skip. `NOTIFY pgrst, 'reload schema'` run as a final step. Modules
enabled for this tenant: `invoices`, `outreach`, `qrCode`,
`brandVisualGuide`. `proposals`, `projects`, `mockups`, `discovery`,
`campaigns` disabled; `dashboard` always-on per the existing gating rule.

### Migration-level issues found and how each was resolved

**`0011_proposals.sql` — applied in modified form.** Schema (the
`proposals` table, its RLS policies, and the two client-facing RPCs
`mark_proposal_viewed`/`respond_to_proposal`) is generic and correct for
any tenant. Section 4 of the original file seeds a real Eswar client
("Newgen Event Makers" / Mohan) and a real proposal, keyed to a hardcoded
Supabase Auth `profile_id` (`42f77e83-1be6-4177-83e7-1ca2c5d3fc80`) that
only exists in Eswar's own `auth.users`. Applying it unmodified would
either fail on the `clients.profile_id` foreign key (most likely) or
insert an orphaned row nobody could ever own. **Resolution:** applied a
modified copy with section 4 stripped entirely (sections 1-3 only); the
checked-in `supabase/migrations/0011_proposals.sql` is untouched and
still correct for Eswar's own project, since it's the source of truth for
his real seeded data. Rejected alternative: running it as-is and letting
it fail — the FK violation would have blocked the whole batch for no
benefit, since the seed content is unambiguously wrong for any other
tenant.

**`0014_seed_newgen.sql` — skipped entirely.** Same root problem as
0011's section 4, but the whole file is the seed (a `clients` row + a
real project + phases, same hardcoded profile_id) with no schema content
worth preserving. **Resolution:** excluded from the batch outright.
Rejected alternative: none seriously considered — there is no schema
here to strip a seed away from.

**`0066_backfill_newgen_advance_payments.sql` — skipped entirely.** Not a
migration at all in intent — its own header says *"BACKFILL ONLY —
preview SQL. Run manually in Supabase SQL Editor. Do NOT apply via
migration runner (it contains DML for a specific real invoice)."* It
contains a literal unresolved `<INVOICE_ID>` placeholder, which is not
valid SQL and would error immediately if executed as written, on any
project including Eswar's own. **Resolution:** excluded from the batch.
No modified-copy option was considered because there is nothing generic
in this file to preserve — it exists purely to hand-correct one specific
historical invoice.

**`0072b_seed_outreach_sequences.sql` — skipped for content reasons, not
a technical failure.** Seeds three real outreach sequences containing
Eswar's own UX/design-systems sales pitch — specific CYGNVS project
references, "$750 UX Audit" pricing, "I design UX and design systems for
B2B SaaS," `eswarcreatives.in` sign-offs. This runs cleanly on a fresh
project (self-contained inserts into empty tables, no FK risk), which
makes it different from 0011/0014/0066: nothing here *fails*, it just
seeds content that is actively wrong for an HR recruitment firm, and
since `outreach` is one of FutureNorms' four enabled modules, Kiruthika
would have seen this content on day one. **Resolution:** skipped.
FutureNorms starts with empty `sequences`/`sequence_steps` tables and
builds her own outreach content from scratch through the Outreach UI.
Rejected alternative: apply as-is with a note to manually rewrite every
sequence before use — rejected because it front-loads confusing,
wrong-voice content into a brand-new tenant's first look at the module,
for no benefit over starting empty.

**`0072c_fix_seed_and_visitor_source.sql` — applied as-is, unmodified.**
Two unrelated parts in one file: part (a) is an `UPDATE` tied to 0072b's
seeded content (matches by sequence name + a specific body-text prefix);
since 0072b was skipped, this matches zero rows and no-ops harmlessly.
Part (b) is a genuine, tenant-agnostic schema fix — adds
`linkedin_visitor` to the `leads.source` check constraint. **Resolution:**
ran the file unmodified rather than hand-splitting it, since part (a) is
provably inert on this project and part (b) is needed regardless of the
0072b decision.

**`0075_sequence_step_templates_v2.sql` and
`0084_outreach_footer_remove_location.sql` — applied as-is, verified
no-ops.** Both are pure rewrites of 0072b's seeded rows: 0075 does
`select id into v_seq_a from sequences where name = 'Email A: Security /
AI' limit 1` (and similarly for Email B) before any `UPDATE`; with 0072b
skipped, `sequences` has no row with that name, so these selects return
`NULL` and every subsequent `UPDATE ... WHERE sequence_id = NULL` matches
zero rows — Postgres does not error on this, it simply updates nothing.
0084's `UPDATE ... WHERE body_template LIKE '%Eswar Creatives, Chennai,
India%'` matches zero rows for the same reason (the table is empty).
**Verified, not assumed:** confirmed via `list_migrations` and the batch
success responses that both files applied without error as part of their
batches, and separately confirmed `sequences`/`sequence_steps` contain no
rows from 0072b before concluding these were genuine no-ops rather than
silently partial applies.

**`0018_notify_submission_webhook.sql` — applied in modified form.**
Not a data-seeding issue — a hardcoded infrastructure URL. The original
file's `notify_submission()` trigger function calls
`net.http_post(url := 'https://urrinqwcrpivmvenupiu.supabase.co/functions/v1/notify-submission', ...)`
— Eswar's own project's Edge Function, unconditionally, on every insert
into `logo_sketch_submissions`. That table backs the legacy
`/portal/admin/sketches` route, which is **not** part of `AdminShell`'s
gated `NAV_BASE` at all (not one of the 10 real modules, not reachable
through FutureNorms' or any tenant's module configuration) — so this is
dormant rather than live-firing, but the trigger would still exist and
misfire with FutureNorms' data if that route were ever reached manually.
**Resolution:** applied a modified copy where `notify_submission()`'s
body is a no-op (`return new;` with no `net.http_post` call) instead of
calling Eswar's endpoint; the table and trigger *shape* is preserved
(so it matches Eswar's schema if this feature is ever revisited for
FutureNorms), only the outbound call is removed. Rejected alternative:
skip the whole file — rejected because the table/trigger *structure*
existing is harmless and keeps FutureNorms' schema shape consistent with
Eswar's, only the actual network call needed to go.

**`0085_outreach_confirmed_send_cron.sql` — root cause fixed, not
patched; applied in modified form pointing at FutureNorms' own
infrastructure.** Same class of hardcoded-URL problem as 0018, but
significantly higher stakes: this schedules a live `pg_cron` job that
fires every 5 minutes via `net.http_post` against
`https://urrinqwcrpivmvenupiu.supabase.co/functions/v1/send-confirmed-outreach-touches`
— Eswar's own project — and `outreach` **is** one of FutureNorms' four
enabled modules, so this is not dormant like 0018; it would start firing
the moment the migration applied. Investigating this led to auditing the
target function itself (see next section) and finding it also hardcodes
Eswar's sender identity, not just the cron target. **Resolution
(complete):** rather than strip the feature or leave it disabled,
`send-confirmed-outreach-touches` was deployed as a real, working
function on FutureNorms' own project (`ywppmokydzlxtqbfpzra`) with a
fresh, FutureNorms-specific `CRON_SECRET` (never Eswar's, generated via
`openssl rand -hex 32`). A matching Postgres Vault secret named
`CRON_SECRET` was also created there (`select vault.create_secret(...)`)
— this had to be run by the user directly in the Supabase SQL Editor,
since `vault.create_secret` requires elevated privileges the MCP tool's
role doesn't have (`42501: permission denied for function create_secret`
when attempted via the execute_sql tool). `0085` was applied in modified
form pointing at
`https://ywppmokydzlxtqbfpzra.supabase.co/functions/v1/send-confirmed-outreach-touches`
with that new secret. Verified via read-only inspection of `cron.job`
(jobid 1, `send-confirmed-outreach-touches`, `*/5 * * * *`, `active:
true`) — no manual trigger, per the standing instruction not to risk an
accidental real send against a project with no real outreach data yet.

**Ordering note: this was applied ahead of migration batches 3-8**
(0001-0029 were applied at the time 0085 ran; 0030-0084/0086-0108 were
still pending). This has one real, low-risk knock-on effect: `0085`
installs the `pg_cron` extension, and migration `0076` (LinkedIn reminder
cron, arrives later in batch 6) only registers its own job if `pg_cron`
already exists (`IF EXISTS (SELECT 1 FROM pg_extension WHERE extname =
'pg_cron')`). Applying `0085` first means that guard will now evaluate
true when batch 6 runs, so `0076`'s weekly LinkedIn reminder job *will*
register on FutureNorms' project — where in strict file order it would
have been silently skipped. Not harmful (worst case: a job that errors
weekly with "unrecognized configuration parameter" until
`app.supabase_url`/`app.service_role_key` Postgres settings are
configured, the same latent gap this likely already has on Eswar's own
project), but flagged here so it isn't mistaken for a coincidence.

**`0077_stage_attachments_bucket_and_schema_reload.sql` — skipped
entirely, and it surfaced a real gap in the migration history itself,
independent of FutureNorms.** Applying it failed outright: `ERROR: 42P01:
relation "public.project_client_notes" does not exist`. The batch-6
transaction rolled back cleanly (verified via `list_migrations` and
`list_tables` — nothing from batch 6 was partially applied), so no
corruption resulted. Investigated before doing anything else, per the
standing "stop and report, don't patch" rule: `grep -rl
"project_client_notes" supabase/migrations/*.sql` returns exactly one
file — `0077` itself, which only `ALTER TABLE ... ADD COLUMN IF NOT
EXISTS` and `COMMENT ON COLUMN`s it, assuming the table already exists.
**There is no `CREATE TABLE public.project_client_notes` anywhere in
this repo's tracked migration history.** The table exists on Eswar's
live production database only because it was created out-of-band at
some point — directly via the Supabase Dashboard/SQL editor, not through
any checked-in migration. This is genuine untracked schema drift in the
migration history itself, not something this provisioning session
introduced.

**Resolution for FutureNorms: skip `0077` entirely for now.**
`project_client_notes` is almost certainly tied to the **Projects**
module (client-facing notes on a project), and `projects` is one of the
modules disabled for FutureNorms — so this gap is not currently
load-bearing for her. Revisit `0077` if Projects is ever enabled for her
or any future tenant. Note the file also creates the `stage-attachments`
storage bucket + its RLS policies, unrelated to `project_client_notes`
and not dependent on it — that part was left unapplied too by skipping
the whole file, rather than hand-splitting it, since nothing currently
enabled for FutureNorms needs that bucket either.

**Separate, broader action item (not specific to FutureNorms):** the
untracked-schema-drift itself should be reconciled independent of any
tenant provisioning — a new migration reconstructing the real
`project_client_notes` table from Eswar's live schema, so the tracked
migration history actually matches what's running in production. Until
that exists, any future tenant will hit this exact same failure the
moment their Projects module needs it.

**`0100_public_outreach_user.sql` — applied in split form, not modified
content.** Failed twice with `55P04: unsafe use of new value
"outreach_user"` — once as part of a larger batch, and again even when
resubmitted as the *only* content in its own `apply_migration` call,
because the file itself does `ALTER TYPE ... ADD VALUE 'outreach_user'`
and then uses that value later in the same file (RLS policies comparing
`profiles.role = 'outreach_user'`), and `apply_migration` wraps each call
in one transaction. See the standing "Batching gotchas" section above for
the general pattern and why the file being fine historically on Eswar's
project doesn't mean it's fine here. **Resolution:** split into two
`apply_migration` calls — the bare `ALTER TYPE` statement alone
(committed first), then everything else in the file. No content was
changed, only the submission boundary.

### Edge Function hardcoding findings

Auditing `send-confirmed-outreach-touches` (triggered by investigating
0085) surfaced the same hardcoded-identity problem inside the function's
own logic, not just its trigger — `FROM = "Eswar Maheswaran
<eswar@eswarcreatives.in>"` (a bare constant, not read from env at all)
and `reply_to: "eswar@eswarcreatives.in"` (same). Deploying this function
unmodified to FutureNorms' project would have sent her outreach emails
under Eswar's name, with replies routing to his inbox — a real
cross-tenant privacy issue, not just a cosmetic one.

A full grep (`grep -rln "eswar@eswarcreatives.in\|Eswar Maheswaran\|eswarcreatives\.in" supabase/functions`)
found **11 Edge Functions** with this pattern: `send-linkedin-reminder`,
`send-outreach-email`, `verify-otp`, `send-confirmed-outreach-touches`,
`receive-enquiry`, `notify-submission`, `send-proposal-nudge`,
`send-welcome-email`, `_shared/outreachEmailBody.ts`,
`send-invoice-nudge`, `send-enquiry-reply`.

Cross-referenced against FutureNorms' four enabled modules to decide scope
(fixing all 11 in one pass was considered and explicitly rejected as
touching more of Eswar's live production code than the task in front of
us required):

**Fixed, redeployed to both projects, and verified (4 functions,
complete):**
- `send-outreach-email` — introduced `OUTREACH_SENDER_NAME` /
  `OUTREACH_SENDER_EMAIL` / `PORTAL_URL` env vars, all three with no
  hardcoded fallback (the function now returns a `sender_not_configured`
  500 if any is unset rather than silently defaulting to Eswar's
  identity or site). `OUTREACH_SENDER_*` used for both `from` and
  `reply_to`.
- `send-confirmed-outreach-touches` — same env var names, same values
  as `send-outreach-email` (both functions shared the identical
  hardcoded identity and `PORTAL_URL` fallback on Eswar's project, so
  they share the same project-level secret names rather than duplicating
  them under different keys).
- `send-linkedin-reminder` — its own env vars, since its current values
  differ slightly from the two functions above:
  `LINKEDIN_SENDER_NAME`/`LINKEDIN_SENDER_EMAIL` (display name
  "EswarCreatives" differs from "Eswar Maheswaran" even though the
  address is the same on Eswar's project — preserved rather than merged
  away) and `LINKEDIN_ADMIN_EMAIL`, a separate constant that is the
  **recipient** of the weekly reminder, not a sender field — if left
  hardcoded, Eswar would receive notifications about Kiruthika's LinkedIn
  posting queue instead of her. Also uses the same no-fallback
  `PORTAL_URL`. Still contains hardcoded "EswarCreatives" wordmark text
  and brand hex colors (`#FAF8F4`, `#024C4F`) inside the HTML email
  template body itself — left as a known, accepted cosmetic gap (the
  template shows Eswar-branded styling for FutureNorms' internal ops
  reminder email too), since it's an internal-only notification
  (Kiruthika sees it, not her clients) and redesigning the template was
  judged out of scope for a hardcoding-safety pass.
- `send-invoice-nudge` — its own env vars (`INVOICE_SENDER_NAME` /
  `INVOICE_SENDER_EMAIL`), since its current hardcoded value
  (`"Eswar Creatives <hello@eswarcreatives.in>"`) uses a third, distinct
  sender persona from the outreach functions' `eswar@`.

**Deployment and verification, both projects:**
- Redeployed to Eswar's project (`urrinqwcrpivmvenupiu`) first, after the
  user set all 8 secrets (`OUTREACH_SENDER_NAME`, `OUTREACH_SENDER_EMAIL`,
  `LINKEDIN_SENDER_NAME`, `LINKEDIN_SENDER_EMAIL`, `LINKEDIN_ADMIN_EMAIL`,
  `INVOICE_SENDER_NAME`, `INVOICE_SENDER_EMAIL`, `PORTAL_URL`) via the
  Dashboard — this tool has no way to set Edge Function secrets itself.
  Verified live via `query_logs`: the `send-confirmed-outreach-touches`
  cron tick immediately after deploy (17:20:02 UTC) returned `200`, not
  the `sender_not_configured` 500, confirming the secrets landed
  correctly and Eswar's production sending was not interrupted.
- Deployed the same fixed source to FutureNorms' project
  (`ywppmokydzlxtqbfpzra`) after the user set the equivalent 7 secrets
  (no separate `PORTAL_URL` distinction needed there beyond the shared
  one) with her own values (`Kiruthika Maheswaran`,
  `kiruthika@futurenorms.in`, `https://www.futurenorms.in`, etc. — see
  the user's own messages in-session for the exact values set, not
  duplicated here). Verified via a direct, safe test invocation of
  `send-confirmed-outreach-touches` (curl with the correct
  `x-cron-secret`): returned `{"error":"query_failed"}` at HTTP 500 —
  expected and correct, since auth and the sender-identity check both
  passed cleanly (no 401, no `sender_not_configured`) and the function
  only failed at the `outreach_touches` query stage, because that table
  doesn't exist yet on her project (migrations 3-8 not yet applied at
  time of writing). Confirmed via `list_tables` that this is exactly the
  expected state, not a bug.

**Correction (found during Step 6 investigation, 27 Aug):** the
"confirmed dead code" claim below for `send-welcome-email` was wrong. The
grep that produced it (`grep -rl "send-welcome-email" src/
supabase/migrations/`) never checked `supabase/functions/` itself, and
`admin-create-client` (Eswar's project, `urrinqwcrpivmvenupiu`) calls it
directly via `admin.functions.invoke("send-welcome-email", ...)` as its
final step when a new client account is created. It hardcodes `FROM` and
a `PORTAL_URL` fallback (same pattern as the other functions in this
section) and **is** reachable — just not from `src/` or migrations. It
was excluded from the fixing pass anyway because (a) FutureNorms'
enabled modules don't include a client-onboarding flow that would call
it on her project, and (b) Step 6 (Kiruthika's own admin account) was
deliberately built to route around it rather than depend on it — see
below. It still needs the same env-var treatment before
`admin-create-client` (or an equivalent) is ever deployed to a tenant
project that actually onboards clients through it.

**Left hardcoded, not reachable through FutureNorms' (or any tenant's)
currently-enabled modules:**
- `send-proposal-nudge` — Proposals module, disabled for FutureNorms.
- `receive-enquiry`, `send-enquiry-reply` — Discovery/enquiries flow,
  disabled for FutureNorms.
- `notify-submission` — logo sketch review; not in `AdminShell`'s
  `NAV_BASE` at all, for any tenant (see 0018 above).

**`verify-otp` — flagged specifically, should never be deployed to a
tenant project at all.** This backs the `/outreach/*` public self-serve
signup flow, which per this codebase's own architecture (see
`docs/PORTAL_ARCHITECTURE.md` Section 1) is explicitly scoped to
`eswarcreatives.in` as a product, not a per-tenant feature —
`outreach_user` is not a role that exists per-client the way
`admin`/`client`/`reviewer` do. It appearing in this grep is expected
(it legitimately hardcodes Eswar's identity because it only ever runs on
his project) and is not a bug to fix — it's a reminder that this
function, and the whole `/outreach/*` public product surface, must never
be part of a future tenant's deployment checklist at all.

### Shared-file tenant-specific content risk

`_shared/outreachEmailBody.ts` (imported by both `send-outreach-email`
and `send-confirmed-outreach-touches`) contains:

```ts
escaped = escaped.split("eswarcreatives.in/design-systems").join(
  `<a href="https://www.eswarcreatives.in/design-systems">eswarcreatives.in/design-systems</a>`,
);
```

This auto-links Eswar's own portfolio URL wherever it appears verbatim in
an outreach email body. **Currently inert for FutureNorms** — her
`sequences`/`sequence_steps` start empty (0072b was skipped), so no email
body she writes will contain that exact string by coincidence. **Not
fixed in this pass** — flagged as a latent risk instead: any future
tenant whose own content happens to contain the literal substring
`eswarcreatives.in/design-systems` (vanishingly unlikely, but not
impossible if a template is ever copy-pasted from Eswar's own materials)
would have that text silently rewritten into a link pointing at Eswar's
site, inside their own client-facing email. Fixing this properly means
parameterizing `htmlBody()`'s signature (both call sites would need to
pass their own auto-link target), which was judged out of scope for this
pass — noted here specifically so it isn't rediscovered from scratch.

### Systemic root-cause pattern

**Read this before starting any future tenant's provisioning.** Every
issue in this log traces back to one fact: this codebase's early
migrations and Edge Functions were written when Eswar was the only
tenant, so "the business" and "the schema/infrastructure" were never
separated. That was a reasonable shortcut for a single-tenant codebase
and is not a one-off FutureNorms problem — it will recur, unchanged, for
every future tenant until the remaining instances are found and fixed.
The categories found this session, worth grepping for proactively on the
next tenant rather than rediscovering migration-by-migration:

1. **Seeded client data inside schema migrations** — a migration that
   creates a table also `INSERT`s a real client/project/proposal row,
   often keyed to a hardcoded `auth.users`/`profiles` UUID. Grep:
   real client/company names (`Newgen`, `Mohan`), and any
   `insert into public.clients` / `insert into public.proposals` that
   isn't guarded behind a variable or parameter.
2. **Hardcoded cross-project webhook/cron URLs** — a trigger function or
   `pg_cron` job with `urrinqwcrpivmvenupiu.supabase.co` typed directly
   into a `net.http_post` call. Grep: `urrinqwcrpivmvenupiu` and
   `net.http_post` across `supabase/migrations/`.
3. **Hardcoded sender identity in Edge Functions** — `FROM`/`reply_to`/
   notification-recipient constants that aren't read from
   `Deno.env.get(...)`, or that read from env but fall back to an
   Eswar-specific default. Grep: `eswar@eswarcreatives.in`,
   `Eswar Maheswaran`, `Eswar Creatives <` across `supabase/functions/`.
4. **Tenant-specific content in nominally shared template files** — a
   `_shared/` helper with a specific string, URL, or brand value baked
   in rather than passed as a parameter. Found once
   (`outreachEmailBody.ts`); worth specifically re-checking every file
   under `supabase/functions/_shared/` on the next tenant, since this
   category is the easiest to miss (the file *looks* generic from its
   name and location).
5. **Migrations authored on the sprint branch after the tenant's replay
   already ran.** Found live, post-deploy: migration `0109_tenants_and_
   modules.sql` (the table `useTenantConfig` itself depends on) was
   written and committed to `feat/tenant-theme` *during* this same
   session, after FutureNorms' migration replay had already finished
   through `0108`. It was never applied to her project — `select * from
   tenants` returned `42P01: relation "public.tenants" does not exist`,
   and her deployed portal showed a blocking "Tenant not found" screen.
   Applied a modified copy directly (same table/RLS shape, seeded with
   her own self-referential row instead of Eswar's — see the pattern
   used for `0018`). **The general lesson: a migration replay done
   mid-sprint is a snapshot of the branch at that moment, not a
   standing guarantee — always diff `list_migrations` against the
   branch's current `supabase/migrations/` directory right before
   declaring a tenant's onboarding complete, not just at the start of
   the replay.**

### Recommendation for future tenant onboarding

**Yes, start with a dedicated audit pass before batching, but go in with
eyes open that it will not catch everything.** An upfront pass — the four
greps listed above, run across the full `supabase/migrations/` and
`supabase/functions/` trees before any migration is applied — would have
caught 0011, 0014, 0066, 0072b (via category 1), 0018 and 0085's cron
targets (via category 2), and all 11 Edge Function hardcodes (via
category 3) in a single pass at the start, rather than discovering them
scattered across migration batches and one investigation prompted by
another.

**Honestly, though, the Edge Function hardcoding inside
`send-confirmed-outreach-touches`'s own logic (as opposed to its cron
trigger) was only found because 0085's cron target was investigated
first, which led to reading the function it called.** An upfront grep
pass using category 3 above *would* have caught it independently — but
that grep pattern (`eswar@eswarcreatives.in`, `Eswar Maheswaran`) wasn't
written down as a thing to check until *after* it was found this way.
That's the actual lesson: the categories above are now known and
checkable in advance, but this session found them in the order the work
happened to surface them, not because the audit approach was
comprehensive by design from the start. A future session running the
four greps above as literal Step 0 — before reading a single migration
file in detail — would likely front-load all of this into one report
instead of a running discovery across the whole provisioning session.

## FutureNorms — Phase 4 palette values, 27 August 2026

Theme wiring (`src/portal/theme.ts`'s `isEswarPalette`/`derived` branches,
see `docs/PORTAL_ARCHITECTURE.md` §7) needed a real palette for values with
no formula from `primary`/`gold` — `accent`, `goldDark`, `goldLight`,
`tealLight`-equivalent, `text.onAccent`, `phaseUI.nodeFill`, and the
phase-active border. FutureNorms has an audited Figma palette (unlike a
brand-new tenant with only `primary`/`gold` declared), so these are her
real designer-picked values, not `derivePalette.ts`'s generic formula.
Source: `design-tokens/🔗 Semantic Tokens.Light.tokens.json` +
`🎨 Primitives.Mode 1.tokens.json` (fileKey `HNcvu8LtGe4eAfM7R5fA61`).

| theme.ts role | Value | Figma token |
|---|---|---|
| `accent` / `phaseUI.nodeFill` | `#5f449c` | `icon/brand-subtle`, violet.400 |
| `goldDark` | `#523e14` | `brand/accent-dark`, gold.700 |
| `goldLight` | `#fbf6e4` | `brand/accent-subtle`, gold.50 |
| `tealLight`-equivalent | `#ede6f9` | `brand/primary-tint-subtle`, violet.50 |
| `text.onAccent` | `#322711` | `text/on-accent`, gold.800 |
| phase-active border | `#ebd9a3` | `status/pending-border`, gold.200 |

**One deliberate mismatch worth flagging:** her Figma file's own
`status/active-*` tokens are violet-hued (a "live/active" status meaning),
but `phaseUI.status.active` in this codebase specifically means "Phase 2,
gold" (see `theme.ts`'s own `phasePalette` comment: "Phase 1 teal, Phase 2
gold, Phase 3 ruby"). Using her `status/pending-*` tokens (gold-hued) for
the phase-active border instead of her same-named `status/active-*` tokens
is intentional — matching the token *name* would have matched the wrong
*meaning*.

## FutureNorms — portal custom domain decision, 27 August 2026

**`futurenorms.in` (the apex) is FutureNorms' existing live marketing
site, unrelated to this portal** — confirmed via screenshots of its
homepage and About page before any DNS change was made. Attaching the
apex to the `futurenorms-portal` Cloudflare Pages project would have
repointed the marketing site's DNS and taken it down. **The portal's
custom domain is `portal.futurenorms.in` (a subdomain), not the apex —
do not re-litigate this.**

DNS for `futurenorms.in` resolves to `ns61/62.domaincontrol.com`
(GoDaddy) — confirmed via `dig NS futurenorms.in` — and is **not** a zone
in the Cloudflare account this portal's other infrastructure lives in
(`eswarcreatives.in`, `vimeventsdecor.com`, `vimeventsdecor.in` are the
only three zones there). Whoever holds the GoDaddy login for
`futurenorms.in` (likely Kiruthika, not necessarily the same person
managing the Supabase/Cloudflare side) needs to add a CNAME record there:
`portal` → `futurenorms-portal.pages.dev`. This is a distinct credential
boundary from everything else in this provisioning arc — worth surfacing
explicitly if a future tenant also already has an existing site on their
apex domain, since the "one Cloudflare Pages deployment per client on
custom domain" architecture decision (Section 1) doesn't by itself say
apex vs. subdomain, and assuming apex is available is not safe by
default.

`PORTAL_URL` on `ywppmokydzlxtqbfpzra` (the secret introduced during the
Edge Function sender-identity fix, PR #28) must be
`https://portal.futurenorms.in` to match — update it via Dashboard →
Project Settings → Edge Functions → Secrets before relying on any
outreach email's unsubscribe/portal links being correct for FutureNorms.
