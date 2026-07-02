import Link from 'next/link'
import { Question } from '@/lib/types/database'
import { accentForQuestion } from '@/lib/accent'

export type QuestionWithCount = Question & { answer_count: number }

/**
 * A single past-question card — the accent-deck cue card used by the full
 * archive grid (/archive) and reused for the homepage archive preview.
 * Keep this component the single source of truth for that card's markup;
 * don't fork a near-identical copy elsewhere.
 */
export default function ArchiveCard({
  question: q,
  isFeatured = false,
}: {
  question: QuestionWithCount
  isFeatured?: boolean
}) {
  const accent = accentForQuestion(q)
  const date = q.published_at ? new Date(q.published_at) : new Date()
  const monthName = date.toLocaleString('en-GB', { month: 'long' })
  const year = date.getFullYear()
  const href = `/browse/${year}/${String(date.getMonth() + 1).padStart(2, '0')}`

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
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
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '9px',
                  fontWeight: 500,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: accent,
                  border: `1px solid ${accent}55`,
                  borderRadius: '3px',
                  padding: '2px 6px',
                }}
              >
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
              color: '#6E6E6E',
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
}
