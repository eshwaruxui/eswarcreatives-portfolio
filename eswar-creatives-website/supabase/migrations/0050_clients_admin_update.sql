-- Phase 5 / 0050 — admin UPDATE policy on clients
-- The manage-client right-side panel lets admins inline-edit client fields
-- (company, contact, founder, whatsapp, country, currency). Owners already write
-- via owner_all_clients; admins previously had SELECT only. Add an admin UPDATE
-- policy using is_admin() (SECURITY DEFINER), matching the project's RLS
-- convention. with check mirrors using so an admin cannot move a row out of view.
drop policy if exists "Admin updates clients" on public.clients;
create policy "Admin updates clients" on public.clients
  for update using (public.is_admin()) with check (public.is_admin());
