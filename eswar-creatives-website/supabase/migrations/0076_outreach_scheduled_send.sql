-- Extend outreach_touches with scheduling fields
ALTER TABLE outreach_touches
  ADD COLUMN IF NOT EXISTS recipient_timezone text,
  ADD COLUMN IF NOT EXISTS draft_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS draft_confirmed_by uuid REFERENCES auth.users(id);

-- Extend status check constraint to include 'scheduled'
-- (Note: 'scheduled' may already exist from migration 0072; guard with IF EXISTS)
ALTER TABLE outreach_touches
  DROP CONSTRAINT IF EXISTS outreach_touches_status_check;

ALTER TABLE outreach_touches
  ADD CONSTRAINT outreach_touches_status_check
  CHECK (status IN ('pending','sent','failed','skipped','scheduled','cancelled'));

-- LinkedIn posts table
CREATE TABLE IF NOT EXISTS linkedin_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  scheduled_for timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','published','failed')),
  published_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE linkedin_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access linkedin_posts"
  ON linkedin_posts FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Helper RPC: returns Mon/Wed/Fri dates for the upcoming week
CREATE OR REPLACE FUNCTION get_upcoming_linkedin_week()
RETURNS TABLE(monday date, wednesday date, friday date) AS $$
DECLARE
  today date := CURRENT_DATE;
  dow int := EXTRACT(DOW FROM today);
  next_mon date;
BEGIN
  next_mon := today + ((8 - dow) % 7);
  IF dow = 1 THEN next_mon := today; END IF;
  monday    := next_mon;
  wednesday := next_mon + 2;
  friday    := next_mon + 4;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- pg_cron weekly LinkedIn reminder (requires pg_cron + pg_net extensions).
-- If not enabled: Database > Extensions > enable pg_cron and pg_net first.
-- The SELECT below is wrapped so the migration succeeds even if pg_cron is absent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'linkedin-weekly-reminder',
      '30 12 * * 0',
      $$
      SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-linkedin-reminder',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.service_role_key')
        ),
        body := '{}'::jsonb
      );
      $$
    );
  END IF;
END;
$$;
