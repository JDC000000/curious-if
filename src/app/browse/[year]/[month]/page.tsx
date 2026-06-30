import { createAdminClient } from '@/lib/supabase/server'
import { Answer, Question } from '@/lib/types/database'
import SiteNav from '@/components/SiteNav'
import RealtimeGrid from '@/components/RealtimeGrid'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const revalidate = 300

interface PageProps {
  params: Promise<{ year: string; month: string }>
}

async function getQuestionForMonth(year: number, month: number): Promise<{
  question: Question | null
  answers: Answer[]
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  // Build date range for the month
  const startDate = new Date(year, month - 1, 1).toISOString()
  const endDate = new Date(year, month, 1).toISOString()

  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .in('status', ['featured', 'published'])
    .gte('published_at', startDate)
    .lt('published_at', endDate)
    .single()

  if (!question) return { question: null, answers: [] }

  const { data: answers } = await supabase
    .from('answers')
    .select('*')
    .eq('question_id', (question as Question).id)
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .limit(100)

  return { question: question as Question, answers: (answers ?? []) as Answer[] }
}

export default async function MonthBrowsePage({ params }: PageProps) {
  const { year: yearStr, month: monthStr } = await params
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    notFound()
  }

  const { question, answers } = await getQuestionForMonth(year, month)

  if (!question) {
    notFound()
  }

  const accentColour = question.accent_colour
  const monthName = new Date(year, month - 1, 1).toLocaleString('en-GB', { month: 'long' })
  const monthLabel = `${monthName.toUpperCase()} ${year}`
  const questionLabel = `${monthLabel} · Curious If`

  return (
    <>
      <SiteNav />
      <main style={{ maxWidth: '1120px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: '12px' }}>
          <Link
            href="/archive"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              color: '#6B6B6B',
              textDecoration: 'none',
            }}
          >
            ← Archive
          </Link>
        </div>

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

          {/* Past questions still accept new answers */}
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
        </div>

        {answers.length > 0 && (
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '14px',
              color: '#6B6B6B',
              marginBottom: '32px',
            }}
          >
            {answers.length} {answers.length === 1 ? 'answer' : 'answers'}
          </div>
        )}

        <RealtimeGrid
          initialAnswers={answers}
          questionId={question.id}
          accentColour={accentColour}
          questionLabel={questionLabel}
          month={monthLabel}
        />

        {answers.length === 0 && (
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
            No answers yet. Be the first.
          </div>
        )}
      </main>
    </>
  )
}
