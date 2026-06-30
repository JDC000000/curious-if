import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const paths: string[] = body.paths ?? ['/']

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
