import { createClient, createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Question } from '@/lib/types/database'
import Link from 'next/link'
import QuestionPublishButton from '@/components/QuestionPublishButton'

export const dynamic = 'force-dynamic'

interface QuestionWithCount extends Question {
  answer_count: number
}

async function getAllQuestions(): Promise<QuestionWithCount[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createAdminClient() as any

  const { data } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false })

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

const STATUS_STYLES: Record<string, { label: string; bg: string; colour: string }> = {
  featured: { label: 'Featured', bg: '#F0FDF4', colour: '#2E6B45' },
  draft:    { label: 'Draft',    bg: '#FFFBEB', colour: '#92400E' },
  published:{ label: 'Published',bg: '#F0F4FF', colour: '#3D5A8C' },
}

export default async function AdminQuestionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const questions = await getAllQuestions()
  const featured = questions.filter(q => q.status === 'featured')
  const drafts    = questions.filter(q => q.status === 'draft')
  const published = questions.filter(q => q.status === 'published')

  const groups = [
    { title: 'Featured', items: featured },
    { title: 'Drafts',   items: drafts },
    { title: 'Published', items: published },
  ].filter(g => g.items.length > 0)

  return (
    <>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'rgba(26,26,26,0.96)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/admin" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '18px', color: '#F8F3E9', textDecoration: 'none' }}>
            curious if
          </Link>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(248,243,233,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Questions
          </span>
        </div>
        <Link
          href="/admin/questions/new"
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '13px',
            fontWeight: 600,
            color: '#F8F3E9',
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '6px',
            padding: '6px 14px',
            textDecoration: 'none',
          }}
        >
          + New question
        </Link>
      </div>

      <main style={{ maxWidth: '860px', margin: '0 auto', padding: '40px 24px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 700, color: '#1A1A1A', letterSpacing: '-0.02em', marginBottom: '4px' }}>
              Questions
            </h1>
            <p style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', color: '#6B6B6B' }}>
              {questions.length} total · {featured.length} featured · {drafts.length} {drafts.length === 1 ? 'draft' : 'drafts'}
            </p>
          </div>
          <Link href="/admin" style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: '#6B6B6B', textDecoration: 'none' }}>
            ← Dashboard
          </Link>
        </div>

        {questions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', backgroundColor: '#FFFFFF', borderRadius: '12px', boxShadow: '0 2px 8px rgba(26,26,46,0.08)' }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '18px', color: '#6B6B6B', marginBottom: '24px' }}>
              No questions yet.
            </p>
            <Link href="/admin/questions/new" style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 600, color: '#3D5A8C', textDecoration: 'none' }}>
              Create your first question →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {groups.map(group => (
              <section key={group.title}>
                <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9A9A9A', marginBottom: '16px' }}>
                  {group.title}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', backgroundColor: '#E8E0CC', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(26,26,46,0.08)' }}>
                  {group.items.map((q) => {
                    const statusStyle = STATUS_STYLES[q.status] ?? STATUS_STYLES.draft
                    const date = q.published_at ?? q.created_at
                    const dateStr = new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

                    return (
                      <div key={q.id} style={{ backgroundColor: '#FFFFFF', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Colour swatch */}
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: q.accent_colour, flexShrink: 0 }} />

                        {/* Question text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '15px',
                            fontWeight: 600,
                            color: '#1A1A1A',
                            lineHeight: 1.35,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            marginBottom: q.whisper_line ? '2px' : '0',
                          }}>
                            {q.text}
                          </p>
                          {q.whisper_line && (
                            <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '13px', color: '#9A9A9A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {q.whisper_line}
                            </p>
                          )}
                        </div>

                        {/* Answer count */}
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#9A9A9A', flexShrink: 0 }}>
                          {q.answer_count} {q.answer_count === 1 ? 'answer' : 'answers'}
                        </div>

                        {/* Date */}
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#BABABA', flexShrink: 0, width: '90px', textAlign: 'right' }}>
                          {dateStr}
                        </div>

                        {/* Status badge */}
                        <div style={{
                          flexShrink: 0,
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          fontWeight: 500,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          color: statusStyle.colour,
                          backgroundColor: statusStyle.bg,
                          borderRadius: '4px',
                          padding: '3px 8px',
                        }}>
                          {statusStyle.label}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignItems: 'center' }}>
                          {q.status === 'draft' && (
                            <>
                              <Link
                                href={`/admin/questions/new?edit=${q.id}`}
                                style={{
                                  fontFamily: 'var(--font-ui)',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: '#6B6B6B',
                                  border: '1px solid #E0D9C8',
                                  borderRadius: '5px',
                                  padding: '5px 10px',
                                  textDecoration: 'none',
                                }}
                              >
                                Edit
                              </Link>
                              <QuestionPublishButton questionId={q.id} accentColour={q.accent_colour} />
                            </>
                          )}
                          {q.status !== 'draft' && (
                            <Link
                              href={`/browse/${new Date(q.published_at ?? q.created_at).getFullYear()}/${String(new Date(q.published_at ?? q.created_at).getMonth() + 1).padStart(2, '0')}`}
                              style={{
                                fontFamily: 'var(--font-ui)',
                                fontSize: '12px',
                                fontWeight: 600,
                                color: '#6B6B6B',
                                border: '1px solid #E0D9C8',
                                borderRadius: '5px',
                                padding: '5px 10px',
                                textDecoration: 'none',
                              }}
                            >
                              View →
                            </Link>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
