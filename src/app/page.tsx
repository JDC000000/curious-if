import { createAdminClient } from '@/lib/supabase/server'
import { Question } from '@/lib/types/database'
import SiteNav from '@/components/SiteNav'
import HomeSubscribeStrip from '@/components/HomeSubscribeStrip'
import ArchiveCard, { QuestionWithCount } from '@/components/ArchiveCard'
import Link from 'next/link'

export const revalidate = 3600

async function getHomeData(): Promise<{
  question: Question | null
  answerCount: number
  pastQuestions: QuestionWithCount[]
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('status', 'spotlight')
    .single()

  const answerCountQuery = question
    ? supabase
        .from('answers')
        .select('*', { count: 'exact', head: true })
        .eq('question_id', (question as Question).id)
        .eq('status', 'approved')
    : Promise.resolve({ count: 0 })

  const pastQuery = supabase
    .from('questions')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(6)

  const [{ count }, { data: pastData }] = await Promise.all([answerCountQuery, pastQuery])

  const pastQuestions: QuestionWithCount[] = await Promise.all(
    ((pastData ?? []) as Question[]).map(async (q) => {
      const { count: answerCount } = await supabase
        .from('answers')
        .select('id', { count: 'exact', head: true })
        .eq('question_id', q.id)
        .eq('status', 'approved')
      return { ...q, answer_count: answerCount ?? 0 }
    })
  )

  return {
    question: question as Question | null,
    answerCount: count ?? 0,
    pastQuestions,
  }
}

export default async function HomePage() {
  const { question, answerCount, pastQuestions } = await getHomeData()

  return (
    <>
      <SiteNav />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <IntroHero />
        <div id="question" style={{ scrollMarginTop: '72px' }}>
          {!question ? (
            <HoldingState />
          ) : (
            <FeaturedQuestion question={question} answerCount={answerCount} />
          )}
        </div>
        {pastQuestions.length > 0 && <ArchivePreview questions={pastQuestions} />}
        <AboutSection />
      </main>
      <style>{`
        .archive-deck-card:hover {
          box-shadow: 0 8px 24px rgba(26,26,46,0.14) !important;
          transform: translateY(-2px);
        }
      `}</style>
    </>
  )
}

/**
 * Condensed intro — sits above the spotlight question so a first-time
 * visitor lands on "what this is" before "answer this". Kept short on
 * purpose: the spotlight question + reply CTA below still need to clear
 * the fold on a 375px-tall mobile viewport. The exact copy is reused
 * verbatim from /about's first and closing lines (see AboutSection below
 * for the full text, still on this same page).
 */
function IntroHero() {
  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        width: '100%',
        padding: '32px 24px 4px',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 'clamp(16px, 2.4vw, 19px)',
          fontWeight: 400,
          color: '#3D3D3D',
          lineHeight: 1.5,
        }}
      >
        Once a month, a single question is posted here. Old questions stay open — there&apos;s no deadline on honesty.
      </p>
    </div>
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
        padding: '20px 24px 48px',
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

          <div style={{ padding: '36px 40px 32px' }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#6B6B6B',
                marginBottom: '20px',
              }}
            >
              {monthName} {year} · Curious If
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(24px, 4vw, 34px)',
                fontWeight: 700,
                lineHeight: 1.3,
                color: '#1A1A1A',
                letterSpacing: '-0.02em',
                marginBottom: question.whisper_line ? '16px' : '32px',
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
                  color: '#6B6B6B', // a11y: was rgba(26,26,26,0.55)=~#818181 on white (3.89:1); #6B6B6B clears AA 4.5:1
                  lineHeight: 1.55,
                  marginBottom: '32px',
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
                  padding: '14px 26px',
                  backgroundColor: '#C4703A', // primary reply CTA — operator brand spec
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '19px', // a11y: ≥19px bold = WCAG large text (3:1) so #FFF on #C4703A passes; also lifts tap target ≥44px
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
                color: '#6E6E6E',
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

/**
 * Below-the-fold archive preview — most recent past questions, reusing the
 * same ArchiveCard used by the full /archive grid. Deliberately capped
 * (not the full infinite list) with a link through to /archive for the
 * complete set.
 */
function ArchivePreview({ questions }: { questions: QuestionWithCount[] }) {
  return (
    <section
      style={{
        maxWidth: '1120px',
        margin: '0 auto',
        width: '100%',
        padding: '16px 24px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '28px',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 'clamp(20px, 3vw, 28px)',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: '#1A1A1A',
          }}
        >
          Past questions
        </h2>
        <Link
          href="/archive"
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '14px',
            fontWeight: 600,
            color: '#3D5A8C',
            textDecoration: 'none',
          }}
        >
          See full archive →
        </Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        {questions.map(q => (
          <ArchiveCard key={q.id} question={q} />
        ))}
      </div>
    </section>
  )
}

/**
 * Full About content — the complete /about copy, unchanged except the
 * "Made by" attribution (see AGENTS.md / operator request). Lives as an
 * anchor section on the homepage; /about redirects here (see
 * next.config.ts). Kept below the fold, after the spotlight question and
 * archive preview, so it doesn't compete with the primary "answer the
 * question" above-the-fold goal.
 */
function AboutSection() {
  return (
    <section
      id="about"
      style={{
        scrollMarginTop: '72px',
        maxWidth: '640px',
        margin: '0 auto',
        width: '100%',
        padding: '64px 24px 80px',
        borderTop: '1px solid rgba(26,26,26,0.08)',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 'clamp(28px, 4.5vw, 40px)',
          fontWeight: 400,
          color: '#1A1A1A',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          marginBottom: '8px',
        }}
      >
        curious if
      </h2>
      <div
        style={{
          height: '2px',
          width: '48px',
          backgroundColor: '#3D5A8C',
          marginBottom: '40px',
        }}
      />

      <div
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '18px',
          lineHeight: 1.75,
          color: '#1A1A1A',
        }}
      >
        <p style={{ marginBottom: '24px' }}>
          Once a month, a single question is posted here.
        </p>
        <p style={{ marginBottom: '24px' }}>
          Not a poll. Not a debate. Just one question — the kind you turn over in your head on a long walk or a quiet morning — and space for anyone to answer it honestly.
        </p>
        <p style={{ marginBottom: '24px' }}>
          Answers are read, not scrolled. They arrive as cards you can hold and flip. Some are one line. Some are a page. All of them are real.
        </p>
        <p style={{ marginBottom: '40px' }}>
          Old questions stay open. There&apos;s no deadline on honesty.
        </p>
      </div>

      <div
        style={{
          padding: '28px 32px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          borderLeft: '4px solid #3D5A8C',
          boxShadow: '0 2px 8px rgba(26,26,46,0.08)',
          marginBottom: '40px',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#3D5A8C',
            marginBottom: '12px',
          }}
        >
          Made by
        </p>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '16px',
            color: '#1A1A1A',
            lineHeight: 1.6,
          }}
        >
          Jon C. — someone who believes the best conversations start with the right question.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Link
          href="#question"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '12px 24px',
            backgroundColor: '#3D5A8C',
            color: '#FFFFFF',
            borderRadius: '8px',
            fontFamily: 'var(--font-ui)',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          See this month&apos;s question
        </Link>
        <Link
          href="/browse"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '12px 24px',
            backgroundColor: 'transparent',
            color: '#3D5A8C',
            border: '2px solid #3D5A8C',
            borderRadius: '8px',
            fontFamily: 'var(--font-ui)',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Read answers
        </Link>
      </div>
    </section>
  )
}
