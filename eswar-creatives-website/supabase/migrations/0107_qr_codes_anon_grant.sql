-- 0107_qr_codes_anon_grant.sql
-- Found live immediately after 0106: the anon RLS policy alone was not
-- enough. Postgres requires the base table privilege before RLS is even
-- evaluated -- a curl test against PostgREST with the anon key returned
-- "permission denied for table qr_codes" (42501), with Postgres's own hint
-- naming the exact fix. This is precisely why every other public surface in
-- this app (project_output_files, brand_visual_items, invoices, proposals)
-- routes through a SECURITY DEFINER RPC or a service-role edge function
-- instead of a direct anon REST query: those bypass the anon role, and
-- therefore this GRANT, entirely. functions/qr/[slug].js is the first
-- surface in this app to query a table directly with the anon key, so it's
-- the first to actually need this statement.

grant select on public.qr_codes to anon;
