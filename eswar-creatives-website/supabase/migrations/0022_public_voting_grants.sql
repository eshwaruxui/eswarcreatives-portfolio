-- Phase 3 / 0022 — table grants for anonymous public voting.
-- RLS policies (0019-0021) gate which rows the anon role may touch, but the role
-- still needs table-level privileges or PostgREST returns "permission denied"
-- for unauthenticated requests. Grant anon exactly what the voter flow needs:
-- read the active campaign + its sets, and insert votes. RLS keeps these scoped
-- (campaigns/sets are visible only while active; votes are insert-only for anon,
-- never readable). Storage reads already work via the public logo-sketches
-- bucket policy (0016).

grant select on public.public_campaigns to anon;
grant select on public.logo_sketch_sets to anon;
grant insert on public.public_votes      to anon;
