-- Migration 0083: carry ICP score from Smart Shortlist onto the lead row.
--
-- shortlist_candidates already stores icp_score (int, 0-100) and
-- icp_match_reason (text) from the LLM scoring pass in process-shortlist-run.
-- When a candidate is converted to a lead (CandidateCard.handleConfirmAdd),
-- that score is currently dropped -- leads has no column to receive it, so
-- every lead shows as "not scored" even when Smart Shortlist already scored
-- the person pre-conversion.
--
-- This adds the same two columns to leads, so the conversion insert can copy
-- them over and LeadDrawer's ICP score ring has real data to show.

alter table leads
  add column if not exists icp_score int check (icp_score between 0 and 100),
  add column if not exists icp_match_reason text;
