import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SiteNav from '@/components/SiteNav'
import ModerationQueue from '@/components/ModerationQueue'

export const dynamic = 'force-dynamic'

interface PendingAnswer {
  id: string
  body: string
  created_at: string
  is_featured: boolean
  question: { text: string; accent_colour: string } | null
}

async function getPendingAnswers(): Promise<PendingAnswer[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data } = await supabase
    .from('answers')
    .select(`
      id,
      body,
      created_at,
      is_featured,
      question:questions(text, accent_colour)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50)

  return (data ?? []) as PendingAnswer[]
}

export default async function ModerationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  const pending = await getPendingAnswers()

  return (
    <>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'rgba(26,26,26,0.96)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
        }}
      >
        <a
          href="/admin"
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: '18px',
            color: '#F8F3E9',
            textDecoration: 'none',
          }}
        >
          curious if
        </a>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: 'rgba(248,243,233,0.5)',
            marginLeft: '16px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Moderation
        </span>
      </div>

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '24px',
                fontWeight: 700,
                color: '#1A1A1A',
                letterSpacing: '-0.02em',
              }}
            >
              Pending answers
            </h1>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: '#6B6B6B', marginTop: '4px' }}>
              {pending.length} {pending.length === 1 ? 'answer' : 'answers'} awaiting review
            </p>
          </div>
          <a
            href="/admin"
            style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: '#6B6B6B', textDecoration: 'none' }}
          >
            ← Dashboard
          </a>
        </div>

        {pending.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 24px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(26,26,46,0.08)',
            }}
          >
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '18px', color: '#6B6B6B' }}>
              All clear. No pending answers.
            </p>
          </div>
        ) : (
          <ModerationQueue initialAnswers={pending} />
        )}
      </main>
    </>
  )
}
