import { createAdminClient } from '@/lib/supabase/server'
import { Answer, Question } from '@/lib/types/database'
import SiteNav from '@/components/SiteNav'
import RealtimeGrid from '@/components/RealtimeGrid'
import Link from 'next/link'

export const revalidate = 60

async function getFeaturedData(): Promise<{ question: Question | null; answers: Answer[] }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('status', 'featured')
    .single()

  if (!question) return { question: null, answers: [] }

  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('question_id', (question as Question).id)
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .limit(60)

  return { question: question as Question, answers: (answers ?? []) as Answer[] }
}

export default async function BrowsePage() {
  const { question, answers } = await getFeaturedData()

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
      </main>
    </>
  )
}
