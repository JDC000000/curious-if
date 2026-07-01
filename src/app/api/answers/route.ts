import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { rateGuard } from '@/lib/rateLimit'

const MAX_BODY_LENGTH = 1500

export async function POST(request: NextRequest) {
  // 10 answers per IP per hour
  const limited = await rateGuard(request, 'answers', 10, 3600)
  if (limited) return limited

  let body: { questionId?: string; answerBody?: string; ref?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { questionId, answerBody, ref } = body

  // Validate inputs
  if (!answerBody || typeof answerBody !== 'string' || answerBody.trim().length === 0) {
    return NextResponse.json({ error: 'Answer body is required' }, { status: 400 })
  }
  if (answerBody.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: `Answer must be ${MAX_BODY_LENGTH} characters or fewer` }, { status: 400 })
  }
  if (!questionId || typeof questionId !== 'string') {
    return NextResponse.json({ error: 'questionId is required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify the question exists and accepts answers (featured OR published — NOT draft)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: question, error: questionError } = await (supabase as any)
    .from('questions')
    .select('id, status')
    .eq('id', questionId)
    .in('status', ['featured', 'published'])
    .single()

  if (questionError || !question) {
    return NextResponse.json({ error: 'Question not found or not accepting answers' }, { status: 400 })
  }

  // Insert answer with status='pending' — submitter_id is null until email is captured
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: answer, error: insertError } = await (supabase as any)
    .from('answers')
    .insert({
      question_id: questionId,
      body: answerBody.trim(),
      status: 'pending',
      submitter_id: null,
    })
    .select('id, status')
    .single()

  if (insertError || !answer) {
    console.error('Answer insert error:', insertError)
    return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 })
  }

  // Mark nomination as used if this answer came via an invite link (fire-and-forget)
  if (ref) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase as any)
      .from('nominations')
      .update({ used_at: new Date().toISOString() })
      .eq('id', ref)
      .is('used_at', null) // only mark once
      .gte('expires_at', new Date().toISOString()) // only if not expired
      .then(() => {})
      .catch(() => {})
  }

  // Trigger OpenAI moderation asynchronously (fire-and-forget)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://curiousif.blog'
  fetch(`${siteUrl}/api/moderate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answerId: answer.id, answerBody: answerBody.trim() }),
  }).catch((err) => {
    // Non-fatal — answer stays pending; admin can moderate manually
    console.warn('Moderation trigger failed:', err)
  })

  return NextResponse.json({ id: answer.id, status: answer.status })
}
