-- Migration 010: PII email encryption + opaque tokens + single author_attribution
--
-- Enforces AGENTS.md architecture decisions:
--   #2 answers.author_attribution — single optional freeform field
--   #3 email encryption — no plaintext email/PII stored (AES-256-GCM, src/lib/crypto)
--   #4 invite tokens — opaque; no email/PII/guessable IDs in URLs
--
-- Encrypted values are stored as hex payloads in `text` columns (produced by
-- src/lib/crypto: `iv:tag:ciphertext`). Blind indexes are HMAC-SHA256 hex.
--
-- Pre-launch: no production PII exists yet, so plaintext columns are DROPPED to
-- structurally guarantee the "never store plaintext" invariant.

-- ------------------------------------------------------------------
-- SUBMITTERS — encrypt email/name/city; look up by email blind index
-- ------------------------------------------------------------------
ALTER TABLE submitters DROP CONSTRAINT IF EXISTS submitters_email_unique;

ALTER TABLE submitters
  ADD COLUMN IF NOT EXISTS email_encrypted   text,
  ADD COLUMN IF NOT EXISTS email_blind_index text,
  ADD COLUMN IF NOT EXISTS name_encrypted    text,
  ADD COLUMN IF NOT EXISTS city_encrypted    text;

ALTER TABLE submitters DROP COLUMN IF EXISTS email;
ALTER TABLE submitters DROP COLUMN IF EXISTS name;
ALTER TABLE submitters DROP COLUMN IF EXISTS city;

CREATE UNIQUE INDEX IF NOT EXISTS submitters_email_blind_index_key
  ON submitters (email_blind_index);

-- ------------------------------------------------------------------
-- SUBSCRIBERS — encrypt email; look up / dedup by email blind index
-- ------------------------------------------------------------------
ALTER TABLE subscribers DROP CONSTRAINT IF EXISTS subscribers_email_unique;

ALTER TABLE subscribers
  ADD COLUMN IF NOT EXISTS email_encrypted   text,
  ADD COLUMN IF NOT EXISTS email_blind_index text;

ALTER TABLE subscribers DROP COLUMN IF EXISTS email;

CREATE UNIQUE INDEX IF NOT EXISTS subscribers_email_blind_index_key
  ON subscribers (email_blind_index);

-- ------------------------------------------------------------------
-- NOMINATIONS — encrypt nominee email; opaque 32-byte invite token
-- (blind_index_email already exists, used for reciprocal-answer lookup)
-- ------------------------------------------------------------------
ALTER TABLE nominations
  ADD COLUMN IF NOT EXISTS nominee_email_encrypted text,
  ADD COLUMN IF NOT EXISTS token                   text;

ALTER TABLE nominations DROP COLUMN IF EXISTS nominee_email;

CREATE UNIQUE INDEX IF NOT EXISTS nominations_token_key
  ON nominations (token);

-- ------------------------------------------------------------------
-- ANSWERS — single optional freeform attribution (never split, never required)
-- ------------------------------------------------------------------
ALTER TABLE answers
  ADD COLUMN IF NOT EXISTS author_attribution text
  CHECK (author_attribution IS NULL OR char_length(author_attribution) <= 80);
