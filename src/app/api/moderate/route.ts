import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'

// Only an internal caller holding MODERATE_SECRET may trigger auto-moderation.
// This closes the bypass where an attacker POSTed innocent text for a stored
// offensive answer. The moderated content is ALWAYS read from the DB below.
function isAuthorizedInternalCaller(request: NextRequest): boolean {
  const secret = process.env.MODERATE_SECRET
  if (!secret) return false
  const provided = request.headers.get('x-internal-secret') ?? ''
  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

// STRICT check per TSD Task 11:
// Only approve if response?.results?.[0]?.flagged === false (boolean false)
// Any other result: true, undefined, null, missing, API error, timeout → stay 'pending'

async function callOpenAIModeration(text: string): Promise<boolean | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('OPENAI_API_KEY not set')
    return null
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000) // 8s timeout

    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: text }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      console.error('OpenAI moderation API error:', response.status)
      return null
    }

    const data = await response.json()

    // Strict check: ONLY approve if flagged is explicitly boolean false
    const flagged = data?.results?.[0]?.flagged
    return flagged === false ? false : null // null = leave as pending

  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn('OpenAI moderation timeout — answer stays pending')
    } else {
      console.error('OpenAI moderation error:', err)
    }
    return null // timeout or error → pending
  }
}

export async function POST(request: NextRequest) {
  // Auth: internal callers only (service-role-equivalent shared secret).
  if (!isAuthorizedInternalCaller(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { answerId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { answerId } = body

  if (!answerId) {
    return NextResponse.json({ error: 'answerId required' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Moderate the STORED content, never a caller-supplied body. Only pending rows.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: pending } = await (supabase as any)
    .from('answers')
    .select('body, status')
    .eq('id', answerId)
    .eq('status', 'pending')
    .single()

  if (!pending) {
    // Already moderated, missing, or not pending — nothing to do.
    return NextResponse.json({ status: 'skipped' })
  }

  const moderationResult = await callOpenAIModeration(pending.body)

  // moderationResult === false  → clean, approve it
  // moderationResult === null   → error/timeout/flagged, leave as pending
  if (moderationResult === false) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('answers')
      .update({
        status: 'approved',
        openai_flagged: false,
        approved_at: new Date().toISOString(),
      })
      .eq('id', answerId)
      .eq('status', 'pending') // Safety: only update if still pending

    if (updateError) {
      console.error('Failed to approve answer:', updateError)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    // Log to moderation_log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('moderation_log')
      .insert({ answer_id: answerId, action: 'approve', openai_flagged: false })

    // ISR revalidation — bust browse cache immediately
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: answerData } = await (supabase as any)
        .from('answers')
        .select('question:questions(published_at)')
        .eq('id', answerId)
        .single()

      revalidatePath('/')
      revalidatePath('/browse')
      const publishedAt = answerData?.question?.published_at
      if (publishedAt) {
        const d = new Date(publishedAt)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        revalidatePath(`/browse/${year}/${month}`)
      }
    } catch {
      // Non-fatal
    }

    // Fire-and-forget OG image generation (Phase 3)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://curiousif.blog'
    fetch(`${siteUrl}/api/og/${answerId}`, { method: 'POST' }).catch(() => {})

    return NextResponse.json({ status: 'approved' })
  } else {
    // Leave as pending — log the flagged/error result
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('moderation_log')
      .insert({ answer_id: answerId, action: 'reject', openai_flagged: true })

    return NextResponse.json({ status: 'pending' })
  }
}
