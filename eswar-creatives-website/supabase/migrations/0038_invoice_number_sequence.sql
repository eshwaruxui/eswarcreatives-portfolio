-- Phase 5 / 0038 — invoice number sequence
-- Moves invoice numbering onto a real sequence so concurrent inserts cannot
-- collide. Starts at 105 (existing invoices are EC-I-2026-001/002; 105 leaves a
-- clean gap for manual/legacy numbers). The column default becomes the single
-- source of truth: callers that omit invoice_number get the next EC-I-YYYY-NNN.
create sequence if not exists invoice_number_seq start 105;

alter table public.invoices alter column invoice_number
set default 'EC-I-' || to_char(now(), 'YYYY') || '-' ||
lpad(nextval('invoice_number_seq')::text, 3, '0');
