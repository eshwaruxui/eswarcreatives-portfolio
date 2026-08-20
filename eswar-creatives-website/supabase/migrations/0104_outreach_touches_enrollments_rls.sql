-- 0104_outreach_touches_enrollments_rls.sql
-- Migration 0100 added owner_id to outreach_touches but never added an RLS
-- policy granting outreach_user access to it - only outreach_touches_admin_all
-- (admin-only, from 0072) exists. Found while building OutreachActivityPage:
-- as-is, that page's query would return zero rows for every outreach_user,
-- always, regardless of their real data.
--
-- lead_enrollments has the same gap (only lead_enrollments_admin_all), needed
-- for the Sequences page's "leads enrolled" count and for joining touches to
-- their sequence name. It has no owner_id column (out of scope to add here,
-- not needed) - ownership is derived through the enrollment's lead instead.
--
-- Both additive: existing admin policies are untouched.

create policy "outreach_user reads own touches"
  on outreach_touches for select
  to authenticated
  using (
    owner_id = auth.uid()
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'outreach_user'
    )
  );

create policy "outreach_user reads own enrollments"
  on lead_enrollments for select
  to authenticated
  using (
    exists (
      select 1 from leads
      where leads.id = lead_enrollments.lead_id
      and leads.owner_id = auth.uid()
    )
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'outreach_user'
    )
  );
