-- Migration 0091: remove the outreach-skills bucket's MIME allow-list
--
-- .skill files have no registered MIME type, so different tools/OSes report
-- wildly different guesses for the same file — confirmed live: macOS reported
-- one as 'application/vnd.openai.codex.skill' (a vendor-invented type from
-- whatever tool last touched it), which obviously can't be predicted or
-- added to any hardcoded allow-list. Real validation for this bucket already
-- happens content-based, not MIME-based: process-skill-upload actually
-- attempts to unzip the file with JSZip and rejects it if that fails, which
-- is a far more reliable gate than trusting a client-reported MIME string.
-- Already applied directly to the live project during debugging; this
-- migration exists so a fresh environment ends up in the same state.
update storage.buckets
set allowed_mime_types = null
where id = 'outreach-skills';
