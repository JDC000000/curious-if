import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { sendAnswerLiveEmail } from '@/lib/answerLiveEmail'
import { decrypt, decryptEmail } from '@/lib/crypto'

const SITE = 'https://curiousif.blog'

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminClient = createAdminClient() as any

  const newStatus = action === 'approve' ? 'approved' : 'rejected'
  const updateData: Record<string, unknown> = { status: newStatus }
  if (action === 'approve') {
    updateData.approved_at = new Date().toISOString()
  }

  const { error: updateError } = await adminClient
    .from('answers')
    .update(updateData)
    .eq('id', answerId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Log to moderation_log
  await adminClient
    .from('moderation_log')
    .insert({ answer_id: answerId, action, openai_flagged: null })

  if (action === 'approve') {
    // Fetch answer + submitter email + question for notification + ISR
    const { data: full } = await adminClient
      .from('answers')
      .select(`
        id, body, question_id,
        submitter:submitters(email_encrypted, name_encrypted),
        question:questions(published_at, text)
      `)
      .eq('id', answerId)
      .single()

    // ISR revalidation
    try {
      revalidatePath('/browse')
      revalidatePath('/')
      if (full?.question?.published_at) {
        const d = new Date(full.question.published_at)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        revalidatePath(`/browse/${year}/${month}`)
      }
    } catch {
      // Non-fatal
    }

    // OG image warm-up (fire-and-forget)
    fetch(`${SITE}/api/og/${answerId}`, { method: 'POST' }).catch(() => {})

    // "Your answer is live" email — fire and forget. Decrypt PII only to send.
    const submitterEmail = full?.submitter?.email_encrypted
      ? decryptEmail(full.submitter.email_encrypted)
      : null
    if (submitterEmail) {
      void sendAnswerLiveEmail(
        submitterEmail,
        full.submitter.name_encrypted ? decrypt(full.submitter.name_encrypted) : null,
        answerId,
        full.body,
        full.question?.text ?? '',
        full.question?.published_at ?? null,
      )
    }
  }

  return NextResponse.json({ success: true, status: newStatus })
}
