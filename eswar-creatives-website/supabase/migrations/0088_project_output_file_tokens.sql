-- 0088_project_output_file_tokens.sql
-- Public share-link RPCs for Outputs files, mirroring the invoice pattern
-- (0068 get_invoice_by_token, 0074 regenerate_invoice_token) exactly.
-- These RPCs return metadata only -- Postgres cannot mint a Storage signed
-- URL (that's a Storage-API call, not SQL). The public share page calls
-- get_output_file_by_token for metadata, then a separate edge function
-- (get-output-file-url) for the actual signed download URL.

----------------------------------------------------------------------
-- 1. Fetch one output file's metadata by public token. Returns null
--    when the token is not found or has expired.
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_output_file_by_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_file public.project_output_files%rowtype;
BEGIN
  SELECT * INTO v_file
    FROM public.project_output_files
   WHERE public_token = p_token
     AND (public_token_expires_at IS NULL OR public_token_expires_at > NOW());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id',          v_file.id,
    'file_name',   v_file.file_name,
    'file_size',   v_file.file_size,
    'file_type',   v_file.file_type,
    'uploaded_at', v_file.uploaded_at
  );
END;
$$;

-- The unauthenticated (anon) role calls this directly from the public
-- /output/:token page. The function enforces the token + expiry check
-- server-side; no other output-file rows are reachable through it.
GRANT EXECUTE ON FUNCTION public.get_output_file_by_token(uuid) TO anon;

----------------------------------------------------------------------
-- 2. Admin-only RPC: rotate public_token + expiry for a single output
--    file. Returns the new token as text, mirroring
--    regenerate_invoice_token exactly.
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.regenerate_output_file_token(p_output_file_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_token uuid := gen_random_uuid();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'NOT_AUTHORIZED';
  END IF;

  UPDATE public.project_output_files
     SET public_token             = v_new_token,
         public_token_expires_at  = NOW() + INTERVAL '30 days'
   WHERE id = p_output_file_id;

  RETURN v_new_token::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.regenerate_output_file_token(uuid) TO authenticated;
