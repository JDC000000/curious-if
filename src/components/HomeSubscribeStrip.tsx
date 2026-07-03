'use client'

import { useState } from 'react'

interface HomeSubscribeStripProps {
  accentColour: string
}

type StripState = 'idle' | 'submitting' | 'done' | 'error'

export default function HomeSubscribeStrip({ accentColour }: HomeSubscribeStripProps) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<StripState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || state === 'submitting') return

    setState('submitting')
    setErrorMsg(null)

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        // 409 = already subscribed — treat as success
        if (res.status === 409) {
          setState('done')
          return
        }
        setErrorMsg(data.error ?? 'Something went wrong.')
        setState('error')
        return
      }

      setState('done')
    } catch {
      setErrorMsg('Connection error. Please try again.')
      setState('error')
    }
  }

  if (state === 'done') {
    return (
      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <p style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: '16px',
          color: '#6B6B6B',
        }}>
          You&apos;re in. Next question lands in your inbox.
        </p>
      </div>
    )
  }

  return (
    <div style={{ marginTop: '32px', textAlign: 'center' }}>
      <p style={{
        fontFamily: 'var(--font-ui)',
        fontSize: '13px',
        color: '#6E6E6E',
        marginBottom: '12px',
        letterSpacing: '0.02em',
      }}>
        Get next month&apos;s question by email — nothing else.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          gap: '8px',
          maxWidth: '420px',
          margin: '0 auto',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={state === 'submitting'}
          style={{
            flex: 1,
            minWidth: '200px',
            padding: '10px 16px',
            fontFamily: 'var(--font-ui)',
            // 16px, not 14px: below 16px, iOS Safari auto-zooms on focus for
            // text inputs (mobile QA pass 3 finding 3) — /answer's inputs are
            // already correctly 16px, this was the one gap, homepage-only.
            fontSize: '16px',
            color: '#1A1A1A',
            backgroundColor: 'rgba(255,255,255,0.9)',
            border: '1px solid #E0D9C8',
            borderRadius: '8px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <button
          type="submit"
          disabled={state === 'submitting' || !email.trim()}
          style={{
            padding: '10px 20px',
            minHeight: '44px', // a11y: stays ≥44px even when the button wraps to its own line at 320px (was 41px there); independent of the flex-stretch that keeps it tall at ≥375px
            backgroundColor: state === 'submitting' ? '#6E6E6E' : accentColour,
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '8px',
            fontFamily: 'var(--font-ui)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: state === 'submitting' || !email.trim() ? 'not-allowed' : 'pointer',
            transition: 'background-color 150ms ease',
            whiteSpace: 'nowrap',
          }}
        >
          {state === 'submitting' ? 'Subscribing…' : 'Subscribe'}
        </button>
      </form>

      {errorMsg && (
        <p style={{
          fontFamily: 'var(--font-ui)',
          fontSize: '12px',
          color: '#DC2626',
          marginTop: '8px',
        }}>
          {errorMsg}
        </p>
      )}
    </div>
  )
}
