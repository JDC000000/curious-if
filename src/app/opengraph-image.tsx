import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'curious if — one question, once a month'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#F8F3E9',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Georgia, serif',
          padding: '80px',
        }}
      >
        {/* Wordmark */}
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            fontSize: '64px',
            fontWeight: 400,
            color: '#1A1A1A',
            letterSpacing: '-0.02em',
            marginBottom: '24px',
          }}
        >
          curious if
        </div>

        {/* Divider */}
        <div
          style={{
            width: '48px',
            height: '2px',
            backgroundColor: '#1A1A1A',
            marginBottom: '32px',
            opacity: 0.2,
          }}
        />

        {/* Tagline */}
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontStyle: 'italic',
            fontSize: '26px',
            fontWeight: 400,
            color: '#6B6B6B',
            letterSpacing: '-0.01em',
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          One question. Once a month.
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '48px',
            fontFamily: 'monospace',
            fontSize: '14px',
            color: '#BABABA',
            letterSpacing: '0.08em',
          }}
        >
          CURIOUSIF.BLOG
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
