-- Part 1: Fix get_upcoming_linkedin_week() so "This Week's Posts" stays
-- pinned to the actual current week (Monday through Friday) instead of
-- jumping forward to next week the moment it turns Tuesday. Weekend
-- behavior (Saturday/Sunday -> next Monday) is unchanged, since there's
-- nothing left to plan for "this week" once it's over — that's also what
-- the Sunday pg_cron reminder relies on.
CREATE OR REPLACE FUNCTION get_upcoming_linkedin_week()
RETURNS TABLE(monday date, wednesday date, friday date) AS $$
DECLARE
  today date := CURRENT_DATE;
  dow int := EXTRACT(DOW FROM today);
  ref_mon date;
BEGIN
  IF dow BETWEEN 1 AND 5 THEN
    -- Monday(1)..Friday(5): pin to this week's Monday.
    ref_mon := today - (dow - 1);
  ELSE
    -- Saturday(6)/Sunday(0): roll forward to next week's Monday.
    ref_mon := today + ((8 - dow) % 7);
  END IF;
  monday    := ref_mon;
  wednesday := ref_mon + 2;
  friday    := ref_mon + 4;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Part 2: Support draft posts — an idea saved before it's assigned to a
-- specific Mon/Wed/Fri slot. scheduled_for becomes nullable, and a new
-- 'draft' status is added to the allowed set.
ALTER TABLE linkedin_posts ALTER COLUMN scheduled_for DROP NOT NULL;

-- Drop the existing status CHECK constraint by discovering its real name
-- (Postgres auto-names an inline column CHECK, so we don't hardcode a guess
-- that might not match what got generated when the table was created).
DO $$
DECLARE
  con_name text;
BEGIN
  SELECT con.conname INTO con_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'linkedin_posts'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%status%'
    AND pg_get_constraintdef(con.oid) ILIKE '%pending%';
  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE linkedin_posts DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

ALTER TABLE linkedin_posts ADD CONSTRAINT linkedin_posts_status_check
  CHECK (status IN ('pending','published','failed','draft'));

-- Invariant: only a draft may have a null scheduled_for. Every pending,
-- published, or failed row must still carry a real date — every date-based
-- query in the app (slot grid, pending, history, week grouping) assumes
-- that holds.
ALTER TABLE linkedin_posts DROP CONSTRAINT IF EXISTS linkedin_posts_draft_scheduled_for_check;
ALTER TABLE linkedin_posts ADD CONSTRAINT linkedin_posts_draft_scheduled_for_check
  CHECK (status = 'draft' OR scheduled_for IS NOT NULL);
