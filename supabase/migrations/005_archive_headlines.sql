-- Archive headlines table
-- Optional: admin-curated pull quotes shown on the /archive page
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS archive_headlines (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  headline    text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS archive_headlines_question_id_idx
  ON archive_headlines(question_id);
