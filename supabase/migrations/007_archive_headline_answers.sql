-- Migration 007: archive_headline on answers + updated publish_question RPC
--
-- archive_headline = true marks curator-picked answers from a past question
-- so the /browse/YYYY/MM page can show them as hero cards at the top.
-- This flag is set automatically when a new question is published (replaces the
-- featured question), marking all featured=true answers on the outgoing question.

-- 1. Add column
ALTER TABLE answers
  ADD COLUMN IF NOT EXISTS archive_headline boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS answers_archive_headline_idx
  ON answers (question_id, archive_headline)
  WHERE archive_headline = true;

-- 2. Replace publish_question with version that marks archive headlines
CREATE OR REPLACE FUNCTION publish_question(new_question_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prev_question_id uuid;
BEGIN
  -- Get the current featured question (if any)
  SELECT id INTO prev_question_id
  FROM questions
  WHERE status = 'featured'
  LIMIT 1;

  -- Archive the outgoing featured question
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

  -- Feature the new question
  UPDATE questions
  SET status = 'featured'
  WHERE id = new_question_id AND status = 'draft';

  -- Guard: ensure the update happened
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question % not found or not in draft status', new_question_id;
  END IF;
END;
$$;
