-- Phase 5 / 0054 — clients read their own logo-sketch submissions (6e)
-- The client campaigns page shows a submission history. Clients could already
-- insert and update their submissions but had no SELECT policy (only admins
-- could read them), so add one scoped to their own rows.
-- logo_sketch_submissions.client_id is the auth user id (auth.uid()).
drop policy if exists "Clients read own submissions" on public.logo_sketch_submissions;
create policy "Clients read own submissions" on public.logo_sketch_submissions
  for select using (client_id = auth.uid());
