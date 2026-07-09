-- Migration 0073: phone fields on leads, cancelled status on enrollments, reply_messages table

-- ── leads: phone fields ───────────────────────────────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_business text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_personal text;

-- ── lead_enrollments: add 'cancelled' to status constraint ───────────────────
-- Keep 'stopped' (used by mark_lead_replied RPC) and add 'cancelled'.
ALTER TABLE lead_enrollments DROP CONSTRAINT lead_enrollments_status_check;
ALTER TABLE lead_enrollments ADD CONSTRAINT lead_enrollments_status_check
  CHECK (status = ANY (ARRAY['active','paused','completed','stopped','cancelled']));

-- ── reply_messages ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reply_messages (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id   uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  body      text NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  logged_by uuid REFERENCES auth.users(id)
);

ALTER TABLE reply_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reply_messages_admin_all" ON reply_messages
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
