// Per-IP rate limiting backed by Supabase rate_limit_log table.
// Simple count-in-window approach — suitable for low-volume MVP.
// Not atomic (TOCTOU gap), but window sizes are large enough that this is safe in practice.

import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'
  )
}

/**
 * Returns true  → request is allowed, log entry written.
 * Returns false → rate limit exceeded, do NOT proceed.
 */
export async function checkRateLimit(
  ip: string,
  endpoint: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  if (ip === 'unknown') return true // can't reliably block; allow through

  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { count, error: countError } = await supabase
    .from('rate_limit_log')
    .select('id', { count: 'exact', head: true })
    .eq('ip', ip)
    .eq('endpoint', endpoint)
    .gte('created_at', windowStart)

  if (countError) {
    // Fail open — don't block legitimate traffic on DB hiccup
    console.warn('Rate limit count error:', countError)
    return true
  }

  if ((count ?? 0) >= limit) return false

  // Log this request (fire-and-forget — don't block on it)
  supabase
    .from('rate_limit_log')
    .insert({ ip, endpoint })
    .then(() => {})
    .catch(() => {})

  return true
}

/**
 * Convenience wrapper: returns a 429 NextResponse if rate limited, null if allowed.
 * Usage:
 *   const limited = await rateGuard(request, 'answers', 10, 3600)
 *   if (limited) return limited
 */
export async function rateGuard(
  request: NextRequest,
  endpoint: string,
  limit: number,
  windowSeconds: number,
): Promise<NextResponse | null> {
  const ip = getClientIP(request)
  const allowed = await checkRateLimit(ip, endpoint, limit, windowSeconds)
  if (allowed) return null

  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(windowSeconds),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Window': String(windowSeconds),
      },
    },
  )
}

/**
 * Pre-launch cost guard (security review 2026-09-30): a GLOBAL cap across all
 * IPs for an endpoint, so rotating IPs can't turn a per-IP limit into an
 * unbounded email bill. Counts the rows rateGuard/checkRateLimit logged for
 * `endpoint` in the window. FAILS CLOSED: if the count can't be read, the cap
 * counts as reached (these endpoints cost money; a DB blip must not open them).
 */
export async function globalCapReached(
  endpoint: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const windowStart = new Date(Date.now() - windowSeconds * 1000).toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any
  const { count, error } = await supabase
    .from('rate_limit_log')
    .select('id', { count: 'exact', head: true })
    .eq('endpoint', endpoint)
    .gte('created_at', windowStart)
  if (error) {
    console.warn('Global cap count error (failing closed):', endpoint)
    return true
  }
  return (count ?? 0) >= max
}

/** Kill switch: PAUSE_PUBLIC_EMAILS=1 (Vercel env) stops every public-triggered email send. */
export function publicEmailsPaused(): boolean {
  return process.env.PAUSE_PUBLIC_EMAILS === '1'
}

/** Global daily caps (all IPs). Resend's free tier is 100 emails/day; keep public triggers well under. */
export const GLOBAL_DAILY_CAPS = { invite: 20, subscribe: 30, adminLink: 10 } as const

export function pausedResponse(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 503, headers: { 'Retry-After': '3600' } })
}
