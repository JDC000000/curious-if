-- Migration 008: Add is_seed flag and author_display to answers
-- is_seed = true marks temporary sock-puppet seed answers inserted at launch
-- author_display stores the Phase-3B "Initials · City" label for seed answers

ALTER TABLE answers
  ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS author_display text;

-- Index for fast bulk-removal of seed answers
CREATE INDEX IF NOT EXISTS answers_is_seed_idx ON answers (is_seed) WHERE is_seed = true;

COMMENT ON COLUMN answers.is_seed IS 'Temporary seed / sock-puppet answer. Remove with: DELETE FROM answers WHERE is_seed = true';
COMMENT ON COLUMN answers.author_display IS 'Phase-3B display label, e.g. "D.W. · Vancouver". Overrides submitter name+city when set.';
