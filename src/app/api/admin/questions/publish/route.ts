import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Verify admin session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { questionId } = body

  if (!questionId || typeof questionId !== 'string') {
    return NextResponse.json({ error: 'questionId is required' }, { status: 400 })
  }

  try {
    const adminClient = createAdminClient()

    // Call the atomic publish function
    const { error } = await adminClient.rpc('publish_question', {
      new_question_id: questionId,
    })

    if (error) {
      console.error('Publish error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger ISR revalidation
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://curiousif.blog'
      await fetch(`${siteUrl}/api/revalidate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REVALIDATE_SECRET ?? ''}`,
        },
        body: JSON.stringify({ paths: ['/', '/browse', '/archive'] }),
      })
    } catch (revalidateError) {
      // Non-fatal — ISR will revalidate on next request anyway
      console.warn('Revalidation request failed:', revalidateError)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unexpected publish error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
