import { ImageResponse } from 'next/og'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://curiousif.blog'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function getAnswerData(answerId: string) {
  // Reject anything that isn't a bare UUID before it reaches the PostgREST query
  // string — stops param injection (e.g. &or=(status.eq.pending)) that could
  // surface unapproved answer bodies.
  if (!UUID_RE.test(answerId)) return null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Exclude seed answers from OG pipeline — they are temporary scaffolding
  const answerRes = await fetch(
    `${supabaseUrl}/rest/v1/answers?id=eq.${answerId}&status=eq.approved&is_seed=eq.false&select=body,question_id,approved_at`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  )
  const answers = await answerRes.json()
  if (!answers?.[0]) return null
  const answer = answers[0]

  const questionRes = await fetch(
    `${supabaseUrl}/rest/v1/questions?id=eq.${answer.question_id}&select=text,accent_colour,published_at`,
    { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
  )
  const questions = await questionRes.json()
  if (!questions?.[0]) return null

  return { answer, question: questions[0] }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ answerId: string }> }
) {
  const { answerId } = await params
  // Pre-launch cost guard (security review 2026-09-30): random ids used to force an uncached
  // edge render + 2 Supabase reads each. Reject non-UUIDs before any DB call or render.
  if (!UUID.test(answerId)) return new NextResponse('Not found', { status: 404 })
  const data = await getAnswerData(answerId)

  if (!data) {
    // Return a branded fallback OG image
    return new ImageResponse(
      <FallbackCard />,
      { width: 1200, height: 630, headers: { 'Cache-Control': CACHE } }
    )
  }

  const { answer, question } = data
  const publishedDate = question.published_at ? new Date(question.published_at) : new Date()
  const monthName = publishedDate.toLocaleString('en-GB', { month: 'long' }).toUpperCase()
  const year = publishedDate.getFullYear()
  const monthLabel = `${monthName} ${year}`

  // Truncate answer text for OG image
  const preview = answer.body.length > 180
    ? answer.body.slice(0, 177) + '…'
    : answer.body

  return new ImageResponse(
    <AnswerCard
      preview={preview}
      questionText={question.text}
      monthLabel={monthLabel}
      accentColour={question.accent_colour ?? '#3D5A8C'}
    />,
    { width: 1200, height: 630, headers: { 'Cache-Control': CACHE } }
  )
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// CDN-cache each card for an hour (serve stale for a day while revalidating), so crawlers and
// share previews re-hitting the same answer don't re-render it every time.
const CACHE = 'public, s-maxage=3600, stale-while-revalidate=86400'

// POST from moderate route — fire-and-forget cache warm
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ answerId: string }> }
) {
  return GET(request, context)
}

function AnswerCard({
  preview,
  questionText,
  monthLabel,
  accentColour,
}: {
  preview: string
  questionText: string
  monthLabel: string
  accentColour: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#F8F3E9',
        fontFamily: 'Georgia, serif',
      }}
    >
      {/* Accent stripe */}
      <div style={{ height: '10px', backgroundColor: accentColour, flexShrink: 0 }} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          padding: '64px 80px 56px',
          justifyContent: 'space-between',
        }}
      >
        {/* Wordmark */}
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            fontSize: '28px',
            fontWeight: 400,
            color: '#1A1A1A',
            letterSpacing: '-0.01em',
          }}
        >
          curious if
        </div>

        {/* Answer text */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '13px',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: accentColour,
            }}
          >
            {`${monthLabel} · CURIOUS IF`}
          </div>

          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '36px',
              fontWeight: 400,
              fontStyle: 'italic',
              lineHeight: 1.45,
              color: '#1A1A1A',
              letterSpacing: '-0.01em',
            }}
          >
            {`“${preview}”`}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              fontFamily: 'Georgia, serif',
              fontStyle: 'italic',
              fontSize: '16px',
              color: '#6B6B6B',
              maxWidth: '700px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {`In response to: ${questionText}`}
          </div>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '14px',
              color: '#6E6E6E',
              letterSpacing: '0.05em',
            }}
          >
            curiousif.blog
          </div>
        </div>
      </div>
    </div>
  )
}

function FallbackCard() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: '#F8F3E9',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Georgia, serif',
      }}
    >
      <div style={{ fontSize: '48px', fontStyle: 'italic', color: '#1A1A1A', letterSpacing: '-0.02em' }}>
        curious if
      </div>
      <div style={{ marginTop: '16px', fontSize: '20px', color: '#6B6B6B', fontStyle: 'italic' }}>
        One question. Once a month.
      </div>
      <div style={{ marginTop: '32px', fontFamily: 'monospace', fontSize: '14px', color: '#6E6E6E', letterSpacing: '0.08em' }}>
        CURIOUSIF.BLOG
      </div>
    </div>
  )
}
