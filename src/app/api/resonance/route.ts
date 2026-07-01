import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { rateGuard } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  // 20 resonance toggles per IP per 10 minutes — enough for genuine browsing,
  // curbs automated count manipulation.
  const limited = await rateGuard(request, 'resonance', 20, 600)
  if (limited) return limited

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

  // Atomic increment via RPC (GREATEST(0, resonance_count + delta)) — the only
  // safe path. No read-then-write fallback: two concurrent requests would both
  // read N and write N+1, silently losing an increment.
  const { data, error } = await supabase.rpc('increment_resonance', {
    answer_id: answerId,
    delta,
  })

  if (error) {
    console.error('increment_resonance RPC failed:', error)
    return NextResponse.json({ error: 'Could not update resonance' }, { status: 500 })
  }

  return NextResponse.json({ count: data ?? 0 })
}
