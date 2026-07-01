'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface QuestionPublishButtonProps {
  questionId: string
  accentColour: string
}

export default function QuestionPublishButton({ questionId, accentColour }: QuestionPublishButtonProps) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'confirm' | 'publishing' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  const publish = async () => {
    setState('publishing')
    setError(null)

    try {
      const res = await fetch('/api/admin/questions/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error ?? 'Publish failed')
        setState('idle')
        return
      }

      setState('done')
      // Refresh the page to reflect new status
      setTimeout(() => router.refresh(), 800)
    } catch {
      setError('Connection error')
      setState('idle')
    }
  }

  if (state === 'done') {
    return (
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 600, color: '#2E6B45' }}>
        ✓ Published
      </span>
    )
  }

  if (state === 'confirm') {
    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {error && (
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: '11px', color: '#DC2626' }}>{error}</span>
        )}
        <button
          onClick={publish}
          disabled={false}
          style={{
            padding: '5px 10px',
            backgroundColor: accentColour,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '5px',
            fontFamily: 'var(--font-ui)',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Confirm
        </button>
        <button
          onClick={() => setState('idle')}
          style={{
            padding: '5px 8px',
            backgroundColor: 'transparent',
            color: '#9A9A9A',
            border: '1px solid #E0D9C8',
            borderRadius: '5px',
            fontFamily: 'var(--font-ui)',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setState('confirm')}
      style={{
        fontFamily: 'var(--font-ui)',
        fontSize: '12px',
        fontWeight: 600,
        color: accentColour,
        border: `1px solid ${accentColour}`,
        borderRadius: '5px',
        padding: '5px 10px',
        backgroundColor: 'transparent',
        cursor: 'pointer',
      }}
    >
      Publish
    </button>
  )
}
