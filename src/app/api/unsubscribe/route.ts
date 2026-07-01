import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyUnsubscribeToken } from '@/lib/unsubscribeToken'

async function processUnsubscribe(emailBlindIndex: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  // Mark subscriber as unsubscribed (resolved by blind index — no plaintext email)
  await supabase
    .from('subscribers')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('email_blind_index', emailBlindIndex)
    .is('unsubscribed_at', null)

  // Mark submitter as not subscribed
  await supabase
    .from('submitters')
    .update({ subscribed: false })
    .eq('email_blind_index', emailBlindIndex)
}

// POST — used by both the unsubscribe page and email client one-click.
// The link carries an opaque signed token (email blind index), never the email.
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? ''

  let token: string | null = null

  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}))
    token = body.token ?? null
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    // One-click unsubscribe from email clients (List-Unsubscribe-Post).
    // Email clients POST to the exact URL in the List-Unsubscribe header,
    // which carries the token in the query string.
    const text = await request.text()
    const params = new URLSearchParams(text)
    token = new URL(request.url).searchParams.get('token')
    if (params.get('List-Unsubscribe') !== 'One-Click') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
  }

  const verified = token ? verifyUnsubscribeToken(token) : null
  if (!verified) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
  }

  await processUnsubscribe(verified.blindIndex)
  return NextResponse.json({ success: true })
}
