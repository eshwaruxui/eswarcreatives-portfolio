-- Migration 0093: columns for the full Resend webhook event set
--
-- resend-outreach-webhook only ever handled email.bounced and email.opened,
-- and outreach_touches only had the two columns those needed (bounced_at,
-- opened_at). Widening the handler to the rest of Resend's real email events
-- needs somewhere to put them.
--
-- Every column here is nullable with no default and no backfill. Rows that
-- predate the webhook going live stay NULL, which reads correctly as "no
-- event was ever received for this touch" rather than as a false zero.

-- Per-touch delivery telemetry.
alter table outreach_touches
  add column if not exists delivered_at   timestamptz,
  add column if not exists clicked_at     timestamptz,
  add column if not exists complained_at  timestamptz,
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists bounce_type    text;

-- bounce_type stores Resend's `data.bounce.type` verbatim ('Permanent',
-- 'Transient', 'Undetermined'). It exists so the hard/soft decision the
-- handler makes is auditable after the fact: only a Permanent bounce
-- suppresses a lead, and without this column there is no way to tell a
-- soft bounce that was correctly ignored from an event never received.
comment on column outreach_touches.bounce_type is
  'Resend data.bounce.type verbatim. Permanent = hard bounce (suppresses the lead), Transient/Undetermined = soft (logged, never suppresses).';

-- Lead-level suppression timestamps. These answer "when and why did this
-- lead stop being contactable", which suppression_list alone cannot: it is
-- keyed by email and holds one reason, so a lead that both bounced and later
-- complained would lose the first signal.
alter table leads
  add column if not exists bounced_at      timestamptz,
  add column if not exists complained_at   timestamptz,
  add column if not exists unsubscribed_at timestamptz;

-- leads.unsubscribed_at is deliberately NOT written by the webhook.
-- Resend has no email.unsubscribed event (verified against Resend's event
-- type list, Aug 2026: the email.* events are sent, delivered,
-- delivery_delayed, opened, clicked, bounced, complained, failed, received,
-- scheduled, suppressed). Unsubscribes in this system arrive through the
-- portal's own /unsubscribe/:token page and the unsubscribe_by_token RPC
-- from migration 0072. The column lives here so that path has somewhere to
-- record a timestamp when it is next touched, and so the three lead-level
-- suppression reasons stay symmetrical.
comment on column leads.unsubscribed_at is
  'Set by the portal unsubscribe flow (unsubscribe_by_token), not by the Resend webhook. Resend emits no email.unsubscribed event.';

-- A spam complaint is not an unsubscribe and must stay distinguishable from
-- one in the suppression list. The existing check allowed only unsubscribed,
-- hard_bounce and manual, so the complaint path had no honest reason to
-- write and would have had to masquerade as one of those.
alter table suppression_list
  drop constraint if exists suppression_list_reason_check;

alter table suppression_list
  add constraint suppression_list_reason_check
  check (reason = any (array['unsubscribed', 'hard_bounce', 'complaint', 'manual']));

-- Every webhook event looks a touch up by resend_message_id and there was no
-- index on it, only the primary key on id. That is a sequential scan per
-- event, and Resend sends up to six events per email (sent, delivered,
-- opened, clicked, and possibly bounced or complained), so the read volume
-- is a multiple of the send volume rather than equal to it.
-- Partial, because the column is null for touches that never reached Resend.
create index if not exists outreach_touches_resend_message_id_idx
  on outreach_touches (resend_message_id)
  where resend_message_id is not null;
