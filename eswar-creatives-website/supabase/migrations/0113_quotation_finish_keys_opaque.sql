----------------------------------------------------------------------
-- 0113 — Opaque finish keys, and the colour-variant rule as data.
--
-- WHY
--
-- quotation_finish_levels.key shipped in 0112 as 'real_100', 'real_60_40',
-- 'real_50_50', 'real_30_70', 'readymade'. Those keys reach the admin
-- builder's DOM as <option value="…"> on the finish selector.
--
-- That does not breach 0112's stated rule — the rule is about the CLIENT
-- document, and the public page still never sees a key at all
-- (get_quotation_by_token strips them and returns labels). But the builder
-- is screen-shared to clients on calls, and 'real_30_70' spells out the
-- internal fresh-to-artificial ratio in plain text. A client watching their
-- own quotation being built should not be able to recover the ratio behind
-- the price from the markup.
--
-- So the keys become opaque with respect to the ratio. They are slugs of
-- the client-facing labels, which the client already reads on the document,
-- and therefore disclose nothing new. The labels themselves are unchanged.
--
--   real_100    -> full_fresh
--   real_60_40  -> fresh_led
--   real_50_50  -> balanced
--   real_30_70  -> fresh_accents
--   readymade   -> ready_made
--
-- internal_code ('100', '6040', '5050', '307', 'RM') is deliberately left
-- alone. It is the operator's own shorthand, no surface selects it (the
-- builder names its columns explicitly and the RPC never touches it), so it
-- reaches no DOM. Renaming it would destroy the one thing it is for. Worth
-- a decision if that shorthand is ever surfaced.
--
-- NOT TOUCHED, despite the similar name: quotations.readymade_variant, the
-- with-red / without-red colour choice. Different column, different purpose,
-- carries no ratio.
--
-- Idempotent: the rename is scoped to the five old keys, the column add is
-- IF NOT EXISTS, and the has_colour_variant backfill targets the new key.
-- Re-running this file after it has succeeded is a no-op.
----------------------------------------------------------------------

begin;

-- 1. The two FKs were created without an update action, so a plain rename of
--    the primary key would be rejected. Recreate them with ON UPDATE
--    CASCADE, which both allows this rename and leaves the constraints
--    permanently safe for the next one.
alter table public.quotations
  drop constraint if exists quotations_reception_finish_key_fkey,
  drop constraint if exists quotations_muhurtham_finish_key_fkey;

alter table public.quotations
  add constraint quotations_reception_finish_key_fkey
    foreign key (reception_finish_key)
    references public.quotation_finish_levels(key) on update cascade,
  add constraint quotations_muhurtham_finish_key_fkey
    foreign key (muhurtham_finish_key)
    references public.quotation_finish_levels(key) on update cascade;

-- 2. Rename the keys. Stored quotations follow via the cascade above, so no
--    quotation loses its finish and none needs a second update statement.
update public.quotation_finish_levels
   set key = case key
     when 'real_100'   then 'full_fresh'
     when 'real_60_40' then 'fresh_led'
     when 'real_50_50' then 'balanced'
     when 'real_30_70' then 'fresh_accents'
     when 'readymade'  then 'ready_made'
     else key
   end
 where key in ('real_100', 'real_60_40', 'real_50_50', 'real_30_70', 'readymade');

-- 3. The "which finish offers a colour choice" rule, as data.
--
--    The builder decided whether to show the with-red / without-red select
--    by comparing the active finish key to the literal 'readymade'. That is
--    a tenant's vocabulary hardcoded into shared builder code — exactly what
--    quotation_systems.scales_with_finish exists to avoid for the floral
--    rule. Same treatment: a column, so the builder names no finish.
alter table public.quotation_finish_levels
  add column if not exists has_colour_variant boolean not null default false;

update public.quotation_finish_levels
   set has_colour_variant = true
 where key = 'ready_made';

notify pgrst, 'reload schema';

commit;


----------------------------------------------------------------------
-- ROLLBACK — a true inverse, including restoring the FKs to their
-- original no-update-action form. Run as one block.
--
-- Order matters: the keys must be renamed back while the ON UPDATE CASCADE
-- is still in place, otherwise the rename is rejected exactly as it would
-- have been before step 1.
----------------------------------------------------------------------
-- begin;
--
-- update public.quotation_finish_levels
--    set key = case key
--      when 'full_fresh'    then 'real_100'
--      when 'fresh_led'     then 'real_60_40'
--      when 'balanced'      then 'real_50_50'
--      when 'fresh_accents' then 'real_30_70'
--      when 'ready_made'    then 'readymade'
--      else key
--    end
--  where key in ('full_fresh', 'fresh_led', 'balanced', 'fresh_accents', 'ready_made');
--
-- alter table public.quotations
--   drop constraint if exists quotations_reception_finish_key_fkey,
--   drop constraint if exists quotations_muhurtham_finish_key_fkey;
--
-- alter table public.quotations
--   add constraint quotations_reception_finish_key_fkey
--     foreign key (reception_finish_key)
--     references public.quotation_finish_levels(key),
--   add constraint quotations_muhurtham_finish_key_fkey
--     foreign key (muhurtham_finish_key)
--     references public.quotation_finish_levels(key);
--
-- alter table public.quotation_finish_levels
--   drop column if exists has_colour_variant;
--
-- notify pgrst, 'reload schema';
--
-- commit;
