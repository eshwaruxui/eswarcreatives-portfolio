-- Phase 3 / 0011 — proposals
-- One row per proposal sent to a client. `content` is jsonb so the
-- structure can evolve without migration churn — totals live in
-- dedicated columns so they remain queryable / sortable later.
--
-- Access matrix:
--   owner        : full read/write (matches the Phase 1 pattern).
--   client       : SELECT scoped to own proposals (via clients.profile_id).
--   client       : no raw INSERT / UPDATE / DELETE — status changes go
--                  through SECURITY DEFINER RPCs so the protected
--                  columns (content, totals, valid_until) can't be
--                  edited from the browser.
--   anon         : denied everywhere.
--
-- Two RPCs are exposed to authenticated callers:
--   public.mark_proposal_viewed(p_proposal_id uuid)
--     → transitions sent → viewed on the caller's own proposal.
--   public.respond_to_proposal(p_proposal_id uuid, p_response text)
--     → transitions to accepted | declined on the caller's own proposal.
-- Both raise if the proposal isn't owned by the caller (or by an owner).
--
-- Seed at the bottom inserts (idempotently):
--   • clients row for Mohan / Newgen Event Makers
--   • the 'newgen-branding-2026' proposal with status='sent'
-- Re-running the migration is safe: ON CONFLICT clauses guard both.

----------------------------------------------------------------------
-- 1. Schema
----------------------------------------------------------------------
create type public.proposal_status as enum (
  'draft',
  'sent',
  'viewed',
  'accepted',
  'declined'
);

create table public.proposals (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  slug            text not null unique,
  title           text not null,
  content         jsonb not null,
  total_min_cents bigint,
  total_max_cents bigint,
  currency        text not null default 'INR',
  status          public.proposal_status not null default 'draft',
  valid_until     date,
  sent_at         timestamptz,
  viewed_at       timestamptz,
  responded_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index proposals_client_idx on public.proposals(client_id);
create index proposals_status_idx on public.proposals(status);

----------------------------------------------------------------------
-- 2. RLS
----------------------------------------------------------------------
alter table public.proposals enable row level security;
alter table public.proposals force  row level security;

-- Owners: full read/write.
create policy owner_all_proposals on public.proposals
  for all to authenticated
  using      (public.is_owner())
  with check (public.is_owner());

-- Clients: SELECT own proposals only. No raw write policy — they go
-- through the RPCs below for status changes.
create policy client_read_own_proposals on public.proposals
  for select to authenticated
  using (
    client_id in (
      select id from public.clients where profile_id = auth.uid()
    )
  );

----------------------------------------------------------------------
-- 3. RPCs (the only write path for clients)
----------------------------------------------------------------------

-- mark_proposal_viewed: transitions a 'sent' proposal to 'viewed' on
-- first read by its owner-client. No-ops if the proposal is already
-- past 'viewed' or doesn't belong to the caller.
create or replace function public.mark_proposal_viewed(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.proposals
  set
    status = 'viewed',
    viewed_at = now()
  where id = p_proposal_id
    and status = 'sent'
    and (
      public.is_owner()
      or client_id in (
        select id from public.clients where profile_id = auth.uid()
      )
    );
end;
$$;

-- respond_to_proposal: client (or owner) marks a proposal accepted /
-- declined. Returns the updated row so the UI can re-render without a
-- second fetch. Raises if the proposal isn't accessible.
create or replace function public.respond_to_proposal(
  p_proposal_id uuid,
  p_response    text
)
returns public.proposals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.proposals;
begin
  if p_response not in ('accepted', 'declined') then
    raise exception 'Invalid response: %', p_response;
  end if;

  update public.proposals
  set
    status = p_response::public.proposal_status,
    responded_at = now()
  where id = p_proposal_id
    and (
      public.is_owner()
      or client_id in (
        select id from public.clients where profile_id = auth.uid()
      )
    )
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Proposal not found or access denied';
  end if;

  return v_row;
end;
$$;

-- 0008's ALTER DEFAULT PRIVILEGES already grants EXECUTE on new
-- functions to authenticated; explicit grants below for belt-and-suspenders.
grant execute on function public.mark_proposal_viewed(uuid)         to authenticated;
grant execute on function public.respond_to_proposal(uuid, text)    to authenticated;

----------------------------------------------------------------------
-- 4. Seed — Newgen Event Makers / Mohan
----------------------------------------------------------------------
-- Mohan's auth.users row was created via Supabase Auth; 0001's
-- on_auth_user_created trigger created the matching profiles row with
-- role='client' (the default). The two inserts below complete the chain:
-- a clients row and the proposal itself.
--
-- Both are guarded with ON CONFLICT so re-applying the migration on a
-- fresh environment doesn't fail and doesn't overwrite live data.

insert into public.clients (profile_id, company_name, contact_name, country, preferred_currency)
values (
  '42f77e83-1be6-4177-83e7-1ca2c5d3fc80',
  'Newgen Event Makers',
  'Mohan',
  'India',
  'INR'
)
on conflict (profile_id) do nothing;

insert into public.proposals (
  client_id,
  slug,
  title,
  content,
  total_min_cents,
  total_max_cents,
  currency,
  status,
  valid_until,
  sent_at
)
select
  c.id,
  'newgen-branding-2026',
  'Newgen Branding — Strategic Execution Plan',
  $json$
  {
    "situation_today": [
      "1,500+ events completed since 2018",
      "~200 Instagram followers despite 40-50 events/month",
      "Revenue gap: ₹15L vs ₹30L/month when systems not running",
      "Core problem: not quality — it is systems"
    ],
    "phases": [
      {
        "key": "foundation",
        "phase_num": 1,
        "name": "Foundation",
        "duration": "Month 1-2",
        "solutions": [
          {
            "num": "01",
            "title": "Brand Identity Design",
            "price_min_cents": 8500000,
            "price_max_cents": 12000000,
            "summary": "NG monogram + wordmark, colour system, typography, application proofs, all master files."
          },
          {
            "num": "02",
            "title": "Brand Guidelines Document",
            "price_min_cents": 5500000,
            "price_max_cents": 8000000,
            "summary": "40-55 page rulebook, PDF + Canva, tone of voice, Tamil/English caption framework."
          },
          {
            "num": "03",
            "title": "Business Profile PDF",
            "price_min_cents": 4500000,
            "price_max_cents": 6500000,
            "summary": "10 pages, replaces the 1-hour verbal pitch — credibility stats, portfolio."
          }
        ]
      },
      {
        "key": "visibility",
        "phase_num": 2,
        "name": "Visibility",
        "duration": "Month 2-4",
        "solutions": [
          {
            "num": "04",
            "title": "Social Media Branding + Workflow",
            "price_min_cents": 9000000,
            "price_max_cents": 13000000,
            "summary": "Capture → Triage → Produce → Publish → Amplify. Mohan's only new habit: a 15-minute evening triage."
          },
          {
            "num": "05",
            "title": "Website Design",
            "price_min_cents": 12000000,
            "price_max_cents": 18000000,
            "summary": "Lead-generation site, SEO built-in, WhatsApp CTA, Google Business Profile."
          }
        ]
      },
      {
        "key": "scale",
        "phase_num": 3,
        "name": "Scale",
        "duration": "Month 4-6",
        "solutions": [
          {
            "num": "06",
            "title": "SOP & Workflow Definition",
            "price_min_cents": 6500000,
            "price_max_cents": 9500000,
            "summary": "Field Execution + Customer Relationship + Business Operations — all three documented."
          },
          {
            "num": "07",
            "title": "CRM & Lead Automation",
            "price_min_cents": 7500000,
            "price_max_cents": 11000000,
            "summary": "500 leads per season, 300 never followed up today. Day 1 / 3 / 7 automatic follow-up."
          },
          {
            "num": "08",
            "title": "Personal Brand — Mohan as Founder",
            "price_min_cents": 6000000,
            "price_max_cents": 9000000,
            "summary": "Sketch-to-setup content series, LinkedIn presence, BNI deck."
          }
        ]
      }
    ],
    "how_we_work": {
      "discovery_session": "Completed",
      "advance": "50% to begin, balance on delivery",
      "first_concepts": "7 days",
      "revisions": "Max 2 cycles per solution",
      "concept_presentation_note": "Wife (co-owner) must be present at the concept presentation."
    },
    "discovery_status": "Pre-filled from transcript — 7 sections complete covering business, clients, brand soul, competitors, visual direction, practical details, and final thoughts.",
    "total_note": "Market reference. Budget to discuss. Phased investment possible."
  }
  $json$::jsonb,
  57500000,   -- ₹5.75L
  84500000,   -- ₹8.45L
  'INR',
  'sent',
  current_date + interval '30 days',
  now()
from public.clients c
where c.profile_id = '42f77e83-1be6-4177-83e7-1ca2c5d3fc80'
on conflict (slug) do nothing;
