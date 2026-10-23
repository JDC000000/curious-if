import { ImageResponse } from 'next/og'

export const runtime = 'edge'

// The 1200x630 preview card for /add: cream paper, ink type, the one Indigo accent.
export function GET() {
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
        <div style={{ fontStyle: 'italic', fontSize: 40, color: '#3D5A8C', marginBottom: 28 }}>
          curious if
        </div>
        <div style={{ fontSize: 108, color: '#1A1A1A', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
          Skip the weather
        </div>
        <div style={{ width: 72, height: 4, backgroundColor: '#3D5A8C', marginTop: 36, marginBottom: 36 }} />
        <div style={{ fontStyle: 'italic', fontSize: 44, color: '#3D3D3D', textAlign: 'center' }}>
          Add your answer. One, two, or the whole bunch.
        </div>
        <div style={{ position: 'absolute', bottom: 44, fontSize: 28, color: '#3D3D3D' }}>
          Open until Sunday 15 November
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'cache-control': 'public, max-age=0, s-maxage=86400' } }
  )
}
