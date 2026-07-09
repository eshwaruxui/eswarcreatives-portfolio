-- Migration 0072c: fix Email B step 1 capitalisation and add linkedin_visitor source.
-- Apply manually in Supabase SQL Editor. Preview SELECTs are in comments below.

-- PREVIEW:
-- SELECT id, substring(body_template, 1, 40) AS body_start
-- FROM sequence_steps
-- WHERE sequence_id = (SELECT id FROM sequences WHERE name = 'Email B: SaaS Product')
--   AND step_number = 1;
--
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
-- WHERE conrelid = 'leads'::regclass AND contype = 'c' AND conname LIKE '%source%';

-- a. Fix Email B SaaS Product Step 1: capitalise leading 'i design' -> 'I design'
UPDATE sequence_steps
SET body_template = 'I' || substring(body_template FROM 2)
WHERE step_number = 1
  AND body_template LIKE 'i design%'
  AND sequence_id = (SELECT id FROM sequences WHERE name = 'Email B: SaaS Product');

-- b. Add linkedin_visitor to leads.source check constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_source_check;
ALTER TABLE leads
  ADD CONSTRAINT leads_source_check
  CHECK (source IN ('manual', 'csv', 'apollo', 'linkedin', 'referral', 'linkedin_visitor'));
