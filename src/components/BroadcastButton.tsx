'use client'

import { useState } from 'react'

type State = 'idle' | 'loading-preview' | 'preview' | 'sending' | 'done' | 'error'

interface PreviewData {
  question: { text: string; whisper_line: string | null; accent_colour: string }
  monthLabel: string
  subscriberCount: number
}

interface BroadcastResult {
  sent: number
  errors: number
  question: string
  monthLabel: string
}

export default function BroadcastButton({ activeCount }: { activeCount: number }) {
  const [state, setState] = useState<State>('idle')
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [result, setResult] = useState<BroadcastResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const loadPreview = async () => {
    setState('loading-preview')
    setErrorMsg('')

    try {
      const res = await fetch('/api/admin/broadcast')
      const data = await res.json()

      if (res.ok) {
        setPreview(data)
        setState('preview')
      } else {
        setErrorMsg(data.error ?? 'Could not load preview.')
        setState('error')
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
      setState('error')
    }
  }

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

  // ── Done ──────────────────────────────────────────────────────────────────
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

  // ── Preview ───────────────────────────────────────────────────────────────
  if (state === 'preview' && preview) {
    const accent = preview.question.accent_colour ?? '#3D5A8C'
    const questionPreview = preview.question.text.length > 80
      ? preview.question.text.slice(0, 77) + '…'
      : preview.question.text

    return (
      <div
        style={{
          border: '1px solid #E0D9C8',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        {/* Accent stripe */}
        <div style={{ height: '4px', backgroundColor: accent }} />

        <div style={{ padding: '20px 24px' }}>
          {/* Month + label */}
          <p style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#9A9A9A',
            margin: '0 0 8px',
          }}>
            {preview.monthLabel} · curious if
          </p>

          {/* Subject */}
          <p style={{
            fontFamily: 'var(--font-ui)',
            fontSize: '11px',
            fontWeight: 600,
            color: '#6B6B6B',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            margin: '0 0 6px',
          }}>
            Subject
          </p>
          <p style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '15px',
            fontStyle: 'italic',
            color: '#1A1A1A',
            lineHeight: 1.4,
            margin: '0 0 16px',
          }}>
            &ldquo;{questionPreview}&rdquo;
          </p>

          {preview.question.whisper_line && (
            <p style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '12px',
              color: '#6B6B6B',
              margin: '0 0 16px',
              lineHeight: 1.5,
            }}>
              {preview.question.whisper_line}
            </p>
          )}

          {/* Recipient count */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#F8F3E9',
            border: '1px solid #E0D9C8',
            borderRadius: '6px',
            padding: '6px 12px',
            marginBottom: '20px',
          }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 600, color: '#1A1A1A' }}>
              {preview.subscriberCount}
            </span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', color: '#6B6B6B' }}>
              {preview.subscriberCount === 1 ? 'subscriber' : 'subscribers'}
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={send}
              style={{
                padding: '10px 20px',
                backgroundColor: accent,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                fontFamily: 'var(--font-ui)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Send to {preview.subscriberCount} {preview.subscriberCount === 1 ? 'subscriber' : 'subscribers'} →
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
      </div>
    )
  }

  // ── Idle / loading / error ────────────────────────────────────────────────
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
        onClick={loadPreview}
        disabled={state === 'loading-preview' || state === 'sending' || activeCount === 0}
        style={{
          padding: '12px 24px',
          backgroundColor: activeCount === 0 ? '#E0D9C8' : '#B8902A',
          color: activeCount === 0 ? '#9A9A9A' : '#FFFFFF',
          border: 'none',
          borderRadius: '8px',
          fontFamily: 'var(--font-ui)',
          fontSize: '14px',
          fontWeight: 600,
          cursor: activeCount === 0 || state === 'loading-preview' ? 'not-allowed' : 'pointer',
          opacity: state === 'loading-preview' ? 0.7 : 1,
          transition: 'opacity 150ms ease',
        }}
      >
        {state === 'loading-preview' ? 'Loading preview…' : `Preview & send · ${activeCount} ${activeCount === 1 ? 'subscriber' : 'subscribers'}`}
      </button>
    </div>
  )
}
