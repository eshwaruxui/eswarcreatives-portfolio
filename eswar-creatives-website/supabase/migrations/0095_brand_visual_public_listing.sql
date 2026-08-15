-- 0095_brand_visual_public_listing.sql
-- Public listing RPC for the Brand Visual Guide public route (/brand/:token).
-- Not anticipated by migration 0094 alone: get-brand-visual-file-url (built
-- alongside this) mints a signed URL for one item's file, mirroring
-- get-output-file-url exactly, but the public page browses a WHOLE client's
-- published-and-public library across three category tabs, not one file.
-- That needs a listing RPC the same way get_invoice_by_token/
-- get_output_file_by_token supply metadata Postgres can hand to an anon
-- caller directly (no Storage call involved here, so no edge function
-- needed for this half).

CREATE OR REPLACE FUNCTION public.get_brand_visual_items_by_client_token(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client public.clients%rowtype;
  v_items  jsonb;
BEGIN
  SELECT * INTO v_client FROM public.clients WHERE public_token = p_token;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(bvi) ORDER BY bvi.category, bvi.group_label, bvi.sort_order), '[]'::jsonb)
    INTO v_items
    FROM public.brand_visual_items bvi
   WHERE bvi.client_id = v_client.id
     AND bvi.status = 'published'
     AND bvi.visibility = 'public';

  RETURN jsonb_build_object(
    'company_name', v_client.company_name,
    'contact_name', v_client.contact_name,
    'items', v_items
  );
END;
$$;

-- Anon-callable from the public /brand/:token page. Only published,
-- public-visibility items for the token's own client are ever reachable
-- through this function -- draft, admin_only and client-only rows are
-- filtered server-side and never leave the database.
GRANT EXECUTE ON FUNCTION public.get_brand_visual_items_by_client_token(uuid) TO anon;
