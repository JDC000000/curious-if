// Security review 2026-10-03: performance transactions bypass beforeSend, so with tracing on they carried the
// request cookies (the admin's Supabase session) to Sentry. This guard imports every Sentry config and fails if
// tracing can be on without a beforeSendTransaction scrubber, or if a new Sentry.init site appears untested.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const init = vi.hoisted(() => vi.fn())
vi.mock('@sentry/nextjs', () => ({ init, captureRouterTransitionStart: vi.fn() }))

const CONFIGS = ['src/sentry.server.config.ts', 'src/sentry.edge.config.ts', 'src/instrumentation-client.ts']
const ROOT = join(__dirname, '..')

type Opts = {
  tracesSampleRate?: number
  tracesSampler?: (ctx: unknown) => number | boolean
  beforeSendTransaction?: (e: Record<string, unknown>) => Record<string, unknown> | null
  beforeSendSpan?: (s: { data: Record<string, unknown> }) => { data: Record<string, unknown> }
}

async function optionsOf(file: string): Promise<Opts> {
  vi.resetModules()
  init.mockClear()
  await import(join(ROOT, file))
  expect(init, `${file} did not call Sentry.init`).toHaveBeenCalledTimes(1)
  return init.mock.calls[0][0] as Opts
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://public@o0.ingest.sentry.io/0'
})

describe('Sentry tracing guard', () => {
  it('every Sentry.init in src/ is one of the guarded configs', () => {
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((n) => {
        const p = join(d, n)
        return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) ? [p] : []
      })
    const sites = walk(join(ROOT, 'src'))
      .filter((f) => /Sentry\.init\(/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f))
      .sort()
    expect(sites).toEqual([...CONFIGS].sort())
  })

  for (const file of CONFIGS) {
    it(`${file}: tracing cannot be on without beforeSendTransaction`, async () => {
      const o = await optionsOf(file)
      const rateOn = typeof o.tracesSampleRate === 'number' && o.tracesSampleRate > 0
      if (rateOn) expect(o.beforeSendTransaction, 'tracesSampleRate > 0 needs beforeSendTransaction').toBeTypeOf('function')
      // Tracing is off, even when an inbound sentry-trace header says "sampled" (a rate alone would inherit it).
      expect(o.tracesSampler, 'use tracesSampler returning 0, not only tracesSampleRate').toBeTypeOf('function')
      expect(o.tracesSampler!({ parentSampled: true, name: 'GET /admin' })).toBe(0)
      expect(o.beforeSendTransaction).toBeTypeOf('function')
    })

    it(`${file}: a transaction is scrubbed of cookies and auth headers`, async () => {
      const o = await optionsOf(file)
      const tx = o.beforeSendTransaction!({
        type: 'transaction',
        request: {
          url: 'https://curiousif.blog/admin?token=abc',
          headers: { cookie: 'sb-ref-auth-token=base64-secret', authorization: 'Bearer x', 'user-agent': 'UA' },
          cookies: { 'sb-ref-auth-token': 'base64-secret' },
        },
      }) as { request: { headers: Record<string, string>; cookies: unknown; url: string } }
      expect(JSON.stringify(tx)).not.toContain('base64-secret')
      expect(tx.request.headers.cookie).toBe('[redacted]')
      expect(tx.request.headers.authorization).toBe('[redacted]')
      expect(tx.request.cookies).toBe('[redacted]')
      expect(tx.request.url).not.toContain('abc')
    })

    it(`${file}: span attributes that can carry cookies, auth or IPs are dropped`, async () => {
      const o = await optionsOf(file)
      const span = o.beforeSendSpan!({
        data: { 'http.request.header.cookie': 'x', 'client.address': '1.2.3.4', 'http.method': 'GET' },
      })
      expect(span.data).toEqual({ 'http.method': 'GET' })
    })
  }
})
