-- Phase 3 / 0015 — one review row per sketch.
-- SketchReviewPage records an accept/pass decision per sketch and needs to
-- overwrite a prior decision (re-review) via a single upsert. That upsert
-- targets (set_id, sketch_index), so those columns need a unique constraint.
-- Safe to run once; re-running errors only if the constraint already exists.
alter table logo_sketch_reviews
  add constraint logo_sketch_reviews_set_sketch_unique unique (set_id, sketch_index);
