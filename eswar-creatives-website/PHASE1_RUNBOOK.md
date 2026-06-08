# Phase 1 Runbook — Client Portal Backend

Phase 1 delivers: Supabase wiring, database schema, RLS policies, a minimal login
screen, and an RLS verification page. **No portal UI beyond login + verify.**

## What's in the repo

```
.env                          Supabase URL + keys (gitignored)
.env.example                  Template with placeholders
src/lib/supabase.ts           Browser client (publishable key only)
src/portal/LoginPage.tsx      /portal/login — email+password and magic link
src/portal/VerifyPage.tsx     /portal/verify — RLS checks dashboard
src/app/route-config.ts       Routes wired (portal routes top-level, no site chrome)
scripts/seed-phase1.mjs       Idempotent seed: owner + Client A + Client B
supabase/migrations/
  0001_profiles_and_role.sql  Roles enum, profiles, signup trigger, is_owner()
  0002_catalog.sql            services, service_tiers
  0003_clients_orders.sql     clients, orders, questionnaire_responses
  0004_billing.sql            quotes, payments
  0005_projects.sql           projects, project_phases, invoices, assets, decision_log
  0006_time_entries.sql       time_entries (owner-only)
  0007_rls_policies.sql       RLS enabled on all 14 tables + explicit policies
  0008_grants_fix.sql         service_role + authenticated base privileges
```

## Seeded test accounts

The seed script creates three users (idempotent — safe to re-run).

| Role     | Email                                | Password         |
|----------|--------------------------------------|------------------|
| Owner    | `owner+phase1@eswarcreatives.in`     | `OwnerPhase1!`   |
| Client A | `clienta+phase1@eswarcreatives.in`   | `ClientAPhase1!` |
| Client B | `clientb+phase1@eswarcreatives.in`   | `ClientBPhase1!` |

Each client has one project; Project A and Project B each have a time entry.

## Running the verification yourself

### 1. Start the dev server (if not already running)

```bash
npm run dev
```

Vite will start at http://localhost:5173.

### 2. Verify as Client A

1. Open http://localhost:5173/portal/login
2. Sign in with `clienta+phase1@eswarcreatives.in` / `ClientAPhase1!`
3. You'll be redirected to `/portal/verify`. You should see:
   - **Identity** card: role = `client`, your `client_id` listed.
   - **RLS Checks** card with all PASS:
     - `profiles → only own row visible` (1 row)
     - `clients → only own row visible` (1 row, profile_id = yours)
     - `other clients → 0 rows returned` (RLS hides Client B's row)
     - `projects → only my projects visible` (1 row, your project)
     - `time_entries → 0 rows (denied)` (RLS hides everything)
     - `services → catalog readable` (1+ rows)
     - `service_tiers → catalog readable` (1+ rows)
     - `projects → client INSERT rejected` (write attempt blocked by RLS)

### 3. Verify as Client B

1. Click **Sign out** on the verify page.
2. Sign in with `clientb+phase1@eswarcreatives.in` / `ClientBPhase1!`.
3. You should see the same all-PASS checks, but with Client B's `client_id`
   and Project B's row.

### 4. Verify as Owner (control case)

1. Sign out, sign in with `owner+phase1@eswarcreatives.in` / `OwnerPhase1!`.
2. You should see:
   - **Identity** card: role = `owner`, client_id is `(none)` (owners have no clients row).
   - **RLS Checks** card: every check passes with the *owner* expectation
     (all profiles visible, all clients visible, all projects visible,
     all time_entries visible, catalog visible).

## Manual cross-check via SQL Editor

If you want to confirm the database side independently of the UI, run these in
the Supabase Dashboard → SQL Editor (which uses the service role and bypasses
RLS, so it sees *everything*):

```sql
-- Should show 3 users total (owner + 2 clients).
select id, role, email from public.profiles order by role, email;

-- Should show 2 clients (A and B).
select id, profile_id, company_name from public.clients order by company_name;

-- Should show 2 projects.
select id, title, client_id from public.projects order by title;

-- Should show 2 time_entries (one per project).
select id, project_id, task_description, duration_minutes from public.time_entries;

-- Confirm RLS is enabled + forced on every table.
select tablename, rowsecurity, forcerowsecurity
from pg_tables where schemaname = 'public' order by tablename;

-- Confirm policy counts (time_entries=1, every other table=2).
select tablename, count(*) from pg_policies
where schemaname='public' group by tablename order by tablename;
```

## Re-seeding / resetting

- **Re-seed (idempotent):** `npm run seed:phase1` — safe, will reuse existing rows.
- **Reset and re-seed from scratch:** in the Supabase Dashboard, go to
  Authentication → Users, delete the three seed users, then in SQL Editor run
  `truncate public.profiles, public.clients, public.services, public.service_tiers,
  public.orders, public.questionnaire_responses, public.quotes, public.payments,
  public.projects, public.project_phases, public.invoices, public.assets,
  public.decision_log, public.time_entries cascade;` — then `npm run seed:phase1`.

## What is NOT in Phase 1 (Phase 2+ territory)

These are out of scope here — do not extend Phase 1 to cover them:

- Public catalog page on the marketing site (currently catalog is auth-gated).
- Order/quote creation flows, questionnaire UI, payment integration.
- File uploads to Supabase Storage (assets table is wired; storage isn't).
- Email templates, owner notifications, client communications.
- Anonymous-role access to anything.

## Security notes

- `.env` is gitignored; only `.env.example` (placeholders) is committed.
- The browser ships *only* the publishable key. The secret key is used solely by
  the local seed script (Node, server-side).
- All 14 public tables have RLS **enabled and forced**.
- Clients have **no INSERT/UPDATE/DELETE policy on any table** → default-deny
  blocks writes. The verify page's INSERT-attempt check proves this.
- No card data is stored anywhere — `payments.processor_reference` only.
- Default privileges granted in migration `0008` ensure future tables created in
  the `public` schema auto-inherit correct grants.
