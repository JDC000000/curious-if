import { createAdminClient } from '@/lib/supabase/server'
import { Question } from '@/lib/types/database'
import SiteNav from '@/components/SiteNav'
import Link from 'next/link'
import { ACCENTS } from '@/lib/palette'

export const revalidate = 3600

type QuestionWithCount = Question & { answer_count: number }

async function getArchive(): Promise<QuestionWithCount[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data } = await supabase
    .from('questions')
    .select('*')
    .in('status', ['published', 'featured'])
    .order('published_at', { ascending: false })

  if (!data) return []

  const withCounts = await Promise.all(
    (data as Question[]).map(async (q) => {
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px',
              alignItems: 'start',
            }}
          >
            {questions.map(q => {
              const accent = accentForQuestion(q)
              const date = q.published_at ? new Date(q.published_at) : new Date()
              const monthName = date.toLocaleString('en-GB', { month: 'long' })
              const year = date.getFullYear()
              const href = `/browse/${year}/${String(date.getMonth() + 1).padStart(2, '0')}`
              const isFeatured = q.status === 'featured'

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
                      boxShadow: isFeatured
                        ? `0 4px 16px rgba(26,26,46,0.12), 0 0 0 2px ${accent}33`
                        : '0 2px 8px rgba(26,26,46,0.08)',
                      transition: 'box-shadow 150ms ease, transform 150ms ease',
                      cursor: 'pointer',
                    }}
                    className="archive-deck-card"
                  >
                    <div style={{ height: '5px', backgroundColor: accent }} />
                    <div style={{ padding: '22px 24px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            fontWeight: 500,
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            color: accent,
                          }}
                        >
                          {monthName} {year}
                        </div>
                        {isFeatured && (
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '9px',
                            fontWeight: 500,
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                            color: accent,
                            border: `1px solid ${accent}55`,
                            borderRadius: '3px',
                            padding: '2px 6px',
                          }}>
                            This month
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '16px',
                          fontWeight: 600,
                          lineHeight: 1.4,
                          color: '#1A1A1A',
                          marginBottom: '14px',
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
                        <span style={{ color: accent, fontWeight: 500 }}>Read →</span>
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
          box-shadow: 0 8px 24px rgba(26,26,46,0.14) !important;
          transform: translateY(-2px);
        }
      `}</style>
    </>
  )
}
