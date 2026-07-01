-- Migration 009: rename questions.status value 'featured' -> 'spotlight'
--
-- Architecture constraint (AGENTS.md #1): questions.status enum is
-- 'spotlight' | 'published' | 'draft' ONLY. Earlier migrations used 'featured'
-- for the monthly spotlight question; this aligns the DB with the spec.
--
-- NOTE: answers.is_featured (curator-picked answers) is a SEPARATE concept and
-- is intentionally left untouched.

-- 1. Relax the CHECK constraint so we can migrate existing rows.
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_status_check;

-- 2. Migrate existing data.
UPDATE questions SET status = 'spotlight' WHERE status = 'featured';

-- 3. Re-add the CHECK constraint with the canonical enum (no 'featured', no 'closed').
ALTER TABLE questions
  ADD CONSTRAINT questions_status_check
  CHECK (status IN ('draft', 'spotlight', 'published'));

-- 4. Recreate the public-read RLS policy to reference 'spotlight'.
DROP POLICY IF EXISTS "questions_public_read" ON questions;
CREATE POLICY "questions_public_read" ON questions
  FOR SELECT USING (status IN ('spotlight', 'published'));

-- 5. Recreate publish_question (current version from migration 007) using 'spotlight'.
CREATE OR REPLACE FUNCTION publish_question(new_question_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prev_question_id uuid;
BEGIN
  -- Get the current spotlight question (if any)
  SELECT id INTO prev_question_id
  FROM questions
  WHERE status = 'spotlight'
  LIMIT 1;

  -- Archive the outgoing spotlight question
  IF prev_question_id IS NOT NULL THEN
    UPDATE questions
    SET status = 'published', published_at = COALESCE(published_at, now())
    WHERE id = prev_question_id;

    -- Mark curator-picked answers as archive headlines
    UPDATE answers
    SET archive_headline = true
    WHERE question_id = prev_question_id
      AND is_featured = true
      AND status = 'approved';

    -- Record headline in archive_headlines table (question-level summary)
    INSERT INTO archive_headlines (question_id, headline)
    SELECT id, substring(text, 1, 100)
    FROM questions
    WHERE id = prev_question_id
    ON CONFLICT DO NOTHING;
  END IF;

  -- Promote the new question to spotlight
  UPDATE questions
  SET status = 'spotlight'
  WHERE id = new_question_id AND status = 'draft';

  -- Guard: ensure the update happened
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question % not found or not in draft status', new_question_id;
  END IF;
END;
$$;
