import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/adminAuth'

export async function POST(request: NextRequest) {
  // Verify admin session — defense-in-depth on top of proxy.ts middleware,
  // not a replacement for it (see architecture.md).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { answerId, featured } = await request.json() as { answerId?: string; featured?: boolean }

  if (!answerId || typeof featured !== 'boolean') {
    return NextResponse.json({ error: 'answerId and featured (boolean) are required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('answers')
    .update({ is_featured: featured })
    .eq('id', answerId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, is_featured: featured })
}
