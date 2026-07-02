import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/adminAuth'

export async function GET(request: NextRequest) {
  // Verify admin session — defense-in-depth on top of proxy.ts middleware,
  // not a replacement for it (see architecture.md).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('questions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest) {
  // Verify admin session — defense-in-depth on top of proxy.ts middleware,
  // not a replacement for it (see architecture.md).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json() as {
    id?: string
    text?: string
    whisper_line?: string | null
    accent_colour?: string
  }

  const { id, text, whisper_line, accent_colour } = body

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  if (!text?.trim()) {
    return NextResponse.json({ error: 'Question text is required' }, { status: 400 })
  }

  if (whisper_line && whisper_line.length > 80) {
    return NextResponse.json({ error: 'Whisper line must be 80 characters or fewer' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('questions')
    .update({
      text: text.trim(),
      whisper_line: whisper_line?.trim() || null,
      ...(accent_colour ? { accent_colour } : {}),
    })
    .eq('id', id)
    .eq('status', 'draft') // only allow editing drafts
    .select('id')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ id: data.id })
}

export async function POST(request: NextRequest) {
  // Verify admin session — defense-in-depth on top of proxy.ts middleware,
  // not a replacement for it (see architecture.md).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
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

  if (!['draft', 'spotlight', 'published'].includes(status)) {
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
