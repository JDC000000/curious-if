import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { isAdminEmail } from '@/lib/adminAuth'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Open-redirect guard: only relative, non protocol-relative paths.
  const rawNext = searchParams.get('next') ?? '/admin'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/admin'

  if (code) {
    const cookieStore = await cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Authorisation, not just authentication: only the curator may proceed.
      if (isAdminEmail(data.user?.email)) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      // Valid magic link but not the admin — tear down the session.
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/admin/login?error=not_authorized`)
    }
  }

  // Auth failed — redirect back to login with an error flag
  return NextResponse.redirect(`${origin}/admin/login?error=auth_failed`)
}
