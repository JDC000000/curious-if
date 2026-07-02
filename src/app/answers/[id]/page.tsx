import { createAdminClient } from '@/lib/supabase/server'
import { Answer, Question } from '@/lib/types/database'
import SiteNav from '@/components/SiteNav'
import CueCard from '@/components/CueCard'
import ShareButton from '@/components/ShareButton'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

export const revalidate = 300

interface PageProps {
  params: Promise<{ id: string }>
}

async function getAnswer(id: string): Promise<{ answer: Answer; question: Question } | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data: answer } = await supabase
    .from('answers')
    .select('*')
    .eq('id', id)
    .eq('status', 'approved') // 404 for pending/rejected
    .eq('is_seed', false) // seed answers have no shareable permalinks
    .single()

  if (!answer) return null

  const { data: question } = await supabase
    .from('questions')
    .select('*')
    .eq('id', answer.question_id)
    .single()

  if (!question) return null

  return { answer: answer as Answer, question: question as Question }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const result = await getAnswer(id)
  if (!result) return { title: 'Not found — Curious If' }

  const preview = result.answer.body.slice(0, 120) + (result.answer.body.length > 120 ? '…' : '')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://curiousif.blog'

  return {
    title: `"${preview}" — Curious If`,
    description: result.question.text,
    openGraph: {
      title: preview,
      description: result.question.text,
      images: [`${siteUrl}/api/og/${id}`],
    },
    twitter: {
      card: 'summary_large_image',
      images: [`${siteUrl}/api/og/${id}`],
    },
  }
}

export default async function AnswerPermalinkPage({ params }: PageProps) {
  const { id } = await params
  const result = await getAnswer(id)

  if (!result) {
    notFound()
  }

  const { answer, question } = result
  const publishedDate = question.published_at ? new Date(question.published_at) : new Date()
  const monthName = publishedDate.toLocaleString('en-GB', { month: 'long' })
  const year = publishedDate.getFullYear()
  const monthLabel = `${monthName.toUpperCase()} ${year}`
  const questionLabel = `${monthLabel} · Curious If`

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
        <div style={{ marginBottom: '24px' }}>
          <Link
            href="/browse"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              color: '#6B6B6B',
              textDecoration: 'none',
            }}
          >
            ← Browse answers
          </Link>
        </div>

        {/* Question context */}
        <div style={{ marginBottom: '40px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: question.accent_colour,
              marginBottom: '8px',
            }}
          >
            {monthLabel}
          </div>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '17px',
              fontWeight: 600,
              color: '#3D3D3D',
              lineHeight: 1.4,
            }}
          >
            {question.text}
          </p>
        </div>

        {/* The answer card */}
        <div style={{ maxWidth: '360px', marginBottom: '48px' }}>
          <CueCard
            answer={answer.body}
            author={
              answer.author_attribution?.trim()
                ? answer.author_attribution
                : answer.author_display && answer.author_display !== 'Anonymous'
                  ? answer.author_display
                  : undefined
            }
            month={monthLabel}
            accentColour={question.accent_colour}
            questionLabel={questionLabel}
            answerId={answer.id}
          />
        </div>

        {/* Share prompt */}
        <div
          style={{
            textAlign: 'center',
            padding: '32px',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(26,26,46,0.08)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: '16px',
              color: '#6B6B6B',
              marginBottom: '20px',
            }}
          >
            How would you answer?
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href={`/answer?q=${question.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '14px 26px',
                backgroundColor: '#C4703A', // primary reply CTA — operator brand spec
                color: '#FFFFFF',
                borderRadius: '8px',
                fontFamily: 'var(--font-ui)',
                fontSize: '19px', // a11y: ≥19px bold = WCAG large text (3:1) on #C4703A; tap target ≥44px
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Write your reply
            </Link>
            <ShareButton
              url={`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://curiousif.blog'}/answers/${answer.id}`}
              text={answer.body.slice(0, 100)}
              accentColour={question.accent_colour}
            />
            <Link
              href="/browse"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: '#6B6B6B',
                border: '1px solid #E0D9C8',
                borderRadius: '8px',
                fontFamily: 'var(--font-ui)',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Browse all
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
