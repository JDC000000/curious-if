-- ============================================================
-- Migration 003 — Add resonance_count to answers
-- ============================================================

ALTER TABLE answers ADD COLUMN resonance_count integer NOT NULL DEFAULT 0;

-- Prevent negative counts
ALTER TABLE answers ADD CONSTRAINT answers_resonance_count_non_negative
  CHECK (resonance_count >= 0);
