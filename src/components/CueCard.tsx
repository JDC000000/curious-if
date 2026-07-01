'use client'

import { useState, useEffect } from 'react'

interface CueCardProps {
  answer: string
  author?: string
  city?: string
  month: string
  accentColour: string
  questionLabel: string
  answerId?: string
  initialResonanceCount?: number
}

export default function CueCard({
  answer,
  author,
  city,
  month,
  accentColour,
  questionLabel,
  answerId,
  initialResonanceCount = 0,
}: CueCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [resonated, setResonated] = useState(false)
  const [resonanceCount, setResonanceCount] = useState(initialResonanceCount)

  // Restore resonance state from localStorage on mount
  useEffect(() => {
    if (!answerId) return
    try {
      const stored = localStorage.getItem(`resonated_${answerId}`)
      if (stored === '1') setResonated(true)
    } catch {
      // localStorage unavailable (private browsing etc.) — fine
    }
  }, [answerId])

  const handleResonance = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!answerId) return

    const next = !resonated
    setResonated(next)
    setResonanceCount(c => Math.max(0, c + (next ? 1 : -1)))

    // Persist to localStorage
    try {
      if (next) {
        localStorage.setItem(`resonated_${answerId}`, '1')
      } else {
        localStorage.removeItem(`resonated_${answerId}`)
      }
    } catch {
      // Ignore
    }

    // Fire-and-forget to API
    fetch('/api/resonance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerId, action: next ? 'add' : 'remove' }),
    }).catch(() => {
      // Non-fatal — revert state on failure
      setResonated(!next)
      setResonanceCount(c => Math.max(0, c + (next ? -1 : 1)))
    })
  }

  const resonanceButton = (
    <button
      onClick={handleResonance}
      aria-label={resonated ? 'Remove resonance' : 'This resonated with me'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        background: 'none',
        border: 'none',
        cursor: answerId ? 'pointer' : 'default',
        color: resonated ? accentColour : '#9A9A9A',
        transition: 'color 150ms ease',
        padding: '4px',
        lineHeight: 1,
      }}
    >
      <span style={{ fontSize: '18px' }}>{resonated ? '◆' : '◇'}</span>
      {resonanceCount > 0 && (
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}
        >
          {resonanceCount}
        </span>
      )}
    </button>
  )

  const authorBlock = (
    <div>
      {author && (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '13px', fontWeight: 500, color: '#3D3D3D' }}>
          {author}
        </div>
      )}
      {city && (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: '#6B6B6B' }}>
          {city}
        </div>
      )}
      {!author && !city && (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: '#9A9A9A' }}>Anonymous</div>
      )}
    </div>
  )

  return (
    <div
      className="cursor-pointer"
      style={{
        perspective: '1200px',
        width: '100%',
        minHeight: '380px',
      }}
      onClick={() => setIsFlipped(f => !f)}
      role="button"
      tabIndex={0}
      aria-label={isFlipped ? 'Tap to flip back' : 'Tap to read full answer'}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsFlipped(f => !f) }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          minHeight: '380px',
          transformStyle: 'preserve-3d',
          transition: 'transform 420ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* FRONT */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            backgroundColor: '#F8F3E9',
            borderRadius: '12px',
            boxShadow: isFlipped
              ? '0 2px 8px rgba(26,26,46,0.10)'
              : '0 2px 8px rgba(26,26,46,0.10), 0 1px 3px rgba(26,26,46,0.06)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transition: isFlipped ? 'none' : 'box-shadow 150ms cubic-bezier(0.4,0,0.2,1), transform 150ms cubic-bezier(0.4,0,0.2,1)',
          }}
          className={!isFlipped ? 'card-front-hover' : ''}
        >
          <div style={{ height: '5px', backgroundColor: accentColour, flexShrink: 0 }} />

          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono, "IBM Plex Mono", monospace)',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#6B6B6B',
                marginBottom: '16px',
              }}
            >
              {questionLabel}
            </div>

            <p
              style={{
                fontFamily: 'var(--font-serif, Fraunces, serif)',
                fontSize: '16px',
                lineHeight: '1.65',
                color: '#1A1A1A',
                flex: 1,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                marginBottom: '20px',
              }}
            >
              {answer}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
              {authorBlock}
              {resonanceButton}
            </div>

            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              color: '#9A9A9A',
              textAlign: 'center',
              marginTop: '12px',
              letterSpacing: '0.05em',
            }}>
              tap to read
            </div>
          </div>
        </div>

        {/* BACK */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            backgroundColor: '#F8F3E9',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(26,26,46,0.10), 0 1px 3px rgba(26,26,46,0.06)',
            overflow: 'hidden',
            transform: 'rotateY(180deg)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ height: '5px', backgroundColor: accentColour, flexShrink: 0 }} />

          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: accentColour,
                marginBottom: '16px',
              }}
            >
              {month}
            </div>

            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '15px',
                lineHeight: '1.7',
                color: '#1A1A1A',
                flex: 1,
                overflowY: 'auto',
                marginBottom: '20px',
              }}
            >
              {answer}
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
              {authorBlock}
              {resonanceButton}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .card-front-hover:hover {
          box-shadow: 0 12px 32px rgba(26,26,46,0.18), 0 4px 8px rgba(26,26,46,0.10);
          transform: rotate(2deg) translateY(-6px);
          transition: box-shadow 150ms cubic-bezier(0.4,0,0.2,1), transform 150ms cubic-bezier(0.4,0,0.2,1);
        }
      `}</style>
    </div>
  )
}
