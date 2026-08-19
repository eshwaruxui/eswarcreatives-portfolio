-- Migration 0096: add 'tone_of_voice' as a fourth top-level Brand Visual
-- Guide category, sibling to guidelines/assets/templates. Ships alongside
-- a new Tone of Voice sub-module adopted from a standalone reference
-- prototype into the real Brand Visual Guide feature (ClientPanel tab +
-- client/public routes from migration 0094/0095).
--
-- No new table, no new columns. content_type CHECK already covers
-- document/image/video/audio/link and visibility CHECK already covers
-- admin_only/client/public (both from migration 0094) -- Tone of Voice
-- needs nothing new from either. The locked flag and the document layout
-- variant (prose/word-list/before-after) live in the existing
-- unconstrained detail jsonb column, the same way swatches/specimens/
-- sections already extend it per item type today.
--
-- Grouping: Tone of Voice is a flat list in the UI, but reuses the
-- existing (category, group_label) structure rather than introducing a
-- nullable-group mechanism -- every Tone of Voice row is inserted with
-- group_label = 'General', and the UI is taught to hide the group nav/
-- label whenever a category resolves to exactly one group. No schema
-- change needed for group_label itself; it stays NOT NULL.
--
-- Same widen pattern as migration 0089 (leads.segment): drop and re-add
-- the column's default-named CHECK constraint, additive only. Every
-- existing row keeps its current category untouched, and every existing
-- insert path (Guidelines/Assets/Templates) is unaffected.
alter table brand_visual_items
  drop constraint brand_visual_items_category_check;
alter table brand_visual_items
  add constraint brand_visual_items_category_check
  check (category in ('guidelines','assets','templates','tone_of_voice'));
