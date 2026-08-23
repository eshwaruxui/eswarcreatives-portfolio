-- 0108_qr_scans_anon_log_policy.sql
-- Same class of gap as 0106/0107, on the write side this time: the redirect
-- itself worked once qr_codes had an anon SELECT policy + GRANT, but the
-- fire-and-forget scan log to qr_scans still silently failed -- confirmed
-- directly (curl POST as anon returned 42501 "permission denied for table
-- qr_scans", hint: GRANT INSERT ON public.qr_scans TO anon). No row had
-- landed after a real redirect that visibly succeeded.
--
-- WITH CHECK is scoped to qr_code_id referencing a currently active code,
-- mirroring the same is_active filter the resolve query itself uses in
-- functions/qr/[slug].js, so a scan can't be logged against a code that
-- shouldn't be resolvable in the first place (deactivated or deleted).

drop policy if exists anon_log_qr_scans on public.qr_scans;
create policy anon_log_qr_scans on public.qr_scans
  for insert to anon
  with check (
    qr_code_id in (select id from public.qr_codes where is_active = true)
  );

grant insert on public.qr_scans to anon;
