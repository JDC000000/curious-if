'use client'

import Link from 'next/link'
import { useState } from 'react'

const navLinks = [
  { href: '/browse', label: 'Browse' },
  { href: '/answer', label: 'Write' },
  { href: '/archive', label: 'Archive' },
  { href: '/#about', label: 'About' },
]

export default function SiteNav() {
  const [open, setOpen] = useState(false)

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

        {/* Desktop links */}
        <div className="nav-desktop" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          {navLinks.map(l => (
            <Link key={l.href} href={l.href} style={navLinkStyle}>{l.label}</Link>
          ))}
        </div>

        {/* Hamburger — mobile only */}
        <button
          className="nav-hamburger"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            minWidth: '44px',
            minHeight: '44px',
            color: 'rgba(248,243,233,0.8)',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
          }}
        >
          <span style={{ display: 'block', width: '20px', height: '2px', backgroundColor: 'currentColor', transition: 'transform 200ms ease', transform: open ? 'translateY(7px) rotate(45deg)' : 'none' }} />
          <span style={{ display: 'block', width: '20px', height: '2px', backgroundColor: 'currentColor', transition: 'opacity 200ms ease', opacity: open ? 0 : 1 }} />
          <span style={{ display: 'block', width: '20px', height: '2px', backgroundColor: 'currentColor', transition: 'transform 200ms ease', transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none' }} />
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div
          className="nav-mobile-menu"
          style={{
            display: 'none',
            flexDirection: 'column',
            padding: '8px 24px 20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            gap: '4px',
          }}
        >
          {navLinks.map(l => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{
                ...navLinkStyle,
                padding: '10px 0',
                fontSize: '16px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 540px) {
          .nav-desktop { display: none !important; }
          .nav-hamburger { display: flex !important; }
          .nav-mobile-menu { display: flex !important; }
        }
      `}</style>
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
