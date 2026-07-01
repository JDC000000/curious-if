'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Answer } from '@/lib/types/database'
import CueCard from './CueCard'

interface RealtimeGridProps {
  initialAnswers: Answer[]
  questionId: string
  accentColour: string
  questionLabel: string
  month: string
}

export default function RealtimeGrid({
  initialAnswers,
  questionId,
  accentColour,
  questionLabel,
  month,
}: RealtimeGridProps) {
  const [answers, setAnswers] = useState<Answer[]>(initialAnswers)
  const [newAnswerIds, setNewAnswerIds] = useState<Set<string>>(new Set())
  const queueRef = useRef<Answer[]>([])
  const processingRef = useRef(false)

  const processQueue = () => {
    if (queueRef.current.length === 0) {
      processingRef.current = false
      return
    }
    processingRef.current = true
    const next = queueRef.current.shift()!
    setAnswers(prev => [next, ...prev])
    setNewAnswerIds(prev => new Set([...prev, next.id]))
    // Remove entrance animation class after 1s
    setTimeout(() => {
      setNewAnswerIds(prev => {
        const next2 = new Set(prev)
        next2.delete(next.id)
        return next2
      })
    }, 1000)
    // Throttle: max 1 new card per 2s
    setTimeout(processQueue, 2000)
  }

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`answers-${questionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'answers',
          filter: `question_id=eq.${questionId}`,
        },
        (payload) => {
          const newRow = payload.new as Answer
          const oldRow = payload.old as Partial<Answer>

          // Only show when newly approved — never broadcast pending/rejected
          if (newRow.status === 'approved' && oldRow.status !== 'approved') {
            // Don't show if already in list
            setAnswers(prev => {
              if (prev.some(a => a.id === newRow.id)) return prev
              queueRef.current.push(newRow)
              if (!processingRef.current) processQueue()
              return prev
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionId])

  const featuredAnswers = answers.filter(a => a.is_featured)
  const regularAnswers = answers.filter(a => !a.is_featured)

  return (
    <div>
      {featuredAnswers.length > 0 && (
        <section style={{ marginBottom: '48px' }}>
          <h2
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: accentColour,
              marginBottom: '24px',
            }}
          >
            Editor&apos;s picks
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '16px',
              alignItems: 'start',
            }}
          >
            {featuredAnswers.map(answer => (
              <AnswerCard
                key={answer.id}
                answer={answer}
                accentColour={accentColour}
                questionLabel={questionLabel}
                month={month}
                isNew={newAnswerIds.has(answer.id)}
              />
            ))}
          </div>
        </section>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {regularAnswers.map(answer => (
          <AnswerCard
            key={answer.id}
            answer={answer}
            accentColour={accentColour}
            questionLabel={questionLabel}
            month={month}
            isNew={newAnswerIds.has(answer.id)}
          />
        ))}
      </div>
    </div>
  )
}

function AnswerCard({
  answer,
  accentColour,
  questionLabel,
  month,
  isNew,
}: {
  answer: Answer
  accentColour: string
  questionLabel: string
  month: string
  isNew: boolean
}) {
  return (
    <div
      style={{
        opacity: isNew ? 0 : 1,
        transform: isNew ? 'translateY(20px)' : 'translateY(0)',
        transition: isNew
          ? 'none'
          : 'opacity 300ms cubic-bezier(0.34, 1.56, 0.64, 1), transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        animation: isNew
          ? 'cardEnter 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
          : 'none',
      }}
    >
      <CueCard
        answer={answer.body}
        month={month}
        accentColour={accentColour}
        questionLabel={questionLabel}
        answerId={answer.id}
        initialResonanceCount={(answer as Answer & { resonance_count?: number }).resonance_count ?? 0}
      />
      <style>{`
        @keyframes cardEnter {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
