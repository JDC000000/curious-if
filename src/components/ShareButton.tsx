'use client'

import { useState } from 'react'
import { track } from '@vercel/analytics/react'

interface ShareButtonProps {
  url: string
  text?: string
  accentColour?: string
}

export default function ShareButton({ url, text, accentColour = '#3D5A8C' }: ShareButtonProps) {
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

  return (
    <button
      onClick={handleShare}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
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
