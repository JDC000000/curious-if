import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
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

  // ISR revalidation — approved answers should appear immediately on browse
  if (action === 'approve') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: ans } = await (adminClient as any)
        .from('answers')
        .select('question_id')
        .eq('id', answerId)
        .single()

      if (ans?.question_id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: q } = await (adminClient as any)
          .from('questions')
          .select('published_at')
          .eq('id', ans.question_id)
          .single()

        revalidatePath('/browse')
        revalidatePath('/')

        if (q?.published_at) {
          const d = new Date(q.published_at)
          const year = d.getFullYear()
          const month = String(d.getMonth() + 1).padStart(2, '0')
          revalidatePath(`/browse/${year}/${month}`)
        }
      }
    } catch {
      // Non-fatal — ISR will catch up on its own TTL
    }
  }

  return NextResponse.json({ success: true, status: newStatus })
}
