import type { ReactNode } from 'react'
import SiteNav from './SiteNav'

/**
 * Shared shell + typographic primitives for the long-form legal/trust pages
 * (/privacy, /terms). Matches the site conventions: cream page (inherited from
 * <body>), SiteNav on top, SiteFooter from the root layout, Fraunces (serif)
 * for headings and Hanken Grotesk (--font-ui) for body, at a readable centred
 * measure. Deliberately plain — legible over designy.
 */
export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: ReactNode
}) {
  return (
    <>
      <SiteNav />
      <main style={{ flex: 1, width: '100%' }}>
        <article
          style={{
            maxWidth: '680px',
            margin: '0 auto',
            width: '100%',
            padding: '56px 24px 80px',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(30px, 5vw, 44px)',
              fontWeight: 700,
              color: '#1A1A1A',
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              marginBottom: '10px',
            }}
          >
            {title}
          </h1>
          <p
            style={{
              fontFamily: 'var(--font-ui)',
              fontStyle: 'italic',
              fontSize: '14px',
              color: '#6E6E6E',
              marginBottom: '40px',
            }}
          >
            {updated}
          </p>
          <div
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: '16px',
              lineHeight: 1.7,
              color: '#1A1A1A',
            }}
          >
            {children}
          </div>
        </article>
      </main>
    </>
  )
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 'clamp(20px, 3vw, 26px)',
        fontWeight: 700,
        color: '#1A1A1A',
        letterSpacing: '-0.01em',
        lineHeight: 1.3,
        margin: '38px 0 12px',
      }}
    >
      {children}
    </h2>
  )
}

export function P({ children }: { children: ReactNode }) {
  return <p style={{ margin: '0 0 16px' }}>{children}</p>
}

export function List({ children }: { children: ReactNode }) {
  return (
    <ul
      style={{
        margin: '0 0 16px',
        paddingLeft: '22px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {children}
    </ul>
  )
}

export function Item({ children }: { children: ReactNode }) {
  return <li style={{ lineHeight: 1.6 }}>{children}</li>
}

/** hello@curiousif.blog as a mailto link, styled like the site's other links. */
export function Mail() {
  return (
    <a href="mailto:hello@curiousif.blog" style={{ color: '#3D5A8C', textDecoration: 'none' }}>
      hello@curiousif.blog
    </a>
  )
}
