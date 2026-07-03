import { type Instrumentation } from 'next'

/**
 * Lightweight production error monitoring.
 *
 * Next.js calls `onRequestError` for uncaught server-side errors across API
 * routes, Route Handlers, Server Components, and Server Actions — no manual
 * try/catch needed at each call site. We turn that into a plain ops-alert email
 * to the operator (ADMIN_EMAIL) via the already-configured Resend setup (same
 * RESEND_API_KEY + sending domain as every other email in this codebase).
 *
 * Deliberately minimal (per the brief): no new dependency, no third-party
 * observability service, no dashboards — just "email me when prod actually
 * breaks", with a basic in-memory cooldown so a recurring error can't spam the
 * inbox. Runs in both the Node.js and Edge runtimes (only uses fetch/Date/env).
 */

// Module-level cooldown. Serverless: this resets on cold start, which is fine —
// the brief explicitly says a basic in-memory throttle is the right effort here,
// it just needs to not be spammy, not be bulletproof.
const ALERT_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes between alert emails
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
