import SiteNav from '@/components/SiteNav'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About — Curious If',
  description: 'One question. Every month. Answered by people like you.',
}

export default function AboutPage() {
  return (
    <>
      <SiteNav />
      <main
        style={{
          maxWidth: '640px',
          margin: '0 auto',
          padding: '64px 24px',
          minHeight: 'calc(100vh - 56px)',
        }}
      >
        <div style={{ marginBottom: '48px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontStyle: 'italic',
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 400,
              color: '#1A1A1A',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              marginBottom: '8px',
            }}
          >
            curious if
          </h1>
          <div
            style={{
              height: '2px',
              width: '48px',
              backgroundColor: '#3D5A8C',
              marginBottom: '40px',
            }}
          />

          <div
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '18px',
              lineHeight: 1.75,
              color: '#1A1A1A',
            }}
          >
            <p style={{ marginBottom: '24px' }}>
              Once a month, a single question is posted here.
            </p>
            <p style={{ marginBottom: '24px' }}>
              Not a poll. Not a debate. Just one question — the kind you turn over in your head on a long walk or a quiet morning — and space for anyone to answer it honestly.
            </p>
            <p style={{ marginBottom: '24px' }}>
              Answers are read, not scrolled. They arrive as cards you can hold and flip. Some are one line. Some are a page. All of them are real.
            </p>
            <p style={{ marginBottom: '40px' }}>
              Old questions stay open. There&apos;s no deadline on honesty.
            </p>
          </div>

          <div
            style={{
              padding: '28px 32px',
              backgroundColor: '#FFFFFF',
              borderRadius: '12px',
              borderLeft: '4px solid #3D5A8C',
              boxShadow: '0 2px 8px rgba(26,26,46,0.08)',
              marginBottom: '40px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#3D5A8C',
                marginBottom: '12px',
              }}
            >
              Made by
            </p>
            <p
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '16px',
                color: '#1A1A1A',
                lineHeight: 1.6,
              }}
            >
              Jon Cartwright — someone who believes the best conversations start with the right question.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 24px',
                backgroundColor: '#3D5A8C',
                color: '#FFFFFF',
                borderRadius: '8px',
                fontFamily: 'var(--font-ui)',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              See this month&apos;s question
            </Link>
            <Link
              href="/browse"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '12px 24px',
                backgroundColor: 'transparent',
                color: '#3D5A8C',
                border: '2px solid #3D5A8C',
                borderRadius: '8px',
                fontFamily: 'var(--font-ui)',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Read answers
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
