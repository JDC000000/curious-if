import { type Instrumentation } from 'next'
import * as Sentry from '@sentry/nextjs'

/**
 * Production error monitoring.
 *
 * Next.js calls `onRequestError` for uncaught server-side errors across API
 * routes, Route Handlers, Server Components, and Server Actions. Sentry is the
 * canonical error/crash capture surface; the existing Resend email alert stays
 * as a low-volume operator backstop.
 *
 * Runs in both the Node.js and Edge runtimes. Do not include request headers,
 * cookies, or request bodies in the email alert.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Module-level cooldown. Serverless: this resets on cold start, which is fine —
// the brief explicitly says a basic in-memory throttle is the right effort here,
// it just needs to not be spammy, not be bulletproof.
// 60 min (was 5): Sentry already captures every error; this email is only a backstop, and a public
// error storm must not drain the Resend quota (security review 2026-09-30).
const ALERT_COOLDOWN_MS = 60 * 60 * 1000 // 60 minutes between alert emails
let lastAlertAt = 0

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  // The reporter must NEVER throw or break the actual request — everything below
  // is wrapped so a failure here (e.g. Resend down) only console.errors.
  try {
    // Skip Next.js control-flow "errors": notFound(), redirect(), etc. throw
    // internal signals with a NEXT_* digest — they're intentional, not failures,
    // and must not page the operator (this also keeps 404s from alerting).
    const digest = (err as { digest?: unknown })?.digest
    if (typeof digest === 'string' && digest.startsWith('NEXT_')) return

    Sentry.captureRequestError(err, request, context)

    // In-memory cooldown. Reserve the slot BEFORE the async send so a burst of
    // concurrent errors can't all get through before the first one records.
    const now = Date.now()
    if (now - lastAlertAt < ALERT_COOLDOWN_MS) return
    lastAlertAt = now

    const apiKey = process.env.RESEND_API_KEY
    const to = process.env.ADMIN_EMAIL
    if (!apiKey || !to) {
      console.error('[error-alert] not sent: RESEND_API_KEY or ADMIN_EMAIL is not set')
      return
    }

    const error = err instanceof Error ? err : undefined
    const message = error?.message ?? String(err)
    const stack = error?.stack ?? '(no stack available)'
    const path = request?.path ?? '(unknown path)'
    const method = request?.method ?? '(unknown method)'
    const routePath = context?.routePath ?? '(unknown route)'
    const routeType = context?.routeType ?? '(unknown type)'
    const timestamp = new Date().toISOString()

    // Plain-text internal ops alert — no branded HTML. Deliberately does NOT
    // include request headers/cookies (avoids leaking auth/PII into the alert).
    const lines = [
      'A server error occurred on curiousif.blog.',
      '',
      `Time:    ${timestamp}`,
      `Message: ${message}`,
      `Request: ${method} ${path}`,
      `Route:   ${routePath} (${routeType})`,
    ]
    if (typeof digest === 'string') lines.push(`Digest:  ${digest}`)
    lines.push('', 'Stack:', stack, '', `(Further alerts are suppressed for ${ALERT_COOLDOWN_MS / 60000} min.)`)

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'curious if <hello@curiousif.blog>',
        to,
        subject: `[curious if] Server error: ${message.slice(0, 100)}`,
        text: lines.join('\n'),
      }),
    })

    if (!res.ok) {
      console.error('[error-alert] Resend send failed:', res.status, await res.text().catch(() => ''))
    }
  } catch (reportErr) {
    // Never propagate — reporting a failure must not itself break the request.
    console.error('[error-alert] reporter threw (ignored):', reportErr)
  }
}
