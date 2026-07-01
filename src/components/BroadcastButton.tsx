'use client'

import { useState } from 'react'

type State = 'idle' | 'confirm' | 'sending' | 'done' | 'error'

interface BroadcastResult {
  sent: number
  errors: number
  question: string
  monthLabel: string
}

export default function BroadcastButton({ activeCount }: { activeCount: number }) {
  const [state, setState] = useState<State>('idle')
  const [result, setResult] = useState<BroadcastResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const send = async () => {
    setState('sending')
    setErrorMsg('')

    try {
      const res = await fetch('/api/admin/broadcast', { method: 'POST' })
      const data = await res.json()

      if (res.ok) {
        setResult(data)
        setState('done')
      } else {
        setErrorMsg(data.error ?? 'Broadcast failed.')
        setState('error')
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
      setState('error')
    }
  }

  if (state === 'done' && result) {
    return (
      <div
        style={{
          backgroundColor: '#F0FFF4',
          border: '1px solid #BBF7D0',
          borderRadius: '12px',
          padding: '20px 24px',
        }}
      >
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 600, color: '#2E6B45', margin: '0 0 4px' }}>
          ✓ Broadcast sent
        </p>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: '#5C8C6B', margin: 0 }}>
          {result.sent} {result.sent === 1 ? 'subscriber' : 'subscribers'} received &ldquo;{result.question.slice(0, 60)}{result.question.length > 60 ? '…' : ''}&rdquo;
          {result.errors > 0 && ` · ${result.errors} failed`}
        </p>
      </div>
    )
  }

  if (state === 'confirm') {
    return (
      <div
        style={{
          backgroundColor: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: '12px',
          padding: '20px 24px',
        }}
      >
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: '14px', fontWeight: 600, color: '#92400E', margin: '0 0 8px' }}>
          Send broadcast to {activeCount} active {activeCount === 1 ? 'subscriber' : 'subscribers'}?
        </p>
        <p style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: '#B45309', margin: '0 0 20px', lineHeight: 1.5 }}>
          This will email the current featured question to your entire list. Make sure the question is live and ready.
        </p>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={send}
            style={{
              padding: '10px 20px',
              backgroundColor: '#1A1A1A',
              color: '#F8F3E9',
              border: 'none',
              borderRadius: '6px',
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Yes, send it
          </button>
          <button
            onClick={() => setState('idle')}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: '#9A9A9A',
              border: '1px solid #E0D9C8',
              borderRadius: '6px',
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {state === 'error' && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '12px',
            fontFamily: 'var(--font-ui)',
            fontSize: '13px',
            color: '#DC2626',
          }}
        >
          {errorMsg}
        </div>
      )}

      <button
        onClick={() => setState('confirm')}
        disabled={state === 'sending' || activeCount === 0}
        style={{
          padding: '12px 24px',
          backgroundColor: activeCount === 0 ? '#E0D9C8' : '#B8902A',
          color: activeCount === 0 ? '#9A9A9A' : '#FFFFFF',
          border: 'none',
          borderRadius: '8px',
          fontFamily: 'var(--font-ui)',
          fontSize: '14px',
          fontWeight: 600,
          cursor: activeCount === 0 || state === 'sending' ? 'not-allowed' : 'pointer',
          opacity: state === 'sending' ? 0.7 : 1,
          transition: 'opacity 150ms ease',
        }}
      >
        {state === 'sending' ? 'Sending…' : `Send broadcast · ${activeCount} ${activeCount === 1 ? 'subscriber' : 'subscribers'}`}
      </button>
    </div>
  )
}
