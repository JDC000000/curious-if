// Resend webhook — receives unsubscribe events from Resend's Svix delivery system.
// Verifies signature, then sets subscribers.unsubscribed_at for one-click unsubs.
//
// Setup in Resend dashboard:
//   Webhooks → Add endpoint → https://curiousif.blog/api/webhooks/resend
//   Events: contact.unsubscribed, email.bounced
//   Copy the Signing Secret → RESEND_WEBHOOK_SECRET env var in Vercel

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createHmac, timingSafeEqual } from 'crypto'

function verifySvixSignature(
  secret: string,
  msgId: string,
  msgTimestamp: string,
  rawBody: string,
  sigHeader: string,
): boolean {
  try {
    // Reject messages older than 5 minutes
    const ts = parseInt(msgTimestamp, 10)
    if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

    const signed = `${msgId}.${msgTimestamp}.${rawBody}`
    // Secret is base64-encoded in Resend; strip the "whsec_" prefix
    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
    const computed = createHmac('sha256', secretBytes).update(signed).digest('base64')

    // svix-signature header: "v1,<base64sig> v1,<base64sig2> ..."
    const signatures = sigHeader.split(' ').map(s => s.replace(/^v1,/, ''))
    return signatures.some(sig => {
      const a = Buffer.from(sig)
      const b = Buffer.from(computed)
      return a.length === b.length && timingSafeEqual(a, b)
    })
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('RESEND_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const msgId = request.headers.get('svix-id') ?? ''
  const msgTimestamp = request.headers.get('svix-timestamp') ?? ''
  const sigHeader = request.headers.get('svix-signature') ?? ''

  const rawBody = await request.text()

  if (!verifySvixSignature(secret, msgId, msgTimestamp, rawBody, sigHeader)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let event: { type?: string; data?: Record<string, unknown> }
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  if (event.type === 'contact.unsubscribed' || event.type === 'email.bounced') {
    const email =
      (event.data?.email as string) ??
      (event.data?.to as string) ??
      null

    if (email) {
      await supabase
        .from('subscribers')
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq('email', email)
        .is('unsubscribed_at', null)

      console.log(`Resend webhook: unsubscribed ${email} (event: ${event.type})`)
    }
  }

  // Always return 200 — Resend retries on non-2xx
  return NextResponse.json({ received: true })
}
