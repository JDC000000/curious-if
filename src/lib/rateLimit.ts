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
