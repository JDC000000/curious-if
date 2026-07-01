import { createAdminClient } from '@/lib/supabase/server'
import { Question } from '@/lib/types/database'
import SiteNav from '@/components/SiteNav'
import HomeSubscribeStrip from '@/components/HomeSubscribeStrip'
import Link from 'next/link'

export const revalidate = 3600

async function getFeaturedData(): Promise<{ question: Question | null; answerCount: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('status', 'featured')
    .single()

  if (!question) return { question: null, answerCount: 0 }

  const { count } = await supabase
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('question_id', (question as Question).id)
    .eq('status', 'approved')

  return { question: question as Question, answerCount: count ?? 0 }
}

export default async function HomePage() {
  const { question, answerCount } = await getFeaturedData()

  return (
    <>
      <SiteNav />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!question ? (
          <HoldingState />
        ) : (
          <FeaturedQuestion question={question} answerCount={answerCount} />
        )}
      </main>
    </>
  )
}

function HoldingState() {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 56px)',
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <div>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: '28px',
            fontWeight: 300,
            color: '#3D3D3D',
            lineHeight: 1.5,
          }}
        >
          Something is coming.
        </p>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: '22px',
            fontWeight: 300,
            color: '#6B6B6B',
            marginTop: '8px',
          }}
        >
          Check back soon.
        </p>
      </div>
    </div>
  )
}

function FeaturedQuestion({ question, answerCount }: { question: Question; answerCount: number }) {
  const accentColour = question.accent_colour

  const publishedDate = question.published_at ? new Date(question.published_at) : new Date()
  const monthName = publishedDate.toLocaleString('en-GB', { month: 'long' }).toUpperCase()
  const year = publishedDate.getFullYear()

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 56px)',
        padding: '60px 24px',
      }}
    >
      <div style={{ maxWidth: '680px', width: '100%' }}>
        {/* Question card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 4px 24px rgba(26,26,46,0.10), 0 1px 4px rgba(26,26,46,0.06)',
          }}
        >
          <div style={{ height: '6px', backgroundColor: accentColour }} />

          <div style={{ padding: '48px 48px 40px' }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#6B6B6B',
                marginBottom: '28px',
              }}
            >
              {monthName} {year} · Curious If
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(26px, 4vw, 36px)',
                fontWeight: 700,
                lineHeight: 1.3,
                color: '#1A1A1A',
                letterSpacing: '-0.02em',
                marginBottom: question.whisper_line ? '20px' : '40px',
              }}
            >
              {question.text}
            </h1>

            {question.whisper_line && (
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: '17px',
                  fontWeight: 400,
                  color: 'rgba(26,26,26,0.55)',
                  lineHeight: 1.55,
                  marginBottom: '40px',
                }}
              >
                {question.whisper_line}
              </p>
            )}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link
                href="/answer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '12px 24px',
                  backgroundColor: accentColour,
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '15px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Write your reply
              </Link>
              <Link
                href="/browse"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: accentColour,
                  border: `2px solid ${accentColour}`,
                  borderRadius: '8px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '15px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Browse answers
              </Link>
              <Link
                href="/invite"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: '#6B6B6B',
                  border: '2px solid #E0D9C8',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '15px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Invite a friend
              </Link>
            </div>
          </div>
        </div>

        {/* Social proof: answer count */}
        {answerCount > 0 && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Link
              href="/browse"
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '13px',
                color: '#9A9A9A',
                textDecoration: 'none',
                letterSpacing: '0.02em',
              }}
            >
              {answerCount} {answerCount === 1 ? 'answer' : 'answers'} so far —{' '}
              <span style={{ color: accentColour, fontWeight: 600 }}>Browse →</span>
            </Link>
          </div>
        )}

        {/* Email subscribe strip */}
        <HomeSubscribeStrip accentColour={accentColour} />
      </div>
    </div>
  )
}
