-- 0063_mockup_concept_not_selected.sql
-- Adds the "Not selected" concept decision and an "awaiting" reset marker to the
-- mockup_feedback decision vocabulary.
--
-- The concept decision is not a status column: it is derived "latest wins" from
-- this client's concept-level mockup_feedback rows. To stay append-only (and
-- avoid granting clients DELETE), "Change decision" inserts a 'concept_awaiting'
-- marker whose presence as the latest row resets the concept to awaiting_review.
--
-- Existing values were ('concept_approval','concept_rejection','item_comment').
-- RLS is unchanged: the existing client insert-own / read-own and admin-all
-- policies already cover the new feedback_type values.

alter table public.mockup_feedback
  drop constraint if exists mockup_feedback_feedback_type_check;

alter table public.mockup_feedback
  add constraint mockup_feedback_feedback_type_check
  check (feedback_type in (
    'concept_approval',
    'concept_rejection',
    'concept_not_selected',
    'concept_awaiting',
    'item_comment'
  ));
