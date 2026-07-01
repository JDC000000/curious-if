-- Migration 006: Rate limit log + nomination notification columns

-- Rate limit log table
-- Used to enforce per-IP request limits on public POST endpoints.
-- Rows older than the longest window (1 hour) are safe to delete periodically.
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  endpoint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_log_lookup
  ON rate_limit_log (ip, endpoint, created_at);

-- Nomination notification tracking columns
ALTER TABLE nominations
  ADD COLUMN IF NOT EXISTS notification_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_opted_out boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS answered_at timestamptz;

-- Index for reciprocal notification lookup (blind_index + question_id)
CREATE INDEX IF NOT EXISTS nominations_notify_lookup
  ON nominations (blind_index_email, question_id)
  WHERE notification_sent = false AND notification_opted_out = false;
