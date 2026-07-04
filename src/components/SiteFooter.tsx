import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: '1px solid rgba(26,26,26,0.08)',
        backgroundColor: '#F8F3E9',
        padding: '32px 24px',
      }}
    >
      <div
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontSize: '17px',
            fontWeight: 400,
            color: '#1A1A1A',
            textDecoration: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          curious if
        </Link>

        {/* Right side — links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
          <Link
            href="/#about"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              color: '#6E6E6E',
              textDecoration: 'none',
            }}
          >
            About
          </Link>

          <Link
            href="/privacy"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              color: '#6E6E6E',
              textDecoration: 'none',
            }}
          >
            Privacy
          </Link>

          <Link
            href="/terms"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '13px',
              color: '#6E6E6E',
              textDecoration: 'none',
            }}
          >
            Terms
          </Link>

          <a
            href="https://www.instagram.com/curiousifblog"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="@curiousifblog on Instagram"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#6E6E6E',
              textDecoration: 'none',
              transition: 'color 150ms ease',
            }}
            className="footer-ig-link"
          >
            <InstagramIcon />
            <span
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: '13px',
              }}
            >
              @curiousifblog
            </span>
          </a>
        </div>
      </div>

      <style>{`
        .footer-ig-link:hover {
          color: #1A1A1A;
        }
      `}</style>
    </footer>
  )
}

function InstagramIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  )
}
