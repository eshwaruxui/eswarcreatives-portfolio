-- 0056 — admin_delete_client(): atomic hard-delete of a client and all of its
-- data. Invoked only by the admin-delete-client edge function (service role)
-- after it has verified the caller is an owner/admin and the user has confirmed
-- the deletion in the manage-client panel.
--
-- All work runs in one transaction (a single plpgsql call), so a failure on any
-- step rolls the whole thing back — there is no partial delete.
--
-- FK-safe order (children before parents). Most descendant rows clear via their
-- own ON DELETE CASCADE; the explicit deletes below are the ones whose FKs are
-- RESTRICT / NO ACTION and would otherwise block the delete:
--   * payments  -> orders, quotes  (RESTRICT): cleared first, scoped through the
--       client's orders — payments carries no client_id of its own.
--   * invoices  -> projects         (RESTRICT): cleared before projects.
--   * projects  -> orders, clients  (RESTRICT): cleared before orders
--       (cascades project_phases, assets, decision_log, time_entries,
--        timeline_extensions).
--   * orders    -> clients          (RESTRICT): cleared before the client row
--       (cascades quotes + questionnaire_responses).
--   * proposals -> clients          (cascades its documents, line items and
--       payment schedule).
--   * review_campaigns.client_id    (NO ACTION, nullable): detached rather than
--       deleted, so a shared/public campaign record survives without the client.
-- client_notifications.client_id is ON DELETE CASCADE and clears automatically.
--
-- Does NOT touch the auth user (auth.users) or its profiles row: the edge
-- function returns the login so an admin can remove it manually in the
-- Supabase dashboard. This keeps a deliberate human gate on auth deletion.

create or replace function public.admin_delete_client(p_client_id uuid)
returns void
language plpgsql
as $$
begin
  -- 1. Payments for this client's orders (RESTRICT on orders & quotes).
  delete from public.payments
   where order_id in (select id from public.orders where client_id = p_client_id);

  -- 2. Invoices (RESTRICT on projects) — must precede projects.
  delete from public.invoices where client_id = p_client_id;

  -- 3. Projects (cascades phases, assets, decision_log, time_entries, extensions).
  delete from public.projects where client_id = p_client_id;

  -- 4. Orders (cascades quotes + questionnaire_responses).
  delete from public.orders where client_id = p_client_id;

  -- 5. Proposals (cascades documents, line items, payment schedule).
  delete from public.proposals where client_id = p_client_id;

  -- 6. Detach review campaigns so the clients delete is not blocked (NO ACTION).
  update public.review_campaigns set client_id = null where client_id = p_client_id;

  -- 7. The client row itself (client_notifications cascade away).
  delete from public.clients where id = p_client_id;
end;
$$;

-- Lock the function down: never reachable by a logged-in client/admin via
-- PostgREST. Only the service_role (the edge function) may execute it.
revoke all on function public.admin_delete_client(uuid) from public;
revoke all on function public.admin_delete_client(uuid) from authenticated;
grant execute on function public.admin_delete_client(uuid) to service_role;
