import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { timingSafeEqual } from 'crypto'

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization') ?? ''
  const provided = header.startsWith('Bearer ') ? header.slice(7) : header
  const a = Buffer.from(provided)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function POST(request: NextRequest) {
  // Guard against cache-invalidation DoS — internal/webhook callers only.
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const paths: string[] = Array.isArray(body.paths) ? body.paths.slice(0, 50) : ['/']

  try {
    for (const path of paths) {
      revalidatePath(path)
    }
    return NextResponse.json({ revalidated: true, paths })
  } catch (err) {
    console.error('Revalidation error:', err)
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 })
  }
}
