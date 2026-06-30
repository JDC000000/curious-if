import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Verify admin session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as {
    text?: string
    whisper_line?: string | null
    accent_colour?: string
    status?: string
  }

  const { text, whisper_line, accent_colour, status = 'draft' } = body

  if (!text?.trim()) {
    return NextResponse.json({ error: 'Question text is required' }, { status: 400 })
  }

  if (whisper_line && whisper_line.length > 80) {
    return NextResponse.json(
      { error: 'Whisper line must be 80 characters or fewer' },
      { status: 400 }
    )
  }

  if (!accent_colour) {
    return NextResponse.json({ error: 'Accent colour is required' }, { status: 400 })
  }

  if (!['draft', 'featured', 'published'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  const { data, error } = await adminClient
    .from('questions')
    .insert({
      text: text.trim(),
      whisper_line: whisper_line?.trim() || null,
      accent_colour,
      status,
    })
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id }, { status: 201 })
}
