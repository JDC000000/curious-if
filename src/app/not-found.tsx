import Link from 'next/link'

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F3E9',
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: '22px',
          fontWeight: 400,
          color: '#1A1A1A',
          textDecoration: 'none',
          marginBottom: '56px',
          display: 'block',
        }}
      >
        curious if
      </Link>

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#9A9A9A',
          marginBottom: '24px',
        }}
      >
        404
      </div>

      <p
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 'clamp(22px, 4vw, 32px)',
          fontWeight: 300,
          color: '#3D3D3D',
          lineHeight: 1.4,
          maxWidth: '480px',
          marginBottom: '12px',
        }}
      >
        This page doesn't exist.
      </p>
      <p
        style={{
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: '18px',
          fontWeight: 300,
          color: '#9A9A9A',
          marginBottom: '48px',
        }}
      >
        But the question still does.
      </p>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          href="/"
          style={{
            padding: '12px 24px',
            backgroundColor: '#1A1A1A',
            color: '#F8F3E9',
            borderRadius: '8px',
            fontFamily: 'var(--font-ui)',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Back to home
        </Link>
        <Link
          href="/browse"
          style={{
            padding: '12px 24px',
            backgroundColor: 'transparent',
            color: '#6B6B6B',
            border: '1px solid #E0D9C8',
            borderRadius: '8px',
            fontFamily: 'var(--font-ui)',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Browse answers
        </Link>
      </div>
    </div>
  )
}
