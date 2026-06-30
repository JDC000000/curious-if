import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

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
  let body: { answerId?: string; answerBody?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { answerId, answerBody } = body

  if (!answerId || !answerBody) {
    return NextResponse.json({ error: 'answerId and answerBody required' }, { status: 400 })
  }

  const moderationResult = await callOpenAIModeration(answerBody)
  const supabase = createAdminClient()

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
