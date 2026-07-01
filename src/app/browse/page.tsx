import { createAdminClient } from '@/lib/supabase/server'
import { Answer, Question } from '@/lib/types/database'
import SiteNav from '@/components/SiteNav'
import RealtimeGrid from '@/components/RealtimeGrid'
import Link from 'next/link'

export const revalidate = 60

type QuestionWithCount = Question & { answer_count: number }

async function getFeaturedData(): Promise<{
  question: Question | null
  answers: Answer[]
  pastQuestions: QuestionWithCount[]
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('status', 'featured')
    .single()

  const answersQuery = question
    ? supabase
        .from('answers')
        .select('*')
        .eq('question_id', (question as Question).id)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false })
        .limit(60)
    : null

  const pastQuery = supabase
    .from('questions')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(12)

  const [answersResult, pastResult] = await Promise.all([
    answersQuery ?? Promise.resolve({ data: [] }),
    pastQuery,
  ])

  const pastWithCounts: QuestionWithCount[] = await Promise.all(
    ((pastResult.data ?? []) as Question[]).map(async (q) => {
      const { count } = await supabase
        .from('answers')
        .select('id', { count: 'exact', head: true })
        .eq('question_id', q.id)
        .eq('status', 'approved')
      return { ...q, answer_count: count ?? 0 }
    })
  )

  return {
    question: question as Question | null,
    answers: ((answersResult.data ?? []) as Answer[]),
    pastQuestions: pastWithCounts,
  }
}

export default async function BrowsePage() {
  const { question, answers, pastQuestions } = await getFeaturedData()

  const accentColour = question?.accent_colour ?? '#3D5A8C'
  const publishedDate = question?.published_at ? new Date(question.published_at) : new Date()
  const monthName = publishedDate.toLocaleString('en-GB', { month: 'long' })
  const year = publishedDate.getFullYear()
  const monthLabel = `${monthName.toUpperCase()} ${year}`
  const questionLabel = `${monthLabel} · Curious If`

  return (
    <>
      <SiteNav />
      <main style={{ maxWidth: '1120px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: '48px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: accentColour,
              marginBottom: '12px',
            }}
          >
            {monthLabel}
          </div>
          {question ? (
            <>
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: 'clamp(22px, 3vw, 32px)',
                  fontWeight: 700,
                  lineHeight: 1.3,
                  color: '#1A1A1A',
                  letterSpacing: '-0.02em',
                  marginBottom: question.whisper_line ? '12px' : '0',
                }}
              >
                {question.text}
              </h1>
              {question.whisper_line && (
                <p
                  style={{
                    fontFamily: 'var(--font-serif)',
                    fontStyle: 'italic',
                    fontSize: '16px',
                    color: 'rgba(26,26,26,0.55)',
                  }}
                >
                  {question.whisper_line}
                </p>
              )}
            </>
          ) : (
            <p style={{ fontFamily: 'var(--font-serif)', color: '#6B6B6B' }}>
              No question is currently featured.
            </p>
          )}

          {question && (
            <div style={{ marginTop: '24px' }}>
              <Link
                href="/answer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '10px 20px',
                  backgroundColor: accentColour,
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Write your reply
              </Link>
            </div>
          )}
        </div>

        {/* Answer count */}
        {answers.length > 0 && (
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '14px',
              color: '#6B6B6B',
              marginBottom: '32px',
            }}
          >
            {answers.length} {answers.length === 1 ? 'answer' : 'answers'} so far
          </div>
        )}

        {/* Realtime grid */}
        {question && (
          <RealtimeGrid
            initialAnswers={answers}
            questionId={question.id}
            accentColour={accentColour}
            questionLabel={questionLabel}
            month={monthLabel}
          />
        )}

        {answers.length === 0 && question && (
          <div
            style={{
              textAlign: 'center',
              padding: '80px 24px',
              color: '#6B6B6B',
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: '18px',
            }}
          >
            Be the first to answer.
          </div>
        )}

        {/* ── Past questions deck ───────────────────────────────────── */}
        {pastQuestions.length > 0 && (
          <div style={{ marginTop: '80px', paddingTop: '48px', borderTop: '1px solid #E0D9C8' }}>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(18px, 2.5vw, 24px)',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: '#1A1A1A',
                marginBottom: '6px',
              }}
            >
              Past questions
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontStyle: 'italic',
                fontSize: '15px',
                color: '#9A9A9A',
                marginBottom: '32px',
              }}
            >
              Still open for answers.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: '16px',
                alignItems: 'start',
              }}
            >
              {pastQuestions.map(q => {
                const accent = q.accent_colour ?? '#3D5A8C'
                const date = q.published_at ? new Date(q.published_at) : new Date()
                const monthName = date.toLocaleString('en-GB', { month: 'long' })
                const yr = date.getFullYear()
                const mm = String(date.getMonth() + 1).padStart(2, '0')
                const href = `/browse/${yr}/${mm}`

                return (
                  <Link key={q.id} href={href} style={{ textDecoration: 'none' }}>
                    <div
                      style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(26,26,46,0.07)',
                        transition: 'box-shadow 150ms ease, transform 150ms ease',
                      }}
                      className="past-deck-card"
                    >
                      <div style={{ height: '4px', backgroundColor: accent }} />
                      <div style={{ padding: '18px 20px 16px' }}>
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            fontWeight: 500,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: accent,
                            marginBottom: '8px',
                          }}
                        >
                          {monthName} {yr}
                        </div>
                        <p
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '15px',
                            fontWeight: 600,
                            lineHeight: 1.4,
                            color: '#1A1A1A',
                            marginBottom: '12px',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {q.text}
                        </p>
                        <div
                          style={{
                            fontFamily: 'var(--font-ui)',
                            fontSize: '12px',
                            color: '#9A9A9A',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span>{q.answer_count} {q.answer_count === 1 ? 'answer' : 'answers'}</span>
                          <span>·</span>
                          <span style={{ color: accent, fontWeight: 500 }}>Read →</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </main>
      <style>{`
        .past-deck-card:hover {
          box-shadow: 0 6px 20px rgba(26,26,46,0.13) !important;
          transform: translateY(-2px);
        }
      `}</style>
    </>
  )
}
