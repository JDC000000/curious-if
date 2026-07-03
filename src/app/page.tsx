import { createAdminClient } from '@/lib/supabase/server'
import { Answer, Question } from '@/lib/types/database'
import SiteNav from '@/components/SiteNav'
import HomeSubscribeStrip from '@/components/HomeSubscribeStrip'
import ArchiveCard, { QuestionWithCount } from '@/components/ArchiveCard'
import Link from 'next/link'

export const revalidate = 3600

async function getHomeData(): Promise<{
  question: Question | null
  answerCount: number
  answers: Answer[]
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

  // A few answers to preview on the homepage — reuses the same query shape
  // /browse uses (approved answers for the spotlight question, seed answers
  // included). Best-first (most resonance), then most recently approved.
  const answersQuery = question
    ? supabase
        .from('answers')
        .select('*')
        .eq('question_id', (question as Question).id)
        .eq('status', 'approved')
        .order('resonance_count', { ascending: false })
        .order('approved_at', { ascending: false })
        .limit(3)
    : Promise.resolve({ data: [] })

  const pastQuery = supabase
    .from('questions')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(6)

  const [{ count }, { data: pastData }, { data: answersData }] = await Promise.all([
    answerCountQuery,
    pastQuery,
    answersQuery,
  ])

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
    answers: (answersData ?? []) as Answer[],
    pastQuestions,
  }
}

/**
 * Homepage order (operator-directed, see curious-if-manager changelog):
 *   1. About — the "curious if" wordmark + full mission copy at the very top,
 *      so a first-time visitor lands on *what this is* before anything else.
 *   2. This month's question, posted directly (not hidden behind a wall of
 *      buttons) with a simple answer-or-read call to action, plus a preview of
 *      a few real answers so visitors see what people said without leaving.
 *   3. Past questions below the fold, with a link through to the full archive.
 */
export default async function HomePage() {
  const { question, answerCount, answers, pastQuestions } = await getHomeData()

  return (
    <>
      <SiteNav />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AboutSection />
        <div id="question" style={{ scrollMarginTop: '72px' }}>
          {!question ? (
            <HoldingState />
          ) : (
            <FeaturedQuestion question={question} answerCount={answerCount} answers={answers} />
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
        // Tighter bottom padding so the copy runs straight into the question
        // (operator: "It should go right into the question").
        padding: '48px 24px 8px',
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
          Once a month, one honest question — not a poll, not a debate. Just something worth answering.
        </p>
        <p style={{ marginBottom: '24px' }}>
          Answers arrive as cards to hold and flip. Some are a line. Some are a page. All are real.
        </p>
        <p style={{ marginBottom: 0 }}>
          Old questions stay open. No deadline on honesty.
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
 * Darken a per-month accent hex enough to read as small metadata text on the
 * cream card at WCAG AA (the raw mid-tone accents fail at 11px). Generalises the
 * Option-C mockup's hand-darkened ochre eyebrow to every month's accent, so the
 * date stamp stays tinted with the month's colour without a new hardcoded token.
 */
function darkenAccent(hex: string): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim())
  if (!m) return '#6B6B6B'
  const n = parseInt(m[1], 16)
  const scale = 0.55
  const r = Math.round(((n >> 16) & 0xff) * scale)
  const g = Math.round(((n >> 8) & 0xff) * scale)
  const b = Math.round((n & 0xff) * scale)
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
}

/**
 * This month's question, posted directly under the About copy, followed by a
 * preview of a few real answers. Presented as the approved Option C "tactile
 * cue card" — cream stock, ink frame, accent spine down the left like a filing
 * tab, dashed rule under the date stamp, hard offset stacked-paper shadow. The
 * call to action is deliberately simple — a primary "Answer this question"
 * (brand terracotta #C4703A) leading, then a "Read the answers" companion, with
 * "invite a friend" demoted to a quiet secondary link.
 */
function FeaturedQuestion({
  question,
  answerCount,
  answers,
}: {
  question: Question
  answerCount: number
  answers: Answer[]
}) {
  const accentColour = question.accent_colour
  const eyebrowColour = darkenAccent(accentColour)

  const publishedDate = question.published_at ? new Date(question.published_at) : new Date()
  const monthName = publishedDate.toLocaleString('en-GB', { month: 'long' }).toUpperCase()
  const year = publishedDate.getFullYear()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        // Natural flow (no vertical centering) so the card sits right under the
        // About copy; a little top room lets the offset shadow breathe.
        padding: '20px 24px 40px',
      }}
    >
      <div style={{ maxWidth: '760px', width: '100%' }}>
        {/* Question card — Option C "tactile cue card": cream stock, ink frame,
            accent spine down the left like a filing tab, dashed rule under the
            date stamp, and a hard offset (no-blur) stacked-paper drop-shadow. */}
        <div
          className="q-ccard"
          style={{
            position: 'relative',
            backgroundColor: '#FCF7EC', // cream card stock
            border: '1.5px solid #23201C', // ink frame
            borderRadius: '5px',
            boxShadow: '14px 14px 0 #E7D2AE', // hard offset shadow, no blur
          }}
        >
          {/* Accent spine / filing tab — per-month accentColour */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '8px',
              backgroundColor: accentColour,
              borderRadius: '4px 0 0 4px',
            }}
          />

          <div className="q-card-body" style={{ padding: '42px 46px 40px 54px' }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: eyebrowColour, // darkened per-month accent — reads on cream at AA
                marginBottom: '14px',
              }}
            >
              {monthName} {year} · Curious If
            </div>

            {/* Dashed rule under the date stamp */}
            <div
              aria-hidden="true"
              style={{
                height: '1px',
                marginBottom: '26px',
                background:
                  'repeating-linear-gradient(90deg,#D8C3A0 0,#D8C3A0 7px,transparent 7px,transparent 14px)',
              }}
            />

            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 'clamp(28px, 4.2vw, 42px)',
                fontWeight: 700,
                lineHeight: 1.22,
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
                  fontSize: '19px',
                  fontWeight: 400,
                  color: '#6B6B6B', // AA on cream card
                  lineHeight: 1.5,
                  marginBottom: '32px',
                }}
              >
                {question.whisper_line}
              </p>
            )}

            {/* Answer (primary) leads, read (secondary) follows — operator's
                confirmed order. Two clear options, not a wall of buttons. */}
            <div className="q-cta-row" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
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

        {/* A few real answers, previewed inline so a visitor can see what
            people said without clicking through to /browse. Carries the
            "N answers so far" social proof + a "Browse all" link into its
            header, so nothing from the old count line is lost. */}
        {answers.length > 0 && (
          <AnswersPreview answers={answers} accentColour={accentColour} totalCount={answerCount} />
        )}

        {/* Email subscribe strip */}
        <HomeSubscribeStrip accentColour={accentColour} />
      </div>
      <style>{`
        /* Small phones (≈320-480px): soften the offset shadow, tighten the
           card's inner padding (matching the approved mockup), and stack the
           two CTAs full-width so both keep to a single line. */
        @media (max-width: 480px) {
          .q-ccard { box-shadow: 8px 8px 0 #E7D2AE !important; }
          .q-card-body { padding: 28px 22px 28px 30px !important; }
          .q-cta-row { flex-direction: column; align-items: stretch !important; }
          .q-cta-btn { justify-content: center; }
        }
      `}</style>
    </div>
  )
}

/**
 * Inline preview of a few real answers to the spotlight question, shown right
 * under the question card so visitors get a taste without leaving. MOCKUP for
 * operator review (see curious-if-manager changelog). Reuses the answer body +
 * author fields exactly as RealtimeGrid does; carries the "N answers so far"
 * count and a "Browse all" link in its header.
 */
function AnswersPreview({
  answers,
  accentColour,
  totalCount,
}: {
  answers: Answer[]
  accentColour: string
  totalCount: number
}) {
  return (
    <div style={{ marginTop: '28px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#6B6B6B',
          }}
        >
          {totalCount} {totalCount === 1 ? 'answer' : 'answers'} so far
        </span>
        <Link
          href="/browse"
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '13px',
            fontWeight: 600,
            color: '#6E6E6E', // a11y: accent as small text fails AA (see main's contrast sweep, 5ef8d17); accent motif stays on the card spine + preview stripes
            textDecoration: 'none',
          }}
        >
          Browse all →
        </Link>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '14px',
          alignItems: 'start',
        }}
      >
        {answers.map(a => {
          const author = a.author_attribution?.trim()
            ? a.author_attribution
            : a.author_display && a.author_display !== 'Anonymous'
              ? a.author_display
              : null
          return (
            <PreviewCard
              key={a.id}
              body={a.body}
              author={author}
              resonance={a.resonance_count ?? 0}
              accentColour={accentColour}
            />
          )
        })}
      </div>
    </div>
  )
}

/**
 * Read-only preview of a single answer — matches the CueCard front-face look
 * (cream card, accent stripe, serif body, author + resonance footer) minus the
 * flip/interaction. Deliberately not linked: seed-answer permalinks 404 by
 * design, and the point is to read a taste inline (full reading is on /browse).
 */
function PreviewCard({
  body,
  author,
  resonance,
  accentColour,
}: {
  body: string
  author: string | null
  resonance: number
  accentColour: string
}) {
  return (
    <div
      style={{
        backgroundColor: '#FDFAF3',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(26,26,46,0.10), 0 1px 3px rgba(26,26,46,0.05)',
      }}
    >
      <div style={{ height: '4px', backgroundColor: accentColour }} />
      <div style={{ padding: '16px 18px' }}>
        <p
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '15px',
            lineHeight: 1.65,
            color: '#1A1A1A',
            margin: '0 0 12px',
            display: '-webkit-box',
            WebkitLineClamp: 5,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {body}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '12px',
              fontWeight: 500,
              color: author ? '#3D3D3D' : '#BABABA',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}
          >
            {author ?? 'Anonymous'}
          </span>
          {resonance > 0 && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#BABABA', flexShrink: 0 }}>
              ◇ {resonance}
            </span>
          )}
        </div>
      </div>
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
