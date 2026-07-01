-- Migration 011: lock down rate_limit_log RLS + revoke SECURITY DEFINER functions
--
-- M-1: rate_limit_log had RLS disabled — the public anon key could read visitor
--      IPs and wipe rate-limit counters. Enable RLS; only the service role
--      (which rateLimit.ts uses via createAdminClient, and which bypasses RLS)
--      may touch it. No anon/authenticated policy => those roles are denied.
--
-- M-3: SECURITY DEFINER functions run with the owner's privileges. Revoke
--      EXECUTE from anon/PUBLIC so they can only be invoked server-side by the
--      service role (admin publish, resonance route).

-- ------------------------------------------------------------------
-- M-1 — rate_limit_log
-- ------------------------------------------------------------------
ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rate_limit_log_service_only ON rate_limit_log;
CREATE POLICY rate_limit_log_service_only ON rate_limit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------------------------------
-- M-3 — SECURITY DEFINER functions: no anon/public execute
-- ------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION publish_question(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION increment_resonance(uuid, integer) FROM anon, PUBLIC;
