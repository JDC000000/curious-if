import { createAdminClient } from '@/lib/supabase/server'
import { Question } from '@/lib/types/database'
import SiteNav from '@/components/SiteNav'
import AnswerForm from '@/components/AnswerForm'
import { notFound } from 'next/navigation'

export const revalidate = 3600

interface SearchParams {
  searchParams: Promise<{ q?: string; ref?: string }>
}

async function getQuestion(questionId?: string): Promise<Question | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  if (questionId) {
    // Allow answering a specific past question
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .in('status', ['spotlight', 'published'])
      .single()
    return data as Question | null
  }

  // Default: get the featured question
  const { data } = await supabase
    .from('questions')
    .select('*')
    .eq('status', 'spotlight')
    .single()
  return data as Question | null
}

export default async function AnswerPage({ searchParams }: SearchParams) {
  const { q: questionId, ref: inviteRef } = await searchParams
  const question = await getQuestion(questionId)

  if (!question) {
    notFound()
  }

  const publishedDate = question.published_at ? new Date(question.published_at) : new Date()
  const monthName = publishedDate.toLocaleString('en-GB', { month: 'long' })
  const year = publishedDate.getFullYear()
  const monthLabel = `${monthName.toUpperCase()} ${year}`

  return (
    <>
      <SiteNav />
      <main
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          padding: '48px 24px',
          minHeight: 'calc(100vh - 56px)',
        }}
      >
        {/* Question header */}
        <div
          style={{
            marginBottom: '40px',
            paddingBottom: '32px',
            borderBottom: '1px solid #E0D9C8',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: question.accent_colour,
              marginBottom: '12px',
            }}
          >
            {monthLabel} · Curious If
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(20px, 3vw, 28px)',
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
                color: '#6B6B6B', // a11y: was rgba(26,26,26,0.55)=~#7e7c77 on cream (3.77:1); #6B6B6B clears AA 4.5:1
                lineHeight: 1.55,
              }}
            >
              {question.whisper_line}
            </p>
          )}
        </div>

        {/* Answer form (client component) */}
        <AnswerForm
          questionId={question.id}
          accentColour={question.accent_colour}
          inviteRef={inviteRef}
        />
      </main>
    </>
  )
}
