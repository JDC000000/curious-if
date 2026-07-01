import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyNotificationToken } from '@/lib/notificationToken'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Token required' }, { status: 400 })
  }

  const payload = verifyNotificationToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  // Set notification_opted_out on all nominations for this submitter
  const { error } = await supabase
    .from('nominations')
    .update({ notification_opted_out: true })
    .eq('nominator_submitter_id', payload.sid)

  if (error) {
    console.error('Notification opt-out error:', error)
    return NextResponse.json({ error: 'Failed to update preference' }, { status: 500 })
  }

  // Redirect to a simple confirmation page
  return NextResponse.redirect(
    new URL('/unsubscribe?notifications=1', request.url),
  )
}
