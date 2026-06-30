import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

async function processUnsubscribe(email: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  // Mark subscriber as unsubscribed
  await supabase
    .from('subscribers')
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq('email', email)
    .is('unsubscribed_at', null)

  // Mark submitter as not subscribed
  await supabase
    .from('submitters')
    .update({ subscribed: false })
    .eq('email', email)
}

// POST — used by both the unsubscribe page and email client one-click
export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? ''

  let email: string | null = null

  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => ({}))
    email = body.email ?? null
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    // One-click unsubscribe from email clients (List-Unsubscribe-Post)
    const text = await request.text()
    const params = new URLSearchParams(text)
    // Email clients POST to the exact URL in List-Unsubscribe header
    // The email address is in the URL query string
    email = new URL(request.url).searchParams.get('email')
    // Confirm the body contains the one-click signal
    if (params.get('List-Unsubscribe') !== 'One-Click') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
  }

  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  await processUnsubscribe(email)
  return NextResponse.json({ success: true })
}
