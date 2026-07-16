-- Migration 0078: follow-up date and draft message fields on leads

-- ── leads: manual follow-up reminder ─────────────────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_date date;

-- ── leads: draft message staged for the next manual send ─────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS draft_message text;
