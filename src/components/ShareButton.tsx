'use client'

import { useState } from 'react'
import { track } from '@vercel/analytics/react'

interface ShareButtonProps {
  url: string
  text?: string
  accentColour?: string
  /** Icon-only, transparent, 44×44 tap-target variant for placing on a card footer
      (e.g. CueCard's flipped face) next to the resonance/permalink controls. Same
      share behaviour; just sized/coloured to sit among icon controls, not as a pill. */
  compact?: boolean
}

export default function ShareButton({ url, text, accentColour = '#3D5A8C', compact = false }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    track('share_clicked')

    // Try native Web Share API first (iOS, Android, some desktop)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'curious if',
          text: text ?? 'Read this answer on curious if',
          url,
        })
        return
      } catch {
        // User cancelled or share failed — fall through to clipboard
      }
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Last resort: select the URL from a temp input
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (compact) {
    return (
      <button
        onClick={handleShare}
        aria-label={copied ? 'Link copied' : 'Share this answer'}
        title={copied ? 'Link copied' : 'Share this answer'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: accentColour, // icon colour; on the dark flipped face this is the per-question accent
          padding: '2px',
          margin: '-12px 0', // keep 44px tap target without inflating the footer row (matches resonance button)
          minWidth: '44px',
          minHeight: '44px',
          lineHeight: 1,
          flexShrink: 0,
          transition: 'color 150ms ease',
        }}
      >
        {copied ? (
          <span style={{ fontSize: '15px' }}>✓</span>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={handleShare}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '14px 24px', // a11y: 12px→14px lifts tap target to ≥44px tall
        backgroundColor: copied ? '#F0FFF4' : 'transparent',
        color: copied ? '#2E6B45' : '#6B6B6B',
        border: `1px solid ${copied ? '#2E6B45' : '#E0D9C8'}`,
        borderRadius: '8px',
        fontFamily: 'var(--font-ui)',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 200ms ease',
      }}
    >
      {copied ? (
        <>
          <span>✓</span>
          Link copied
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          Share
        </>
      )}
    </button>
  )
}
