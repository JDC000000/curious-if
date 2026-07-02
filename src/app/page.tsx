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

/**
 * Homepage order (operator-directed, see curious-if-manager changelog):
 *   1. About — the "curious if" wordmark + full mission copy at the very top,
 *      so a first-time visitor lands on *what this is* before anything else.
 *   2. This month's question, posted directly (not hidden behind a wall of
 *      buttons) with a simple read-or-answer call to action.
 *   3. Past questions below the fold, with a link through to the full archive.
 */
export default async function HomePage() {
  const { question, answerCount, pastQuestions } = await getHomeData()

  return (
    <>
      <SiteNav />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AboutSection />
        <div id="question" style={{ scrollMarginTop: '72px' }}>
          {!question ? (
            <HoldingState />
          ) : (
            <FeaturedQuestion question={question} answerCount={answerCount} />
          )}
        </div>
        {pastQuestions.length > 0 && <ArchivePreview questions={pastQuestions} />}
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
 * Top-of-page About — the full mission copy (identical wording to the old
 * /about) now leads the homepage, wider than before so it fills the screen.
 * Keeps the id="about" anchor so /about (→ /#about 308) and the nav/footer
 * "About" links still land on this copy — now simply the top of the page.
 * The wordmark is the page's single <h1>; the month's question below is an
 * <h2> section under it.
 */
function AboutSection() {
  return (
    <section
      id="about"
      style={{
        scrollMarginTop: '72px',
        // Wider than the old 640px so the copy takes up more of the screen
        // (operator request). width:100% + horizontal padding means mobile is
        // still viewport-constrained — this only widens at desktop breakpoints.
        maxWidth: '780px',
        margin: '0 auto',
        width: '100%',
        padding: '48px 24px 40px',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 'clamp(30px, 5vw, 48px)',
          fontWeight: 400,
          color: '#1A1A1A',
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          marginBottom: '8px',
        }}
      >
        curious if
      </h1>
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
          fontSize: 'clamp(18px, 2.2vw, 20px)',
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
    </section>
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

/**
 * This month's question, posted directly under the About copy. The call to
 * action is deliberately simple — read or answer — rather than a row of equal
 * buttons: a primary "Answer this question" (brand terracotta #C4703A) and a
 * "Read the answers" companion, with "invite a friend" demoted to a quiet
 * secondary link so the question isn't buried behind buttons.
 */
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

          <div className="q-card-body" style={{ padding: '36px 40px 32px' }}>
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

            <h2
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
            </h2>

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

            {/* Read or answer — two clear options, not a wall of buttons */}
            <div className="q-cta-row" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Link
                className="q-cta-btn"
                href="/browse"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: '#1A1A1A', // ink text (not the accent) so it clears AA at this size
                  border: `2px solid ${accentColour}`,
                  borderRadius: '8px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '18px',
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Read the answers
              </Link>
              <Link
                className="q-cta-btn"
                href="/answer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '14px 26px',
                  backgroundColor: '#C4703A', // primary reply CTA — operator brand spec (do not change)
                  color: '#FFFFFF',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-ui)',
                  fontSize: '19px', // a11y: ≥19px bold = WCAG large text (3:1) so #FFF on #C4703A passes; also lifts tap target ≥44px
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                Answer this question
              </Link>
            </div>

            {/* Invite — demoted to a quiet secondary link, not a co-equal button */}
            <div style={{ marginTop: '18px' }}>
              <Link
                href="/invite"
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontSize: '14px',
                  color: '#6E6E6E', // AA on white (≈4.6:1)
                  textDecoration: 'none',
                }}
              >
                Or invite a friend to answer →
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
      <style>{`
        /* Small phones (≈320px): tighten the card's inner padding and stack the
           two CTAs full-width so "Read the answers" / "Answer this question"
           each keep to a single line and read as a clean pair. */
        @media (max-width: 480px) {
          .q-card-body { padding: 28px 22px 26px !important; }
          .q-cta-row { flex-direction: column; align-items: stretch !important; }
          .q-cta-btn { justify-content: center; }
        }
      `}</style>
    </div>
  )
}

/**
 * Below-the-fold archive preview — the very bottom of the page (operator
 * request: past questions belong at the end). Most recent past questions,
 * reusing the same ArchiveCard as the full /archive grid, capped with a
 * "See full archive" link through to the complete set.
 */
function ArchivePreview({ questions }: { questions: QuestionWithCount[] }) {
  return (
    <section
      style={{
        maxWidth: '1120px',
        margin: '0 auto',
        width: '100%',
        padding: '32px 24px 56px',
        borderTop: '1px solid rgba(26,26,26,0.08)',
        marginTop: '16px',
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
