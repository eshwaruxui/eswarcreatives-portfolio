-- Migration 0071: proposal public token + proposal_nudge_log
-- Apply manually in Supabase SQL Editor.

-- 1. Extend proposals table with public token + nudge tracking columns.
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS public_token            uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS public_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_nudge_sent_at      timestamptz,
  ADD COLUMN IF NOT EXISTS nudge_count             integer DEFAULT 0;

-- Unique index so token lookups are fast and collision-proof.
CREATE UNIQUE INDEX IF NOT EXISTS proposals_public_token_idx ON proposals (public_token);

-- 2. proposal_nudge_log: one row per reminder sent.
CREATE TABLE IF NOT EXISTS proposal_nudge_log (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id     uuid        NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  sent_at         timestamptz NOT NULL DEFAULT now(),
  channel         text        NOT NULL CHECK (channel IN ('whatsapp', 'email')),
  message_preview text,
  sent_by         uuid        REFERENCES profiles(id)
);

-- RLS: only admins (via is_admin() SECURITY DEFINER) have full access.
ALTER TABLE proposal_nudge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on proposal_nudge_log"
  ON proposal_nudge_log
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 3. SECURITY DEFINER RPC callable by anon — returns proposal + related data
--    for a valid, non-expired public token. Returns NULL when expired or not found.
CREATE OR REPLACE FUNCTION get_proposal_by_token(token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal_id uuid;
  v_result      jsonb;
BEGIN
  -- Validate token; reject if missing, expired, or pointing to a deleted row.
  SELECT id INTO v_proposal_id
  FROM proposals
  WHERE public_token = token
    AND public_token_expires_at > now()
  LIMIT 1;

  IF v_proposal_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'proposal', row_to_json(p)::jsonb,
    'phases',   COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',             ph.id,
            'phase_number',   ph.phase_number,
            'title',          ph.title,
            'solution_title', ph.solution_title,
            'key_note',       ph.key_note,
            'timeline',       ph.timeline
          )
          ORDER BY ph.phase_number
        )
        FROM proposal_phases ph
        WHERE ph.proposal_id = v_proposal_id
      ),
      '[]'::jsonb
    ),
    'line_items', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',     li.id,
            'title',  li.title,
            'amount', li.amount,
            'solution_title', li.solution_title
          )
          ORDER BY li.sort_order
        )
        FROM proposal_line_items li
        WHERE li.proposal_id = v_proposal_id
      ),
      '[]'::jsonb
    ),
    'payment_schedule', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id',                ps.id,
            'instalment_number', ps.instalment_number,
            'label',             ps.label,
            'pct_of_total',      ps.pct_of_total
          )
          ORDER BY ps.instalment_number
        )
        FROM proposal_payment_schedule ps
        WHERE ps.proposal_id = v_proposal_id
      ),
      '[]'::jsonb
    )
  )
  INTO v_result
  FROM proposals p
  WHERE p.id = v_proposal_id;

  RETURN v_result;
END;
$$;

-- Grant anon + authenticated execution so the public page can call this without a session.
GRANT EXECUTE ON FUNCTION get_proposal_by_token(uuid) TO anon, authenticated;
