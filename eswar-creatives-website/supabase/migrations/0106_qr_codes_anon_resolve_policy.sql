-- 0106_qr_codes_anon_resolve_policy.sql
-- Found live while smoke-testing the QR redirect on the preview deploy:
-- functions/qr/[slug].js resolves a scan by hitting the REST endpoint
-- directly with the anon key (not a SECURITY DEFINER RPC, unlike every
-- other public-token surface in this app -- get_invoice_by_token,
-- get_brand_visual_items_by_client_token, etc., which bypass RLS by
-- design). A direct REST call is still subject to RLS, and 0105
-- deliberately added no anon policy on qr_codes, reasoning "public access
-- goes through the edge function" -- true for those RPC-based surfaces, but
-- not for this one, which has no RPC layer to bypass RLS through. Every
-- real scan returned "QR code not found or inactive" as a result, for
-- every slug, regardless of is_active.
--
-- Unlike invoice/proposal/output tokens (meant to be unguessable secrets),
-- a QR slug is not a secret: it is printed on physical media specifically
-- so it can be read and resolved by anyone who scans it. Row-level anon
-- access scoped to is_active = true is therefore the correct model here,
-- not a security regression -- and the function only ever selects
-- id, destination_url (see its own select= query param), so this policy
-- widening rows, not columns, doesn't expose label/client_id/use_case/
-- medium to the anon resolve path in practice either.

drop policy if exists anon_resolve_active_qr_codes on public.qr_codes;
create policy anon_resolve_active_qr_codes on public.qr_codes
  for select to anon
  using (is_active = true);
