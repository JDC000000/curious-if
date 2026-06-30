-- ============================================================
-- Curious If — Initial Schema v1.0
-- Project: mqiwhmphrhpsvwzwcoix
-- ============================================================

-- SUBMITTERS (must exist before answers/nominations reference it)
CREATE TABLE IF NOT EXISTS submitters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  name text,
  city text,
  subscribed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- QUESTIONS
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  whisper_line text CHECK (char_length(whisper_line) <= 80),
  accent_colour text NOT NULL DEFAULT '#3D5A8C',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','featured','published')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ANSWERS
CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) <= 1500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitter_id uuid REFERENCES submitters(id) ON DELETE SET NULL,
  openai_flagged boolean,
  og_generated boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);

-- NOMINATIONS
CREATE TABLE IF NOT EXISTS nominations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  nominator_submitter_id uuid REFERENCES submitters(id) ON DELETE SET NULL,
  nominee_email text,
  blind_index_email text,
  personal_note text,
  used_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- SUBSCRIBERS
CREATE TABLE IF NOT EXISTS subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id uuid REFERENCES submitters(id) ON DELETE SET NULL,
  email text NOT NULL,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  unsubscribed_at timestamptz,
  notification_opted_out boolean NOT NULL DEFAULT false
);

-- MODERATION LOG
CREATE TABLE IF NOT EXISTS moderation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid NOT NULL REFERENCES answers(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('approve','reject')),
  openai_flagged boolean,
  actioned_at timestamptz NOT NULL DEFAULT now()
);

-- ARCHIVE HEADLINES
CREATE TABLE IF NOT EXISTS archive_headlines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  headline text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE submitters ENABLE ROW LEVEL SECURITY;
ALTER TABLE nominations ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE archive_headlines ENABLE ROW LEVEL SECURITY;

-- Questions: anyone can read featured or published
CREATE POLICY "questions_public_read" ON questions
  FOR SELECT USING (status IN ('featured','published'));

-- Answers: anyone can read approved answers
CREATE POLICY "answers_public_read" ON answers
  FOR SELECT USING (status = 'approved');

-- Archive headlines: anyone can read
CREATE POLICY "archive_headlines_public_read" ON archive_headlines
  FOR SELECT USING (true);

-- All other tables: no public access (service role bypasses RLS)

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS answers_question_id_status ON answers(question_id, status);
CREATE INDEX IF NOT EXISTS answers_status ON answers(status);
CREATE INDEX IF NOT EXISTS answers_question_featured ON answers(question_id, is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS nominations_blind_index ON nominations(blind_index_email);
CREATE INDEX IF NOT EXISTS nominations_question_id ON nominations(question_id);
CREATE INDEX IF NOT EXISTS questions_status ON questions(status);
CREATE INDEX IF NOT EXISTS questions_published_at ON questions(published_at DESC) WHERE status = 'published';

-- ============================================================
-- ATOMIC PUBLISH FUNCTION
-- ============================================================

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

  -- Archive the current featured question
  IF prev_question_id IS NOT NULL THEN
    UPDATE questions
    SET status = 'published', published_at = now()
    WHERE id = prev_question_id;

    -- Record archive headline (use first 100 chars of question text)
    INSERT INTO archive_headlines (question_id, headline)
    SELECT id, substring(text, 1, 100)
    FROM questions
    WHERE id = prev_question_id;
  END IF;

  -- Feature the new question
  UPDATE questions
  SET status = 'featured'
  WHERE id = new_question_id AND status = 'draft';

  -- Verify the update happened
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Question % not found or not in draft status', new_question_id;
  END IF;
END;
$$;
