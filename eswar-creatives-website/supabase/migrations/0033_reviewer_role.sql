-- Phase 5 / 0033 — reviewer role
-- Adds the 'reviewer' label to the existing user_role enum
-- ('owner','client','admin'). Kept in its own migration/transaction because
-- Postgres forbids using a freshly-added enum label as a literal in the same
-- transaction it was added (see 0013 for the same constraint with 'admin').
alter type public.user_role add value if not exists 'reviewer';
