/**
 * Authorisation (not just authentication): a valid Supabase session is NOT
 * enough — the signed-in user must be THE curator (ADMIN_EMAIL). Without this,
 * anyone could self-provision via the public anon key and reach admin functions.
 *
 * Used by both the proxy middleware (Edge runtime) and /auth/callback (Node),
 * so it uses a pure-JS constant-time compare — no `node:crypto` (unavailable /
 * unreliable on Edge). Comparison runs over the longer input and folds the
 * length difference in, so it does not early-exit on a mismatch.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const admin = process.env.ADMIN_EMAIL
  if (!admin || !email) return false
  return constantTimeEqual(email.trim().toLowerCase(), admin.trim().toLowerCase())
}
