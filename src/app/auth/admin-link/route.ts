import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/adminAuth'
import { checkRateLimit, getClientIP, globalCapReached, GLOBAL_DAILY_CAPS } from '@/lib/rateLimit'

/**
 * POST /auth/admin-link: sends the curator's magic link from the SERVER
 * (security review 2026-09-30).
 *
 * Before, /admin/login called signInWithOtp from the browser with the admin
 * address hard-coded in the client bundle, so anyone could press the button
 * repeatedly (email quota, cost, sending-domain reputation) and read the address.
 *
 * Now:
 *   - the address comes from the form and is checked against ADMIN_EMAIL here
 *     (server-side allow-list); nothing about it ships to the browser
 *   - only an allow-listed address is sent a link, and only within a per-IP
 *     limit (3/h) and a global daily cap, which fails closed
 *   - the answer is the same generic 200 in every case, so this is not an oracle
 *     for which address is the admin's
 *   - same-origin only, so another site can't trigger sends
 *
 * Outside /api/admin on purpose: the proxy 401s /api/admin/* without a session.
 */
const GENERIC = { ok: true, message: 'If that is the admin address, a sign-in link is on its way.' }

export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin
  if (request.headers.get('origin') !== origin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let email = ''
  try {
    const body = (await request.json()) as { email?: unknown }
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : ''
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Not the curator: send nothing, count nothing, same answer.
  if (!isAdminEmail(email)) return NextResponse.json(GENERIC)

  // Only real sends are counted, so strangers who don't know the address can't use up the cap.
  const ip = getClientIP(request)
  if (ip === 'unknown') return NextResponse.json(GENERIC)
  if (await globalCapReached('admin-link', GLOBAL_DAILY_CAPS.adminLink, 86400)) {
    return NextResponse.json(GENERIC)
  }
  if (!(await checkRateLimit(ip, 'admin-link', 3, 3600))) return NextResponse.json(GENERIC)

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      // Never auto-create accounts: only the pre-provisioned curator may log in.
      shouldCreateUser: false,
      emailRedirectTo: `${origin}/auth/callback?next=/admin`,
    },
  })
  if (error) console.error('[admin-link] signInWithOtp failed:', error.status ?? 'unknown')
  return NextResponse.json(GENERIC)
}
