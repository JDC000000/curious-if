import { createAdminClient } from '@/lib/supabase/server'
import { Question } from '@/lib/types/database'
import SiteNav from '@/components/SiteNav'
import ArchiveCard, { QuestionWithCount } from '@/components/ArchiveCard'

export const revalidate = 3600

async function getArchive(): Promise<QuestionWithCount[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data } = await supabase
    .from('questions')
    .select('*')
    .in('status', ['published', 'spotlight'])
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
            {questions.map(q => (
              <ArchiveCard key={q.id} question={q} isFeatured={q.status === 'spotlight'} />
            ))}
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
