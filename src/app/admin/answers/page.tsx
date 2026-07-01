import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { decrypt, decryptEmail } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

interface ApprovedAnswer {
  id: string
  body: string
  resonance_count: number
  is_featured: boolean
  approved_at: string | null
  created_at: string
  question: { id: string; text: string; accent_colour: string; published_at: string | null } | null
  submitter: { email: string | null; name: string | null } | null
}

async function getApprovedAnswers(): Promise<ApprovedAnswer[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data } = await supabase
    .from('answers')
    .select(`
      id, body, resonance_count, is_featured, approved_at, created_at,
      question:questions(id, text, accent_colour, published_at),
      submitter:submitters(email_encrypted, name_encrypted)
    `)
    .eq('status', 'approved')
    .order('resonance_count', { ascending: false })
    .order('approved_at', { ascending: false })
    .limit(200)

  type RawAnswer = Omit<ApprovedAnswer, 'submitter'> & {
    submitter: { email_encrypted: string | null; name_encrypted: string | null } | null
  }

  // Decrypt submitter PII server-side for the admin view only.
  return ((data ?? []) as RawAnswer[]).map(a => ({
    ...a,
    submitter: a.submitter
      ? {
          email: a.submitter.email_encrypted ? decryptEmail(a.submitter.email_encrypted) : null,
          name: a.submitter.name_encrypted ? decrypt(a.submitter.name_encrypted) : null,
        }
      : null,
  }))
}

export default async function AdminAnswersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const answers = await getApprovedAnswers()
  const totalResonance = answers.reduce((sum, a) => sum + (a.resonance_count ?? 0), 0)
  const featured = answers.filter(a => a.is_featured).length

  return (
    <>
      {/* Nav bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        backgroundColor: 'rgba(26,26,26,0.96)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        height: '56px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/admin" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '18px', color: '#F8F3E9', textDecoration: 'none' }}>
            curious if
          </Link>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(248,243,233,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Answers
          </span>
        </div>
        <Link href="/admin" style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: 'rgba(248,243,233,0.5)', textDecoration: 'none' }}>
          ← Dashboard
        </Link>
      </div>

      <main style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px' }}>

        {/* Header + stats */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '16px' }}>
            Published answers
          </h1>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {[
              { label: 'Total answers', value: answers.length },
              { label: 'Editor\'s picks', value: featured },
              { label: 'Total resonances', value: totalResonance },
            ].map(stat => (
              <div key={stat.label} style={{
                backgroundColor: '#FFFFFF', borderRadius: '10px', padding: '16px 20px',
                boxShadow: '0 2px 8px rgba(26,26,46,0.08)', minWidth: '120px',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 700, color: '#1A1A1A', marginBottom: '2px' }}>
                  {stat.value}
                </div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: '#9A9A9A' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {answers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', backgroundColor: '#FFFFFF', borderRadius: '12px', boxShadow: '0 2px 8px rgba(26,26,46,0.08)' }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '18px', color: '#6B6B6B' }}>
              No published answers yet.
            </p>
          </div>
        ) : (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', boxShadow: '0 2px 8px rgba(26,26,46,0.08)', overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 140px 60px 56px 80px',
              gap: '12px',
              padding: '10px 20px',
              backgroundColor: '#F8F3E9',
              borderBottom: '1px solid #E8E0CC',
            }}>
              {['Answer', 'Submitter', 'Question', '◇', 'Date'].map(h => (
                <div key={h} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9A9A9A' }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            {answers.map((answer, i) => {
              const accent = answer.question?.accent_colour ?? '#9A9A9A'
              const date = answer.approved_at ?? answer.created_at
              const dateStr = new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              const q = answer.question
              const pub = q?.published_at ? new Date(q.published_at) : null
              const monthShort = pub ? pub.toLocaleString('en-GB', { month: 'short' }) : '—'

              return (
                <div
                  key={answer.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 140px 60px 56px 80px',
                    gap: '12px',
                    padding: '14px 20px',
                    borderBottom: i < answers.length - 1 ? '1px solid #F0EAD8' : 'none',
                    alignItems: 'center',
                    backgroundColor: answer.is_featured ? '#FFFEF8' : '#FFFFFF',
                  }}
                >
                  {/* Answer body */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      {answer.is_featured && (
                        <span style={{ color: '#B8902A', fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>★</span>
                      )}
                      <div>
                        <p style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '14px',
                          lineHeight: 1.5,
                          color: '#1A1A1A',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          margin: 0,
                        }}>
                          {answer.body}
                        </p>
                        <Link
                          href={`/answers/${answer.id}`}
                          target="_blank"
                          style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: accent, textDecoration: 'none', letterSpacing: '0.04em' }}
                        >
                          view ↗
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Submitter */}
                  <div style={{ minWidth: 0 }}>
                    {answer.submitter?.email ? (
                      <>
                        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: '#3D3D3D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {answer.submitter.name ?? 'No name'}
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#9A9A9A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {answer.submitter.email}
                        </div>
                      </>
                    ) : (
                      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: '#BABABA' }}>Anonymous</span>
                    )}
                  </div>

                  {/* Question month */}
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: accent,
                    letterSpacing: '0.04em',
                  }}>
                    {monthShort}
                  </div>

                  {/* Resonance */}
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: answer.resonance_count > 0 ? 600 : 400,
                    color: answer.resonance_count > 0 ? '#1A1A1A' : '#BABABA',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    {answer.resonance_count > 0 ? '◆' : '◇'}
                    {answer.resonance_count > 0 && <span>{answer.resonance_count}</span>}
                  </div>

                  {/* Date */}
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#BABABA' }}>
                    {dateStr}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </>
  )
}
