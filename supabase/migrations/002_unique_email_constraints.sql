-- ============================================================
-- Migration 002 — Add unique email constraints
-- Required for upsert onConflict: 'email' to work
-- ============================================================

-- submitters.email must be unique (used by /api/subscribe upsert)
ALTER TABLE submitters ADD CONSTRAINT submitters_email_unique UNIQUE (email);

-- subscribers.email must be unique (used by /api/subscribe upsert)
ALTER TABLE subscribers ADD CONSTRAINT subscribers_email_unique UNIQUE (email);
