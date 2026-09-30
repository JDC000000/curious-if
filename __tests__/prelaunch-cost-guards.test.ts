// Security review 2026-09-30: pre-launch cost guards. The admin magic link is sent server-side only to the
// allow-listed address, the address is not in any client file, and the public email routes have a global
// daily cap (fails closed) plus a kill switch.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { NextRequest } from 'next/server'

const state = vi.hoisted(() => ({ globalCount: 0, countError: false, perIpAllowed: true }))
const signInWithOtp = vi.hoisted(() => vi.fn(async () => ({ error: null })))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { signInWithOtp } }),
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: async () =>
            state.countError ? { count: null, error: { message: 'down' } } : { count: state.globalCount, error: null },
          eq: () => ({ gte: async () => ({ count: 0, error: null }) }),
        }),
      }),
      insert: () => ({ then: () => ({ catch: () => {} }) }),
    }),
  }),
}))

const SITE = 'https://curiousif.blog'
const post = (body: unknown, origin = SITE) =>
  new NextRequest(`${SITE}/auth/admin-link`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
    body: JSON.stringify(body),
  })

beforeEach(() => {
  process.env.ADMIN_EMAIL = 'curator@example.com'
  delete process.env.PAUSE_PUBLIC_EMAILS
  state.globalCount = 0
  state.countError = false
  signInWithOtp.mockClear()
})

describe('POST /auth/admin-link', () => {
  it('sends a link to the allow-listed address, server-side, never creating users', async () => {
    const { POST } = await import('@/app/auth/admin-link/route')
    const res = await POST(post({ email: ' Curator@Example.com ' }))
    expect(res.status).toBe(200)
    expect(signInWithOtp).toHaveBeenCalledTimes(1)
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'curator@example.com',
      options: { shouldCreateUser: false, emailRedirectTo: `${SITE}/auth/callback?next=/admin` },
    })
  })

  it('any other address: same generic 200, nothing sent', async () => {
    const { POST } = await import('@/app/auth/admin-link/route')
    const other = await POST(post({ email: 'someone@example.com' }))
    const admin = await POST(post({ email: 'curator@example.com' }))
    expect(other.status).toBe(200)
    expect(await other.json()).toEqual(await admin.json())
    expect(signInWithOtp).toHaveBeenCalledTimes(1) // only the admin one
  })

  it('global daily cap reached, or the count fails: nothing sent (fails closed)', async () => {
    const { POST } = await import('@/app/auth/admin-link/route')
    state.globalCount = 10
    expect((await POST(post({ email: 'curator@example.com' }))).status).toBe(200)
    state.globalCount = 0
    state.countError = true
    expect((await POST(post({ email: 'curator@example.com' }))).status).toBe(200)
    expect(signInWithOtp).not.toHaveBeenCalled()
  })

  it('refuses a cross-site POST', async () => {
    const { POST } = await import('@/app/auth/admin-link/route')
    expect((await POST(post({ email: 'curator@example.com' }, 'https://evil.example'))).status).toBe(403)
    expect(signInWithOtp).not.toHaveBeenCalled()
  })
})

describe('public email routes', () => {
  it('kill switch pauses invite and subscribe with a 503', async () => {
    process.env.PAUSE_PUBLIC_EMAILS = '1'
    for (const path of ['@/app/api/invite/route', '@/app/api/subscribe/route']) {
      const { POST } = await import(path)
      const res = await POST(new NextRequest(`${SITE}/api/x`, { method: 'POST', body: '{}' }))
      expect(res.status, path).toBe(503)
    }
  })

  it('global cap reached (or unreadable) pauses them too', async () => {
    const { globalCapReached, GLOBAL_DAILY_CAPS } = await import('@/lib/rateLimit')
    state.globalCount = GLOBAL_DAILY_CAPS.invite
    expect(await globalCapReached('invite', GLOBAL_DAILY_CAPS.invite, 86400)).toBe(true)
    state.globalCount = 0
    expect(await globalCapReached('invite', GLOBAL_DAILY_CAPS.invite, 86400)).toBe(false)
    state.countError = true
    expect(await globalCapReached('invite', GLOBAL_DAILY_CAPS.invite, 86400)).toBe(true)
  })
})

describe('no personal email address in source', () => {
  it('src/ contains no @gmail.com address (client bundles must not carry the admin address)', () => {
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((n) => {
        const p = join(d, n)
        return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) ? [p] : []
      })
    const hits = walk(join(__dirname, '..', 'src')).filter((f) => /[a-z0-9._%+-]+@gmail\.com/i.test(readFileSync(f, 'utf8')))
    expect(hits).toEqual([])
  })
})
