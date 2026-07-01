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

/**
 * Compute a pixel height for the card based on content length.
 * Short answers → small card. Long answers → bigger card, capped at 400px.
 * Returns the height and whether the card should flip (content doesn't fit on front).
 */
function computeCard(body: string): { height: number; clamp: number; needsFlip: boolean } {
  // ~32 chars per line in a ~240px content area at 16px Fraunces
  const charsPerLine = 32
  const lineH = 28          // 16px * 1.75 ≈ generous spacing
  const maxClamp = 7        // max lines shown on front face

  const totalLines = Math.ceil(body.length / charsPerLine)
  const visibleLines = Math.min(totalLines, maxClamp)

  // overhead = colour bar (5) + top pad (20) + mono label+margin (32) + text margin (16)
  //            + footer row (28) + bottom pad (20) = 121
  // For short cards also add 8px breathing room
  const overhead = 129
  const height = Math.max(160, Math.min(400, overhead + visibleLines * lineH))

  return {
    height,
    clamp: maxClamp,
    needsFlip: totalLines > 4,   // only offer flip when content exceeds ~4 lines
  }
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
  const [hovered, setHovered] = useState(false)
  const [resonated, setResonated] = useState(false)
  const [resonanceCount, setResonanceCount] = useState(initialResonanceCount)

  const { height, clamp, needsFlip } = computeCard(answer)

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

    try {
      if (next) localStorage.setItem(`resonated_${answerId}`, '1')
      else localStorage.removeItem(`resonated_${answerId}`)
    } catch { /* ignore */ }

    fetch('/api/resonance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answerId, action: next ? 'add' : 'remove' }),
    }).catch(() => {
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
        gap: '4px',
        background: 'none',
        border: 'none',
        cursor: answerId ? 'pointer' : 'default',
        color: resonated ? accentColour : '#BABABA',
        transition: 'color 150ms ease',
        padding: '2px 0',
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: '16px' }}>{resonated ? '◆' : '◇'}</span>
      {resonanceCount > 0 && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500 }}>
          {resonanceCount}
        </span>
      )}
    </button>
  )

  const authorBlock = (
    <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
      {author ? (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 500, color: '#3D3D3D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {author}{city ? `, ${city}` : ''}
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: '#BABABA' }}>Anonymous</div>
      )}
    </div>
  )

  const handleClick = () => {
    if (needsFlip) setIsFlipped(f => !f)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && needsFlip) setIsFlipped(f => !f)
  }

  // Front hover lift — only when not flipped
  const frontShadow = isFlipped
    ? '0 1px 4px rgba(26,26,46,0.08)'
    : hovered
    ? '0 8px 24px rgba(26,26,46,0.16), 0 2px 6px rgba(26,26,46,0.08)'
    : '0 2px 8px rgba(26,26,46,0.10), 0 1px 3px rgba(26,26,46,0.05)'

  const frontTransform = hovered && !isFlipped ? 'translateY(-3px)' : undefined

  return (
    <div
      style={{
        perspective: '1200px',
        width: '100%',
        height: `${height}px`,
        cursor: needsFlip ? 'pointer' : 'default',
      }}
      onClick={handleClick}
      role={needsFlip ? 'button' : undefined}
      tabIndex={needsFlip ? 0 : undefined}
      aria-label={needsFlip ? (isFlipped ? 'Tap to flip back' : 'Tap to read full answer') : undefined}
      onKeyDown={handleKey}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* ── FRONT ── */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            backgroundColor: '#FDFAF3',
            borderRadius: '10px',
            boxShadow: frontShadow,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transition: 'box-shadow 150ms ease, transform 150ms ease',
            transform: frontTransform,
          }}
        >
          {/* Accent stripe */}
          <div style={{ height: '4px', backgroundColor: accentColour, flexShrink: 0 }} />

          <div style={{ padding: '18px 20px 18px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {/* Month/question label */}
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#BABABA',
              marginBottom: '12px',
              flexShrink: 0,
            }}>
              {questionLabel}
            </div>

            {/* Answer text */}
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '15px',
                lineHeight: '1.7',
                color: '#1A1A1A',
                flex: 1,
                marginBottom: '14px',
                ...(needsFlip ? {
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: clamp,
                  WebkitBoxOrient: 'vertical',
                } : {
                  // Short answers: show completely, no truncation
                  overflow: 'hidden',
                }),
              }}
            >
              {answer}
            </p>

            {/* Footer row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexShrink: 0 }}>
              {authorBlock}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {needsFlip && (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: '#CFCBC0',
                    letterSpacing: '0.04em',
                    userSelect: 'none',
                  }}>
                    flip →
                  </span>
                )}
                {resonanceButton}
              </div>
            </div>
          </div>
        </div>

        {/* ── BACK ── */}
        {needsFlip && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              backgroundColor: '#1A1A2E',
              borderRadius: '10px',
              boxShadow: '0 4px 16px rgba(26,26,46,0.24)',
              overflow: 'hidden',
              transform: 'rotateY(180deg)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Accent stripe */}
            <div style={{ height: '4px', backgroundColor: accentColour, flexShrink: 0 }} />

            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              {/* Month label */}
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: accentColour,
                marginBottom: '12px',
                flexShrink: 0,
              }}>
                {month}
              </div>

              {/* Full answer text — scrollable */}
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '14px',
                  lineHeight: '1.72',
                  color: 'rgba(248,243,233,0.88)',
                  flex: 1,
                  overflowY: 'auto',
                  marginBottom: '14px',
                  scrollbarWidth: 'none',
                }}
              >
                {answer}
              </p>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexShrink: 0 }}>
                {/* Author — dark theme version */}
                <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                  {author ? (
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', fontWeight: 500, color: 'rgba(248,243,233,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {author}{city ? `, ${city}` : ''}
                    </div>
                  ) : (
                    <div style={{ fontFamily: 'var(--font-ui)', fontSize: '12px', color: 'rgba(248,243,233,0.3)' }}>Anonymous</div>
                  )}
                  {answerId && (
                    <a
                      href={`/answers/${answerId}`}
                      onClick={e => e.stopPropagation()}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: accentColour,
                        textDecoration: 'none',
                        letterSpacing: '0.04em',
                        opacity: 0.8,
                        display: 'inline-block',
                        marginTop: '2px',
                      }}
                    >
                      permalink ↗
                    </a>
                  )}
                </div>
                {/* Resonance on back — same button, dark theme colours handled via accentColour */}
                <button
                  onClick={handleResonance}
                  aria-label={resonated ? 'Remove resonance' : 'This resonated with me'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'none',
                    border: 'none',
                    cursor: answerId ? 'pointer' : 'default',
                    color: resonated ? accentColour : 'rgba(248,243,233,0.3)',
                    transition: 'color 150ms ease',
                    padding: '2px 0',
                    lineHeight: 1,
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{resonated ? '◆' : '◇'}</span>
                  {resonanceCount > 0 && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 500 }}>
                      {resonanceCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
