-- 0098_brand_visual_public_listing_attachments.sql
-- Extends get_brand_visual_items_by_client_token (0095) so the public
-- listing includes each item's attachment metadata inline, not just the
-- item row itself. The public detail panel needs to know what attachments
-- exist and their public_tokens before it can lazily resolve each one's
-- signed URL (same pattern the item's own storage_path already follows) --
-- without this, the public route would need a second round-trip per item
-- just to discover what's attached, which nothing else in this feature
-- does.
--
-- CREATE OR REPLACE, not a new function: same signature, same anon grant
-- (already in place from 0095, untouched here), same NULL-if-token-not-found
-- contract. Only the shape of each item's own jsonb object changes -- it
-- gains an `attachments` key, defaulting to `[]` for an item with none.

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

  SELECT COALESCE(
           jsonb_agg(
             to_jsonb(bvi) || jsonb_build_object('attachments', COALESCE(att.attachments, '[]'::jsonb))
             ORDER BY bvi.category, bvi.group_label, bvi.sort_order
           ),
           '[]'::jsonb
         )
    INTO v_items
    FROM public.brand_visual_items bvi
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(to_jsonb(a) ORDER BY a.sort_order) AS attachments
        FROM public.brand_visual_item_attachments a
       WHERE a.item_id = bvi.id
    ) att ON true
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

-- Grant already exists from 0095 (CREATE OR REPLACE preserves it), restated
-- here only so this migration is self-contained if ever read on its own.
GRANT EXECUTE ON FUNCTION public.get_brand_visual_items_by_client_token(uuid) TO anon;
