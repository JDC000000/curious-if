'use client'

import { useState } from 'react'

interface PendingAnswer {
  id: string
  body: string
  created_at: string
  question: { text: string; accent_colour: string } | null
}

interface ModerationQueueProps {
  initialAnswers: PendingAnswer[]
}

type ActionState = 'idle' | 'approving' | 'rejecting' | 'done'

export default function ModerationQueue({ initialAnswers }: ModerationQueueProps) {
  const [answers, setAnswers] = useState<PendingAnswer[]>(initialAnswers)
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>({})

  const act = async (answerId: string, action: 'approve' | 'reject') => {
    setActionStates(s => ({ ...s, [answerId]: action === 'approve' ? 'approving' : 'rejecting' }))

    try {
      const res = await fetch('/api/admin/answers/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answerId, action }),
      })

      if (res.ok) {
        setActionStates(s => ({ ...s, [answerId]: 'done' }))
        // Remove from queue after a short delay (show the done state briefly)
        setTimeout(() => {
          setAnswers(prev => prev.filter(a => a.id !== answerId))
        }, 600)
      } else {
        setActionStates(s => ({ ...s, [answerId]: 'idle' }))
      }
    } catch {
      setActionStates(s => ({ ...s, [answerId]: 'idle' }))
    }
  }

  if (answers.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '80px 24px',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(26,26,46,0.08)',
        }}
      >
        <p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '18px', color: '#6B6B6B' }}>
          All clear. No pending answers.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {answers.map(answer => {
        const state = actionStates[answer.id] ?? 'idle'
        const accent = answer.question?.accent_colour ?? '#3D5A8C'
        const date = new Date(answer.created_at).toLocaleString('en-GB', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        })

        return (
          <div
            key={answer.id}
            style={{
              backgroundColor: state === 'done' ? '#F0FFF4' : '#FFFFFF',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(26,26,46,0.08)',
              opacity: state === 'done' ? 0.6 : 1,
              transition: 'opacity 300ms ease, background-color 300ms ease',
            }}
          >
            <div style={{ height: '3px', backgroundColor: accent }} />
            <div style={{ padding: '20px 24px' }}>
              {/* Question context */}
              {answer.question && (
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: 500,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: accent,
                    marginBottom: '8px',
                  }}
                >
                  Re: {answer.question.text.slice(0, 60)}{answer.question.text.length > 60 ? '…' : ''}
                </div>
              )}

              {/* Answer body */}
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '15px',
                  lineHeight: 1.65,
                  color: '#1A1A1A',
                  marginBottom: '16px',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {answer.body}
              </p>

              {/* Meta + actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#9A9A9A' }}>
                  {date}
                </span>

                {state === 'done' ? (
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: '#5C8C6B', fontWeight: 600 }}>
                    ✓ Done
                  </span>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => act(answer.id, 'approve')}
                      disabled={state !== 'idle'}
                      style={{
                        padding: '8px 20px',
                        backgroundColor: state === 'approving' ? '#5C8C6B' : '#2E6B45',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        fontFamily: 'var(--font-ui)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: state !== 'idle' ? 'not-allowed' : 'pointer',
                        opacity: state !== 'idle' && state !== 'approving' ? 0.5 : 1,
                        transition: 'background-color 150ms ease',
                      }}
                    >
                      {state === 'approving' ? 'Approving…' : '✓ Approve'}
                    </button>
                    <button
                      onClick={() => act(answer.id, 'reject')}
                      disabled={state !== 'idle'}
                      style={{
                        padding: '8px 20px',
                        backgroundColor: 'transparent',
                        color: state === 'rejecting' ? '#DC2626' : '#9A9A9A',
                        border: `1px solid ${state === 'rejecting' ? '#DC2626' : '#E0D9C8'}`,
                        borderRadius: '6px',
                        fontFamily: 'var(--font-ui)',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: state !== 'idle' ? 'not-allowed' : 'pointer',
                        opacity: state !== 'idle' && state !== 'rejecting' ? 0.5 : 1,
                        transition: 'color 150ms ease, border-color 150ms ease',
                      }}
                    >
                      {state === 'rejecting' ? 'Rejecting…' : '✗ Reject'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
