-- Migration 0089: expand leads.segment to finer-grained verticals
--
-- leads.segment has never been an auto-classifier — it's a manually-set field
-- (radio picker in AddLeadModal, hardcoded default elsewhere) that only ever
-- allowed 'security_ai' | 'saas_product'. Because every CSV import and every
-- other insert path falls back to 'saas_product' when nothing more specific
-- applies, nearly every lead ends up tagged the same way, which reads exactly
-- like an over-eager auto-classifier even though it isn't one. This migration
-- widens the allowed set so an admin can manually reclassify any lead into a
-- more specific vertical from the Leads table or the lead drawer.
--
-- Both original values stay valid — every existing insert path that still
-- writes 'security_ai' or 'saas_product' (CsvImportModal fallback,
-- NewShortlistModal, EnquiryDrawer, CandidateCard) keeps working unchanged.
-- The 7 new values are additive, not a replacement.
alter table leads
  drop constraint leads_segment_check;
alter table leads
  add constraint leads_segment_check
  check (segment in (
    'security_ai', 'saas_product',
    'aiml', 'fintech', 'healthtech', 'dev_tools', 'hr_tech', 'workflow_heavy_saas'
  ));
