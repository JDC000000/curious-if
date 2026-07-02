import { NextRequest, NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { rateGuard } from '@/lib/rateLimit'

const MAX_BODY_LENGTH = 1500

export async function POST(request: NextRequest) {
  // 10 answers per IP per hour
  const limited = await rateGuard(request, 'answers', 10, 3600)
  if (limited) return limited

  let body: { questionId?: string; answerBody?: string; ref?: string; authorAttribution?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { questionId, answerBody, ref, authorAttribution } = body

  // Validate inputs
  if (!answerBody || typeof answerBody !== 'string' || answerBody.trim().length === 0) {
    return NextResponse.json({ error: 'Answer body is required' }, { status: 400 })
  }
  if (answerBody.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: `Answer must be ${MAX_BODY_LENGTH} characters or fewer` }, { status: 400 })
  }
  // author_attribution is a single optional freeform field (AGENTS.md #2) — never
  // required, never format-validated; only length-capped to match the DB column.
  const attribution = typeof authorAttribution === 'string' ? authorAttribution.trim().slice(0, 80) : null
  if (!questionId || typeof questionId !== 'string') {
    return NextResponse.json({ error: 'questionId is required' }, { status: 400 })
  }
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(questionId)) {
    return NextResponse.json({ error: 'Invalid questionId format' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Verify the question exists and accepts answers (spotlight OR published — NOT draft)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: question, error: questionError } = await (supabase as any)
    .from('questions')
    .select('id, status')
    .eq('id', questionId)
    .in('status', ['spotlight', 'published'])
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
      author_attribution: attribution,
    })
    .select('id, status')
    .single()

  if (insertError || !answer) {
    console.error('Answer insert error:', insertError)
    return NextResponse.json({ error: 'Failed to save answer' }, { status: 500 })
  }

  // Mark the nomination used if this answer came via an invite link. Runs inside
  // after() (was a bare fire-and-forget promise) so Vercel keeps the invocation
  // alive until it completes, and any failure is logged instead of silently
  // swallowed by a `.catch(() => {})` no-op (L1).
  if (ref) {
    after(async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: markError } = await (supabase as any)
          .from('nominations')
          .update({ used_at: new Date().toISOString() })
          .eq('token', ref) // ref is the opaque invite token, not a row id
          .is('used_at', null) // only mark once
          .gte('expires_at', new Date().toISOString()) // only if not expired
        if (markError) {
          console.error(`Failed to mark nomination used from invite ref: ${markError.message}`)
        }
      } catch (err) {
        console.error('Nomination mark-used error:', err)
      }
    })
  }

  // Trigger OpenAI moderation after the response is sent. `after()` keeps the
  // serverless invocation alive until this completes — a bare fire-and-forget
  // fetch() is killed when the function returns on Vercel, leaving answers stuck
  // in 'pending' (never auto-approved, never surfaced via Realtime).
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://curiousif.blog'
  after(async () => {
    try {
      await fetch(`${siteUrl}/api/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': process.env.MODERATE_SECRET ?? '',
        },
        // Only the id — /api/moderate reads the stored body from the DB itself.
        body: JSON.stringify({ answerId: answer.id }),
      })
    } catch (err) {
      // Non-fatal — answer stays pending; admin can moderate manually
      console.warn('Moderation trigger failed:', err)
    }
  })

  return NextResponse.json({ id: answer.id, status: answer.status })
}
