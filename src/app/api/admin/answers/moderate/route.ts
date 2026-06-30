import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Verify admin session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { answerId?: string; action?: 'approve' | 'reject' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { answerId, action } = body

  if (!answerId || !action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'answerId and action (approve|reject) required' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const newStatus = action === 'approve' ? 'approved' : 'rejected'
  const updateData: Record<string, unknown> = { status: newStatus }
  if (action === 'approve') {
    updateData.approved_at = new Date().toISOString()
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (adminClient as any)
    .from('answers')
    .update(updateData)
    .eq('id', answerId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Log to moderation_log
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient as any)
    .from('moderation_log')
    .insert({ answer_id: answerId, action, openai_flagged: null })

  return NextResponse.json({ success: true, status: newStatus })
}
