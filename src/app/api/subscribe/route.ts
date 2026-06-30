import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

async function addToResendContacts(email: string, name?: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return

  try {
    await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        first_name: name ?? undefined,
        unsubscribed: false,
      }),
    })
  } catch (err) {
    // Non-fatal — subscriber is in Supabase even if Resend fails
    console.warn('Resend Contacts API failed:', err)
  }
}

export async function POST(request: NextRequest) {
  let body: { email?: string; name?: string; city?: string; answerId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, name, city, answerId } = body

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Upsert submitter row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: submitter, error: submitterError } = await (supabase as any)
    .from('submitters')
    .upsert(
      { email, name: name || null, city: city || null, subscribed: true },
      { onConflict: 'email', ignoreDuplicates: false }
    )
    .select('id')
    .single()

  if (submitterError || !submitter) {
    console.error('Submitter upsert error:', submitterError)
    return NextResponse.json({ error: 'Failed to save subscriber' }, { status: 500 })
  }

  // Upsert subscriber row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('subscribers')
    .upsert(
      { submitter_id: submitter.id, email, unsubscribed_at: null },
      { onConflict: 'email', ignoreDuplicates: false }
    )

  // Link submitter to the answer they just submitted
  if (answerId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('answers')
      .update({ submitter_id: submitter.id })
      .eq('id', answerId)
      .is('submitter_id', null) // Safety: only update if not already linked
  }

  // Add to Resend Contacts (fire-and-forget)
  await addToResendContacts(email, name)

  return NextResponse.json({ success: true })
}
