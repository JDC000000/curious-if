-- Migration 012: backfill-hash any existing nominations.token values
--
-- Companion to the application-code change in this same branch/PR that stops
-- storing invite tokens raw (nominations.token) and instead stores
-- sha256(token) (see src/lib/crypto.ts hashToken(), used by
-- src/app/api/invite/route.ts on write and src/app/api/answers/route.ts on
-- lookup).
--
-- MUST ship atomically with that code change, not as a follow-up: if the
-- lookup code starts hashing-before-matching while any existing row still
-- holds a raw (unhashed) token, that row's already-emailed invite link would
-- 404 permanently for its recipient. This migration converts any such
-- pre-existing raw values in place so they remain matchable the moment the
-- new hash-based lookup code deploys.
--
-- Uses pgcrypto's digest(), already installed on this project (used
-- elsewhere for gen_random_uuid()). digest(token::bytea, 'sha256') hashes the
-- UTF-8 bytes of the text value, matching Node's
-- createHash('sha256').update(token).digest('hex') exactly — verified
-- end-to-end in a rolled-back transaction against a seeded raw-token row
-- before this migration was written (see changelog.md / learnings.md).
--
-- NOT safely re-runnable: a raw 32-byte token and its SHA-256 hash are both
-- 64-char lowercase hex, so there is no format-based way to detect "already
-- hashed" and skip it. This is fine under this project's normal one-shot
-- migration-apply model (each file is applied exactly once, tracked in
-- supabase_migrations.schema_migrations — see AGENTS.md) but do NOT copy this
-- UPDATE into a new migration or re-apply this file by hand; a double-hash
-- would make every existing invite link unresolvable.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE nominations
SET token = encode(digest(token::bytea, 'sha256'), 'hex')
WHERE token IS NOT NULL
  -- Defensive belt-and-braces: a 64-char lowercase-hex value is already
  -- consistent with either a raw token or a hash, so this WHERE clause can't
  -- distinguish them — it only guards against re-running this file against a
  -- token column that was, for some other reason, not in the expected raw
  -- hex-string format (e.g. already migrated by a different path). A no-op
  -- on today's empty table; real protection is "apply this file exactly
  -- once."
  AND token ~ '^[0-9a-f]{64}$';
