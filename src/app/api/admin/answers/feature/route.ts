import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  // Verify admin session
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
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
