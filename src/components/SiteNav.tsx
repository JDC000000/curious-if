import Link from 'next/link'

export default function SiteNav() {
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'rgba(26,26,26,0.96)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '0 24px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: '18px',
            fontWeight: 400,
            color: '#F8F3E9',
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          curious if
        </Link>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link href="/browse" style={navLinkStyle}>Browse</Link>
          <Link href="/answer" style={navLinkStyle}>Write</Link>
          <Link href="/archive" style={navLinkStyle}>Archive</Link>
          <Link href="/about" style={navLinkStyle}>About</Link>
        </div>
      </div>
    </nav>
  )
}

const navLinkStyle: React.CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontSize: '14px',
  fontWeight: 500,
  color: 'rgba(248,243,233,0.72)',
  textDecoration: 'none',
}
