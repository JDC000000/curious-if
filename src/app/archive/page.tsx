import { createAdminClient } from '@/lib/supabase/server'
import { Question, ArchiveHeadline } from '@/lib/types/database'
import SiteNav from '@/components/SiteNav'
import Link from 'next/link'
import { ACCENTS } from '@/lib/palette'

export const revalidate = 3600

type QuestionWithHeadline = Question & {
  archive_headlines: ArchiveHeadline[]
  answer_count: number
}

async function getArchive(): Promise<QuestionWithHeadline[]> {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('questions')
    .select(`
      *,
      archive_headlines (id, headline, created_at)
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  if (!data) return []

  // Get answer counts for each question
  const withCounts = await Promise.all(
    (data as (Question & { archive_headlines: ArchiveHeadline[] })[]).map(async (q) => {
      const { count } = await supabase
        .from('answers')
        .select('*', { count: 'exact', head: true })
        .eq('question_id', q.id)
        .eq('status', 'approved')
      return { ...q, answer_count: count ?? 0 }
    })
  )

  return withCounts
}

function accentForQuestion(q: Question): string {
  if (q.accent_colour) return q.accent_colour
  const date = q.published_at ? new Date(q.published_at) : new Date()
  const month = date.getMonth() + 1
  return ACCENTS.find(a => a.month === month)?.hex ?? '#3D5A8C'
}

export default async function ArchivePage() {
  const questions = await getArchive()

  return (
    <>
      <SiteNav />
      <main style={{ maxWidth: '1120px', margin: '0 auto', padding: '48px 24px' }}>
        <div style={{ marginBottom: '48px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(26px, 4vw, 40px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#1A1A1A',
            }}
          >
            Archive
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: '17px',
              color: '#6B6B6B',
              marginTop: '8px',
            }}
          >
            Every question we&apos;ve asked. Still open for answers.
          </p>
        </div>

        {questions.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-ui)', color: '#6B6B6B' }}>
            No archived questions yet. Check back after the first month.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '24px',
            }}
          >
            {questions.map(q => {
              const accent = accentForQuestion(q)
              const date = q.published_at ? new Date(q.published_at) : new Date()
              const monthName = date.toLocaleString('en-GB', { month: 'long' })
              const year = date.getFullYear()
              const href = `/browse/${year}/${String(date.getMonth() + 1).padStart(2, '0')}`

              return (
                <Link
                  key={q.id}
                  href={href}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(26,26,46,0.08)',
                      transition: 'box-shadow 150ms ease, transform 150ms ease',
                      cursor: 'pointer',
                    }}
                    className="archive-deck-card"
                  >
                    <div style={{ height: '5px', backgroundColor: accent }} />
                    <div style={{ padding: '24px' }}>
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          fontWeight: 500,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          color: accent,
                          marginBottom: '12px',
                        }}
                      >
                        {monthName} {year}
                      </div>
                      <p
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '16px',
                          fontWeight: 600,
                          lineHeight: 1.4,
                          color: '#1A1A1A',
                          marginBottom: '16px',
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
                          fontSize: '13px',
                          color: '#9A9A9A',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span>{q.answer_count} {q.answer_count === 1 ? 'answer' : 'answers'}</span>
                        <span>·</span>
                        <span style={{ color: accent }}>Read →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>
      <style>{`
        .archive-deck-card:hover {
          box-shadow: 0 8px 24px rgba(26,26,46,0.14);
          transform: translateY(-2px);
        }
      `}</style>
    </>
  )
}
