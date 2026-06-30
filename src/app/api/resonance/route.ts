import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  let body: { answerId?: string; action?: 'add' | 'remove' }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { answerId, action } = body

  if (!answerId || !action || !['add', 'remove'].includes(action)) {
    return NextResponse.json({ error: 'answerId and action (add|remove) required' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  // Use RPC-style increment to avoid race conditions
  const delta = action === 'add' ? 1 : -1

  const { data, error } = await supabase.rpc('increment_resonance', {
    answer_id: answerId,
    delta,
  })

  if (error) {
    // Fallback: manual update (in case RPC isn't deployed yet)
    const { data: current } = await supabase
      .from('answers')
      .select('resonance_count')
      .eq('id', answerId)
      .single()

    if (!current) {
      return NextResponse.json({ error: 'Answer not found' }, { status: 404 })
    }

    const newCount = Math.max(0, (current.resonance_count ?? 0) + delta)

    const { data: updated, error: updateError } = await supabase
      .from('answers')
      .update({ resonance_count: newCount })
      .eq('id', answerId)
      .select('resonance_count')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ count: updated.resonance_count })
  }

  return NextResponse.json({ count: data ?? 0 })
}
